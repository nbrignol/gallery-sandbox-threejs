import * as THREE from 'three';
import { CELL_SIZE, CEILING_HEIGHT } from '../config.js';
import { SIDES, createCell } from './cell.js';
import { createGlobalLight, createCellLight } from './lights.js';
import { createBakedAO } from './ao.js';
import { createSeparators } from './separators.js';

// Une cellule existe-t-elle aux coordonnées de grille (i, j) ?
function hasCell(cells, i, j) {
  return cells.some(([ci, cj]) => ci === i && cj === j);
}

// Côtés où un mur est nécessaire : ceux sans cellule voisine (ordre N, E, S, O)
function getWallSides(cells, i, j) {
  return SIDES.filter((s) => !hasCell(cells, i + s.di, j + s.dj));
}

// Données d'un mur en coordonnées monde, pour la pose des tableaux :
// centre, normale vers l'intérieur, axe « gauche → droite » vu de l'intérieur, largeur.
function getWallData(side, center) {
  const [nx, nz] = side.normal;
  return {
    side: side.name,
    center: new THREE.Vector3(
      center.x - nx * (CELL_SIZE / 2),
      CEILING_HEIGHT / 2,
      center.z - nz * (CELL_SIZE / 2),
    ),
    normal: new THREE.Vector3(nx, 0, nz),
    right: new THREE.Vector3(nz, 0, -nx),
    width: CELL_SIZE,
  };
}

// Assemble la salle à partir de la liste des cellules.
// Retourne :
//  - group : tout ce qu'il faut ajouter à la scène
//  - cells : pour chaque cellule (même ordre que `cells`), { center, walls[] }
//  - occluders : tous les maillages de murs (pour le raycast)
export function createRoom(cells) {
  const group = new THREE.Group();
  const roomCells = [];
  const occluders = [];
  const cellLights = []; // lampe de chaque cellule (même ordre que `cells`)

  const ao = createBakedAO(cells);
  group.add(createGlobalLight(), createSeparators(cells, ao));

  for (const [i, j] of cells) {
    const sides = getWallSides(cells, i, j);
    const origin = { x: i * CELL_SIZE, z: j * CELL_SIZE };
    const { group: cellGroup, wallMeshes } = createCell(
      CELL_SIZE,
      sides.map((s) => s.name),
      origin,
      ao,
    );
    cellGroup.position.set(origin.x, 0, origin.z);
    const cellLight = createCellLight(cellGroup.position.x, cellGroup.position.z);
    cellLights.push(cellLight);
    group.add(cellGroup, cellLight);
    occluders.push(...wallMeshes);

    const center = new THREE.Vector3(cellGroup.position.x, 0, cellGroup.position.z);
    roomCells.push({ center, walls: sides.map((s) => getWallData(s, center)) });
  }

  return { group, cells: roomCells, occluders, ao, cellLights };
}
