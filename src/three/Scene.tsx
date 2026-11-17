import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, PerformanceMonitor } from '@react-three/drei';
import { QUALITY } from '../quality';
import { useSim } from '../store';
import { Truck } from './Truck';
import { Site, Sky } from './Site';
import { PerimeterGuardBottle, InteriorGuardCarton, GelTube, WorkTablet, Gloves } from './Products';
import { inspect, registry, DIST, faceQuat, focusOn } from './inspect';

type Pose = { pos: THREE.Vector3; target: THREE.Vector3 };
const POSES: Record<string, Pose> = {
  intro: { pos: new THREE.Vector3(5.2, 2.5, 7.4), target: new THREE.Vector3(0, 1.3, -1.6) },
  truck: { pos: new THREE.Vector3(0, 1.6, 1.4), target: new THREE.Vector3(0, 0.98, -0.3) },
  inspect: { pos: new THREE.Vector3(0.0, 1.57, 1.3), target: new THREE.Vector3(0, 1.22, -0.55) },
};
// Portrait phones: wider lens, stand further back so the whole tray fits the narrow frame.
const PORTRAIT: Record<string, Pose> = {
  intro: { pos: new THREE.Vector3(6.4, 2.9, 9.6), target: new THREE.Vector3(0, 1.3, -1.6) },
  truck: { pos: new THREE.Vector3(0, 1.98, 2.05), target: new THREE.Vector3(0, 0.96, -0.2) },
  inspect: { pos: new THREE.Vector3(0, 1.62, 1.45), target: new THREE.Vector3(0, 1.25, -0.4) },
};

function CameraRig() {
  const { camera } = useThree();
  const mode = useSim((s) => s.mode);
  const cur = useRef({ pos: POSES.intro.pos.clone(), target: POSES.intro.target.clone() });
  const time = useRef(0);
  useEffect(() => {
    camera.position.copy(POSES.intro.pos);
    camera.lookAt(POSES.intro.target);
  }, [camera]);
  useFrame((_, dt) => {
    time.current += dt;
    const key = mode === 'inspect' ? 'inspect' : mode === 'truck' ? 'truck' : 'intro';
    const cam = camera as THREE.PerspectiveCamera;
    const portrait = cam.aspect < 0.8;
    const fov = portrait ? 56 : 42;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const goal = (portrait ? PORTRAIT : POSES)[key];
    const gp = goal.pos.clone();
    if (key === 'intro') {
      const a = Math.sin(time.current * 0.08) * 0.9;
      gp.x += a; gp.z -= a * 0.4;
    } else {
      // subtle "standing" sway — barely perceptible, keeps the view alive
      gp.x += Math.sin(time.current * 0.6) * 0.0025;
      gp.y += Math.sin(time.current * 0.9) * 0.0018;
    }
    const k = 1 - Math.pow(key === 'intro' ? 0.4 : 0.06, Math.min(dt, 0.12));
    cur.current.pos.lerp(gp, k);
    cur.current.target.lerp(goal.target, k);
    camera.position.copy(cur.current.pos);
    camera.lookAt(cur.current.target);
  });
  return null;
}

