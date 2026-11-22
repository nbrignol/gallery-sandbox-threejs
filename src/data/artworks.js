// Catalogue des œuvres (domaine public, Wikimedia Commons, rangées dans public/paintings/).
// Les configurations (data/galleries.js) les placent avec `art(clé, déco)`.
//
// Champs : src, title, desc.
// scale = hauteur du tableau en mètres (la hauteur de base PAINTING_HEIGHT vaut 1 m ; le cadre ne
// change pas ; largeur selon le ratio de l'image). Ici : tailles réelles approximatives des
// œuvres, avec un minimum de 1 (la vraie valeur est gardée en commentaire).
// Optionnel : frame { border, depth, color } pour surcharger le cadre par défaut (config.js).
// Champs réservés (pas encore implémentés) : side, t, h, pour un futur placement fin.
//
// Déco (voir world/props.js), à passer en 2e argument de `art` — tous optionnels, faux par défaut :
//   bench       : un banc au centre de la pièce, face à ce tableau ;
//   right_plant : une plante dans le coin à droite du mur de ce tableau ;
//   left_plant  : une plante dans le coin à gauche (droite / gauche vus face au tableau).
//   Pas de gestion de collision : plusieurs objets au même endroit se superposent.

const image = (name) => `${import.meta.env.BASE_URL}paintings/${name}.jpg`;

export const artworks = {
  joconde: {
    src: image('mona-lisa'),
    scale: 1, // minimum 1 ; vraie valeur : 0.77 — taille réelle : 77 × 53 cm (hauteur × largeur)
    title: 'La Joconde',
    desc: 'Léonard de Vinci, v. 1503-1519. Portrait de Lisa Gherardini, huile sur bois de peuplier, musée du Louvre.',
  },
  venus: {
    src: image('naissance-de-venus'),
    scale: 1.725, // vraie valeur ; taille réelle : 172,5 × 278,5 cm (hauteur × largeur)
    title: 'La Naissance de Vénus',
    desc: 'Sandro Botticelli, v. 1485. Vénus émerge de la mer sur une coquille, tempera sur toile, galerie des Offices.',
  },
  nuit: {
    src: image('nuit-etoilee'),
    scale: 1, // minimum 1 ; vraie valeur : 0.737 — taille réelle : 73,7 × 92,1 cm (hauteur × largeur)
    title: 'La Nuit étoilée',
    desc: 'Vincent van Gogh, 1889. Ciel tourbillonnant au-dessus de Saint-Rémy-de-Provence, huile sur toile, MoMA.',
  },
  perle: {
    src: image('jeune-fille-perle'),
    scale: 1, // minimum 1 ; vraie valeur : 0.445 — taille réelle : 44,5 × 39 cm (hauteur × largeur)
    title: 'La Jeune Fille à la perle',
    desc: 'Johannes Vermeer, v. 1665. Tronie à la perle et au turban bleu, huile sur toile, Mauritshuis.',
  },
  vague: {
    src: image('grande-vague'),
    scale: 1, // minimum 1 ; vraie valeur : 0.257 — taille réelle : ≈ 25,7 × 37,9 cm (hauteur × largeur)
    title: 'La Grande Vague de Kanagawa',
    desc: 'Hokusai, v. 1831. Estampe ukiyo-e de la série « Trente-six vues du mont Fuji ».',
  },
  cri: {
    src: image('le-cri'),
    scale: 1, // minimum 1 ; vraie valeur : 0.91 — taille réelle : 91 × 73,5 cm (hauteur × largeur)
    title: 'Le Cri',
    desc: 'Edvard Munch, 1893. Figure angoissée sur un pont au ciel rouge sang, tempera et crayon sur carton, Nasjonalmuseet.',
  },
  baiser: {
    src: image('le-baiser'),
    scale: 1.8, // vraie valeur ; taille réelle : 180 × 180 cm (hauteur × largeur)
    title: 'Le Baiser',
    desc: 'Gustav Klimt, 1907-1908. Couple enlacé sur fond doré, huile et feuilles d’or sur toile, Belvédère de Vienne.',
  },
};

// Une œuvre du catalogue, avec sa déco (et au besoin d'autres champs surchargés).
// `art(null, déco)` : un mur sans tableau, avec seulement de la déco.
export function art(key, extra = {}) {
  if (key == null) return { ...extra };
  const artwork = artworks[key];
  if (!artwork) throw new Error(`artworks : œuvre inconnue « ${key} ».`);
  return { ...artwork, ...extra };
}
