import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAMERA_FOV,
  ENV_INTENSITY,
  EYE_HEIGHT,
  FLOOR_ENV_INTENSITY,
  LOW_PIXEL_RATIO,
  SCENE_BACKGROUND,
  SITE_NAME,
  START_CELL,
  START_OFFSET_X,
  START_OFFSET_Z,
  START_YAW_DEG,
  TONE_EXPOSURE,
  TOP_VIEW_BACKGROUND,
} from './config.js';
import { currentGalleryIndex, galleries, galleryHref } from './data/galleries.js';
import { gridToCells } from './world/grid.js';
import { createRoom } from './world/room.js';
import { assignToWalls, createGallery, paintingJobs } from './world/gallery.js';
import { enableShadows } from './world/shadows.js';
import { computePropPlacements, countPropModels, createProps } from './world/props.js';
import { createRoomLights } from './world/roomLights.js';
import { floorMaterial, onRoomTextureLoaded, roomTextureCount } from './world/materials.js';
import { createNavigation } from './nav/navigation.js';
import { createQuality, setupQualityUI } from './world/quality.js';
import { createDebug } from './world/debug.js';
import { createFpsCounter } from './ui/fps.js';
import { createAutoQuality } from './ui/autoQuality.js';
import { createLoadingSteps, paint } from './ui/loading.js';
import './ui/header.css';
import './ui/quality.css';

// En-tête : le nom du site puis les numéros des configurations (« 1 - 2 - 3 »). Tous sont
// soulignés et cliquables sauf l'actif.
function setupHeader(activeIndex) {
  document.getElementById('site-name').textContent = `${SITE_NAME} · `;
  const nav = document.getElementById('galleries-nav');
  galleries.forEach((gallery, index) => {
    if (index > 0) nav.append(' - ');
    const item = document.createElement(index === activeIndex ? 'span' : 'a');
    item.textContent = String(index + 1);
    if (index === activeIndex) {
      item.setAttribute('aria-current', 'true');
    } else {
      item.href = galleryHref(index);
      item.title = gallery.name;
    }
    nav.append(item);
  });
}

// Renderer lié au canvas de la page
function createRenderer() {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Tone mapping neutre : évite les zones brûlées sans altérer les couleurs des tableaux
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = TONE_EXPOSURE;
  return renderer;
}

// Scène avec fond uni et environnement de studio (reflets et ambiance douce
// pour les matériaux PBR ; aucune image à charger)
function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BACKGROUND);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = ENV_INTENSITY;
  pmrem.dispose();

  // Le sol, très lisse, reflèterait les panneaux lumineux de l'environnement en
  // grand reflet à angle rasant : on lui donne son propre envMap, bien plus faible
  // (scene.environmentIntensity est global, il ne s'applique pas matériau par matériau).
  floorMaterial.envMap = scene.environment;
  floorMaterial.envMapIntensity = FLOOR_ENV_INTENSITY;
  return scene;
}

// Caméra à hauteur des yeux, placée au-dessus du point `start` (Vector3)
function createCamera(start) {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(start.x, EYE_HEIGHT, start.z);
  return camera;
}

// Redimensionnement : renderer et caméra suivent la fenêtre.
// Retourne `setLow(on)` : résolution interne réduite (Low) ou native, canvas toujours étiré.
function setupResize(renderer, camera, afterResize) {
  let low = false;
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(low ? LOW_PIXEL_RATIO : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false); // la taille CSS est gérée par header.css
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    afterResize?.();
  }
  window.addEventListener('resize', onResize);
  onResize();
  return (on) => {
    low = on;
    onResize();
  };
}

// Boucle de rendu ; `update(dt)` est appelée à chaque image
function startLoop(renderer, scene, camera, update, onFpsSample) {
  const fps = createFpsCounter(document.getElementById('fps'), onFpsSample);
  const timer = new THREE.Timer();
  timer.connect(document); // met le timer en pause quand l'onglet est masqué
  renderer.setAnimationLoop((time) => {
    timer.update(time);
    fps.tick(time);
    update?.(timer.getDelta());
    renderer.render(scene, camera);
  });
}

