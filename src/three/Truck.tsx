// Service truck: enclosed utility body with rear barn doors open, shelving, sprayers, pull-out work tray.
// Units are meters internally (never shown to learners).
import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { diamondPlate, rubberMat, matBump, truckDecal, shelfBinLabel } from './textures';

const FLOOR_Y = 0.82;
const ROOF_Y = 2.5;
const HALF_W = 1.06;
const LEN = 3.0;

const paint = new THREE.MeshPhysicalMaterial({ color: '#f7f8f8', roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const interiorPanel = new THREE.MeshStandardMaterial({ color: '#d9dcde', roughness: 0.62, metalness: 0.15 });
const alu = new THREE.MeshStandardMaterial({ color: '#c3c8cc', roughness: 0.32, metalness: 0.85 });
const darkAlu = new THREE.MeshStandardMaterial({ color: '#7e858a', roughness: 0.4, metalness: 0.8 });
const blackPlastic = new THREE.MeshStandardMaterial({ color: '#1c1f22', roughness: 0.7 });
const rubber = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.9 });

function Box({ p, s, m, cast = true, receive = true }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; cast?: boolean; receive?: boolean }) {
  return (
    <mesh position={p} material={m} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Wheel({ p }: { p: [number, number, number] }) {
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow receiveShadow material={rubber}><cylinderGeometry args={[0.4, 0.4, 0.27, 40]} /></mesh>
      <mesh position={[0, p[0] > 0 ? 0.137 : -0.137, 0]} material={alu}><cylinderGeometry args={[0.22, 0.22, 0.01, 32]} /></mesh>
      <mesh position={[0, p[0] > 0 ? 0.14 : -0.14, 0]} material={darkAlu}><cylinderGeometry args={[0.07, 0.07, 0.02, 16]} /></mesh>
    </group>
  );
}

function Bin({ p, color, label, w = 0.32 }: { p: [number, number, number]; color: string; label: string; w?: number }) {
  const lt = shelfBinLabel(label);
  return (
    <group position={p}>
      <RoundedBox args={[w, 0.17, 0.36]} radius={0.012} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0.02, 0.1815]}>
        <planeGeometry args={[w * 0.7, 0.05]} />
        <meshStandardMaterial map={lt} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Jug({ p, color = '#e9ecef', cap = '#2e6f9e', h = 0.26 }: { p: [number, number, number]; color?: string; cap?: string; h?: number }) {
  return (
    <group position={p}>
      <RoundedBox args={[0.13, h, 0.09]} radius={0.02} smoothness={3} position={[0, h / 2, 0]} castShadow>
        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.2} />
      </RoundedBox>
      <mesh position={[0.03, h + 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.04, 20]} />
        <meshStandardMaterial color={cap} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Shelving({ side }: { side: 1 | -1 }) {
  const x = side * (HALF_W - 0.25);
  const depth = 0.42;
  const levels = [1.18, 1.62, 2.06];
  const zs = [-0.35, -1.25, -2.15, -2.9];
  return (
    <group>
      {zs.map((z) => [x - depth / 2 + 0.01, x + depth / 2 - 0.01].map((ux, i) => (
        <Box key={`${z}-${i}`} p={[ux, (FLOOR_Y + ROOF_Y) / 2, z]} s={[0.035, ROOF_Y - FLOOR_Y, 0.035]} m={darkAlu} />
      )))}
      {levels.map((y) => (
        <group key={y}>
          <Box p={[x, y, -1.62]} s={[depth, 0.025, 2.6]} m={alu} />
          <Box p={[x - side * (depth / 2 - 0.01), y + 0.04, -1.62]} s={[0.02, 0.06, 2.6]} m={alu} />
        </group>
      ))}
    </group>
  );
}

function BackpackSprayer({ p }: { p: [number, number, number] }) {
  return (
    <group position={p} rotation={[0, -0.4, 0]}>
      <RoundedBox args={[0.36, 0.52, 0.2]} radius={0.06} smoothness={4} position={[0, 0.26, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#e6ecef" roughness={0.35} clearcoat={0.3} transparent opacity={0.96} />
      </RoundedBox>
      <mesh position={[0, 0.54, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.05, 24]} /><meshStandardMaterial color="#032C45" roughness={0.5} /></mesh>
      {[-0.1, 0.1].map((sx) => (
        <mesh key={sx} position={[sx, 0.3, -0.11]} castShadow><boxGeometry args={[0.05, 0.5, 0.012]} /><meshStandardMaterial color="#032C45" roughness={0.8} /></mesh>
      ))}
      <mesh position={[0.2, 0.55, 0.05]} rotation={[0.2, 0, -0.15]} castShadow><cylinderGeometry args={[0.008, 0.008, 0.9, 10]} /><meshStandardMaterial color="#9aa2a8" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  );
}

function CompressionSprayer({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow><cylinderGeometry args={[0.085, 0.085, 0.4, 40]} /><meshStandardMaterial color="#d7dde1" metalness={0.95} roughness={0.18} /></mesh>
      <mesh position={[0, 0.41, 0]} castShadow><sphereGeometry args={[0.085, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d7dde1" metalness={0.95} roughness={0.18} /></mesh>
      <mesh position={[0, 0.52, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.16, 12]} /><meshStandardMaterial color="#2a2d30" /></mesh>
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.016, 0.016, 0.14, 12]} /><meshStandardMaterial color="#6FCBCF" roughness={0.5} /></mesh>
      <mesh position={[0.07, 0.3, 0.06]} rotation={[0.3, 0, -0.35]} castShadow><torusGeometry args={[0.09, 0.008, 8, 24, Math.PI * 1.3]} /><meshStandardMaterial color="#1d1f22" roughness={0.6} /></mesh>
    </group>
  );
}

export function Truck() {
  const dp = diamondPlate();
  const mat = rubberMat();
  const mb = matBump();
  const decal = truckDecal();
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b9bec2', metalness: 0.85, roughness: 0.35, bumpMap: dp, bumpScale: 2.5 }), [dp]);

  return (
    <group>
      {/* chassis + wheels */}
      <Box p={[0, 0.55, -2.4]} s={[1.1, 0.18, 5.6]} m={blackPlastic} />
      <Wheel p={[0.93, 0.4, -0.95]} />
      <Wheel p={[-0.93, 0.4, -0.95]} />
      <Wheel p={[0.93, 0.4, -4.55]} />
      <Wheel p={[-0.93, 0.4, -4.55]} />
      {/* wheel wells */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.0, 0.68, -0.95]} rotation={[0, Math.PI / 2, 0]} material={blackPlastic}>
          <cylinderGeometry args={[0.47, 0.47, 0.14, 32, 1, true, 0, Math.PI]} />
        </mesh>
      ))}

      {/* body shell */}
      <Box p={[0, FLOOR_Y - 0.05, -LEN / 2]} s={[HALF_W * 2 + 0.04, 0.1, LEN]} m={paint} />
      <mesh position={[0, FLOOR_Y + 0.002, -LEN / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[HALF_W * 2, LEN]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[s * (HALF_W + 0.01), (FLOOR_Y + ROOF_Y) / 2, -LEN / 2]} s={[0.04, ROOF_Y - FLOOR_Y + 0.02, LEN]} m={paint} />
          <mesh position={[s * (HALF_W - 0.012), (FLOOR_Y + ROOF_Y) / 2, -LEN / 2]} rotation={[0, -s * Math.PI / 2, 0]} material={interiorPanel} receiveShadow>
            <planeGeometry args={[LEN, ROOF_Y - FLOOR_Y]} />
          </mesh>
          {/* side graphics */}
          <mesh position={[s * (HALF_W + 0.032), 1.65, -1.55]} rotation={[0, s * Math.PI / 2, 0]}>
            <planeGeometry args={[2.6, 1.3]} />
            <meshStandardMaterial map={decal} transparent roughness={0.35} />
          </mesh>
          {/* rear posts + tail lights */}
          <Box p={[s * (HALF_W - 0.02), (FLOOR_Y + ROOF_Y) / 2, 0.0]} s={[0.1, ROOF_Y - FLOOR_Y, 0.06]} m={paint} />
          <mesh position={[s * (HALF_W + 0.035), 1.25, 0.0]}>
            <boxGeometry args={[0.03, 0.42, 0.09]} />
            <meshStandardMaterial color="#8a0d10" emissive="#ff1b1b" emissiveIntensity={0.35} roughness={0.2} />
          </mesh>
          <mesh position={[s * (HALF_W + 0.035), 0.98, 0.0]}>
            <boxGeometry args={[0.03, 0.1, 0.09]} />
            <meshStandardMaterial color="#e8e2d6" emissive="#ffffff" emissiveIntensity={0.05} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* roof */}
      <RoundedBox args={[HALF_W * 2 + 0.06, 0.1, LEN + 0.04]} radius={0.04} smoothness={4} position={[0, ROOF_Y + 0.04, -LEN / 2]} castShadow receiveShadow material={paint} />
      <mesh position={[0, ROOF_Y - 0.012, -LEN / 2]} rotation={[Math.PI / 2, 0, 0]} material={interiorPanel}>
        <planeGeometry args={[HALF_W * 2, LEN]} />
      </mesh>
      {/* header over opening */}
      <Box p={[0, ROOF_Y - 0.04, 0.0]} s={[HALF_W * 2, 0.1, 0.06]} m={paint} />
      {/* ceiling LED strips */}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, ROOF_Y - 0.02, -1.4]}>
          <boxGeometry args={[0.06, 0.012, 2.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff6e6" emissiveIntensity={2.2} />
        </mesh>
      ))}
      {/* front bulkhead */}
      <Box p={[0, (FLOOR_Y + ROOF_Y) / 2, -LEN]} s={[HALF_W * 2, ROOF_Y - FLOOR_Y, 0.04]} m={interiorPanel} />
      {/* fire extinguisher on bulkhead */}
      <group position={[0.0, 1.35, -LEN + 0.12]}>
        <mesh castShadow><cylinderGeometry args={[0.065, 0.065, 0.42, 28]} /><meshPhysicalMaterial color="#b8161b" roughness={0.3} clearcoat={1} /></mesh>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.02, 0.03, 0.08, 12]} /><meshStandardMaterial color="#222" /></mesh>
      </group>

      {/* rear bumper + step */}
      <Box p={[0, 0.56, 0.18]} s={[2.0, 0.16, 0.2]} m={blackPlastic} />
      <Box p={[0, 0.6, 0.31]} s={[0.6, 0.04, 0.12]} m={floorMat} />
      <mesh position={[0.0, 0.47, 0.3]} castShadow material={darkAlu}><boxGeometry args={[0.08, 0.08, 0.14]} /></mesh>

      {/* cab */}
      <group position={[0, 0, -LEN - 0.05]}>
        <RoundedBox args={[2.08, 1.35, 1.35]} radius={0.1} smoothness={4} position={[0, 1.55, -0.72]} castShadow receiveShadow material={paint} />
        <RoundedBox args={[2.0, 0.65, 1.0]} radius={0.12} smoothness={4} position={[0, 1.0, -1.85]} castShadow receiveShadow material={paint} />
        <mesh position={[0, 1.7, -1.405]} rotation={[-0.35, 0, 0]}>
          <planeGeometry args={[1.85, 0.75]} />
          <meshPhysicalMaterial color="#1b2731" roughness={0.05} metalness={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.045, 1.75, -0.7]} rotation={[0, s * Math.PI / 2, 0]}>
            <planeGeometry args={[1.0, 0.55]} />
            <meshPhysicalMaterial color="#1b2731" roughness={0.05} metalness={0.4} />
          </mesh>
        ))}
        <Box p={[0, 0.72, -2.38]} s={[2.04, 0.22, 0.12]} m={blackPlastic} />
      </group>

      {/* rear doors (open) */}
      <group position={[-HALF_W, FLOOR_Y + 0.03, 0.03]} rotation={[0, -1.82, 0]}>
        <DoorLeaf side={-1} />
      </group>
      <group position={[HALF_W, FLOOR_Y + 0.03, 0.03]} rotation={[0, 1.82, 0]}>
        <DoorLeaf side={1} />
      </group>

      {/* shelving + stock */}
      <Shelving side={-1} />
      <Shelving side={1} />
      <Bin p={[-(HALF_W - 0.25), 1.28, -0.55]} color="#032C45" label="BAIT STATIONS" />
      <Bin p={[-(HALF_W - 0.25), 1.28, -1.0]} color="#5b6670" label="GLUE BOARDS" />
      <Bin p={[-(HALF_W - 0.25), 1.72, -0.55]} color="#5b6670" label="PPE" />
      <Bin p={[-(HALF_W - 0.25), 1.72, -1.0]} color="#032C45" label="DUSTERS" />
      <Bin p={[-(HALF_W - 0.25), 2.16, -0.6]} color="#3c7f86" label="FLAGS" />
      <Bin p={[(HALF_W - 0.25), 1.28, -1.05]} color="#032C45" label="MONITORS" />
      <Bin p={[(HALF_W - 0.25), 2.16, -0.6]} color="#5b6670" label="SPILL KIT" />
      <Jug p={[(HALF_W - 0.31), 1.194, -0.5]} />
      <Jug p={[(HALF_W - 0.17), 1.194, -0.52]} color="#dfe6ea" cap="#032C45" h={0.22} />
      <Jug p={[(HALF_W - 0.25), 1.634, -0.5]} color="#f0f2f2" cap="#6FCBCF" />
      <Jug p={[(HALF_W - 0.25), 1.634, -0.85]} color="#f0f2f2" cap="#6FCBCF" />
      <group position={[(HALF_W - 0.25), 1.64, -1.3]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.3, 24]} /><meshStandardMaterial color="#f4f4f4" roughness={0.9} /></mesh>
      </group>

      <CompressionSprayer p={[0.62, FLOOR_Y, -1.05]} />
      <BackpackSprayer p={[-0.55, FLOOR_Y, -1.9]} />
      <group position={[0.55, FLOOR_Y, -2.4]}>
        <mesh position={[0, 0.17, 0]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.13, 0.34, 32]} /><meshStandardMaterial color="#e2b819" roughness={0.45} /></mesh>
        <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.155, 0.155, 0.03, 32]} /><meshStandardMaterial color="#1c1f22" /></mesh>
      </group>
      <Box p={[0, FLOOR_Y + 0.12, -2.6]} s={[0.55, 0.24, 0.3]} m={new THREE.MeshStandardMaterial({ color: '#032C45', roughness: 0.5, metalness: 0.2 })} />

      {/* pull-out work tray */}
      <group>
        <Box p={[0, 0.9, -0.42]} s={[1.3, 0.09, 1.5]} m={alu} />
        {[-1, 1].map((s) => (
          <Box key={s} p={[s * 0.645, 0.97, -0.42]} s={[0.02, 0.05, 1.5]} m={alu} />
        ))}
        <Box p={[0, 0.97, 0.325]} s={[1.3, 0.05, 0.02]} m={alu} />
        <mesh position={[0, 0.9465, -0.42]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.26, 1.46]} />
          <meshStandardMaterial map={mat} bumpMap={mb} bumpScale={1.5} roughness={0.92} />
        </mesh>
        <Box p={[0, 0.84, 0.31]} s={[0.25, 0.04, 0.05]} m={blackPlastic} />
      </group>
    </group>
  );
}

