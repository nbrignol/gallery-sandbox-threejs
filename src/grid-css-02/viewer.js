// Plein écran, option B : la case reste dans la grille (masquée = le « trou ») et un dialogue séparé est créé à
// l'ouverture, animé depuis la case vers l'écran. À la fermeture il retourne vers la case puis disparaît.
import { artworks } from '../data/artworks.js';
import { escapeHtml, capsuleInner } from './render.js';
import { loadArticle, smoothScrollTo } from './detail.js';

const DURATION = 550;
const FADE = 180;
const SCROLL_THRESHOLD = 80; // px de molette / trackpad cumulés pour ouvrir le détail ou revenir au tableau
const SWIPE_THRESHOLD = 60; // px de glissement du doigt pour ouvrir le détail ou revenir au tableau
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

function animate(el, from, to) {
  if (reduceMotion.matches) return { finished: Promise.resolve(), cancel() {} };
  return el.animate([from, to], { duration: DURATION, easing: EASING, fill: 'forwards' });
}

function viewerHtml(art) {
  // Héros (image + capsule) puis zone d'article (vide tant qu'on n'a pas ouvert le détail).
  return `
    <div class="viewer-hero">
      <img class="viewer-img" src="${escapeHtml(art.src)}" alt="" draggable="false" />
      <div class="capsule">${capsuleInner(art)}</div>
    </div>
    <div class="viewer-article"></div>`;
}

