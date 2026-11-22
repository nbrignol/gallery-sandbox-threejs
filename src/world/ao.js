import * as THREE from 'three';
import {
  AO_CONTACT_STRENGTH,
  AO_MAX_TEXTURE_SIZE,
  AO_PIXELS_PER_METER,
  AO_RADIUS,
  AO_STRENGTH,
  CELL_SIZE,
  CEILING_HEIGHT,
} from '../config.js';
import { SIDES } from './cell.js';
import { setBakedAO } from './aoMaterial.js';
import { cellLookup } from './cellLookup.js';
import { ceilingMaterial, floorMaterial } from './materials.js';

// Occlusion ambiante « cuite » : dégradés sombres générés une seule fois au
// chargement (canvas → texture), puis lus comme `aoMap` (canal UV 1).
//  - sol et plafond : UNE texture couvrant toute la salle (distance aux murs et
//    aux coins) ; les matériaux sol/plafond sont partagés entre les cellules ;
//  - murs : bas, haut, et extrémités qui sont de vrais coins : seulement 4 variantes
//    (coin concave à gauche et / ou à droite), partagées entre tous les murs.
// L'AO n'atténue que la lumière d'ambiance (hémisphère, environnement), pas les
// spots ni la lampe de cellule. Pour le plafond, qui est surtout émissif, la
// même texture module aussi l'émissive.

// Atténuation : 1 au contact, 0 à AO_RADIUS (courbe douce)
function falloff(distance) {
  const k = Math.max(0, 1 - distance / AO_RADIUS);
  return k * k;
}

// Coin concave (angle à 90° dans la salle) au point de grille (vx, vz) en
// demi-cellules : une seule cellule occupée autour. Un angle rentrant (3
// cellules) est convexe vu de la salle : pas d'occlusion.
function isConcaveCorner(has, vx, vz) {
  const a = (vx - 1) / 2;
  const b = (vz - 1) / 2;
  const count = [has(a, b), has(a + 1, b), has(a, b + 1), has(a + 1, b + 1)].filter(Boolean).length;
  return count === 1;
}

// Un mur : segment en monde + coin concave à chacune de ses extrémités
// (gauche / droite vu de l'intérieur)
function describeWall(has, i, j, side) {
  const [nx, nz] = side.normal;
  const half = CELL_SIZE / 2;
  // Centre du mur en demi-cellules : (2i - nx, 2j - nz) ; axe gauche → droite : (nz, -nx)
  const cvx = 2 * i - nx;
  const cvz = 2 * j - nz;
  const left = { vx: cvx - nz, vz: cvz + nx };
  const right = { vx: cvx + nz, vz: cvz - nx };
  const toWorld = ({ vx, vz }) => ({ x: (vx * CELL_SIZE) / 2, z: (vz * CELL_SIZE) / 2 });
  return {
    a: toWorld(left),
    b: toWorld(right),
    leftConcave: isConcaveCorner(has, left.vx, left.vz),
    rightConcave: isConcaveCorner(has, right.vx, right.vz),
    half,
  };
}

