"use client";

import { Canvas } from '@react-three/fiber';
import DiceModel from './DiceModel';

interface Dice3DProps {
  values: [number, number];
  rollTrigger: number;
  borderColor?: string;
  dotColor?: string;
}

export default function Dice3D({
  values,
  rollTrigger,
  borderColor = '#ffffff',
  dotColor = '#111111',
}: Dice3DProps) {
  return (
    <div className="w-full h-full relative overflow-hidden select-none bg-transparent">
      <Canvas
        shadows
        camera={{ position: [0, 4.8, 3.6], fov: 48 }}
        style={{ pointerEvents: 'none' }}
      >
        {/* Soft Ambient Light */}
        <ambientLight intensity={0.9} />

        {/* Directional Key Light for Casting Shadows */}
        <directionalLight
          castShadow
          position={[3, 9, 3]}
          intensity={1.8}
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.0002}
        />

        {/* Pure White Studio Point Lights for Premium Reflections */}
        <pointLight position={[-4, 4, -1]} color="#ffffff" intensity={2.0} distance={12} />
        <pointLight position={[4, 4, 1]} color="#ffffff" intensity={2.0} distance={12} />

        <DiceModel
          index={0}
          targetValue={values[0]}
          rollTrigger={rollTrigger}
          borderColor={borderColor}
          dotColor={dotColor}
        />
        
        <DiceModel
          index={1}
          targetValue={values[1]}
          rollTrigger={rollTrigger}
          borderColor={borderColor}
          dotColor={dotColor}
        />

        {/* Floor to receive soft shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
          <planeGeometry args={[15, 10]} />
          <shadowMaterial opacity={0.4} />
        </mesh>
      </Canvas>
    </div>
  );
}
