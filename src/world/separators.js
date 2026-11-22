import * as THREE from 'three';
import { CEILING_HEIGHT, CELL_SIZE, SEPARATOR_WIDTH } from '../config.js';
import { setBakedAO } from './aoMaterial.js';
import { WALL, wallMaterial } from './materials.js';

// UV d'une boîte alignée sur les axes, en coordonnées monde (mètres / taille
// du motif) : même échelle que les murs, quelle que soit la face.
// `center` : centre de la boîte dans le monde.
function mapWorldBoxUV(geometry, center, textureSize) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = center.x + position.getX(i);
    const y = center.y + position.getY(i);
    const z = center.z + position.getZ(i);
    let u;
    let v;
    if (Math.abs(normal.getX(i)) > 0.5) [u, v] = [z, y]; // faces ±X
    else if (Math.abs(normal.getZ(i)) > 0.5) [u, v] = [x, y]; // faces ±Z
    else [u, v] = [x, z]; // faces ±Y
    uv.setXY(i, u / textureSize, v / textureSize);
  }
  uv.needsUpdate = true;
}

// UV1 d'une colonne : seulement la hauteur compte (dégradé bas / haut de l'AO)
function mapColumnAoUV(geometry) {
  const position = geometry.attributes.position;
  const uv1 = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    uv1[2 * i] = 0.5;
    uv1[2 * i + 1] = position.getY(i) / CEILING_HEIGHT + 0.5;
  }
  geometry.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
}

// Coins de la salle : points de la grille (en demi-cellules) où deux murs se
// rejoignent. Selon les cellules occupées autour du point : 1 (coin ordinaire,
// à 90° dans la salle) ou 3 (angle rentrant du L) ; 2 en diagonale ; 2 côte à
// côte = mur droit, 4 = intérieur : pas de coin.
function findCorners(cells) {
  const has = (i, j) => cells.some(([ci, cj]) => ci === i && cj === j);
  const corners = new Map();
  for (const [i, j] of cells) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const vx = 2 * i + sx; // coordonnées en demi-cellules
        const vz = 2 * j + sz;
        const key = `${vx},${vz}`;
        if (corners.has(key)) continue;
        // Les 4 cellules autour du point : (a,b), (a+1,b), (a,b+1), (a+1,b+1)
        const a = (vx - 1) / 2;
        const b = (vz - 1) / 2;
        const q = [has(a, b), has(a + 1, b), has(a, b + 1), has(a + 1, b + 1)];
        const count = q.filter(Boolean).length;
        const diagonal = count === 2 && q[0] === q[3];
        if (count === 1 || count === 3 || diagonal) corners.set(key, { vx, vz });
      }
    }
  }
  return [...corners.values()];
}

// Séparateurs verticaux en relief à chaque coin de murs : colonnes carrées de
// SEPARATOR_WIDTH de côté, sur toute la hauteur, centrées sur le coin
// (la moitié dépasse dans la salle). Matériau et UV du mur.
// Plus épaisses que les plinthes : leur face avant ne coïncide jamais avec celles-ci.
export function createSeparators(cells, ao = null) {
  const group = new THREE.Group();
  if (SEPARATOR_WIDTH <= 0) return group;

  // Avec l'AO : matériau commun aux séparateurs (copie du matériau du mur + AO en hauteur)
  let material = wallMaterial;
  if (ao) {
    material = wallMaterial.clone();
    setBakedAO(material, ao.columnTexture);
  }

  for (const { vx, vz } of findCorners(cells)) {
    const geometry = new THREE.BoxGeometry(SEPARATOR_WIDTH, CEILING_HEIGHT, SEPARATOR_WIDTH);
    const separator = new THREE.Mesh(geometry, material);
    separator.position.set((vx / 2) * CELL_SIZE, CEILING_HEIGHT / 2, (vz / 2) * CELL_SIZE);
    mapWorldBoxUV(geometry, separator.position, WALL.size);
    if (ao) mapColumnAoUV(geometry);
    separator.name = `separator-${vx}-${vz}`;
    group.add(separator);
  }
  return group;
}
