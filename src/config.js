// Paramètres centralisés de la galerie. Unités : 1 unité = 1 mètre.

// Nom affiché dans l'en-tête
export const SITE_NAME = 'Galerie ThreeJS';

// Salle
export const CELL_SIZE = 6; // côté d'une cellule carrée (m)
export const CEILING_HEIGHT = 3.5; // hauteur sous plafond (m)
export const PLINTH_BOTTOM_HEIGHT = 0.12; // plinthe entre le sol et le mur (m) ; 0 = aucune
export const PLINTH_TOP_HEIGHT = 0.02; // plinthe entre le mur et le plafond (m) ; 0 = aucune
export const SEPARATOR_WIDTH = 0.02; // côté des séparateurs verticaux aux coins (m) ; 0 = aucun. Dépasse de la moitié dans la salle : garder > 2 × PLINTH_DEPTH
export const PLINTH_DEPTH = 0.03; // relief : épaisseur des plinthes devant le mur (m)

// Éclairage
export const CEILING_GLOW = 0.35; // le plafond émet un peu de lumière (plafond lumineux, évite le gris terne)
export const TONE_EXPOSURE = 1; // exposition globale (tone mapping)
export const ENV_INTENSITY = 0.4; // intensité de l'environnement (reflets et ambiance douce)
export const FLOOR_ENV_INTENSITY = 0.12; // environnement sur le sol seulement : bas = pas de grand reflet brillant à angle rasant
// Murs : teinte (le relief de la texture est conservé)
export const WALL_COLOR = 0x6a6c6e; // teinte du mur, multipliée par la texture : blanc = texture telle quelle ; un gris sombre (ex. 0x3c3e40) donne un mur sombre qui garde son relief et réagit à la lumière
export const WALL_BRIGHTNESS = 1; // facteur appliqué à cette teinte (1 = inchangé ; peut dépasser 1)
export const FLOOR_SPECULAR = 0.3; // reflets du sol : 0 = parquet mat, sans aucun reflet ; 1 = brillance normale du matériau
export const HEMI_INTENSITY = 0.5; // lumière d'ambiance hémisphérique
export const HEMI_SKY_COLOR = 0xffffff; // ambiance : faces tournées vers le haut
export const HEMI_GROUND_COLOR = 0xd9d2c7; // ambiance : faces tournées vers le bas (plafond)
// Lampes de cellule : 'room+neighbors' = seules sont allumées la lampe de la pièce courante et
// celles des pièces directement connectées (voisines par un côté) ; 'all' = toutes allumées
// (ne convient qu'aux petits bâtiments : chaque lampe allumée consomme une texture du shader).
export const CELL_LIGHT_SCOPE = 'room+neighbors';
export const CELL_SHADOW_MAX_CELLS = 12; // au-delà de ce nombre de cellules, les lampes ne projettent plus d'ombres (≈ 6 Mo de carte d'ombre par lampe)
export const TOP_VIEW_AMBIENT_BOOST = 2.2; // en vue du dessus, l'ambiance (hémisphère) est multipliée par ce facteur : toutes les lampes ne sont pas allumées
export const CELL_LIGHT_INTENSITY = 5; // lampe douce de chaque cellule (cd)
export const CELL_LIGHT_DROP = 1.2; // distance sous le plafond de la lampe (m) : plus bas = point chaud moins fort au plafond

// Ombres des spots de tableaux (calculées une seule fois)
export const SHADOW_MAP_SIZE = 1024; // résolution de la carte d'ombre de chaque spot
export const SHADOW_BIAS = -0.0003; // décalage de profondeur (anti-acné) ; plus négatif = moins d'acné mais ombres décollées
export const SHADOW_NORMAL_BIAS = 0.004; // décalage le long de la normale (m)
export const SHADOW_RADIUS = 3; // douceur du bord des ombres
// Lampes de cellule : ombres des objets (banc, plantes) et des cadres, aussi calculées une seule fois
export const CELL_SHADOW_MAP_SIZE = 512; // résolution par face (6 faces par lampe)
export const CELL_SHADOW_BIAS = -0.002; // anti-acné ; plus négatif = moins d'acné mais ombres décollées
export const CELL_SHADOW_NORMAL_BIAS = 0.02; // décalage le long de la normale (m)

