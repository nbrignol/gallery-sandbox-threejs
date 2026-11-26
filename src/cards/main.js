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

const hover = createHover({ canvas, camera, cards });

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  hover.update(Math.min(clock.getDelta(), 0.1), clock.elapsedTime);
  renderer.render(scene, camera);
});
