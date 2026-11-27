// Grille CSS 01 : un seul élément par tableau (la carte passe en plein écran sans changer de nœud DOM).
import './grid.css';
import { renderPage } from './render.js';
import { initKeyboard } from './keyboard.js';
import { initViewer } from './viewer.js';

const root = document.getElementById('app');
renderPage(root);
initKeyboard(root);
initViewer(root);
