import { HOVER_GLOW, HOVER_GLOW_SPEED, HOVER_SPOT_BOOST } from '../config.js';

// Halo de survol : fondu de l'émissive de la toile et de l'intensité du spot
// du tableau survolé. Le halo est sur la toile (matériau propre à chaque
// tableau) mais se déclenche aussi au survol du cadre, puisque le picking
// remonte au groupe.
// Retourne { setHovered(group|null), update(dt) }.
export function createHighlight(paintings) {
  // Par tableau : matériau de la toile, spot, intensité de base du spot, et
  // niveau de survol courant (0 → 1)
  const items = paintings.map((group) => {
    const spot = group.getObjectByName('spot');
    return {
      group,
      material: group.getObjectByName('canvas').material,
      spot,
      baseSpot: spot.intensity,
      level: 0,
    };
  });
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
        item.material.emissiveIntensity = item.level * HOVER_GLOW;
        item.spot.intensity = item.baseSpot * (1 + item.level * HOVER_SPOT_BOOST);
      }
    },
  };
}
