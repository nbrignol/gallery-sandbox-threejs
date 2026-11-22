import { CELL_LIGHT_SCOPE, HEMI_INTENSITY, TOP_VIEW_AMBIENT_BOOST } from '../config.js';

// Éclairage par pièce, pour tenir la limite de textures du shader (16) et la mémoire quelle
// que soit la taille du bâtiment :
//  - SPOTS des tableaux : éteints par défaut, seuls ceux de la pièce (cellule) où se trouve
//    la caméra sont allumés ;
//  - LAMPES de cellule : la pièce courante et les pièces directement connectées (voisines par
//    un côté), ou toutes si CELL_LIGHT_SCOPE = 'all'.
// Budget de textures : spots de la pièce + au plus 5 lampes (courante + 4 voisines) + 4
// textures de matériau.
//
// Cartes d'ombre : `bake` les calcule une seule fois, cellule par cellule (les lumières de
// chaque configuration allumées pendant son rendu), puis elles restent en mémoire : une
// lumière rallumée retrouve ses ombres sans calcul. Chaque configuration (nombre de spots et
// de lampes allumés) est rencontrée pendant ce parcours : tous les shaders correspondants
// sont compilés au démarrage, sans à-coup ensuite.

// Retourne { setSpotsOff(off, nearPosition), bake(renderer, scene, camera), update(camera) }
export function createRoomLights(room, paintings) {
  // Spots regroupés par pièce
  const spotsByCell = new Map();
  for (const painting of paintings) {
    const { cellIndex } = painting.userData;
    if (!spotsByCell.has(cellIndex)) spotsByCell.set(cellIndex, []);
    spotsByCell.get(cellIndex).push(painting.getObjectByName('spot'));
  }

  let current = null;
  let spotsOff = false; // vue du dessus : tous les spots éteints

  // Allume les spots de la pièce `cellIndex` et les lampes de la pièce et de ses voisines,
  // éteint tout le reste
  function setRoom(cellIndex) {
    if (cellIndex === current) return;
    current = cellIndex;
    for (const [cell, spots] of spotsByCell) {
      for (const spot of spots) spot.visible = cell === cellIndex;
    }
    if (CELL_LIGHT_SCOPE !== 'all') {
      const lit = new Set([cellIndex, ...room.cells[cellIndex].neighbors]);
      room.cellLights.forEach((light, cell) => (light.visible = lit.has(cell)));
    }
  }

  // Vue du dessus : éteint tous les spots (les lampes ne sont pas touchées) et renforce
  // l'ambiance pour que tout le bâtiment reste lisible. En repassant à faux, rallume tout de
  // suite la pièce contenant `nearPosition` (la destination du retour dans le bâtiment) ;
  // sans position, `update` le fait à l'image suivante.
  function setSpotsOff(off, nearPosition) {
    spotsOff = off;
    current = null;
    room.hemisphere.intensity = HEMI_INTENSITY * (off ? TOP_VIEW_AMBIENT_BOOST : 1);
    if (off) {
      for (const spots of spotsByCell.values()) for (const spot of spots) spot.visible = false;
    } else if (nearPosition) {
      const cellIndex = room.cellIndexAt(nearPosition.x, nearPosition.z);
      if (cellIndex >= 0) setRoom(cellIndex);
    }
  }

  return {
    setSpotsOff,
    // Calcule toutes les cartes d'ombre : un rendu par cellule
    bake(renderer, scene, camera) {
      for (let cellIndex = 0; cellIndex < room.cells.length; cellIndex++) {
        setRoom(cellIndex);
        renderer.shadowMap.needsUpdate = true;
        renderer.render(scene, camera);
      }
      // Variante « spots éteints » (vue du dessus) : compilée ici, pas d'à-coup à l'ouverture
      setSpotsOff(true);
      renderer.render(scene, camera);
      setSpotsOff(false);
    },
    // À appeler à chaque image : bascule l'éclairage quand la caméra change de pièce
    update(camera) {
      if (spotsOff) return;
      const cellIndex = room.cellIndexAt(camera.position.x, camera.position.z);
      if (cellIndex >= 0) setRoom(cellIndex);
    },
  };
}
