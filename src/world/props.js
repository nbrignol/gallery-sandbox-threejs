import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  BENCH_CONTACT_RADIUS,
  BENCH_MODEL,
  BENCH_SCALE,
  PLANT_CONTACT_RADIUS,
  PLANT_CORNER_INSET,
  PLANT_MODEL,
  PLANT_SCALE,
  CELL_SIZE,
} from '../config.js';
import { assignToWalls } from './gallery.js';

// Objets déco posés selon les champs des tableaux (data/paintings.js) :
//  - bench        : un banc au centre de la pièce, face au tableau ;
//  - right_plant  : une plante dans le coin à droite du mur du tableau ;
//  - left_plant   : une plante dans le coin à gauche (« droite » et « gauche » vus
//                   de l'intérieur, face au tableau).
// Pas de gestion des collisions : si plusieurs objets tombent au même endroit, ils
// se superposent.

// Générateur pseudo-aléatoire à graine (mulberry32) : la rotation « aléatoire »
// des plantes est différente d'une plante à l'autre mais identique à chaque chargement
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Emplacements des objets : [{ type: 'bench' | 'plant', x, z, yaw, radius }]
// (coordonnées monde ; yaw = rotation autour de Y ; radius = ombre de contact).
// Calculé à partir des données seules, avant le chargement des modèles, pour que
// l'AO cuite du sol puisse y inclure les ombres de contact.
export function computePropPlacements(room, paintingsByCell) {
  const placements = [];
  assignToWalls(room, paintingsByCell).forEach(({ data, wall, cellIndex }, id) => {
    const [nx, nz] = [wall.normal.x, wall.normal.z];

    if (data.bench) {
      // Au centre de la pièce, la face avant du banc tournée vers le tableau (−normale)
      const center = room.cells[cellIndex].center;
      placements.push({
        type: 'bench',
        x: center.x,
        z: center.z,
        yaw: Math.atan2(-nx, -nz),
        radius: BENCH_CONTACT_RADIUS,
      });
    }

    // Plantes dans les coins aux extrémités du mur, décalées vers l'intérieur
    const plantAt = (side) => {
      const along = side * (CELL_SIZE / 2 - PLANT_CORNER_INSET);
      const random = seededRandom(id * 2 + (side > 0 ? 1 : 0) + 1);
      placements.push({
        type: 'plant',
        x: wall.center.x + wall.right.x * along + nx * PLANT_CORNER_INSET,
        z: wall.center.z + wall.right.z * along + nz * PLANT_CORNER_INSET,
        yaw: random() * Math.PI * 2,
        radius: PLANT_CONTACT_RADIUS,
      });
    };
    if (data.right_plant) plantAt(1);
    if (data.left_plant) plantAt(-1);
  });
  return placements;
}

// Charge un modèle glTF et le normalise : base posée sur y = 0, centré sur l'origine
async function loadModel(loader, url, scale) {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);
  const holder = new THREE.Group();
  holder.add(model);
  holder.scale.setScalar(scale);
  return holder;
}

// Crée les objets aux emplacements donnés. Retourne le groupe à ajouter à la scène.
export async function createProps(placements) {
  const group = new THREE.Group();
  if (placements.length === 0) return group;

  const loader = new GLTFLoader();
  const needed = new Set(placements.map((p) => p.type));
  const [bench, plant] = await Promise.all([
    needed.has('bench') ? loadModel(loader, BENCH_MODEL, BENCH_SCALE) : null,
    needed.has('plant') ? loadModel(loader, PLANT_MODEL, PLANT_SCALE) : null,
  ]);
  const models = { bench, plant };

  for (const { type, x, z, yaw } of placements) {
    const object = models[type].clone(true); // géométries et matériaux partagés
    object.position.set(x, 0, z);
    object.rotation.y = yaw;
    group.add(object);
  }
  group.name = 'props';
  return group;
}
