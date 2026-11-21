import * as THREE from 'three';
import { FRAME_COLOR } from '../config.js';

// Matériaux provisoires (couleurs unies), partagés entre les cellules.
// Remplacés par des textures PBR à l'étape 7.
export const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7b6a, roughness: 0.8 });
export const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 });
export const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });

// Cadre : bois sombre mat (couleur unie). Surchargeable par tableau (voir frame.js).
export function createFrameMaterial(color = FRAME_COLOR) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
}
export const frameMaterial = createFrameMaterial();
