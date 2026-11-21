import * as THREE from 'three';

// Matériaux provisoires (couleurs unies), partagés entre les cellules.
// Remplacés par des textures PBR à l'étape 7.
export const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7b6a, roughness: 0.8 });
export const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 });
export const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
