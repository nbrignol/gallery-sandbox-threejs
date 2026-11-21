import * as THREE from 'three';
import { PANEL_FADE_START, PANEL_HIDE_ANGLE, PANEL_SHOW_ANGLE } from '../config.js';
import { createPanel } from '../ui/panel.js';
import { wrapAngle } from './angle.js';
import { createLook } from './look.js';
import { createPicking } from './picking.js';
import { createTravel } from './travel.js';

// Opacité du panneau selon l'écart d'angle (degrés) : 1 jusqu'à FADE_START,
// puis fondu jusqu'à 0 à HIDE_ANGLE
function fadeForAngle(degrees) {
  const k = (degrees - PANEL_FADE_START) / (PANEL_HIDE_ANGLE - PANEL_FADE_START);
  return 1 - THREE.MathUtils.clamp(k, 0, 1);
}

// Orchestre la navigation : rotation, déplacement, picking et panneau.
// États : 'idle' (départ), 'moving' (déplacement en cours : glisser et clics
// désactivés, panneau masqué), 'atPainting' (arrivé : glisser actif, panneau
// selon l'angle). Retourne { goTo(id), update(dt) }.
export function createNavigation({ canvas, camera, paintings, occluders }) {
  const look = createLook(canvas, camera);
  const travel = createTravel(camera, look);

  let state = { name: 'idle', id: null };
  let panelOpen = false; // faux si l'utilisateur a fermé le panneau
  let panelShown = false; // état affiché actuel (hystérésis)

  const panel = createPanel({
    onPrev: () => step(-1),
    onNext: () => step(1),
    onClose: closePanel,
  });

  function showPanel() {
    panel.show(paintings[state.id].userData);
    panelShown = true;
  }

  function hidePanel() {
    panel.hide();
    panelShown = false;
  }

  function closePanel() {
    panelOpen = false;
    hidePanel();
  }

  // Précédent / suivant : ordre de paintings.flat(), en boucle
  function step(delta) {
    if (state.name !== 'atPainting') return;
    goTo((state.id + delta + paintings.length) % paintings.length);
  }

  function arrive(id) {
    state = { name: 'atPainting', id };
    look.setEnabled(true);
    panelOpen = true;
    panel.setOpacity(1);
    showPanel();
  }

  // Va au point de vue d'un tableau (ignoré pendant un déplacement).
  // Sur le tableau courant, ramène simplement la caméra face à lui.
  function goTo(id) {
    if (state.name === 'moving') return;
    state = { name: 'moving', id };
    panelOpen = false;
    hidePanel();
    look.setEnabled(false);
    travel.start(paintings[id].userData.viewpoint, () => arrive(id));
  }

  // Panneau lié à l'angle : disparaît au-delà de HIDE_ANGLE, réapparaît sous
  // SHOW_ANGLE (hystérésis), fondu entre FADE_START et HIDE_ANGLE
  function updatePanelVisibility() {
    const { yaw } = paintings[state.id].userData.viewpoint;
    const degrees = THREE.MathUtils.radToDeg(Math.abs(wrapAngle(look.getYaw() - yaw)));
    if (panelShown && degrees > PANEL_HIDE_ANGLE) hidePanel();
    else if (!panelShown && degrees < PANEL_SHOW_ANGLE) showPanel();
    if (panelShown) panel.setOpacity(fadeForAngle(degrees));
  }

  createPicking({
    canvas,
    camera,
    paintings,
    occluders,
    onPick: (group) => goTo(group.userData.paintingId),
  });

  return {
    goTo,
    update(dt) {
      travel.update(dt);
      if (state.name === 'atPainting' && panelOpen) updatePanelVisibility();
    },
  };
}
