import { INTRO_DELAY, INTRO_DURATION, INTRO_ENABLED, INTRO_SWEEP_DEG } from '../config.js';

// Micro-animation d'introduction : la caméra tourne un peu vers la droite puis vers la
// gauche, et revient à son angle de départ, pour suggérer qu'il y a des choses à voir sur
// les côtés. Elle s'interrompt dès que l'utilisateur touche la scène (appui sur le canvas)
// ou clique sur un tableau. Retourne { start(), cancel(), update(dt) }.
export function createIntro({ look, canvas }) {
  let anim = null;

  function cancel() {
    anim = null;
  }
  canvas.addEventListener('pointerdown', cancel);

  return {
    start() {
      if (!INTRO_ENABLED) return;
      // t négatif = délai avant le début
      anim = { base: look.getYaw(), t: -INTRO_DELAY };
    },
    cancel,
    update(dt) {
      if (!anim) return;
      anim.t += dt;
      if (anim.t < 0) return;
      const k = Math.min(1, anim.t / INTRO_DURATION);
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * k); // départ et arrivée en douceur
      const sweep = (INTRO_SWEEP_DEG * Math.PI) / 180;
      // yaw décroissant = la caméra tourne vers la droite : droite d'abord, puis gauche
      look.setYaw(anim.base - sweep * Math.sin(2 * Math.PI * eased));
      if (k >= 1) {
        look.setYaw(anim.base);
        anim = null;
      }
    },
  };
}
