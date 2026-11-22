import * as THREE from 'three';
import {
  CEILING_GLOW,
  FLOOR_SPECULAR,
  FRAME_COLOR,
  WALL_BRIGHTNESS,
  WALL_COLOR,
} from '../config.js';

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

// Matériau PBR complet (couleur, normal map, rugosité) depuis un dossier.
// `MaterialClass` / `extra` : pour un matériau particulier (ex. sol mat, voir plus bas).
function createPbrMaterial({ folder }, MaterialClass = THREE.MeshStandardMaterial, extra = {}) {
  return new MaterialClass({
    map: loadMap(folder, 'color.jpg', true),
    normalMap: loadMap(folder, 'normal.jpg'),
    roughnessMap: loadMap(folder, 'roughness.jpg'),
    roughness: 1, // multiplie la carte de rugosité
    ...extra,
  });
}

// Matériaux partagés entre les cellules
// Sol : MeshPhysicalMaterial pour pouvoir régler `specularIntensity`. À 0 (FLOOR_SPECULAR),
// plus aucun reflet (lampes, environnement) : le parquet est mat.
export const floorMaterial = createPbrMaterial(FLOOR, THREE.MeshPhysicalMaterial, {
  specularIntensity: FLOOR_SPECULAR,
});
export const wallMaterial = createPbrMaterial(WALL);
// Teinte du mur : multipliée par la texture (mur sombre = teinte grise foncée, le relief reste
// et la lumière s'applique normalement).
wallMaterial.color.set(WALL_COLOR).multiplyScalar(WALL_BRIGHTNESS);
export const plinthBottomMaterial = createPbrMaterial(PLINTH_BOTTOM);
export const plinthTopMaterial = createPbrMaterial(PLINTH_TOP);

// BUDGET DE TEXTURES : un shader ne peut pas lire plus de 16 textures (MAX_TEXTURE_IMAGE_UNITS).
// Chaque lampe ALLUMÉE qui projette des ombres en consomme une : les spots de la pièce
// courante (voir roomLights.js) + les 3 lampes de cellule, auxquelles s'ajoutent les textures
// du matériau (couleur, normales, AO, environnement…).
// Sol, murs et plinthes sont des surfaces mates : on n'y garde pas la carte de rugosité
// (une valeur fixe), ce qui libère 1 unité chacun. Si une pièce reçoit beaucoup de tableaux
// (donc de spots allumés ensemble), vérifie ce budget.
for (const material of [floorMaterial, wallMaterial, plinthBottomMaterial, plinthTopMaterial]) {
  material.roughnessMap = null;
  material.roughness = 0.9;
}
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
