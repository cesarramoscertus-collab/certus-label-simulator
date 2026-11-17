// Shared state for handling a product in front of the camera.
// The held product's world orientation = camera orientation × userQ, so "drag right" always spins it
// on screen the way your hand would, no matter where the camera is looking.
import * as THREE from 'three';
import { create } from 'zustand';
import type { LabelSection } from '../content/labelKit';
import type { ProductId } from '../store';

export const DIST = { min: 0.1, max: 0.75, default: 0.5, home: 0.5, focus: 0.18 };

export const inspect = {
  userQ: new THREE.Quaternion(),
  targetQ: null as THREE.Quaternion | null, // auto-rotate goal (double-click / revisit / buttons)
  yawVel: 0,
  pitchVel: 0,
  dist: DIST.default,
  distTarget: DIST.default,
  focus: new THREE.Vector3(),
  focusTarget: new THREE.Vector3(),
  pan: new THREE.Vector2(),
  panTarget: new THREE.Vector2(),
  t: 0, // 0 = on tray, 1 = in hand
  dragging: false,
};

export function resetInspect(defaultFocus: THREE.Vector3, dist = DIST.default) {
  DIST.home = dist;
  inspect.userQ.identity();
  inspect.targetQ = null;
  inspect.yawVel = inspect.pitchVel = 0;
  inspect.dist = inspect.distTarget = dist;
  inspect.focus.copy(defaultFocus);
  inspect.focusTarget.copy(defaultFocus);
  inspect.pan.set(0, 0);
  inspect.panTarget.set(0, 0);
}

export interface ProductHandle {
  id: ProductId;
  group: THREE.Object3D;
  labelMeshes: THREE.Mesh[];
  sections: LabelSection[];
  defaultFocus: THREE.Vector3;
  /** Section under a hit on a label mesh. */
  sectionAt: (hit: THREE.Intersection) => LabelSection | null;
  /** Local point + facing quaternion for a section (used by revisit / focus). */
  sectionPose: (s: LabelSection) => { point: THREE.Vector3; q: THREE.Quaternion };
}

export const registry: Partial<Record<ProductId, ProductHandle>> = {};

export function sectionFromUV(sections: LabelSection[], face: number, uv: THREE.Vector2, W: number, H: number) {
  const x = uv.x * W; const y = (1 - uv.y) * H;
  let best: LabelSection | null = null; let area = Infinity;
  for (const s of sections) {
    if (s.face !== face) continue;
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      const a = s.w * s.h;
      if (a < area) { area = a; best = s; }
    }
  }
  return best;
}

/** Quaternion (in camera space) that turns the local direction `n` to face the viewer. */
export function faceQuat(n: THREE.Vector3) {
  if (Math.abs(n.y) > 0.8) return new THREE.Quaternion().setFromEuler(new THREE.Euler(n.y > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0));
  const theta = Math.atan2(n.x, n.z);
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -theta);
}

export function focusOn(h: ProductHandle, s: LabelSection, dist = DIST.focus) {
  const { point, q } = h.sectionPose(s);
  inspect.targetQ = q;
  inspect.focusTarget.copy(point);
  inspect.panTarget.set(0, 0);
  inspect.distTarget = dist;
}

/** Aim hint: the label section currently under the centre of the view. */
export const useGaze = create<{ title: string | null }>(() => ({ title: null }));