function DoorLeaf({ side }: { side: 1 | -1 }) {
  const decal = truckDecal();
  const w = HALF_W - 0.01;
  const h = ROOF_Y - FLOOR_Y - 0.06;
  const organizer = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b3238', roughness: 0.85 }), []);
  // door extends from the hinge toward the truck centre (closed); local +z = outside face
  const cx = -side * w / 2;
  return (
    <group>
      <mesh position={[cx, h / 2, 0]} material={paint} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.05]} />
      </mesh>
      <mesh position={[cx, h * 0.55, 0.0265]}>
        <planeGeometry args={[w * 0.96, w * 0.48]} />
        <meshStandardMaterial map={decal} transparent roughness={0.35} />
      </mesh>
      <mesh position={[cx, h / 2, -0.0265]} rotation={[0, Math.PI, 0]} material={interiorPanel} receiveShadow>
        <planeGeometry args={[w - 0.04, h - 0.04]} />
      </mesh>
      {[0.42, 0.9].map((y) => (
        <group key={y}>
          <Box p={[cx, y, -0.065]} s={[w - 0.18, 0.18, 0.07]} m={organizer} />
          <Box p={[cx, y + 0.095, -0.065]} s={[w - 0.18, 0.012, 0.072]} m={darkAlu} />
        </group>
      ))}
      <Box p={[-side * 0.09, h * 0.5, -0.04]} s={[0.03, 0.22, 0.03]} m={darkAlu} />
    </group>
  );
}

