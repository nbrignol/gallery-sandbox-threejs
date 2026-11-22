import { AUTO_QUALITY_DURATION, AUTO_QUALITY_FPS } from '../config.js';
import { showToast } from './toast.js';

// Bascule automatique Normal → Minimal : on mesure le pic de FPS juste après le chargement (la 1re
// fenêtre est ignorée : fondu du preloader, décodage). Si le pic reste sous le seuil, on passe en
// Minimal. Un clic manuel sur la case annule la bascule automatique.
// Retourne { onSample(fps) }.
export function createAutoQuality({ quality, checkbox }) {
  let samples = 0;
  let peak = 0;
  let finished = false;
  checkbox.addEventListener('change', () => (finished = true));

  return {
    onSample(fps) {
      if (finished) return;
      samples++;
      if (samples > 1) peak = Math.max(peak, fps);
      if (samples * 0.5 < AUTO_QUALITY_DURATION) return;
      finished = true;
      console.info(`[qualité auto] pic ${Math.round(peak)} FPS (seuil ${AUTO_QUALITY_FPS})`);
      if (peak >= AUTO_QUALITY_FPS) return;
      checkbox.checked = true;
      quality.setMinimal(true);
      showToast('Affichage allégé activé. Décochez « Minimal » pour revenir à la qualité normale.');
    },
  };
}
