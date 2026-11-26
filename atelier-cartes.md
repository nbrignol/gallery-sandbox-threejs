# Atelier Three.js — Des cartes 3D dans une page web (page `cartes`)

Une page d'article classique (titres, paragraphes) dans laquelle s'intègrent des **galeries de cartes 3D** : les cartes sont posées sur une table, se soulèvent au survol, et « se piochent » : la carte se courbe, se retourne et vient flotter en plein écran avec un panneau de description.

Ce projet est **indépendant** de la galerie en salles (page `index`). Il se concentre sur deux sujets : **la 3D de petits objets animés**, et surtout **l'intégration d'un canvas 3D dans une page HTML** (plusieurs canvas, accessibilité, repli sans 3D).

> **Public visé** : vous connaissez JavaScript et le DOM. Vous n'avez pas besoin de connaître Three.js ni WebGL. Si vous avez fait l'atelier « galerie », les étapes 1, 3 et 5 vous seront familières.

---

## Sommaire

| # | Étape | Ce qu'on voit à la fin |
|---|---|---|
| 0 | Mise en place | Un projet Vite et une page d'article |
| 1 | Une carte dans un canvas | Un carré vu de dessus |
| 2 | Une carte à deux faces | Dos visible, face cachée dessous |
| 3 | Textures | Un dos de carte et un tableau sur la face |
| 4 | Lumières et rendu | Une carte éclairée par un spot |
| 5 | Une rangée de cartes, bien cadrée | Cartes qui se chevauchent, caméra adaptée au conteneur |
| 6 | Intégrer la 3D dans l'article | Plusieurs galeries dans la page, repli en liste |
| 7 | Survol et tooltip | La carte se soulève, un tooltip la suit |
| 8 | Fausse ombre de contact | Une ombre douce sous chaque carte |
| 9 | Pioche : courbure et retournement *(avancé)* | La carte vole jusqu'à la caméra |
| 10 | Plein écran et rendu en deux passes *(avancé)* | La carte flotte au premier plan, panneau de texte |
| 11 | Accessibilité, clavier, scroll *(avancé)* | Tout est utilisable au clavier et en lecteur d'écran |
| — | Glossaire | |

Les étapes 1 à 8 forment le **socle**. Les étapes 9 à 11 sont des approfondissements.

### Convention : « Pour aller plus loin »
Chaque étape se termine par des renvois vers le **projet de référence** (`src/cards/…`). Les extraits de l'atelier sont des versions **simplifiées**.

---

## Étape 0 — Mise en place

```bash
npm create vite@latest cartes -- --template vanilla
cd cartes
npm install three
npm run dev
```

### Conventions
- **1 unité = 1 mètre**, **Y vers le haut** : la table est dans le plan **XZ**.
- Les constantes sont dans un fichier `config.js` (taille des cartes, FOV, intensités…).

### Le HTML de départ : le contenu est la source de vérité

Le point de départ est une page HTML **qui fonctionne sans JavaScript** : chaque galerie est une simple liste d'images avec titre et description.

```html
<div class="card-canvas-gallery" aria-label="Mes tableaux préférés">
  <ul>
    <li>
      <img src="/paintings/a.jpg" alt="" />
      <h3>Titre A</h3>
      <p>Description A.</p>
    </li>
    <li>
      <img src="/paintings/b.jpg" alt="" />
      <h3>Titre B</h3>
      <p>Description B.</p>
    </li>
  </ul>
</div>
```

C'est le **JavaScript qui lira cette liste** et construira la 3D (étape 6). Le contenu est ainsi indexable, lisible par un lecteur d'écran, et reste affiché si WebGL est indisponible. C'est ce qu'on appelle l'**amélioration progressive** (*progressive enhancement*).

### Structure cible

```
index.html
src/
  main.js        # appelle initCardGalleries()
  config.js
  card.js        # géométrie et matériaux d'une carte
  layout.js      # position des cartes sur la table
  hover.js       # survol
  tooltip.js     # étiquette 3D
  contactAO.js   # fausse ombre
  flow.js        # pioche (animation, plein écran)
  panel.js       # panneau HTML
  gallery.js     # chef d'orchestre
```

---

## Étape 1 — Une carte dans un canvas

### Objectif
Afficher un carré vu de dessus.

### Les quatre objets de base

| Objet | Rôle |
|---|---|
| `Scene` | L'arbre de tous les objets |
| `PerspectiveCamera` | Le point de vue |
| `WebGLRenderer` | Dessine la scène dans un `<canvas>` |
| La boucle | Appelle `render()` à chaque image |

Un objet visible est un **`Mesh`** = **géométrie** (forme) + **matériau** (aspect).

```js
import * as THREE from 'three';

const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(800, 400, false);   // false : le CSS décide de la taille d'affichage

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 800 / 400, 0.1, 100);
camera.position.set(0, 4, 0.1);
camera.lookAt(0, 0, 0);

// Un plan couché sur la table : PlaneGeometry est dans le plan XY, on le couche sur XZ
const card = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 1.2).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xe08a4f }),
);
scene.add(card);

renderer.setAnimationLoop(() => renderer.render(scene, camera));
```

### Ce qu'il faut retenir
- **`setSize(w, h, false)`** : le 3ᵉ argument empêche Three.js de modifier le style CSS du canvas, c'est le CSS qui décide (essentiel dans une page d'article).
- **`setPixelRatio(min(devicePixelRatio, 2))`** : net sur les écrans « retina », sans coût démesuré.
- **`rotateX` sur la géométrie** (pas sur le mesh) : on « cuit » la rotation dans les sommets. L'objet garde alors une rotation `(0,0,0)` à l'état de repos, ce qui simplifie les animations ultérieures.
- Les plans sont **visibles d'un seul côté** (*back-face culling*). Un plan vu « par derrière » est invisible. C'est le prochain sujet.

### Exercice
Changez la position de la caméra en `(0, 4, 3)` : on voit la carte de biais. Cette inclinaison de 50° sera celle du projet final.

### Pour aller plus loin
`createCardGallery`, début de la fonction (renderer, scène) dans [src/cards/gallery.js](src/cards/gallery.js).

---

## Étape 2 — Une carte à deux faces

### Objectif
Une carte avec un **dos** visible au repos et une **face** (le tableau) visible quand on la retourne.

