// Configurations de la galerie : chacune = un plan (grid) + les tableaux de chaque cellule (paintings).
// Choisie par le paramètre d'URL ?config=n (1 = première, par défaut) ; les numéros de la barre de titre sont des liens.
//
// PLAN (grid) : une matrice de 0 et de 1, de taille libre.
//   1 = une cellule de salle        0 = une cellule vide
// Les lignes sont les rangées vues d'en haut (la 1re ligne = le nord), les colonnes vont de
// l'ouest (1re colonne) à l'est. Les murs sont posés automatiquement entre une cellule et chaque
// case voisine vide ou hors grille.
//
// ORDRE DES CELLULES : en lisant la grille ligne par ligne, de gauche à droite, chaque 1 reçoit
// un index (0, 1, 2…). Le n-ième groupe de `paintings` va à la n-ième cellule. En mode dev, la
// console affiche la correspondance « groupe n → colonne, ligne ».
//
// TABLEAUX (paintings) : une liste par cellule. Le k-ième tableau d'une cellule est posé sur le
// k-ième mur de sa liste (ordre N, E, S, O parmi les murs existants), au centre.
//   - `null` = un mur sans rien (pour sauter un mur) ; `art(null, { bench, … })` = un mur sans
//     tableau mais avec de la déco ;
//   - `[]` = une pièce sans tableau : elle reste visitable, on la traverse (utile pour garder
//     l'alignement des index, ou pour un carrefour sans mur) ;
//   - les cellules au-delà de la dernière liste n'ont pas de tableau non plus.
// Œuvres et déco : voir data/artworks.js (`art(clé, { bench, right_plant, left_plant })`).
//
// DÉPART (start, optionnel) : { cell, yawDeg, offsetX, offsetZ }, par défaut START_CELL,
// START_YAW_DEG, START_OFFSET_X/Z de config.js. yawDeg : 0 = nord, négatif = vers la droite.
import { art } from './artworks.js';

export const galleries = [
  {
    name: '1',
    // Un L de 3 salles
    grid: [
      [1, 1],
      [1, 0],
    ],
    paintings: [
      [art('joconde', { left_plant: true }), art('venus', { bench: true })],
      [art('nuit'), art('perle', { bench: true, right_plant: true }), art('vague')],
      [art('cri'), art('baiser', { bench: true, right_plant: true })],
    ],
  },
  {
    name: '2',
    // Un couloir nord-sud qui croise une travée est-ouest (7 salles). La salle centrale n'a aucun
    // mur : elle est vide (`[]`), tout comme le tronçon de couloir et le bout de la travée est.
    //   . 0 .      index : 0 (1,0)   1 (1,1)   2 (1,2)
    //   . 1 .                3 (0,3)  4 (1,3)   5 (2,3)
    //   . 2 .                6 (1,4)
    //   3 4 5
    
    grid: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
      
    ],
    start: { cell: 0, yawDeg: 40 },
    paintings: [
      [art('joconde', { left_plant: true }), art('nuit', { right_plant: true }), art('vague')], // 0 : N, E, O
      [art('venus', { bench: true, right_plant: true }), art('cri')], // 1 : E, O
      [], // 2 : tronçon de couloir, sans tableau
      [art('perle', { bench: true, right_plant: true })], // 3 : N, S (+ O vide)
      [art('baiser', { right_plant: true, bench: true })], // 6 : cul-de-sac
    ],
  },
  {
    name: '3',
    // Une boucle de salles autour d'un vide central. Les quatre angles et quelques salles sont
    // vides (`[]`) : on les traverse pour passer d'un côté à l'autre.
    grid: [
      [1, 1, 1],
      [0, 0, 0],
      [0, 1, 0],
    ],
    start: { cell: 0, yawDeg: 180 },
    
    paintings: [
      [art('joconde', {bench: true, left_plant: true }), art('venus', {right_plant: true})], 
      [art('vague', { right_plant: true }), art('baiser', { bench: true, right_plant: true })],
      [art('cri', { left_plant: true }), null, art('nuit', {right_plant: true, bench: true})], 
      //[art('cri', { left_plant: true }, art('nuit', { bench: true }))],
      [null, null, art('perle', { bench: true, right_plant: true })],
    ],
  },
];

const PARAM = 'config';

// Index de la configuration demandée par l'URL (?config=2 → deuxième) ; 0 sans paramètre ou si invalide
export function currentGalleryIndex() {
  const index = Number(new URLSearchParams(window.location.search).get(PARAM)) - 1;
  return Number.isInteger(index) && index >= 0 && index < galleries.length ? index : 0;
}

// Lien vers la configuration `index` (la première : sans paramètre)
export function galleryHref(index) {
  const url = new URL(window.location.href);
  if (index === 0) url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, String(index + 1));
  return url.search || url.pathname;
}
