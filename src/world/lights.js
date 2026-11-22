import * as THREE from 'three';
import {
  CEILING_HEIGHT,
  CELL_LIGHT_DROP,
  CELL_LIGHT_INTENSITY,
  HEMI_GROUND_COLOR,
  HEMI_INTENSITY,
  HEMI_SKY_COLOR,
} from '../config.js';

// Lumière d'ambiance globale. La couleur « sol » éclaire les faces tournées
// vers le bas (le plafond) : elle doit rester claire.
export function createGlobalLight() {
  return new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY);
}

// Lampe douce d'une cellule, à la position monde (x, z), sous le plafond
export function createCellLight(x, z) {
  const light = new THREE.PointLight(0xfff2e0, CELL_LIGHT_INTENSITY, 0, 2);
  light.position.set(x, CEILING_HEIGHT - CELL_LIGHT_DROP, z);
  return light;
}