### Pourquoi une géométrie « à la main » ?
Un simple plan ne montre qu'un côté. On pourrait utiliser deux plans collés, mais pour **courber** la carte plus tard (étape 9), il faut une seule `BufferGeometry` avec des sommets qu'on peut déplacer. On la construit donc nous-mêmes.

### Anatomie d'une `BufferGeometry`

| Attribut | Contenu |
|---|---|
| `position` | Les coordonnées (x, y, z) de chaque sommet, à plat : `[x0,y0,z0, x1,y1,z1…]` |
| `uv` | Pour chaque sommet, l'endroit correspondant dans la texture (0 à 1) |
| `index` | La liste des triangles : 3 numéros de sommets par triangle |
| `normal` | La direction perpendiculaire à la surface en chaque sommet (pour l'éclairage) |

### Deux grilles superposées

On crée une grille de `(n+1)²` sommets pour le dos (en `y = +e`) et une pour la face (en `y = -e`), légèrement écartées (`e` = 2 mm). On subdivise (`n = 24`) pour pouvoir plier la carte plus tard.

```js
// card.js
import * as THREE from 'three';

const SIZE = 1.2;          // côté de la carte (m)
const SEGMENTS = 24;       // subdivisions par côté
const THICKNESS = 0.004;   // écart dos / face

function createCardGeometry() {
  const n = SEGMENTS;
  const row = n + 1;
  const grid = row * row;
  const half = SIZE / 2;
  const e = THICKNESS / 2;
  const positions = new Float32Array(grid * 2 * 3);
  const uvs = new Float32Array(grid * 2 * 2);

  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const k = j * row + i;
      const x = (i / n) * SIZE - half;
      const z = (j / n) * SIZE - half;
      // dos : en haut (y = +e)
      positions.set([x, e, z], k * 3);
      uvs.set([i / n, 1 - j / n], k * 2);
      // face : en bas (y = -e), UV retournées pour que l'image soit à l'endroit une fois la carte retournée
      positions.set([x, -e, z], (grid + k) * 3);
      uvs.set([i / n, j / n], (grid + k) * 2);
    }
  }
  // … triangles : voir ci-dessous
}
```

### Les triangles et leur sens

Chaque case de la grille est découpée en deux triangles. **Le sens d'énumération des trois sommets décide de la face visible** : sens antihoraire vu de devant = face avant (règle de la main droite).

```js
const back = [];
const face = [];
for (let j = 0; j < n; j++) {
  for (let i = 0; i < n; i++) {
    const a = j * row + i;   // coin haut-gauche de la case
    const b = a + 1;         // haut-droite
    const c = a + row;       // bas-gauche
    const d = c + 1;         // bas-droite
    back.push(a, c, b,  b, c, d);                          // normale +Y : visible d'en haut
    face.push(grid + a, grid + b, grid + c,  grid + b, grid + d, grid + c);   // sens inverse : normale -Y
  }
}
```

### Deux matériaux, deux « groupes »

Pour que le dos et la face aient chacun leur texture, on **découpe l'index en deux groupes** et on donne un **tableau de matériaux** au mesh : le groupe `n` utilise le matériau `n`.

```js
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
geometry.setIndex([...back, ...face]);
geometry.addGroup(0, back.length, 0);                 // (début, nombre d'indices, n° de matériau)
geometry.addGroup(back.length, face.length, 1);
geometry.computeVertexNormals();                      // calcule les normales à partir des triangles
geometry.userData.restPositions = positions.slice();  // copie des positions de repos pour les déformations
return geometry;
```

### Le mesh

```js
const mesh = new THREE.Mesh(createCardGeometry(), [backMaterial, faceMaterial]);
mesh.frustumCulled = false;   // la déformation (étape 9) sort du volume de repos : ne pas la masquer à tort
```

### Ce qu'il faut retenir
- **Pourquoi 4 mm d'écart ?** Deux surfaces **exactement** au même endroit scintillent (*z-fighting*). Un écart minime règle le problème, sans être visible.
- **`frustumCulled`** : par défaut, Three.js ne dessine pas un objet dont la boîte englobante est hors du champ de la caméra. Cette boîte est calculée au repos : si la carte est déformée, elle peut en sortir. On désactive le test.
- Les UV de la face sont inversées par rapport à celles du dos, car on la voit **retournée autour de l'axe X**. Si l'image est à l'envers, c'est là qu'il faut chercher.

### Exercice
Mettez `back.push(a, b, c, …)` (ordre inversé) et regardez ce qui se passe. *(Le dos devient invisible vu d'en haut : on voit la face « à travers ».)*

### Pour aller plus loin
`createCardGeometry` et `createCard` dans [src/cards/card.js](src/cards/card.js) (lignes 63-139).

---

## Étape 3 — Textures

### Objectif
Un dos de carte commun et le tableau sur la face.

### Charger une image simple (le dos)

```js
const loader = new THREE.TextureLoader();

function loadTexture(url) {
  const texture = loader.load(url);           // retourne tout de suite la texture ; l'image arrive plus tard
  texture.colorSpace = THREE.SRGBColorSpace;  // image de couleur : à déclarer en sRGB
  texture.anisotropy = 8;                      // netteté à angle rasant
  return texture;
}
```

> **Piège : l'espace colorimétrique.** Une image couleur est en sRGB. Sans `colorSpace = SRGBColorSpace`, les couleurs sont délavées.

### La face : « cover » dessiné dans un canvas 2D

Les tableaux ont des formats variés, les cartes sont carrées. On veut le comportement CSS `object-fit: cover` : remplir le carré, rogner le surplus au centre. On dessine donc l'image dans un `<canvas>` 2D, qu'on transforme en texture (`CanvasTexture`) :

```js
function loadFaceTexture(url, size = 1024, border = 28) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);                       // fond blanc = bordure

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const image = new Image();
  image.onload = () => {
    const inner = size - 2 * border;
    const side = Math.min(image.width, image.height);   // plus grand carré centré dans l'image
    ctx.drawImage(
      image,
      (image.width - side) / 2, (image.height - side) / 2, side, side,   // zone source (carré centré)
      border, border, inner, inner,                                        // zone destination
    );
    texture.needsUpdate = true;    // dit à Three.js de renvoyer le canvas au GPU
  };
  image.src = url;
  return texture;
}
```

### Les matériaux

```js
const backMaterial = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.7 });
const faceMap = loadFaceTexture(artwork.src);
const faceMaterial = new THREE.MeshStandardMaterial({
  map: faceMap,
  roughness: 0.7,
  emissive: 0xffffff,
  emissiveMap: faceMap,       // la face « émet » sa propre image…
  emissiveIntensity: 0,       // … mais à 0 au repos : elle ne sert qu'à l'étape 10
});
```

- **`MeshStandardMaterial`** : un matériau physique qui réagit aux lumières (il en faut : étape 4).
- **`emissive` + `emissiveMap`** : un matériau qui **ajoute** de la lumière de lui-même. Ici, on s'en servira pour afficher la carte flottante « telle quelle » (étape 10).

### Ce qu'il faut retenir
- **`CanvasTexture`** est la porte d'entrée de tout ce qu'on dessine « à la main » : cover, dégradés, texte… (on le retrouve aux étapes 7 et 8).
- Après avoir modifié un canvas **déjà** envoyé au GPU, il faut `texture.needsUpdate = true`.

### Pour aller plus loin
`loadTexture`, `loadFaceTexture`, `createCard` dans [src/cards/card.js](src/cards/card.js) (lignes 14-60 et 113-139).

---

## Étape 4 — Lumières et rendu

### Objectif
Éclairer les cartes avec un spot, comme une table de jeu sous une lampe.

### Deux lumières

| Lumière | Usage |
|---|---|
| `HemisphereLight(ciel, sol, intensité)` | Ambiance : évite le noir total |
| `SpotLight(couleur, intensité, distance, angle, pénombre, decay)` | Un cône de lumière dirigé vers la table |

```js
const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c7, 0.12);   // très faible : le fond reste sombre
scene.add(hemi);

const spot = new THREE.SpotLight(
  0xfff1dc,
  260,                                // candelas
  0,                                  // distance : 0 = infinie
  THREE.MathUtils.degToRad(34),       // demi-angle du cône
  0.85,                               // pénombre : 1 = bord complètement doux
  2,                                  // decay : 2 = décroissance physique avec la distance
);
spot.position.set(0, 6, 1.5);
spot.target.position.set(0, 0, 0);    // vise le centre de la table
scene.add(spot, spot.target);         // la cible doit être dans la scène
```

> L'intensité (260) paraît énorme : avec un `decay` physique de 2, la lumière s'affaiblit avec le **carré de la distance**. À 6 m, on divise par 36.

### Le rendu

```js
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // courbe « cinéma » : contrastée, hautes lumières douces
renderer.toneMappingExposure = 1;
```

Le **tone mapping** ramène les valeurs de lumière (qui peuvent dépasser « blanc ») dans la plage affichable.

### Un canvas transparent

La page d'article doit apparaître **derrière** la scène : on n'ajoute pas de `scene.background`, et on demande un canvas avec transparence :

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
```

Sans fond ni sol, seules les cartes, éclairées par le spot, sont dessinées sur la page.

### Ce qu'il faut retenir
- On règle **à l'œil** : intensité, angle, pénombre. Les paramètres sont regroupés dans `config.js` pour itérer vite.
- Une scène 3D se lit toujours avec : ambiance faible (pas de noir total) + lumière principale (forme et direction).

### Pour aller plus loin
Section « Lumière d'ambiance » et « Spot » de [src/cards/config.js](src/cards/config.js) ; création des lumières dans [src/cards/gallery.js](src/cards/gallery.js) (lignes 158-190).

---

## Étape 5 — Une rangée de cartes, bien cadrée

### Objectif
Plusieurs cartes qui se chevauchent légèrement, et une caméra qui cadre toujours la rangée entière, quelle que soit la taille du conteneur.

### Disposition : une rangée centrée avec un léger désordre

```js
// layout.js
const SPACING = 1.0;   // < CARD_SIZE (1,2) : les cartes se chevauchent
const JITTER = [       // décalages appliqués en boucle : la carte i prend l'entrée i % 5
  { offsetZ:  0.05, rotationDeg: -6 },
  { offsetZ: -0.04, rotationDeg:  3 },
  { offsetZ:  0.06, rotationDeg: -2 },
  { offsetZ: -0.03, rotationDeg:  7 },
  { offsetZ:  0.0,  rotationDeg: -4 },
];

export function layoutCards(count) {
  return Array.from({ length: count }, (_, i) => ({
    offsetX: (i - (count - 1) / 2) * SPACING,   // centré en X
    ...JITTER[i % JITTER.length],
  }));
}
```

Un tableau de décalages **déterministe** (et non `Math.random`) donne un aspect « jeté » mais **identique à chaque chargement**.

Dans `createCard`, on applique cette disposition, et on empile les cartes de quelques millimètres pour fixer l'ordre de recouvrement :

```js
mesh.position.set(layout.offsetX, THICKNESS / 2 + index * 0.002, layout.offsetZ);
mesh.rotation.y = THREE.MathUtils.degToRad(layout.rotationDeg);
```

### La caméra : une inclinaison sur un seul axe

```js
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.up.set(0, 0, -1);        // le « haut de l'écran » est -Z (on regarde la table de dessus)

let cameraDistance = 10;
let tiltDeg = 50;
function placeCamera() {
  const tilt = THREE.MathUtils.degToRad(tiltDeg);
  // Un arc dans le plan YZ autour de l'origine : un seul degré de liberté
  camera.position.set(0, cameraDistance * Math.cos(tilt), cameraDistance * Math.sin(tilt));
  camera.lookAt(0, 0, 0);
}
```

`camera.up` : `lookAt` a besoin de savoir quelle direction est « le haut ». Quand on regarde presque à la verticale, le « haut » par défaut (+Y) est ambigu : on le redéfinit.

### Calculer la distance : un peu de trigonométrie

À une distance `d`, la hauteur visible vaut `2·d·tan(FOV/2)`. On isole `d`, pour la hauteur **et** pour la largeur, et on garde la plus grande valeur :

```js
function fitCamera() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;

  const xs = layout.map((c) => c.offsetX);
  const cardsWidth = Math.max(...xs) - Math.min(...xs) + CARD_SIZE * 1.2;
  const cardsHeight = CARD_SIZE * 1.5;
  const tan = Math.tan(THREE.MathUtils.degToRad(40 / 2));
  const FILL = 0.8;                                              // la rangée occupe 80 % de l'écran

  const forHeight = cardsHeight / FILL / 2 / tan;
  const forWidth = cardsWidth / FILL / 2 / tan / (width / height);   // le ratio entre en jeu pour la largeur
  cameraDistance = Math.max(forHeight, forWidth);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();   // OBLIGATOIRE après avoir changé aspect/fov
  placeCamera();
  renderer.setSize(width, height, false);
}
```

### Suivre la taille du conteneur : `ResizeObserver`

`window.addEventListener('resize')` ne suffit plus : le canvas est **dans une page**, son conteneur peut changer de taille sans que la fenêtre bouge (mise en page, panneau qui s'ouvre…). `ResizeObserver` observe **un élément** :

```js
const resizeObserver = new ResizeObserver(fitCamera);
resizeObserver.observe(stage);
fitCamera();   // une première fois au démarrage
```

### Ce qu'il faut retenir
- Le **cadrage dépend à la fois de la hauteur et de la largeur** disponibles : un conteneur étroit (mobile) fait reculer la caméra.
- `updateProjectionMatrix()` est l'oubli classique.

### Exercice
Redimensionnez la fenêtre en largeur : la rangée reste entièrement visible. Mettez `FILL` à `1.0` : les cartes touchent les bords.

### Pour aller plus loin
[src/cards/layout.js](src/cards/layout.js) ; dans [src/cards/gallery.js](src/cards/gallery.js) : `placeCamera` (230), `resizeView` (246), `fitCamera` (261).

---

## Étape 6 — Intégrer la 3D dans l'article

C'est l'étape qui change de nature : on passe de « une scène Three.js » à « **une page web qui contient** des scènes Three.js ». C'est aussi l'étape la plus riche en bonnes pratiques web.

### 6.1 — Principe : le HTML est la source de vérité

Votre JS ne fabrique pas les données : il **lit** la liste de l'étape 0 et construit la scène à partir d'elle.

```js
// gallery.js
function readItems(container) {
  const items = [];
  for (const li of container.querySelectorAll('li')) {
    const img = li.querySelector('img');
    if (!img) continue;                                            // un <li> sans image est ignoré
    const heading = li.querySelector('h1, h2, h3, h4, h5, h6');
    const title = (heading?.textContent ?? img.alt ?? '').trim();
    const paragraphs = [...li.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
    items.push({ src: img.src, title, desc: paragraphs.join(' ') });
  }
  return items;
}
```

### 6.2 — Remplacer la liste par la scène, et pouvoir revenir en arrière

On construit un bloc (`stage`) qui contient le `<canvas>`, et on **garde la liste d'origine dedans**, cachée visuellement mais lisible par les lecteurs d'écran. Une fonction `restore()` remet l'état initial.

```js
function buildStage(container) {
  const stage = document.createElement('div');
  stage.className = 'cards-stage';
  stage.tabIndex = 0;                                              // focalisable au clavier
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', container.getAttribute('aria-label') || 'Galerie de cartes');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');                      // le canvas est « muet » : la liste porte le contenu

  const list = container.querySelector('ul');
  list?.classList.add('sr-only');                                  // masquée visuellement, lisible par un lecteur d'écran

  stage.append(canvas);
  if (list) stage.append(list);
  container.replaceWith(stage);

  const restore = () => {
    list?.classList.remove('sr-only');
    if (list) container.append(list);
    stage.replaceWith(container);
  };
  return { stage, canvas, restore };
}
```

La classe `.sr-only` cache sans utiliser `display: none` (qui supprimerait aussi le contenu pour les lecteurs d'écran) :

```css
.sr-only {
  position: absolute !important;
  width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

### 6.3 — WebGL indisponible : afficher la liste

Si WebGL n'est pas disponible (vieux navigateur, GPU bloqué), `new WebGLRenderer` lance une exception : on la rattrape et on rend la liste d'origine.

```js
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (error) {
  console.warn('WebGL indisponible, la liste est affichée à la place.', error);
  restore();
  return null;
}
```

### 6.4 — Réserver la place pour éviter un saut de mise en page

Avant que le JS s'exécute, la liste est affichée normalement ; puis le JS la remplace par un bloc de taille différente : la page « saute » (*layout shift*). On l'évite en réservant la place **en CSS**, dès le premier rendu :

```css
.cards-stage,
html[data-cards='gallery'] .card-canvas-gallery:not([data-ready]) {
  position: relative;
  aspect-ratio: 2 / 1;      /* même taille avant et après le script */
  max-height: 90dvh;
  overflow: hidden;
}
html[data-cards='gallery'] .card-canvas-gallery:not([data-ready]) > * {
  display: none;            /* la liste est masquée : la place est déjà réservée */
}
```

- Le JS pose `container.dataset.ready = ''` dès qu'il prend la main : la règle `:not([data-ready])` cesse de s'appliquer.
- L'attribut **`data-cards`** (sur `<html>`) indique quelle vue est active ; il doit être posé **avant le premier rendu**, donc par un petit script **inline dans le `<head>`** :

```html
<script>
  (function () {
    var view = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'list' : 'gallery';
    try {
      var saved = localStorage.getItem('cards-view');
      if (saved === 'list' || saved === 'gallery') view = saved;
    } catch (error) {}
    document.documentElement.dataset.cards = view;
  })();
</script>
```

### 6.5 — Respecter les préférences de l'utilisateur

- **`prefers-reduced-motion: reduce`** : l'utilisateur demande moins d'animations (vertige, épilepsie, batterie). On affiche **la liste** par défaut.
- **`localStorage`** : un bouton « Afficher en liste / galerie 3D » mémorise son choix. Il est toujours entouré de `try/catch` : `localStorage` peut lancer une exception (navigation privée, stockage bloqué).

```js
const VIEW_KEY = 'cards-view';
function preferredView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'list' || saved === 'gallery') return saved;
  } catch {}
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'list' : 'gallery';
}
```

> **À garder synchronisés à la main** : la logique de `preferredView()` en JS et celle du script du `<head>` sont les mêmes.

### 6.6 — Plusieurs galeries : un renderer par canvas

La page contient plusieurs `.card-canvas-gallery`. Chacune a **son propre** canvas, **son propre** `WebGLRenderer`, sa scène et sa caméra.

| | Un renderer par canvas (choix du projet) | Un renderer unique |
|---|---|---|
| Simplicité | ✔ Chaque galerie est indépendante | ✘ Il faut dessiner dans des zones (*scissor*) |
| Mémoire | ✘ Textures chargées par galerie | ✔ Partage possible |
| Limite | ✘ Un navigateur n'autorise qu'environ 16 contextes WebGL actifs | ✔ Un seul contexte |

Pour une page avec une poignée de galeries, un renderer par canvas est le plus simple. Mais il faut **libérer** proprement le contexte quand on détruit une galerie :

```js
function destroy() {
  renderer.setAnimationLoop(null);
  resizeObserver.disconnect();
  renderer.dispose();
  renderer.forceContextLoss();   // rend le contexte WebGL au navigateur
  restore();
}
```

### 6.7 — Ne dessiner que ce qui est visible : `IntersectionObserver`

Pourquoi continuer à rendre 3 galeries quand 2 sont hors écran ? `IntersectionObserver` signale quand un élément entre ou sort de la fenêtre :

```js
let onScreen = false;
const intersectionObserver = new IntersectionObserver(
  ([entry]) => { onScreen = entry.isIntersecting; },
  { threshold: [0, 0.5] },
);
intersectionObserver.observe(stage);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);   // consommé AVANT le return : pas de saut à la reprise
  if (!onScreen) return;                         // hors écran : on ne fait aucun rendu
  renderer.render(scene, camera);
});
```

- `clock.getDelta()` est appelé **avant** de sortir : sinon, au retour à l'écran, le premier `dt` mesurerait toute la durée d'absence et les animations feraient un bond.
- `Math.min(…, 0.1)` plafonne `dt` : un onglet en arrière-plan puis réactivé ne doit pas provoquer de téléportation.

### Pour aller plus loin
[cartes.html](cartes.html) (script du `<head>`, CSS de réservation de place), [src/cards/gallery.js](src/cards/gallery.js) : `readItems` (57), `buildStage` (108), `createCardGallery` (139), `initCardGalleries` (555).

---

## Étape 7 — Survol et tooltip

### Objectif
Une carte sous le pointeur se soulève et vibre légèrement ; une étiquette 3D la désigne.

### Le **raycast** : « sur quoi pointe la souris ? »

On lance un **rayon** depuis la caméra à travers la position du pointeur, et on regarde les objets qu'il traverse.

```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  // Coordonnées « normalisées » : -1 à 1, avec Y vers le haut
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitboxes, false)[0];   // le plus proche en premier
  hovered = hit ? hit.object.userData.card : null;
});
```

### Piège : ne pas lancer le rayon sur les cartes elles-mêmes

Si la carte survolée **monte**, elle quitte le pointeur ; elle redescend ; elle remonte… ça clignote. La solution : lancer le rayon sur des **plans invisibles immobiles**, placés aux positions de repos.

```js
const hitMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const hitGeometry = new THREE.PlaneGeometry(CARD_SIZE, CARD_SIZE).rotateX(-Math.PI / 2);
const hitboxes = cards.map((card) => {
  const hitbox = new THREE.Mesh(hitGeometry, hitMaterial);
  hitbox.position.copy(card.position);
  hitbox.rotation.copy(card.rotation);
  hitbox.updateMatrixWorld(true);          // le raycaster lit la matrice monde : on la calcule à la main
  hitbox.userData.card = card;
  return hitbox;
});
```

Les hitboxes ne sont **pas ajoutées à la scène** : elles n'existent que pour le raycaster (il lui suffit de recevoir une liste d'objets).

### Le lissage exponentiel

Pour qu'une valeur « glisse » vers sa cible sans jamais saccader, on la rapproche à chaque image d'une fraction de l'écart restant :

```js
state.amount += (target - state.amount) * (1 - Math.exp(-HOVER_SMOOTH * dt));
```

`1 - exp(-k·dt)` donne le même résultat quelle que soit la fréquence d'affichage (60 ou 144 Hz) : c'est la version « indépendante du frame rate » de `amount += (target - amount) * 0.1`.

### Appliquer la pose

À chaque image, pour chaque carte :

```js
card.position.y = rest.position.y + HOVER_LIFT * state.amount;        // se soulève
card.position.x = rest.position.x + state.push * HOVER_NEIGHBOR_PUSH;  // les voisines s'écartent
```

La vibration est une sinusoïde **amortie**, jouée une seule fois à la montée. L'ordre voulu est « écarter les voisines, **puis** monter ; redescendre, **puis** refermer » : c'est une petite machine à états un peu subtile, que vous pouvez simplifier (soulever sans écarter) pour commencer.

### Le tooltip 3D

Une étiquette posée dans la scène (et non en HTML) suit la carte et reste toujours de face :

- Une **puce** : `CircleGeometry`.
- Une **ligne** et un **cadre** : plans qui copient l'orientation de la caméra à chaque image (*billboard*) :

```js
mesh.quaternion.copy(camera.quaternion);   // toujours face à la caméra
```

- Le **texte** : on écrit dans un `<canvas>` 2D (`fillText`, `measureText` pour dimensionner le cadre, `roundRect` pour les coins), puis on l'applique comme texture (`CanvasTexture`) sur un plan.

Pour que le tooltip passe devant tout sans scintiller : `material.polygonOffset` et `mesh.renderOrder`, qui ordonnent le dessin.

### Exercice
Retirez le lissage (`state.amount = target`) : la carte « saute » au lieu de glisser. Puis restaurez-le.

### Pour aller plus loin
[src/cards/hover.js](src/cards/hover.js) (hitboxes lignes 42-53, `cardAt`), [src/cards/tooltip.js](src/cards/tooltip.js).

---

## Étape 8 — Fausse ombre de contact

### Objectif
Une ombre douce sous chaque carte, qui s'estompe quand la carte monte.

### Pourquoi « faux » ?
Les vraies ombres (*shadow maps*) sont coûteuses, et leur rendu sur une table transparente est médiocre. Une **ombre de contact** truquée est plus belle et gratuite : un plan sombre dégradé, posé sous la carte.

### La texture : un dégradé généré à la main

Plutôt que de charger une image, on fabrique la texture dans un tableau d'octets : une **`DataTexture`**.

```js
function createHaloTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);      // 4 octets par pixel : R, G, B, A
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size * 2 - 1) * halfX;   // position en mètres depuis le centre
      const y = ((j + 0.5) / size * 2 - 1) * halfZ;
      // Distance au bord de la carte, normalisée par la marge (distance de Chebyshev : un carré)
      const t = THREE.MathUtils.clamp(
        Math.max((Math.abs(x) - CARD_SIZE / 2) / MARGIN, (Math.abs(y) - CARD_SIZE / 2) / MARGIN_Z),
        0, 1,
      );
      const alpha = (1 - t) ** 2;                      // opaque à l'intérieur, dégradé vers 0 au-dehors
      data.set([0, 0, 0, Math.round(alpha * 255)], (j * size + i) * 4);   // noir, seul l'alpha varie
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
```

La texture est générée **une seule fois** et partagée par toutes les cartes.

### Un plan par carte

```js
const items = cards.map((card) => {
  const mesh = new THREE.Mesh(
    geometry,                                  // un PlaneGeometry partagé, plus grand que la carte
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,       // ne masque rien derrière lui
      toneMapped: false,       // ne reçoit pas le tone mapping : il reste « noir pur »
    }),
  );
  mesh.renderOrder = 1;        // dessiné après la carte
  scene.add(mesh);
  return { card, mesh };
});
```

### Le mettre à jour chaque image

Quand la carte monte, l'ombre **s'élargit** et **s'estompe** :

```js
update() {
  for (const { card, mesh } of items) {
    const lift = Math.max(0, card.position.y - card.userData.rest.position.y);
    const k = 1 - lift / AO_FADE_HEIGHT;          // 1 à plat → 0 à 30 cm
    mesh.visible = k > 0.01;
    if (!mesh.visible) continue;
    mesh.position.set(card.position.x, card.userData.rest.position.y + 0.001, card.position.z);
    mesh.rotation.y = euler.setFromQuaternion(card.quaternion, 'YXZ').y;   // ne garde que la rotation à plat
    mesh.scale.setScalar(1 + lift * AO_SPREAD);
    mesh.material.opacity = AO_STRENGTH * k * k;
  }
}
```

- Le plan est à **la hauteur de repos de la carte + 1 mm** (pas à celle de la carte qui monte) : l'ombre reste « posée » sur la table.
- `euler.setFromQuaternion(q, 'YXZ').y` extrait **seulement** la rotation autour de Y : une carte retournée ou penchée ne fait pas pivoter son ombre n'importe comment.

### Ce qu'il faut retenir
- **Une bonne illusion bat un calcul exact** : un plan, un dégradé, deux lignes de maths.
- `depthWrite: false` + `transparent: true` + `renderOrder` : le trio habituel pour les éléments translucides.

### Pour aller plus loin
[src/cards/contactAO.js](src/cards/contactAO.js) en entier (69 lignes).

---

## Étape 9 — Pioche : courbure et retournement *(avancé)*

### Objectif
Un clic « pioche » la carte : elle se courbe en glissant vers la caméra, s'élève en se retournant, et vient flotter face à nous.

### Une progression unique `p`

Toute l'animation est pilotée par **un seul nombre `p`, de 0 à 1**. À chaque image, une fonction `applyPose(p)` en déduit la position, la rotation, l'échelle et la courbure. Avantages : rejouer à l'envers (reposer la carte) = faire décroître `p`, et on peut « figer » l'animation à n'importe quel `p` pour la déboguer.

```js
function start(card) {
  state = { card, p: 0, target: 1 };            // en route vers 1
}
function update(dt) {
  state.p += (state.target - state.p) * (dt / DURATION);   // ou une progression linéaire clampée
  applyPose(state);
}
```

### Deux phases

1. `p` de 0 à `MOVE_DELAY` : la carte **se courbe et glisse au sol** vers la caméra.
2. Ensuite : elle **monte, en arc**, et se retourne jusqu'à sa pose flottante.

L'**easing** (ici `easeInOutCubic`) adoucit le départ et l'arrivée de chaque phase.

```js
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
```

### Interpoler une rotation : les quaternions

Pour interpoler entre deux orientations, on évite les angles d'Euler (ils produisent des trajectoires étranges, voire un *blocage de cardan*). On utilise des **quaternions** et **`slerp`** (*spherical linear interpolation*) : le chemin le plus court et à vitesse constante entre deux orientations.

```js
card.quaternion.slerpQuaternions(startQuaternion, floatQuaternion, e);
card.position.lerpVectors(startPosition, floatPosition, e);
card.position.y += FLOAT_ARC * Math.sin(Math.PI * e);   // un arc : la carte monte plus haut en cours de route
```

La pose flottante « face caméra » se calcule à partir de **l'orientation de la caméra** : la carte est placée à `FLOAT_DISTANCE` devant elle, avec `card.quaternion = camera.quaternion × rotation de retournement`.

### Courber la carte

On déplace les sommets de la grille. Idée : le bord relevé fait un angle `φ` avec l'horizontale, **qui croît le long de la carte** (`φ(u) = angle · u²`, `u` de 0 à 1). On **intègre** pour placer les rangées de sommets les unes après les autres :

```js
// card.js
export function bendCard(mesh, angle) {
  const rest = mesh.geometry.userData.restPositions;
  const position = mesh.geometry.attributes.position;
  const n = SEGMENTS, row = n + 1, grid = row * row, step = SIZE / n;

  let z = -SIZE / 2;
  let y = 0;
  for (let j = 0; j <= n; j++) {
    if (j > 0) {
      const phiMid = angle * ((j - 0.5) / n) ** 2;     // angle au milieu du segment
      z += step * Math.cos(phiMid);
      y += step * Math.sin(phiMid);
    }
    const phi = angle * (j / n) ** 2;
    const sin = Math.sin(phi), cos = Math.cos(phi);
    for (let i = 0; i <= n; i++) {
      for (const base of [j * row + i, grid + j * row + i]) {      // dos ET face
        const offset = rest[base * 3 + 1];                          // ±e : décalage le long de la normale
        position.setXYZ(base, rest[base * 3], y + cos * offset, z - sin * offset);
      }
    }
  }
  position.needsUpdate = true;       // envoie les nouvelles positions au GPU
  mesh.geometry.computeVertexNormals();   // l'éclairage doit suivre la forme
}
```

C'est pour cela qu'on avait gardé `restPositions` (étape 2) : on repart **toujours des positions de repos**, jamais du résultat de l'image précédente (sinon les erreurs s'accumulent).

