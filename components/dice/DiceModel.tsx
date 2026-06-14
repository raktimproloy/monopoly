"use client";

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { soundManager } from '../../utils/soundManager';

// Pre-create standard textures for the 6 faces on the client side
let faceTextures: THREE.CanvasTexture[] = [];

const createDiceTextures = () => {
  if (typeof window === 'undefined') return [];
  if (faceTextures.length > 0) return faceTextures;

  const positions: Record<number, [number, number][]> = {
    1: [[128, 128]],
    2: [[64, 64], [192, 192]],
    3: [[64, 64], [128, 128], [192, 192]],
    4: [[64, 64], [192, 64], [64, 192], [192, 192]],
    5: [[64, 64], [192, 64], [128, 128], [64, 192], [192, 192]],
    6: [[64, 64], [192, 64], [64, 128], [192, 128], [64, 192], [192, 192]]
  };

  const textures: THREE.CanvasTexture[] = [];

  for (let val = 1; val <= 6; val++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Solid white background with very light radial shading for a premium rounded effect
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 160);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.85, '#ffffff');
      grad.addColorStop(1, '#d8d8d8'); // Subtle shadow at the edges to blend corners
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Clean, solid dark charcoal dots (no neon, no border)
      ctx.fillStyle = '#111111';

      const dots = positions[val] || [];
      dots.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    textures.push(tex);
  }

  faceTextures = textures;
  return textures;
};

// Local vector mapping for standard box geometry faces:
// index 0: +X (Right) -> 1
// index 1: -X (Left)  -> 6
// index 2: +Y (Top)   -> 3
// index 3: -Y (Bottom)-> 4
// index 4: +Z (Front) -> 5
// index 5: -Z (Back)  -> 2
const localVectors: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(1, 0, 0),
  2: new THREE.Vector3(0, 0, -1),
  3: new THREE.Vector3(0, 1, 0),
  4: new THREE.Vector3(0, -1, 0),
  5: new THREE.Vector3(0, 0, 1),
  6: new THREE.Vector3(-1, 0, 0)
};

interface DiceModelProps {
  index: number; // 0 = first dice, 1 = second dice
  targetValue: number;
  rollTrigger: number;
  borderColor?: string;
  dotColor?: string;
}

export default function DiceModel({
  index,
  targetValue,
  rollTrigger,
  borderColor = '#a855f7', // purple
  dotColor = '#06b6d4',     // cyan
}: DiceModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTimer = useRef<number>(0);
  const isRolling = useRef<boolean>(false);
  const lastSoundTime = useRef<number>(0);

  // Animation phase variables
  const interpStartRot = useRef<THREE.Quaternion>(new THREE.Quaternion());

  // Textures array (initialized on mount to avoid cascading renders)
  const [textures] = useState<THREE.CanvasTexture[]>(() =>
    createDiceTextures()
  );

  // Pre-calculate resting rotation for the target value
  const restingRotation = useMemo(() => {
    const localVec = localVectors[targetValue] || new THREE.Vector3(0, 1, 0);
    const qAlign = new THREE.Quaternion().setFromUnitVectors(localVec, new THREE.Vector3(0, 1, 0));
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), index === 0 ? -0.4 : 0.4);
    return qYaw.multiply(qAlign);
  }, [targetValue, index]);

  // Handle new roll trigger
  useEffect(() => {
    if (rollTrigger === 0) return;
    
    isRolling.current = true;
    startTimer.current = 0; // reset on next useFrame

  }, [rollTrigger, index]);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (isRolling.current) {
      if (startTimer.current === 0) {
        startTimer.current = state.clock.getElapsedTime();
        interpStartRot.current.copy(meshRef.current.quaternion);
      }

      const elapsed = state.clock.getElapsedTime() - startTimer.current;
      const ROLL_DURATION = 1.5;
      const FLOAT_HEIGHT = 0.8; // Lowered to keep it fully visible inside the camera bounds

      if (elapsed < ROLL_DURATION) {
        // Float up and down using a math parabola shape
        const t = Math.min(elapsed / ROLL_DURATION, 1.0);
        const heightOffset = 4 * t * (1 - t) * FLOAT_HEIGHT;
        
        meshRef.current.position.set(index === 0 ? -1.0 : 1.0, 0.6 + heightOffset, 0.0);
        
        // Fast spin in place based on elapsed time
        meshRef.current.rotation.x = elapsed * 15 + index;
        meshRef.current.rotation.y = elapsed * 20 + index;
        meshRef.current.rotation.z = elapsed * 12 + index;

      } else {
        // Play the bounce sound exactly as they lock into place
        if (isRolling.current && Date.now() - lastSoundTime.current > 200) {
           lastSoundTime.current = Date.now();
           try { soundManager.playEventSound('DICE_ROLL', 0.6); } catch (e) {}
        }
        
        meshRef.current.position.set(index === 0 ? -1.0 : 1.0, 0.6, 0.0);
        meshRef.current.quaternion.copy(restingRotation);
        isRolling.current = false;
      }
    } else {
      // Idle state: keep locked at the correct resting positions and orientation on the board
      meshRef.current.position.set(index === 0 ? -1.0 : 1.0, 0.6, 0.0);
      meshRef.current.quaternion.copy(restingRotation);
    }
  });

  return (
    <>
      {/* Visible premium dice mesh */}
      <mesh 
        ref={meshRef} 
        position={[index === 0 ? -1.0 : 1.0, 0.6, 0.0]} 
        quaternion={restingRotation}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        {textures.length === 6 ? (
          textures.map((texture, idx) => (
            <meshPhysicalMaterial
              key={idx}
              attach={`material-${idx}`}
              map={texture}
              roughness={0.15}
              metalness={0.1}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
          ))
        ) : (
          <meshPhysicalMaterial color="#ffffff" roughness={0.15} clearcoat={1.0} />
        )}
      </mesh>
    </>
  );
}
