import { LOOK_SENSITIVITY } from '../config.js';

// Rotation horizontale (yaw seul, sans pitch) au glisser du pointeur.
// Pointer events : souris et tactile avec le même code.
// Retourne { getYaw, setYaw, setEnabled }.
export function createLook(canvas, camera) {
  let yaw = 0;
  let enabled = true;
  let dragging = false;
  let lastX = 0;

  function setYaw(value) {
    yaw = value;
    camera.rotation.set(0, yaw, 0);
  }

  function onDown(event) {
    if (!enabled || event.button !== 0) return;
    dragging = true;
    canvas.classList.add('is-dragging');
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  }

  function onMove(event) {
    if (!dragging) return;
    // Glisser vers la droite : la scène suit le doigt (la caméra tourne vers la gauche)
    setYaw(yaw + (event.clientX - lastX) * LOOK_SENSITIVITY);
    lastX = event.clientX;
  }

  function onUp() {
    dragging = false;
    canvas.classList.remove('is-dragging');
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return {
    getYaw: () => yaw,
    setYaw,
    setEnabled(value) {
      enabled = value;
      if (!value) {
        dragging = false;
        canvas.classList.remove('is-dragging');
      }
    },
  };
}
