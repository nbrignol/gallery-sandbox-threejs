# Atelier Three.js — Construire une galerie 3D (page `index`)

Une galerie virtuelle dans le navigateur : des salles carrées reliées entre elles, des tableaux encadrés accrochés aux murs, et une navigation « de tableau en tableau » au clic.

On part d'un canvas vide et on ajoute **une notion à la fois**. Chaque étape produit quelque chose de visible, et ne dépend que des précédentes.

> **Public visé** : vous connaissez JavaScript (modules ES, `async/await`, classes, événements DOM). Vous n'avez pas besoin de connaître Three.js ni WebGL.

---

## Sommaire

| # | Étape | Ce qu'on voit à la fin |
|---|---|---|
| 0 | Mise en place | Un projet Vite qui tourne |
| 1 | Canvas, scène, caméra, cube | Un cube qui tourne |
| 2 | Redimensionnement | Le rendu suit la fenêtre |
| 3 | Une cellule (sol, murs, plafond) | Une pièce vide |
| 4 | De la grille à la salle | Une salle en L |
| 5 | Textures et matériaux PBR | Parquet et enduit |
| 6 | Lumières et environnement | Une pièce éclairée |
| 7 | Plinthes et séparateurs | Du relief sur les murs |
| 8 | Un tableau encadré | Un tableau avec son cadre |
| 9 | Spots et ombres | Tableaux éclairés, cadres qui projettent une ombre |
| 10 | Navigation : regarder et se déplacer | Glisser pour tourner, aller vers un point de vue |
| 11 | Clic, survol, panneau *(avancé)* | Clic sur un tableau → déplacement + panneau |
| 12 | Modèles glTF et vue du dessus *(avancé)* | Un banc, des plantes, une vue de dessus |
| 13 | Finitions *(avancé)* | Occlusion ambiante, qualité auto, préchargeur |
| — | Glossaire | |

Les étapes 1 à 10 forment le **socle** de l'atelier. Les étapes 11 à 13 sont des approfondissements.

### Convention : « Pour aller plus loin »

Chaque étape se termine par des renvois vers le **projet de référence** (`src/…`). Les extraits de code de l'atelier sont des versions **simplifiées** : ils vont à l'essentiel, le projet de référence ajoute les cas particuliers.

---

## Étape 0 — Mise en place

### Prérequis
- Node.js ≥ 18, un éditeur, un navigateur récent.

### Création du projet

```bash
npm create vite@latest galerie -- --template vanilla
cd galerie
npm install three
npm run dev
```

Vite sert la page et recharge à chaque sauvegarde. Les fichiers du dossier `public/` sont servis tels quels à la racine du site (`public/textures/x.jpg` → `/textures/x.jpg`).

### Conventions de tout le projet

- **1 unité Three.js = 1 mètre.** Une pièce fait 6 unités de large, un plafond 3,5.
- **L'axe Y pointe vers le haut.** Le sol est donc dans le plan **XZ**.
- Les valeurs réglables (tailles, intensités, durées) sont rangées dans un seul fichier `config.js` : on y touche sans fouiller le code.

### Structure cible

```
index.html
src/
  main.js          # renderer, scène, caméra, boucle
  config.js        # constantes
  data/            # les données (grille, tableaux)
  world/           # tout ce qu'on voit dans la scène 3D
  nav/             # déplacement et interactions
  ui/              # éléments HTML (panneau, préchargeur…)
```

---

## Étape 1 — Canvas, scène, caméra, cube

### Objectif
Afficher un cube qui tourne, en plein écran.

### Les quatre objets de base

Un rendu Three.js, c'est **toujours** les mêmes ingrédients :

| Objet | Rôle |
|---|---|
| `Scene` | Le « décor » : un arbre d'objets 3D |
| `PerspectiveCamera` | Le point de vue : position, orientation, champ de vision |
| `WebGLRenderer` | Dessine la scène vue par la caméra dans un `<canvas>` |
| La boucle | Appelle `renderer.render(scene, camera)` à chaque image |

Un objet visible est un **`Mesh`** = une **géométrie** (la forme) + un **matériau** (l'aspect).

### Le HTML

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Galerie</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; }
      canvas { position: fixed; inset: 0; display: block; width: 100vw; height: 100dvh; }
    </style>
  </head>
  <body>
    <canvas id="scene"></canvas>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`position: fixed; inset: 0` plaque le canvas sur toute la fenêtre. `100dvh` tient compte des barres du navigateur mobile.

### `src/main.js`

```js
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// FOV vertical (degrés), ratio, plan proche, plan lointain
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 3);

// Un cube de test : géométrie + matériau
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial(), // colore selon l'orientation des faces : aucune lumière nécessaire
);
scene.add(cube);

const timer = new THREE.Timer();
timer.connect(document); // se met en pause quand l'onglet est masqué

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = timer.getDelta(); // secondes écoulées depuis l'image précédente
  cube.rotation.y += dt;
  renderer.render(scene, camera);
});
```

### Ce qu'il faut retenir
- **`setSize(w, h, false)`** : le 3ᵉ argument `false` empêche Three.js de modifier le style CSS du canvas. C'est le CSS qui décide de la taille affichée.
- **`setAnimationLoop`** remplace `requestAnimationFrame` : il gère aussi la réalité virtuelle, et se coupe proprement.
- **`dt`** : on anime avec le **temps écoulé**, pas avec un nombre de pixels par image. Ainsi l'animation va à la même vitesse sur un écran 60 Hz et 144 Hz.
- Le **FOV** (champ de vision vertical) de 60° ressemble à l'œil humain sans trop déformer.

