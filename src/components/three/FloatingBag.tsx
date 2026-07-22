"use client";

import { Canvas } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import { Suspense } from "react";
import type { Mesh } from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function Bag() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
      {/* Sac stylisé : corps + anse en tore, matériau doré métallique. */}
      <group>
        <mesh ref={ref} castShadow>
          <boxGeometry args={[1.6, 1.8, 0.9]} />
          <meshStandardMaterial
            color="#e6c15c"
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>
        <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.09, 16, 48, Math.PI]} />
          <meshStandardMaterial
            color="#b8933a"
            metalness={1}
            roughness={0.2}
          />
        </mesh>
      </group>
    </Float>
  );
}

export function FloatingBag() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <Suspense fallback={null}>
        <Bag />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
