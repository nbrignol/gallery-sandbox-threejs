// Construit le DOM : lien d'évitement, bandeau (logo SVG + titre) et grille des tableaux issus de la config.
import { artworks } from '../data/artworks.js';

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LOGO = `
  <svg class="logo" viewBox="0 0 120 48" role="img" aria-label="Logo">
    <rect x="1.5" y="1.5" width="117" height="45" rx="3" fill="none" stroke="#fff" stroke-width="3" />
    <text x="60" y="31" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#fff">LOGO</text>
  </svg>`;

const icon = (path) => `
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="${path}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
export const ICON_CLOSE = icon('M5 5l14 14M19 5L5 19');
export const ICON_PREV = icon('M15 5l-7 7 7 7');
export const ICON_NEXT = icon('M9 5l7 7-7 7');
export const ICON_DOWN = icon('M5 9l7 7 7-7');

// Contenu de la capsule (titre + navigation + fermer + description + flèche vers le détail).
// L'ordre du DOM est l'ordre de tabulation : précédent, suivant, fermer, détail.
export function capsuleInner(key, art) {
  return `
    <button type="button" class="capsule-btn capsule-prev" aria-label="Tableau précédent">${ICON_PREV}</button>
    <h2 class="capsule-title" id="title-${key}">${escapeHtml(art.title)}</h2>
    <button type="button" class="capsule-btn capsule-next" aria-label="Tableau suivant">${ICON_NEXT}</button>
    <button type="button" class="capsule-btn capsule-close" aria-label="Fermer">${ICON_CLOSE}</button>
    <p class="capsule-desc" id="desc-${key}">${escapeHtml(art.desc)}</p>
    <button type="button" class="capsule-btn capsule-down" aria-label="Afficher le détail de l’œuvre">${ICON_DOWN}</button>`;
}

// Une carte = l'unique élément du tableau, en grille comme en plein écran.
function cardHtml([key, art]) {
  return `
    <li class="slot">
      <div class="card">
        <div class="card-hero">
          <img class="card-img" src="${escapeHtml(art.src)}" alt="" draggable="false" />
          <button type="button" class="card-open" aria-labelledby="title-${key}"></button>
          <div class="capsule">${capsuleInner(key, art)}</div>
        </div>
        <div class="card-article"></div>
      </div>
    </li>`;
}

export function renderPage(root) {
  const entries = Object.entries(artworks);
  root.innerHTML = `
    <p class="sr-only" id="status" role="status"></p>
    <a class="skip" href="#main">Aller à la galerie</a>
    <header class="banner">
      ${LOGO}
      <h1>Galerie de tableaux</h1>
    </header>
    <main id="main" tabindex="-1">
      <ul class="grid" role="list" aria-label="Galerie de tableaux, ${entries.length} œuvres">
        ${entries.map(cardHtml).join('')}
      </ul>
    </main>`;
}
