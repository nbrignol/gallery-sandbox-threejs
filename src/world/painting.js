import * as THREE from 'three';
import {
  CEILING_HEIGHT,
  PAINTING_CENTER_HEIGHT,
  PAINTING_HEIGHT,
  PAINTING_MAX_WALL_RATIO,
  PAINTING_SPOT_DISTANCE,
  PAINTING_SPOT_INTENSITY,
  PAINTING_WALL_OFFSET,
} from '../config.js';
import { computeViewpoint } from './viewpoint.js';

const loader = new THREE.TextureLoader();

// Charge l'image en texture couleur
async function loadTexture(src) {
  const texture = await loader.loadAsync(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Taille de la toile : hauteur fixe, largeur selon le ratio, plafonnée à
// une part de la largeur du mur (la hauteur est alors réduite).
function fitSize(aspect, wallWidth) {
  let height = PAINTING_HEIGHT;
  let width = height * aspect;
  const maxWidth = wallWidth * PAINTING_MAX_WALL_RATIO;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }
  return { width, height };
}

// Toile (plan texturé)
function createCanvas(texture, width, height) {
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  canvas.name = 'canvas';
  return canvas;
}

// Spot dirigé vers le centre de la toile (repère local du groupe :
// +Z = devant le tableau, origine = centre du tableau)
function createSpot(width, height, centerY) {
  const spot = new THREE.SpotLight(0xfff2e0, PAINTING_SPOT_INTENSITY, 0, 1, 0.6, 2);
  spot.position.set(0, CEILING_HEIGHT - 0.3 - centerY, PAINTING_SPOT_DISTANCE);
  const reach = Math.hypot(spot.position.y, spot.position.z);
  spot.angle = Math.min(Math.atan((Math.max(width, height) * 0.75) / reach), Math.PI / 3);
  return spot;
}

// Crée le groupe d'un tableau posé sur un mur (centré, t = 0.5).
// Les métadonnées sont uniquement sur le groupe (userData).
export async function createPainting(data, wall, id) {
  const texture = await loadTexture(data.src);
  const aspect = texture.image.width / texture.image.height;
  const { width, height } = fitSize(aspect, wall.width);

  const group = new THREE.Group();
  group.name = `painting-${id}`;
  group.add(createCanvas(texture, width, height));

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
    src: data.src,
    title: data.title,
    desc: data.desc,
    width,
    height,
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
