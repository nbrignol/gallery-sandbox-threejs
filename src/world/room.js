import * as THREE from 'three';
import { CELL_SHADOW_MAX_CELLS, CELL_SIZE, CEILING_HEIGHT } from '../config.js';
import { SIDES, createCell } from './cell.js';
import { createGlobalLight, createCellLight } from './lights.js';
import { createBakedAO } from './ao.js';
import { createSeparators } from './separators.js';
import { cellLookup } from './cellLookup.js';

// Côtés où un mur est nécessaire : ceux sans cellule voisine (ordre N, E, S, O).
// `has(i, j)` : une cellule existe-t-elle aux coordonnées de grille (i, j) ?
function getWallSides(has, i, j) {
  return SIDES.filter((s) => !has(i + s.di, j + s.dj));
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
//  - cells : pour chaque cellule (même ordre que `cells`), { center, walls[], neighbors[] }
//    (neighbors = index des cellules directement connectées) ; cellIndexAt(x, z) ; hemisphere
//  - occluders : tous les maillages de murs (pour le raycast)
export function createRoom(cells) {
  const group = new THREE.Group();
  const roomCells = [];
  const occluders = [];
  const cellLights = []; // lampe de chaque cellule (même ordre que `cells`)

  const has = cellLookup(cells);
  const ao = createBakedAO(cells);
  const hemisphere = createGlobalLight();
  group.add(hemisphere, createSeparators(cells, ao));

  // Index de chaque cellule par ses coordonnées de grille (voisinage et recherche par position)
  const indexByKey = new Map(cells.map(([i, j], k) => [`${i},${j}`, k]));
  const lampShadows = cells.length <= CELL_SHADOW_MAX_CELLS;
  if (!lampShadows) {
    console.warn(
      `${cells.length} cellules (> ${CELL_SHADOW_MAX_CELLS}) : les lampes de cellule ne projettent pas d'ombres (mémoire).`,
    );
  }

  for (const [i, j] of cells) {
    const sides = getWallSides(has, i, j);
    const origin = { x: i * CELL_SIZE, z: j * CELL_SIZE };
    const { group: cellGroup, wallMeshes } = createCell(
      CELL_SIZE,
      sides.map((s) => s.name),
      origin,
      ao,
    );
    cellGroup.position.set(origin.x, 0, origin.z);
    const cellLight = createCellLight(cellGroup.position.x, cellGroup.position.z, lampShadows);
    cellLights.push(cellLight);
    group.add(cellGroup, cellLight);
    occluders.push(...wallMeshes);

    const center = new THREE.Vector3(cellGroup.position.x, 0, cellGroup.position.z);
    // Cellules directement connectées : voisines par un côté (pas de mur entre elles)
    const neighbors = SIDES.map((s) => indexByKey.get(`${i + s.di},${j + s.dj}`)).filter(
      (index) => index !== undefined,
    );
    roomCells.push({ center, walls: sides.map((s) => getWallData(s, center)), neighbors });
  }

  // Index de la cellule contenant le point (x, z), -1 si aucune (ex. creux d'un angle rentrant)
  function cellIndexAt(x, z) {
    return indexByKey.get(`${Math.round(x / CELL_SIZE)},${Math.round(z / CELL_SIZE)}`) ?? -1;
  }

  return { group, cells: roomCells, occluders, ao, cellLights, hemisphere, cellIndexAt };
}
