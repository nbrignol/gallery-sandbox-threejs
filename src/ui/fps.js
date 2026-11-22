// Compteur d'images par seconde : moyenne sur une demi-seconde, affichée dans `element`.
// `onSample(fps)` (facultatif) est appelé à chaque fenêtre mesurée.
export function createFpsCounter(element, onSample) {
  let frames = 0;
  let start = null;
  return {
    // À appeler à chaque image avec l'horodatage (ms) de la boucle de rendu
    tick(time) {
      start ??= time;
      frames++;
      const elapsed = time - start;
      if (elapsed < 500) return;
      const fps = (frames * 1000) / elapsed;
      element.textContent = `${Math.round(fps)} FPS`;
      onSample?.(fps);
      frames = 0;
      start = time;
    },
  };
}
