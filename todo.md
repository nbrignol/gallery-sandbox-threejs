# Todo

## Points ouverts

- [ ] **Images** : remplacer les SVG provisoires (`public/paintings/placeholder-*.svg`) par les vraies images, et mettre à jour les `src` dans `src/data/paintings.js`.
- [ ] **Point de vue et redimensionnement** : le point de vue est calculé une fois avec le ratio de la fenêtre au chargement. Le recalculer au redimensionnement (rappeler `computeViewpoint`).
- [ ] **Limite du recul de fermeture** : le recul de 1,5 m (`CLOSE_BACKOFF_DISTANCE`) n'est pas borné par les murs. Peut sortir de la cellule si le point de vue est déjà loin du mur (ex. panoramique sur écran étroit).
- [ ] **Éclairage** : intensités de `HemisphereLight`, des `PointLight` de cellule et des spots estimées sans rendu. À ajuster à l'œil (`src/world/lights.js`, `src/config.js`).
- [x] **Halo de survol** (fin de l'étape 6) : fait (émissive de la toile + surcroît du spot, y compris au survol du cadre).

- [ ] **Textures : tailles réelles estimées** : les motifs de `concrete048` et des enduits `plaster00*` sont estimés à 2 m (`WALL.size`, `FLOOR.size` dans `src/world/materials.js`) : ambientCG ne donne pas leur taille réelle. À ajuster à l'œil.
- [ ] **Textures : poids** : 26 Mo de JPG 1K dans `public/textures/` pour tester les variantes. Ne garder que celles retenues à la fin.

## Idées

- [ ] **Passage entre les tableaux 5 et 6 (traversée des murs)** : le déplacement en ligne droite traverse l'angle rentrant. Piste : un fondu (au noir ou en transparence) pendant la traversée. À trancher : fondu, ou contournement de l'angle (actuellement hors périmètre dans le plan).
