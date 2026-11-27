// Plein écran, option A : la MÊME carte sort de son <li> (position: fixed) avec une animation de la case vers
// l'écran. Le <li> reste en place et vide : c'est le « trou » de la grille.
// Navigation précédent / suivant : la carte suivante apparaît en fondu par-dessus, puis la précédente retourne
// dans sa case (le trou se déplace).
import { loadArticle, smoothScrollTo } from './detail.js';

const DURATION = 550;
const FADE = 300;
const SCROLL_THRESHOLD = 80; // px de molette / trackpad cumulés vers le bas pour ouvrir le détail
const SWIPE_THRESHOLD = 60; // px de glissement du doigt vers le haut pour ouvrir le détail
const HERO_VISIBLE = 0.4; // part du tableau qui reste visible après le défilement vers l'article
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
function animate(el, keyframes, options) {
  if (reduceMotion.matches) return { finished: Promise.resolve(), cancel() {} };
  return el.animate(keyframes, { duration: DURATION, easing: EASING, fill: 'forwards', ...options });
}

export function initViewer(root) {
  const skip = root.querySelector('.skip');
  const banner = root.querySelector('.banner');
  const status = root.querySelector('#status');
  const cards = [...root.querySelectorAll('.card')];
  let current = null;
  let busy = false;
  let autoScrolling = false; // défilement animé vers l'article en cours

  // Tout ce qui est derrière la carte ouverte est inerte (clavier, lecteurs d'écran, clics).
  const setInert = (on, keep) => {
    for (const el of [skip, banner, ...cards.map((c) => c.parentElement)]) el.inert = on && el !== keep;
  };

  const setDialog = (card, on) => {
    const attrs = {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': card.querySelector('.capsule-title').id,
      'aria-describedby': card.querySelector('.capsule-desc').id,
    };
    for (const [name, value] of Object.entries(attrs)) {
      if (on) card.setAttribute(name, value);
      else card.removeAttribute(name);
    }
  };

  // Le bouton Fermer est un popover manuel (couche supérieure du navigateur) : on l'affiche / le masque avec la carte.
  const setCloseVisible = (card, on) => {
    const button = card.querySelector('.capsule-close');
    if (on && !button.matches(':popover-open')) button.showPopover();
    else if (!on && button.matches(':popover-open')) button.hidePopover();
  };

  async function open(card) {
    if (current) return;
    current = card;
    busy = true;
    const slot = card.parentElement;
    const capsule = card.querySelector('.capsule');

    const cardFrom = geometry(card.getBoundingClientRect(), '8px');
    const capsuleFrom = size(capsule);
    card.classList.add('is-floating', 'is-expanded', 'is-moving');
    const capsuleTo = size(capsule);

    setDialog(card, true);
    setCloseVisible(card, true);
    setInert(true, slot);
    card.querySelector('.capsule-close').focus({ preventScroll: true });

    const animations = [
      animate(card, [cardFrom, fullscreen()]),
      animate(capsule, [capsuleFrom, capsuleTo]),
    ];
    await Promise.all(animations.map((a) => a.finished)).catch(() => {});
    animations.forEach((a) => a.cancel());
    busy = false;
    card.classList.remove('is-moving');
    if (current === card) card.classList.add('is-settled'); // flottement
  }

  // Remet la carte dans son état « sans détail » (aussi utilisé quand on quitte la carte).
  function resetDetail(card) {
    card.classList.remove('is-detail');
    card.removeAttribute('aria-busy');
    delete card.dataset.loading;
    card.querySelector('.card-article').innerHTML = '';
    card.querySelector('.capsule-error')?.remove();
    card.querySelector('.capsule-down').disabled = false;
  }

  // Retour du détail au tableau plein écran (sans fermer : on reste sur le même tableau).
  function exitDetail() {
    const card = current;
    if (!card || busy || !card.classList.contains('is-detail')) return;
    resetDetail(card);
    card.classList.add('is-settled'); // le flottement reprend
    card.querySelector('.capsule-down').focus({ preventScroll: true });
    status.textContent = 'Retour au tableau';
  }

  // Flèche vers le bas : charge l'article (XHR), l'injecte à la suite de la capsule, puis fait défiler jusqu'à lui.
  async function openDetail() {
    const card = current;
    if (!card || busy || card.dataset.loading || card.classList.contains('is-detail')) return;
    const down = card.querySelector('.capsule-down');
    const article = card.querySelector('.card-article');
    card.dataset.loading = '1';
    card.setAttribute('aria-busy', 'true');
    down.disabled = true;
    card.querySelector('.capsule-error')?.remove();
    status.textContent = 'Chargement de l’article…';

    let html;
    try {
      html = await loadArticle();
    } catch {
      if (current !== card) return; // la carte a été fermée entre-temps (resetDetail a déjà tout remis à zéro)
      delete card.dataset.loading;
      card.removeAttribute('aria-busy');
      down.disabled = false;
      const error = document.createElement('p');
      error.className = 'capsule-error';
      error.setAttribute('role', 'alert');
      error.textContent = 'Impossible de charger l’article.';
      card.querySelector('.capsule').append(error);
      return;
    }
    if (current !== card) return;

    article.innerHTML = html;
    delete card.dataset.loading;
    card.removeAttribute('aria-busy');
    card.classList.remove('is-settled'); // un conteneur qui défile ne doit pas flotter
    card.classList.add('is-detail');
    await new Promise(requestAnimationFrame); // laisse la mise en page se faire avant de mesurer
    // On s'arrête quand 40 % du tableau reste visible en haut (l'article commence juste dessous).
    const target = Math.round(card.querySelector('.card-hero').offsetHeight * (1 - HERO_VISIBLE));
    article.querySelector('h2')?.focus({ preventScroll: true });
    status.textContent = 'Article chargé';
    if (reduceMotion.matches) card.scrollTop = target;
    else {
      autoScrolling = true;
      await smoothScrollTo(card, target);
      autoScrolling = false;
    }
  }

  async function navigate(delta, focusSelector) {
    if (!current || busy || current.classList.contains('is-detail')) return;
    busy = true;
    const previous = current;
    const next = cards[(cards.indexOf(previous) + delta + cards.length) % cards.length];

    next.classList.add('is-floating', 'is-expanded', 'is-top');
    setDialog(next, true);
    setCloseVisible(next, true);
    setInert(true, next.parentElement);
    next.querySelector(focusSelector).focus({ preventScroll: true });
    current = next;
    status.textContent = `${next.querySelector('.capsule-title').textContent}, ${cards.indexOf(next) + 1} sur ${cards.length}`;

    const fade = animate(next, [{ opacity: 0 }, { opacity: 1 }], { duration: FADE, easing: 'ease' });
    await fade.finished.catch(() => {});
    fade.cancel();
    previous.classList.remove('is-floating', 'is-expanded', 'is-settled');
    setDialog(previous, false);
    setCloseVisible(previous, false);
    resetDetail(previous);
    next.classList.remove('is-top');
    next.classList.add('is-settled');
    busy = false;
  }

  async function close() {
    if (!current || busy) return;
    busy = true;
    const card = current;
    const slot = card.parentElement;
    const capsule = card.querySelector('.capsule');

    // Depuis le détail : remonter en douceur jusqu'au tableau, refermer le détail, puis revenir à la grille.
    if (card.classList.contains('is-detail')) {
      if (reduceMotion.matches) card.scrollTop = 0;
      else await smoothScrollTo(card, 0, 600);
      card.scrollTop = 0; // si l'animation a été interrompue
    }
    resetDetail(card);
    setCloseVisible(card, false);
    const capsuleFrom = size(capsule);
    card.classList.remove('is-expanded', 'is-settled');
    const capsuleTo = size(capsule);
    setDialog(card, false);
    card.querySelector('.card-open').focus({ preventScroll: true });

    const animations = [
      animate(card, [fullscreen(), geometry(slot.getBoundingClientRect(), '8px')]),
      animate(capsule, [capsuleFrom, capsuleTo]),
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
    if (opener) return open(opener.closest('.card'));
    if (event.target.closest('.capsule-close')) close();
    else if (event.target.closest('.capsule-prev')) navigate(-1, '.capsule-prev');
    else if (event.target.closest('.capsule-next')) navigate(1, '.capsule-next');
    else if (event.target.closest('.capsule-down')) openDetail();
  });

  // Défilement sur la carte ouverte (molette, trackpad, geste tactile) :
  //  - vers le bas depuis le tableau plein écran → ouvre le détail (comme la flèche) ;
  //  - vers le haut alors qu'on est déjà tout en haut du détail → retour au tableau plein écran.
  // Un « geste » = des événements de molette rapprochés (moins de 200 ms entre deux).
  // Version actuelle : le retour est accepté même si l'inertie d'une remontée arrive en haut (pas besoin d'une pause).
  // Version précédente (gardée en commentaire ci-dessous) : le geste devait avoir COMMENCÉ en haut, pour que l'inertie
  // d'une remontée qui vient d'arriver en haut ne referme pas le détail aussitôt.
  let wheelSum = 0;
  let gestureActive = false;
  let gestureStartedAtTop = false;
  let gestureTimer;
  root.addEventListener(
    'wheel',
    (event) => {
      if (!current || busy) return;
      if (!gestureActive) {
        gestureActive = true;
        gestureStartedAtTop = current.scrollTop <= 1;
        wheelSum = 0;
      }
      clearTimeout(gestureTimer);
      gestureTimer = setTimeout(() => (gestureActive = false), 200);

      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1); // lignes (Firefox) → pixels
      const inDetail = current.classList.contains('is-detail');
      if (!inDetail) {
        wheelSum = delta > 0 ? wheelSum + delta : 0;
        if (wheelSum >= SCROLL_THRESHOLD) {
          wheelSum = 0;
          openDetail();
        }
      // } else if (gestureStartedAtTop && !autoScrolling && current.scrollTop <= 1) { // version précédente
      } else if (!autoScrolling && current.scrollTop <= 1) {
        wheelSum = delta < 0 ? wheelSum - delta : 0;
        if (wheelSum >= SCROLL_THRESHOLD) {
          wheelSum = 0;
          exitDetail();
        }
      } else {
        wheelSum = 0;
      }
    },
    { passive: true },
  );

  // Tactile : on décide à la fin du geste (pendant le glissement la carte défile déjà ou pas encore).
  let touchStartY = null;
  let touchStartedAtTop = false;
  root.addEventListener(
    'touchstart',
    (event) => {
      touchStartY = event.touches.length === 1 ? event.touches[0].clientY : null;
      touchStartedAtTop = !!current && current.scrollTop <= 1;
    },
    { passive: true },
  );
  root.addEventListener('touchend', (event) => {
    if (touchStartY === null || !current || busy) return;
    const swipe = touchStartY - event.changedTouches[0].clientY; // > 0 : doigt vers le haut
    touchStartY = null;
    if (!current.classList.contains('is-detail')) {
      if (swipe >= SWIPE_THRESHOLD) openDetail();
    // } else if (touchStartedAtTop && !autoScrolling && current.scrollTop <= 1 && swipe <= -SWIPE_THRESHOLD) { // version précédente
    } else if (!autoScrolling && current.scrollTop <= 1 && swipe <= -SWIPE_THRESHOLD) {
      exitDetail();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      navigate(-1, '.capsule-prev');
    } else if (event.key === 'ArrowRight') {
      navigate(1, '.capsule-next');
    } else if (event.key === 'Tab') {
      // Le focus boucle sur les éléments visibles de la carte ouverte (boutons de la capsule, titre et liens de l'article).
      const buttons = [...current.querySelectorAll('.capsule-btn, .card-article a[href], .card-article [tabindex]')].filter(
        (el) => el.getClientRects().length,
      );
      const index = buttons.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus();
    }
  });
}
