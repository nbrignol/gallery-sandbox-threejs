// Tableaux par cellule, indexés comme `cells` (layout.js).
// Le k-ième tableau d'une cellule est posé sur le k-ième mur de sa liste
// (ordre N, E, S, O parmi les murs existants), au centre.
//
// Champs : src, title, desc.
// Déco (voir world/props.js) — tous optionnels, faux par défaut :
//   bench       : un banc au centre de la pièce, face à ce tableau ;
//   right_plant : une plante dans le coin à droite du mur de ce tableau ;
//   left_plant  : une plante dans le coin à gauche (droite / gauche vus face au tableau).
//   Pas de gestion de collision : plusieurs objets au même endroit se superposent.
// Optionnel : scale = hauteur du tableau en mètres (la hauteur de base PAINTING_HEIGHT vaut 1 m ;
// 1 par défaut ; le cadre ne change pas). Largeur selon le ratio de l'image.
// Ici : tailles réelles approximatives des œuvres, avec un minimum de 1 (la vraie valeur est gardée en commentaire).
//
// frame { border, depth, color } pour surcharger le cadre par défaut (config.js).
// Champs optionnels réservés (pas encore implémentés) : side, t, h
// pour un futur placement fin à la place de l'attribution automatique.
// Images : œuvres du domaine public, issues de Wikimedia Commons (public/paintings/).
export const paintings = [
  // Cellule 0 (angle : 2 murs)
  [
    {
      src: '/paintings/mona-lisa.jpg',
      bench: false,
      right_plant: false,
      left_plant: true,
      scale: 1, // minimum 1 ; vraie valeur : 0.77 — taille réelle : 77 × 53 cm (hauteur × largeur)
      title: 'La Joconde',
      desc: 'Léonard de Vinci, v. 1503-1519. Portrait de Lisa Gherardini, huile sur bois de peuplier, musée du Louvre.',
    },
    {
      src: '/paintings/naissance-de-venus.jpg',
      bench: true,
      right_plant: false,
      left_plant: false,
      scale: 1.725, // vraie valeur ; taille réelle : 172,5 × 278,5 cm (hauteur × largeur)
      title: 'La Naissance de Vénus',
      desc: 'Sandro Botticelli, v. 1485. Vénus émerge de la mer sur une coquille, tempera sur toile, galerie des Offices.',
    },
  ],
  // Cellule 1 (aile : 3 murs)
  [
    {
      src: '/paintings/nuit-etoilee.jpg',
      bench: false,
      right_plant: false,
      left_plant: false,
      scale: 1, // minimum 1 ; vraie valeur : 0.737 — taille réelle : 73,7 × 92,1 cm (hauteur × largeur)
      title: 'La Nuit étoilée',
      desc: 'Vincent van Gogh, 1889. Ciel tourbillonnant au-dessus de Saint-Rémy-de-Provence, huile sur toile, MoMA.',
    },
    {
      src: '/paintings/jeune-fille-perle.jpg',
      bench: true,
      right_plant: true,
      left_plant: false,
      scale: 1, // minimum 1 ; vraie valeur : 0.445 — taille réelle : 44,5 × 39 cm (hauteur × largeur)
      title: 'La Jeune Fille à la perle',
      desc: 'Johannes Vermeer, v. 1665. Tronie à la perle et au turban bleu, huile sur toile, Mauritshuis.',
    },
    {
      src: '/paintings/grande-vague.jpg',
      bench: false,
      right_plant: false,
      left_plant: false,
      scale: 1, // minimum 1 ; vraie valeur : 0.257 — taille réelle : ≈ 25,7 × 37,9 cm (hauteur × largeur)
      title: 'La Grande Vague de Kanagawa',
      desc: 'Hokusai, v. 1831. Estampe ukiyo-e de la série « Trente-six vues du mont Fuji ».',
    },
  ],
  // Cellule 2 (aile : 3 murs, le dernier reste vide)
  [
    {
      src: '/paintings/le-cri.jpg',
      bench: false,
      right_plant: false,
      left_plant: false,
      scale: 1, // minimum 1 ; vraie valeur : 0.91 — taille réelle : 91 × 73,5 cm (hauteur × largeur)
      title: 'Le Cri',
      desc: 'Edvard Munch, 1893. Figure angoissée sur un pont au ciel rouge sang, tempera et crayon sur carton, Nasjonalmuseet.',
    },
    {
      src: '/paintings/le-baiser.jpg',
      bench: true,
      right_plant: true,
      left_plant: false,
      scale: 1.8, // vraie valeur ; taille réelle : 180 × 180 cm (hauteur × largeur)
      title: 'Le Baiser',
      desc: 'Gustav Klimt, 1907-1908. Couple enlacé sur fond doré, huile et feuilles d’or sur toile, Belvédère de Vienne.',
    },
  ],
];
