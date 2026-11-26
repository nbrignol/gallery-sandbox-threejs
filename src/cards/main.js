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
  EXPAND_BORDER_RADIUS,
  EXPAND_DIM_TABLE,
  SHADE_COLOR,
  VEIL_BLUR,
  SHADE_OPACITY,
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
const view = document.getElementById('view');
const backdrop = document.getElementById('backdrop');
// Voile HTML derrière le canvas : il floute la page quand une carte flotte (le canvas, au-dessus, reste net)
backdrop.style.backdropFilter = backdrop.style.webkitBackdropFilter = `blur(${VEIL_BLUR}px)`;
const loading = document.getElementById('loading');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: FLOOR_TRANSPARENT });
renderer.autoClear = false; // l'effacement est fait à la main : 2 passes quand une carte est au premier plan
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false; // mise à jour demandée une fois par frame (2 passes de rendu)
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
// Les lumières servent aussi à la passe « premier plan » (couche 1)
spot.layers.enable(1);
hemi.layers.enable(1);

// Plan noir plein écran (en coordonnées écran), dessiné après la table et avant la carte au premier plan
const shade = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(SHADE_COLOR) } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uOpacity; uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, uOpacity); }',
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }),
);
shade.frustumCulled = false;
shade.renderOrder = 1000;
shade.visible = false;
scene.add(shade);

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

// Taille du canvas : celle de la scène dans la page, ou (en plein écran) celle de la fenêtre.
// La distance de la caméra ne dépend que de la scène dans la page : elle ne bouge pas quand le canvas grandit.
// La caméra garde toujours le cadrage de la scène dans la page (aspect et distance) ; en plein écran, le canvas
// n'est qu'une fenêtre plus grande sur ce même cadrage (setViewOffset) : la table reste exactement à sa place.
// (x, y) = coin haut gauche du canvas par rapport au cadre de la scène dans la page.
const viewInfo = { x: 0, y: 0, w: 1, h: 1, fullW: 1, fullH: 1 };
function resizeView(width, height, x = 0, y = 0) {
  const fullW = stage.clientWidth;
  const fullH = stage.clientHeight;
  camera.aspect = fullW / fullH;
  if (x !== 0 || y !== 0 || width !== fullW || height !== fullH) camera.setViewOffset(fullW, fullH, x, y, width, height);
  else camera.clearViewOffset();
  Object.assign(viewInfo, { x, y, w: width, h: height, fullW, fullH });
  placeCamera();
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false); // le CSS (100 % du conteneur) fixe la taille d'affichage
}

function fitCamera() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  const xs = CARDS.map((c) => c.offsetX);
  const cardsWidth = Math.max(...xs) - Math.min(...xs) + CARD_SIZE * 1.2;
  const cardsHeight = CARD_SIZE * 1.5;
  const tan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const forHeight = cardsHeight / CAMERA_FILL / 2 / tan;
  const forWidth = cardsWidth / CAMERA_FILL / 2 / tan / (width / height);
  cameraDistance = Math.max(forHeight, forWidth);
  if (expanded) lastExpansionKey = ''; // le prochain rendu recalcule le plein écran
  else resizeView(width, height);
}
let lastExpansionKey = '';
let expanded = false; // le canvas a quitté la page (plein écran en cours ou terminé)
new ResizeObserver(fitCamera).observe(stage);
fitCamera();

// Plein écran : k = 0 → le canvas occupe la scène dans la page ; k = 1 → toute la fenêtre.
// Le bloc de la scène garde sa taille (la mise en page ne bouge pas). Options (config) : voile sombre derrière
// le canvas (VEIL_BLUR) et extinction de la lumière de la table (EXPAND_DIM_TABLE).
function applyExpansion(k) {
  if (k <= 0.0005) {
    if (!expanded) return;
    expanded = false;
    lastExpansionKey = '';
    view.classList.remove('is-expanded');
    view.style.cssText = '';
    document.documentElement.style.overflow = '';
    spot.intensity = SPOT_INTENSITY;
    hemi.intensity = HEMI_INTENSITY;
    resizeView(stage.clientWidth, stage.clientHeight);
    return;
  }
  const from = stage.getBoundingClientRect();
  const toWidth = document.documentElement.clientWidth;
  const toHeight = window.innerHeight;
  const lerp = THREE.MathUtils.lerp;
  const left = lerp(from.left, 0, k);
  const top = lerp(from.top, 0, k);
  const width = lerp(from.width, toWidth, k);
  const height = lerp(from.height, toHeight, k);
  if (!expanded) {
    expanded = true;
    view.classList.add('is-expanded');
    document.documentElement.style.overflow = 'hidden'; // pas de défilement derrière (scrollbar-gutter évite le saut de mise en page)
  }
  const key = [left, top, width, height, k].map((v) => v.toFixed(2)).join();
  if (key === lastExpansionKey) return;
  lastExpansionKey = key;
  view.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px;border-radius:${EXPAND_BORDER_RADIUS * (1 - k)}px`;
  if (EXPAND_DIM_TABLE) {
    spot.intensity = SPOT_INTENSITY * (1 - k);
    hemi.intensity = HEMI_INTENSITY * (1 - k);
  }
  resizeView(width, height, left - from.left, top - from.top);
}

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
  parent: view,
  onClose: () => flow.drop(),
  onPrev: () => flow.goTo(-1),
  onNext: () => flow.goTo(1),
});
flow = createFlow({ canvas, camera, hover, panel, viewInfo });
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
  if (!onScreen && !expanded) return;
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
  applyExpansion(flow.expansion());
  const shadeOpacity = SHADE_OPACITY * flow.shade();
  shade.material.uniforms.uOpacity.value = shadeOpacity;
  shade.visible = shadeOpacity > 0.001;
  backdrop.style.opacity = String(flow.shade()); // le flou apparaît et disparaît avec le plan noir
  contactAO.update();
  tooltip.update(dt, flow.isActive() ? null : hover.hovered);
  // Rendu : la table (couche 0), puis, profondeur remise à zéro, la carte au premier plan (couche 1)
  const foreground = flow.hasForeground();
  if (SHADOW_ENABLED) renderer.shadowMap.needsUpdate = true;
  renderer.clear();
  camera.layers.set(0);
  renderer.render(scene, camera);
  if (foreground) {
    renderer.clearDepth();
    camera.layers.set(1);
    renderer.render(scene, camera);
  }
  camera.layers.enableAll(); // les raycasts (survol, clic) voient toutes les couches
});
