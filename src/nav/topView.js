import * as THREE from 'three';
import { CEILING_HEIGHT, CELL_SIZE, TOP_VIEW_MARGIN } from '../config.js';

// Emprise au sol du bâtiment (toutes les cellules) : { minX, maxX, minZ, maxZ }
export function computeBounds(roomCells) {
  const half = CELL_SIZE / 2;
  const xs = roomCells.map(({ center }) => center.x);
  const zs = roomCells.map(({ center }) => center.z);
  return {
    minX: Math.min(...xs) - half,
    maxX: Math.max(...xs) + half,
    minZ: Math.min(...zs) - half,
    maxZ: Math.max(...zs) + half,
  };
}

// Position de la caméra pour voir tout le bâtiment d'en haut (regard à la verticale,
// nord en haut de l'écran) : centrée sur l'emprise, à la hauteur où la largeur ET la
// profondeur tiennent dans l'écran (FOV et ratio actuels), avec TOP_VIEW_MARGIN de marge.
// Le calcul vise le SOMMET des murs, plus proche de la caméra que le sol (donc plus grand à
// l'écran) : la hauteur est celle du cadrage plus CEILING_HEIGHT.
// Valable quel que soit le nombre de cellules.
export function computeTopPosition(bounds, camera) {
  const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const fit = Math.max(depth / (2 * halfTan), width / (2 * halfTan * camera.aspect));
  return new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    fit * TOP_VIEW_MARGIN + CEILING_HEIGHT,
    (bounds.minZ + bounds.maxZ) / 2,
  );
}
