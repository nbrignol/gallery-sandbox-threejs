import { CARD_JITTER, CARD_SPACING } from './config.js';

// Disposition de `count` cartes : une rangée centrée en X, avec les décalages (profondeur, rotation) de
// CARD_JITTER appliqués en boucle. Renvoie [{ offsetX, offsetZ, rotationDeg }] dans l'ordre des cartes.
export function layoutCards(count) {
  return Array.from({ length: count }, (_, i) => ({
    offsetX: (i - (count - 1) / 2) * CARD_SPACING,
    ...CARD_JITTER[i % CARD_JITTER.length],
  }));
}
