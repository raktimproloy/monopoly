"use client";

import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { playDiceBounceSound } from '../../utils/sound';

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
  const interpStartPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const interpStartRot = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const interpTargetPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const interpTargetRot = useRef<THREE.Quaternion>(new THREE.Quaternion());

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

  // Rigid body physics ref (dummy)
  const [dummyRef, api] = useBox(() => ({
    mass: 1,
    args: [1.2, 1.2, 1.2],
    position: [index === 0 ? -2.2 : 2.2, 5, 0],
    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    onCollide: (e) => {
      // Play bounce sound if velocity is sufficient and rate limit allows
      const velocity = e.contact.impactVelocity;
      const now = Date.now();
      if (velocity > 1.5 && now - lastSoundTime.current > 120) {
        lastSoundTime.current = now;
        playDiceBounceSound(Math.min(velocity / 12, 1.0));
      }
    }
  }));

  // Handle new roll trigger
  useEffect(() => {
    if (rollTrigger === 0) return;
    
    isRolling.current = true;
    startTimer.current = 0; // reset on next useFrame

    // Reset physics body position, linear and angular velocities
    const startX = index === 0 ? -2.5 : 2.5;
    const startY = 5.5 + Math.random() * 1.5;
    const startZ = -1.2 + Math.random() * 2.4;
    
    api.position.set(startX, startY, startZ);
    
    // Launch towards the center with random arc
    const vx = index === 0 ? 4 + Math.random() * 3 : -4 - Math.random() * 3;
    const vy = -3 - Math.random() * 3;
    const vz = -1.5 + Math.random() * 3.0;
    
    api.velocity.set(vx, vy, vz);
    
    // Apply heavy spin
    const wx = (Math.random() - 0.5) * 22;
    const wy = (Math.random() - 0.5) * 22;
    const wz = (Math.random() - 0.5) * 22;
    api.angularVelocity.set(wx, wy, wz);

    // Reset interpolation target positions
    interpTargetPos.current.set(0, 0, 0);

  }, [rollTrigger, index, api]);

  useFrame((state) => {
    if (!meshRef.current || !dummyRef.current) return;

    if (isRolling.current) {
      if (startTimer.current === 0) {
        startTimer.current = state.clock.getElapsedTime();
      }

      const elapsed = state.clock.getElapsedTime() - startTimer.current;

      if (elapsed < 0.95) {
        // 1. Physics phase: copy state from physics dummy to visible mesh
        meshRef.current.position.copy(dummyRef.current.position);
        meshRef.current.quaternion.copy(dummyRef.current.quaternion);

      } else if (elapsed >= 0.95 && elapsed < 1.45) {
        // 2. Setup interpolation targets on the first frame of this phase
        if (interpTargetPos.current.x === 0 && interpTargetPos.current.y === 0) {
          // Stop physics body
          api.velocity.set(0, 0, 0);
          api.angularVelocity.set(0, 0, 0);

          // Capture starting points
          interpStartPos.current.copy(meshRef.current.position);
          interpStartRot.current.copy(meshRef.current.quaternion);

          // Compute target resting position (Y = 0.6 rests flat on floor Y = 0)
          interpTargetPos.current.set(index === 0 ? -1.0 : 1.0, 0.6, 0.0);

          // Calculate smooth target rotation:
          // Extract current yaw to avoid sudden Y spin snap
          const currentQuat = meshRef.current.quaternion;
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(currentQuat);
          const yaw = Math.atan2(forward.x, forward.z);

          // Target alignment: local vector of targetValue points up (0, 1, 0)
          const localVec = localVectors[targetValue] || new THREE.Vector3(0, 1, 0);
          const qAlign = new THREE.Quaternion().setFromUnitVectors(localVec, new THREE.Vector3(0, 1, 0));
          
          // Final orientation
          const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          interpTargetRot.current.copy(qYaw.multiply(qAlign));
        }

        // Linear interpolation factor (duration 0.5s: from 0.95s to 1.45s)
        const tVal = Math.min((elapsed - 0.95) / 0.5, 1.0);
        
        // Easing function (easeOutQuad)
        const easeT = tVal * (2 - tVal);

        // Lerp position & slerp rotation
        meshRef.current.position.lerpVectors(interpStartPos.current, interpTargetPos.current, easeT);
        meshRef.current.quaternion.slerpQuaternions(interpStartRot.current, interpTargetRot.current, easeT);

      } else {
        // 3. Final landing: lock to exact final target
        meshRef.current.position.copy(interpTargetPos.current);
        meshRef.current.quaternion.copy(interpTargetRot.current);
        
        // Reset interpolations states for the next roll
        interpTargetPos.current.set(0, 0, 0);
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
      {/* Hidden physics dummy body */}
      <mesh ref={dummyRef} visible={false}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

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
