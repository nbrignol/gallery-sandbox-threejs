import * as THREE from 'three';
import { CEILING_HEIGHT } from '../config.js';
import { floorMaterial, wallMaterial, ceilingMaterial } from './materials.js';

// Côtés d'une cellule, dans l'ordre fixe N, E, S, O.
// (di, dj) : décalage vers la cellule voisine sur la grille.
// normal : normale du mur vers l'intérieur de la cellule (plan XZ).
export const SIDES = [
  { name: 'N', di: 0, dj: -1, normal: [0, 1] },
  { name: 'E', di: 1, dj: 0, normal: [-1, 0] },
  { name: 'S', di: 0, dj: 1, normal: [0, -1] },
  { name: 'O', di: -1, dj: 0, normal: [1, 0] },
];

// Sol (face vers le haut)
function createFloor(size) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMaterial);
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
function createWall(size, side) {
  const [nx, nz] = side.normal;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(size, CEILING_HEIGHT), wallMaterial);
  // Le mur est à size/2 du centre, à l'opposé de sa normale intérieure
  wall.position.set((-nx * size) / 2, CEILING_HEIGHT / 2, (-nz * size) / 2);
  wall.rotation.y = Math.atan2(nx, nz);
  wall.name = `wall-${side.name}`;
  return wall;
}

// Cellule carrée centrée sur l'origine du groupe : sol, plafond et
// un mur pour chaque côté demandé (`walls` : noms parmi 'N', 'E', 'S', 'O').
// Retourne le groupe et les maillages de murs créés.
export function createCell(size, walls) {
  const group = new THREE.Group();
  const wallMeshes = [];

  group.add(createFloor(size), createCeiling(size));
  for (const side of SIDES) {
    if (!walls.includes(side.name)) continue;
    const wall = createWall(size, side);
    wallMeshes.push(wall);
    group.add(wall);
  }
  return { group, wallMeshes };
}
