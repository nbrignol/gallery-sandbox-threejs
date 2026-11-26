import * as THREE from 'three';
import {
  CARD_SIZE,
  CARD_THICKNESS,
  TOOLTIP_BULLET_RADIUS,
  TOOLTIP_COLOR,
  TOOLTIP_FADE,
  TOOLTIP_FONT,
  TOOLTIP_FRAME_BORDER,
  TOOLTIP_FRAME_FILL,
  TOOLTIP_FRAME_HEIGHT,
  TOOLTIP_FRAME_RADIUS,
  TOOLTIP_LINE_HEIGHT,
  TOOLTIP_LINE_WIDTH,
  TOOLTIP_OUTLINE_MARGIN,
  TOOLTIP_OUTLINE_WIDTH,
} from './config.js';

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const TEXTURE_HEIGHT = 128;
const screenUp = new THREE.Vector3();

// Cadre blanc arrondi + titre, dessinés dans un canvas ; largeur adaptée au texte
function createTitleTexture(title) {
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = TOOLTIP_FONT;
  const width = Math.ceil(measure.measureText(title).width + TEXTURE_HEIGHT * 0.7);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  const b = TOOLTIP_FRAME_BORDER;
  ctx.beginPath();
  ctx.roundRect(b / 2, b / 2, width - b, TEXTURE_HEIGHT - b, TOOLTIP_FRAME_RADIUS);
  ctx.fillStyle = TOOLTIP_FRAME_FILL;
  ctx.fill();
  ctx.lineWidth = b;
  ctx.strokeStyle = TOOLTIP_COLOR;
  ctx.stroke();
  ctx.font = TOOLTIP_FONT;
  ctx.fillStyle = TOOLTIP_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, TEXTURE_HEIGHT / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: width / TEXTURE_HEIGHT };
}

// Tooltip 3D unique (puce + ligne + cadre avec le titre), déplacé sur la carte visée.
// `anchorOf(card, out)` donne le point de la face du dessus de la carte (au centre).
export function createTooltip({ scene, camera, anchorOf }) {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 10;

  const material = (extra) =>
    new THREE.MeshBasicMaterial({
      color: TOOLTIP_COLOR,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      ...extra,
    });

  // Puce : à plat sur la carte (test de profondeur gardé : une carte au-dessus la cache)
  const bullet = new THREE.Mesh(
    new THREE.CircleGeometry(TOOLTIP_BULLET_RADIUS, 32).rotateX(-Math.PI / 2),
    material({ polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  );
  // Rectangle englobant la carte : cadre plat (carré creux), orienté comme la carte au repos
  const outer = CARD_SIZE / 2 + TOOLTIP_OUTLINE_MARGIN;
  const inner = outer - TOOLTIP_OUTLINE_WIDTH;
  const outlineShape = new THREE.Shape()
    .moveTo(-outer, -outer)
    .lineTo(outer, -outer)
    .lineTo(outer, outer)
    .lineTo(-outer, outer)
    .closePath();
  outlineShape.holes.push(
    new THREE.Path().moveTo(-inner, -inner).lineTo(-inner, inner).lineTo(inner, inner).lineTo(inner, -inner).closePath(),
  );
  const outline = new THREE.Mesh(
    new THREE.ShapeGeometry(outlineShape).rotateX(-Math.PI / 2),
    material({ polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  );
  // Ligne : plan vertical de hauteur 1, origine en bas (échelle Y = hauteur), tourné vers la caméra
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(TOOLTIP_LINE_WIDTH, 1).translate(0, 0.5, 0),
    material({ depthTest: false }),
  );
  // Cadre : plan face caméra, centré horizontalement, posé sur le haut de la ligne
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    material({ depthTest: false, map: null }),
  );
  for (const mesh of [bullet, outline, line, frame]) mesh.renderOrder = 10;
  group.add(bullet, outline, line, frame);
  scene.add(group);

  const titles = new Map(); // carte -> { texture, aspect }
  const anchor = new THREE.Vector3();
  let shown = null; // carte actuellement équipée du tooltip
  let visibility = 0;

  function setCard(card) {
    shown = card;
    if (!card) return;
    if (!titles.has(card)) titles.set(card, createTitleTexture(card.userData.artwork.title));
    const { texture, aspect } = titles.get(card);
    frame.material.map = texture;
    frame.material.needsUpdate = true;
    frame.scale.set(TOOLTIP_FRAME_HEIGHT * aspect, TOOLTIP_FRAME_HEIGHT, 1);
  }

  return {
    // target : carte visée (ou null). Changement de carte : fondu sortant, puis entrant sur la nouvelle.
    update(dt, target) {
      if (!shown && target) setCard(target); // premier affichage : pas de fondu sortant à attendre
      let goal = target ? 1 : 0;
      if (target !== shown && shown) goal = 0;
      visibility += (goal - visibility) * (1 - Math.exp(-TOOLTIP_FADE * dt));
      if (visibility < 0.02 && goal === 0) {
        visibility = 0;
        if (target !== shown) setCard(target);
      }
      group.visible = !!shown && visibility > 0.001;
      if (!group.visible) return;

      anchorOf(shown, anchor);
      group.position.copy(anchor);
      group.position.y += CARD_THICKNESS * 0.5 + 0.004;

      // Ancien : trait vertical dans le monde (axe Y), tourné vers la caméra
      // const yaw = Math.atan2(camera.position.x - anchor.x, camera.position.z - anchor.z);
      // Actuel : trait vertical à l'écran (le long du haut de la caméra)
      screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const grow = smoothstep(0, 0.7, visibility);
      // line.rotation.y = yaw;
      line.quaternion.copy(camera.quaternion);
      line.scale.y = TOOLTIP_LINE_HEIGHT * grow;
      frame.quaternion.copy(camera.quaternion);
      // frame.position.set(0, TOOLTIP_LINE_HEIGHT * grow, 0);
      frame.position.copy(screenUp).multiplyScalar(TOOLTIP_LINE_HEIGHT * grow);
      bullet.material.opacity = Math.min(1, visibility * 3);
      outline.material.opacity = Math.min(1, visibility * 3);
      outline.quaternion.copy(shown.userData.rest.quaternion);
      line.material.opacity = grow;
      frame.material.opacity = smoothstep(0.5, 1, visibility);
    },
  };
}