export function initViewer(root) {
  const main = root.querySelector('main');
  const banner = root.querySelector('.banner');
  const skip = root.querySelector('.skip');
  const status = root.querySelector('#status');
  const tiles = [...root.querySelectorAll('.tile')];
  let current = null; // { tile, viewer }
  let busy = false;
  let autoScrolling = false; // défilement animé vers l'article en cours

  // Tout ce qui est derrière le dialogue est inerte (clavier, lecteurs d'écran, clics).
  const setInert = (on) => {
    for (const el of [skip, banner, main]) el.inert = on;
  };

  // Le bouton Fermer est un popover manuel (couche supérieure du navigateur) : on l'affiche / le masque avec le dialogue.
  const setCloseVisible = (viewer, on) => {
    const button = viewer.querySelector('.capsule-close');
    if (on && !button.matches(':popover-open')) button.showPopover();
    else if (!on && button.matches(':popover-open')) button.hidePopover();
  };

  async function open(tile) {
    if (current) return;
    busy = true;
    const art = artworks[tile.dataset.key];
    const tileCapsule = tile.querySelector('.capsule');
    const from = geometry(tile.getBoundingClientRect(), '8px');
    const capsuleFrom = size(tileCapsule);

    const viewer = document.createElement('div');
    viewer.className = 'viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-labelledby', 'viewer-title');
    viewer.setAttribute('aria-describedby', 'viewer-desc');
    viewer.innerHTML = viewerHtml(art);
    document.body.append(viewer);
    current = { tile, viewer };

    const capsule = viewer.querySelector('.capsule');
    const capsuleTo = size(capsule);
    tile.classList.add('is-hole');
    viewer.classList.add('is-moving'); // le bouton Fermer (fixe) n'apparaît qu'une fois le dialogue en place
    setInert(true);
    setCloseVisible(viewer, true);
    viewer.querySelector('.capsule-close').focus({ preventScroll: true });

    const animations = [animate(viewer, from, fullscreen()), animate(capsule, capsuleFrom, capsuleTo)];
    await Promise.all(animations.map((a) => a.finished)).catch(() => {});
    animations.forEach((a) => a.cancel());
    busy = false;
    viewer.classList.remove('is-moving');
    if (current?.viewer === viewer && !viewer.classList.contains('is-detail')) viewer.classList.add('is-settled'); // flottement
  }

  // Remet le dialogue dans son état « sans détail » (aussi utilisé à la fermeture).
  function resetDetail(viewer) {
    viewer.classList.remove('is-detail');
    viewer.removeAttribute('aria-busy');
    delete viewer.dataset.loading;
    viewer.querySelector('.viewer-article').innerHTML = '';
    viewer.querySelector('.capsule-error')?.remove();
    viewer.querySelector('.capsule-down').disabled = false;
  }

  // Retour du détail au tableau plein écran (sans fermer : on reste sur le même tableau).
  function exitDetail() {
    if (!current || busy || !current.viewer.classList.contains('is-detail')) return;
    const { viewer } = current;
    resetDetail(viewer);
    viewer.classList.add('is-settled'); // le flottement reprend
    viewer.querySelector('.capsule-down').focus({ preventScroll: true });
    status.textContent = 'Retour au tableau';
  }

  // Flèche vers le bas : charge l'article (XHR), l'injecte à la suite de la capsule, puis fait défiler jusqu'à lui.
  async function openDetail() {
    if (!current) return;
    const { viewer } = current;
    if (busy || viewer.dataset.loading || viewer.classList.contains('is-detail')) return;
    const down = viewer.querySelector('.capsule-down');
    const article = viewer.querySelector('.viewer-article');
    viewer.dataset.loading = '1';
    viewer.setAttribute('aria-busy', 'true');
    down.disabled = true;
    viewer.querySelector('.capsule-error')?.remove();
    status.textContent = 'Chargement de l’article…';

    let html;
    try {
      html = await loadArticle();
    } catch {
      if (current?.viewer !== viewer) return; // fermé entre-temps
      delete viewer.dataset.loading;
      viewer.removeAttribute('aria-busy');
      down.disabled = false;
      const error = document.createElement('p');
      error.className = 'capsule-error';
      error.setAttribute('role', 'alert');
      error.textContent = 'Impossible de charger l’article.';
      viewer.querySelector('.capsule').append(error);
      return;
    }
    if (current?.viewer !== viewer) return;

    article.innerHTML = html;
    delete viewer.dataset.loading;
    viewer.removeAttribute('aria-busy');
    viewer.classList.remove('is-settled'); // un conteneur qui défile ne doit pas flotter
    viewer.classList.add('is-detail');
    await new Promise(requestAnimationFrame); // laisse la mise en page se faire avant de mesurer
    // On s'arrête quand 40 % du tableau reste visible en haut (l'article commence juste dessous).
    const target = Math.round(viewer.querySelector('.viewer-hero').offsetHeight * (1 - HERO_VISIBLE));
    article.querySelector('h2')?.focus({ preventScroll: true });
    status.textContent = 'Article chargé';
    if (reduceMotion.matches) viewer.scrollTop = target;
    else {
      autoScrolling = true;
      await smoothScrollTo(viewer, target);
      autoScrolling = false;
    }
  }

  // Précédent / suivant : on garde le même dialogue, on change son contenu (fondu de l'image) et le trou se déplace.
  async function navigate(delta) {
    if (!current || busy || current.viewer.classList.contains('is-detail')) return;
    busy = true;
    const { viewer, tile: previous } = current;
    const next = tiles[(tiles.indexOf(previous) + delta + tiles.length) % tiles.length];
    const art = artworks[next.dataset.key];
    const img = viewer.querySelector('.viewer-img');
    const fade = (from, to) =>
      reduceMotion.matches
        ? { finished: Promise.resolve() }
        : img.animate({ opacity: [from, to] }, { duration: FADE, fill: 'forwards' });

    await fade(1, 0).finished.catch(() => {});
    img.src = art.src;
    viewer.querySelector('.capsule-title').textContent = art.title;
    viewer.querySelector('.capsule-desc').textContent = art.desc;
    previous.classList.remove('is-hole');
    next.classList.add('is-hole');
    current.tile = next;
    status.textContent = `${art.title}, ${tiles.indexOf(next) + 1} sur ${tiles.length}`;
    await img.decode().catch(() => {});
    await fade(0, 1).finished.catch(() => {});
    img.getAnimations().forEach((a) => a.cancel());
    busy = false;
  }

  async function close() {
    if (!current || busy) return;
    busy = true;
    const { tile, viewer } = current;
    const capsule = viewer.querySelector('.capsule');

    // Depuis le détail : remonter en douceur jusqu'au tableau, refermer le détail, puis revenir à la grille.
    if (viewer.classList.contains('is-detail')) {
      if (reduceMotion.matches) viewer.scrollTop = 0;
      else await smoothScrollTo(viewer, 0, 600);
      viewer.scrollTop = 0; // si l'animation a été interrompue
    }
    resetDetail(viewer);
    setCloseVisible(viewer, false);
    const capsuleFrom = size(capsule);
    const capsuleTo = size(tile.querySelector('.capsule'));
    viewer.classList.remove('is-settled');
    viewer.classList.add('is-moving');

    const animations = [
      animate(viewer, fullscreen(), geometry(tile.getBoundingClientRect(), '8px')),
      animate(capsule, capsuleFrom, capsuleTo),
    ];
    await Promise.all(animations.map((a) => a.finished)).catch(() => {});
    viewer.remove();
    tile.classList.remove('is-hole');
    setInert(false);
    tile.focus({ preventScroll: true });
    current = null;
    busy = false;
  }

  root.addEventListener('click', (event) => {
    const tile = event.target.closest('.tile');
    if (tile) open(tile);
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('.capsule-close')) close();
    else if (event.target.closest('.capsule-prev')) navigate(-1);
    else if (event.target.closest('.capsule-next')) navigate(1);
    else if (event.target.closest('.capsule-down')) openDetail();
  });

  // Défilement sur le dialogue ouvert (molette, trackpad, geste tactile) :
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
  document.addEventListener(
    'wheel',
    (event) => {
      if (!current || busy) return;
      const { viewer } = current;
      if (!gestureActive) {
        gestureActive = true;
        gestureStartedAtTop = viewer.scrollTop <= 1;
        wheelSum = 0;
      }
      clearTimeout(gestureTimer);
      gestureTimer = setTimeout(() => (gestureActive = false), 200);

      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1); // lignes (Firefox) → pixels
      if (!viewer.classList.contains('is-detail')) {
        wheelSum = delta > 0 ? wheelSum + delta : 0;
        if (wheelSum >= SCROLL_THRESHOLD) {
          wheelSum = 0;
          openDetail();
        }
        // } else if (gestureStartedAtTop && !autoScrolling && viewer.scrollTop <= 1) { // version précédente
      } else if (!autoScrolling && viewer.scrollTop <= 1) {
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

  // Tactile : on décide à la fin du geste.
  let touchStartY = null;
  let touchStartedAtTop = false;
  document.addEventListener(
    'touchstart',
    (event) => {
      touchStartY = event.touches.length === 1 ? event.touches[0].clientY : null;
      touchStartedAtTop = !!current && current.viewer.scrollTop <= 1;
    },
    { passive: true },
  );
  document.addEventListener('touchend', (event) => {
    if (touchStartY === null || !current || busy) return;
    const { viewer } = current;
    const swipe = touchStartY - event.changedTouches[0].clientY; // > 0 : doigt vers le haut
    touchStartY = null;
    if (!viewer.classList.contains('is-detail')) {
      if (swipe >= SWIPE_THRESHOLD) openDetail();
      // } else if (touchStartedAtTop && !autoScrolling && viewer.scrollTop <= 1 && swipe <= -SWIPE_THRESHOLD) { // version précédente
    } else if (!autoScrolling && viewer.scrollTop <= 1 && swipe <= -SWIPE_THRESHOLD) {
      exitDetail();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      navigate(-1);
    } else if (event.key === 'ArrowRight') {
      navigate(1);
    } else if (event.key === 'Tab') {
      // Le focus boucle sur les éléments visibles du dialogue (boutons de la capsule, titre et liens de l'article).
      const buttons = [
        ...current.viewer.querySelectorAll('.capsule-btn, .viewer-article a[href], .viewer-article [tabindex]'),
      ].filter((el) => el.getClientRects().length);
      const index = buttons.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus();
    }
  });
}