### Exercice
Remplacez `MeshNormalMaterial` par `MeshStandardMaterial({ color: 0xff8844 })`. Pourquoi le cube devient-il noir ? *(Réponse : ce matériau réagit à la lumière, et il n'y en a pas encore — voir étape 6.)*

### Pour aller plus loin
`createRenderer`, `createScene`, `createCamera` et `startLoop` dans [src/main.js](src/main.js).

---

## Étape 2 — Redimensionnement et pixel ratio

### Objectif
Le rendu reste net et sans déformation quand on redimensionne la fenêtre ou qu'on change d'écran.

```js
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix(); // OBLIGATOIRE après avoir changé aspect/fov/near/far
}
window.addEventListener('resize', onResize);
onResize(); // une première fois au démarrage
```

### Ce qu'il faut retenir
- **`devicePixelRatio`** : sur un écran « retina », 1 pixel CSS = 2×2 pixels physiques. Sans `setPixelRatio`, l'image est floue. On le **plafonne à 2** : au-delà, le coût GPU explose pour un gain invisible.
- **`updateProjectionMatrix()`** : la caméra précalcule une matrice à partir de ses paramètres. Si vous changez `aspect`, il faut la recalculer, sinon rien ne bouge.
- Appeler `onResize()` une fois au démarrage évite de dupliquer le code d'initialisation.

### Pour aller plus loin
`setupResize` dans [src/main.js](src/main.js) (elle sert aussi à régler la résolution en mode « Low », étape 13).

---

## Étape 3 — Une cellule : sol, plafond, murs

### Objectif
Construire une pièce carrée vide et s'y placer à hauteur d'yeux.

### Idée directrice
La galerie est faite de **cellules carrées** de 6 m. Une cellule = un `Group` contenant un sol, un plafond et des murs. Un **`Group`** est un objet invisible qui sert de « dossier » : on le déplace, on le tourne, et tout son contenu suit.

### Les constantes (`config.js`)

```js
export const CELL_SIZE = 6;          // côté d'une cellule (m)
export const CEILING_HEIGHT = 3.5;   // hauteur sous plafond (m)
export const EYE_HEIGHT = 1.6;       // hauteur des yeux (m)
```

### Le plan : une surface, ça se tourne

`PlaneGeometry(w, h)` crée un rectangle **dans le plan XY, face tournée vers +Z**. Pour en faire un sol, on le couche :

```js
// world/cell.js
import * as THREE from 'three';
import { CEILING_HEIGHT } from '../config.js';

const floorMaterial   = new THREE.MeshStandardMaterial({ color: 0x8a7a66 });
const wallMaterial    = new THREE.MeshStandardMaterial({ color: 0xdddddd });
const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

function createFloor(size) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMaterial);
  floor.rotation.x = -Math.PI / 2;   // couché, face visible vers le HAUT
  return floor;
}

function createCeiling(size) {
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;  // face visible vers le BAS
  ceiling.position.y = CEILING_HEIGHT;
  return ceiling;
}
```

> **Piège n°1 : une face n'est visible que d'un côté.** Par défaut, Three.js ne dessine un triangle que s'il est vu « de face » (c'est le *back-face culling*). Un plan mal orienté est **invisible**. D'où le signe des rotations : `-π/2` pour le sol, `+π/2` pour le plafond.

### Les murs : une normale « vers l'intérieur »

Chaque mur est orienté pour regarder **vers l'intérieur** de la pièce. On décrit chaque côté par sa **normale intérieure** `(nx, nz)` :

```js
// Côtés dans l'ordre fixe N, E, S, O.
// (di, dj) : décalage vers la cellule voisine sur la grille ; normal : direction vers l'intérieur.
export const SIDES = [
  { name: 'N', di: 0,  dj: -1, normal: [0, 1]  },
  { name: 'E', di: 1,  dj: 0,  normal: [-1, 0] },
  { name: 'S', di: 0,  dj: 1,  normal: [0, -1] },
  { name: 'O', di: -1, dj: 0,  normal: [1, 0]  },
];

function createWall(size, side) {
  const [nx, nz] = side.normal;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(size, CEILING_HEIGHT), wallMaterial);
  // Le mur est à size/2 du centre, du côté opposé à sa normale intérieure
  wall.position.set((-nx * size) / 2, CEILING_HEIGHT / 2, (-nz * size) / 2);
  // Un plan regarde +Z par défaut : on le fait pivoter autour de Y pour qu'il regarde (nx, nz)
  wall.rotation.y = Math.atan2(nx, nz);
  return wall;
}
```

`Math.atan2(nx, nz)` donne l'angle de rotation autour de Y qui amène « +Z » vers la direction `(nx, nz)`. Vérifions : pour le mur nord, `normal = [0, 1]` → angle `atan2(0, 1) = 0` : pas de rotation, il regarde bien vers +Z (vers l'intérieur de la pièce, puisque le mur nord est en `z = -3`).

### Assembler la cellule

```js
export function createCell(size, wallSides) {
  const group = new THREE.Group();
  group.add(createFloor(size), createCeiling(size));
  for (const side of SIDES) {
    if (wallSides.includes(side.name)) group.add(createWall(size, side));
  }
  return group;
}
```

Dans `main.js` :

```js
import { createCell } from './world/cell.js';
import { CELL_SIZE, EYE_HEIGHT } from './config.js';

scene.add(createCell(CELL_SIZE, ['N', 'E', 'S', 'O']));
camera.position.set(0, EYE_HEIGHT, 0); // au centre de la pièce, à hauteur d'yeux
```

Sans lumière, tout est noir : on met temporairement `MeshBasicMaterial` (insensible à la lumière) ou on passe à l'étape 6 pour voir les surfaces éclairées.

### Exercice
Faites tourner la caméra avec `camera.rotation.y = 1` : regardez les quatre murs. Que se passe-t-il si vous retirez la rotation d'un mur ?

### Pour aller plus loin
`createFloor`, `createCeiling`, `createWall`, `SIDES` et `createCell` dans [src/world/cell.js](src/world/cell.js).

---

## Étape 4 — De la grille à la salle

### Objectif
Décrire un bâtiment avec une simple matrice de 0 et de 1, et générer les murs automatiquement.

### Les données

```js
// data/galleries.js
export const grid = [
  [1, 1],
  [1, 0],
];   // un « L » de 3 cellules
```

1 = cellule de salle, 0 = vide. Les lignes vont du nord vers le sud, les colonnes de l'ouest vers l'est.

### De la matrice à une liste de cellules

```js
// world/grid.js
export function gridToCells(grid) {
  const cells = [];
  grid.forEach((row, j) => {
    row.forEach((value, i) => {
      if (value) cells.push([i, j]);   // i = colonne, j = ligne
    });
  });
  return cells;
}
```

L'**ordre de lecture** (ligne par ligne, de gauche à droite) donne à chaque cellule un **index** (0, 1, 2…). On s'en sert ensuite pour associer des tableaux aux salles.

### La règle d'or : un mur seulement s'il n'y a pas de voisin

C'est ce qui rend le code **sans cas particulier** : l'angle rentrant du L se gère tout seul.

```js
// world/room.js
import * as THREE from 'three';
import { CELL_SIZE } from '../config.js';
import { SIDES, createCell } from './cell.js';

export function createRoom(cells) {
  const group = new THREE.Group();
  const has = (i, j) => cells.some(([ci, cj]) => ci === i && cj === j);

  for (const [i, j] of cells) {
    // Les côtés pour lesquels il n'y a PAS de cellule voisine
    const wallSides = SIDES.filter((s) => !has(i + s.di, j + s.dj)).map((s) => s.name);
    const cell = createCell(CELL_SIZE, wallSides);
    cell.position.set(i * CELL_SIZE, 0, j * CELL_SIZE);   // la cellule (i, j) est placée sur le plan XZ
    group.add(cell);
  }
  return group;
}
```

Dans `main.js` :

```js
import { gridToCells } from './world/grid.js';
import { createRoom } from './world/room.js';
import { grid } from './data/galleries.js';

scene.add(createRoom(gridToCells(grid)));
```

### Ce qu'il faut retenir
- **Séparer les données de la 3D** : modifier la grille suffit à changer le bâtiment. Essayez `[[1,1,1],[0,1,0]]`.
- Les coordonnées de grille `(i, j)` deviennent des coordonnées monde `(i·6, 0, j·6)`.
- **`Group.position`** déplace toute la cellule : les murs gardent leurs coordonnées *locales*.