`bend` lui-même suit une courbe en deux temps : il **monte vite** jusqu'à `BEND_PEAK` (35 % de la progression), puis se **relâche**.

### Rendre la face « sans éclairage »

Pour que le tableau flottant soit affiché fidèlement (pas assombri par le spot), on fait glisser le matériau vers « émissif pur » : couleur noire + `emissiveMap` = la texture elle-même.

```js
function setUnlit(card, k) {          // k = 0 : éclairée ; k = 1 : texture brute
  const m = card.material[1];
  m.emissiveIntensity = k;
  m.color.setScalar(1 - k);
}
```

### Ce qu'il faut retenir
- **Un seul paramètre `p`** pour toute une animation complexe : plus simple à déboguer, réversible.
- **Quaternion + slerp** pour les rotations ; **lerp** pour les positions.
- Après avoir modifié `position` d'une `BufferGeometry` : `needsUpdate = true`, et recalculer les normales si l'éclairage compte.

### Pour aller plus loin
[src/cards/flow.js](src/cards/flow.js) : `applyPose` (110-154), `computeFloatPose` (68-100) ; [src/cards/card.js](src/cards/card.js) : `bendCard` (148-179).

---

## Étape 10 — Plein écran et rendu en deux passes *(avancé)*

### Objectif
La carte flottante est affichée en grand, au premier plan, avec un panneau de texte ; le reste de la page s'efface.

