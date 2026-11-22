import * as THREE from 'three';
import { AO_COLOR } from '../config.js';

// Couleur (linéaire) vers laquelle tend la lumière d'ambiance en zone occluse
const tint = new THREE.Color(AO_COLOR);
const AO_TINT_GLSL = `vec3( ${tint.r.toFixed(4)}, ${tint.g.toFixed(4)}, ${tint.b.toFixed(4)} )`;

// L'aoMap de three.js multiplie la lumière d'ambiance par un simple niveau de
// gris : l'ombre est toujours neutre. On remplace cette multiplication par une
// interpolation vers AO_COLOR : mix(AO_COLOR, blanc, ao) → 0 d'occlusion = pas de
// changement, occlusion maximale = lumière d'ambiance teintée AO_COLOR (ombre chaude).
function patchShader(shader) {
  const chunk = THREE.ShaderChunk.aomap_fragment.replace(
    'reflectedLight.indirectDiffuse *= ambientOcclusion;',
    `reflectedLight.indirectDiffuse *= mix( ${AO_TINT_GLSL}, vec3( 1.0 ), ambientOcclusion );`,
  );
  shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', chunk);
}

// Applique une texture d'AO (canal UV 1) à un matériau, avec l'ombre teintée.
// À appeler pour chaque matériau (un `clone()` ne copie pas le patch du shader).
export function setBakedAO(material, texture) {
  material.aoMap = texture;
  material.onBeforeCompile = patchShader;
  material.customProgramCacheKey = () => 'baked-ao-tinted'; // même programme pour tous
  material.needsUpdate = true;
}
