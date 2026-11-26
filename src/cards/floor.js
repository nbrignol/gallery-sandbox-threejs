import * as THREE from 'three';
import {
  FLOOR_EXTENT,
  FLOOR_FOLDER,
  FLOOR_SHADOW_OPACITY,
  FLOOR_TRANSPARENT,
  FLOOR_SEGMENTS,
  FLOOR_TEXTURE_SIZE,
} from './config.js';

const loader = new THREE.TextureLoader();

function loadMap(file, isColor = false) {
  const texture = loader.load(`${import.meta.env.BASE_URL}textures/${FLOOR_FOLDER}/${file}`);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Plan de sol couché, centré en (0,0,0). UV en mètres / taille du motif (comme world/cell.js).
export function createFloor() {
  const geometry = new THREE.PlaneGeometry(FLOOR_EXTENT, FLOOR_EXTENT, FLOOR_SEGMENTS, FLOOR_SEGMENTS);
  const uv = geometry.attributes.uv;
  const pos = geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, pos.getX(i) / FLOOR_TEXTURE_SIZE, pos.getY(i) / FLOOR_TEXTURE_SIZE);
  }
  // Sol transparent : seules les ombres reçues sont visibles
  const material = FLOOR_TRANSPARENT
    ? new THREE.ShadowMaterial({ color: 0x000000, opacity: FLOOR_SHADOW_OPACITY })
    : new THREE.MeshStandardMaterial({
        map: loadMap('color.jpg', true),
        normalMap: loadMap('normal.jpg'),
        roughness: 0.9,
      });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  return floor;
}
