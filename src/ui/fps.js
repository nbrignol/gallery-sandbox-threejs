// Compteur d'images par seconde : moyenne sur une demi-seconde, affichée dans `element`
export function createFpsCounter(element) {
  let frames = 0;
  let start = null;
  return {
    // À appeler à chaque image avec l'horodatage (ms) de la boucle de rendu
    tick(time) {
      start ??= time;
      frames++;
      const elapsed = time - start;
      if (elapsed < 500) return;
      element.textContent = `${Math.round((frames * 1000) / elapsed)} FPS`;
      frames = 0;
      start = time;
    },
  };
}
