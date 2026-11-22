import { CELL_SIZE, ROOM_ONLY_CELL_LIGHTS } from '../config.js';

// Spots des tableaux : éteints par défaut, seuls ceux de la pièce (cellule) où se trouve
// la caméra sont allumés. Idem pour la lampe de cellule si ROOM_ONLY_CELL_LIGHTS. Avantages : une ambiance plus sombre et dirigée, et surtout
// moins de cartes d'ombre actives à la fois (au plus les spots d'une pièce + les lampes
// de cellule), donc bien moins d'unités de texture consommées par les shaders.
//
// Cartes d'ombre : `bake` les calcule une seule fois, pièce par pièce (les spots d'une
// pièce allumés pendant son rendu), puis elles restent en mémoire : un spot rallumé
// retrouve ses ombres sans calcul. Le nombre de spots allumés ne prend que quelques
// valeurs (celles des pièces), donc les shaders correspondants sont tous compilés au
// démarrage, sans à-coup ensuite.

// Index de la cellule contenant le point (x, z), -1 si aucune (ex. creux de l'angle du L)
function cellIndexAt(room, x, z) {
  const half = CELL_SIZE / 2;
  return room.cells.findIndex(
    ({ center }) => Math.abs(x - center.x) <= half && Math.abs(z - center.z) <= half,
  );
}

// Retourne { bake(renderer, scene, camera), update(camera) }
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

  // Allume les spots (et la lampe de cellule) de la pièce `cellIndex`, éteint tous les autres
  function setRoom(cellIndex) {
    if (cellIndex === current) return;
    current = cellIndex;
    for (const [cell, spots] of spotsByCell) {
      for (const spot of spots) spot.visible = cell === cellIndex;
    }
    if (ROOM_ONLY_CELL_LIGHTS) {
      room.cellLights.forEach((light, cell) => (light.visible = cell === cellIndex));
    }
  }

  // Vue du dessus : éteint tous les spots (les lampes de cellule ne sont pas touchées).
  // En repassant à faux, rallume tout de suite les spots de la pièce contenant `nearPosition`
  // (la destination du retour dans le bâtiment) ; sans position, `update` le fait à l'image suivante.
  function setSpotsOff(off, nearPosition) {
    spotsOff = off;
    current = null;
    if (off) {
      for (const spots of spotsByCell.values()) for (const spot of spots) spot.visible = false;
    } else if (nearPosition) {
      const cellIndex = cellIndexAt(room, nearPosition.x, nearPosition.z);
      if (cellIndex >= 0) setRoom(cellIndex);
    }
  }

  return {
    setSpotsOff,
    // Calcule toutes les cartes d'ombre : un rendu par pièce, avec ses spots allumés
    bake(renderer, scene, camera) {
      for (const cellIndex of spotsByCell.keys()) {
        setRoom(cellIndex);
        renderer.shadowMap.needsUpdate = true;
        renderer.render(scene, camera);
      }
      // Variante « spots éteints » (vue du dessus) : compilée ici, pas d'à-coup à l'ouverture
      setSpotsOff(true);
      renderer.render(scene, camera);
      setSpotsOff(false);
    },
    // À appeler à chaque image : bascule les spots quand la caméra change de pièce
    update(camera) {
      if (spotsOff) return;
      const cellIndex = cellIndexAt(room, camera.position.x, camera.position.z);
      if (cellIndex >= 0) setRoom(cellIndex);
    },
  };
}
