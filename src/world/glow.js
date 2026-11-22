import * as THREE from 'three';
import {
  HOVER_GLOW_COLOR,
  HOVER_GLOW_POWER,
  HOVER_GLOW_SIZE,
  PAINTING_WALL_OFFSET,
} from '../config.js';

const PIXELS_PER_METER = 200; // résolution de la texture du dégradé

// Texture du dégradé : alpha = 1 sur le rectangle du tableau (cadre compris),
// puis décroissance douce jusqu'à 0 à HOVER_GLOW_SIZE du bord (distance au
// rectangle, donc coins arrondis et bords uniformes quel que soit le ratio).
function bakeGradient(width, height) {
  const w = Math.ceil((width + 2 * HOVER_GLOW_SIZE) * PIXELS_PER_METER);
  const h = Math.ceil((height + 2 * HOVER_GLOW_SIZE) * PIXELS_PER_METER);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d');
  const image = context.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // Position en mètres depuis le centre
      const x = ((px + 0.5) / w - 0.5) * (width + 2 * HOVER_GLOW_SIZE);
      const y = ((py + 0.5) / h - 0.5) * (height + 2 * HOVER_GLOW_SIZE);
      const dx = Math.max(Math.abs(x) - width / 2, 0);
      const dy = Math.max(Math.abs(y) - height / 2, 0);
      const k = Math.max(0, 1 - Math.hypot(dx, dy) / HOVER_GLOW_SIZE);
      const o = (py * w + px) * 4;
      image.data[o] = image.data[o + 1] = image.data[o + 2] = 255;
      image.data[o + 3] = Math.round(255 * Math.pow(k, HOVER_GLOW_POWER));
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// « Glow » de survol : un dégradé lumineux autour du tableau et de son cadre
// (width × height = taille cadre compris). Ce n'est PAS une lumière : juste un
// plan translucide posé contre le mur, en fusion additive, invisible au repos
// (opacité 0, animée par nav/highlight.js).
export function createGlow(width, height) {
  const material = new THREE.MeshBasicMaterial({
    map: bakeGradient(width, height),
    color: HOVER_GLOW_COLOR,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true, // évite le scintillement avec le mur
    polygonOffsetFactor: -1,
  });
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 2 * HOVER_GLOW_SIZE, height + 2 * HOVER_GLOW_SIZE),
    material,
  );
  glow.name = 'glow';
  glow.position.z = -PAINTING_WALL_OFFSET + 0.002; // 2 mm devant le mur
  glow.raycast = () => {}; // ne compte pas pour le picking : la zone survolable reste celle du tableau
  return glow;
}
