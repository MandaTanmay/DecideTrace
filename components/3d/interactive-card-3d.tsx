'use client'

import { ReactNode, useRef, useState } from 'react'

interface InteractiveCard3DProps {
  children: ReactNode
  className?: string
}

export function InteractiveCard3D({ children, className = '' }: InteractiveCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [shine, setShine] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const rotX = ((mouseY - centerY) / centerY) * 15
    const rotY = ((mouseX - centerX) / centerX) * 15

    setRotateX(-rotX)
    setRotateY(rotY)
    setShine({ x: mouseX, y: mouseY })
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-transform duration-200 preserve-3d ${className}`}
      style={{
        perspective: '1000px',
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
    >
      {/* Shine effect */}
      <div
        className="absolute inset-0 pointer-events-none rounded-lg opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${shine.x}px ${shine.y}px, rgba(34, 211, 238, 0.3), transparent)`,
          opacity: rotateX !== 0 || rotateY !== 0 ? 1 : 0,
        }}
      />

      {/* Card content */}
      <div className="relative bg-card border border-border rounded-lg p-8 h-full overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(90deg, #6366f1 1px, transparent 1px), linear-gradient(#6366f1 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  )
}
