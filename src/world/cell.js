import * as THREE from 'three';
import { CEILING_HEIGHT } from '../config.js';
import { FLOOR, WALL, floorMaterial, wallMaterial, ceilingMaterial } from './materials.js';

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

// Mur d'un côté donné, orienté vers l'intérieur de la cellule
function createWall(size, side, origin) {
  const [nx, nz] = side.normal;
  const geometry = new THREE.PlaneGeometry(size, CEILING_HEIGHT);
  // u : abscisse monde le long du mur (axe gauche → droite = (nz, -nx)) ;
  // v : hauteur depuis le sol
  const along = origin.x * nz - origin.z * nx;
  mapUV(geometry, (x, y) => [(along + x) / WALL.size, (y + CEILING_HEIGHT / 2) / WALL.size]);
  const wall = new THREE.Mesh(geometry, wallMaterial);
  // Le mur est à size/2 du centre, à l'opposé de sa normale intérieure
  wall.position.set((-nx * size) / 2, CEILING_HEIGHT / 2, (-nz * size) / 2);
  wall.rotation.y = Math.atan2(nx, nz);
  wall.name = `wall-${side.name}`;
  return wall;
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
    group.add(wall);
  }
  return { group, wallMeshes };
}
