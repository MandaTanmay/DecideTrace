'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

interface ProgressSphereProps {
  progress: number // 0-1
}

export function ProgressSphere({ progress }: ProgressSphereProps) {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.z += 0.005
  })

  // Create progress ring
  const segments = 64
  const progressSegments = Math.floor(segments * progress)

  return (
    <group ref={groupRef}>
      {/* Background ring */}
      <mesh>
        <torusGeometry args={[1, 0.1, 16, 100]} />
        <meshPhongMaterial color="#1e1e2e" />
      </mesh>

      {/* Progress ring */}
      <mesh>
        <torusGeometry args={[1, 0.1, 16, progressSegments]} />
        <meshPhongMaterial
          color="#22d3ee"
          emissive="#06b6d4"
          toneMapped={false}
        />
      </mesh>

      {/* Center sphere */}
      <mesh scale={0.6}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhongMaterial
          color="#6366f1"
          emissive="#4f46e5"
        />
      </mesh>

      {/* Rotating dots */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x = Math.cos(angle) * 1.3
        const y = Math.sin(angle) * 1.3

        return (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshPhongMaterial
              color="#22d3ee"
              emissive="#06b6d4"
            />
          </mesh>
        )
      })}
    </group>
  )
}
