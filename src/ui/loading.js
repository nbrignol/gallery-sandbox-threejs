// Étapes affichées dans la modale de chargement (#loading-steps).
// `add(label, total?)` ajoute une étape (en attente) et retourne
// { start, tick, done, setTotal, remove } :
//  - start() : étape en cours ; tick() : +1 sur le compteur « (n/total) » ; done() : terminée ;
//  - setTotal(n) : fixe le total une fois connu ; remove() : retire l'étape (inutile).
export function createLoadingSteps(list) {
  return {
    add(label, initialTotal) {
      const item = document.createElement('li');
      item.className = 'is-pending';
      list.append(item);
      let count = 0;
      let total = initialTotal;
      const render = () => {
        item.textContent = total ? `${label} (${count}/${total})` : label;
      };
      render();
      // Les méthodes n'utilisent pas `this` : elles peuvent être passées telles quelles en callback
      const start = () => {
        if (item.className === 'is-pending') item.className = 'is-active';
      };
      return {
        start,
        tick() {
          count = Math.min(count + 1, total ?? Infinity);
          start();
          render();
        },
        setTotal(n) {
          total = n;
          render();
        },
        remove() {
          item.remove();
        },
        done() {
          if (total) count = total;
          item.className = 'is-done';
          render();
        },
      };
    },
  };
}

// Laisse le navigateur afficher l'état courant avant un calcul synchrone lourd
// (sans cela, l'étape ne s'affiche qu'une fois le calcul terminé)
export function paint() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}
