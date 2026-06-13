"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Pointer-driven camera drift for parallax depth.
function Rig() {
  const { camera, pointer } = useThree();
  const vec = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    vec.set(pointer.x * 1.1, 0.35 + pointer.y * 0.6, 6.2);
    camera.position.lerp(vec, 0.045);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// The central "radar" orb.
function Orb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.12;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.8}>
      <mesh ref={ref} scale={1.55}>
        <icosahedronGeometry args={[1, 16]} />
        <MeshDistortMaterial
          color="#1b48c4"
          emissive="#1f3aa0"
          emissiveIntensity={0.45}
          roughness={0.18}
          metalness={0.65}
          distort={0.38}
          speed={1.6}
        />
      </mesh>
      {/* inner glow shell */}
      <mesh scale={1.85}>
        <icosahedronGeometry args={[1, 6]} />
        <meshBasicMaterial color="#5b8cff" transparent opacity={0.05} wireframe />
      </mesh>
    </Float>
  );
}

// Orbiting renewal dots on a tilted ring.
const DOTS = [
  { a: 0, r: 2.9, color: "#34d399", size: 0.085 },
  { a: 0.9, r: 2.9, color: "#5b8cff", size: 0.07 },
  { a: 1.9, r: 2.9, color: "#fbbf24", size: 0.06 },
  { a: 2.7, r: 2.9, color: "#22d3ee", size: 0.075 },
  { a: 3.7, r: 2.9, color: "#fb7185", size: 0.055 },
  { a: 4.7, r: 2.9, color: "#a78bfa", size: 0.07 },
  { a: 5.5, r: 2.9, color: "#34d399", size: 0.05 }
];

function OrbitRing() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.z += dt * 0.22;
  });
  return (
    <group ref={group} rotation={[Math.PI / 2.6, 0.2, 0]}>
      <mesh>
        <torusGeometry args={[2.9, 0.006, 8, 160]} />
        <meshBasicMaterial color="#2c3656" transparent opacity={0.8} />
      </mesh>
      {DOTS.map((d, i) => (
        <mesh key={i} position={[Math.cos(d.a) * d.r, Math.sin(d.a) * d.r, 0]}>
          <sphereGeometry args={[d.size, 16, 16]} />
          <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0.35, 6.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "default", failIfMajorPerformanceCaveat: false }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => {
        // If the GPU drops the context (driver hiccup, many tab switches),
        // prevent the default so the browser can restore it instead of erroring.
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
      }}
    >
      <fog attach="fog" args={["#07080c", 6, 13]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 3, 4]} intensity={120} color="#5b8cff" />
      <pointLight position={[-5, -2, 2]} intensity={70} color="#34d399" />
      <pointLight position={[0, 2, -4]} intensity={40} color="#a78bfa" />
      <Orb />
      <OrbitRing />
      <Stars radius={50} depth={30} count={1800} factor={3.2} saturation={0} fade speed={0.6} />
      <Rig />
    </Canvas>
  );
}
