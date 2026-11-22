import * as THREE from 'three';
import {
  CEILING_HEIGHT,
  CELL_LIGHT_DROP,
  CELL_LIGHT_INTENSITY,
  CELL_SHADOW_BIAS,
  CELL_SHADOW_MAP_SIZE,
  CELL_SHADOW_NORMAL_BIAS,
  HEMI_GROUND_COLOR,
  HEMI_INTENSITY,
  HEMI_SKY_COLOR,
  SHADOW_RADIUS,
} from '../config.js';

// Lumière d'ambiance globale. La couleur « sol » éclaire les faces tournées
// vers le bas (le plafond) : elle doit rester claire.
export function createGlobalLight() {
  return new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY);
}

// Lampe douce d'une cellule, à la position monde (x, z), sous le plafond.
// Elle projette des ombres (objets, cadres) : la carte d'ombre est calculée une
// seule fois, avec celles des spots (voir shadows.js).
export function createCellLight(x, z, castShadow = true) {
  const light = new THREE.PointLight(0xfff2e0, CELL_LIGHT_INTENSITY, 0, 2);
  light.position.set(x, CEILING_HEIGHT - CELL_LIGHT_DROP, z);
  light.castShadow = castShadow;
  light.shadow.mapSize.set(CELL_SHADOW_MAP_SIZE, CELL_SHADOW_MAP_SIZE);
  light.shadow.camera.near = 0.3;
  light.shadow.camera.far = 14; // jusqu'au bout de la salle
  light.shadow.bias = CELL_SHADOW_BIAS;
  light.shadow.normalBias = CELL_SHADOW_NORMAL_BIAS;
  light.shadow.radius = SHADOW_RADIUS;
  return light;
}
