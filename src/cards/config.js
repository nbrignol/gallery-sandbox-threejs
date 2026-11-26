// Paramètres de la page des cartes. Unités : 1 unité = 1 mètre. Axe Y vers le haut.

// Cartes
export const CARD_SIZE = 1.2; // côté d'une carte carrée (m)
export const CARD_SEGMENTS = 24; // subdivisions par côté (pour animer la courbure)
export const CARD_THICKNESS = 0.004; // écart entre le dos et la face (évite le z-fighting)
export const CARD_STACK_STEP = 0.002; // surélévation de chaque carte suivante (ordre de recouvrement)
export const CARD_BACK_TEXTURE = `${import.meta.env.BASE_URL}cards/card-back.svg`;

// Disposition : une ligne, de gauche à droite. Un écart offsetX < CARD_SIZE entre deux voisines
// donne un chevauchement ; offsetZ = décalage en profondeur ; rotationDeg = rotation à plat.
// artwork = clé du catalogue data/artworks.js.
export const CARDS = [
  { artwork: 'joconde', offsetX: -1.5, offsetZ: 0.05, rotationDeg: -6 },
  { artwork: 'nuit', offsetX: -0.5, offsetZ: -0.04, rotationDeg: 3 },
  { artwork: 'perle', offsetX: 0.5, offsetZ: 0.06, rotationDeg: -2 },
  { artwork: 'baiser', offsetX: 1.5, offsetZ: -0.03, rotationDeg: 7 },
];

// Sol (même texture que la galerie : voir world/materials.js)
export const FLOOR_FOLDER = 'diagonal_parquet';
export const FLOOR_TEXTURE_SIZE = 2.36; // taille réelle d'un motif (m)
export const FLOOR_EXTENT = 16; // côté du plan de sol (m)
export const FLOOR_SEGMENTS = 8;

// Caméra (vue du dessus)
export const CAMERA_FOV = 40;
export const CAMERA_TILT_DEG = 55; // inclinaison depuis la verticale, sur l'axe X uniquement (0 = vue du dessus stricte) : la caméra recule vers le sud
export const CAMERA_FILL = 0.8; // part de l'écran occupée par la rangée de cartes

// Lumière d'ambiance
export const HEMI_INTENSITY = 0.12; // très faible : le fond du sol doit rester dans le noir
export const HEMI_SKY_COLOR = 0xffffff;
export const HEMI_GROUND_COLOR = 0xd9d2c7;
export const BACKGROUND_COLOR = 0x111111;

// Spot qui éclaire les cartes ; le sol s'assombrit en dégradé autour du cône
export const SPOT_POSITION = [0, 6, 1.5]; // x, y, z (m) ; il vise le centre de la table
export const SPOT_COLOR = 0xfff1dc;
export const SPOT_INTENSITY = 260; // candelas (décroissance physique)
export const SPOT_ANGLE_DEG = 26; // demi-angle du cône
export const SPOT_PENUMBRA = 0.85; // 1 = bord totalement doux
export const SPOT_DECAY = 2;

// Survol d'une carte : elle se soulève et vibre brièvement
export const HOVER_LIFT = 0.1; // hauteur de soulèvement (m)
export const HOVER_SHAKE = 0.008; // amplitude de la vibration en X/Z (m)
export const HOVER_TILT_DEG = 1.5; // amplitude du léger roulis/tangage (°)
export const HOVER_SHAKE_CYCLES = 2; // nombre d'allers-retours de la vibration (une seule fois, quand la carte monte)
export const HOVER_SHAKE_DURATION = 0.3; // durée de la vibration (s), amortie jusqu'à l'arrêt
export const HOVER_SMOOTH = 12; // rapidité du lissage de l'entrée/sortie du survol (1/s)
export const HOVER_NEIGHBOR_PUSH = 0.18; // écartement (m) des cartes voisines (-1 / +1) de la carte survolée, pour la laisser passer

// Ombres du spot (cartes sur le sol et entre elles)
export const SHADOW_MAP_SIZE = 2048;
export const SHADOW_BIAS = -0.0004;
export const SHADOW_NORMAL_BIAS = 0.01;
export const SHADOW_RADIUS = 4; // douceur du bord
export const SHADOW_INTENSITY = 0.5; // opacité des ombres : 1 = noires, 0 = invisibles

// Pioche : la carte se courbe, se retourne et vient flotter face à la caméra
export const LIFT_DURATION = 1.4; // posée → flottante (s)
export const DROP_DURATION = 0.9; // flottante → posée (s)
export const BEND_MAX_ANGLE = 1.6; // angle (rad) de la tangente au bord relevé, au plus fort de la courbure
export const BEND_PEAK = 0.35; // progression (0-1) où la courbure est maximale : elle se forme AVANT que la carte monte
export const MOVE_DELAY = 0.1; // progression à partir de laquelle la carte quitte le sol pour monter : avant, elle se courbe et glisse au sol
export const MOVE_OVERLAP = 0.0; // la montée démarre MOVE_OVERLAP avant la fin du glissement : pas de temps mort entre les deux phases
export const SLIDE_DISTANCE = 0.7; // glissement au sol vers la caméra (+Z) pendant la courbure (m)
export const FLOAT_DISTANCE = 3; // distance de la carte flottante à la caméra (m)
export const FLOAT_HEIGHT_FRACTION = 0.62; // part de la hauteur de l'écran occupée par la carte flottante
export const FLOAT_SCREEN_X = -0.36; // position horizontale à l'écran (-1 = bord gauche, 1 = bord droit) ; le panneau est à droite
export const FLOAT_ARC = 0.5; // la trajectoire passe par un point plus haut (m)
export const FLOAT_BOB = 0.02; // amplitude du léger flottement (m)
export const FLOAT_BOB_TILT_DEG = 1.2; // amplitude de l'inclinaison du flottement (°)
