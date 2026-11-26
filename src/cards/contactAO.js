import * as THREE from 'three';
import { AO_CURVE, AO_OFFSET_Z, AO_SQUASH_Z, AO_FADE_HEIGHT, AO_MARGIN, AO_SPREAD, AO_STRENGTH, CARD_SIZE } from './config.js';

const MARGIN_Z = AO_MARGIN * AO_SQUASH_Z; // marge en profondeur (écrasée)

// Texture du halo, générée une seule fois : carré plein (le bord de la carte) entouré d'un dégradé
// d'opacité vers 0 sur AO_MARGIN. Noir, seul l'alpha varie.
function createHaloTexture() {
  const size = 128;
  const halfX = CARD_SIZE / 2 + AO_MARGIN; // demi-largeur du plan
  const halfZ = CARD_SIZE / 2 + MARGIN_Z; // demi-profondeur du plan
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size * 2 - 1) * halfX;
      const y = ((j + 0.5) / size * 2 - 1) * halfZ;
      // distance au bord de la carte, normalisée par la marge de chaque axe (Chebyshev)
      const t = THREE.MathUtils.clamp(Math.max((Math.abs(x) - CARD_SIZE / 2) / AO_MARGIN, (Math.abs(y) - CARD_SIZE / 2) / MARGIN_Z), 0, 1);
      const alpha = (1 - t) ** AO_CURVE;
      data.set([0, 0, 0, Math.round(alpha * 255)], (j * size + i) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Un plan d'AO au sol sous chaque carte, qui suit sa position et son orientation (sans les rotations
// de retournement). Opacité et largeur dépendent de la hauteur de la carte au-dessus de sa pose de repos.
export function createContactAO({ scene, cards }) {
  const texture = createHaloTexture();
  const geometry = new THREE.PlaneGeometry(CARD_SIZE + AO_MARGIN * 2, CARD_SIZE + MARGIN_Z * 2).rotateX(-Math.PI / 2);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  const items = cards.map((card) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    mesh.renderOrder = 1;
    scene.add(mesh);
    return { card, mesh };
  });

  return {
    update() {
      for (const { card, mesh } of items) {
        const lift = Math.max(0, card.position.y - card.userData.rest.position.y);
        const k = 1 - lift / AO_FADE_HEIGHT;
        mesh.visible = k > 0.01;
        if (!mesh.visible) continue;
        // Hauteur = niveau d'empilement de la carte (pas sa montée) + 1 mm : l'AO se pose sur le sol et sur
        // les cartes plus basses, mais reste masqué par la carte elle-même et par celles qui la recouvrent
        mesh.position.set(card.position.x, card.userData.rest.position.y + 0.001, card.position.z + AO_OFFSET_Z);
        mesh.rotation.y = euler.setFromQuaternion(card.quaternion, 'YXZ').y;
        mesh.scale.setScalar((1 + lift * AO_SPREAD) * card.scale.x);
        mesh.material.opacity = AO_STRENGTH * k * k;
      }
    },
  };
}
