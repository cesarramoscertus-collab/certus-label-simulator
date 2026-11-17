import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { buildPerimeterGuard, buildInteriorGuard, buildTubeLabel, A_LABEL_W, A_LABEL_H, CARTON, B_DIMS } from '../content/labels';
import { QUALITY } from '../quality';
import { useSim, type ProductId } from '../store';
import { inspect, registry, resetInspect, sectionFromUV, faceQuat, focusOn, useGaze, type ProductHandle } from './inspect';

const TRAY_Y = 0.955;

// ───────── shared handling: tray pose ⇄ hand pose ─────────
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function useHandling(id: ProductId, group: React.RefObject<THREE.Group>, restPos: THREE.Vector3, restQ: THREE.Quaternion, handle: () => ProductHandle | undefined) {
  const { camera, gl } = useThree();
  const held = useSim((s) => s.held === id);
  const focus = useSim((s) => (s.focus?.product === id ? s.focus : null));
  const tRef = useRef(0);
  const wasHeld = useRef(false);
  const gazeTick = useRef(0);
  const timeAcc = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    if (held && !wasHeld.current) {
      const h = handle();
      if (h) resetInspect(h.defaultFocus, (camera as THREE.PerspectiveCamera).aspect < 0.8 ? 0.36 : undefined);
    }
    wasHeld.current = held;
  }, [held, handle, camera]);

  // revisit from journal → pick up and turn straight to the section
  useEffect(() => {
    if (!focus) return;
    const h = handle();
    const s = h?.sections.find((x) => x.id === focus.sectionId);
    if (h && s) setTimeout(() => focusOn(h, s), 650);
  }, [focus, handle, id]);

  useFrame((_, dtRaw) => {
    const g = group.current; if (!g) return;
    const dt = Math.min(dtRaw, 0.05);
    const goal = held ? 1 : 0;
    const speed = 1 / 0.75;
    if (goal > tRef.current) tRef.current = Math.min(1, tRef.current + dt * speed);
    else if (goal < tRef.current) tRef.current = Math.max(0, tRef.current - dt * speed);
    const t = tRef.current;
    if (held) inspect.t = t;

    if (t === 0) {
      g.position.copy(restPos); g.quaternion.copy(restQ);
      return;
    }

    // ── integrate input ──
    if (held) {
      if (!inspect.dragging) { inspect.yawVel *= Math.pow(0.0025, dt); inspect.pitchVel *= Math.pow(0.0025, dt); }
      if (!inspect.dragging && (Math.abs(inspect.yawVel) > 1e-4 || Math.abs(inspect.pitchVel) > 1e-4)) {
        inspect.targetQ = null;
        const qy = tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), inspect.yawVel * dt);
        inspect.userQ.premultiply(qy);
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), inspect.pitchVel * dt);
        inspect.userQ.premultiply(qx);
      }
      if (inspect.targetQ) {
        inspect.userQ.slerp(inspect.targetQ, 1 - Math.pow(0.002, dt));
        if (inspect.userQ.angleTo(inspect.targetQ) < 0.002) inspect.targetQ = null;
      }
      const k = 1 - Math.pow(0.0015, dt);
      inspect.dist += (inspect.distTarget - inspect.dist) * k;
      inspect.focus.lerp(inspect.focusTarget, k);
      inspect.pan.lerp(inspect.panTarget, k);
    }

    // ── hand pose ──
    camera.getWorldDirection(fwd);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const worldQ = camera.quaternion.clone().multiply(inspect.userQ);
    const anchor = tmpV.copy(camera.position).addScaledVector(fwd, inspect.dist)
      .addScaledVector(right, inspect.pan.x).addScaledVector(up, inspect.pan.y);
    const handPos = anchor.clone().sub(inspect.focus.clone().applyQuaternion(worldQ));

    const e = ease(t);
    g.position.lerpVectors(restPos, handPos, e);
    g.position.y += Math.sin(Math.PI * e) * 0.07;
    g.quaternion.slerpQuaternions(restQ, worldQ, e);

    // ── gaze reading: what sits at the center of view, up close, long enough, is "read" ──
    if (held && t >= 1) {
      timeAcc.current += dt;
      if (timeAcc.current > 1) { useSim.getState().addInspectTime(id, timeAcc.current); timeAcc.current = 0; }
      gazeTick.current += dt;
      if (gazeTick.current > 0.15) {
        gazeTick.current = 0;
        const h = handle();
        if (!h) return;
        // aim hint only: what's under the centre of view. Reading happens in the label view.
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hit = inspect.dragging ? undefined : raycaster.intersectObjects(h.labelMeshes, false)[0];
        const title = hit ? h.sectionAt(hit)?.title ?? null : null;
        if (useGaze.getState().title !== title) useGaze.setState({ title });
      }
    }
  });

  useEffect(() => () => { useGaze.setState({ title: null }); }, []);
  void gl;
  return held;
}

