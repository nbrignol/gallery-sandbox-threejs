// Contenu détaillé d'un tableau : récupéré en XMLHttpRequest (pour l'instant toujours le même article).
// Le HTML vient de notre propre site (même origine) : il peut être injecté tel quel.
export const ARTICLE_URL = `${import.meta.env.BASE_URL}article-placeholder.html`;

export function loadArticle(url = ARTICLE_URL) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.responseText) : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Erreur réseau'));
    xhr.send();
  });
}

// Défilement animé fait main (requestAnimationFrame) : ne dépend pas du `behavior: 'smooth'` du navigateur.
// S'interrompt si la personne touche l'écran ou le clavier. La molette / le trackpad sont ignorés pendant
// l'animation : l'inertie d'un geste de défilement qui vient de déclencher le détail ne doit pas la combattre.
// Renvoie une Promise résolue à la fin de l'animation (ou à son interruption).
export function smoothScrollTo(el, top, duration = 900) {
  return new Promise((resolve) => {
    const start = el.scrollTop;
    const distance = top - start;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // easeInOutCubic
    const t0 = performance.now();
    const types = ['touchstart', 'keydown'];
    const swallowWheel = (event) => event.preventDefault();
    let frame;
    const stop = () => {
      cancelAnimationFrame(frame);
      for (const type of types) el.removeEventListener(type, stop);
      el.removeEventListener('wheel', swallowWheel);
      resolve();
    };
    for (const type of types) el.addEventListener(type, stop, { passive: true });
    el.addEventListener('wheel', swallowWheel, { passive: false });
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      el.scrollTop = start + distance * ease(t);
      if (t < 1) frame = requestAnimationFrame(step);
      else stop();
    };
    frame = requestAnimationFrame(step);
  });
}