### 10.1 — Agrandir le canvas sans toucher à la mise en page

Pour que la carte flotte sur **toute la fenêtre**, le canvas doit sortir de la colonne de l'article. Mais si on le sort du flux, la page *saute* (la place qu'il occupait disparaît). Solution : le bloc `stage` **garde sa taille** (il réserve la place) ; seul le bloc interne `view`, qui contient le canvas, passe en `position: fixed` et grandit.

```css
.cards-view.is-expanded { position: fixed; z-index: 50; }
html { scrollbar-gutter: stable; }   /* la barre de défilement reste réservée : pas de saut quand on bloque le scroll */
```

Le canvas passe de la taille du bloc à celle de la fenêtre en interpolant `left`, `top`, `width`, `height` avec la progression `k` :

```js
function applyExpansion(k) {
  const from = stage.getBoundingClientRect();
  const left   = THREE.MathUtils.lerp(from.left, 0, k);
  const top    = THREE.MathUtils.lerp(from.top, 0, k);
  const width  = THREE.MathUtils.lerp(from.width, document.documentElement.clientWidth, k);
  const height = THREE.MathUtils.lerp(from.height, window.innerHeight, k);
  document.documentElement.style.overflow = 'hidden';   // pas de défilement derrière
  view.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
  resizeView(width, height, left - from.left, top - from.top);
}
```

