// Grille CSS 02 : deux éléments (la case de la grille + un dialogue plein écran séparé, créé à l'ouverture).
import './grid.css';
import { renderPage } from './render.js';
import { initKeyboard } from './keyboard.js';
import { initViewer } from './viewer.js';

const root = document.getElementById('app');
renderPage(root);
initKeyboard(root);
initViewer(root);