// Occlusion ambiante « cuite » (dégradés sombres dans les coins, calculés au chargement)
export const AO_STRENGTH = 0.6; // 0 = désactivée ; 1 = occlusion maximale au contact
export const AO_COLOR = 0x000000; // couleur de l'ombre d'AO : noir = ombre neutre ; une teinte chaude (ex. 0x8a5a3c) donne une ombre plus douce
export const AO_RADIUS = 0.8; // portée de l'assombrissement autour des coins et jonctions (m)
export const AO_CONTACT_STRENGTH = 0.5; // assombrissement sous les objets posés au sol (ombre de contact)
export const AO_MAX_TEXTURE_SIZE = 2048; // taille max (px) de la texture d'AO du sol : sur un grand bâtiment, la résolution par mètre diminue
export const AO_PIXELS_PER_METER = 64; // résolution des textures d'AO

// Objets déco (Poly Haven, public/models/) : banc au centre d'une pièce, plantes aux coins
export const BENCH_MODEL = `${import.meta.env.BASE_URL}models/Ottoman_01/Ottoman_01_1k.gltf`;
export const PLANT_MODEL = `${import.meta.env.BASE_URL}models/potted_plant_02/potted_plant_02_1k.gltf`;
export const BENCH_SCALE = 1; // échelle du banc (1 = taille d'origine du modèle)
export const PLANT_SCALE = 1; // échelle des plantes
export const PLANT_CORNER_INSET = 0.5; // distance de la plante aux deux murs du coin (m)
export const BENCH_CONTACT_RADIUS = 0.6; // rayon de l'ombre de contact du banc (m)
export const PLANT_HITBOX_PADDING = 0.1; // marge de la boîte de clic invisible autour d'une plante (m, au total)
export const PLANT_CONTACT_RADIUS = 0.5; // rayon de l'ombre de contact des plantes (m)

// Qualité (cases à cocher en bas à droite)
export const MINIMAL_AMBIENT_BOOST = 1.5; // mode minimal : l'ambiance (hémisphère) est multipliée par ce facteur (spots éteints)
export const SD_PIXEL_RATIO = 0.5; // mode SD : résolution interne = cette part de la taille de l'écran (le canvas est étiré)

// Caméra
export const EYE_HEIGHT = 1.6; // hauteur des yeux (m)
export const CAMERA_FOV = 60; // FOV vertical (degrés) ; plus serré = moins de déformation, vue plus resserrée

// Tableaux (valeurs par défaut)
export const PAINTING_HEIGHT = 1; // hauteur de toile (m)
export const PAINTING_CENTER_HEIGHT = 1.6; // hauteur du centre du tableau (m)
export const PAINTING_MAX_WALL_RATIO = 0.7; // largeur max en part de la largeur du mur

export const PAINTING_WALL_OFFSET = 0.02; // décalage devant le mur (m)
export const PAINTING_SCREEN_FILL = 0.65; // part de l'écran occupée par le tableau au point de vue
export const PANEL_VIEW_SHIFT = 0.2; // décalage latéral du point de vue (part de la demi-largeur visible), pour laisser la place au panneau à droite
export const PAINTING_SPOT_INTENSITY = 45; // intensité du spot (cd)
export const PAINTING_SPOT_DISTANCE = 1.5; // distance du spot devant le mur (m)

// Cadres (valeurs par défaut)
export const FRAME_BORDER = 0.05; // largeur de la bordure (m)
export const FRAME_DEPTH = 0.03; // profondeur (m)
export const FRAME_COLOR = 0x2b1d14; // bois sombre
export const FRAME_BEVEL = 0.008; // taille et épaisseur du biseau (m)
export const FRAME_CANVAS_RECESS = 0.002; // retrait de la toile derrière la face avant du cadre (m)

