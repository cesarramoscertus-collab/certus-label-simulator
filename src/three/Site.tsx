// Commercial facility parking lot: asphalt, striping, curb, tilt-up building, trees, sky.
import { useMemo } from 'react';
import * as THREE from 'three';
import { asphalt, asphaltBump, concrete, facilitySign, windowTex } from './textures';

export function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#4f8fd1') },
      mid: { value: new THREE.Color('#a9cbe8') },
      horizon: { value: new THREE.Color('#e6eef3') },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vP;
      void main(){ float h = clamp(vP.y, 0.0, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.75, h));
        // soft cloud bands
        float cl = smoothstep(0.55, 0.95, sin(vP.x*6.0 + vP.z*3.0) * 0.5 + 0.5) * smoothstep(0.05, 0.25, h) * (1.0 - smoothstep(0.35, 0.6, h));
        c = mix(c, vec3(0.97), cl * 0.35);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }), []);
  return (
    <mesh material={mat} scale={400}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

function Tree({ p, s = 1 }: { p: [number, number, number]; s?: number }) {
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d6b3a', roughness: 0.9, flatShading: true }), []);
  const leaf2 = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5d7d44', roughness: 0.9, flatShading: true }), []);
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, 2.4, 10]} /><meshStandardMaterial color="#5a4632" roughness={1} /></mesh>
      <mesh position={[0, 3.1, 0]} material={leaf} castShadow><icosahedronGeometry args={[1.5, 1]} /></mesh>
      <mesh position={[0.9, 2.7, 0.3]} material={leaf2} castShadow><icosahedronGeometry args={[1.1, 1]} /></mesh>
      <mesh position={[-0.8, 2.8, -0.4]} material={leaf2} castShadow><icosahedronGeometry args={[1.15, 1]} /></mesh>
      <mesh position={[0.1, 3.9, 0.2]} material={leaf} castShadow><icosahedronGeometry args={[1.0, 1]} /></mesh>
    </group>
  );
}

function Building() {
  const conc = concrete();
  const win = windowTex();
  const sign = facilitySign();
  const W = 40; const H = 7.2; const Z = -21;
  return (
    <group>
      <mesh position={[0, H / 2, Z]} castShadow receiveShadow>
        <boxGeometry args={[W, H, 12]} />
        <meshStandardMaterial map={conc} roughness={0.85} />
      </mesh>
      {/* parapet cap */}
      <mesh position={[0, H + 0.1, Z]}><boxGeometry args={[W + 0.2, 0.2, 12.2]} /><meshStandardMaterial color="#a8a39a" roughness={0.8} /></mesh>
      {/* storefront windows */}
      {[-13, -9, -5, 5, 9, 13].map((x) => (
        <mesh key={x} position={[x, 2.1, Z + 6.01]}>
          <planeGeometry args={[3.2, 2.6]} />
          <meshPhysicalMaterial map={win} roughness={0.05} metalness={0.5} />
        </mesh>
      ))}
      {[-13, -9, -5, 5, 9, 13].map((x) => (
        <mesh key={'h' + x} position={[x, 5.3, Z + 6.01]}>
          <planeGeometry args={[3.2, 1.1]} />
          <meshPhysicalMaterial map={win} roughness={0.05} metalness={0.5} />
        </mesh>
      ))}
      {/* entrance */}
      <mesh position={[0, 1.5, Z + 6.02]}><planeGeometry args={[4.2, 3.0]} /><meshPhysicalMaterial map={win} roughness={0.04} metalness={0.6} /></mesh>
      <mesh position={[0, 3.3, Z + 6.9]} castShadow><boxGeometry args={[5.6, 0.25, 1.8]} /><meshStandardMaterial color="#032C45" roughness={0.6} /></mesh>
      <mesh position={[0, 4.6, Z + 6.03]}><planeGeometry args={[10, 1.88]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
      {/* sidewalk + curb */}
      <mesh position={[0, 0.07, Z + 7.6]} receiveShadow><boxGeometry args={[W, 0.14, 3.2]} /><meshStandardMaterial color="#bdb8ae" roughness={0.9} /></mesh>
      {/* side wing */}
      <mesh position={[-27, 3, -12]} castShadow receiveShadow><boxGeometry args={[14, 6, 26]} /><meshStandardMaterial map={conc} roughness={0.85} color="#d8d2c6" /></mesh>
    </group>
  );
}

export function Site() {
  const asp = asphalt();
  const ab = asphaltBump();
  const stripe = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e6dc', roughness: 0.75 }), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial map={asp} bumpMap={ab} bumpScale={0.8} roughness={0.94} />
      </mesh>
      {/* parking stripes */}
      {[-6.6, -3.6, 3.6, 6.6, 9.6].map((x) => (
        <mesh key={x} position={[x, 0.004, -2.5]} rotation={[-Math.PI / 2, 0, 0]} material={stripe} receiveShadow>
          <planeGeometry args={[0.12, 5.4]} />
        </mesh>
      ))}
      {/* wheel stops */}
      {[-5.1, 5.1, 8.1].map((x) => (
        <mesh key={x} position={[x, 0.07, -5.6]} castShadow receiveShadow><boxGeometry args={[1.8, 0.14, 0.2]} /><meshStandardMaterial color="#c9c4b8" roughness={0.9} /></mesh>
      ))}
      <Building />
      <Tree p={[11, 0, -9]} s={1.15} />
      <Tree p={[16, 0, -6]} s={0.95} />
      <Tree p={[-10, 0, 6]} s={1.05} />
      <Tree p={[14, 0, 7]} s={1.2} />
      {/* light pole */}
      <group position={[7.5, 0, 3.5]}>
        <mesh position={[0, 4, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 8, 12]} /><meshStandardMaterial color="#4b5257" metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[-0.5, 8, 0]} castShadow><boxGeometry args={[1.0, 0.12, 0.35]} /><meshStandardMaterial color="#3a4045" /></mesh>
      </group>
      {/* parked car silhouette */}
      <group position={[-6.2, 0, -3.2]}>
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow><boxGeometry args={[1.85, 0.75, 4.4]} /><meshPhysicalMaterial color="#5f6f7c" roughness={0.3} clearcoat={1} /></mesh>
        <mesh position={[0, 1.25, -0.2]} castShadow><boxGeometry args={[1.65, 0.55, 2.3]} /><meshPhysicalMaterial color="#26323b" roughness={0.1} metalness={0.4} /></mesh>
        {[[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.33, 0.33, 0.22, 24]} /><meshStandardMaterial color="#151617" roughness={0.9} /></mesh>
        ))}
      </group>
    </group>
  );
}
