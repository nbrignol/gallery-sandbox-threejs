import './panel.css';

// Crée un élément avec une classe et un texte optionnels
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// Bouton avec libellé d'accessibilité
function createButton(className, label, text, onClick) {
  const button = el('button', className, text);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

// Panneau d'information d'un tableau, à droite, sous l'en-tête.
// API : show(data), hide(), setOpacity(0–1).
// `data` = userData d'un tableau (title, desc). Les boutons appellent
// onPrev / onNext / onClose ; le panneau ne connaît pas la liste des tableaux.
export function createPanel({ onPrev, onNext, onClose }) {
  const root = el('aside', 'panel');
  const title = el('h2', 'panel-title');
  const desc = el('p', 'panel-desc');
  const nav = el('div', 'panel-nav');
  nav.append(
    createButton('panel-btn', 'Tableau précédent', '‹', onPrev),
    createButton('panel-btn', 'Tableau suivant', '›', onNext),
  );
  root.append(
    createButton('panel-close', 'Fermer', '×', onClose),
    title,
    desc,
    nav,
  );
  document.body.append(root);

  return {
    show(data) {
      title.textContent = data.title;
      desc.textContent = data.desc;
      root.classList.add('is-open');
    },
    hide() {
      root.classList.remove('is-open');
    },
    // Opacité supplémentaire (fondu lié à la rotation, étape 6)
    setOpacity(value) {
      root.style.setProperty('--fade', String(value));
    },
  };
}
