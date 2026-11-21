import * as THREE from 'three';
import { CEILING_HEIGHT } from '../config.js';

// Lumière d'ambiance globale (ciel clair / sol chaud)
export function createGlobalLight() {
  return new THREE.HemisphereLight(0xffffff, 0x8a7b6a, 1.2);
}

// Lumière douce au plafond d'une cellule, à la position monde (x, z)
export function createCellLight(x, z) {
  const light = new THREE.PointLight(0xfff2e0, 12, 0, 2);
  light.position.set(x, CEILING_HEIGHT - 0.5, z);
  return light;
}