// ───────── click / hover on tray, section clicks in hand ─────────
function useInteractions(id: ProductId, handle: () => ProductHandle | undefined) {
  const [hover, setHover] = useState(false);
  const mode = useSim((s) => s.mode);
  const held = useSim((s) => s.held);
  const canPick = mode === 'truck' && !held;

  useEffect(() => { if (!canPick) setHover(false); }, [canPick]);
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hover]);

  const bind = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { if (canPick) { e.stopPropagation(); setHover(true); } },
    onPointerOut: () => setHover(false),
    // picking up from the tray; taps on a held product are handled in InspectInput (touch + mouse)
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 8 || !canPick) return;
      e.stopPropagation();
      useSim.getState().pickUp(id);
    },
  };
  return { hover, bind, canPick };
}

function labelTexture(canvas: HTMLCanvasElement, maxAniso: number) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

function HoverTag({ show, text, y }: { show: boolean; text: string; y: number }) {
  if (!show) return null;
  return (
    <Html position={[0, y, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
      <div className="tag3d">{text}<span>Click to pick up</span></div>
    </Html>
  );
}

// ═════════════════════ PRODUCT A — PerimeterGuard SC bottle ═════════════════════
const A_R = 0.0455;
const A_LABEL = { y0: 0.026, h: 0.128 };
const A_THETA0 = -0.375 * Math.PI * 2; // puts the front panel's centre on local +Z

export function PerimeterGuardBottle() {
  const group = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const label = useMemo(() => buildPerimeterGuard(QUALITY.labelRes), []);
  const textures = useMemo(() => label.faces.map((f) => labelTexture(f, gl.capabilities.getMaxAnisotropy())), [label, gl]);
  const labelMesh = useRef<THREE.Mesh>(null!);
  const restPos = useMemo(() => new THREE.Vector3(-0.2, TRAY_Y, 0.02), []);
  const restQ = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.22, 0)), []);

  const bodyGeo = useMemo(() => {
    const pts = [
      [0, 0], [0.038, 0], [0.0435, 0.0025], [A_R, 0.009], [A_R, 0.158], [0.0445, 0.168], [0.040, 0.182],
      [0.031, 0.196], [0.021, 0.205], [0.0168, 0.209], [0.0168, 0.214], [0.0185, 0.2155], [0.0185, 0.218], [0.0165, 0.219], [0.0165, 0.222], [0, 0.222],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, QUALITY.segments === 160 ? 96 : 56);
    g.computeVertexNormals();
    return g;
  }, []);

  const handle = useMemo(() => () => registry.A, []);
  useEffect(() => {
    registry.A = {
      id: 'A', group: group.current, labelMeshes: [labelMesh.current], sections: label.sections,
      defaultFocus: new THREE.Vector3(0, 0.112, 0),
      sectionAt: (hit) => (hit.uv && hit.object === labelMesh.current ? sectionFromUV(label.sections, 0, hit.uv, A_LABEL_W, A_LABEL_H) : null),
      sectionPose: (s) => {
        const u = (s.x + s.w / 2) / A_LABEL_W;
        const v = 1 - (s.y + s.h / 2) / A_LABEL_H;
        const theta = A_THETA0 + u * Math.PI * 2;
        const n = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
        const point = n.clone().multiplyScalar(A_R).setY(A_LABEL.y0 + v * A_LABEL.h);
        return { point, q: faceQuat(n) };
      },
    };
    return () => { delete registry.A; };
  }, [label]);

  useHandling('A', group, restPos, restQ, handle);
  const { hover, bind, canPick } = useInteractions('A', handle);

  const bottomTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e9e9e4'; ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9b9b2'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(256, 256, 200, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#7d7d76'; ctx.textAlign = 'center';
    ctx.font = '700 64px Arial'; ctx.fillText('♲ 2', 256, 230);
    ctx.font = '700 40px Arial'; ctx.fillText('HDPE', 256, 280);
    ctx.font = '400 30px Arial'; ctx.fillText('LOT TRN-0426', 256, 340);
    ctx.fillText('TRAINING ONLY', 256, 378);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const capBump = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 8;
    const ctx = c.getContext('2d')!;
    for (let x = 0; x < 256; x += 4) { ctx.fillStyle = x % 8 ? '#fff' : '#000'; ctx.fillRect(x, 0, 4, 8); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1);
    return t;
  }, []);

  return (
    <group ref={group} {...bind}>
      <group position={[0, hover ? 0.012 : 0, 0]}>
        <mesh geometry={bodyGeo} castShadow receiveShadow>
          <meshPhysicalMaterial color="#f3f3ef" roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.45} sheen={0.3} sheenColor="#ffffff" />
        </mesh>
        <mesh ref={labelMesh} position={[0, A_LABEL.y0 + A_LABEL.h / 2, 0]} castShadow>
          <cylinderGeometry args={[A_R + 0.0006, A_R + 0.0006, A_LABEL.h, QUALITY.segments, 1, true, A_THETA0, Math.PI * 2]} />
          <meshPhysicalMaterial map={textures[0]} roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.35} />
        </mesh>
        {/* cap */}
        <mesh position={[0, 0.2335, 0]} castShadow>
          <cylinderGeometry args={[0.0215, 0.0222, 0.027, 72]} />
          <meshStandardMaterial color="#032C45" roughness={0.5} bumpMap={capBump} bumpScale={1.2} />
        </mesh>
        <mesh position={[0, 0.2472, 0]}>
          <cylinderGeometry args={[0.019, 0.0215, 0.0016, 72]} />
          <meshStandardMaterial color="#05385a" roughness={0.42} />
        </mesh>
        {/* bottom: molded lot code + resin mark, readable when the bottle is turned over */}
        <mesh position={[0, -0.0004, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.036, 48]} />
          <meshStandardMaterial map={bottomTex} transparent roughness={0.5} />
        </mesh>
        {/* induction-seal band */}
        <mesh position={[0, 0.2205, 0]}>
          <cylinderGeometry args={[0.0224, 0.0224, 0.0035, 72]} />
          <meshStandardMaterial color="#6FCBCF" roughness={0.45} />
        </mesh>
      </group>
      <HoverTag show={hover && canPick} text="PerimeterGuard SC" y={0.3} />
    </group>
  );
}

