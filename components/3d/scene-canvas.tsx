'use client'

import { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'

interface SceneCanvasProps {
  children: ReactNode
  className?: string
}

export function SceneCanvas({ children, className = '' }: SceneCanvasProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, 10]} intensity={0.5} />
      {children}
    </Canvas>
  )
}
