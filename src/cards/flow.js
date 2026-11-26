import * as THREE from 'three';
import {
  BEND_MAX_ANGLE,
  BEND_PEAK,
  MOVE_DELAY,
  NAV_OVERLAP,
  NAV_SPEED,
  MOVE_OVERLAP,
  SLIDE_DISTANCE,
  CAMERA_FOV,
  CARD_SIZE,
  DROP_DURATION,
  EXPAND_START,
  FLOAT_ARC,
  FLOAT_BOB,
  FLOAT_BOB_TILT_DEG,
  FLOAT_DISTANCE,
  FLOAT_EMISSIVE,
  FLOAT_FLOOR_MARGIN,
  FLOOR_TRANSPARENT,
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
// `viewInfo` : fenêtre de rendu du canvas dans le cadre de référence de la caméra (celui de la scène dans la page) :
// { x, y, w, h, fullW, fullH } en pixels. Au repos x = y = 0 et w, h = fullW, fullH ; en plein écran, la fenêtre
// déborde du cadre de référence, ce qui garde la table exactement à sa place.
export function createFlow({ canvas, camera, hover, panel, viewInfo }) {
  const raycaster = new THREE.Raycaster();
  // Cartes en cours de pioche / flottantes / en retour : { card, p, target, offset, shown }.
  // Pendant une navigation, deux cartes coexistent (celle qui repart, celle qui arrive).
  const entries = [];
  let hold = false; // navigation en cours : le plein écran reste ouvert entre deux cartes
  let pending = null; // { card, timer } : carte suivante, démarrée un peu après le début du retour de la précédente

  const floatPose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };
  const tmp = {
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    start: new THREE.Vector3(),
    base: new THREE.Vector3(),
    aimed: new THREE.Quaternion(),
    start2: new THREE.Quaternion(),
    q: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    up: new THREE.Vector3(),
  };

  // Pose flottante : à FLOAT_DISTANCE devant la caméra, décalée à gauche, face à l'écran
  function computeFloatPose(time) {
    // Taille d'un pixel de référence en mètres à FLOAT_DISTANCE ; la fenêtre de rendu peut être plus grande que le cadre
    const worldPerPixel = (FLOAT_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2))) / (viewInfo.fullH / 2);
    const halfHeight = (worldPerPixel * viewInfo.h) / 2;
    const halfWidth = (worldPerPixel * viewInfo.w) / 2;
    const centerRight = worldPerPixel * (viewInfo.x + viewInfo.w / 2 - viewInfo.fullW / 2); // centre de la fenêtre / axe caméra
    const centerUp = -worldPerPixel * (viewInfo.y + viewInfo.h / 2 - viewInfo.fullH / 2);
    const screenX = viewInfo.w > viewInfo.h ? FLOAT_SCREEN_X : 0; // en portrait : centrée
    tmp.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    tmp.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    floatPose.position
      .copy(camera.position)
      .addScaledVector(tmp.forward, FLOAT_DISTANCE)
      .addScaledVector(tmp.right, centerRight + screenX * halfWidth)
      .addScaledVector(tmp.up, centerUp);
    floatPose.scale = Math.min(
      (FLOAT_HEIGHT_FRACTION * 2 * halfHeight) / CARD_SIZE,
      (0.8 * 2 * halfWidth) / CARD_SIZE,
    );
    // Le bas de la carte ne doit pas passer sous le sol (cadrage large : caméra plus basse)
    tmp.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const bottom = floatPose.position.y - (CARD_SIZE * floatPose.scale * 0.5 + FLOAT_BOB) * Math.abs(tmp.up.y);
    // (inutile quand le sol est transparent : rien à traverser, et le relèvement sortirait la carte du cadre)
    if (!FLOOR_TRANSPARENT && bottom < FLOAT_FLOOR_MARGIN) floatPose.position.y += FLOAT_FLOOR_MARGIN - bottom;
    floatPose.quaternion.copy(camera.quaternion).multiply(FACE_TO_CAMERA);
    // léger flottement
    const bob = Math.sin(time * 1.6) * FLOAT_BOB;
    floatPose.position.y += bob;
    const tilt = THREE.MathUtils.degToRad(FLOAT_BOB_TILT_DEG);
    tmp.euler.set(Math.sin(time * 1.1) * tilt, Math.sin(time * 0.8 + 1) * tilt, 0);
    floatPose.quaternion.multiply(tmp.q.setFromEuler(tmp.euler));
  }

  // Position de repos, avec l'écartement actuel dû aux voisines de la carte piochée
  function restPosition(card) {
    tmp.base.copy(card.userData.rest.position);
    tmp.base.x += hover.pushOffset(card);
    return tmp.base;
  }

  // k = 0 : face éclairée par la scène ; k = 1 : texture seule, sans aucune lumière (couleur noire + émissive = texture)
  function setUnlit(card, k) {
    const m = card.material[1];
    m.emissiveIntensity = k;
    m.color.setScalar(1 - k);
    m.roughness = 0.7 + 0.3 * k;
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
    // Premier plan : dès qu'elle quitte la table, la carte est dessinée dans une 2e passe (couche 1, profondeur
    // remise à zéro) : rien ne peut passer devant elle, mais elle garde sa propre profondeur (courbure).
    card.layers.set(p >= riseStart ? 1 : 0);
    computeFloatPose(time);

    // Phase 1 (p < MOVE_DELAY) : la carte glisse au sol vers la caméra pendant qu'elle se courbe.
    // Phase 2 : depuis ce point, elle monte et se retourne jusqu'à la pose flottante.
    const slide = Math.sin((Math.min(1, p / MOVE_DELAY) * Math.PI) / 2); // freine en fin de glissement pendant que la montée démarre
    // Direction (au sol) de la carte vers la caméra : elle pivote autour de son centre (la « main »
    // est au centre) pour que son bord relevé (+Z local) pointe vers la caméra, et glisse dans ce sens.
    const base = restPosition(card);
    const toX = camera.position.x - base.x;
    const toZ = camera.position.z - base.z;
    const length = Math.hypot(toX, toZ) || 1;
    tmp.start.copy(base);
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
    setUnlit(card, FLOAT_EMISSIVE * e);
  }

  function start(card, time, speed = 1) {
    hover.control(card);
    const entry = {
      card,
      p: 0,
      target: 1,
      speed, // multiplicateur de vitesse de l'animation
      offset: card.position.clone().sub(restPosition(card)),
      shown: false,
    };
    entries.push(entry);
    applyPose(entry, time);
    return entry;
  }

  function drop(entry, speed = 1) {
    entry.target = 0;
    entry.speed = speed;
    entry.offset.set(0, 0, 0); // au retour, on revient exactement à la pose de repos
    panel.hide();
  }

  function finish(entry) {
    const { card } = entry;
    card.position.copy(restPosition(card));
    card.quaternion.copy(card.userData.rest.quaternion);
    card.layers.set(0);
    card.scale.setScalar(1);
    bendCard(card, 0);
    setUnlit(card, 0);
    hover.release(card);
    entries.splice(entries.indexOf(entry), 1);
    if (entries.length === 0) hold = false;
  }

  // La carte flottante : arrivée, sans aucune autre animation en cours
  const floating = () =>
    !pending && entries.length === 1 && entries[0].target === 1 && entries[0].p === 1 ? entries[0] : null;
  const isFloating = () => floating() !== null;

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
    raycaster.layers.enableAll(); // la carte flottante est sur la couche 1
    return raycaster.intersectObject(floating().card, false).length > 0;
  }

  let lastTime = 0;
  canvas.addEventListener('click', (event) => {
    if (entries.length === 0 && !pending) {
      const card = hover.cardAt(event.clientX, event.clientY);
      if (card) start(card, lastTime);
    } else if (isFloating() && floatingCardAt(event.clientX, event.clientY)) {
      hold = false;
      drop(floating());
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (isFloating()) canvas.style.cursor = floatingCardAt(event.clientX, event.clientY) ? 'pointer' : '';
  });

  // Carte précédente (-1) / suivante (+1), en boucle : la carte flottante repart pendant que la suivante arrive
  function goTo(step) {
    const current = floating();
    if (!current) return;
    const total = hover.count;
    const next = hover.cards[(current.card.userData.index + step + total) % total];
    hold = true;
    drop(current, NAV_SPEED);
    panel.setBusy(true);
    pending = { card: next, timer: (DROP_DURATION * NAV_OVERLAP) / NAV_SPEED };
  }

  return {
    // Une carte est en cours de pioche, flottante ou en retour : le survol est suspendu
    isActive: () => entries.length > 0 || pending !== null,
    isFloating,
    // Une carte est au premier plan : elle demande une 2e passe de rendu
    hasForeground: () => entries.some((entry) => entry.card.layers.isEnabled(1)),
    start,
    goTo,
    // Test : fixe la progression de la carte active (?carte=2&p=0.5)
    seek(p) {
      if (entries[0]) entries[0].p = THREE.MathUtils.clamp(p, 0, 1);
    },
    drop() {
      const current = floating();
      if (current) {
        hold = false;
        drop(current);
      }
    },
    // Plein écran (0 ou 1, sans transition) : le canvas passe en plein écran dès qu'une carte est piochée et ne
    // revient dans la page qu'une fois toutes les cartes reposées. La table ne bouge pas (cadrage de la caméra
    // inchangé) : seule la carte voyage, de sa place sur la table jusqu'à la pose flottante.
    // Ancienne version (agrandissement progressif, piloté par la pioche) :
    //   let k = 0; for (const entry of entries) k = Math.max(k, smoothstep(EXPAND_START, 1, entry.p)); return k;
    // Opacité relative (0..1) du plan noir derrière la carte flottante : elle monte avec la pioche, à partir du
    // moment où la carte passe au premier plan (sinon elle serait assombrie elle aussi), et redescend au rangement.
    shade() {
      if (hold) return 1;
      let k = 0;
      for (const entry of entries) k = Math.max(k, smoothstep(MOVE_DELAY - MOVE_OVERLAP, 1, entry.p));
      return k;
    },
    expansion() {
      return entries.length > 0 || pending ? 1 : 0;
    },
    update(dt, time) {
      lastTime = time;
      if (pending) {
        pending.timer -= dt;
        if (pending.timer <= 0) {
          start(pending.card, time, NAV_SPEED);
          pending = null;
        }
      }
      for (const entry of [...entries]) {
        const duration = entry.target === 1 ? LIFT_DURATION : DROP_DURATION;
        const step = (dt * entry.speed) / duration;
        entry.p = entry.target === 1 ? Math.min(1, entry.p + step) : Math.max(0, entry.p - step);
        applyPose(entry, time);

        if (entry.target === 1 && entry.p > 0.65 && !entry.shown) {
          entry.shown = true;
          const { artwork, index } = entry.card.userData;
          panel.show({ index, total: hover.count, title: artwork.title, desc: artwork.desc });
        }
        if (entry.target === 0 && entry.p === 0) finish(entry);
      }
      if (floating()) panel.setBusy(false);
    },
  };
}
