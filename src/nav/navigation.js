import * as THREE from 'three';
import { CLOSE_BACKOFF_DISTANCE, PANEL_FADE_START, PANEL_HIDE_ANGLE, PANEL_SHOW_ANGLE } from '../config.js';
import { createPanel } from '../ui/panel.js';
import { wrapAngle } from './angle.js';
import { createHighlight } from './highlight.js';
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
  const highlight = createHighlight(paintings);

  let state = { name: 'idle', id: null };
  let panelOpen = false; // faux si l'utilisateur a fermé le panneau
  let panelShown = false; // état affiché actuel (hystérésis)
  let hoveredGroup = null; // tableau sous le pointeur (picking)

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

  // Fermeture du panneau : la caméra recule de CLOSE_BACKOFF_DISTANCE mètres,
  // en s'éloignant du mur du tableau (le yaw ne change pas).
  // Pendant le recul : état 'moving' (glisser et clics désactivés).
  function closePanel() {
    if (state.name !== 'atPainting') return;
    const { id } = state;
    panelOpen = false;
    hidePanel();

    // La normale du mur vers l'intérieur se déduit du yaw de face : (sin, cos)
    const faceYaw = paintings[id].userData.viewpoint.yaw;
    const position = camera.position.clone();
    position.x += Math.sin(faceYaw) * CLOSE_BACKOFF_DISTANCE;
    position.z += Math.cos(faceYaw) * CLOSE_BACKOFF_DISTANCE;

    state = { name: 'moving', id };
    look.setEnabled(false);
    travel.start({ position, yaw: look.getYaw() }, () => {
      state = { name: 'atPainting', id };
      look.setEnabled(true);
    });
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
    onHover: (group) => (hoveredGroup = group),
  });

  return {
    goTo,
    update(dt) {
      travel.update(dt);
      // Pas de halo pendant un déplacement ; il revient à l'arrivée si le
      // pointeur est toujours sur le tableau
      highlight.setHovered(state.name === 'moving' ? null : hoveredGroup);
      highlight.update(dt);
      if (state.name === 'atPainting' && panelOpen) updatePanelVisibility();
    },
  };
}
