import * as THREE from 'three';
import { createPainting } from './painting.js';

// Attribue les tableaux aux murs : le k-ième élément d'une cellule va sur le
// k-ième mur de sa liste. `null` = mur sans rien ; `art(null, déco)` = déco sans tableau (pas de `src`).
// Éléments en trop : ignorés (avertissement) ; murs en trop : vides.
// Retourne une liste { data, wall, cellIndex } dans l'ordre de paintings.flat() (sans les `null`).
export function assignToWalls(room, paintingsByCell) {
  const jobs = [];
  paintingsByCell.forEach((items, cellIndex) => {
    const walls = room.cells[cellIndex]?.walls ?? [];
    if (items.length > walls.length) {
      console.warn(
        `Cellule ${cellIndex} : ${items.length} tableaux pour ${walls.length} murs, ${items.length - walls.length} ignoré(s).`,
      );
    }
    items.slice(0, walls.length).forEach((data, k) => {
      if (data) jobs.push({ data, wall: walls[k], cellIndex });
    });
  });
  return jobs;
}

// Les jobs qui ont vraiment un tableau (les autres n'ont que de la déco)
export const paintingJobs = (jobs) => jobs.filter(({ data }) => data.src);

// Numérote chaque tableau dans sa pièce (cellule) : userData.indexInRoom, à partir de 0
function numberInRooms(paintings) {
  const counts = new Map();
  for (const painting of paintings) {
    const room = painting.userData.cellIndex;
    const index = counts.get(room) ?? 0;
    painting.userData.indexInRoom = index;
    counts.set(room, index + 1);
  }
}

// Crée tous les tableaux de la salle.
// Retourne { group, paintings } : `group` à ajouter à la scène, `paintings` la
// liste des groupes de tableaux (index = userData.paintingId).
// `onProgress()` est appelé à chaque image chargée.
export async function createGallery(room, paintingsByCell, onProgress) {
  const jobs = paintingJobs(assignToWalls(room, paintingsByCell));
  const paintings = await Promise.all(
    jobs.map(async ({ data, wall, cellIndex }, id) => {
      const painting = await createPainting(data, wall, id, cellIndex);
      onProgress?.();
      return painting;
    }),
  );

  numberInRooms(paintings);

  const group = new THREE.Group();
  group.add(...paintings);
  return { group, paintings };
}
