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

export const PAINTING_WALL_OFFSET = 0.02; // décalage devant le mur (m)
export const PAINTING_SCREEN_FILL = 0.65; // part de l'écran occupée par le tableau au point de vue
export const PANEL_VIEW_SHIFT = 0.2; // décalage latéral du point de vue (part de la demi-largeur visible), pour laisser la place au panneau à droite
export const PAINTING_SPOT_INTENSITY = 20; // intensité du spot (cd)
export const PAINTING_SPOT_DISTANCE = 1.5; // distance du spot devant le mur (m)

// Cadres (valeurs par défaut)
export const FRAME_BORDER = 0.05; // largeur de la bordure (m)
export const FRAME_DEPTH = 0.03; // profondeur (m)
export const FRAME_COLOR = 0x2b1d14; // bois sombre
export const FRAME_BEVEL = 0.008; // taille et épaisseur du biseau (m)
export const FRAME_CANVAS_RECESS = 0.002; // retrait de la toile derrière la face avant du cadre (m)

// Panneau d'information : angles en degrés d'écart avec la vue face au tableau
export const PANEL_FADE_START = 10; // début du fondu
export const PANEL_HIDE_ANGLE = 30; // disparition complète
export const PANEL_SHOW_ANGLE = 15; // réapparition (hystérésis)

// Navigation
export const LOOK_SENSITIVITY = 0.004; // rotation (rad) par pixel de glisser
export const CLICK_MAX_MOVE = 5; // en deçà (px), un appui-relâchement est un clic
export const TRAVEL_SECONDS_PER_METER = 0.3; // durée du déplacement par mètre
export const TRAVEL_MIN_DURATION = 0.4; // durée minimale (s)
export const TRAVEL_MAX_DURATION = 1.8; // durée maximale (s)
export const CLOSE_BACKOFF_DISTANCE = 1.5; // recul de la caméra à la fermeture du panneau (m)
export const HOVER_GLOW = 1.5; // intensité du halo de survol (émissive)
export const HOVER_SPOT_BOOST = 1.3; // surcroît d'intensité du spot au survol (0.3 = +30 %)
export const HOVER_GLOW_SPEED = 10; // vitesse du fondu du halo (1/s)
