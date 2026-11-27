// Construit le DOM : lien d'évitement, bandeau (logo SVG + titre) et grille des tableaux issus de la config.
import { artworks } from '../data/artworks.js';

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LOGO = `
  <svg class="logo" viewBox="0 0 120 48" role="img" aria-label="Logo">
    <rect x="1.5" y="1.5" width="117" height="45" rx="3" fill="none" stroke="#fff" stroke-width="3" />
    <text x="60" y="31" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#fff">LOGO</text>
  </svg>`;

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  </svg>`;

// Une carte = l'unique élément du tableau, en grille comme en plein écran.
function cardHtml([key, art]) {
  return `
    <li class="slot">
      <div class="card">
        <img class="card-img" src="${escapeHtml(art.src)}" alt="" draggable="false" />
        <button type="button" class="card-open" aria-labelledby="title-${key}"></button>
        <div class="capsule">
          <h2 class="capsule-title" id="title-${key}">${escapeHtml(art.title)}</h2>
          <button type="button" class="capsule-close" aria-label="Fermer">${CLOSE_ICON}</button>
          <p class="capsule-desc" id="desc-${key}">${escapeHtml(art.desc)}</p>
        </div>
      </div>
    </li>`;
}

export function renderPage(root) {
  const entries = Object.entries(artworks);
  root.innerHTML = `
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
