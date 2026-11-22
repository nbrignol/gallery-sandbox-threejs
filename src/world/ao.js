import * as THREE from 'three';
import {
  AO_CONTACT_STRENGTH,
  AO_PIXELS_PER_METER,
  AO_RADIUS,
  AO_STRENGTH,
  CELL_SIZE,
  CEILING_HEIGHT,
} from '../config.js';
import { SIDES } from './cell.js';
import { setBakedAO } from './aoMaterial.js';
import { ceilingMaterial, floorMaterial } from './materials.js';

// Occlusion ambiante « cuite » : dégradés sombres générés une seule fois au
// chargement (canvas → texture), puis lus comme `aoMap` (canal UV 1).
//  - sol et plafond : UNE texture couvrant toute la salle (distance aux murs et
//    aux coins) ; les matériaux sol/plafond sont partagés entre les cellules ;
//  - murs : une texture par mur (bas, haut, et extrémités qui sont de vrais coins).
// L'AO n'atténue que la lumière d'ambiance (hémisphère, environnement), pas les
// spots ni la lampe de cellule. Pour le plafond, qui est surtout émissif, la
// même texture module aussi l'émissive.

const hasCell = (cells, i, j) => cells.some(([ci, cj]) => ci === i && cj === j);

// Atténuation : 1 au contact, 0 à AO_RADIUS (courbe douce)
function falloff(distance) {
  const k = Math.max(0, 1 - distance / AO_RADIUS);
  return k * k;
}

// Coin concave (angle à 90° dans la salle) au point de grille (vx, vz) en
// demi-cellules : une seule cellule occupée autour. Un angle rentrant (3
// cellules) est convexe vu de la salle : pas d'occlusion.
function isConcaveCorner(cells, vx, vz) {
  const a = (vx - 1) / 2;
  const b = (vz - 1) / 2;
  const count = [
    hasCell(cells, a, b),
    hasCell(cells, a + 1, b),
    hasCell(cells, a, b + 1),
    hasCell(cells, a + 1, b + 1),
  ].filter(Boolean).length;
  return count === 1;
}

// Un mur : segment en monde + coin concave à chacune de ses extrémités
// (gauche / droite vu de l'intérieur)
function describeWall(cells, i, j, side) {
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
    leftConcave: isConcaveCorner(cells, left.vx, left.vz),
    rightConcave: isConcaveCorner(cells, right.vx, right.vz),
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

// Texture unique du sol et du plafond : assombrie près des murs et des coins concaves
function bakeFloorTexture(cells, walls, bounds) {
  const { minX, minZ, width, depth } = bounds;
  const corners = [];
  for (const wall of walls) {
    if (wall.leftConcave) corners.push(wall.a);
    if (wall.rightConcave) corners.push(wall.b);
  }
  const canvas = bakeCanvas(
    Math.ceil(width * AO_PIXELS_PER_METER),
    Math.ceil(depth * AO_PIXELS_PER_METER),
    (px, py) => {
      // flipY : la rangée 0 du canvas est en haut de la texture (v = 1)
      const x = minX + ((px + 0.5) / Math.ceil(width * AO_PIXELS_PER_METER)) * width;
      const z = minZ + (1 - (py + 0.5) / Math.ceil(depth * AO_PIXELS_PER_METER)) * depth;
      let nearest = Infinity;
      for (const wall of walls) nearest = Math.min(nearest, distanceToSegment(x, z, wall.a, wall.b));
      let ao = 1 - AO_STRENGTH * falloff(nearest);
      // Coins concaves : deux murs concourent, l'occlusion est plus forte
      for (const c of corners) ao *= 1 - AO_STRENGTH * 0.5 * falloff(Math.hypot(x - c.x, z - c.z));
      return ao;
    },
  );
  return canvas;
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
//    réutilisée par les plinthes de ce mur ;
//  - columnTexture : texture d'AO des séparateurs verticaux.
// Les matériaux sol et plafond reçoivent leur texture ici.
export function createBakedAO(cells) {
  if (AO_STRENGTH <= 0) return null;

  const walls = [];
  const byKey = new Map();
  for (const [i, j] of cells) {
    for (const side of SIDES) {
      if (hasCell(cells, i + side.di, j + side.dj)) continue;
      const wall = describeWall(cells, i, j, side);
      walls.push(wall);
      byKey.set(`${i},${j},${side.name}`, wall);
    }
  }

  const is = cells.map(([i]) => i);
  const js = cells.map(([, j]) => j);
  const minX = (Math.min(...is) - 0.5) * CELL_SIZE;
  const minZ = (Math.min(...js) - 0.5) * CELL_SIZE;
  const bounds = {
    minX,
    minZ,
    width: (Math.max(...is) - Math.min(...is) + 1) * CELL_SIZE,
    depth: (Math.max(...js) - Math.min(...js) + 1) * CELL_SIZE,
  };

  // Sol et plafond partagent le même calcul de base, mais le plafond a sa propre
  // copie : les ombres de contact des objets ne concernent que le sol.
  const floorCanvas = bakeFloorTexture(cells, walls, bounds);
  const floorTexture = toTexture(floorCanvas);
  const ceilingTexture = toTexture(cloneCanvas(floorCanvas));
  setBakedAO(floorMaterial, floorTexture);
  setBakedAO(ceilingMaterial, ceilingTexture);
  ceilingMaterial.emissiveMap = ceilingTexture; // plafond surtout émissif : on module aussi l'émissive

  const wallTextures = new Map();
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
      const i = Math.round(origin.x / CELL_SIZE);
      const j = Math.round(origin.z / CELL_SIZE);
      const key = `${i},${j},${side.name}`;
      if (!wallTextures.has(key)) wallTextures.set(key, bakeWallTexture(byKey.get(key)));
      return wallTextures.get(key);
    },
  };
}
