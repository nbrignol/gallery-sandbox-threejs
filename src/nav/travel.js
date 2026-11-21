import * as THREE from 'three';
import {
  TRAVEL_MAX_DURATION,
  TRAVEL_MIN_DURATION,
  TRAVEL_SECONDS_PER_METER,
} from '../config.js';
import { wrapAngle } from './angle.js';

const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// Déplacement de la caméra en ligne droite vers un point de vue, avec easing.
// Le yaw est interpolé en même temps, par le chemin le plus court.
// Retourne { start(viewpoint, onDone), update(dt) }.
export function createTravel(camera, look) {
  let anim = null;

  function start(viewpoint, onDone) {
    const from = camera.position.clone();
    const distance = from.distanceTo(viewpoint.position);
    const yaw = look.getYaw();
    anim = {
      from,
      to: viewpoint.position,
      yaw,
      deltaYaw: wrapAngle(viewpoint.yaw - yaw),
      duration: THREE.MathUtils.clamp(
        distance * TRAVEL_SECONDS_PER_METER,
        TRAVEL_MIN_DURATION,
        TRAVEL_MAX_DURATION,
      ),
      elapsed: 0,
      onDone,
    };
  }

  function update(dt) {
    if (!anim) return;
    anim.elapsed += dt;
    const k = Math.min(1, anim.elapsed / anim.duration);
    const e = easeInOutCubic(k);
    camera.position.lerpVectors(anim.from, anim.to, e);
    look.setYaw(anim.yaw + anim.deltaYaw * e);
    if (k >= 1) {
      const { onDone } = anim;
      anim = null;
      onDone?.();
    }
  }

  return { start, update };
}
