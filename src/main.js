import * as THREE from 'three';
import { CAMERA_FOV, EYE_HEIGHT, SITE_NAME } from './config.js';
import { cells } from './data/layout.js';
import { createRoom } from './world/room.js';
import './ui/header.css';

// Affiche le nom dans l'en-tête
function setupHeader() {
  document.getElementById('site-name').textContent = SITE_NAME;
}

// Renderer lié au canvas de la page
function createRenderer() {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return renderer;
}

// Scène avec fond uni
function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);
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

// Redimensionnement : renderer et caméra suivent la fenêtre
function setupResize(renderer, camera) {
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false); // la taille CSS est gérée par header.css
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();
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

function init() {
  setupHeader();

  const renderer = createRenderer();
  const scene = createScene();

  const room = createRoom(cells);
  scene.add(room.group);

  // Départ au centre de la cellule d'angle (première cellule)
  const camera = createCamera(room.cells[0].center);

  setupResize(renderer, camera);
  startLoop(renderer, scene, camera);
}

init();
