import './panel.css';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(className, label, text, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.addEventListener('click', onClick);
  return node;
}

// Panneau d'information d'une carte, à droite. API : show({ index, total, title, desc }), hide(),
// setBusy(bool). Les boutons ‹ › n'apparaissent que si onPrev / onNext sont fournis.
let panelCount = 0;

// `returnFocus` : élément qui reprend le focus quand le panneau se ferme alors qu'il le contenait (accessibilité).
export function createCardPanel({ parent = document.body, returnFocus, onPrev, onNext, onClose }) {
  const root = el('aside', 'card-panel');
  root.setAttribute('role', 'dialog');
  const meta = el('p', 'card-panel-meta');
  const title = el('h2', 'card-panel-title');
  const desc = el('p', 'card-panel-desc');
  title.id = `card-panel-title-${++panelCount}`;
  title.setAttribute('aria-live', 'polite'); // le titre est annoncé quand on passe d'une carte à l'autre
  root.setAttribute('aria-labelledby', title.id);
  root.append(button('card-panel-close', 'Fermer', '×', onClose), meta, title, desc);

  const navButtons = [];
  if (onPrev || onNext) {
    const nav = el('div', 'card-panel-nav');
    if (onPrev) navButtons.push(button('card-panel-btn', 'Carte précédente', '‹', onPrev));
    if (onNext) navButtons.push(button('card-panel-btn', 'Carte suivante', '›', onNext));
    nav.append(...navButtons);
    root.append(nav);
  }
  parent.append(root);

  return {
    show({ index, total, title: text, desc: description }) {
      meta.textContent = `Carte ${index + 1} / ${total}`;
      title.textContent = text;
      desc.textContent = description;
      root.classList.add('is-open');
    },
    hide() {
      if (root.contains(document.activeElement)) returnFocus?.focus({ preventScroll: true });
      root.classList.remove('is-open');
    },
    setBusy(busy) {
      for (const node of navButtons) node.disabled = busy;
    },
  };
}
