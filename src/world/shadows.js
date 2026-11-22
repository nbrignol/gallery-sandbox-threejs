import * as THREE from 'three';
import {
  SHADOW_BIAS,
  SHADOW_MAP_SIZE,
  SHADOW_NORMAL_BIAS,
  SHADOW_RADIUS,
} from '../config.js';

// Ombres portées des spots de tableaux (les « cônes »), calculées UNE SEULE FOIS.
// - Projettent : le cadre de chaque tableau (pas l'applique : c'est la source).
// - Reçoivent : la salle (sol, murs, plafond, plinthes, séparateurs) et les toiles.
// - Les objets déco (banc, plantes) projettent et reçoivent.
// Les lampes de cellule projettent aussi des ombres (objets, cadres), calculées dans
// la même passe unique (voir lights.js).
// La scène étant statique, la carte d'ombre n'est pas recalculée à chaque image :
// à relancer (`renderer.shadowMap.needsUpdate = true`) si quelque chose change
// de place ou de forme.

// Configure l'ombre d'un spot
function setupSpotShadow(spot) {
  spot.castShadow = true;
  spot.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  spot.shadow.camera.near = 0.3;
  spot.shadow.camera.far = 8; // sol et mur les plus lointains du cône : < 5 m
  spot.shadow.bias = SHADOW_BIAS;
  spot.shadow.normalBias = SHADOW_NORMAL_BIAS;
  spot.shadow.radius = SHADOW_RADIUS;
}

// Un tableau : le cadre projette, la toile reçoit
function setupPainting(painting) {
  painting.getObjectByName('frame').castShadow = true;
  painting.getObjectByName('canvas').receiveShadow = true;
  setupSpotShadow(painting.getObjectByName('spot'));
}

// Active les ombres : `roomGroup` = groupe de la salle, `paintings` = groupes de tableaux,
// `propsGroup` = objets déco (banc, plantes)
export function enableShadows(renderer, roomGroup, paintings, propsGroup) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // calcul unique (voir needsUpdate ci-dessous)

  roomGroup.traverse((object) => {
    if (object.isMesh) object.receiveShadow = true;
  });
  paintings.forEach(setupPainting);
  // Objets déco : projettent et reçoivent
  propsGroup.traverse((object) => {
    if (object.isMesh && !object.userData.hitBox) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  // Le calcul des cartes d'ombre est lancé par roomLights.bake() (une passe par pièce)
}
