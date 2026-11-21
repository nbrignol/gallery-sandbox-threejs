import * as THREE from 'three';
import { CLICK_MAX_MOVE } from '../config.js';

// Remonte les parents d'un objet touché jusqu'au groupe de tableau
// (celui qui porte userData.paintingId). Retourne null si aucun.
// Valable quel que soit le maillage touché (toile, cadre…).
export function findPaintingGroup(object) {
  for (let o = object; o; o = o.parent) {
    if (o.userData?.paintingId !== undefined) return o;
  }
  return null;
}

// Picking par raycast depuis le pointeur. Les murs (`occluders`) sont dans le
// raycast : un tableau caché derrière un mur n'est pas cliquable.
// `onPick(group)` est appelé au clic sur un tableau ; le curseur devient une
// main au survol. Retourne { dispose }.
export function createPicking({ canvas, camera, paintings, occluders, onPick }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = [...paintings, ...occluders];

  // Tableau sous le pointeur (le plus proche, murs compris), sinon null
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(targets, true)[0];
    return hit ? findPaintingGroup(hit.object) : null;
  }

  function onMove(event) {
    canvas.style.cursor = pick(event) ? 'pointer' : '';
  }

  // Clic = appui puis relâchement à moins de CLICK_MAX_MOVE px (sinon : glisser)
  let downAt = null;

  function onDown(event) {
    if (event.button === 0) downAt = { x: event.clientX, y: event.clientY };
  }

  function onUp(event) {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved >= CLICK_MAX_MOVE) return;
    const group = pick(event);
    if (group) onPick(group);
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  return {
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
    },
  };
}
