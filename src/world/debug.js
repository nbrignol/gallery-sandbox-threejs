import * as THREE from 'three';

// Mode debug : index des cellules, infos des murs, gizmos de lumières, HUD (cellule + yaw).
// Les objets 3D sont construits au premier affichage ; `update()` ne fait rien tant que le mode est off.

// Sprite de texte (une ou plusieurs lignes) rendu par-dessus la scène
function makeLabel(lines, { scale = 0.35, color = '#fff', background = 'rgba(0,0,0,0.7)' } = {}) {
  const fontSize = 48;
  const padding = 16;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ui-monospace, monospace`;
  const width = Math.ceil(Math.max(...lines.map((line) => ctx.measureText(line).width))) + padding * 2;
  const height = lines.length * fontSize * 1.2 + padding * 2;
  canvas.width = width;
  canvas.height = height;
  ctx.font = `${fontSize}px ui-monospace, monospace`; // le redimensionnement réinitialise le contexte
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, padding, padding + i * fontSize * 1.2));

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
      transparent: true,
    }),
  );
  sprite.scale.set((width / height) * scale * lines.length, scale * lines.length, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export function createDebug({ scene, room, gallery, camera, look, hud }) {
  const group = new THREE.Group();
  group.name = 'debug';
  group.visible = false;
  scene.add(group);

  const spotHelpers = [];
  let built = false;
  let enabled = false;
  let lastText = '';

  // Tableau posé sur un mur : celui dont la position (XZ) est proche du centre du mur
  function paintingOnWall(cellIndex, wall) {
    return gallery.paintings.find((painting) => {
      if (painting.userData.cellIndex !== cellIndex) return false;
      return Math.hypot(painting.position.x - wall.center.x, painting.position.z - wall.center.z) < 0.5;
    });
  }

  function build() {
    room.cells.forEach((cell, k) => {
      // Index de la cellule, au sol
      const label = makeLabel([`#${k}`], { scale: 0.5, color: '#7fdcff' });
      label.position.set(cell.center.x, 0.1, cell.center.z);
      group.add(label);

      cell.walls.forEach((wall) => {
        const painting = paintingOnWall(k, wall);
        const lines = [`${k}·${wall.side}  w=${wall.width.toFixed(1)}`];
        lines.push(painting ? `art: ${painting.userData.title ?? painting.userData.paintingId}` : 'art: -');
        const info = makeLabel(lines, { scale: 0.12, color: '#ffd37f' });
        info.position.copy(wall.center).addScaledVector(wall.normal, 0.3);
        group.add(info);

        // Flèche de la normale (vers l'intérieur de la cellule)
        const origin = wall.center.clone().addScaledVector(wall.normal, 0.05);
        group.add(new THREE.ArrowHelper(wall.normal, origin, 0.8, 0xffd37f, 0.2, 0.1));
      });
    });

    room.cellLights.forEach((light) => {
      if (light) group.add(new THREE.PointLightHelper(light, 0.2, 0xff8800));
    });

    gallery.paintings.forEach((painting) => {
      const spot = painting.getObjectByName('spot');
      if (!spot) return;
      const helper = new THREE.SpotLightHelper(spot, 0x00ff88);
      spotHelpers.push({ spot, helper });
      group.add(helper);
    });

    if (room.hemisphere) group.add(new THREE.HemisphereLightHelper(room.hemisphere, 0.5));
    built = true;
  }

  function setEnabled(on) {
    enabled = on;
    if (on && !built) build();
    group.visible = on;
    if (hud) hud.hidden = !on;
    lastText = '';
  }

  function update() {
    if (!enabled) return;
    for (const { spot, helper } of spotHelpers) {
      helper.visible = spot.visible; // suit l'allumage des spots (une pièce à la fois)
      if (helper.visible) helper.update();
    }
    if (!hud) return;
    const cell = room.cellIndexAt(camera.position.x, camera.position.z);
    const yaw = ((THREE.MathUtils.radToDeg(look.getYaw()) % 360) + 360) % 360;
    const text = `cell ${cell} · yaw ${yaw.toFixed(0)}°`;
    if (text !== lastText) {
      hud.textContent = text;
      lastText = text;
    }
  }

  return { setEnabled, update };
}