// ═════════════════════ PRODUCT B — InteriorGuard Gel carton ═════════════════════
const FACE_N = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
];
const FACE_T = [
  new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
];
const FACE_SIZE: [number, number][] = [
  [CARTON.d, CARTON.h], [CARTON.d, CARTON.h], [CARTON.w, CARTON.d], [CARTON.w, CARTON.d], [CARTON.w, CARTON.h], [CARTON.w, CARTON.h],
];
const HALF = [CARTON.w / 2, CARTON.w / 2, CARTON.h / 2, CARTON.h / 2, CARTON.d / 2, CARTON.d / 2];

export function InteriorGuardCarton() {
  const group = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const label = useMemo(() => buildInteriorGuard(QUALITY.labelRes), []);
  const textures = useMemo(() => label.faces.map((f) => labelTexture(f, gl.capabilities.getMaxAnisotropy())), [label, gl]);
  const box = useRef<THREE.Mesh>(null!);
  const restPos = useMemo(() => new THREE.Vector3(0.11, TRAY_Y, -0.02), []);
  const restQ = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.2, 0)), []);
  const handle = useMemo(() => () => registry.B, []);

  useEffect(() => {
    registry.B = {
      id: 'B', group: group.current, labelMeshes: [box.current], sections: label.sections,
      defaultFocus: new THREE.Vector3(0, CARTON.h / 2, 0),
      sectionAt: (hit) => {
        if (!hit.uv || !hit.face || hit.object !== box.current) return null;
        const fi = hit.face.materialIndex;
        return sectionFromUV(label.sections, fi, hit.uv, B_DIMS[fi][0], B_DIMS[fi][1]);
      },
      sectionPose: (s) => {
        const [cw, ch] = B_DIMS[s.face];
        const u = (s.x + s.w / 2) / cw;
        const v = 1 - (s.y + s.h / 2) / ch;
        const [fw, fh] = FACE_SIZE[s.face];
        const n = FACE_N[s.face];
        const point = n.clone().multiplyScalar(HALF[s.face])
          .addScaledVector(FACE_T[s.face], (u - 0.5) * fw)
          .add(new THREE.Vector3(0, (v - 0.5) * fh + CARTON.h / 2, 0));
        return { point, q: faceQuat(n) };
      },
    };
    return () => { delete registry.B; };
  }, [label]);

  useHandling('B', group, restPos, restQ, handle);
  const { hover, bind, canPick } = useInteractions('B', handle);

  return (
    <group ref={group} {...bind}>
      <group position={[0, hover ? 0.012 : 0, 0]}>
        <mesh ref={box} position={[0, CARTON.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[CARTON.w, CARTON.h, CARTON.d]} />
          {textures.map((t, i) => (
            <meshPhysicalMaterial key={i} attach={`material-${i}`} map={t} roughness={0.55} clearcoat={0.18} clearcoatRoughness={0.5} />
          ))}
        </mesh>
        {/* tuck flap seam */}
        <mesh position={[0, CARTON.h + 0.0004, -CARTON.d / 2 + 0.002]}>
          <boxGeometry args={[CARTON.w - 0.002, 0.0008, 0.003]} />
          <meshStandardMaterial color="#021f31" roughness={0.6} />
        </mesh>
      </group>
      <HoverTag show={hover && canPick} text="InteriorGuard Gel" y={0.28} />
    </group>
  );
}

