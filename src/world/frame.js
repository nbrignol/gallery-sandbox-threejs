import * as THREE from 'three';
import { FRAME_BEVEL, FRAME_BORDER, FRAME_DEPTH, PAINTING_WALL_OFFSET } from '../config.js';
import { createFrameMaterial, frameMaterial } from './materials.js';

// Style du cadre : valeurs par défaut de config.js, surchargeables par tableau
// via `override` ({ border, depth, color }, tous optionnels).
export function resolveFrameStyle(override = {}) {
  return {
    border: override.border ?? FRAME_BORDER,
    depth: override.depth ?? FRAME_DEPTH,
    material: override.color !== undefined ? createFrameMaterial(override.color) : frameMaterial,
  };
}

// Rectangle centré sur l'origine
function rectPath(path, width, height) {
  const x = width / 2;
  const y = height / 2;
  path.moveTo(-x, -y);
  path.lineTo(x, -y);
  path.lineTo(x, y);
  path.lineTo(-x, y);
  path.closePath();
  return path;
}

// Moulure extrudée autour d'une toile de width × height (m), générée à la
// taille réelle (profil identique quel que soit le ratio, jamais étirée).
//
// Le biseau d'ExtrudeGeometry agrandit le corps de `bevel` vers l'extérieur
// (et rétrécit le trou) ; les faces avant/arrière gardent le contour nominal.
// On compense : contour nominal = taille finale - 2·bevel, trou nominal = trou + 2·bevel.
// Repère : fond du cadre contre le mur (z = -PAINTING_WALL_OFFSET), face avant à
// z = depth - PAINTING_WALL_OFFSET.
export function createFrame(width, height, { border, depth, material }) {
  const bevel = Math.min(FRAME_BEVEL, border / 4, depth / 4);

  const shape = rectPath(
    new THREE.Shape(),
    width + 2 * border - 2 * bevel,
    height + 2 * border - 2 * bevel,
  );
  shape.holes.push(rectPath(new THREE.Path(), width + 2 * bevel, height + 2 * bevel));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel, // épaisseur totale = depth, biseaux compris
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, bevel - PAINTING_WALL_OFFSET);

  const frame = new THREE.Mesh(geometry, material);
  frame.name = 'frame';
  return frame;
}