### 10.2 — Une fenêtre plus grande sur la **même** scène : `setViewOffset`

Quand le canvas grandit, on ne veut pas que la table « bouge » : elle doit rester à la même place à l'écran. Plutôt que de recalculer le cadrage, on garde la caméra telle quelle et on lui dit : « *ta vue complète fait W×H ; je ne dessine que ce rectangle-ci, plus grand* ». C'est le rôle de `camera.setViewOffset`.

```js
function resizeView(width, height, x = 0, y = 0) {
  const fullW = stage.clientWidth;      // la taille « de référence » : celle de la scène dans la page
  const fullH = stage.clientHeight;
  camera.aspect = fullW / fullH;        // le ratio ne bouge pas
  if (x !== 0 || y !== 0 || width !== fullW || height !== fullH) {
    camera.setViewOffset(fullW, fullH, x, y, width, height);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
```

### 10.3 — Dessiner la carte flottante **par-dessus** tout : deux passes

Une carte qui s'élève ne doit **jamais** être masquée par une autre carte ou le tooltip : elle doit passer devant tout. Mais elle conserve sa propre profondeur (sa courbure). Technique : **deux rendus successifs**, avec un `clearDepth()` entre les deux.

- Les **calques** (`layers`) permettent de ranger les objets en groupes numérotés (0 à 31). Une caméra ne dessine que les calques qu'elle a activés.