// ═════════════════════ loose gel reagent tube (set dressing, legible) ═════════════════════
export function GelTube() {
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(buildTubeLabel());
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, []);
  return (
    <group position={[0.31, TRAY_Y + 0.0125, 0.13]} rotation={[0, -0.35, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.0118, 0.0118, 0.118, 48, 1, true]} />
        <meshPhysicalMaterial color="#f0f4f6" roughness={0.25} transmission={0} clearcoat={0.6} />
      </mesh>
      <mesh rotation={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.0122, 0.0122, 0.07, 48, 1, true]} />
        <meshStandardMaterial map={tex} roughness={0.45} />
      </mesh>
      {/* flange + plunger */}
      <mesh position={[0, -0.061, 0]} castShadow>
        <cylinderGeometry args={[0.019, 0.019, 0.004, 32]} />
        <meshStandardMaterial color="#e9eef0" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.078, 0]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.032, 16]} />
        <meshStandardMaterial color="#e9eef0" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.095, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.003, 32]} />
        <meshStandardMaterial color="#e9eef0" roughness={0.4} />
      </mesh>
      {/* tip + cap */}
      <mesh position={[0, 0.069, 0]} castShadow>
        <cylinderGeometry args={[0.004, 0.0118, 0.02, 32]} />
        <meshStandardMaterial color="#e9eef0" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.087, 0]} castShadow>
        <cylinderGeometry args={[0.0052, 0.0052, 0.018, 24]} />
        <meshStandardMaterial color="#032C45" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ═════════════════════ work-order tablet ═════════════════════
