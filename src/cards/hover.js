import * as THREE from 'three';
import {
  CARD_SIZE,
  HOVER_LIFT,
  HOVER_NEIGHBOR_PUSH,
  HOVER_SHAKE,
  HOVER_SHAKE_CYCLES,
  HOVER_SHAKE_DURATION,
  HOVER_SMOOTH,
  HOVER_TILT_DEG,
} from './config.js';

// Survol des cartes : raycast à chaque déplacement du pointeur, puis, à chaque frame, une pose
// lissée par carte (soulèvement + vibration). La pose de repos est celle du mesh à la création.
// `enabled()` permet de suspendre le survol (carte active, transition…).
const SETTLED = 0.03; // seuil « terminé » d'une phase lissée

export function createHover({ canvas, camera, cards, enabled = () => true }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tilt = THREE.MathUtils.degToRad(HOVER_TILT_DEG);
  let hovered = null;
  // Carte « ouverte » : celle dont les voisines sont écartées (et qui monte une fois l'écart fait).
  // Elle suit la carte survolée avec un ordre fixe : écarter PUIS monter ; redescendre PUIS refermer.
  let current = -1;
  // Cartes pilotées ailleurs (pioche) : le survol n'écrit plus leur pose
  const controlled = new Set();

  const states = cards.map((card, i) => ({
    card,
    amount: 0, // 0 = repos, 1 = pleinement survolée
    push: 0, // écartement lissé : -1 = poussée vers la gauche, +1 vers la droite
    shakeTime: Infinity, // temps depuis le début de la vibration (Infinity = au repos)
    wasLifting: false,
    rest: {
      position: card.position.clone(),
      rotation: card.rotation.clone(),
    },
  }));

  // Raycast fixe : sur des plans invisibles, immobiles, à la pose de repos de chaque carte
  // (la carte survolée et ses voisines bougent, mais la zone sensible ne change pas).
  const hitMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const hitGeometry = new THREE.PlaneGeometry(CARD_SIZE, CARD_SIZE).rotateX(-Math.PI / 2);
  const hitboxes = states.map(({ card, rest }) => {
    const hitbox = new THREE.Mesh(hitGeometry, hitMaterial);
    hitbox.position.copy(rest.position);
    hitbox.rotation.copy(rest.rotation);
    hitbox.updateMatrixWorld(true);
    hitbox.userData.card = card;
    return hitbox;
  });

  // Carte sous un point de l'écran (en pixels client), sur les plans fixes
  function cardAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitboxes, false)[0];
    return hit ? hit.object.userData.card : null;
  }

  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitboxes, false)[0];
    hovered = hit && enabled() ? hit.object.userData.card : null;
    canvas.style.cursor = hovered ? 'pointer' : '';
  }

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    pick();
  });
  canvas.addEventListener('pointerleave', () => {
    hovered = null;
    canvas.style.cursor = '';
  });

  return {
    get hovered() {
      return hovered;
    },
    cardAt,
    // Décalage X (m) dû à l'écartement des voisines : la pioche en tient compte pour son point de départ/d'arrivée
    pushOffset: (card) => states[cards.indexOf(card)].push * HOVER_NEIGHBOR_PUSH,
    count: cards.length,
    cards,
    control(card) {
      controlled.add(card);
    },
    // Rend la carte au survol : remise à zéro de son état (elle est revenue à sa pose de repos)
    release(card) {
      controlled.delete(card);
      const state = states.find((s) => s.card === card);
      state.amount = 0;
      state.shakeTime = Infinity;
      state.wasLifting = false;
    },
    // dt en secondes, time = temps écoulé en secondes
    update(dt, time) {
      if (!enabled() && hovered) {
        hovered = null;
        canvas.style.cursor = '';
      }
      const k = 1 - Math.exp(-HOVER_SMOOTH * dt);
      // Une carte piochée garde ses voisines écartées pendant toute son animation
      const held = controlled.size ? cards.indexOf([...controlled].at(-1)) : -1; // la dernière piochée
      if (held >= 0) current = held;
      const goal = held >= 0 ? held : hovered ? cards.indexOf(hovered) : -1;
      const isNeighbor = (i) => current >= 0 && Math.abs(i - current) === 1;

      // 1. La carte courante n'est plus visée : elle redescend d'abord, puis on lâche/change de cible
      if (current >= 0 && goal !== current && states[current].amount < SETTLED) current = goal;
      // 2. Aucune carte ouverte : on ouvre la visée (les voisines commencent à s'écarter)
      else if (current < 0 && goal >= 0) current = goal;

      // 3. La carte ne monte qu'une fois ses voisines écartées
      const spread = states.every((state, i) => !isNeighbor(i) || Math.abs(state.push) > 1 - SETTLED);

      for (const [i, state] of states.entries()) {
        const { card, rest } = state;
        const pushTarget = isNeighbor(i) ? Math.sign(i - current) : 0;
        state.push += (pushTarget - state.push) * k;
        const liftTarget = i === current && i === goal && spread ? 1 : 0;
        state.amount += (liftTarget - state.amount) * k;
        if (controlled.has(card)) continue;
        const a = state.amount;
        // Vibration unique : HOVER_SHAKE_CYCLES allers-retours amortis, déclenchés quand la carte commence à monter
        if (liftTarget && !state.wasLifting) state.shakeTime = 0;
        state.wasLifting = liftTarget === 1;
        state.shakeTime += dt;
        const p = state.shakeTime / HOVER_SHAKE_DURATION;
        const angle = Math.min(p, 1) * HOVER_SHAKE_CYCLES * 2 * Math.PI; // borné : jamais NaN (shakeTime vaut Infinity au repos)
        const envelope = Math.max(0, 1 - p);
        const shake = Math.sin(angle) * envelope;
        card.position.set(
          rest.position.x + shake * HOVER_SHAKE + state.push * HOVER_NEIGHBOR_PUSH,
          rest.position.y + HOVER_LIFT * a,
          rest.position.z + Math.sin(angle + 1.2) * envelope * HOVER_SHAKE,
        );
        card.rotation.set(
          rest.rotation.x + shake * tilt,
          rest.rotation.y,
          rest.rotation.z + shake * tilt,
        );
      }
    },
  };
}