```js
renderer.autoClear = false;     // on gère l'effacement nous-mêmes

card.layers.set(p >= riseStart ? 1 : 0);   // une carte qui s'élève passe sur le calque 1
spot.layers.enable(1);                      // les lumières doivent éclairer aussi le calque 1
hemi.layers.enable(1);

// À chaque image :
renderer.clear();
camera.layers.set(0);
renderer.render(scene, camera);              // 1) la table

if (foreground) {
  renderer.clearDepth();                     // on oublie les profondeurs de la table…
  camera.layers.set(1);
  renderer.render(scene, camera);            // 2) la carte flottante, par-dessus
}
camera.layers.enableAll();                   // les raycasts doivent voir TOUS les calques
```

> **Piège** : les raycasts (survol, clic) tiennent compte des calques. Si la caméra est restée sur le calque 1, plus rien n'est détecté. D'où le `enableAll()` à la fin de chaque image.

### 10.4 — Un voile sombre « en coordonnées écran »

Pour assombrir la table derrière la carte flottante, on dessine un plan plein écran, entre les deux passes. Un `ShaderMaterial` avec un vertex shader minimal ignore la caméra : les sommets sont directement en coordonnées d'écran (-1 à 1).

```js
const shade = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0x000000) } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uOpacity; uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, uOpacity); }',
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }),
);
shade.frustumCulled = false;
shade.renderOrder = 1000;
```

