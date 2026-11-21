// Tableaux par cellule, indexés comme `cells` (layout.js).
// Le k-ième tableau d'une cellule est posé sur le k-ième mur de sa liste
// (ordre N, E, S, O parmi les murs existants), au centre.
//
// Champs : src, title, desc.
// Optionnel : frame { border, depth, color } pour surcharger le cadre par défaut (config.js).
// Champs optionnels réservés (pas encore implémentés) : side, t, h
// pour un futur placement fin à la place de l'attribution automatique.
// Images provisoires : à remplacer par les vraies images dans public/paintings/.
export const paintings = [
  // Cellule 0 (angle : 2 murs)
  [
    { src: '/paintings/placeholder-1.svg', title: 'Tableau 1', desc: 'Format paysage 4:3.' },
    { src: '/paintings/placeholder-2.svg', title: 'Tableau 2', desc: 'Format portrait 3:4.' },
  ],
  // Cellule 1 (aile : 3 murs)
  [
    { src: '/paintings/placeholder-3.svg', title: 'Tableau 3', desc: 'Format large 16:9.' },
    { src: '/paintings/placeholder-4.svg', title: 'Tableau 4', desc: 'Format carré.' },
    { src: '/paintings/placeholder-5.svg', title: 'Tableau 5', desc: 'Format paysage 3:2.' },
  ],
  // Cellule 2 (aile : 3 murs, le dernier reste vide)
  [
    { src: '/paintings/placeholder-6.svg', title: 'Tableau 6', desc: 'Format portrait 2:3.' },
    { src: '/paintings/placeholder-7.svg', title: 'Tableau 7', desc: 'Format panoramique 21:9.' },
  ],
];
