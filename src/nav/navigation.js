import * as THREE from 'three';
import {
  CLOSE_BACKOFF_DISTANCE,
  EYE_HEIGHT,
  PANEL_FADE_START,
  PANEL_HIDE_ANGLE,
  PANEL_SHOW_ANGLE,
} from '../config.js';
import { createPanel } from '../ui/panel.js';
import { wrapAngle } from './angle.js';
import { createHighlight } from './highlight.js';
import { createIntro } from './intro.js';
import { createLook } from './look.js';
import { createPicking } from './picking.js';
import { createTravel } from './travel.js';
import { computeBounds, computeTopPosition } from './topView.js';

// Opacité du panneau selon l'écart d'angle (degrés) : 1 jusqu'à FADE_START,
// puis fondu jusqu'à 0 à HIDE_ANGLE
function fadeForAngle(degrees) {
  const k = (degrees - PANEL_FADE_START) / (PANEL_HIDE_ANGLE - PANEL_FADE_START);
  return 1 - THREE.MathUtils.clamp(k, 0, 1);
}

// Orchestre la navigation : rotation, déplacement, picking et panneau.
// États : 'idle' (départ), 'moving' (déplacement en cours : glisser et clics
// désactivés, panneau masqué), 'atPainting' (arrivé : glisser actif, panneau
// selon l'angle), 'top' (vue du dessus : glisser désactivé, clics sur tableaux et bancs
// actifs pour revenir dans le bâtiment).
// `roomCells` : cellules de la salle (pour cadrer le bâtiment en vue du dessus) ;
// `onTopViewChange(bool, target)` : appelé quand on entre / sort de la vue du dessus (fond,
// lumières, plafonds, bouton… gérés par l'appelant) ; `target` = position d'arrivée au retour.
// Retourne { goTo, look, playIntro, refitTopView, update }.
export function createNavigation({
  canvas,
  camera,
  paintings,
  benches = [],
  plants = [],
  occluders,
  roomCells,
  onTopViewChange,
}) {
  const look = createLook(canvas, camera);
  const travel = createTravel(camera, look);
  const highlight = createHighlight(paintings);
  const intro = createIntro({ look, canvas });

  let state = { name: 'idle', id: null };
  let panelOpen = false; // faux si l'utilisateur a fermé le panneau
  let panelShown = false; // état affiché actuel (hystérésis)
  let hoveredGroup = null; // tableau sous le pointeur (picking)
  const bounds = computeBounds(roomCells);
  let topMode = false; // vue du dessus (en cours d'ouverture, ouverte, ou en cours de fermeture avant exitTopMode)
  let savedPose = null; // position / yaw avant la vue du dessus : retour par le bouton

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

  // Précédent / suivant : limités aux tableaux de la pièce (cellule) en cours,
  // dans l'ordre de paintings.flat(), en boucle. Ne change jamais de pièce.
  function step(delta) {
    if (state.name !== 'atPainting') return;
    const current = paintings[state.id];
    const inRoom = paintings.filter(
      (p) => p.userData.cellIndex === current.userData.cellIndex,
    );
    const index = inRoom.indexOf(current);
    const next = inRoom[(index + delta + inRoom.length) % inRoom.length];
    goTo(next.userData.paintingId);
  }

  function arrive(id) {
    state = { name: 'atPainting', id };
    look.setEnabled(true);
    panelOpen = true;
    panel.setOpacity(1);
    showPanel();
  }

  // Vue du dessus : entrée (la caméra monte et regarde à la verticale)
  function enterTopView() {
    intro.cancel();
    savedPose = { position: camera.position.clone(), yaw: look.getYaw() };
    topMode = true;
    onTopViewChange?.(true);
    panelOpen = false;
    hidePanel();
    look.setEnabled(false);
    state = { name: 'moving', id: null };
    // yaw 0 : nord en haut de l'écran
    travel.start({ position: computeTopPosition(bounds, camera), yaw: 0, pitch: -Math.PI / 2 }, () => {
      state = { name: 'top', id: null };
    });
  }

  // Sortie du mode « vue du dessus » (fond, lumières rétablis), avant de redescendre.
  // `target` : position d'arrivée, pour rallumer tout de suite les spots de cette pièce.
  function exitTopMode(target) {
    if (!topMode) return;
    topMode = false;
    onTopViewChange?.(false, target);
  }

  // Retour (clic sur une plante) : revient à la position et à l'orientation d'avant
  function leaveTopView() {
    exitTopMode(savedPose.position);
    state = { name: 'moving', id: null };
    travel.start({ position: savedPose.position, yaw: savedPose.yaw }, () => {
      state = { name: 'idle', id: null };
      look.setEnabled(true);
    });
  }

  // Entre dans la vue du dessus, ou en revient (ignoré pendant un déplacement)
  function toggleTopView() {
    if (state.name === 'moving') return;
    if (state.name === 'top') leaveTopView();
    else enterTopView();
  }

  // Va au point de vue d'un tableau (ignoré pendant un déplacement).
  // Sur le tableau courant, ramène simplement la caméra face à lui.
  function goTo(id) {
    if (state.name === 'moving') return;
    exitTopMode(paintings[id].userData.viewpoint.position);
    intro.cancel();
    state = { name: 'moving', id };
    panelOpen = false;
    hidePanel();
    look.setEnabled(false);
    travel.start(paintings[id].userData.viewpoint, () => arrive(id));
  }

  // Clic sur un banc : la caméra se déplace au-dessus de lui, sans toucher à la rotation
  // (le yaw cible = le yaw actuel). Pas de panneau ; on repasse en 'idle' à l'arrivée.
  function moveToBench(bench) {
    if (state.name === 'moving') return;
    exitTopMode(bench.position);
    intro.cancel();
    state = { name: 'moving', id: null };
    panelOpen = false;
    hidePanel();
    look.setEnabled(false);
    const position = new THREE.Vector3(bench.position.x, EYE_HEIGHT, bench.position.z);
    travel.start({ position, yaw: look.getYaw() }, () => {
      state = { name: 'idle', id: null };
      look.setEnabled(true);
    });
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
    benches,
    plants,
    occluders,
    onPick: (group) => goTo(group.userData.paintingId),
    onPickBench: moveToBench,
    // Clic sur une plante : bascule vers la vue du dessus (et, depuis celle-ci, retour à la position d'avant)
    onPickPlant: toggleTopView,
    onHover: (group) => (hoveredGroup = group),
  });

  return {
    goTo,
    look, // orientation de départ : navigation.look.setYaw(...)
    playIntro: intro.start,
    // À appeler au redimensionnement : recadre le bâtiment si on est en vue du dessus
    refitTopView() {
      if (state.name === 'top') camera.position.copy(computeTopPosition(bounds, camera));
    },
    update(dt) {
      travel.update(dt);
      intro.update(dt);
      // Pas de halo pendant un déplacement ; il revient à l'arrivée si le
      // pointeur est toujours sur le tableau
      highlight.setHovered(state.name === 'moving' ? null : hoveredGroup);
      highlight.update(dt);
      if (state.name === 'atPainting' && panelOpen) updatePanelVisibility();
    },
  };
}
