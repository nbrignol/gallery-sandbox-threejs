import * as THREE from 'three';
import { TONE_EXPOSURE } from '../config.js';
import { artworks } from '../data/artworks.js';
import {
  BACKGROUND_COLOR,
  CAMERA_FILL,
  CAMERA_FOV,
  CAMERA_TILT_DEG,
  CARDS,
  CARD_BACK_TEXTURE,
  CARD_SIZE,
  HEMI_GROUND_COLOR,
  HEMI_INTENSITY,
  HEMI_SKY_COLOR,
  SPOT_ANGLE_DEG,
  SPOT_COLOR,
  SPOT_DECAY,
  SPOT_INTENSITY,
  SPOT_PENUMBRA,
  SHADOW_BIAS,
  SHADOW_INTENSITY,
  SHADOW_MAP_SIZE,
  SHADOW_NORMAL_BIAS,
  SHADOW_RADIUS,
  SPOT_POSITION,
} from './config.js';
import { createFloor } from './floor.js';
import { createCard, loadBackTexture } from './card.js';
import { createHover } from './hover.js';
import { createFlow } from './flow.js';
import { createTooltip } from './tooltip.js';
import { createCardPanel } from './panel.js';
import './cards.css';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_EXPOSURE;

const scene = new THREE.Scene();
scene.background = new THREE.Color(BACKGROUND_COLOR);
scene.add(new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY));

// Spot sur les cartes
const spot = new THREE.SpotLight(SPOT_COLOR, SPOT_INTENSITY, 0, THREE.MathUtils.degToRad(SPOT_ANGLE_DEG), SPOT_PENUMBRA, SPOT_DECAY);
spot.position.set(...SPOT_POSITION);
spot.target.position.set(0, 0, 0);
spot.castShadow = true;
spot.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
spot.shadow.bias = SHADOW_BIAS;
spot.shadow.normalBias = SHADOW_NORMAL_BIAS;
spot.shadow.radius = SHADOW_RADIUS;
spot.shadow.intensity = SHADOW_INTENSITY;
spot.shadow.camera.near = 2;
spot.shadow.camera.far = 14;
scene.add(spot, spot.target);

const floor = createFloor();
floor.receiveShadow = true;
scene.add(floor);

// Cartes : dos commun, face = tableau
const backTexture = loadBackTexture(CARD_BACK_TEXTURE);
const cards = CARDS.map((config, index) => {
  const artwork = artworks[config.artwork];
  if (!artwork) throw new Error(`cartes : œuvre inconnue « ${config.artwork} ».`);
  const card = createCard({ config, artwork, index, backTexture });
  card.castShadow = true;
  card.receiveShadow = true;
  scene.add(card);
  return card;
});

// Caméra en plongée inclinée sur un seul axe : haut de l'écran = -Z, droite = +X
const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
camera.up.set(0, 0, -1);

// Distance pour que la rangée de cartes occupe CAMERA_FILL de la largeur (ou de la hauteur)
function fitCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const xs = CARDS.map((c) => c.offsetX);
  const width = Math.max(...xs) - Math.min(...xs) + CARD_SIZE * 1.2;
  const height = CARD_SIZE * 1.5;
  const tan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const forHeight = height / CAMERA_FILL / 2 / tan;
  const forWidth = width / CAMERA_FILL / 2 / tan / aspect;
  camera.aspect = aspect;
  // Caméra sur l'arc vertical (plan YZ) autour de l'origine : un seul axe de rotation
  const distance = Math.max(forHeight, forWidth);
  const tilt = THREE.MathUtils.degToRad(CAMERA_TILT_DEG);
  camera.position.set(0, distance * Math.cos(tilt), distance * Math.sin(tilt));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', fitCamera);
fitCamera();

// Le survol est suspendu dès qu'une carte est piochée (flow est défini juste après)
let flow = null;
const hover = createHover({ canvas, camera, cards, enabled: () => !flow?.isActive() });
const panel = createCardPanel({
  onClose: () => flow.drop(),
  onPrev: () => flow.goTo(-1),
  onNext: () => flow.goTo(1),
});
flow = createFlow({ canvas, camera, hover, panel });
const tooltip = createTooltip({ scene, camera, anchorOf: hover.anchorOf });

// Clavier : sur la table, ← → sélectionnent une carte (comme le survol) et Entrée la pioche ;
// carte flottante : ← → affichent la précédente / suivante, Échap la repose.
window.addEventListener('keydown', (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (step) {
    event.preventDefault();
    if (flow.isFloating()) flow.goTo(step);
    else if (!flow.isActive()) {
      const current = hover.hovered ? cards.indexOf(hover.hovered) : -1;
      const next = current < 0 ? (step > 0 ? 0 : cards.length - 1) : (current + step + cards.length) % cards.length;
      hover.select(cards[next]);
    }
  } else if (event.key === 'Enter') {
    if (!flow.isActive() && hover.hovered) {
      event.preventDefault();
      flow.start(hover.hovered, clock.elapsedTime);
    }
  } else if (event.key === 'Escape') {
    if (flow.isFloating()) flow.drop();
    else if (!flow.isActive()) hover.select(null);
  }
});

// Test : ?carte=2 ouvre directement la 2e carte (&p=0.5 : à mi-course)
const openParam = Number(new URLSearchParams(location.search).get('carte'));
if (openParam >= 1 && openParam <= cards.length) {
  flow.start(cards[openParam - 1], 0);
  const seek = new URLSearchParams(location.search).get('p');
  if (seek !== null) flow.seek(Number(seek));
}

// Test : ?survol=2 sélectionne la 2e carte (comme au clavier)
const hoverParam = Number(new URLSearchParams(location.search).get('survol'));
if (hoverParam >= 1 && hoverParam <= cards.length) {
  hover.select(cards[hoverParam - 1]);
  for (let i = 0; i < 60; i++) {
    hover.update(0.05, i * 0.05); // avance l'état lissé (capture de test)
    tooltip.update(0.05, hover.hovered);
  }
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  hover.update(dt, clock.elapsedTime);
  flow.update(dt, clock.elapsedTime);
  tooltip.update(dt, flow.isActive() ? null : hover.hovered);
  renderer.render(scene, camera);
});
