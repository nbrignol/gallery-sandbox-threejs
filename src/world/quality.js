import { setReliefEnabled } from './materials.js';

// Qualité de rendu, basculable à chaud :
//  - minimal : ni ombres, ni spots, une seule lampe de cellule, pas de relief (normal maps) ;
//  - SD : résolution interne réduite (le canvas reste étiré plein écran).
// `applyPixelRatio(sd)` est fourni par main.js (il refait aussi le setSize).
export function createQuality({ renderer, scene, camera, roomLights, applyPixelRatio }) {
  // Lumières qui projettent des ombres à l'origine (certaines lampes n'en ont pas : bâtiment trop grand)
  const shadowLights = [];
  scene.traverse((object) => {
    if (object.isLight && object.castShadow) shadowLights.push(object);
  });

  function setMinimal(on) {
    roomLights.setMinimal(on);
    setReliefEnabled(!on);
    for (const light of shadowLights) light.castShadow = !on;
    renderer.shadowMap.enabled = !on;
    if (on) return;
    // Retour en normal : les cartes d'ombre sont recalculées (un rendu par pièce)
    roomLights.bake(renderer, scene, camera);
  }

  return { setMinimal, setSD: applyPixelRatio };
}

// Branche les cases à cocher sur la qualité
export function setupQualityUI(quality) {
  const minimal = document.getElementById('opt-minimal');
  const sd = document.getElementById('opt-sd');
  minimal.addEventListener('change', () => quality.setMinimal(minimal.checked));
  sd.addEventListener('change', () => quality.setSD(sd.checked));
}
