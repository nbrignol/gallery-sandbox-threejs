# Affichage progressif de la scène

## Contexte
Aujourd'hui `init()` ([src/main.js](src/main.js)) attend TOUT avant de démarrer la boucle de rendu : les 7 images (~13 Mo, `createGallery` fait un `Promise.all`), les 2 modèles glTF (~4 Mo, `createProps`), puis le calcul des ombres (`roomLights.bake`), le tout derrière le preloader. Les textures du sol, des murs et des plinthes (~10 Mo) se chargent déjà sans bloquer (`TextureLoader.load`), mais rien n'est affiché avant la fin.

Objectif : afficher la salle dès qu'elle est construite, puis faire apparaître tableaux et objets au fur et à mesure de leur chargement, la scène se mettant à jour toute seule.

## Ce que ça demande (et pourquoi ce n'est pas qu'un déplacement d'`await`)
Plusieurs structures sont aujourd'hui figées à la création : tableaux (index = `paintingId`), `targets` du picking, `items` du survol (highlight), `spotsByCell` des lampes, et les ombres, calculées UNE fois pour tout ce qui projette. Il faut les rendre incrémentales.

## Comportement cible
1. **Immédiat** : renderer, scène, salle (+ AO cuite, synchrone, déjà rapide), caméra, boucle de rendu, navigation (le glisser pour regarder autour marche tout de suite). Les ombres de contact des objets sont dessinées dans l'AO d'emblée (les emplacements ne dépendent que des données).
2. **Preloader** retiré quand les textures de la salle (sol, murs, plinthes) sont chargées ET la 1re image rendue (sinon murs noirs : une texture non chargée s'échantillonne en noir). Pas avant.
3. **En arrière-plan** : chaque tableau apparaît quand son image arrive ; banc et plantes dès que leur modèle arrive (indépendamment).
4. **Éclairage final en une seule étape**, quand tout est chargé : spots des tableaux allumés + ombres calculées (`roomLights.bake`) + cases Minimal/Low activées. Avant, les tableaux sont éclairés par l'ambiance et les lampes de cellule seulement, sans ombres. Contrepartie assumée : un gel court au moment du bake (avant, il était masqué par le preloader), et les spots/ombres « apparaissent » à la fin. Raison : allumer un spot ou projeter une ombre recompile les shaders de la pièce ; le faire à chaque arrivée donnerait des à-coups répétés.

## Changements
- [src/world/gallery.js](src/world/gallery.js) : `createGallery(room, paintingsByCell, onPaintingReady)` ne fait plus de `Promise.all` bloquant : chaque job charge son image puis est inséré dans `paintings[id]` (tableau creux, indexé par `paintingId`, ordre des jobs conservé), ajouté à `group`, et signalé par `onPaintingReady(painting)`. Retourne `{ group, paintings, loaded }` où `loaded` = promesse résolue quand tout est arrivé. `numberInRooms` doit se faire à l'arrivée (ou sur `jobs`, qui connaît déjà la cellule) pour garder `indexInRoom` stable.
- [src/world/props.js](src/world/props.js) : `createProps(placements, onObjectsReady)` : charge banc et plante séparément, ajoute les objets de chaque type dès que son modèle est prêt, retourne `{ group, loaded }`. `props.children.filter(...)` dans main.js est remplacé par les callbacks.
- [src/nav/picking.js](src/nav/picking.js) : `targets` recalculé à chaque pick à partir des listes vivantes (`paintings.filter(Boolean)`, `benches`, `plants`, `occluders`) au lieu d'un tableau figé.
- [src/nav/highlight.js](src/nav/highlight.js) : `createHighlight` retourne aussi `add(group)` ; `items` se remplit à l'arrivée.
- [src/nav/navigation.js](src/nav/navigation.js) : accepte des listes `paintings`/`benches`/`plants` mutables et expose `addPainting(group)` (appelle `highlight.add`). `step()` utilise `paintings.filter(...)`, qui ignore les trous : l'ordre est conservé. Le reste (`paintings[id]`) n'est appelé que sur des tableaux déjà chargés (clic).
- [src/world/roomLights.js](src/world/roomLights.js) : `addPainting(painting)` (ajoute son spot à `spotsByCell`), drapeau `lightingReady` : tant que faux, les spots restent `visible = false` ; `enableLighting()` le passe à vrai et force `current = null`. `bake` inchangé (appelé une fois, ensuite).
- [src/world/shadows.js](src/world/shadows.js) : scinder `enableShadows` en `enableShadowsFor(object)` (flags castShadow/receiveShadow d'un tableau, d'un objet déco ou de la salle) appelé à l'arrivée, et l'activation de `renderer.shadowMap` dans une fonction appelée au moment du bake.
- [src/world/materials.js](src/world/materials.js) : `loadMap` mémorise une promesse par texture (callback `onLoad` de `TextureLoader.load`) ; exporter `roomTexturesReady = Promise.all(...)`.
- [src/main.js](src/main.js) : réordonner `init()` : salle → caméra → navigation vide → `startLoop` → `await roomTexturesReady` + `requestAnimationFrame` → `hidePreloader()`. En parallèle, `Promise.all([gallery.loaded, props.loaded])` puis `roomLights.enableLighting()`, `shadowMap` activé, `roomLights.bake(...)`, puis `createQuality`/`setupQualityUI`. Le départ orienté et `playIntro` restent immédiats.
- [index.html](index.html) : les cases `#opt-minimal` / `#opt-low` sont `disabled` au départ, activées avec `setupQualityUI` (`createQuality` énumère les lumières à ombres au moment de sa création, donc après le chargement).
- Erreur de chargement d'une image ou d'un modèle : `console.error` + on continue (le tableau manquant est simplement absent), pour ne pas bloquer l'éclairage final.

## Pas dans ce plan (à décider si souhaité)
- Indicateur « chargement des tableaux… » après le retrait du preloader.
- Fondu d'apparition des tableaux (aujourd'hui : apparition sèche).

## Vérification
- `npm run dev`, DevTools > Network > throttling « Fast 3G » : la salle (texturée) s'affiche d'abord, puis les tableaux et objets apparaissent un à un, sans erreur console ; le glisser pour regarder autour marche dès l'affichage.
- Cliquer un tableau pendant le chargement : ne fait rien tant qu'il n'est pas apparu ; après son apparition, survol (halo), clic et panneau fonctionnent ; précédent/suivant garde l'ordre des tableaux de la pièce.
- Quand tout est chargé : spots et ombres apparaissent ensemble, identiques au rendu actuel ; Minimal/Low activables et fonctionnels ; vue du dessus et retour OK.
- Tester les 3 configurations (`?config=1|2|3`), dont des pièces vides (`[]`).
- Sans throttling : rendu final strictement identique à aujourd'hui. `npm run build` passe.