C'est un premier contact avec le **GLSL** : deux lignes de code qui s'exécutent sur le GPU. `gl_Position` = où va le sommet ; `gl_FragColor` = la couleur du pixel.

### 10.5 — Le panneau HTML

Un `<aside role="dialog">` avec titre, description et boutons ‹ › ×. API minimale : `show(data)`, `hide()`, `setBusy(…)`. À la fermeture, le **focus est rendu** à l'élément qui l'avait avant (le `stage`) : un utilisateur clavier ne se retrouve pas « perdu » en haut de page.

### Pour aller plus loin
[src/cards/gallery.js](src/cards/gallery.js) : `resizeView` (246), `applyExpansion` (275), `shade` (190-204), boucle de rendu (453-465) ; [src/cards/panel.js](src/cards/panel.js) ; [src/cards/panel.css](src/cards/panel.css).

---

## Étape 11 — Accessibilité, clavier, navigation entre galeries et scroll *(avancé)*

### 11.1 — Utilisable au clavier

Le `stage` est focalisable (`tabIndex = 0`). Quand il a le focus :

| Touche | Sur la table | Carte flottante |
|---|---|---|
| ← / → | Sélectionne la carte précédente / suivante (comme un survol) | Précédente / suivante |
| Entrée | Pioche la carte sélectionnée | — |
| Échap | Désélectionne | Repose la carte |

