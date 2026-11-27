// Plein écran, option A : la MÊME carte sort de son <li> (position: fixed) avec une animation de la case vers
// l'écran. Le <li> reste en place et vide : c'est le « trou » de la grille.
const DURATION = 550;
const EASING = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const size = (el) => ({ width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px` });
const geometry = (rect, radius) => ({
  top: `${rect.top}px`,
  left: `${rect.left}px`,
  width: `${rect.width}px`,
  height: `${rect.height}px`,
  borderRadius: radius,
});
const fullscreen = () => geometry({ top: 0, left: 0, width: innerWidth, height: innerHeight }, '0px');

// Anime un élément ; fill: 'forwards' garde l'état final jusqu'à ce qu'on rende la main au CSS.
function animate(el, from, to) {
  if (reduceMotion.matches) return { finished: Promise.resolve(), cancel() {} };
  return el.animate([from, to], { duration: DURATION, easing: EASING, fill: 'forwards' });
}

export function initViewer(root) {
  const skip = root.querySelector('.skip');
  const banner = root.querySelector('.banner');
  const slots = [...root.querySelectorAll('.slot')];
  let current = null;
  let busy = false;

  // Tout ce qui est derrière la carte ouverte est inerte (clavier, lecteurs d'écran, clics).
  const setInert = (on, keep) => {
    for (const el of [skip, banner, ...slots]) if (el !== keep) el.inert = on;
  };

  async function open(card) {
    if (current) return;
    current = card;
    busy = true;
    const slot = card.parentElement;
    const capsule = card.querySelector('.capsule');

    const cardFrom = geometry(card.getBoundingClientRect(), '8px');
    const capsuleFrom = size(capsule);
    card.classList.add('is-floating', 'is-expanded');
    const capsuleTo = size(capsule);

    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', card.querySelector('.capsule-title').id);
    card.setAttribute('aria-describedby', card.querySelector('.capsule-desc').id);
    setInert(true, slot);
    card.querySelector('.capsule-close').focus({ preventScroll: true });

    const animations = [animate(card, cardFrom, fullscreen()), animate(capsule, capsuleFrom, capsuleTo)];
    await Promise.all(animations.map((a) => a.finished)).catch(() => {});
    animations.forEach((a) => a.cancel());
    busy = false;
    if (current === card) card.classList.add('is-settled'); // flottement
  }

  async function close() {
    if (!current || busy) return;
    busy = true;
    const card = current;
    const slot = card.parentElement;
    const capsule = card.querySelector('.capsule');

    const capsuleFrom = size(capsule);
    card.classList.remove('is-expanded', 'is-settled');
    const capsuleTo = size(capsule);
    card.removeAttribute('role');
    card.removeAttribute('aria-modal');
    card.removeAttribute('aria-labelledby');
    card.removeAttribute('aria-describedby');
    card.querySelector('.card-open').focus({ preventScroll: true });

    const animations = [
      animate(card, fullscreen(), geometry(slot.getBoundingClientRect(), '8px')),
      animate(capsule, capsuleFrom, capsuleTo),
    ];
    await Promise.all(animations.map((a) => a.finished)).catch(() => {});
    card.classList.remove('is-floating');
    animations.forEach((a) => a.cancel());
    setInert(false);
    current = null;
    busy = false;
  }

  root.addEventListener('click', (event) => {
    const opener = event.target.closest('.card-open');
    if (opener) open(opener.closest('.card'));
    else if (event.target.closest('.capsule-close')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (!current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      // Seul le bouton Fermer est atteignable : le focus reste dessus.
      event.preventDefault();
      current.querySelector('.capsule-close').focus();
    }
  });
}
