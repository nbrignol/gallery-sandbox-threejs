// Construit le DOM : lien d'évitement, bandeau (logo SVG + titre) et grille des tableaux issus de la config.
// Chaque case est un simple bouton (image + capsule) ; la vue plein écran est créée à part (viewer.js).
import { artworks } from '../data/artworks.js';

export const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LOGO = `
  <svg class="logo" viewBox="0 0 120 48" role="img" aria-label="Logo">
    <rect x="1.5" y="1.5" width="117" height="45" rx="3" fill="none" stroke="#fff" stroke-width="3" />
    <text x="60" y="31" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#fff">LOGO</text>
  </svg>`;

// Le nom accessible du bouton est son contenu texte : le titre de la capsule (l'image est décorative).
function tileHtml([key, art]) {
  return `
    <li class="slot">
      <button type="button" class="tile" data-key="${key}">
        <img class="tile-img" src="${escapeHtml(art.src)}" alt="" draggable="false" />
        <span class="capsule"><span class="capsule-title">${escapeHtml(art.title)}</span></span>
      </button>
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
        ${entries.map(tileHtml).join('')}
      </ul>
    </main>`;
}
