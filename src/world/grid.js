// Convertit la grille de layout.js (matrice de 0 / 1) en liste de cellules `[i, j]`
// (i = colonne, j = ligne), dans l'ordre de lecture : ligne par ligne, de gauche à
// droite et de haut en bas. Cet ordre donne l'index de chaque cellule, utilisé par
// data/paintings.js (le n-ième groupe va à la n-ième cellule) et START_CELL.
//
// - Une valeur « vraie » (1) = cellule de salle ; 0 = vide.
// - Les lignes peuvent avoir des longueurs différentes : les cases manquantes valent 0.
// - Grille vide ou sans aucune cellule : erreur explicite.
// - Cellules non connectées au reste (îlots) : simple avertissement.
export function gridToCells(grid) {
  if (!Array.isArray(grid) || grid.length === 0) {
    throw new Error('layout : la grille est vide (attendu : une matrice de 0 et de 1).');
  }
  const cells = [];
  grid.forEach((row, j) => {
    if (!Array.isArray(row)) throw new Error(`layout : la ligne ${j} n'est pas un tableau.`);
    row.forEach((value, i) => {
      if (value) cells.push([i, j]);
    });
  });
  if (cells.length === 0) throw new Error('layout : la grille ne contient aucune cellule (aucun 1).');

  warnIfDisconnected(cells);
  if (import.meta.env?.DEV) logIndexMapping(cells);
  return cells;
}

// Avertit si les cellules forment plusieurs blocs séparés (parcours en largeur)
function warnIfDisconnected(cells) {
  const keys = new Set(cells.map(([i, j]) => `${i},${j}`));
  const seen = new Set();
  const [i0, j0] = cells[0];
  const queue = [[i0, j0]];
  seen.add(`${i0},${j0}`);
  while (queue.length > 0) {
    const [i, j] = queue.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${i + di},${j + dj}`;
      if (keys.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push([i + di, j + dj]);
      }
    }
  }
  if (seen.size < cells.length) {
    console.warn(
      `layout : ${cells.length - seen.size} cellule(s) non connectée(s) au reste du bâtiment (aucun passage vers elles).`,
    );
  }
}

// Mode dev : correspondance index → cellule, pour remplir paintings.js
function logIndexMapping(cells) {
  const lines = cells.map(([i, j], k) => `  groupe ${k} de paintings.js → colonne ${i}, ligne ${j}`);
  console.info(`layout : ${cells.length} cellule(s)\n${lines.join('\n')}`);
}
