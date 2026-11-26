import * as THREE from 'three';
import { TONE_EXPOSURE } from '../config.js';
import {
  BACKGROUND_COLOR,
  CAMERA_FILL,
  CAMERA_FOV,
  CAMERA_TILT_DEG,
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
  NAV_SPEED,
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
import { layoutCards } from './layout.js';
import { createCard, loadBackTexture } from './card.js';
import { createHover } from './hover.js';
import { createFlow } from './flow.js';
import { createContactAO } from './contactAO.js';
import { createTooltip } from './tooltip.js';
import { createCardPanel } from './panel.js';
import './cards.css';

const el = (tag, className) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

// Lit la liste du conteneur : chaque <li> contient une <img> (le tableau), un titre (h1–h6, à défaut l'alt
// de l'image) et du texte (<p>, à défaut le texte restant du <li>). Renvoie [{ src, title, desc }].
function readItems(container) {
  const items = [];
  for (const li of container.querySelectorAll('li')) {
    const img = li.querySelector('img');
    if (!img) {
      console.warn('cartes : <li> sans <img> ignoré.', li);
      continue;
    }
    const heading = li.querySelector('h1, h2, h3, h4, h5, h6');
    const title = (heading?.textContent ?? img.alt ?? '').trim();
    const paragraphs = [...li.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
    const desc = paragraphs.length
      ? paragraphs.join(' ')
      : li.textContent.replace(heading?.textContent ?? '', '').replace(/\s+/g, ' ').trim();
    items.push({ src: img.src, title, desc });
  }
  return items;
}

// ---- Navigation globale entre galeries ----------------------------------------------------------------
const registry = []; // galeries 3D actives, dans l'ordre de la page
let globalNav = true; // case « Navigation globale »
let handoffBusy = false; // un transfert d'une galerie à l'autre est en cours : plus aucune interaction
let handoffToken = 0; // invalide un transfert en cours (bascule en liste, galerie détruite)

// Sortie d'une galerie par ‹ › ou le clavier : on range la carte, on attend que le canvas soit revenu dans la
// page, on fait défiler jusqu'à la galerie voisine (boucle sur toute la page), puis on y ouvre la bonne carte
// (la première en avançant, la dernière en reculant). Renvoie false si la navigation reste dans la galerie.
function navigateAcross(from, step) {
  if (!globalNav || registry.length < 2 || handoffBusy) return false;
  const to = registry[(registry.indexOf(from) + step + registry.length) % registry.length];
  const cardIndex = step > 0 ? 0 : to.count - 1;
  const token = ++handoffToken;
  handoffBusy = true;
  from.leave();
  from.whenClosed(async () => {
    if (token !== handoffToken) return;
    await to.scrollIntoView();
    if (token !== handoffToken) return;
    to.stage.focus({ preventScroll: true }); // le clavier suit la galerie ouverte
    to.openAt(cardIndex);
    handoffBusy = false;
  });
  return true;
}

let stageCount = 0;

// Remplace le conteneur par le bloc de la scène (même structure et mêmes classes que le CSS de la page).
// La liste d'origine reste dans le bloc, masquée visuellement mais lisible par les lecteurs d'écran (.sr-only).
// `restore()` remet le conteneur d'origine (avec sa liste) à la place du bloc.
function buildStage(container) {
  const stage = el('div', 'cards-stage');
  stage.classList.add(...[...container.classList].filter((name) => name !== 'card-canvas-gallery'));
  stage.tabIndex = 0;
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', container.getAttribute('aria-label') || 'Galerie de cartes');
  const help = el('p', 'sr-only');
  help.id = `cards-help-${++stageCount}`;
  help.textContent = 'Galerie interactive : flèches gauche et droite pour choisir une carte, Entrée pour l’ouvrir, Échap pour la fermer. La liste des tableaux se trouve juste après.';
  stage.setAttribute('aria-describedby', help.id);
  const backdrop = el('div', 'cards-backdrop');
  const view = el('div', 'cards-view');
  const canvas = el('canvas');
  canvas.setAttribute('aria-hidden', 'true'); // visuel seulement : la liste porte le contenu
  const loading = el('div', 'cards-loading');
  loading.textContent = '...';
  const list = container.querySelector('ul');
  list?.classList.add('sr-only');
  view.append(canvas);
  stage.append(backdrop, view, loading, help);
  if (list) stage.append(list);
  container.replaceWith(stage);
  const restore = () => {
    list?.classList.remove('sr-only');
    if (list) container.append(list);
    stage.replaceWith(container);
  };
  return { stage, view, canvas, backdrop, loading, restore };
}

// Une galerie = un canvas (son propre contexte WebGL, sa scène, sa caméra, ses cartes).
export function createCardGallery(container, { testParams = false, navigate = null } = {}) {
  const items = readItems(container);
  if (items.length === 0) {
    console.warn('cartes : aucune carte dans', container);
    return null;
  }
  const { stage, view, canvas, backdrop, loading, restore } = buildStage(container);

  // Voile HTML derrière le canvas : il floute la page quand une carte flotte (le canvas, au-dessus, reste net)
  backdrop.style.backdropFilter = backdrop.style.webkitBackdropFilter = `blur(${VEIL_BLUR}px)`;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: FLOOR_TRANSPARENT });
  } catch (error) {
    // WebGL indisponible : on rend la liste d'origine
    console.warn('cartes : WebGL indisponible, la liste est affichée à la place.', error);
    restore();
    return null;
  }
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
  const layout = layoutCards(items.length);
  const cards = items.map((artwork, index) => {
    const card = createCard({ config: layout[index], artwork, index, backTexture });
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
    const xs = layout.map((c) => c.offsetX);
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
  let closedCallbacks = []; // rappels à appeler quand le canvas est revenu dans la page
  const resizeObserver = new ResizeObserver(fitCamera);
  resizeObserver.observe(stage);
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
      closedCallbacks.splice(0).forEach((callback) => callback());
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
  const params = testParams ? new URLSearchParams(location.search) : new URLSearchParams(); // paramètres de test : 1re galerie seulement
  const introParam = params.get('intro'); // test : ?intro=skip ou ?intro=0.5 (figé)
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
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (intro.state === 'waiting' && entry.intersectionRatio >= 0.5) {
        intro.state = 'playing';
        loading.classList.add('is-hidden');
      }
    },
    { threshold: [0, 0.5] },
  );
  intersectionObserver.observe(stage);

  // Le survol est suspendu dès qu'une carte est piochée (flow est défini juste après)
  let flow = null;
  const hover = createHover({ canvas, camera, cards, enabled: () => intro.state === 'done' && !flow?.isActive() && !handoffBusy });
  const panel = createCardPanel({
    parent: view,
    returnFocus: stage,
    onClose: () => flow.drop(),
    onPrev: items.length > 1 ? () => flow.goTo(-1) : undefined,
    onNext: items.length > 1 ? () => flow.goTo(1) : undefined,
  });
  let api = null; // l'instance, définie en fin de fonction (utile à la navigation entre galeries)
  flow = createFlow({
    canvas,
    camera,
    hover,
    panel,
    viewInfo,
    onEdge: (step) => navigate?.(api, step) ?? false,
    locked: () => handoffBusy,
  });
  const contactAO = createContactAO({ scene, cards });
  const tooltip = createTooltip({ scene, camera, anchorOf: hover.anchorOf });

  // Clavier (quand la scène a le focus : clic ou Tab) : sur la table, ← → sélectionnent une carte (comme le survol) et Entrée la pioche ;
  // carte flottante : ← → affichent la précédente / suivante, Échap la repose.
  stage.addEventListener('keydown', (event) => {
    if (handoffBusy) return;
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
  const openParam = Number(params.get('carte'));
  if (openParam >= 1 && openParam <= cards.length) {
    flow.start(cards[openParam - 1], 0);
    const seek = params.get('p');
    if (seek !== null) flow.seek(Number(seek));
  }

  // Test : ?survol=2 sélectionne la 2e carte (comme au clavier)
  const hoverParam = Number(params.get('survol'));
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

  // Démontage : arrête le rendu, libère le contexte WebGL et remet la liste d'origine à la place du bloc
  function destroy() {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    handoffToken++; // annule un transfert entre galeries en cours
    handoffBusy = false;
    closedCallbacks = [];
    if (expanded) document.documentElement.style.overflow = '';
    renderer.dispose();
    renderer.forceContextLoss();
    restore();
  }

  // Fait défiler la page jusqu'à cette galerie (toujours, même si elle est visible) et attend la fin.
  // Défilement animé par nos soins (accélération puis freinage, durée proportionnelle à la distance) : il est
  // fluide quel que soit le navigateur ou le `scroll-behavior` de la page ; instantané avec prefers-reduced-motion.
  // Un geste de l'utilisateur (molette, toucher) l'interrompt.
  function scrollIntoViewAndWait() {
    return new Promise((resolve) => {
      const rect = stage.getBoundingClientRect();
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const startY = window.scrollY;
      const targetY = THREE.MathUtils.clamp(startY + rect.top - (window.innerHeight - rect.height) / 2, 0, Math.max(0, maxY));
      const distance = Math.abs(targetY - startY);
      const jump = (y) => window.scrollTo({ top: y, behavior: 'instant' }); // 'instant' : ignore un scroll-behavior: smooth du CSS
      if (distance < 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        jump(targetY);
        resolve();
        return;
      }
      const duration = THREE.MathUtils.clamp(distance * 0.35, 450, 1200); // ms
      const begin = performance.now();
      let frame = 0;
      const stop = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('wheel', stop);
        window.removeEventListener('touchstart', stop);
        resolve();
      };
      const step = (now) => {
        const t = Math.min(1, (now - begin) / duration);
        jump(startY + (targetY - startY) * easeInOutCubic(t));
        if (t < 1) frame = requestAnimationFrame(step);
        else stop();
      };
      window.addEventListener('wheel', stop, { passive: true });
      window.addEventListener('touchstart', stop, { passive: true });
      frame = requestAnimationFrame(step);
    });
  }

  api = {
    stage,
    canvas,
    cards,
    count: cards.length,
    destroy,
    // Range la carte flottante (animation de navigation, plus rapide)
    leave: () => flow.drop(NAV_SPEED),
    // Appelle `callback` quand plus aucune carte n'est ouverte et que le canvas est revenu dans la page
    whenClosed(callback) {
      if (!expanded && !flow.isActive()) callback();
      else closedCallbacks.push(callback);
    },
    scrollIntoView: scrollIntoViewAndWait,
    openAt: (index) => flow.start(cards[index], clock.elapsedTime),
  };
  return api;
}