// Distance d'un point (px, pz) à un segment
function distanceToSegment(px, pz, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = THREE.MathUtils.clamp(((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
}

// Canvas en niveaux de gris dont chaque pixel vaut `fn(px, py)` (0–1)
function bakeCanvas(width, height, fn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const value = Math.round(255 * fn(px, py));
      const o = (py * width + px) * 4;
      image.data[o] = image.data[o + 1] = image.data[o + 2] = value;
      image.data[o + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

// Texture d'AO : données linéaires (pas de sRGB), lue sur le 2e jeu d'UV
function toTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.channel = 1;
  return texture;
}

// Canvas du sol et du plafond : assombri près des murs et des coins concaves.
// Calcul PAR SEGMENT, dans le voisinage de chaque mur (± AO_RADIUS) : le coût ne dépend
// plus du nombre de murs × nombre de pixels, donc reste raisonnable sur de grandes grilles.
// La résolution est plafonnée (AO_MAX_TEXTURE_SIZE) : moins de pixels par mètre sur un grand
// bâtiment, sans conséquence pour un dégradé de 0,8 m.
function bakeFloorTexture(walls, bounds) {
  const { minX, minZ, width, depth } = bounds;
  const pxPerM = Math.min(AO_PIXELS_PER_METER, AO_MAX_TEXTURE_SIZE / Math.max(width, depth));
  const W = Math.max(1, Math.ceil(width * pxPerM));
  const H = Math.max(1, Math.ceil(depth * pxPerM));

  // Centre monde d'un pixel (flipY : la rangée 0 du canvas est en haut de la texture)
  const worldX = (px) => minX + ((px + 0.5) / W) * width;
  const worldZ = (py) => minZ + (1 - (py + 0.5) / H) * depth;

  // Parcourt les pixels dont le centre est dans le rectangle monde [x0, x1] × [z0, z1]
  function forPixelsIn(x0, x1, z0, z1, fn) {
    const pxA = Math.max(0, Math.floor(((x0 - minX) / width) * W));
    const pxB = Math.min(W - 1, Math.ceil(((x1 - minX) / width) * W));
    const pyA = Math.max(0, Math.floor((1 - (z1 - minZ) / depth) * H));
    const pyB = Math.min(H - 1, Math.ceil((1 - (z0 - minZ) / depth) * H));
    for (let py = pyA; py <= pyB; py++) {
      for (let px = pxA; px <= pxB; px++) fn(px, py, py * W + px);
    }
  }

  // 1) distance au mur le plus proche (Infinity = hors de portée = pas d'occlusion)
  const nearest = new Float32Array(W * H).fill(Infinity);
  for (const wall of walls) {
    forPixelsIn(
      Math.min(wall.a.x, wall.b.x) - AO_RADIUS,
      Math.max(wall.a.x, wall.b.x) + AO_RADIUS,
      Math.min(wall.a.z, wall.b.z) - AO_RADIUS,
      Math.max(wall.a.z, wall.b.z) + AO_RADIUS,
      (px, py, index) => {
        const d = distanceToSegment(worldX(px), worldZ(py), wall.a, wall.b);
        if (d < nearest[index]) nearest[index] = d;
      },
    );
  }
  const ao = new Float32Array(W * H);
  for (let k = 0; k < ao.length; k++) ao[k] = 1 - AO_STRENGTH * falloff(nearest[k]);

  // 2) coins concaves : deux murs concourent, l'occlusion est plus forte
  for (const wall of walls) {
    for (const [concave, c] of [[wall.leftConcave, wall.a], [wall.rightConcave, wall.b]]) {
      if (!concave) continue;
      forPixelsIn(c.x - AO_RADIUS, c.x + AO_RADIUS, c.z - AO_RADIUS, c.z + AO_RADIUS, (px, py, index) => {
        ao[index] *= 1 - AO_STRENGTH * 0.5 * falloff(Math.hypot(worldX(px) - c.x, worldZ(py) - c.z));
      });
    }
  }

  return bakeCanvas(W, H, (px, py) => ao[py * W + px]);
}

// Copie d'un canvas
function cloneCanvas(source) {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  copy.getContext('2d').drawImage(source, 0, 0);
  return copy;
}

// Texture d'un mur : bas (sol), haut (plafond), et extrémités qui sont des coins concaves
function bakeWallTexture({ leftConcave, rightConcave }) {
  const width = Math.ceil(CELL_SIZE * AO_PIXELS_PER_METER);
  const height = Math.ceil(CEILING_HEIGHT * AO_PIXELS_PER_METER);
  const canvas = bakeCanvas(width, height, (px, py) => {
    const x = ((px + 0.5) / width) * CELL_SIZE; // depuis l'extrémité gauche
    const y = (1 - (py + 0.5) / height) * CEILING_HEIGHT; // depuis le sol
    let ao = (1 - AO_STRENGTH * falloff(y)) * (1 - AO_STRENGTH * falloff(CEILING_HEIGHT - y));
    if (leftConcave) ao *= 1 - AO_STRENGTH * falloff(x);
    if (rightConcave) ao *= 1 - AO_STRENGTH * falloff(CELL_SIZE - x);
    return ao;
  });
  return toTexture(canvas);
}

// Texture des séparateurs verticaux : seulement un dégradé en hauteur (bas : sol,
// haut : plafond), identique sur tout le pourtour
function bakeColumnTexture() {
  const height = Math.ceil(CEILING_HEIGHT * AO_PIXELS_PER_METER);
  const canvas = bakeCanvas(4, height, (px, py) => {
    const y = (1 - (py + 0.5) / height) * CEILING_HEIGHT;
    return (1 - AO_STRENGTH * falloff(y)) * (1 - AO_STRENGTH * falloff(CEILING_HEIGHT - y));
  });
  return toTexture(canvas);
}

// Prépare l'AO de la salle ; null si désactivée (AO_STRENGTH = 0).
// Retourne { floorUV(x, z), wallTexture(origin, side), columnTexture } :
//  - floorUV : coordonnées UV1 d'un point du sol / plafond (monde) ;
//  - wallTexture : texture d'AO du mur d'une cellule (origin = { x, z } monde),
//    réutilisée par les plinthes de ce mur ; wallMaterialFor : matériau avec cette AO ;
//  - columnTexture : texture d'AO des séparateurs verticaux.
// Les matériaux sol et plafond reçoivent leur texture ici.
export function createBakedAO(cells) {
  if (AO_STRENGTH <= 0) return null;

  const has = cellLookup(cells);
  const walls = [];
  const byKey = new Map();
  for (const [i, j] of cells) {
    for (const side of SIDES) {
      if (has(i + side.di, j + side.dj)) continue;
      const wall = describeWall(has, i, j, side);
      walls.push(wall);
      byKey.set(`${i},${j},${side.name}`, wall);
    }
  }

  // Emprise du bâtiment (boucle plutôt que Math.min(...tableau) : sûr sur de très grandes listes)
  let minI = Infinity;
  let maxI = -Infinity;
  let minJ = Infinity;
  let maxJ = -Infinity;
  for (const [i, j] of cells) {
    minI = Math.min(minI, i);
    maxI = Math.max(maxI, i);
    minJ = Math.min(minJ, j);
    maxJ = Math.max(maxJ, j);
  }
  const bounds = {
    minX: (minI - 0.5) * CELL_SIZE,
    minZ: (minJ - 0.5) * CELL_SIZE,
    width: (maxI - minI + 1) * CELL_SIZE,
    depth: (maxJ - minJ + 1) * CELL_SIZE,
  };

  // Sol et plafond partagent le même calcul de base, mais le plafond a sa propre
  // copie : les ombres de contact des objets ne concernent que le sol.
  const floorCanvas = bakeFloorTexture(walls, bounds);
  const floorTexture = toTexture(floorCanvas);
  const ceilingTexture = toTexture(cloneCanvas(floorCanvas));
  setBakedAO(floorMaterial, floorTexture);
  setBakedAO(ceilingMaterial, ceilingTexture);
  ceilingMaterial.emissiveMap = ceilingTexture; // plafond surtout émissif : on module aussi l'émissive

  // Textures de murs : seulement 4 variantes (coin concave à gauche / à droite), calculées
  // à la demande ; matériaux partagés par (matériau de base, variante) au lieu d'un clone par mur.
  const wallTextures = new Map();
  const wallMaterials = new Map();
  function wallVariant(origin, side) {
    const i = Math.round(origin.x / CELL_SIZE);
    const j = Math.round(origin.z / CELL_SIZE);
    const wall = byKey.get(`${i},${j},${side.name}`);
    return { key: `${wall.leftConcave ? 1 : 0}${wall.rightConcave ? 1 : 0}`, wall };
  }
  return {
    columnTexture: bakeColumnTexture(),
    // Ombres de contact des objets posés au sol : `contacts` = [{ x, z, radius }]
    // (monde, mètres). Un dégradé radial sombre est multiplié dans la texture du sol.
    addContacts(contacts) {
      const context = floorCanvas.getContext('2d');
      const pxPerM = floorCanvas.width / bounds.width;
      context.globalCompositeOperation = 'multiply';
      for (const { x, z, radius } of contacts) {
        const cx = (x - bounds.minX) * pxPerM;
        const cy = (1 - (z - bounds.minZ) / bounds.depth) * floorCanvas.height;
        const r = radius * pxPerM;
        const dark = Math.round(255 * (1 - AO_CONTACT_STRENGTH));
        const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgb(${dark},${dark},${dark})`);
        gradient.addColorStop(1, 'rgb(255,255,255)');
        context.fillStyle = gradient;
        context.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      }
      context.globalCompositeOperation = 'source-over';
      floorTexture.needsUpdate = true;
    },
    floorUV: (x, z) => [(x - bounds.minX) / bounds.width, (z - bounds.minZ) / bounds.depth],
    wallTexture(origin, side) {
      const { key, wall } = wallVariant(origin, side);
      if (!wallTextures.has(key)) wallTextures.set(key, bakeWallTexture(wall));
      return wallTextures.get(key);
    },
    // Matériau `base` (mur ou plinthe) avec l'AO du mur de la cellule `origin`, côté `side`
    wallMaterialFor(base, origin, side) {
      const { key } = wallVariant(origin, side);
      const cacheKey = `${base.uuid}|${key}`;
      if (!wallMaterials.has(cacheKey)) {
        const material = base.clone();
        setBakedAO(material, this.wallTexture(origin, side));
        wallMaterials.set(cacheKey, material);
      }
      return wallMaterials.get(cacheKey);
    },
  };
}
