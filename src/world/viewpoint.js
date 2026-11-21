import * as THREE from 'three';
import { CAMERA_FOV, EYE_HEIGHT, PAINTING_SCREEN_FILL, PANEL_VIEW_SHIFT } from '../config.js';

// Point de vue face à un tableau.
//  - center : centre du tableau (monde) ; normal : normale du mur vers l'intérieur
//  - right : axe gauche → droite vu de l'intérieur
//  - width, height : dimensions du tableau cadre compris (m)
// La distance fait occuper au tableau ≈ PAINTING_SCREEN_FILL de l'écran
// (contrainte la plus forte entre hauteur et largeur). Le point de vue est
// décalé vers la droite pour que le tableau se place à gauche, côté panneau libre.
// Retourne { position, yaw }.
export function computeViewpoint({ center, normal, right, width, height }) {
  const screenAspect = window.innerWidth / window.innerHeight;
  const halfTan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);

  const distV = height / (2 * PAINTING_SCREEN_FILL * halfTan);
  const distH = width / (2 * PAINTING_SCREEN_FILL * halfTan * screenAspect);
  const dist = Math.max(distV, distH);

  const shift = dist * halfTan * screenAspect * PANEL_VIEW_SHIFT;
  const position = center
    .clone()
    .addScaledVector(normal, dist)
    .addScaledVector(right, shift);
  position.y = EYE_HEIGHT;

  // Caméra tournée vers le mur : regard = -normale
  return { position, yaw: Math.atan2(normal.x, normal.z) };
}
