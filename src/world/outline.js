import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  HOVER_OUTLINE_COLOR,
  HOVER_OUTLINE_GAP,
  HOVER_OUTLINE_WIDTH,
  PAINTING_WALL_OFFSET,
} from '../config.js';

// Contour net de survol : un rectangle d'épaisseur FIXE EN PIXELS (quelle que soit
// la distance à l'écran), sans dégradé, à HOVER_OUTLINE_GAP du cadre.
// (width × height = taille cadre compris). Invisible au repos (opacité 0, animée par
// nav/highlight.js). Contrairement à une ligne WebGL classique (toujours 1 px), Line2
// dessine de vrais traits épais ; sa résolution est mise à jour à chaque rendu.
export function createOutline(width, height) {
  const hw = width / 2 + HOVER_OUTLINE_GAP;
  const hh = height / 2 + HOVER_OUTLINE_GAP;
  const geometry = new LineGeometry();
  geometry.setPositions([-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0, -hw, -hh, 0]);

  const material = new LineMaterial({
    color: HOVER_OUTLINE_COLOR,
    linewidth: HOVER_OUTLINE_WIDTH, // en pixels
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });

  const outline = new Line2(geometry, material);
  outline.name = 'outline';
  outline.position.z = -PAINTING_WALL_OFFSET + 0.003; // 3 mm devant le mur
  outline.raycast = () => {}; // ne compte pas pour le picking
  return outline;
}