### Pour aller plus loin
- [src/world/grid.js](src/world/grid.js) : validation de la grille, détection d'îlots (parcours en largeur).
- [src/world/room.js](src/world/room.js) : `getWallSides`, et surtout `getWallData` qui précalcule, pour chaque mur, son centre, sa normale, son axe « gauche → droite » et sa largeur — des informations indispensables pour poser les tableaux (étape 8).
- [src/data/galleries.js](src/data/galleries.js) : plusieurs configurations de bâtiment.

---

## Étape 5 — Textures et matériaux PBR

### Objectif
Remplacer les couleurs unies par un parquet et un enduit réalistes.

### Qu'est-ce qu'un matériau PBR ?
**PBR** = *Physically Based Rendering*. Le matériau décrit des propriétés physiques, et la lumière fait le reste. Le `MeshStandardMaterial` accepte plusieurs **cartes** (textures) :

| Carte | Rôle | Espace colorimétrique |
|---|---|---|
| `map` | La couleur de base (albedo) | **sRGB** |
| `normalMap` | Simule du relief sans ajouter de triangles | linéaire |
| `roughnessMap` | Rugosité : mat ↔ brillant | linéaire |

> **Piège n°2 : l'espace colorimétrique.** Une image couleur est stockée en sRGB, mais les calculs de lumière se font en linéaire. Il faut **dire à Three.js** que la texture de couleur est en sRGB : `texture.colorSpace = THREE.SRGBColorSpace`. Pour les cartes de normales et de rugosité, on ne touche à rien (ce ne sont pas des couleurs). Oublier ce réglage donne des couleurs délavées.

