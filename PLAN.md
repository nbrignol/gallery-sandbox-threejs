# Galerie 3D Three.js — Plan

> Document de référence pour Claude Code. À placer à la racine du dépôt (peut servir de base au `CLAUDE.md`).

## 1. Objectif

Une galerie virtuelle dans le navigateur : une salle en **L** composée de 3 cellules carrées sans cloison, des tableaux (images fournies) encadrés aux murs. On navigue **en cliquant de tableau en tableau** ; la caméra pivote librement à l'horizontale ; un panneau HTML décrit le tableau regardé.

## 2. Stack et conventions

- **Vite** + **three** (ES modules). Pas de framework UI : le panneau est en HTML/CSS natif.
- Animations caméra : lerp maison (pas de GSAP pour l'instant).
- Unités : **1 unité = 1 mètre**. Axe Y vers le haut. Grille de cellules sur le plan XZ.
- Paramètres centralisés dans `src/config.js` (taille de cellule, hauteur sous plafond, hauteur des yeux, dimensions par défaut des tableaux et cadres, seuils du panneau, nom affiché dans l'en-tête).
- Code commenté en français, fonctions courtes, une responsabilité par module.

## 3. Arborescence cible

```
/
├── index.html
├── PLAN.md
├── public/
│   ├── paintings/          # Images des tableaux
│   └── textures/<nom>/     # color.jpg, normal.jpg, roughness.jpg (étape 7)
└── src/
    ├── main.js             # Renderer, scène, caméra, boucle
    ├── config.js
    ├── data/
    │   ├── layout.js       # Liste des cellules
    │   └── paintings.js    # Tableaux par index de cellule
    ├── world/
    │   ├── cell.js         # createCell(...)
    │   ├── room.js         # Assemblage des cellules, liste des murs
    │   ├── lights.js
    │   ├── painting.js     # Toile (plane + texture)
    │   ├── frame.js        # Moulure extrudée
    │   └── materials.js    # Matériaux partagés (étape 7 : textures PBR)
    ├── nav/
    │   ├── look.js         # Rotation horizontale au glisser
    │   ├── picking.js      # Raycast clic/survol
    │   └── travel.js       # Déplacement vers un point de vue
    └── ui/
        ├── header.css      # En-tête fixe (dégradé + nom)
        ├── panel.js        # Panneau HTML
        └── panel.css
```

## 4. Étapes

Règle de progression : **une étape n'est commencée que lorsque la précédente fonctionne et est validée par l'utilisateur.**

### Étape 1 — Initialisation du projet
- `npm create vite@latest` (vanilla JS), `npm i three`.
- `main.js` : `WebGLRenderer` (antialias, `setPixelRatio(min(devicePixelRatio, 2))`), `PerspectiveCamera` (FOV vertical ≈ 70–75°), redimensionnement de la fenêtre, boucle `setAnimationLoop` avec `Clock`.
- **Canvas plein écran** : `html, body { margin: 0; height: 100%; overflow: hidden; }`, canvas en `position: fixed; inset: 0; display: block;` avec une taille de `100vw × 100vh` (préférer `100dvh` sur mobile, pour tenir compte des barres du navigateur). Le renderer et l'aspect de la caméra suivent `window.innerWidth / innerHeight` au redimensionnement.
- **En-tête HTML** (overlay) : un `<header>` en `position: fixed; top: 0; left: 0; right: 0;`, au-dessus du canvas (`z-index`), contenant le nom (texte pris dans `config.js`, `SITE_NAME`).
  - Fond en **dégradé vertical** opaque en haut, transparent en bas, par exemple `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0))`, sur une hauteur de ≈ 80–120 px.
  - `pointer-events: none` sur l'en-tête, pour qu'il ne bloque ni le glisser ni les clics sur les tableaux situés derrière (à réactiver sur d'éventuels liens à l'intérieur).
  - Prévoir la marge de sécurité des écrans à encoche : `padding-top: env(safe-area-inset-top)`, avec `viewport-fit=cover` dans la balise meta viewport.
- `config.js` avec les constantes de base. Un cube de test pour valider le rendu, à retirer ensuite.

### Étape 2 — Cellules vides et lumières
- **Description de la salle** (`layout.js`) : tableau de cellules en coordonnées de grille.
  ```js
  export const cells = [[0,0], [1,0], [0,1]]; // L ; [0,0] = cellule d'angle
  ```
- **`createCell(size, walls)`** retourne un `Group` : sol et plafond (`PlaneGeometry(S, S)`), et un mur (`PlaneGeometry`) pour chaque côté demandé. Le groupe est positionné en `(i*S, 0, j*S)`.
- **Assemblage** (`room.js`) : pour chaque cellule et chaque côté (ordre fixe **N, E, S, O**), on crée un mur uniquement si la cellule voisine n'existe pas. Pas de cas particulier pour l'angle rentrant.
- `room.js` expose pour chaque cellule la **liste ordonnée de ses murs existants**, avec pour chacun : centre, normale vers l'intérieur, axe « gauche → droite vu de l'intérieur », largeur. Pour le L : 2 murs dans la cellule d'angle, 3 dans chaque aile.
- Les murs sont aussi rangés dans une liste `occluders`, utilisée par le raycast (étape 4).
- **Lumières** (`lights.js`) : une `HemisphereLight` globale et une lumière douce (`PointLight` faible) par cellule, ajoutée à l'assemblage.
- Matériaux provisoires : `MeshStandardMaterial` en couleurs unies (sol, murs, plafond distincts).
- Caméra de test placée au centre de la cellule d'angle, à hauteur des yeux (≈ 1,6 m).

### Étape 3 — Tableaux seuls (d'après les images)
- **Données** (`paintings.js`) : un tableau de listes, indexé comme `cells`.
  ```js
  export const paintings = [
    [ { src:'/paintings/a.jpg', title:'…', desc:'…' }, … ], // cellule 0
    [ … ],                                                   // cellule 1
    [ … ],                                                   // cellule 2
  ];
  ```
- **Attribution automatique** : le k-ième tableau d'une cellule va sur le k-ième mur de sa liste, au centre (`t = 0.5`), hauteur du centre ≈ 1,6 m. Tableaux en trop : ignorés avec un `console.warn`. Murs en trop : vides.
- **Taille** : charger la texture (`await loader.loadAsync`), `colorSpace = SRGBColorSpace`. Hauteur fixe (ex. 1 m), largeur = hauteur × ratio, plafonnée à ≈ 70 % de la largeur du mur (on réduit alors la hauteur).
- Chaque tableau est un **`Group`** (contenant pour l'instant la toile seule), posé contre le mur, décalé de quelques cm le long de la normale. Les métadonnées et l'index global vont dans `group.userData`.
- **Point de vue** précalculé par tableau : centre du tableau + normale × `d`, à hauteur des yeux, avec un `viewYaw` face au tableau. Choisir `d` pour que le tableau occupe ≈ 60–70 % de l'écran (prendre la contrainte la plus forte entre hauteur et largeur, selon le FOV et le ratio de l'écran). Prévoir un léger décalage pour laisser la place au panneau, qui sera à droite.
- Un spot par tableau (`SpotLight` dirigé vers la toile).
- Préparer des champs optionnels `side`, `t`, `h` qui pourront plus tard remplacer le placement automatique (non implémentés à ce stade).

### Étape 4 — Panneau
- **Picking minimal** (`picking.js`) : clic sur le canvas → raycast depuis la position du pointeur sur les tableaux **et** les murs (`occluders`), pour qu'un tableau caché ne soit pas cliquable. On remonte au `Group` du tableau (via `userData`, voir la note de l'étape 5). Au survol d'un tableau : curseur en forme de main.
- **Panneau** (`panel.js`, `panel.css`) : une `div` en position absolue par-dessus le canvas, à droite, contenant :
  - titre et description, remplis depuis le `userData` ;
  - boutons « précédent / suivant », qui suivent l'ordre de `paintings.flat()` ;
  - un bouton de fermeture.
- Le panneau doit commencer **sous l'en-tête** (ne pas le recouvrir).
- **API** du module : `show(painting)`, `hide()`, `setOpacity(0–1)` (cette dernière sera utilisée à l'étape 6 pour le fondu lié à la rotation). Apparition et disparition par transition CSS.
- **À ce stade**, sans déplacement de caméra : un clic sur un tableau ouvre directement le panneau, « précédent / suivant » ne font que changer son contenu. L'enchaînement avec la caméra arrive à l'étape 6.
- Le panneau ne doit pas laisser passer les événements pointeur vers le canvas (pas de raycast déclenché par un clic dans le panneau).

### Étape 5 — Cadres
- **Moulure extrudée générée pour chaque tableau**, après le chargement de l'image (pas de variante pour l'instant) :
  - `Shape` : contour extérieur `(w + 2e) × (h + 2e)` et trou intérieur `w × h` (`shape.holes`) ;
  - `ExtrudeGeometry` avec `depth`, `bevelEnabled`, `bevelSize`, `bevelThickness` en mètres, donc un profil identique quel que soit le ratio.
  - Valeurs de départ : bordure `e` ≈ 5 cm, profondeur ≈ 3 cm.
- **Ne jamais étirer un cadre commun** (le biseau serait déformé).
- La toile est placée en léger retrait dans le trou, avec ≈ 2 mm d'écart pour éviter le scintillement.
- Matériau : couleur unie (bois sombre mat, roughness ≈ 0,6, ou doré satiné, metalness ≈ 0,8). Couleur et dimensions du cadre : valeurs par défaut dans `config.js`, surchargeables par tableau.
- **Recalculer le point de vue** avec la taille cadre compris.

> **📌 Note — Clic sur le groupe cadre + toile.**
> Le `Group` du tableau contient désormais deux maillages : le cadre et la toile. Le clic et le survol doivent fonctionner **quel que soit le maillage touché** :
> - raycast récursif sur les groupes de tableaux (`intersectObjects(groups, true)`), plus les murs ;
> - depuis l'objet touché, remonter les parents jusqu'au groupe qui porte `userData.paintingId` (fonction utilitaire unique dans `picking.js`, à écrire dès l'étape 4 pour qu'elle reste valable ici) ;
> - **ne jamais** stocker les métadonnées sur la toile ou le cadre eux-mêmes, uniquement sur le groupe ;
> - le halo de survol (étape 6) s'applique au groupe entier, ou à la toile seule, mais doit être déclenché aussi en survolant le cadre ;
> - vérifier qu'un clic sur le bord du cadre ouvre bien le bon panneau, et qu'un cadre ne masque pas la toile au raycast (toile devant le fond du trou).

### Étape 6 — Navigation
- **Rotation** (`look.js`) : yaw uniquement, sans pitch. `camera.rotation.set(0, yaw, 0)`, mis à jour par le déplacement horizontal du pointeur pendant le glisser. Pointer events, donc souris et tactile avec le même code.
- **Clic ou glisser** : c'est un clic si le pointeur a bougé de moins de 5 px entre l'appui et le relâchement (adapter le picking de l'étape 4 en conséquence).
- **Survol** : ajouter un léger halo (emissive) sur le tableau survolé.
- **Déplacement** (`travel.js`) : clic sur un tableau → la caméra va en **ligne droite** jusqu'à son point de vue (même si elle traverse l'angle rentrant, c'est accepté), avec un easing, durée ≈ 0,3 s/m plafonnée. Le yaw est interpolé en même temps, par le chemin le plus court (écart ramené dans [-π, π]).
- **États** :
  - `idle` : position de départ, au centre de la cellule d'angle ;
  - `moving` : panneau masqué, glisser désactivé, clics ignorés ;
  - `atPainting(id)` : glisser actif, panneau selon l'angle.
  Un clic sur le tableau courant ramène simplement la caméra face à lui. Les boutons « précédent / suivant » du panneau déclenchent désormais un déplacement.
- **Liaison avec le panneau** : il s'affiche à l'arrivée, plus au clic.
  - On calcule `Δ = |écart(yaw, viewYaw)|`.
  - Il **disparaît au-delà de 30°**, avec un fondu entre 10° et 30° (`setOpacity`), et ne réapparaît que sous 15° (hystérésis contre le clignotement). Seuils dans `config.js`.

### Étape 7 — Textures (hors tableaux)
- Sources CC0 : **Poly Haven** et **ambientCG**. Résolution 1K (2K si nécessaire), en JPG.
- Cartes utilisées : couleur (`SRGBColorSpace`), normal map **version GL**, rugosité (les deux dernières restent en espace linéaire). Occlusion facultative.
- Organisation : `public/textures/<nom>/color.jpg | normal.jpg | roughness.jpg`, chargées dans `materials.js` (matériaux partagés entre cellules).
- Répétition : `RepeatWrapping`, avec un nombre de répétitions calculé en mètres (`repeat = S / taille réelle de la texture`) pour une échelle constante.
  - Les cellules étant séparées, vérifier que le motif se raccorde entre elles (coordonnées de texture calculées en coordonnées monde, ou sols fusionnés avec `BufferGeometryUtils.mergeGeometries`).
- Par surface :
  - **sol** : parquet ou béton ciré, PBR complet ;
  - **murs** : enduit discret, ou couleur unie avec une légère normal map ;
  - **plafond** : blanc uni ;
  - **cadres** : couleur unie (le grain du bois serait mal orienté par `ExtrudeGeometry`).
- Optionnel : compression KTX2.

> **📌 Note — Téléchargement des textures : à discuter avec l'utilisateur avant de commencer cette étape.**
> Ne rien télécharger sans validation. Pistes à proposer :
> - **Poly Haven** : recherche via `https://api.polyhaven.com/assets?type=textures&categories=…`, liens des fichiers via `https://api.polyhaven.com/files/{id}`. Candidats déjà repérés pour le sol : `diagonal_parquet`, `embedded_plank_flooring`, `dark_wooden_planks`.
> - **ambientCG** : recherche via `https://ambientcg.com/api/v2/full_json?include=imageData,downloadData&category=…` (catégories Plaster, WoodFloor…). Téléchargement en zip : `https://ambientcg.com/get?file=<ID>_1K-JPG.zip`. L'API v2 n'est plus mise à jour mais reste fonctionnelle ; vérifier si une v3 est disponible.
> - Démarche proposée : lister quelques candidats par surface, avec vignettes et IDs → choix de l'utilisateur → téléchargement, extraction et renommage dans `public/textures/<nom>/`.

## 5. Hors périmètre (pour l'instant)

- Déplacement par clic au sol et collisions.
- Rotation verticale (pitch).
- Contournement de l'angle rentrant pendant les déplacements.
- Variantes de cadres (baguettes, déformation « 9-slice »).
- Placement fin des tableaux (`side`, `t`, `h`), plusieurs tableaux par mur.
