// NON UTILISÉ À L'EXÉCUTION : la correction est maintenant cuite dans les fichiers
// *_padded.jpg de public/models/potted_plant_02/textures/. Ce module est gardé comme
// référence pour traiter un autre modèle au même défaut (voir todo.md).
//
// Correction de textures « atlas » : feuillage sur fond noir (modèles Poly Haven).
// La géométrie suit les contours des feuilles, donc le filtrage bilinéaire et les
// mipmaps mélangent les bords avec le fond noir de l'atlas : un contour sombre
// apparaît autour des feuilles. On prolonge la couleur des feuilles de quelques
// pixels dans le fond (« dilatation ») pour que le mélange reste vert.

const BACKGROUND_MAX = 12; // moyenne RVB sous laquelle un pixel du diffuse est du fond
const ERODE = 3; // pixels de bord de feuille ignorés (déjà mélangés avec le noir)
const PASSES = 18; // nombre de pixels de prolongation

const OFFSETS = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

// Masque des pixels « feuille » (1) / fond (0), d'après la texture de couleur,
// érodé de ERODE pixels : les pixels du bord, déjà assombris par le mélange avec le
// fond, sont recalculés à partir de l'intérieur de la feuille.
function leafMask(imageData) {
  const { data, width, height } = imageData;
  let mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = (data[4 * i] + data[4 * i + 1] + data[4 * i + 2]) / 3 > BACKGROUND_MAX ? 1 : 0;
  }
  for (let step = 0; step < ERODE; step++) {
    const eroded = new Uint8Array(mask);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        for (const [dx, dy] of OFFSETS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || !mask[ny * width + nx]) {
            eroded[y * width + x] = 0;
            break;
          }
        }
      }
    }
    mask = eroded;
  }
  return mask;
}

// Prolonge les pixels de `mask` = 1 dans les pixels = 0, couche par couche, avec la
// moyenne des voisins déjà remplis. `mask` est copié (réutilisable pour d'autres cartes).
function dilate(imageData, sourceMask) {
  const { data, width, height } = imageData;
  const filled = Uint8Array.from(sourceMask);
  let frontier = [];
  const queued = new Uint8Array(width * height);
  const pushNeighbors = (x, y, list) => {
    for (const [dx, dy] of OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (!filled[n] && !queued[n]) {
        queued[n] = 1;
        list.push(n);
      }
    }
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (filled[y * width + x]) pushNeighbors(x, y, frontier);
    }
  }

  for (let pass = 0; pass < PASSES && frontier.length > 0; pass++) {
    // 1) couleur de chaque pixel de la couche = moyenne de ses voisins remplis
    const colors = frontier.map((index) => {
      const x = index % width;
      const y = (index - x) / width;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (const [dx, dy] of OFFSETS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (!filled[n]) continue;
        r += data[4 * n];
        g += data[4 * n + 1];
        b += data[4 * n + 2];
        count++;
      }
      return [r / count, g / count, b / count];
    });
    // 2) on écrit la couche, puis on prépare la suivante
    const next = [];
    frontier.forEach((index, k) => {
      data[4 * index] = colors[k][0];
      data[4 * index + 1] = colors[k][1];
      data[4 * index + 2] = colors[k][2];
      filled[index] = 1;
    });
    frontier.forEach((index) => {
      const x = index % width;
      pushNeighbors(x, (index - x) / width, next);
    });
    frontier = next;
  }
}

// Remplace l'image d'une texture par sa version dilatée (canvas)
function dilateTexture(texture, mask) {
  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  dilate(imageData, mask);
  context.putImageData(imageData, 0, 0);
  texture.image = canvas;
  texture.needsUpdate = true;
}

// Dilate les cartes d'un matériau de feuillage (couleur, normales, rugosité)
// d'après le masque de sa texture de couleur.
export function padLeafMaterial(material) {
  if (!material.map) return;
  const canvas = document.createElement('canvas');
  canvas.width = material.map.image.width;
  canvas.height = material.map.image.height;
  const context = canvas.getContext('2d');
  context.drawImage(material.map.image, 0, 0);
  const mask = leafMask(context.getImageData(0, 0, canvas.width, canvas.height));

  const maps = new Set(
    [material.map, material.normalMap, material.roughnessMap, material.metalnessMap].filter(Boolean),
  );
  for (const texture of maps) dilateTexture(texture, mask);
}
