// Plein écran, option B : la case reste dans la grille (masquée = le « trou ») et un dialogue séparé est créé à
// l'ouverture, animé depuis la case vers l'écran. À la fermeture il retourne vers la case puis disparaît.
import { artworks } from '../data/artworks.js';
import { escapeHtml, capsuleInner } from './render.js';

const DURATION = 550;
const FADE = 180;
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
  return `
    <img class="viewer-img" src="${escapeHtml(art.src)}" alt="" draggable="false" />
    <div class="capsule">${capsuleInner(art)}</div>`;
}

export function initViewer(root) {
  const main = root.querySelector('main');
  const banner = root.querySelector('.banner');
  const skip = root.querySelector('.skip');
  const status = root.querySelector('#status');
  const tiles = [...root.querySelectorAll('.tile')];
  let current = null; // { tile, viewer }
  let busy = false;

  // Tout ce qui est derrière le dialogue est inerte (clavier, lecteurs d'écran, clics).
  const setInert = (on) => {
    for (const el of [skip, banner, main]) el.inert = on;
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
    setInert(true);
    viewer.querySelector('.capsule-close').focus({ preventScroll: true });

    const animations = [animate(viewer, from, fullscreen()), animate(capsule, capsuleFrom, capsuleTo)];
    await Promise.all(animations.map((a) => a.finished)).catch(() => {});
    animations.forEach((a) => a.cancel());
    busy = false;
    viewer.classList.add('is-settled'); // flottement
  }

  // Précédent / suivant : on garde le même dialogue, on change son contenu (fondu de l'image) et le trou se déplace.
  async function navigate(delta) {
    if (!current || busy) return;
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
    const capsuleFrom = size(capsule);
    const capsuleTo = size(tile.querySelector('.capsule'));
    viewer.classList.remove('is-settled');

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
    // .capsule-down : le contenu détaillé sera ajouté plus tard
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
      // Le focus boucle sur les boutons de la capsule ouverte.
      const buttons = [...current.viewer.querySelectorAll('.capsule-btn')];
      const index = buttons.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus();
    }
  });
}
