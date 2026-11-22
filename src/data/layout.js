// Plan du bâtiment : une grille (matrice) de 0 et de 1, de taille libre.
//   1 = une cellule de salle        0 = une cellule vide
// Les lignes sont les rangées de la grille vues d'en haut (la 1re ligne = le nord), les
// colonnes vont de l'ouest (1re colonne) à l'est. Les murs sont posés automatiquement entre
// une cellule et chaque case voisine vide ou hors grille.
//
// ORDRE DES CELLULES : en lisant la grille ligne par ligne, de gauche à droite, chaque 1
// reçoit un index (0, 1, 2…). Le n-ième groupe de data/paintings.js va à la n-ième cellule,
// et START_CELL (config.js) est un de ces index. En mode dev, la console affiche la
// correspondance « groupe n → colonne, ligne ».
//

export const grid = [
  [1, 1],
  [1, 0],
];


//export const grid = [[0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1], [0, 1, 0]];
//export const grid = [[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]];
//export const grid = [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]