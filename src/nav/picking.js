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

// Idem pour un banc (objet marqué userData.bench). Retourne null si aucun.
export function findBench(object) {
  for (let o = object; o; o = o.parent) {
    if (o.userData?.bench) return o;
  }
  return null;
}

// Picking par raycast depuis le pointeur. Les murs (`occluders`) sont dans le
// raycast : un tableau ou un banc caché derrière un mur n'est pas cliquable.
// `onPick(group)` est appelé au clic sur un tableau (hors glisser), `onPickBench(bench)`
// au clic sur un banc ; `onHover(group|null)` quand le tableau survolé change (le banc
// n'a pas de halo) ; le curseur devient un doigt au survol des deux. Retourne { dispose }.
export function createPicking({
  canvas,
  camera,
  paintings,
  benches = [],
  occluders,
  onPick,
  onPickBench,
  onHover,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = [...paintings, ...benches, ...occluders];

  // Objet cliquable sous le pointeur (le plus proche, murs compris) :
  // { painting, bench }, tous deux null si rien (ou un mur)
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(targets, true)[0];
    return {
      painting: hit ? findPaintingGroup(hit.object) : null,
      bench: hit ? findBench(hit.object) : null,
    };
  }

  // Survol (souris uniquement)
  let hovered = null;

  function setHovered({ painting, bench }) {
    canvas.style.cursor = painting || bench ? 'pointer' : '';
    if (painting === hovered) return;
    hovered = painting;
    onHover?.(painting);
  }

  function onMove(event) {
    if (event.pointerType === 'mouse') setHovered(pick(event));
  }

  function onLeave() {
    setHovered({ painting: null, bench: null });
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
    const { painting, bench } = pick(event);
    if (painting) onPick(painting);
    else if (bench) onPickBench?.(bench);
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  return {
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
    },
  };
}
