import * as THREE from 'three';
import { CEILING_GLOW, FRAME_COLOR } from '../config.js';

// Textures PBR (CC0 : Poly Haven, ambientCG) rangées dans public/textures/<dossier>/
// color.jpg, normal.jpg (version GL), roughness.jpg.
// `size` = taille réelle d'un motif (m), pour une échelle constante : les
// coordonnées de texture sont calculées en mètres dans le monde (cell.js), ce
// qui raccorde aussi le motif d'une cellule à l'autre.
// Pour tester une autre texture : commenter la ligne active, décommenter une autre.

// Sol
export const FLOOR = { folder: 'diagonal_parquet', size: 2.36 };
// export const FLOOR = { folder: 'herringbone_parquet', size: 3.4 };
// export const FLOOR = { folder: 'woodfloor051', size: 1.8 };
// export const FLOOR = { folder: 'concrete048', size: 2 }; // taille réelle inconnue (estimée)

// Murs (taille réelle inconnue pour les enduits : estimée à 2 m)
export const WALL = { folder: 'plaster001', size: 2 };
// export const WALL = { folder: 'plaster002', size: 2 };
// export const WALL = { folder: 'plaster003', size: 2 };
// export const WALL = { folder: 'plaster004', size: 2 };
// export const WALL = { folder: 'plaster005', size: 2 };

// Plinthes (relief en boîte) : une texture pour la basse, une pour la haute.
// Mêmes dossiers disponibles que ci-dessus ; tailles réelles inconnues = 2 m estimés.
export const PLINTH_BOTTOM = { folder: 'woodfloor051', size: 1.8 };
// export const PLINTH_BOTTOM = { folder: 'herringbone_parquet', size: 3.4 };
// export const PLINTH_BOTTOM = { folder: 'concrete048', size: 2 };
// export const PLINTH_BOTTOM = { folder: 'plaster003', size: 2 };

export const PLINTH_TOP = { folder: 'plaster002', size: 2 };
// export const PLINTH_TOP = { folder: 'plaster003', size: 2 };
// export const PLINTH_TOP = { folder: 'concrete048', size: 2 };
// export const PLINTH_TOP = { folder: 'woodfloor051', size: 1.8 };

const loader = new THREE.TextureLoader();

// Charge une carte : répétition activée ; la couleur est en sRGB, la normal
// map et la rugosité restent en espace linéaire (défaut).
function loadMap(folder, file, isColor = false) {
  const texture = loader.load(`/textures/${folder}/${file}`);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Matériau PBR complet (couleur, normal map, rugosité) depuis un dossier
function createPbrMaterial({ folder }) {
  return new THREE.MeshStandardMaterial({
    map: loadMap(folder, 'color.jpg', true),
    normalMap: loadMap(folder, 'normal.jpg'),
    roughnessMap: loadMap(folder, 'roughness.jpg'),
    roughness: 1, // multiplie la carte de rugosité
  });
}

// Matériaux partagés entre les cellules
export const floorMaterial = createPbrMaterial(FLOOR);
export const wallMaterial = createPbrMaterial(WALL);
export const plinthBottomMaterial = createPbrMaterial(PLINTH_BOTTOM);
export const plinthTopMaterial = createPbrMaterial(PLINTH_TOP);
export const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1,
  emissive: 0xfff6ea,
  emissiveIntensity: CEILING_GLOW,
});

// Dessous de l'applique : blanc pur non éclairé, pour simuler la source lumineuse
export const lampLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Cadre : bois sombre mat (couleur unie : le grain serait mal orienté par
// ExtrudeGeometry). Surchargeable par tableau (voir frame.js).
export function createFrameMaterial(color = FRAME_COLOR) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
}
export const frameMaterial = createFrameMaterial();