async function init() {
  const galleryIndex = currentGalleryIndex();
  const config = galleries[galleryIndex];
  const { grid, paintings: paintingsByCell } = config;
  setupHeader(galleryIndex);

  // Étapes affichées dans la modale de chargement
  const steps = createLoadingSteps(document.getElementById('loading-steps'));
  const roomStep = steps.add('Construction de la salle');
  const textureStep = steps.add('Téléchargement des textures', roomTextureCount());
  const paintingStep = steps.add('Téléchargement des tableaux');
  const modelStep = steps.add('Téléchargement des modèles 3D');
  const shadowStep = steps.add('Calcul des ombres');
  await paint();

  const renderer = createRenderer();
  const scene = createScene(renderer);

  roomStep.start();
  await paint();
  const room = createRoom(gridToCells(grid));
  scene.add(room.group);
  roomStep.done();

  // Objets déco (banc, plantes) : emplacements d'abord (ils ne dépendent que des données), pour
  // que l'AO du sol inclue leurs ombres de contact
  const placements = computePropPlacements(room, paintingsByCell);
  room.ao?.addContacts(placements);

  // Textures, tableaux et modèles se téléchargent en parallèle
  paintingStep.setTotal(paintingJobs(assignToWalls(room, paintingsByCell)).length);
  const modelTotal = countPropModels(placements);
  if (modelTotal > 0) modelStep.setTotal(modelTotal);
  else modelStep.remove();
  const [gallery, props] = await Promise.all([
    createGallery(room, paintingsByCell, paintingStep.tick).then((result) => {
      paintingStep.done();
      return result;
    }),
    createProps(placements, modelStep.tick).then((result) => {
      modelStep.done();
      return result;
    }),
    onRoomTextureLoaded(textureStep.tick).then(() => textureStep.done()),
  ]);
  scene.add(gallery.group, props);
  enableShadows(renderer, room.group, gallery.paintings, props);

  // Départ au centre de la cellule d'angle (première cellule)
  // (la configuration peut surcharger le départ : cellule, décalage, orientation)
  const start = config.start ?? {};
  const startCell = room.cells[start.cell ?? START_CELL];
  if (!startCell) throw new Error(`Configuration « ${config.name} » : cellule de départ inexistante.`);
  const startCenter = startCell.center;
  const camera = createCamera({
    x: startCenter.x + (start.offsetX ?? START_OFFSET_X),
    z: startCenter.z + (start.offsetZ ?? START_OFFSET_Z),
  });

  // Vue du dessus : spots éteints (rallumés dans la pièce de destination au retour), fond noir
  // hors du bâtiment. Les plafonds ne sont pas touchés.
  // Appelé par la navigation à l'entrée et à la sortie (`target` : position d'arrivée au retour).
  function setTopView(on, target) {
    roomLights.setSpotsOff(on, target);
    scene.background.set(on ? TOP_VIEW_BACKGROUND : SCENE_BACKGROUND);
    renderer.domElement.classList.toggle('is-top-view', on);
  }

  // Spots allumés seulement dans la pièce courante ; ombres calculées une fois par pièce
  const roomLights = createRoomLights(room, gallery.paintings);
  shadowStep.start();
  await paint();
  roomLights.bake(renderer, scene, camera);
  shadowStep.done();
  roomLights.update(camera);

  const navigation = createNavigation({
    canvas: renderer.domElement,
    camera,
    paintings: gallery.paintings,
    benches: props.children.filter((object) => object.userData.bench),
    plants: props.children.filter((object) => object.userData.plant),
    occluders: room.occluders,
    roomCells: room.cells,
    onTopViewChange: setTopView,
  });

  // Départ orienté, puis micro-animation droite / gauche
  navigation.look.setYaw(THREE.MathUtils.degToRad(start.yawDeg ?? START_YAW_DEG));
  navigation.playIntro();

  const setLow = setupResize(renderer, camera, navigation.refitTopView);
  const quality = createQuality({ renderer, scene, camera, roomLights, applyPixelRatio: setLow });
  setupQualityUI(quality);
  const autoQuality = createAutoQuality({ quality, checkbox: document.getElementById('opt-minimal') });
  const debug = createDebug({
    scene,
    room,
    gallery,
    camera,
    look: navigation.look,
    hud: document.getElementById('debug-hud'),
  });
  document.getElementById('opt-debug').addEventListener('change', (event) => {
    debug.setEnabled(event.target.checked);
  });
  startLoop(renderer, scene, camera, (dt) => {
    navigation.update(dt);
    roomLights.update(camera);
    debug.update();
  }, autoQuality.onSample);
}

// Retire le preloader (fondu, puis suppression du DOM)
function hidePreloader() {
  const preloader = document.getElementById('preloader');
  preloader.classList.add('is-done');
  setTimeout(() => preloader.remove(), 500);
}

// Erreur de chargement : la modale reste affichée avec un message
function showError(error) {
  console.error(error);
  const title = document.querySelector('.preloader-title');
  if (title) title.textContent = 'Erreur de chargement';
}

init().then(hidePreloader, showError);