```js
stage.addEventListener('keydown', (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;   // ne pas capter les raccourcis du navigateur
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (step) {
    event.preventDefault();       // pas de défilement horizontal de la page
    // … choisir la carte suivante / précédente, en bouclant : (i + step + n) % n
  } else if (event.key === 'Enter') {
    // … piocher
  } else if (event.key === 'Escape') {
    // … reposer
  }
});
```

Le **survol et la sélection clavier partagent la même logique** : `hover.select(card)` fait exactement ce que ferait le pointeur. Pas de code dupliqué.

### 11.2 — Lecteurs d'écran

- Le canvas est `aria-hidden="true"` : il est purement visuel.
- La **liste d'origine** (cachée par `.sr-only`) porte tout le contenu.
- Un paragraphe d'aide (`.sr-only`) est relié au `stage` par `aria-describedby` :

```js
const help = document.createElement('p');
help.className = 'sr-only';
help.id = 'cards-help-1';
help.textContent = 'Galerie interactive : flèches gauche et droite pour choisir une carte, Entrée pour l’ouvrir, Échap pour la fermer. La liste des tableaux se trouve juste après.';
stage.setAttribute('aria-describedby', help.id);
```

- Le panneau a `role="dialog"`, `aria-labelledby` et `aria-live`.

> **À tester** avec un vrai lecteur d'écran (VoiceOver, NVDA) : c'est la seule façon de savoir ce que vivent vraiment vos utilisateurs. Les points perfectibles : le `role="dialog"` sans « piège à focus » ni `aria-modal`.

### 11.3 — Navigation entre galeries

Quand on sort d'une galerie avec ‹ ›, on peut passer à la **galerie suivante de la page** : la carte est reposée, la page défile jusqu'à la galerie voisine, et la bonne carte s'ouvre. Ceci s'orchestre avec une file de **rappels** (*callbacks*) et un **jeton d'annulation** :

```js
let handoffToken = 0;
function navigateAcross(from, step) {
  const to = registry[(registry.indexOf(from) + step + registry.length) % registry.length];
  const token = ++handoffToken;           // chaque transfert a son jeton
  from.leave();
  from.whenClosed(async () => {           // exécuté quand le canvas est revenu dans la page
    if (token !== handoffToken) return;   // un autre transfert a démarré entre-temps : on annule
    await to.scrollIntoView();
    if (token !== handoffToken) return;
    to.openAt(step > 0 ? 0 : to.count - 1);
  });
}
```

**Le jeton d'annulation** est un motif à connaître : une opération asynchrone, qui peut être remplacée avant d'être terminée, compare le jeton reçu au jeton actuel avant chaque étape.

### 11.4 — L'inclinaison de la caméra suit le défilement

Un petit effet de « vie » : plus on descend dans la page, plus la caméra s'incline, de ±5° autour de 50° :

```js
const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
const progress = maxScroll > 0 ? THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1) : 0.5;
const targetTilt = 50 + (progress * 2 - 1) * 5;                 // 45° en haut de page, 55° en bas
const next = tiltDeg + (targetTilt - tiltDeg) * (1 - Math.exp(-8 * dt));   // même lissage qu'à l'étape 7
if (Math.abs(next - tiltDeg) > 0.0005) {
  tiltDeg = next;
  placeCamera();
}
```

On ne relance `placeCamera()` que si l'inclinaison a réellement changé : inutile de recalculer à chaque image quand la page est immobile.

### 11.5 — `scrollIntoView` qui attend la fin

`element.scrollIntoView({ behavior: 'smooth' })` ne dit pas **quand** il a fini. Pour enchaîner une action à l'arrivée, le projet réimplémente un petit utilitaire basé sur `requestAnimationFrame` (voir `scrollIntoViewAndWait`). En mode `prefers-reduced-motion`, le défilement est instantané.

### Pour aller plus loin
[src/cards/gallery.js](src/cards/gallery.js) : clavier (379-400), `navigateAcross` (85), défilement (433-443) ; [src/cards/panel.js](src/cards/panel.js) (focus, `aria-*`).

---

## Glossaire

| Terme | Définition |
|---|---|
| **Scene** | L'arbre de tous les objets à dessiner |
| **Mesh** | Objet visible = géométrie + matériau |
| **BufferGeometry** | Une forme : sommets, UV, triangles, normales |
| **Index / groupe** | Liste des triangles ; un groupe applique un matériau différent à une portion de l'index |
| **Normale** | Vecteur perpendiculaire à une surface ; sert à l'éclairage |
| **UV** | Coordonnées (0-1) qui lient un sommet à un point de la texture |
| **Back-face culling** | Un triangle n'est dessiné que vu de face |
| **Z-fighting** | Scintillement de deux surfaces quasi confondues |
| **CanvasTexture / DataTexture** | Textures fabriquées par le code (dessin 2D / tableau d'octets) |
| **sRGB / linéaire** | Deux encodages des couleurs ; les calculs de lumière se font en linéaire |
| **Tone mapping** | Compression des valeurs lumineuses vers la plage affichable |
| **FOV** | Champ de vision vertical |
| **Raycast** | Rayon lancé depuis la caméra pour trouver l'objet sous le pointeur |
| **Hitbox** | Objet invisible dont le seul rôle est de recevoir le raycast |
| **Lerp / slerp** | Interpolation linéaire entre deux valeurs / entre deux orientations (quaternions) |
| **Quaternion** | Représentation d'une rotation sans blocage de cardan |
| **Easing** | Fonction qui adoucit une progression |
| **Billboard** | Objet qui fait toujours face à la caméra |
| **Layers** | Groupes numérotés (0-31) permettant de choisir ce que la caméra dessine |
| **renderOrder** | Ordre de dessin forcé pour les objets transparents |
| **setViewOffset** | Dessiner un sous-rectangle d'une vue plus grande, sans changer le cadrage |
| **ResizeObserver** | Notifie quand un élément change de taille |
| **IntersectionObserver** | Notifie quand un élément entre ou sort de la fenêtre |
| **Amélioration progressive** | Une page utile sans JS, enrichie quand il est disponible |
| **prefers-reduced-motion** | Préférence système de l'utilisateur : moins d'animations |
| **`.sr-only`** | Contenu caché visuellement mais lu par les lecteurs d'écran |
