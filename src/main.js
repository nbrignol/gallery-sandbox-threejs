import * as THREE from 'three';
import { CAMERA_FOV, EYE_HEIGHT, SITE_NAME } from './config.js';
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

// Caméra à hauteur des yeux
function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, EYE_HEIGHT, 3);
  return camera;
}

// Cube de test : À RETIRER (étape 2)
function createTestCube() {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xc0824a }),
  );
  cube.position.set(0, EYE_HEIGHT, 0);
  return cube;
}

// Lumières de test : À RETIRER (étape 2)
function createTestLights() {
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(2, 4, 3);
  return [new THREE.AmbientLight(0xffffff, 0.5), light];
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
    update(timer.getDelta());
    renderer.render(scene, camera);
  });
}

function init() {
  setupHeader();

  const renderer = createRenderer();
  const scene = createScene();
  const camera = createCamera();

  const testCube = createTestCube();
  scene.add(testCube, ...createTestLights());

  setupResize(renderer, camera);
  startLoop(renderer, scene, camera, (dt) => {
    testCube.rotation.y += dt * 0.6; // à retirer avec le cube
  });
}

init();