export function WorkTablet() {
  const [hover, setHover] = useState(false);
  const mode = useSim((s) => s.mode);
  const can = mode === 'truck';
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 720;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f4f7f9'; ctx.fillRect(0, 0, 1024, 720);
    ctx.fillStyle = '#032C45'; ctx.fillRect(0, 0, 1024, 120);
    ctx.fillStyle = '#6FCBCF'; ctx.fillRect(0, 120, 1024, 8);
    ctx.fillStyle = '#fff'; ctx.font = '700 56px Arial'; ctx.fillText('WORK ORDER', 40, 80);
    ctx.font = '400 34px Arial'; ctx.fillText('WO-TRN-40812', 700, 78);
    const rows = ['Complaint', 'Location', 'Treatment area', 'Food handling', 'Previous treatments'];
    rows.forEach((r, i) => {
      ctx.fillStyle = '#dfe6ea'; ctx.fillRect(40, 170 + i * 104, 944, 84);
      ctx.fillStyle = '#032C45'; ctx.font = '700 36px Arial'; ctx.fillText(r, 64, 225 + i * 104);
      ctx.fillStyle = i >= 2 ? '#b0631b' : '#4a5863'; ctx.fillRect(640, 196 + i * 104, i >= 2 ? 300 : 260, 32);
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => {
    document.body.style.cursor = hover && can ? 'pointer' : '';
  }, [hover, can]);
  return (
    <group
      position={[0.43, TRAY_Y + 0.006, -0.17]} rotation={[-Math.PI / 2, 0, -0.32]}
      onPointerOver={(e) => { if (can) { e.stopPropagation(); setHover(true); } }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { if (can && e.delta < 6) { e.stopPropagation(); useSim.getState().setWO(true); } }}
    >
      <RoundedBox args={[0.25, 0.18, 0.012]} radius={0.01} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={hover && can ? '#2b4d61' : '#1d2a33'} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0065]}>
        <planeGeometry args={[0.218, 0.153]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} roughness={0.15} />
      </mesh>
      {hover && can && (
        <Html position={[0, 0, 0.06]} center style={{ pointerEvents: 'none' }}>
          <div className="tag3d">Work order<span>Click to open</span></div>
        </Html>
      )}
    </group>
  );
}

// ═════════════════════ nitrile gloves ═════════════════════
function Glove({ position, rotation, mirror = 1 }: { position: [number, number, number]; rotation: [number, number, number]; mirror?: number }) {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#3a6fb0', roughness: 0.48, sheen: 0.6, sheenColor: new THREE.Color('#9cc3ef') }), []);
  const fingers: [number, number, number][] = [[-0.03, 0.075, 0.062], [-0.01, 0.083, 0.07], [0.01, 0.08, 0.066], [0.029, 0.07, 0.054]];
  return (
    <group position={position} rotation={rotation} scale={[mirror, 1, 1]}>
      <RoundedBox args={[0.085, 0.1, 0.02]} radius={0.009} smoothness={3} material={mat} castShadow />
      {fingers.map(([x, y, l], i) => (
        <mesh key={i} position={[x, y + l / 2 - 0.03, 0]} rotation={[0, 0, (x * 1.6)]} material={mat} castShadow>
          <capsuleGeometry args={[0.0085, l - 0.017, 4, 12]} />
        </mesh>
      ))}
      <mesh position={[0.052, 0.005, 0]} rotation={[0, 0, -0.9]} material={mat} castShadow>
        <capsuleGeometry args={[0.0095, 0.042, 4, 12]} />
      </mesh>
      <mesh position={[0, -0.075, 0]} material={mat} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.012]} />
      </mesh>
    </group>
  );
}

export function Gloves() {
  return (
    <group>
      <Glove position={[-0.47, TRAY_Y + 0.011, 0.06]} rotation={[-Math.PI / 2, 0, 0.5]} />
      <Glove position={[-0.43, TRAY_Y + 0.024, 0.0]} rotation={[-Math.PI / 2 + 0.08, 0.05, 0.15]} mirror={-1} />
    </group>
  );
}
