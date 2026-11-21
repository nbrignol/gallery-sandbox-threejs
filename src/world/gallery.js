import * as THREE from 'three';
import { createPainting } from './painting.js';

// Attribue les tableaux aux murs : le k-ième tableau d'une cellule va sur le
// k-ième mur de sa liste. Tableaux en trop : ignorés (avertissement) ; murs
// en trop : vides. Retourne une liste { data, wall } dans l'ordre de paintings.flat().
function assignToWalls(room, paintingsByCell) {
  const jobs = [];
  paintingsByCell.forEach((items, cellIndex) => {
    const walls = room.cells[cellIndex]?.walls ?? [];
    if (items.length > walls.length) {
      console.warn(
        `Cellule ${cellIndex} : ${items.length} tableaux pour ${walls.length} murs, ${items.length - walls.length} ignoré(s).`,
      );
    }
    items.slice(0, walls.length).forEach((data, k) => jobs.push({ data, wall: walls[k] }));
  });
  return jobs;
}

// Crée tous les tableaux de la salle.
// Retourne { group, paintings } : `group` à ajouter à la scène, `paintings` la
// liste des groupes de tableaux (index = userData.paintingId).
export async function createGallery(room, paintingsByCell) {
  const jobs = assignToWalls(room, paintingsByCell);
  const paintings = await Promise.all(
    jobs.map(({ data, wall }, id) => createPainting(data, wall, id)),
  );

  const group = new THREE.Group();
  group.add(...paintings);
  return { group, paintings };
}