/** Dim, out-of-focus backdrop that fades in behind a held product so the label pops. */
function FocusBackdrop() {
  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null!);
  const op = useRef(0);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOp: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uOp; varying vec2 vUv;
      void main(){ float d = distance(vUv, vec2(0.5)); vec3 c = mix(vec3(0.05,0.13,0.19), vec3(0.01,0.06,0.1), smoothstep(0.1,0.7,d));
        gl_FragColor = vec4(c, uOp * mix(0.74, 0.93, smoothstep(0.12, 0.65, d))); }`,
  }), []);
  useFrame((_, dt) => {
    const held = useSim.getState().held;
    op.current += ((held ? 1 : 0) - op.current) * (1 - Math.pow(0.02, dt));
    mat.uniforms.uOp.value = op.current;
    const m = mesh.current;
    m.visible = op.current > 0.01;
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    m.position.copy(camera.position).addScaledVector(fwd, 0.95);
    m.quaternion.copy(camera.quaternion);
  });
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1}>
      <planeGeometry args={[4, 3]} />
    </mesh>
  );
}

function InspectLight() {
  const { camera } = useThree();
  const key = useRef<THREE.PointLight>(null!);
  const rim = useRef<THREE.PointLight>(null!);
  useFrame((_, dt) => {
    const held = useSim.getState().held;
    const k = 1 - Math.pow(0.05, dt);
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const f = new THREE.Vector3(); camera.getWorldDirection(f);
    key.current.position.copy(camera.position).addScaledVector(r, -0.35).addScaledVector(u, 0.3).addScaledVector(f, 0.05);
    key.current.intensity += ((held ? 0.9 : 0) - key.current.intensity) * k;
    rim.current.position.copy(camera.position).addScaledVector(r, 0.5).addScaledVector(u, 0.2).addScaledVector(f, 0.75);
    rim.current.intensity += ((held ? 0.35 : 0) - rim.current.intensity) * k;
  });
  return (
    <>
      <pointLight ref={key} intensity={0} distance={2.5} decay={2} color="#fff8ef" />
      <pointLight ref={rim} intensity={0} distance={1.5} decay={2} color="#dff3ff" />
    </>
  );
}

/**
 * Pointer handling for a held product — one code path for mouse, pen and touch.
 * 1 finger / left drag = rotate · 2 fingers = pinch zoom · right or Shift drag = slide
 * tap = open that label section in the flat reader · double-tap = turn & zoom to that spot.
 */
function InspectInput() {
  const { gl, camera } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let mode: 'rotate' | 'pan' | 'pinch' | null = null;
    let last = { x: 0, y: 0, t: 0 };
    let start = { x: 0, y: 0, t: 0, multi: false, moved: 0, button: 0 };
    let pinch0 = { d: 1, dist: DIST.default };
    let tapTimer: number | null = null;
    let lastTap = { x: -999, y: -999, t: 0 };
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const heldHandle = () => { const h = useSim.getState().held; return h ? registry[h] : undefined; };
    const active = () => { const s = useSim.getState(); return !!s.held && !s.labelView && inspect.t >= 1; };
    const hitAt = (cx: number, cy: number) => {
      const h = heldHandle(); if (!h) return null;
      const r = el.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(h.group, true)[0];
      return hit ? { h, hit } : null;
    };
    const twoDist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };

    const singleTap = (cx: number, cy: number) => {
      const r = hitAt(cx, cy); if (!r) return;
      const s = r.h.sectionAt(r.hit);
      if (s) {
        const box = el.getBoundingClientRect();
        useSim.getState().openLabel(r.h.id, s.id, { x: cx - box.left, y: cy - box.top });
      }
    };
    const doubleTap = (cx: number, cy: number) => {
      const r = hitAt(cx, cy); if (!r) return;
      const s = r.h.sectionAt(r.hit);
      if (s) { focusOn(r.h, s); return; }
      inspect.focusTarget.copy(r.h.group.worldToLocal(r.hit.point.clone()));
      inspect.panTarget.set(0, 0);
      inspect.distTarget = DIST.focus;
      if (r.hit.face) inspect.targetQ = faceQuat(r.hit.face.normal.clone());
    };
    const handleTap = (cx: number, cy: number) => {
      const now = performance.now();
      if (now - lastTap.t < 320 && Math.hypot(cx - lastTap.x, cy - lastTap.y) < 36) {
        if (tapTimer) clearTimeout(tapTimer);
        tapTimer = null; lastTap.t = 0;
        doubleTap(cx, cy);
        return;
      }
      lastTap = { x: cx, y: cy, t: now };
      tapTimer = window.setTimeout(() => { tapTimer = null; singleTap(cx, cy); }, 280);
    };

    const down = (e: PointerEvent) => {
      if (!active()) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
      if (pts.size === 1) {
        mode = e.button === 2 || e.shiftKey ? 'pan' : e.button === 0 ? 'rotate' : null;
        start = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false, moved: 0, button: e.button };
        last = { x: e.clientX, y: e.clientY, t: start.t };
        inspect.yawVel = inspect.pitchVel = 0;
      } else if (pts.size === 2) {
        mode = 'pinch'; start.multi = true;
        pinch0 = { d: twoDist(), dist: inspect.distTarget };
        inspect.yawVel = inspect.pitchVel = 0;
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pts.size >= 2) {
        inspect.distTarget = THREE.MathUtils.clamp(pinch0.dist * (pinch0.d / twoDist()), DIST.min, DIST.max);
        inspect.dist = inspect.distTarget;
        return;
      }
      if (!mode || pts.size !== 1) return;
      const dx = e.clientX - last.x; const dy = e.clientY - last.y;
      const now = performance.now(); const dtm = Math.max(1, now - last.t) / 1000;
      last = { x: e.clientX, y: e.clientY, t: now };
      start.moved = Math.max(start.moved, Math.hypot(e.clientX - start.x, e.clientY - start.y));
      if (start.moved < 6) return; // still a tap candidate
      inspect.dragging = true;
      if (mode === 'rotate') {
        inspect.targetQ = null;
        const touchBoost = e.pointerType === 'touch' ? 1.25 : 1;
        const k = 0.0085 * touchBoost * Math.max(0.45, inspect.dist / DIST.default);
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * k);
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * k);
        inspect.userQ.premultiply(qy).premultiply(qx);
        inspect.yawVel = ((dx * k) / dtm) * 0.6;
        inspect.pitchVel = ((dy * k) / dtm) * 0.6;
      } else if (mode === 'pan') {
        const s = inspect.dist * 0.0016;
        inspect.panTarget.x = THREE.MathUtils.clamp(inspect.panTarget.x + dx * s, -0.15, 0.15);
        inspect.panTarget.y = THREE.MathUtils.clamp(inspect.panTarget.y - dy * s, -0.15, 0.15);
        inspect.pan.copy(inspect.panTarget);
      }
    };
    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (pts.size === 1 && mode === 'pinch') {
        // one finger lifted: carry on rotating with the other, without a jump
        const [p] = [...pts.values()];
        mode = 'rotate'; last = { x: p.x, y: p.y, t: performance.now() }; start.moved = 99;
        return;
      }
      if (pts.size > 0) return;
      const wasTap = !cancelled && !start.multi && start.moved < 8 && performance.now() - start.t < 400 && start.button === 0;
      if (performance.now() - last.t > 80) { inspect.yawVel = inspect.pitchVel = 0; }
      mode = null;
      setTimeout(() => { inspect.dragging = false; }, 0);
      if (wasTap) handleTap(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => finish(e, false);
    const cancel = (e: PointerEvent) => finish(e, true);
    const wheel = (e: WheelEvent) => {
      if (!active()) return;
      e.preventDefault();
      const zoomIn = e.deltaY < 0;
      inspect.distTarget = THREE.MathUtils.clamp(inspect.distTarget * Math.exp(e.deltaY * 0.0011), DIST.min, DIST.max);
      const r = zoomIn ? hitAt(e.clientX, e.clientY) : null;
      if (r) {
        inspect.focusTarget.lerp(r.h.group.worldToLocal(r.hit.point.clone()), 0.22);
        inspect.panTarget.multiplyScalar(0.8);
      }
    };
    const ctx = (e: MouseEvent) => { if (useSim.getState().held) e.preventDefault(); };
    const gesture = (e: Event) => { if (useSim.getState().held) e.preventDefault(); };
    const key = (e: KeyboardEvent) => {
      const s = useSim.getState();
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (s.labelView || s.woOpen) return;
      if (!s.held) {
        if (s.mode === 'truck') {
          if (e.key === '1') s.pickUp('A');
          if (e.key === '2') s.pickUp('B');
        }
        return;
      }
      if (tgt && tgt.closest && tgt.closest('button, [role="button"], a')) { if (e.key.startsWith('Arrow')) return; }
      const step = Math.PI / 8;
      const rot = (axis: THREE.Vector3, a: number) => {
        const base = inspect.targetQ ?? inspect.userQ;
        inspect.targetQ = new THREE.Quaternion().setFromAxisAngle(axis, a).multiply(base);
      };
      if (e.shiftKey && e.key.startsWith('Arrow')) {
        const d = 0.02;
        if (e.key === 'ArrowLeft') inspect.panTarget.x -= d;
        if (e.key === 'ArrowRight') inspect.panTarget.x += d;
        if (e.key === 'ArrowUp') inspect.panTarget.y += d;
        if (e.key === 'ArrowDown') inspect.panTarget.y -= d;
        e.preventDefault(); return;
      }
      switch (e.key) {
        case 'ArrowLeft': rot(new THREE.Vector3(0, 1, 0), -step); e.preventDefault(); break;
        case 'ArrowRight': rot(new THREE.Vector3(0, 1, 0), step); e.preventDefault(); break;
        case 'ArrowUp': rot(new THREE.Vector3(1, 0, 0), -step); e.preventDefault(); break;
        case 'ArrowDown': rot(new THREE.Vector3(1, 0, 0), step); e.preventDefault(); break;
        case '+': case '=': inspect.distTarget = Math.max(DIST.min, inspect.distTarget * 0.8); break;
        case '-': case '_': inspect.distTarget = Math.min(DIST.max, inspect.distTarget * 1.25); break;
        case 'f': case 'F': rot(new THREE.Vector3(0, 1, 0), Math.PI); break;
        case 'r': case 'R': resetView(); break;
        case 'Enter': readCentre(); break;
        case 'Escape': s.putDown(); break;
      }
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', ctx);
    el.addEventListener('gesturestart', gesture as EventListener);
    window.addEventListener('keydown', key);
    return () => {
      if (tapTimer) clearTimeout(tapTimer);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', ctx);
      el.removeEventListener('gesturestart', gesture as EventListener);
      window.removeEventListener('keydown', key);
    };
  }, [gl, camera]);
  return null;
}

let centreSection: () => { product: 'A' | 'B'; id: string } | null = () => null;

/** Opens the flat reader on whatever section is under the centre of the view (or the front panel). */
export function readCentre() {
  const s = useSim.getState();
  if (!s.held) return;
  const c = centreSection();
  s.openLabel(s.held, c?.id ?? null, null);
}

function CentreProbe() {
  const { camera } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    centreSection = () => {
      const p = useSim.getState().held; const h = p ? registry[p] : undefined;
      if (!h) return null;
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hit = ray.intersectObjects(h.labelMeshes, false)[0];
      const sec = hit ? h.sectionAt(hit) : null;
      return sec ? { product: h.id, id: sec.id } : null;
    };
    return () => { centreSection = () => null; };
  }, [camera]);
  return null;
}

export function resetView() {
  const h = useSim.getState().held;
  const handle = h ? registry[h] : undefined;
  if (!handle) return;
  inspect.targetQ = new THREE.Quaternion();
  inspect.focusTarget.copy(handle.defaultFocus);
  inspect.panTarget.set(0, 0);
  inspect.distTarget = DIST.home;
}

export function turnHeld(angle: number) {
  const base = inspect.targetQ ?? inspect.userQ;
  inspect.targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle).multiply(base);
}

export function zoomHeld(factor: number) {
  inspect.distTarget = THREE.MathUtils.clamp(inspect.distTarget * factor, DIST.min, DIST.max);
}

export function showBack() {
  inspect.targetQ = faceQuat(new THREE.Vector3(0, 0, -1));
}

function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    sun.current.target.position.set(0, 0.8, -1.5);
    sun.current.target.updateMatrixWorld();
  }, []);
  return (
    <>
      <hemisphereLight args={['#cfe2f3', '#6f6a60', 0.55]} />
      <directionalLight
        ref={sun}
        position={[-6, 11, 9]}
        intensity={2.6}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[QUALITY.shadowMap, QUALITY.shadowMap]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
        shadow-radius={3}
      />
      {/* truck dome lights */}
      <pointLight position={[0, 2.3, -1.4]} intensity={2.2} distance={4} decay={1.6} color="#fff3e0" />
      <pointLight position={[0, 2.25, -0.25]} intensity={1.2} distance={3} decay={1.6} color="#fff3e0" />
      <Environment resolution={QUALITY.envRes} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#d9e8f6" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="circle" intensity={9} color="#fff3dc" position={[-6, 11, 9]} scale={3} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#a9c6e2" position={[0, 3, 12]} scale={[30, 6, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#8b877e" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#c9c4ba" position={[0, 3, -14]} scale={[34, 7, 1]} target={[0, 1, 0]} />
      </Environment>
    </>
  );
}

/** Renders only while the simulator is on screen and the 3D view isn't hidden behind the label reader. */
function useFrameloop(host: React.RefObject<HTMLElement>) {
  const labelOpen = useSim((st) => !!st.labelView);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const vis = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', vis);
    let io: IntersectionObserver | null = null;
    if (host.current && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.01 });
      io.observe(host.current);
    }
    return () => { document.removeEventListener('visibilitychange', vis); io?.disconnect(); };
  }, [host]);
  return onScreen && pageVisible && !labelOpen ? 'always' : 'never';
}

export function SimCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const frameloop = useFrameloop(host);
  const [dpr, setDpr] = useState(Math.min(QUALITY.maxDpr, typeof window !== 'undefined' ? window.devicePixelRatio : 1));
  return (
    <div ref={host} className="canvas-host">
    <Canvas
      shadows="soft"
      frameloop={frameloop}
      dpr={dpr}
      camera={{ fov: 42, near: 0.03, far: 900, position: [5.2, 2.5, 7.4] }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
      onCreated={(state) => { state.gl.setClearColor('#cfdbe4'); if (import.meta.env.DEV) (window as any).__r3f = state; }}
    >
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))} onIncline={() => setDpr((d) => Math.min(QUALITY.maxDpr, window.devicePixelRatio, +(d + 0.25).toFixed(2)))} />
      <fog attach="fog" args={['#dbe5ec', 35, 160]} />
      <Sky />
      <Lights />
      <CameraRig />
      <InspectInput />
      <CentreProbe />
      <InspectLight />
      <Site />
      <Truck />
      <PerimeterGuardBottle />
      <InteriorGuardCarton />
      <GelTube />
      <WorkTablet />
      <Gloves />
      {QUALITY.contactShadows && <ContactShadows position={[0, 0.9475, -0.1]} scale={[1.3, 0.9]} far={0.35} blur={2.2} opacity={0.55} resolution={512} frames={Infinity} />}
      <FocusBackdrop />
    </Canvas>
    </div>
  );
}
