// Ramène un angle (rad) dans [-π, π]
export function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  return angle - twoPi * Math.round(angle / twoPi);
}
