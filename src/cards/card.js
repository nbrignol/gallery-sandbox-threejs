import * as THREE from 'three';
import { CARD_SEGMENTS, CARD_SIZE, CARD_STACK_STEP, CARD_THICKNESS } from './config.js';

const loader = new THREE.TextureLoader();

function loadTexture(url) {
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Géométrie d'une carte à plat (plan XZ, centrée), deux grilles de (n+1)² sommets :
//   - dos  : en haut (y = +e), normale +Y, visible au repos ; groupe 0
//   - face : en bas  (y = -e), normale -Y, visible une fois la carte retournée ; groupe 1
// Les positions de repos sont gardées dans userData pour pouvoir déformer le mesh (étapes suivantes).
function createCardGeometry() {
  const n = CARD_SEGMENTS;
  const row = n + 1;
  const grid = row * row;
  const half = CARD_SIZE / 2;
  const e = CARD_THICKNESS / 2;
  const positions = new Float32Array(grid * 2 * 3);
  const uvs = new Float32Array(grid * 2 * 2);

  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const k = j * row + i;
      const x = (i / n) * CARD_SIZE - half;
      const z = (j / n) * CARD_SIZE - half;
      // dos : vu du dessus (haut de l'écran = -Z), image à l'endroit
      positions.set([x, e, z], k * 3);
      uvs.set([i / n, 1 - j / n], k * 2);
      // face : retournée autour de X pour être lue à l'endroit (haut de l'image = +Z local)
      positions.set([x, -e, z], (grid + k) * 3);
      uvs.set([i / n, j / n], (grid + k) * 2);
    }
  }

  const back = [];
  const face = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      back.push(a, c, b, b, c, d); // normale +Y
      face.push(grid + a, grid + b, grid + c, grid + b, grid + d, grid + c); // normale -Y
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([...back, ...face]);
  geometry.addGroup(0, back.length, 0);
  geometry.addGroup(back.length, face.length, 1);
  geometry.computeVertexNormals();
  geometry.userData.restPositions = positions.slice();
  geometry.computeBoundingSphere();
  return geometry;
}

// Crée une carte : dos commun (backTexture) + face = tableau. `config` = entrée de CARDS,
// `artwork` = œuvre du catalogue, `index` = rang (pour la surélévation).
export function createCard({ config, artwork, index, backTexture }) {
  const materials = [
    new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: loadTexture(artwork.src), roughness: 0.7 }),
  ];
  const mesh = new THREE.Mesh(createCardGeometry(), materials);
  mesh.position.set(config.offsetX, CARD_THICKNESS / 2 + index * CARD_STACK_STEP, config.offsetZ);
  mesh.rotation.y = THREE.MathUtils.degToRad(config.rotationDeg);
  mesh.userData = { index, artwork, config };
  return mesh;
}

export const loadBackTexture = loadTexture;
