// Paramètres centralisés de la galerie. Unités : 1 unité = 1 mètre.

// Nom affiché dans l'en-tête
export const SITE_NAME = 'Galerie';

// Salle
export const CELL_SIZE = 8; // côté d'une cellule carrée (m)
export const CEILING_HEIGHT = 3.5; // hauteur sous plafond (m)

// Caméra
export const EYE_HEIGHT = 1.6; // hauteur des yeux (m)
export const CAMERA_FOV = 72; // FOV vertical (degrés)

// Tableaux (valeurs par défaut)
export const PAINTING_HEIGHT = 1; // hauteur de toile (m)
export const PAINTING_CENTER_HEIGHT = 1.6; // hauteur du centre du tableau (m)
export const PAINTING_MAX_WALL_RATIO = 0.7; // largeur max en part de la largeur du mur

// Cadres (valeurs par défaut)
export const FRAME_BORDER = 0.05; // largeur de la bordure (m)
export const FRAME_DEPTH = 0.03; // profondeur (m)
export const FRAME_COLOR = 0x2b1d14; // bois sombre

// Panneau d'information : angles en degrés d'écart avec la vue face au tableau
export const PANEL_FADE_START = 10; // début du fondu
export const PANEL_HIDE_ANGLE = 30; // disparition complète
export const PANEL_SHOW_ANGLE = 15; // réapparition (hystérésis)