### Où trouver des textures
Sources **CC0** (libres de droits) : [Poly Haven](https://polyhaven.com/textures) et [ambientCG](https://ambientcg.com). Prenez la résolution **1K**, au format JPG, et la version **GL** de la carte de normales. Rangez-les ainsi :

```
public/textures/diagonal_parquet/color.jpg
public/textures/diagonal_parquet/normal.jpg
public/textures/diagonal_parquet/roughness.jpg
```

### Charger un matériau complet

```js
// world/materials.js
import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function loadMap(folder, file, isColor = false) {
  const texture = loader.load(`/textures/${folder}/${file}`);
  texture.wrapS = THREE.RepeatWrapping;   // la texture se répète horizontalement…
  texture.wrapT = THREE.RepeatWrapping;   // … et verticalement
  texture.anisotropy = 8;                  // netteté à angle rasant (sol vu de loin)
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPbrMaterial(folder) {
  return new THREE.MeshStandardMaterial({
    map: loadMap(folder, 'color.jpg', true),
    normalMap: loadMap(folder, 'normal.jpg'),
    roughnessMap: loadMap(folder, 'roughness.jpg'),
    roughness: 1,   // multiplie la carte de rugosité
  });
}

// `size` = taille RÉELLE d'un motif de texture, en mètres
export const FLOOR = { folder: 'diagonal_parquet', size: 2.36 };
export const WALL  = { folder: 'plaster001',       size: 2 };

export const floorMaterial = createPbrMaterial(FLOOR.folder);
export const wallMaterial  = createPbrMaterial(WALL.folder);
```

### Le piège des UV : la texture est étirée !

Un `PlaneGeometry` a des **coordonnées de texture (UV)** de 0 à 1 sur toute sa surface. Un sol de 6 m entier recevrait donc *une seule* copie du parquet, démesurée. Il faut **réécrire les UV en mètres** :

```js
// Recalcule les UV d'un plan : fn(x, y) → [u, v] en « nombre de motifs »
function mapUV(geometry, fn) {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const [u, v] = fn(position.getX(i), position.getY(i));
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}
```

Pour le sol, avec `origin` la position monde de la cellule :

```js
function createFloor(size, origin) {
  const geometry = new THREE.PlaneGeometry(size, size);
  // u = position monde en X / taille du motif ; idem pour v
  mapUV(geometry, (x, y) => [(origin.x + x) / FLOOR.size, (y - origin.z) / FLOOR.size]);
  const floor = new THREE.Mesh(geometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  return floor;
}
```

Et pour un mur, on mesure la distance le long du mur (`along`) et la hauteur :

```js
mapUV(geometry, (x, y) => [(along + x) / WALL.size, (y + CEILING_HEIGHT / 2) / WALL.size]);
```

**Pourquoi des UV en *coordonnées monde* ?** Deux bénéfices :
1. **Échelle constante** : 1 m de parquet fait toujours la même taille à l'écran, quelle que soit la taille de la pièce.
2. **Raccord entre cellules** : deux cellules voisines lisent la *même* zone de texture à leur frontière, il n'y a pas de couture visible.

Pour que `createFloor` connaisse `origin`, on le passe depuis `createRoom` (`createCell(CELL_SIZE, wallSides, origin)` avec `origin = { x: i * CELL_SIZE, z: j * CELL_SIZE }`).

> **Piège n°3 : le signe sur le sol.** Après la rotation `-π/2` autour de X, l'axe `y` local du plan devient l'axe `-z` du monde. D'où `(y - origin.z)` et non `(y + origin.z)` pour l'axe v. Si le motif est inversé ou ne raccorde pas, c'est ici qu'il faut regarder.

### Matériaux partagés
`floorMaterial` et `wallMaterial` sont créés **une seule fois** et partagés par toutes les cellules : une seule copie des textures en mémoire GPU.

### Exercice
Changez `FLOOR.size` à `0.5`, puis à `10` : le parquet se densifie ou s'agrandit. Gardez une valeur réaliste.

### Pour aller plus loin
- [src/world/materials.js](src/world/materials.js) : le catalogue de textures, le suivi de chargement, le matériau physique du sol (`MeshPhysicalMaterial` pour régler `specularIntensity`).
- [src/world/cell.js](src/world/cell.js) : `mapUV` (lignes 30-41), UV du sol (57-65) et des murs (94-109).

---

## Étape 6 — Lumières et environnement

### Objectif
Éclairer la salle de façon crédible.

### Les lumières utilisées

| Lumière | Comportement | Usage ici |
|---|---|---|
| `HemisphereLight(ciel, sol, intensité)` | Lumière d'ambiance : éclaire en haut avec la couleur « ciel », en bas avec la couleur « sol » | Éviter les zones totalement noires |
| `PointLight(couleur, intensité, distance, decay)` | Une ampoule : rayonne dans toutes les directions | Une lampe au plafond de chaque cellule |

```js
// world/lights.js
import * as THREE from 'three';
import { CEILING_HEIGHT } from '../config.js';

export function createGlobalLight() {
  // La couleur « sol » éclaire les faces tournées vers le bas (le plafond) : elle doit rester claire
  return new THREE.HemisphereLight(0xffffff, 0xd9d2c7, 0.5);
}

export function createCellLight(x, z) {
  const light = new THREE.PointLight(0xfff2e0, 5, 0, 2);   // intensité en candelas ; 0 = portée infinie ; decay 2 = physique
  light.position.set(x, CEILING_HEIGHT - 1.2, z);           // sous le plafond
  return light;
}
```

Dans `createRoom`, on ajoute `createGlobalLight()` une fois, et `createCellLight(origin.x, origin.z)` pour chaque cellule.

### L'environnement : de la lumière sans image à charger

Les matériaux PBR ont besoin d'une **carte d'environnement** (ce qu'il y a « autour ») pour produire des reflets et une ambiance douce. Three.js fournit `RoomEnvironment`, une petite pièce de studio générée par le code :

```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;   // on l'atténue : c'est un complément
pmrem.dispose();
```

`PMREMGenerator` prétraite l'image pour que les reflets soient justes selon la rugosité du matériau.

### Le tone mapping

Les calculs de lumière produisent des valeurs au-delà de « blanc » (> 1). Le **tone mapping** les ramène dans la plage affichable, sans « brûler » les zones claires :

```js
renderer.toneMapping = THREE.NeutralToneMapping;   // respecte les couleurs des tableaux
renderer.toneMappingExposure = 1;
```

### Ce qu'il faut retenir
- Une scène 3D se lit **toujours** avec : une lumière d'ambiance (pas de noir total) + des lumières ponctuelles (relief et ambiance) + éventuellement un environnement (reflets).
- **`decay = 2`** : l'intensité décroît avec le carré de la distance, comme dans la réalité.
- **Le tone mapping** est un réglage global du renderer, pas des matériaux.

### Exercice
Mettez `scene.environmentIntensity` à 0, puis à 1, et notez l'effet sur le sol. Pourquoi cela peut-il créer un gros reflet blanc à angle rasant ? *(Les matériaux lisses reflètent d'autant plus que l'angle est rasant : c'est l'effet Fresnel. Le projet de référence donne donc au sol son propre `envMapIntensity` plus faible.)*

### Pour aller plus loin
[src/world/lights.js](src/world/lights.js), [src/main.js](src/main.js) `createScene` (lignes 64-81), valeurs dans [src/config.js](src/config.js) (section « Éclairage »).

---

## Étape 7 — Plinthes et séparateurs

### Objectif
Ajouter un peu de relief aux murs pour casser l'aspect « boîte plate ».

### `BoxGeometry` et ses UV
Une plinthe est une **boîte** fine collée au mur. `BoxGeometry(largeur, hauteur, profondeur)` possède 6 faces, chacune avec ses propres UV allant de 0 à 1 : même problème qu'à l'étape 5. On réécrit donc les UV **selon l'orientation de chaque face**, en lisant sa normale :

```js
function mapBoxUV(geometry, along, centerY, textureSize) {
  const position = geometry.attributes.position;
  const normal   = geometry.attributes.normal;
  const uv       = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    let u, v;
    if (Math.abs(normal.getZ(i)) > 0.5)      [u, v] = [along + x, centerY + y];  // faces avant/arrière
    else if (Math.abs(normal.getY(i)) > 0.5) [u, v] = [along + x, z];            // dessus/dessous
    else                                     [u, v] = [z, centerY + y];          // côtés
    uv.setXY(i, u / textureSize, v / textureSize);
  }
  uv.needsUpdate = true;
}
```

### Placer la plinthe

```js
function createPlinth(size, side, origin, { height, bottom, depth }) {
  const [nx, nz] = side.normal;
  const geometry = new THREE.BoxGeometry(size, height, depth);
  mapBoxUV(geometry, alongOrigin(side, origin), bottom + height / 2, 2);
  const plinth = new THREE.Mesh(geometry, plinthMaterial);
  const offset = size / 2 - depth / 2;                     // centre de la boîte, DEVANT le mur
  plinth.position.set(-nx * offset, bottom + height / 2, -nz * offset);
  plinth.rotation.y = Math.atan2(nx, nz);
  return plinth;
}
```

- `bottom = 0` pour la plinthe basse, `bottom = CEILING_HEIGHT - height` pour la plinthe haute.
- `depth` ≈ 3 cm : assez pour accrocher la lumière, assez peu pour ne pas gêner.

### Éviter le « z-fighting »
Si deux surfaces sont **exactement** au même endroit (une plinthe dont le dos est à 0 mm du mur), le GPU hésite entre les deux à chaque pixel et l'image scintille. On l'évite en laissant toujours un **petit écart** (ici, la plinthe dépasse du mur de quelques centimètres) ou en décalant de quelques millimètres (étape 8 : le tableau est à 2 cm du mur).

### Les séparateurs (optionnel)
De fines colonnes verticales sont placées aux coins pour masquer la jonction entre les murs. Elles sont produites avec les mêmes outils (`BoxGeometry` + UV).

### Pour aller plus loin
[src/world/cell.js](src/world/cell.js) `createPlinth` (147-163) et [src/world/separators.js](src/world/separators.js) `findCorners` (qui compte les cellules autour d'un sommet pour savoir où poser un séparateur).

---

## Étape 8 — Un tableau encadré

### Objectif
Accrocher un tableau avec son cadre au centre d'un mur.

### Plan d'attaque
Un tableau est un **`Group`** contenant :
1. une **toile** : un plan texturé avec l'image ;
2. un **cadre** : une moulure 3D générée ;
3. (plus tard) un spot, un halo de survol…

### Les données

```js
// data/galleries.js
export const paintings = [
  [{ src: '/paintings/a.jpg', title: 'Titre A', desc: 'Description A' }],   // cellule 0
  [{ src: '/paintings/b.jpg', title: 'Titre B', desc: 'Description B' }],   // cellule 1
  [],                                                                        // cellule 2
];
```

Le k-ième tableau d'une cellule va sur le k-ième mur **existant** de cette cellule, dans l'ordre N, E, S, O. C'est pourquoi `createRoom` doit renvoyer, pour chaque cellule, la liste de ses murs avec leurs données géométriques (`getWallData`, étape 4).

### Charger l'image et respecter son ratio

```js
// world/painting.js
const loader = new THREE.TextureLoader();

async function loadTexture(src) {
  const texture = await loader.loadAsync(src);   // version promesse de load()
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Hauteur de base ; largeur selon le ratio ; plafonnée à 70 % du mur
function fitSize(aspect, wallWidth, border) {
  let height = 1;
  let width = height * aspect;
  const maxWidth = wallWidth * 0.7 - 2 * border;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }
  return { width, height };
}
```

`aspect = texture.image.width / texture.image.height` : l'image est chargée, donc ses dimensions sont connues.

### Le cadre : `Shape`, trou, extrusion

On dessine le contour du cadre en 2D, avec un **trou** au milieu pour la toile, puis on lui donne de l'**épaisseur** :

```js
// world/frame.js
function rectPath(path, width, height) {
  const x = width / 2, y = height / 2;
  path.moveTo(-x, -y);
  path.lineTo(x, -y);
  path.lineTo(x, y);
  path.lineTo(-x, y);
  path.closePath();
  return path;
}

export function createFrame(width, height, { border = 0.05, depth = 0.03, material }) {
  const bevel = Math.min(0.008, border / 4, depth / 4);   // biseau

  // Contour extérieur : Shape ; trou intérieur : Path ajouté à shape.holes
  const shape = rectPath(new THREE.Shape(), width + 2 * border - 2 * bevel, height + 2 * border - 2 * bevel);
  shape.holes.push(rectPath(new THREE.Path(), width + 2 * bevel, height + 2 * bevel));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,       // épaisseur totale = depth, biseaux compris
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });

  const frame = new THREE.Mesh(geometry, material);
  frame.name = 'frame';
  return frame;
}
```

Le biseau **agrandit** le corps de `bevel` vers l'extérieur et **rétrécit** le trou. Le code compense (contour nominal = taille finale − 2·bevel, trou nominal = trou + 2·bevel) pour que la toile s'ajuste exactement.

> **Règle : ne jamais étirer un cadre.** Un cadre « générique » mis à l'échelle déformerait son biseau et son épaisseur. On **génère** donc un cadre à la taille exacte de chaque tableau (le profil est identique, quel que soit le ratio).

### La toile

```js
function createCanvas(texture, width, height, frameDepth) {
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  canvas.name = 'canvas';
  canvas.position.z = frameDepth - 0.02 - 0.002;   // dans le trou, ~2 mm derrière la face avant du cadre
  return canvas;
}
```

Le retrait de 2 mm évite le scintillement (z-fighting) entre la toile et le fond du cadre.

### Assembler et poser contre le mur

```js
export async function createPainting(data, wall, id, cellIndex) {
  const texture = await loadTexture(data.src);
  const aspect = texture.image.width / texture.image.height;
  const border = 0.05, depth = 0.03;
  const { width: cw, height: ch } = fitSize(aspect, wall.width, border);

  const group = new THREE.Group();
  group.name = `painting-${id}`;
  group.add(
    createCanvas(texture, cw, ch, depth),
    createFrame(cw, ch, { border, depth, material: frameMaterial }),
  );

  // Contre le mur, légèrement décollé le long de la normale ; à hauteur d'œil
  group.position.copy(wall.center).addScaledVector(wall.normal, 0.02);
  group.position.y = 1.6;
  group.rotation.y = Math.atan2(wall.normal.x, wall.normal.z);

  // Les métadonnées vont UNIQUEMENT sur le groupe
  group.userData = {
    paintingId: id,
    cellIndex,
    title: data.title,
    desc: data.desc,
    width: cw + 2 * border,    // cadre compris
    height: ch + 2 * border,
  };
  return group;
}
```

**`userData`** est un objet libre, prévu pour que vous y rangiez vos propres données sur n'importe quel objet Three.js. On ne le met **que sur le groupe** : plus tard, quand on cliquera sur un tableau, on remontera de l'objet touché (toile ou cadre) jusqu'au groupe pour retrouver ces informations.

### Distribuer les tableaux aux murs

```js
// world/gallery.js
export async function createGallery(room, paintingsByCell) {
  const jobs = [];
  paintingsByCell.forEach((items, cellIndex) => {
    const walls = room.cells[cellIndex]?.walls ?? [];
    items.slice(0, walls.length).forEach((data, k) => jobs.push({ data, wall: walls[k], cellIndex }));
  });
  const paintings = await Promise.all(jobs.map((j, id) => createPainting(j.data, j.wall, id, j.cellIndex)));
  const group = new THREE.Group();
  group.add(...paintings);
  return { group, paintings };
}
```

`Promise.all` charge **toutes les images en parallèle**.

> Comme `createGallery` est asynchrone, `init()` dans `main.js` devient `async function init()` et on écrit `const gallery = await createGallery(...)`.

### Exercice
Ajoutez un deuxième tableau dans la cellule 0. Sur quel mur apparaît-il ? Pourquoi, avec le L de l'étape 4, la cellule 0 a-t-elle 2 murs ?

### Pour aller plus loin
[src/world/painting.js](src/world/painting.js) (la lampe décorative au-dessus du cadre, le calcul du spot), [src/world/frame.js](src/world/frame.js), [src/world/gallery.js](src/world/gallery.js).

---

## Étape 9 — Spots et ombres

### Objectif
Chaque tableau est éclairé par son propre spot, et le cadre projette une ombre portée.

### Le spot

```js
// Repère local du groupe : +Z = devant le tableau, origine = centre du tableau
function createSpot(width, height, centerY) {
  const spot = new THREE.SpotLight(0xfff2e0, 45, 0, 1, 1, 2);
  // (couleur, intensité, distance, angle, pénombre, decay)
  spot.name = 'spot';
  spot.position.set(0, CEILING_HEIGHT - 0.3 - centerY, 1.5);   // au plafond, 1,5 m devant
  const reach = Math.hypot(spot.position.y, spot.position.z);
  spot.angle = Math.min(Math.atan((Math.max(width, height) * 0.6) / reach), Math.PI / 3);
  return spot;
}
```

Dans `createPainting` :

```js
const spot = createSpot(width, height, 1.6);
group.add(spot, spot.target);   // la cible reste à l'origine du groupe = le centre du tableau
```

- Un `SpotLight` vise un objet `target` (par défaut en (0,0,0) *du monde*). **Il faut ajouter la cible à la scène** (ici, au groupe) pour que sa position soit prise en compte avec le groupe.
- L'**angle du cône** est calculé par trigonométrie pour couvrir le tableau (60 % de sa plus grande dimension à la distance du spot).
- **Pénombre = 1** : bord du cône complètement doux.

### Les ombres : trois choses à activer

```js
// 1. Le renderer calcule des cartes d'ombre
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

// 2. La lumière en produit une
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);   // résolution de la carte d'ombre
spot.shadow.camera.near = 0.3;
spot.shadow.camera.far = 8;
spot.shadow.bias = -0.0003;
spot.shadow.normalBias = 0.004;
spot.shadow.radius = 3;

// 3. Les objets : qui projette, qui reçoit
frame.castShadow = true;
canvas.receiveShadow = true;
roomGroup.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
```

### Comment ça marche
Le GPU effectue un rendu **du point de vue de la lumière** et stocke la profondeur de chaque pixel (c'est la *shadow map*). Quand on dessine la scène normalement, chaque pixel compare sa distance à la lumière avec celle de la carte : plus loin = dans l'ombre.

### Les deux défauts à connaître (`bias`)
- **Acné d'ombre** : de petits motifs rayés, car une surface se projette de l'ombre à elle-même par imprécision numérique. On la corrige avec `bias` (décalage de profondeur) et `normalBias` (décalage le long de la normale).
- **Ombres décollées** (*peter panning*) : si le bias est trop fort, l'ombre se détache de son objet. C'est un compromis : on règle à l'œil.

### Optimisation : calculer les ombres **une seule fois**
La scène est **statique** : recalculer les cartes d'ombre à chaque image est du gâchis.

```js
renderer.shadowMap.autoUpdate = false;     // plus de recalcul automatique
// … puis, quand on veut un calcul :
renderer.shadowMap.needsUpdate = true;
renderer.render(scene, camera);
```

À partir de là, **toute modification de position ou de forme d'un objet qui projette une ombre exige de relancer `needsUpdate`.**

### Limite à connaître : 16 textures par shader
Chaque lumière qui projette une ombre consomme **une unité de texture** dans le shader de chaque matériau qui la reçoit, et un shader n'en a que **16** (`MAX_TEXTURE_IMAGE_UNITS` sur la plupart des GPU). Avec beaucoup de tableaux, on dépasse la limite. Le projet de référence n'allume donc que **les spots de la pièce courante** (voir « Pour aller plus loin »).

### Pour aller plus loin
- [src/world/shadows.js](src/world/shadows.js) : qui projette, qui reçoit, `autoUpdate = false`.
- [src/world/roomLights.js](src/world/roomLights.js) : allumage des spots par salle, et `bake()` qui rend une fois par salle pour remplir les cartes d'ombre (lignes 85-95).
- [src/world/materials.js](src/world/materials.js) lignes 92-102 : le commentaire « BUDGET DE TEXTURES ».
- Les réglages sont dans [src/config.js](src/config.js) (section « Ombres »).

---

## Étape 10 — Navigation : regarder et se déplacer

### Objectif
Glisser pour tourner la tête ; un déplacement fluide vers un point de vue face à un tableau.

### Principe : on ne tourne que sur l'horizontale
La caméra pivote **uniquement autour de Y** (le *yaw*). Pas de regard vers le haut ou le bas pendant la visite : l'interface reste simple, et on évite les mal de mer.

### Rotation : `Euler` et ordre des axes

La rotation d'un objet 3D se règle par trois angles (`rotation.x/y/z`, un `Euler`). Leur **ordre d'application** compte. Pour une caméra à la première personne, on veut tourner d'abord autour de Y (le monde), puis incliner : ordre **'YXZ'**.

```js
// nav/look.js
export function createLook(canvas, camera) {
  camera.rotation.order = 'YXZ';
  let yaw = 0;
  let dragging = false;
  let lastX = 0;

  function setYaw(value) {
    yaw = value;
    camera.rotation.set(0, yaw, 0);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);   // continue à recevoir les événements même hors du canvas
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setYaw(yaw + (e.clientX - lastX) * 0.0015);   // 0.0015 rad par pixel
    lastX = e.clientX;
  });
  const stop = () => (dragging = false);
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  return { getYaw: () => yaw, setYaw };
}
```

**Pointer events** : `pointerdown/move/up` fonctionnent identiquement pour la souris, le doigt et le stylet — un seul code pour tous les appareils.

### Le point de vue : à quelle distance se placer ?

On veut que le tableau remplisse environ 65 % de l'écran. En trigonométrie : à une distance `d`, la hauteur visible est `2·d·tan(FOV/2)`. On isole `d` pour la hauteur **et** pour la largeur, et on prend la contrainte la plus forte :

```js
// world/viewpoint.js
export function computeViewpoint({ center, normal, right, width, height }) {
  const screenAspect = window.innerWidth / window.innerHeight;
  const halfTan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
  const FILL = 0.65;

  const distV = height / (2 * FILL * halfTan);
  const distH = width  / (2 * FILL * halfTan * screenAspect);
  const dist = Math.max(distV, distH);

  const position = center.clone().addScaledVector(normal, dist);   // devant le tableau
  position.y = EYE_HEIGHT;

  // La caméra regarde -normale : même yaw que le tableau
  return { position, yaw: Math.atan2(normal.x, normal.z) };
}
```

On stocke ce résultat dans `group.userData.viewpoint` à la création du tableau. Le projet de référence ajoute un petit décalage latéral (`right`) pour laisser la place au panneau d'information qui sera à droite.

### Le déplacement animé

```js
// nav/angle.js — ramène un angle dans [-π, π]
export function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  return angle - twoPi * Math.round(angle / twoPi);
}
```

> **Pourquoi `wrapAngle` ?** Passer de 350° à 10°, c'est 20° dans un sens, pas 340° dans l'autre ! Sans cela, la caméra ferait presque un tour complet. On interpole toujours par le **chemin le plus court**.

```js
// nav/travel.js
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createTravel(camera, look) {
  let anim = null;

  function start(viewpoint, onDone) {
    const from = camera.position.clone();
    const distance = from.distanceTo(viewpoint.position);
    const yaw = look.getYaw();
    anim = {
      from,
      to: viewpoint.position,
      yaw,
      deltaYaw: wrapAngle(viewpoint.yaw - yaw),
      duration: THREE.MathUtils.clamp(distance * 0.3, 0.4, 1.8),   // 0,3 s/m, entre 0,4 et 1,8 s
      elapsed: 0,
      onDone,
    };
  }

  function update(dt) {
    if (!anim) return;
    anim.elapsed += dt;
    const k = Math.min(1, anim.elapsed / anim.duration);   // progression 0 → 1
    const e = easeInOutCubic(k);                            // même progression, mais accélérée/décélérée
    camera.position.lerpVectors(anim.from, anim.to, e);     // interpolation linéaire entre 2 positions
    look.setYaw(anim.yaw + anim.deltaYaw * e);
    if (k >= 1) {
      const { onDone } = anim;
      anim = null;
      onDone?.();
    }
  }

  return { start, update };
}
```

- **`lerp`** (*linear interpolation*) : `a + (b − a) · t`. C'est la base de presque toute animation.
- **L'easing** transforme `t` pour que le mouvement démarre et se termine en douceur.
- `update(dt)` est appelée **à chaque image** depuis la boucle de rendu.

### Brancher le tout dans `main.js`

```js
const look = createLook(renderer.domElement, camera);
const travel = createTravel(camera, look);

renderer.setAnimationLoop((time) => {
  timer.update(time);
  travel.update(timer.getDelta());
  renderer.render(scene, camera);
});

// Test : aller au premier tableau
travel.start(gallery.paintings[0].userData.viewpoint);
```

### Exercice
Remplacez `easeInOutCubic` par `(k) => k` : l'effet est mécanique. Essayez `k * k` (accélération uniquement).

### Pour aller plus loin
[src/nav/look.js](src/nav/look.js), [src/nav/travel.js](src/nav/travel.js), [src/world/viewpoint.js](src/world/viewpoint.js), [src/nav/angle.js](src/nav/angle.js).

---

## Étape 11 — Clic, survol et panneau *(avancé)*

### Objectif
Cliquer sur un tableau pour s'y rendre, voir un halo au survol, lire sa description dans un panneau HTML.

### Le **raycast** : « sur quoi pointe la souris ? »

On lance un **rayon** de la caméra à travers le pointeur, et on regarde ce qu'il traverse en premier.

```js
// nav/picking.js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pick(event) {
  const rect = canvas.getBoundingClientRect();
  // Coordonnées « normalisées » : de -1 à 1, Y vers le haut
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(targets, true)[0];   // true = récursif ; trié du plus proche au plus lointain
  return hit ? findPaintingGroup(hit.object) : null;
}
```

Deux idées clés :

1. **Les murs font partie des cibles (`targets`)** : un tableau situé derrière un mur sera dépassé par le rayon *après* avoir touché le mur, donc **le premier résultat est le mur** et le tableau n'est pas sélectionné. Il suffit donc de ranger les murs dans une liste `occluders` (ce que `createRoom` renvoie) et de les ajouter aux cibles. Pas de logique de visibilité à écrire.
2. **Remonter jusqu'au groupe** : le rayon touche la toile *ou* le cadre. On grimpe les parents jusqu'au groupe qui porte `userData.paintingId` :

```js
export function findPaintingGroup(object) {
  for (let o = object; o; o = o.parent) {
    if (o.userData?.paintingId !== undefined) return o;
  }
  return null;
}
```

### Clic ou glisser ?
Le même `pointerup` termine un clic et un glisser (rotation). On distingue en mesurant la distance parcourue entre l'appui et le relâchement :

```js
let downAt = null;
canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 0) downAt = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved >= 5) return;                 // plus de 5 px = c'était un glisser
  const painting = pick(e);
  if (painting) onPick(painting);
});
```

### Le halo de survol
Pour un halo **qui n'est pas une lumière**, on pose derrière le tableau un plan translucide en fusion additive, dont l'opacité est à 0 au repos et qu'on anime au survol :

```js
// world/glow.js (extrait)
const material = new THREE.MeshBasicMaterial({
  map: bakeGradient(width, height),   // dégradé généré dans un <canvas> 2D
  color: 0xfff0d8,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,   // s'ajoute à ce qu'il y a derrière : éclaircit
  depthWrite: false,                  // ne masque rien derrière
  toneMapped: false,
  polygonOffset: true,                // évite le scintillement avec le mur
  polygonOffsetFactor: -1,
});
glow.raycast = () => {};              // ne participe pas au picking
```

- **`CanvasTexture`** : on dessine un dégradé pixel par pixel dans un `<canvas>` classique, puis on l'utilise comme texture. Très pratique pour générer des images procédurales.
- **`glow.raycast = () => {}`** : on désactive le raycast de cet objet, sinon le halo (plus grand que le tableau) augmenterait la zone cliquable.

Un contour net d'épaisseur fixe en pixels utilise `Line2` : une `Line` standard WebGL fait toujours 1 pixel d'épaisseur, quel que soit le réglage. Voir [src/world/outline.js](src/world/outline.js).

L'animation du halo suit la même logique que partout : à chaque image, on rapproche `level` de sa cible (`1` si survolé, `0` sinon) :

```js
const k = Math.min(1, dt * 10);
item.level += (target - item.level) * k;       // lissage exponentiel
item.glow.opacity = item.level * 0.12;
```

### Le panneau d'information (HTML, pas 3D)
Un simple `<aside>` positionné en CSS par-dessus le canvas. Il expose une API minimale :

```js
// ui/panel.js
export function createPanel({ onPrev, onNext, onClose }) {
  const root = document.createElement('aside');
  root.className = 'panel';
  // … titre, description, boutons ‹ › × …
  document.body.append(root);
  return {
    show(data)  { /* remplit titre et desc, root.classList.add('is-open') */ },
    hide()      { root.classList.remove('is-open'); },
    setOpacity(v) { root.style.setProperty('--fade', String(v)); },
  };
}
```

En CSS : `pointer-events: none` sur l'en-tête (il ne bloque pas les clics sur le canvas derrière) ; sur le panneau, **ne pas** laisser passer les clics vers le canvas.

### Les états de navigation

Une petite **machine à états** évite les comportements incohérents :

| État | Panneau | Glisser | Clics |
|---|---|---|---|
| `idle` | masqué | actif | actifs |
| `moving` | masqué | désactivé | ignorés |
| `atPainting(id)` | selon l'angle | actif | actifs |

### Fondu selon l'angle, avec hystérésis
Si l'on s'éloigne du tableau en tournant la tête, le panneau doit s'estomper. On calcule l'écart d'angle avec la vue de face :

```js
const degrees = THREE.MathUtils.radToDeg(Math.abs(wrapAngle(look.getYaw() - viewpoint.yaw)));
if (panelShown && degrees > 30) hidePanel();
else if (!panelShown && degrees < 15) showPanel();     // seuil de retour PLUS BAS que le seuil de départ
```

**Hystérésis** : disparaître à 30° mais ne réapparaître qu'à 15° évite le clignotement quand l'angle oscille autour d'un seuil unique.

### Pour aller plus loin
[src/nav/picking.js](src/nav/picking.js), [src/nav/navigation.js](src/nav/navigation.js) (machine à états, lignes 180-243), [src/nav/highlight.js](src/nav/highlight.js), [src/ui/panel.js](src/ui/panel.js), [src/world/glow.js](src/world/glow.js).

---

## Étape 12 — Modèles glTF et vue du dessus *(avancé)*

### Objectif
Poser un banc et des plantes (modèles 3D), et basculer en vue du dessus.

### Charger un modèle glTF
**glTF** est « le JPEG de la 3D » : le format standard pour échanger des modèles. Modèles CC0 sur [Poly Haven](https://polyhaven.com/models).

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('/models/Ottoman_01/Ottoman_01_1k.gltf');
scene.add(gltf.scene);
```

### Normaliser l'origine d'un modèle
Les modèles arrivent avec des origines arbitraires. On les **normalise** : centré en X/Z, posé sur y = 0, avec la `Box3` (boîte englobante) :

```js
async function loadModel(loader, url, scale) {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);   // base à y = 0, centré
  const holder = new THREE.Group();
  holder.add(model);
  holder.scale.setScalar(scale);
  return holder;
}
```

Le `holder` (groupe parent) permet ensuite de positionner et d'orienter l'objet sans toucher au décalage interne du modèle.

### Plusieurs exemplaires : `clone(true)`
Un modèle se charge **une fois**, puis se clone :

```js
const object = models[type].clone(true);   // true = récursif ; géométries et matériaux sont partagés
object.position.set(x, 0, z);
object.rotation.y = yaw;
```

### Une zone de clic invisible
Une plante a une silhouette fine : difficile à cliquer. On ajoute une **boîte invisible**, plus généreuse :

```js
const material = new THREE.MeshBasicMaterial({ visible: false });
```

Astuce : un maillage dont le matériau est `visible: false` **n'est pas dessiné**, mais **le raycaster le voit encore**. Ni ombre, ni rendu, mais un hitbox.

### Génération pseudo-aléatoire reproductible
Pour varier l'orientation des plantes sans changer à chaque rechargement, on utilise un générateur à **graine** (`mulberry32`) : une même graine donne toujours la même suite de nombres.

### La vue du dessus
On place la caméra au-dessus du bâtiment, regard à la verticale, à la hauteur où **largeur et profondeur tiennent** dans l'écran :

```js
// nav/topView.js
export function computeTopPosition(bounds, camera) {
  const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const fit = Math.max(depth / (2 * halfTan), width / (2 * halfTan * camera.aspect));
  return new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    fit * 1.15 + CEILING_HEIGHT,     // 15 % de marge, et on vise le SOMMET des murs
    (bounds.minZ + bounds.maxZ) / 2,
  );
}
```

Même formule qu'à l'étape 10 : on retrouve la trigonométrie du FOV. Pour regarder à la verticale, on anime le *pitch* de la caméra (`rotation.x`) vers `-π/2` avec le même mécanisme que `travel`.

### Pour aller plus loin
[src/world/props.js](src/world/props.js), [src/nav/topView.js](src/nav/topView.js), [src/nav/navigation.js](src/nav/navigation.js) (`toggleTopView`).

---

## Étape 13 — Finitions *(avancé)*

### 13.1 — Occlusion ambiante « cuite » (*baked AO*)

L'**occlusion ambiante** assombrit les creux et les coins, là où la lumière d'ambiance arrive mal. Au lieu de la calculer en temps réel (coûteux), on la **« cuit »** : on dessine une fois pour toutes un dégradé dans un `<canvas>`, qu'on utilise comme texture.

Principe :
1. Pour chaque pixel de la texture, on calcule la **distance** au mur ou au coin le plus proche.
2. On convertit en assombrissement par une courbe douce :

```js
// Atténuation : 1 au contact, 0 à AO_RADIUS (courbe douce)
function falloff(distance) {
  const k = Math.max(0, 1 - distance / AO_RADIUS);
  return k * k;
}
```

3. On applique la texture comme `aoMap` du matériau. Cette carte lit un **second jeu de coordonnées UV** (`uv1`), indépendant de celui de la texture de couleur :

```js
geometry.setAttribute('uv1', new THREE.BufferAttribute(uv1Array, 2));
texture.channel = 1;     // cette texture lit uv1
```

> **Attention, c'est la partie la plus délicate du projet.** Le sol et le plafond partagent une seule grande texture couvrant tout le bâtiment ; les murs ont chacun leur propre variante. Chaque type de surface construit son `uv1` différemment. Lisez [src/world/ao.js](src/world/ao.js) avec un schéma à portée de main.

**Teinter l'ombre** (optionnel). `aoMap` multiplie la lumière par un gris : l'ombre est toujours neutre. Pour la teinter, on **modifie le code GLSL** du matériau juste avant sa compilation :

```js
// world/aoMaterial.js
material.onBeforeCompile = (shader) => {
  const chunk = THREE.ShaderChunk.aomap_fragment.replace(
    'reflectedLight.indirectDiffuse *= ambientOcclusion;',
    'reflectedLight.indirectDiffuse *= mix( vec3(0.0), vec3(1.0), ambientOcclusion );',
  );
  shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', chunk);
};
material.customProgramCacheKey = () => 'baked-ao-tinted';   // un seul programme pour tous les matériaux patchés
```

> **Fragilité** : ce remplacement de texte dépend de l'implémentation interne de Three.js. Si le texte de ce *chunk* change dans une future version, le patch échoue **silencieusement**. À ne reproduire que si vous en avez vraiment besoin. De plus, `material.clone()` ne copie pas `onBeforeCompile` : il faut le réappliquer à chaque clone.

### 13.2 — Qualité automatique

Sur un ordinateur peu puissant, le rendu normal saccade. Le projet mesure donc les **FPS** après le chargement et bascule seul en mode « Minimal » (relief désactivé, spots éteints, ambiance augmentée) s'ils sont insuffisants :

```js
onSample(fps) {
  samples++;
  if (samples > 1) peak = Math.max(peak, fps);       // la 1re mesure est ignorée (décodage, fondu)
  if (samples * 0.5 < 2.5) return;                   // fenêtre de mesure de 2,5 s
  if (peak < 29) quality.setMinimal(true);           // trop lent : mode allégé
}
```

Le compteur de FPS compte les images sur des fenêtres de 0,5 s ([src/ui/fps.js](src/ui/fps.js)). Un mode **Low** réduit la résolution interne (`setPixelRatio(0.75)`) : le canvas est étiré par le CSS.

### 13.3 — Le préchargeur

Le chargement (textures, tableaux, modèles, ombres) prend du temps. On affiche une **modale HTML** (écrite directement dans `index.html`, pour qu'elle apparaisse avant même l'exécution du JS) avec une liste d'étapes qui passent de « ○ » à « … » puis « ✓ ».

Deux techniques à retenir :

```js
// Laisse le navigateur peindre le DOM avant de bloquer le thread sur un calcul lourd
export const paint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
```

```js
// Téléchargements en parallèle
const [gallery, props] = await Promise.all([
  createGallery(room, paintingsByCell),
  createProps(placements),
  onRoomTextureLoaded(),
]);
```

Sans `paint()` entre deux étapes, la modale resterait figée puis sauterait directement à la fin, parce que JavaScript monopolise le thread.

### 13.4 — Déboguer
Une case « Debug » affiche des aides visuelles : `ArrowHelper` (normales), `PointLightHelper`, `SpotLightHelper`, `HemisphereLightHelper` et des étiquettes en `Sprite` (voir [src/world/debug.js](src/world/debug.js)). Ces helpers sont de précieux outils quand « on ne comprend pas pourquoi c'est noir ».

### Pour aller plus loin
[src/world/ao.js](src/world/ao.js), [src/world/aoMaterial.js](src/world/aoMaterial.js), [src/ui/autoQuality.js](src/ui/autoQuality.js), [src/world/quality.js](src/world/quality.js), [src/ui/loading.js](src/ui/loading.js).

---

## Glossaire

| Terme | Définition |
|---|---|
| **Scene** | L'arbre de tous les objets à dessiner |
| **Mesh** | Un objet visible = géométrie + matériau |
| **Group** | Objet invisible regroupant d'autres objets ; transformations héritées |
| **Géométrie** | La forme : sommets, triangles, UV, normales |
| **Matériau** | L'aspect : couleur, rugosité, cartes… |
| **Normale** | Vecteur perpendiculaire à une surface ; indique de quel côté elle « regarde » |
| **UV** | Coordonnées (0–1) qui associent chaque sommet à un point de la texture |
| **Texture** | Image appliquée à un matériau |
| **PBR** | Rendu basé sur la physique : le matériau décrit des propriétés, la lumière fait le reste |
| **sRGB / linéaire** | Deux encodages des couleurs ; les calculs de lumière se font en linéaire |
| **Tone mapping** | Compression des valeurs lumineuses vers la plage affichable |
| **FOV** | *Field of View*, champ de vision vertical de la caméra |
| **Yaw / pitch** | Rotation autour de l'axe vertical / autour de l'axe horizontal (regard haut-bas) |
| **Euler** | Représentation d'une rotation par trois angles, dont l'ordre compte |
| **Lerp** | Interpolation linéaire entre deux valeurs : `a + (b − a)·t` |
| **Easing** | Fonction qui adoucit une progression (départ et arrivée en douceur) |
| **Raycast** | Rayon lancé depuis la caméra pour trouver l'objet sous le pointeur |
| **Shadow map** | Image de profondeur rendue du point de vue d'une lumière |
| **Bias** | Décalage de profondeur corrigeant l'acné d'ombre |
| **Z-fighting** | Scintillement de deux surfaces quasi coïncidentes |
| **AO** | *Ambient Occlusion* : assombrissement des creux |
| **glTF** | Format standard de modèles 3D |
| **Box3** | Boîte englobante d'un objet |
| **Hystérésis** | Deux seuils différents (aller / retour) pour éviter le clignotement |
