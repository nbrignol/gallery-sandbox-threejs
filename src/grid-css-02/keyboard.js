// Navigation clavier dans la grille : tabulation « roving » (une seule case dans l'ordre de tab),
// flèches pour se déplacer, Début / Fin. Entrée et Espace ouvrent (comportement natif du bouton).
export function initKeyboard(root) {
  const grid = root.querySelector('.grid');
  const buttons = [...grid.querySelectorAll('.tile')];
  const setCurrent = (index) => buttons.forEach((button, i) => (button.tabIndex = i === index ? 0 : -1));
  setCurrent(0);

  grid.addEventListener('focusin', (event) => {
    const index = buttons.indexOf(event.target);
    if (index >= 0) setCurrent(index);
  });

  grid.addEventListener('keydown', (event) => {
    const index = buttons.indexOf(event.target);
    if (index < 0) return;
    // Nombre de colonnes réel (3 en paysage, 2 en portrait) lu depuis le CSS
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const last = buttons.length - 1;
    const targets = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + columns,
      ArrowUp: index - columns,
      Home: 0,
      End: last,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    const next = Math.min(last, Math.max(0, targets[event.key]));
    buttons[next].focus();
  });
}
