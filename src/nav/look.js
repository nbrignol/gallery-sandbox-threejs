import { LOOK_SENSITIVITY } from '../config.js';

// Rotation horizontale (yaw) au glisser du pointeur. Le pitch (regard vers le bas) n'est
// jamais modifié par l'utilisateur : il vaut 0 en visite et n'est animé que par la vue
// du dessus. Pointer events : souris et tactile avec le même code.
// Retourne { getYaw, setYaw, getPitch, setPitch, setEnabled }.
export function createLook(canvas, camera) {
  camera.rotation.order = 'YXZ'; // yaw d'abord, puis pitch
  let yaw = 0;
  let pitch = 0;
  let enabled = true;
  let dragging = false;
  let lastX = 0;

  function setYaw(value) {
    yaw = value;
    camera.rotation.set(pitch, yaw, 0);
  }

  function setPitch(value) {
    pitch = value;
    camera.rotation.set(pitch, yaw, 0);
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
    getPitch: () => pitch,
    setPitch,
    setEnabled(value) {
      enabled = value;
      if (!value) {
        dragging = false;
        canvas.classList.remove('is-dragging');
      }
    },
  };
}
