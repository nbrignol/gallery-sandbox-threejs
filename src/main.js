import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAMERA_FOV,
  ENV_INTENSITY,
  EYE_HEIGHT,
  FLOOR_ENV_INTENSITY,
  SD_PIXEL_RATIO,
  SCENE_BACKGROUND,
  SITE_NAME,
  START_CELL,
  START_OFFSET_X,
  START_OFFSET_Z,
  START_YAW_DEG,
  TONE_EXPOSURE,
  TOP_VIEW_BACKGROUND,
} from './config.js';
import { grid } from './data/layout.js';
import { gridToCells } from './world/grid.js';
import { paintings as paintingsByCell } from './data/paintings.js';
import { createRoom } from './world/room.js';
import { createGallery } from './world/gallery.js';
import { enableShadows } from './world/shadows.js';
import { computePropPlacements, createProps } from './world/props.js';
import { createRoomLights } from './world/roomLights.js';
import { floorMaterial } from './world/materials.js';
import { createNavigation } from './nav/navigation.js';
import { createQuality, setupQualityUI } from './world/quality.js';
import './ui/header.css';
import './ui/quality.css';

// Affiche le nom dans l'en-tête
function setupHeader() {
  document.getElementById('site-name').textContent = SITE_NAME;
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
// Retourne `setSD(on)` : résolution interne réduite (SD) ou native (HD), canvas toujours étiré.
function setupResize(renderer, camera, afterResize) {
  let sd = false;
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(sd ? SD_PIXEL_RATIO : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false); // la taille CSS est gérée par header.css
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    afterResize?.();
  }
  window.addEventListener('resize', onResize);
  onResize();
  return (on) => {
    sd = on;
    onResize();
  };
}

// Boucle de rendu ; `update(dt)` est appelée à chaque image
function startLoop(renderer, scene, camera, update) {
  const timer = new THREE.Timer();
  timer.connect(document); // met le timer en pause quand l'onglet est masqué
  renderer.setAnimationLoop((time) => {
    timer.update(time);
    update?.(timer.getDelta());
    renderer.render(scene, camera);
  });
}

async function init() {
  setupHeader();

  const renderer = createRenderer();
  const scene = createScene(renderer);

  const room = createRoom(gridToCells(grid));
  scene.add(room.group);

  const gallery = await createGallery(room, paintingsByCell);

  // Objets déco (banc, plantes) : emplacements d'abord, pour que l'AO du sol inclue
  // leurs ombres de contact, puis chargement des modèles
  const placements = computePropPlacements(room, paintingsByCell);
  room.ao?.addContacts(placements);
  const props = await createProps(placements);
  scene.add(gallery.group, props);
  enableShadows(renderer, room.group, gallery.paintings, props);

  // Départ au centre de la cellule d'angle (première cellule)
  const startCenter = room.cells[START_CELL].center;
  const camera = createCamera({ x: startCenter.x + START_OFFSET_X, z: startCenter.z + START_OFFSET_Z });

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
  roomLights.bake(renderer, scene, camera);
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
  navigation.look.setYaw(THREE.MathUtils.degToRad(START_YAW_DEG));
  navigation.playIntro();

  const setSD = setupResize(renderer, camera, navigation.refitTopView);
  setupQualityUI(createQuality({ renderer, scene, camera, roomLights, applyPixelRatio: setSD }));
  startLoop(renderer, scene, camera, (dt) => {
    navigation.update(dt);
    roomLights.update(camera);
  });
}

init();
