import * as THREE from 'three';
import {
  BEND_MAX_ANGLE,
  BEND_PEAK,
  MOVE_DELAY,
  MOVE_OVERLAP,
  SLIDE_DISTANCE,
  CAMERA_FOV,
  CARD_SIZE,
  DROP_DURATION,
  FLOAT_ARC,
  FLOAT_BOB,
  FLOAT_BOB_TILT_DEG,
  FLOAT_DISTANCE,
  FLOAT_HEIGHT_FRACTION,
  FLOAT_SCREEN_X,
  LIFT_DURATION,
} from './config.js';
import { bendCard } from './card.js';

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (edge0, edge1, x) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const UP = new THREE.Vector3(0, 1, 0);
// Rotation de -90° autour de X : met la face (-Y) vers +Z (la caméra) et le haut de l'image (+Z) vers +Y
const FACE_TO_CAMERA = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

// Pioche d'une carte : une seule carte active à la fois. Progression p de 0 (posée) à 1 (flottante) :
//   p monte → pioche ; p redescend → la même animation à l'envers.
// La pose (position, rotation, échelle) interpole la pose de repos vers la pose flottante, calée sur
// la caméra. La courbure précède la montée (voir applyPose) ; elle est nulle aux deux bouts.
export function createFlow({ canvas, camera, hover, panel }) {
  const raycaster = new THREE.Raycaster();
  let active = null; // { card, p, target, offset }

  const floatPose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };
  const tmp = {
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    start: new THREE.Vector3(),
    aimed: new THREE.Quaternion(),
    start2: new THREE.Quaternion(),
    q: new THREE.Quaternion(),
    euler: new THREE.Euler(),
  };

  // Pose flottante : à FLOAT_DISTANCE devant la caméra, décalée à gauche, face à l'écran
  function computeFloatPose(time) {
    const halfHeight = FLOAT_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const halfWidth = halfHeight * camera.aspect;
    const screenX = camera.aspect > 1 ? FLOAT_SCREEN_X : 0; // en portrait : centrée
    tmp.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    floatPose.position
      .copy(camera.position)
      .addScaledVector(tmp.forward, FLOAT_DISTANCE)
      .addScaledVector(tmp.right, screenX * halfWidth);
    floatPose.scale = Math.min(
      (FLOAT_HEIGHT_FRACTION * 2 * halfHeight) / CARD_SIZE,
      (0.8 * 2 * halfWidth) / CARD_SIZE,
    );
    floatPose.quaternion.copy(camera.quaternion).multiply(FACE_TO_CAMERA);
    // léger flottement
    const bob = Math.sin(time * 1.6) * FLOAT_BOB;
    floatPose.position.y += bob;
    const tilt = THREE.MathUtils.degToRad(FLOAT_BOB_TILT_DEG);
    tmp.euler.set(Math.sin(time * 1.1) * tilt, Math.sin(time * 0.8 + 1) * tilt, 0);
    floatPose.quaternion.multiply(tmp.q.setFromEuler(tmp.euler));
  }

  function applyPose(state, time) {
    const { card, p, offset } = state;
    const { rest } = card.userData;
    // Deux phases : la courbure se forme d'abord (maximale à BEND_PEAK) pendant que la carte glisse
    // au sol ; elle ne quitte le sol qu'à partir de MOVE_DELAY, puis la courbure se relâche.
    const riseStart = MOVE_DELAY - MOVE_OVERLAP;
    const e = easeInOutCubic(THREE.MathUtils.clamp((p - riseStart) / (1 - riseStart), 0, 1));
    const bend = p < BEND_PEAK
      ? 1 - (1 - p / BEND_PEAK) ** 2 // montée rapide, qui ralentit en haut
      : 1 - easeInOutCubic((p - BEND_PEAK) / (1 - BEND_PEAK));
    computeFloatPose(time);

    // Phase 1 (p < MOVE_DELAY) : la carte glisse au sol vers la caméra pendant qu'elle se courbe.
    // Phase 2 : depuis ce point, elle monte et se retourne jusqu'à la pose flottante.
    const slide = Math.sin((Math.min(1, p / MOVE_DELAY) * Math.PI) / 2); // freine en fin de glissement pendant que la montée démarre
    // Direction (au sol) de la carte vers la caméra : elle pivote autour de son centre (la « main »
    // est au centre) pour que son bord relevé (+Z local) pointe vers la caméra, et glisse dans ce sens.
    const toX = camera.position.x - rest.position.x;
    const toZ = camera.position.z - rest.position.z;
    const length = Math.hypot(toX, toZ) || 1;
    tmp.start.copy(rest.position);
    tmp.start.x += (toX / length) * SLIDE_DISTANCE * slide;
    tmp.start.z += (toZ / length) * SLIDE_DISTANCE * slide;
    tmp.aimed.setFromAxisAngle(UP, Math.atan2(toX, toZ));
    tmp.start2.slerpQuaternions(rest.quaternion, tmp.aimed, slide);
    card.position.lerpVectors(tmp.start, floatPose.position, e);
    card.position.y += FLOAT_ARC * Math.sin(Math.PI * e);
    // Pose de survol au moment du clic, fondue en début de course (évite un saut)
    card.position.addScaledVector(offset, 1 - smoothstep(0, 0.25, p));
    card.quaternion.slerpQuaternions(tmp.start2, floatPose.quaternion, e);
    card.scale.setScalar(THREE.MathUtils.lerp(1, floatPose.scale, e));
    bendCard(card, BEND_MAX_ANGLE * bend);
  }

  function start(card, time) {
    hover.control(card);
    active = {
      card,
      p: 0,
      target: 1,
      offset: card.position.clone().sub(card.userData.rest.position),
      shown: false,
    };
    applyPose(active, time);
  }

  function drop() {
    active.target = 0;
    active.offset.set(0, 0, 0); // au retour, on revient exactement à la pose de repos
    panel.hide();
  }

  function finish() {
    const { card } = active;
    const { rest } = card.userData;
    card.position.copy(rest.position);
    card.quaternion.copy(rest.quaternion);
    card.scale.setScalar(1);
    bendCard(card, 0);
    hover.release(card);
    active = null;
  }

  const isFloating = () => active && active.p === 1 && active.target === 1;

  // Carte flottante sous le pointeur ? (raycast sur le vrai mesh, qui a bougé)
  function floatingCardAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    return raycaster.intersectObject(active.card, false).length > 0;
  }

  let lastTime = 0;
  canvas.addEventListener('click', (event) => {
    if (!active) {
      const card = hover.cardAt(event.clientX, event.clientY);
      if (card) start(card, lastTime);
    } else if (isFloating() && floatingCardAt(event.clientX, event.clientY)) {
      drop();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (isFloating()) canvas.style.cursor = floatingCardAt(event.clientX, event.clientY) ? 'pointer' : '';
  });

  return {
    // Une carte est en cours de pioche, flottante ou en retour : le survol est suspendu
    isActive: () => active !== null,
    isFloating,
    activeCard: () => active?.card ?? null,
    start,
    // Test : fixe la progression de la carte active (?carte=2&p=0.5)
    seek(p) {
      if (active) active.p = THREE.MathUtils.clamp(p, 0, 1);
    },
    drop() {
      if (isFloating()) drop();
    },
    update(dt, time) {
      lastTime = time;
      if (!active) return;
      const duration = active.target === 1 ? LIFT_DURATION : DROP_DURATION;
      const step = dt / duration;
      active.p = active.target === 1 ? Math.min(1, active.p + step) : Math.max(0, active.p - step);
      applyPose(active, time);

      if (active.target === 1 && active.p > 0.65 && !active.shown) {
        active.shown = true;
        const { artwork, index } = active.card.userData;
        panel.show({ index, total: hover.count, title: artwork.title, desc: artwork.desc });
      }
      if (active.target === 0 && active.p === 0) finish();
    },
  };
}
