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
  FLOOR_TRANSPARENT,
  HEMI_GROUND_COLOR,
  HEMI_INTENSITY,
  HEMI_SKY_COLOR,
  INTRO_DELAY,
  INTRO_ENABLED,
  INTRO_DURATION,
  INTRO_SPOT_START_DEG,
  SPOT_ANGLE_DEG,
  SPOT_COLOR,
  SPOT_DECAY,
  SPOT_INTENSITY,
  SPOT_PENUMBRA,
  SHADOW_BIAS,
  SHADOW_ENABLED,
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
import { createContactAO } from './contactAO.js';
import { createTooltip } from './tooltip.js';
import { createCardPanel } from './panel.js';
import './cards.css';

const canvas = document.getElementById('scene');
const stage = document.getElementById('stage');
const loading = document.getElementById('loading');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: FLOOR_TRANSPARENT });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_EXPOSURE;

const scene = new THREE.Scene();
if (!FLOOR_TRANSPARENT) scene.background = new THREE.Color(BACKGROUND_COLOR);
const hemi = new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY);
scene.add(hemi);

// Spot sur les cartes
const spot = new THREE.SpotLight(SPOT_COLOR, SPOT_INTENSITY, 0, THREE.MathUtils.degToRad(SPOT_ANGLE_DEG), SPOT_PENUMBRA, SPOT_DECAY);
spot.position.set(...SPOT_POSITION);
spot.target.position.set(0, 0, 0);
spot.castShadow = SHADOW_ENABLED;
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

// Distance pour que la rangée de cartes occupe CAMERA_FILL de la largeur (ou de la hauteur) de la scène
let cameraDistance = 10;
let tiltDeg = CAMERA_TILT_DEG; // inclinaison courante (animée pendant l'intro)

// Caméra sur l'arc vertical (plan YZ) autour de l'origine : un seul axe de rotation
function placeCamera() {
  const tilt = THREE.MathUtils.degToRad(tiltDeg);
  camera.position.set(0, cameraDistance * Math.cos(tilt), cameraDistance * Math.sin(tilt));
  camera.lookAt(0, 0, 0);
}

function fitCamera() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  const aspect = width / height;
  const xs = CARDS.map((c) => c.offsetX);
  const cardsWidth = Math.max(...xs) - Math.min(...xs) + CARD_SIZE * 1.2;
  const cardsHeight = CARD_SIZE * 1.5;
  const tan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const forHeight = cardsHeight / CAMERA_FILL / 2 / tan;
  const forWidth = cardsWidth / CAMERA_FILL / 2 / tan / aspect;
  camera.aspect = aspect;
  cameraDistance = Math.max(forHeight, forWidth);
  placeCamera();
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false); // le CSS (100 % du conteneur) fixe la taille d'affichage
}
new ResizeObserver(fitCamera).observe(stage);
fitCamera();

// Animation de démarrage : p = 0 (vue du dessus, tout noir) → 1 (scène finale)
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const spotAngle = THREE.MathUtils.degToRad(SPOT_ANGLE_DEG);
function applyIntro(p) {
  const light = easeOutCubic(p);
  tiltDeg = CAMERA_TILT_DEG * easeInOutCubic(p);
  placeCamera();
  spot.angle = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(INTRO_SPOT_START_DEG), spotAngle, light);
  spot.intensity = SPOT_INTENSITY * Math.min(1, p * 4); // la lumière s'allume au début puis s'élargit
  hemi.intensity = HEMI_INTENSITY * light;
}
const intro = { state: 'waiting', t: 0 }; // waiting → playing → done
const introParam = new URLSearchParams(location.search).get('intro'); // test : ?intro=skip ou ?intro=0.5 (figé)
const params = new URLSearchParams(location.search);
if (!INTRO_ENABLED || introParam !== null || params.has('carte') || params.has('survol')) {
  intro.state = 'done';
  loading.classList.add('is-hidden');
  applyIntro(introParam !== null && introParam !== 'skip' ? Number(introParam) : 1);
} else {
  applyIntro(0);
  canvas.style.pointerEvents = 'none'; // pas d'interaction avant la fin de l'intro
}

// Visibilité : l'intro se lance quand la moitié de la scène est à l'écran ; hors écran, on ne rend plus
let onScreen = false;
new IntersectionObserver(
  ([entry]) => {
    onScreen = entry.isIntersecting;
    if (intro.state === 'waiting' && entry.intersectionRatio >= 0.5) {
      intro.state = 'playing';
      loading.classList.add('is-hidden');
    }
  },
  { threshold: [0, 0.5] },
).observe(stage);

// Le survol est suspendu dès qu'une carte est piochée (flow est défini juste après)
let flow = null;
const hover = createHover({ canvas, camera, cards, enabled: () => intro.state === 'done' && !flow?.isActive() });
const panel = createCardPanel({
  parent: stage,
  onClose: () => flow.drop(),
  onPrev: () => flow.goTo(-1),
  onNext: () => flow.goTo(1),
});
flow = createFlow({ canvas, camera, hover, panel });
const contactAO = createContactAO({ scene, cards });
const tooltip = createTooltip({ scene, camera, anchorOf: hover.anchorOf });

// Clavier (quand la scène a le focus : clic ou Tab) : sur la table, ← → sélectionnent une carte (comme le survol) et Entrée la pioche ;
// carte flottante : ← → affichent la précédente / suivante, Échap la repose.
stage.addEventListener('keydown', (event) => {
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
  if (!onScreen) return;
  if (intro.state === 'playing') {
    intro.t += dt;
    const p = THREE.MathUtils.clamp((intro.t - INTRO_DELAY) / INTRO_DURATION, 0, 1);
    applyIntro(p);
    if (p >= 1) {
      intro.state = 'done';
      canvas.style.pointerEvents = '';
    }
  }
  hover.update(dt, clock.elapsedTime);
  flow.update(dt, clock.elapsedTime);
  contactAO.update();
  tooltip.update(dt, flow.isActive() ? null : hover.hovered);
  renderer.render(scene, camera);
});
