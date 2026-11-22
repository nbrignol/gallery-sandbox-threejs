// Tableaux par cellule, indexés comme `cells` (layout.js).
// Le k-ième tableau d'une cellule est posé sur le k-ième mur de sa liste
// (ordre N, E, S, O parmi les murs existants), au centre.
//
// Champs : src, title, desc.
// Optionnel : frame { border, depth, color } pour surcharger le cadre par défaut (config.js).
// Champs optionnels réservés (pas encore implémentés) : side, t, h
// pour un futur placement fin à la place de l'attribution automatique.
// Images : œuvres du domaine public, issues de Wikimedia Commons (public/paintings/).
export const paintings = [
  // Cellule 0 (angle : 2 murs)
  [
    {
      src: '/paintings/mona-lisa.jpg',
      title: 'La Joconde',
      desc: 'Léonard de Vinci, v. 1503-1519. Portrait de Lisa Gherardini, huile sur bois de peuplier, musée du Louvre.',
    },
    {
      src: '/paintings/naissance-de-venus.jpg',
      title: 'La Naissance de Vénus',
      desc: 'Sandro Botticelli, v. 1485. Vénus émerge de la mer sur une coquille, tempera sur toile, galerie des Offices.',
    },
  ],
  // Cellule 1 (aile : 3 murs)
  [
    {
      src: '/paintings/nuit-etoilee.jpg',
      title: 'La Nuit étoilée',
      desc: 'Vincent van Gogh, 1889. Ciel tourbillonnant au-dessus de Saint-Rémy-de-Provence, huile sur toile, MoMA.',
    },
    {
      src: '/paintings/jeune-fille-perle.jpg',
      title: 'La Jeune Fille à la perle',
      desc: 'Johannes Vermeer, v. 1665. Tronie à la perle et au turban bleu, huile sur toile, Mauritshuis.',
    },
    {
      src: '/paintings/grande-vague.jpg',
      title: 'La Grande Vague de Kanagawa',
      desc: 'Hokusai, v. 1831. Estampe ukiyo-e de la série « Trente-six vues du mont Fuji ».',
    },
  ],
  // Cellule 2 (aile : 3 murs, le dernier reste vide)
  [
    {
      src: '/paintings/le-cri.jpg',
      title: 'Le Cri',
      desc: 'Edvard Munch, 1893. Figure angoissée sur un pont au ciel rouge sang, tempera et crayon sur carton, Nasjonalmuseet.',
    },
    {
      src: '/paintings/le-baiser.jpg',
      title: 'Le Baiser',
      desc: 'Gustav Klimt, 1907-1908. Couple enlacé sur fond doré, huile et feuilles d’or sur toile, Belvédère de Vienne.',
    },
  ],
];
