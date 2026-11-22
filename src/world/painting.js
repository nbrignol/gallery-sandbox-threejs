import * as THREE from 'three';
import {
  CEILING_HEIGHT,
  PAINTING_CENTER_HEIGHT,
  PAINTING_HEIGHT,
  PAINTING_MAX_WALL_RATIO,
  PAINTING_SPOT_DISTANCE,
  PAINTING_SPOT_INTENSITY,
  PAINTING_WALL_OFFSET,
  FRAME_CANVAS_RECESS,
  LAMP_DEPTH,
  LAMP_GAP,
  LAMP_HEIGHT,
  LAMP_WIDTH,
} from '../config.js';
import { createFrame, resolveFrameStyle } from './frame.js';
import { createGlow } from './glow.js';
import { createOutline } from './outline.js';
import { lampLightMaterial } from './materials.js';
import { computeViewpoint } from './viewpoint.js';

const loader = new THREE.TextureLoader();

// Charge l'image en texture couleur
async function loadTexture(src) {
  const texture = await loader.loadAsync(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Taille de la toile : hauteur de base × `scale` (1 par défaut), largeur selon
// le ratio, plafonnée à une part de la largeur du mur, cadre compris (la hauteur
// est alors réduite).
function fitSize(aspect, wallWidth, border, scale) {
  let height = PAINTING_HEIGHT * scale;
  let width = height * aspect;
  const maxWidth = wallWidth * PAINTING_MAX_WALL_RATIO - 2 * border;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }
  return { width, height };
}

// Toile (plan texturé), en léger retrait dans le trou du cadre
function createCanvas(texture, width, height, frameDepth) {
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  canvas.name = 'canvas';
  canvas.position.z = frameDepth - PAINTING_WALL_OFFSET - FRAME_CANVAS_RECESS;
  return canvas;
}

// Petite boîte au-dessus du cadre qui figure la lampe du tableau (décor : la
// lumière vient du spot). Matériau du cadre, sauf le dessous (blanc, simule la
// lumière) ; dos contre le mur. `height` : hauteur du tableau cadre compris.
function createLamp(width, height, material) {
  const lampWidth = Math.min(LAMP_WIDTH, width * 0.6);
  // Ordre des faces d'un BoxGeometry : +X, -X, +Y, -Y (dessous), +Z, -Z
  const materials = [material, material, material, lampLightMaterial, material, material];
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(lampWidth, LAMP_HEIGHT, LAMP_DEPTH), materials);
  lamp.name = 'lamp';
  lamp.position.set(
    0,
    height / 2 + LAMP_GAP + LAMP_HEIGHT / 2,
    LAMP_DEPTH / 2 - PAINTING_WALL_OFFSET,
  );
  return lamp;
}

// Spot dirigé vers le centre de la toile (repère local du groupe :
// +Z = devant le tableau, origine = centre du tableau)
function createSpot(width, height, centerY) {
  const spot = new THREE.SpotLight(0xfff2e0, PAINTING_SPOT_INTENSITY, 0, 1, 1, 2);
  spot.name = 'spot';
  spot.position.set(0, CEILING_HEIGHT - 0.3 - centerY, PAINTING_SPOT_DISTANCE);
  const reach = Math.hypot(spot.position.y, spot.position.z);
  spot.angle = Math.min(Math.atan((Math.max(width, height) * 0.6) / reach), Math.PI / 3);
  return spot;
}

// Crée le groupe d'un tableau posé sur un mur (centré, t = 0.5).
// Les métadonnées sont uniquement sur le groupe (userData).
export async function createPainting(data, wall, id, cellIndex) {
  const texture = await loadTexture(data.src);
  const aspect = texture.image.width / texture.image.height;
  const style = resolveFrameStyle(data.frame);
  const { width: canvasWidth, height: canvasHeight } = fitSize(
    aspect,
    wall.width,
    style.border,
    data.scale ?? 1,
  );
  // Dimensions cadre compris (point de vue, spot)
  const width = canvasWidth + 2 * style.border;
  const height = canvasHeight + 2 * style.border;

  const group = new THREE.Group();
  group.name = `painting-${id}`;
  group.add(
    createCanvas(texture, canvasWidth, canvasHeight, style.depth),
    createFrame(canvasWidth, canvasHeight, style),
    createLamp(width, height, style.material),
    createGlow(width, height),
    createOutline(width, height),
  );

  const spot = createSpot(width, height, PAINTING_CENTER_HEIGHT);
  group.add(spot, spot.target); // la cible reste à l'origine du groupe

  // Pose contre le mur, légèrement décollée le long de la normale
  group.position
    .copy(wall.center)
    .addScaledVector(wall.normal, PAINTING_WALL_OFFSET);
  group.position.y = PAINTING_CENTER_HEIGHT;
  group.rotation.y = Math.atan2(wall.normal.x, wall.normal.z);

  group.userData = {
    paintingId: id,
    cellIndex, // cellule (pièce) du tableau : limite la navigation précédent / suivant
    src: data.src,
    title: data.title,
    desc: data.desc,
    width, // cadre compris
    height,
    canvasWidth,
    canvasHeight,
    viewpoint: computeViewpoint({
      center: group.position,
      normal: wall.normal,
      right: wall.right,
      width,
      height,
    }),
  };
  return group;
}
