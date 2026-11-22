// Recherche O(1) d'une cellule par ses coordonnées de grille : `has(i, j)`.
// (Remplace les `cells.some(...)` en O(n), trop lents sur de grandes grilles.)
export function cellLookup(cells) {
  const set = new Set(cells.map(([i, j]) => `${i},${j}`));
  return (i, j) => set.has(`${i},${j}`);
}