// Choix d'affichage : galerie 3D ou liste. Défaut : liste si l'utilisateur demande de réduire les animations
// (prefers-reduced-motion), galerie sinon ; le dernier choix du bouton est mémorisé.
// (La même logique est dans le <head> de la page, pour éviter tout clignotement avant ce script.)
const VIEW_KEY = 'cards-view';
function preferredView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'list' || saved === 'gallery') return saved;
  } catch {
    // stockage indisponible : on retombe sur la préférence système
  }
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'list' : 'gallery';
}

// Remplace chaque .card-canvas-gallery de la page par une galerie. En haut à droite de la page :
// le bouton global « liste / galerie 3D » et la case « Navigation globale ».
const NAV_KEY = 'cards-global-nav';
export function initCardGalleries() {
  const entries = [...document.querySelectorAll('.card-canvas-gallery')].map((container, index) => {
    container.dataset.ready = ''; // le script a pris la main : fin de la place réservée par le CSS
    return { container, index, gallery: null };
  });
  if (entries.length === 0) return;

  const controls = el('div', 'cards-controls');
  const toggle = el('button', 'cards-toggle');
  toggle.type = 'button';
  const check = el('label', 'cards-check');
  const checkbox = el('input');
  checkbox.type = 'checkbox';
  try {
    globalNav = localStorage.getItem(NAV_KEY) !== 'off'; // coché par défaut
  } catch {
    globalNav = true;
  }
  checkbox.checked = globalNav;
  check.append(checkbox, ' Navigation globale');
  controls.append(check, toggle);
  document.body.append(controls);

  checkbox.addEventListener('change', () => {
    globalNav = checkbox.checked;
    try {
      localStorage.setItem(NAV_KEY, globalNav ? 'on' : 'off');
    } catch {
      // pas de mémorisation possible : sans conséquence
    }
  });

  function show(view) {
    registry.length = 0;
    for (const entry of entries) {
      entry.gallery?.destroy(); // rend le conteneur et sa liste à la page
      entry.gallery = null;
      if (view === 'gallery') {
        entry.gallery = createCardGallery(entry.container, { testParams: entry.index === 0, navigate: navigateAcross });
        if (entry.gallery) registry.push(entry.gallery);
      }
    }
    // Libellé selon l'état réel (une galerie qui n'a pas pu démarrer reste en liste)
    const active = registry.length > 0;
    toggle.textContent = active ? 'Afficher en liste' : 'Afficher en galerie 3D';
    check.hidden = !active; // la navigation globale n'a de sens qu'en mode galerie
  }

  toggle.addEventListener('click', () => {
    const next = registry.length > 0 ? 'list' : 'gallery';
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // pas de mémorisation possible : sans conséquence
    }
    show(next);
  });

  show(preferredView());
}
