import * as THREE from 'three';
import {
  CEILING_HEIGHT,
  PLINTH_BOTTOM_HEIGHT,
  PLINTH_DEPTH,
  PLINTH_TOP_HEIGHT,
} from '../config.js';
import {
  FLOOR,
  PLINTH_BOTTOM,
  PLINTH_TOP,
  WALL,
  ceilingMaterial,
  floorMaterial,
  plinthBottomMaterial,
  plinthTopMaterial,
  wallMaterial,
} from './materials.js';

// Côtés d'une cellule, dans l'ordre fixe N, E, S, O.
// (di, dj) : décalage vers la cellule voisine sur la grille.
// normal : normale du mur vers l'intérieur de la cellule (plan XZ).
export const SIDES = [
  { name: 'N', di: 0, dj: -1, normal: [0, 1] },
  { name: 'E', di: 1, dj: 0, normal: [-1, 0] },
  { name: 'S', di: 0, dj: 1, normal: [0, -1] },
  { name: 'O', di: -1, dj: 0, normal: [1, 0] },
];

// Recalcule les coordonnées de texture d'un plan : `fn(x, y)` (position locale
// du sommet) retourne [u, v] en nombre de motifs. Les UV sont en coordonnées
// monde (mètres / taille du motif) : échelle constante et raccord entre cellules.
function mapUV(geometry, fn) {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const [u, v] = fn(position.getX(i), position.getY(i));
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}

// Sol (face vers le haut). `origin` : position monde { x, z } de la cellule.
function createFloor(size, origin) {
  const geometry = new THREE.PlaneGeometry(size, size);
  // Après la rotation -π/2 autour de X : z monde = origin.z - y
  mapUV(geometry, (x, y) => [(origin.x + x) / FLOOR.size, (y - origin.z) / FLOOR.size]);
  const floor = new THREE.Mesh(geometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  return floor;
}

// Plafond (face vers le bas)
function createCeiling(size) {
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING_HEIGHT;
  return ceiling;
}

// Rotation d'un élément posé sur un côté : +Z local = normale intérieure
function orient(mesh, side) {
  const [nx, nz] = side.normal;
  mesh.rotation.y = Math.atan2(nx, nz);
}

// Abscisse monde de l'origine de la cellule le long du mur d'un côté
// (axe gauche → droite = (nz, -nx))
function alongOrigin(side, origin) {
  const [nx, nz] = side.normal;
  return origin.x * nz - origin.z * nx;
}

// Mur d'un côté donné, orienté vers l'intérieur, sur toute la hauteur.
// u : abscisse monde le long du mur ; v : hauteur depuis le sol.
function createWall(size, side, origin) {
  const [nx, nz] = side.normal;
  const geometry = new THREE.PlaneGeometry(size, CEILING_HEIGHT);
  const along = alongOrigin(side, origin);
  mapUV(geometry, (x, y) => [(along + x) / WALL.size, (y + CEILING_HEIGHT / 2) / WALL.size]);
  const wall = new THREE.Mesh(geometry, wallMaterial);
  // Le mur est à size/2 du centre, à l'opposé de sa normale intérieure
  wall.position.set((-nx * size) / 2, CEILING_HEIGHT / 2, (-nz * size) / 2);
  orient(wall, side);
  wall.name = `wall-${side.name}`;
  return wall;
}

// UV d'une boîte en coordonnées monde (mètres / taille du motif), selon la
// face : avant/arrière (u le long du mur, v en hauteur), dessus/dessous
// (u le long du mur, v en profondeur), côtés (u en profondeur, v en hauteur).
function mapBoxUV(geometry, along, centerY, textureSize) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    let u;
    let v;
    if (Math.abs(normal.getZ(i)) > 0.5) [u, v] = [along + x, centerY + y];
    else if (Math.abs(normal.getY(i)) > 0.5) [u, v] = [along + x, z];
    else [u, v] = [z, centerY + y];
    uv.setXY(i, u / textureSize, v / textureSize);
  }
  uv.needsUpdate = true;
}

// Plinthe en relief : boîte de `height` de haut et PLINTH_DEPTH d'épaisseur,
// dos contre le mur, de la hauteur `bottom` à `bottom + height`.
function createPlinth(size, side, origin, { name, height, bottom, preset, material }) {
  const [nx, nz] = side.normal;
  const geometry = new THREE.BoxGeometry(size, height, PLINTH_DEPTH);
  mapBoxUV(geometry, alongOrigin(side, origin), bottom + height / 2, preset.size);
  const plinth = new THREE.Mesh(geometry, material);
  const offset = size / 2 - PLINTH_DEPTH / 2; // centre de la boîte, devant le mur
  plinth.position.set(-nx * offset, bottom + height / 2, -nz * offset);
  orient(plinth, side);
  plinth.name = name;
  return plinth;
}

// Plinthes basse (sol) et haute (plafond) d'un côté ; hauteur 0 = pas de plinthe
function createPlinths(size, side, origin) {
  const plinths = [];
  if (PLINTH_BOTTOM_HEIGHT > 0) {
    plinths.push(
      createPlinth(size, side, origin, {
        name: `plinth-bottom-${side.name}`,
        height: PLINTH_BOTTOM_HEIGHT,
        bottom: 0,
        preset: PLINTH_BOTTOM,
        material: plinthBottomMaterial,
      }),
    );
  }
  if (PLINTH_TOP_HEIGHT > 0) {
    plinths.push(
      createPlinth(size, side, origin, {
        name: `plinth-top-${side.name}`,
        height: PLINTH_TOP_HEIGHT,
        bottom: CEILING_HEIGHT - PLINTH_TOP_HEIGHT,
        preset: PLINTH_TOP,
        material: plinthTopMaterial,
      }),
    );
  }
  return plinths;
}

// Cellule carrée centrée sur l'origine du groupe : sol, plafond et
// un mur pour chaque côté demandé (`walls` : noms parmi 'N', 'E', 'S', 'O').
// `origin` : position monde { x, z } de la cellule (pour les UV).
// Retourne le groupe et les maillages de murs créés.
export function createCell(size, walls, origin) {
  const group = new THREE.Group();
  const wallMeshes = [];

  group.add(createFloor(size, origin), createCeiling(size));
  for (const side of SIDES) {
    if (!walls.includes(side.name)) continue;
    const wall = createWall(size, side, origin);
    wallMeshes.push(wall);
    group.add(wall, ...createPlinths(size, side, origin));
  }
  return { group, wallMeshes };
}
