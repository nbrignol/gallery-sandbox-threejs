import * as THREE from 'three';
import {
  CARD_FACE_BORDER,
  CARD_FACE_COLOR,
  CARD_FACE_TEXTURE_SIZE,
  CARD_SEGMENTS,
  CARD_SIZE,
  CARD_STACK_STEP,
  CARD_THICKNESS,
} from './config.js';

const loader = new THREE.TextureLoader();

function loadTexture(url) {
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Texture de la face : bordure blanche, et le tableau en « cover » (il remplit le carré restant,
// sans déformation ; le surplus est rogné au centre). Dessinée dès le chargement de l'image.
function loadFaceTexture(url) {
  const size = CARD_FACE_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = CARD_FACE_COLOR;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const image = new Image();
  image.onload = () => {
    // « cover » : le tableau remplit tout le carré intérieur ; le surplus est rogné, centré
    const inner = size - 2 * CARD_FACE_BORDER;
    const side = Math.min(image.width, image.height); // plus grand carré centré dans l'image
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      CARD_FACE_BORDER,
      CARD_FACE_BORDER,
      inner,
      inner,
    );
    texture.needsUpdate = true;
  };
  image.src = url;
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
    (() => {
      // emissiveMap = la face elle-même : sert à éclairer la carte flottante indépendamment du spot
      const map = loadFaceTexture(artwork.src);
      return new THREE.MeshStandardMaterial({
        map,
        roughness: 0.7,
        emissive: 0xffffff,
        emissiveMap: map,
        emissiveIntensity: 0,
      });
    })(),
  ];
  const mesh = new THREE.Mesh(createCardGeometry(), materials);
  mesh.position.set(config.offsetX, CARD_THICKNESS / 2 + index * CARD_STACK_STEP, config.offsetZ);
  mesh.rotation.y = THREE.MathUtils.degToRad(config.rotationDeg);
  mesh.frustumCulled = false; // la courbure sort du volume de repos
  mesh.userData = {
    index,
    artwork,
    config,
    rest: { position: mesh.position.clone(), quaternion: mesh.quaternion.clone() },
  };
  return mesh;
}

export const loadBackTexture = loadTexture;

// Courbure « pioche » : le bord +Z se relève, comme quand on soulève une carte par un côté.
// `angle` = angle (rad) de la tangente au bord relevé ; 0 = carte plate (pose de repos exacte).
// Le profil est quadratique : la tangente tourne de plus en plus vers le bord relevé
// (φ(u) = angle·u², u de 0 au bord fixe à 1 au bord relevé), puis on intègre le long de la carte.
// Dos (+e) et face (-e) sont décalés le long de la normale de la courbe.
export function bendCard(mesh, angle) {
  const geometry = mesh.geometry;
  const rest = geometry.userData.restPositions;
  const position = geometry.attributes.position;
  const n = CARD_SEGMENTS;
  const row = n + 1;
  const grid = row * row;
  const step = CARD_SIZE / n;

  let z = -CARD_SIZE / 2;
  let y = 0;
  for (let j = 0; j <= n; j++) {
    if (j > 0) {
      const mid = (j - 0.5) / n;
      const phiMid = angle * mid * mid;
      z += step * Math.cos(phiMid);
      y += step * Math.sin(phiMid);
    }
    const u = j / n;
    const phi = angle * u * u;
    const sin = Math.sin(phi);
    const cos = Math.cos(phi);
    for (let i = 0; i <= n; i++) {
      for (const base of [j * row + i, grid + j * row + i]) {
        const offset = rest[base * 3 + 1]; // ±e : côté dos / face
        position.setXYZ(base, rest[base * 3], y + cos * offset, z - sin * offset);
      }
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}
