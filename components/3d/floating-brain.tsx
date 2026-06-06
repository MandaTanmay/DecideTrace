'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

export function FloatingBrain() {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += 0.003
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.5
  })

  return (
    <group ref={groupRef}>
      {/* Main brain sphere */}
      <mesh>
        <icosahedronGeometry args={[1.5, 5]} />
        <meshPhongMaterial
          color="#6366f1"
          emissive="#4f46e5"
          wireframe={false}
          shininess={100}
        />
      </mesh>

      {/* Glowing outer sphere */}
      <mesh scale={1.3}>
        <icosahedronGeometry args={[1.5, 4]} />
        <meshBasicMaterial
          color="#6366f1"
          wireframe={true}
          transparent={true}
          opacity={0.3}
        />
      </mesh>

      {/* Animated inner particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const x = Math.cos(angle) * 2
        const z = Math.sin(angle) * 2

        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshPhongMaterial
              color="#22d3ee"
              emissive="#06b6d4"
              shininess={100}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export function FloatingBrainContainer() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas className="w-full h-full" />
    </div>
  )
}
