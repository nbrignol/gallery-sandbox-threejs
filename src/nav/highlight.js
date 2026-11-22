import {
  HOVER_GLOW_OPACITY,
  HOVER_GLOW_SPEED,
  HOVER_OUTLINE_OPACITY,
} from '../config.js';

// Effet de survol : fondu du « glow » (dégradé autour du tableau et du cadre, voir
// world/glow.js) et du contour net (world/outline.js) du tableau survolé. Il se
// déclenche aussi au survol du cadre, puisque le picking remonte au groupe.
// N'agit pas sur l'éclairage.
// Retourne { setHovered(group|null), update(dt) }.
export function createHighlight(paintings) {
  // Par tableau : matériaux du glow et du contour, niveau de survol courant (0 → 1)
  const items = paintings.map((group) => ({
    group,
    glow: group.getObjectByName('glow').material,
    outline: group.getObjectByName('outline').material,
    level: 0,
  }));
  let hovered = null;

  return {
    setHovered(group) {
      hovered = group;
    },
    update(dt) {
      const k = Math.min(1, dt * HOVER_GLOW_SPEED);
      for (const item of items) {
        const target = item.group === hovered ? 1 : 0;
        if (item.level === target) continue;
        const next = item.level + (target - item.level) * k;
        item.level = Math.abs(target - next) < 0.001 ? target : next;
        item.glow.opacity = item.level * HOVER_GLOW_OPACITY;
        item.outline.opacity = item.level * HOVER_OUTLINE_OPACITY;
      }
    },
  };
}