// Lampe de tableau (petite boîte au-dessus du cadre, matériau du cadre)
export const LAMP_WIDTH = 0.3; // largeur max (m) ; limitée à 60 % de la largeur du tableau
export const LAMP_HEIGHT = 0.04; // hauteur (m)
export const LAMP_DEPTH = 0.08; // avancée devant le mur (m)
export const LAMP_GAP = 0.25; // espace entre le haut du cadre et la lampe (m) : au-dessus du halo du spot

// Panneau d'information : angles en degrés d'écart avec la vue face au tableau
export const PANEL_FADE_START = 10; // début du fondu
export const PANEL_HIDE_ANGLE = 30; // disparition complète
export const PANEL_SHOW_ANGLE = 15; // réapparition (hystérésis)

// Vue du dessus (bouton en haut à droite)
export const SCENE_BACKGROUND = 0x222222; // fond de la scène en visite normale
export const TOP_VIEW_BACKGROUND = 0x000000; // fond hors du bâtiment en vue du dessus
export const TOP_VIEW_MARGIN = 1.15; // marge autour du bâtiment (1 = bord à bord)

// Départ de la visite : cellule, décalage (m) par rapport à son centre, et orientation
// (degrés ; 0 = vers le nord (-Z), négatif = vers la droite : -90 = vers l'est (+X))
export const START_CELL = 0; // cellule de la Joconde
export const START_OFFSET_X = 0;
export const START_OFFSET_Z = 0;
export const START_YAW_DEG = -100; // vers l'est : La Jeune Fille à la perle, au fond de la pièce voisine
// Micro-animation d'introduction (droite puis gauche), interrompue au premier contact
export const INTRO_ENABLED = true;
export const INTRO_DELAY = 0.8; // attente avant de commencer (s)
export const INTRO_DURATION = 3.6; // durée de l'aller-retour (s)
export const INTRO_SWEEP_DEG = 5; // amplitude de chaque côté (degrés)

// Navigation
export const LOOK_SENSITIVITY = 0.0015; // rotation (rad) par pixel de glisser (0.004 = trop sensible ; plus bas = plus lent)
export const CLICK_MAX_MOVE = 5; // en deçà (px), un appui-relâchement est un clic
export const TRAVEL_SECONDS_PER_METER = 0.3; // durée du déplacement par mètre
export const TRAVEL_MIN_DURATION = 0.4; // durée minimale (s)
export const TRAVEL_MAX_DURATION = 1.8; // durée maximale (s)
export const CLOSE_BACKOFF_DISTANCE = 1.5; // recul de la caméra à la fermeture du panneau (m)
// Glow de survol : dégradé autour du tableau + cadre (pas une lumière)
export const HOVER_GLOW_SIZE = 0.35; // largeur du dégradé autour du cadre (m)
export const HOVER_GLOW_OPACITY = 0.12; // opacité maximale du glow au survol
export const HOVER_GLOW_COLOR = 0xfff0d8; // couleur du glow (blanc chaud)
export const HOVER_GLOW_POWER = 2; // courbe du dégradé : plus haut = glow plus concentré près du cadre
// Contour net de survol (trait de quelques pixels, sans dégradé)
export const HOVER_OUTLINE_WIDTH = 2; // épaisseur (pixels, constante à l'écran) ; 0 = pas de contour
export const HOVER_OUTLINE_GAP = 0.02; // écart entre le cadre et le contour (m)
export const HOVER_OUTLINE_OPACITY = 0.9; // opacité du contour au survol
export const HOVER_OUTLINE_COLOR = 0xffffff; // couleur du contour
export const HOVER_GLOW_SPEED = 10; // vitesse du fondu du glow (1/s)
