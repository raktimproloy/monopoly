"use client";

import { Canvas } from '@react-three/fiber';
import { Physics, usePlane } from '@react-three/cannon';
import DiceModel from './DiceModel';

interface Dice3DProps {
  values: [number, number];
  rollTrigger: number;
  borderColor?: string;
  dotColor?: string;
}

function Boundaries() {
  // Invisible physical walls to keep the dice contained in the viewport
  // Floor (Y = 0)
  usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
  // Ceiling
  usePlane(() => ({ rotation: [Math.PI / 2, 0, 0], position: [0, 7, 0] }));
  // Left wall
  usePlane(() => ({ rotation: [0, Math.PI / 2, 0], position: [-4.2, 0, 0] }));
  // Right wall
  usePlane(() => ({ rotation: [0, -Math.PI / 2, 0], position: [4.2, 0, 0] }));
  // Back wall
  usePlane(() => ({ rotation: [0, 0, 0], position: [0, 0, -2.5] }));
  // Front wall
  usePlane(() => ({ rotation: [0, Math.PI, 0], position: [0, 0, 2.5] }));

  return null;
}

export default function Dice3D({
  values,
  rollTrigger,
  borderColor = '#ffffff',
  dotColor = '#111111',
}: Dice3DProps) {
  return (
    <div className="w-full h-[240px] md:h-[280px] relative overflow-hidden select-none bg-transparent">
      <Canvas
        shadows
        camera={{ position: [0, 5.5, 4.2], fov: 50 }}
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

        <Physics
          gravity={[0, -26, 0]}
          defaultContactMaterial={{ restitution: 0.45, friction: 0.15 }}
        >
          <Boundaries />
          
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
        </Physics>

        {/* Floor to receive soft shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
          <planeGeometry args={[15, 10]} />
          <shadowMaterial opacity={0.4} />
        </mesh>
      </Canvas>
    </div>
  );
}
