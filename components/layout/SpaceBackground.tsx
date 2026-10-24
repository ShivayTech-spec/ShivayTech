"use client"

import React, { useEffect, useRef } from "react"

type Dot = { x: number; y: number; r: number; vx: number; vy: number; color: string; tw: number }

export default function SpaceBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0
    let dots: Dot[] = []
    let raf = 0

    const build = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = w < 768 ? 70 : 160
      dots = Array.from({ length: count }, () => {
        const light = Math.random() < 0.18
        const hue = light ? 220 : 216 + Math.random() * 22
        const sat = light ? 25 : 95
        const lum = light ? 85 + Math.random() * 10 : 50 + Math.random() * 25
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.8 + Math.random() * 1.4,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          color: `hsl(${hue} ${sat}% ${lum}%)`,
          tw: Math.random() * Math.PI * 2,
        }
      })
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = "lighter"
      for (const d of dots) {
        if (!reduced) {
          d.x += d.vx
          d.y += d.vy
          if (d.x < 0) d.x = w
          if (d.x > w) d.x = 0
          if (d.y < 0) d.y = h
          if (d.y > h) d.y = 0
        }
        const a = 0.55 + 0.35 * Math.sin(t / 1200 + d.tw)
        ctx.globalAlpha = a
        ctx.fillStyle = d.color
        ctx.shadowColor = d.color
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      raf = reduced ? 0 : requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }

    build()
    raf = requestAnimationFrame(draw)
    window.addEventListener("resize", build)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", build)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse 70% 55% at 50% 42%, #0a1a5c 0%, #050b2a 40%, #02040f 70%, #000000 100%)",
      }}
    >
      {/* bottom blue glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "33%",
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(30,80,255,0.35) 0%, rgba(30,80,255,0) 70%)",
        }}
      />
      <canvas ref={ref} style={{ position: "absolute", inset: 0 }} />
    </div>
  )
}