"use client"

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, useTexture } from "@react-three/drei"
import * as THREE from "three"

const RADIUS = 9
const IMAGE_SIZE = 1.5
// The page is locked while the hero plays (wheel / touch drive it), then normal scrolling is released.
const SCROLL_DISTANCE = 250 // px of wheel/touch input the circle needs to open up
const ZOOM_DISTANCE = 400 // extra px of wheel/touch input used to zoom the center circle over the screen
const HOLD_DISTANCE = 600 // px of wheel/touch input AFTER the circle is fully open, before the zoom starts (the opened circle stays on screen)
const TOTAL_SCROLL = SCROLL_DISTANCE + HOLD_DISTANCE + ZOOM_DISTANCE
const TILT = 10 // degrees, top leans away from the viewer (negative = other way)

// 3D tile settings
const TILE_DEPTH = 0.01 // slab thickness
const TILE_BEVEL = 0.02 // edge bevel size
const TILE_RADIUS = 0.02 // corner roundness

// Orbit position switching
const VIEW_INTERVAL = 12000 // ms between position changes
const USER_PAUSE = 4000 // ms after the user lets go before auto-change can happen again
// Camera polar angle in degrees (0 = straight down, 90 = level, 180 = straight up), in order:
// 1) from far below looking almost straight up (near side on top),
// 2) almost top-down (ring face-on), 3) from above (near side at the bottom)
const VIEW_ANGLES = [200, 105, 68]

const DEFAULT_HERO_IMAGES: string[] = Array(30).fill("/images/sample1.png")

// Optional image that fills the big center circle (falls back to the dark gradient if empty/missing)
const DEFAULT_CENTER_IMAGE = "/images/sample1.png"

const PROFILES = [
  "/images/sample1.png",
  "/images/sample1.png",
  "/images/sample1.png",
  "/images/sample1.png",
  "/images/sample1.png",
  "/images/sample1.png",
  "/images/sample1.png",
  "/images/sample1.png",
]

// Catches errors (like a missing texture file) so they can't crash the whole 3D scene
class SafeBoundary extends React.Component<
  { children: React.ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error(`[Hero] "${this.props.name}" failed to render:`, error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

// Soft round sprite so particles render as glowing dots, not squares
function useDotTexture() {
  return useMemo(() => {
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size
    const ctx = canvas.getContext("2d")!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.3, "rgba(255,255,255,0.8)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])
}

function HeroParticles({ count }: { count: number }) {
  const dot = useDotTexture()

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi
      const r = RADIUS + (Math.random() - 0.5) * 4
      positions[i * 3] = r * Math.cos(theta) * Math.sin(phi)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi)

      if (Math.random() < 0.18) {
        c.setHSL(0.6, 0.25, 0.85 + Math.random() * 0.1)
      } else {
        c.setHSL(0.6 + Math.random() * 0.06, 0.95, 0.5 + Math.random() * 0.25)
      }
      c.toArray(colors, i * 3)
    }
    return { positions, colors }
  }, [count])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={3}
        sizeAttenuation={false}
        vertexColors
        map={dot}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

function HeroImages({ images }: { images: string[] }) {
  const textures = useTexture(images)

  const { bodyGeo, faceGeo } = useMemo(() => {
    // thick beveled slab
    const bodySize = IMAGE_SIZE - TILE_BEVEL * 2
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(bodySize, bodySize, TILE_RADIUS), {
      depth: TILE_DEPTH,
      bevelEnabled: true,
      bevelThickness: TILE_BEVEL,
      bevelSize: TILE_BEVEL,
      bevelSegments: 5,
      curveSegments: 14,
    })
    bodyGeo.translate(0, 0, -TILE_DEPTH / 2)

    // rounded image face, inset so the bevel rim stays visible
    const faceSize = IMAGE_SIZE - 0.14
    const faceGeo = new THREE.ShapeGeometry(
      roundedRectShape(faceSize, faceSize, TILE_RADIUS * 0.8),
      14
    )
    const pos = faceGeo.attributes.position
    const uv = faceGeo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / faceSize + 0.5, pos.getY(i) / faceSize + 0.5)
    }
    uv.needsUpdate = true
    return { bodyGeo, faceGeo }
  }, [])

  const half = TILE_DEPTH / 2 + TILE_BEVEL + 0.002

  return (
    <>
      {textures.map((map, i) => {
        const a = (i / textures.length) * Math.PI * 2
        return (
          <group
            key={i}
            position={[RADIUS * Math.cos(a), 0, RADIUS * Math.sin(a)]}
            rotation={[0, Math.PI / 2 - a, 0]}
          >
            <mesh geometry={bodyGeo}>
              <meshStandardMaterial
                color="#0b0e16"
                metalness={0.85}
                roughness={0.28}
                emissive="#0a2a9a"
                emissiveIntensity={0.18}
              />
            </mesh>
            {/* front */}
            <mesh geometry={faceGeo} position={[0, 0, half]}>
              <meshBasicMaterial map={map} toneMapped={false} />
            </mesh>
            {/* back (so tiles on the far side still show the image) */}
            <mesh geometry={faceGeo} position={[0, 0, -half]} rotation={[0, Math.PI, 0]}>
              <meshBasicMaterial map={map} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// Every VIEW_INTERVAL ms, smoothly moves the camera to the next polar angle.
// Only the up/down angle is changed, so the auto-rotate keeps spinning the orbit.
// The user can drag any time: dragging cancels the glide, and the next auto-change
// waits until they've let go for a moment.
function CameraRig({ controls }: { controls: React.MutableRefObject<any> }) {
  const index = useRef(0)
  const gliding = useRef(true) // true while moving toward the current target angle
  const dragging = useRef(false)
  const lastRelease = useRef(0)
  const spherical = useMemo(() => new THREE.Spherical(), [])
  const offset = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const c = controls.current
    const onStart = () => {
      dragging.current = true
      gliding.current = false
    }
    const onEnd = () => {
      dragging.current = false
      lastRelease.current = Date.now()
    }
    c?.addEventListener("start", onStart)
    c?.addEventListener("end", onEnd)

    const t = setInterval(() => {
      if (dragging.current || Date.now() - lastRelease.current < USER_PAUSE) return
      index.current = (index.current + 1) % VIEW_ANGLES.length
      gliding.current = true
    }, VIEW_INTERVAL)

    return () => {
      clearInterval(t)
      c?.removeEventListener("start", onStart)
      c?.removeEventListener("end", onEnd)
    }
  }, [controls])

  useFrame(({ camera }, delta) => {
    const c = controls.current
    if (!c || !gliding.current) return
    offset.copy(camera.position).sub(c.target)
    spherical.setFromVector3(offset)
    const target = THREE.MathUtils.degToRad(VIEW_ANGLES[index.current])
    spherical.phi = THREE.MathUtils.damp(spherical.phi, target, 2, delta)
    camera.position.setFromSpherical(spherical).add(c.target)
    if (Math.abs(spherical.phi - target) < 0.005) gliding.current = false
  }, -2)

  return null
}

// `progress.current` is 0 when the scroll starts and 1 when it finishes
function HeroScrollAnimation({ progress }: { progress: React.MutableRefObject<number> }) {
  useFrame(() => {
    const p = progress.current
    // SCROLL ANIMATION CODE GOES HERE
    void p
  })
  return null
}

// Center section that sits inside the orbit (inline styles, no Tailwind needed)
function HeroCenter({ scrollY, centerImage }: { scrollY: number; centerImage?: string }) {
  const [scale, setScale] = useState(1)
  const [vp, setVp] = useState({ w: 1920, h: 1080 })

  useEffect(() => {
    const update = () => {
      setScale(Math.min(1, window.innerWidth / 700))
      setVp({ w: window.innerWidth, h: window.innerHeight })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const expandRadius = Math.min(scrollY / SCROLL_DISTANCE, 1) * 300
  // 0 -> 1 during the zoom phase (after the circle has fully opened and the hold phase is over)
  const zoom = Math.min(Math.max((scrollY - SCROLL_DISTANCE - HOLD_DISTANCE) / ZOOM_DISTANCE, 0), 1)
  // the circle morphs into a full-screen landscape rectangle (size + corner radius, no scaling)
  const ease = zoom * zoom * (3 - 2 * zoom)
  const curW = 400 + (vp.w / scale + 4 - 400) * ease
  const curH = 400 + (vp.h / scale + 4 - 400) * ease
  const radius = (Math.min(curW, curH) / 2) * (1 - ease)
  // rings, small images and text fade out as the zoom starts
  const fade = 1 - Math.min(zoom * 3, 1)
  const center: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" }

  const circleGradient =
    "radial-gradient(circle at 50% 35%, rgba(10,26,92,0.92) 0%, rgba(5,11,42,0.94) 60%, rgba(2,4,15,0.96) 100%)"

  return (
    <div
      style={{
        ...center,
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        perspective: 1200,
      }}
    >
      <div style={{ transform: `scale(${scale}) rotateX(${TILT * (1 - zoom)}deg)` }}>
        <div
          style={{
            ...center,
            width: 600,
            height: 600,
            borderRadius: "50%",
           border: scrollY > SCROLL_DISTANCE * 0.6 ? `2px solid rgba(120,160,255,${0.25 * fade})` : "2px solid transparent",
            transition: "all 0.5s",
          }}
        >
          <div
            style={{
              ...center,
              position: "relative",
              width: 500,
              height: 500,
              borderRadius: "50%",
             border: scrollY > SCROLL_DISTANCE * 0.2 ? `2px solid rgba(60,110,255,${0.55 * fade})` : "2px solid transparent",
boxShadow: scrollY > SCROLL_DISTANCE * 0.2 ? `0 0 40px rgba(30,80,255,${0.25 * fade})` : "none",
              transition: "all 0.5s",
            }}
          >
            <div
              style={{
                ...center,
                position: "relative",
                width: curW,
                height: curH,
                flexShrink: 0,
                borderRadius: radius,
                padding: 2 * (1 - ease),
                background: "linear-gradient(135deg, #7aa7ff, #2f5bff, #4a2fd6)",
boxShadow: `0 0 ${70 * fade}px rgba(30,80,255,${0.45 * fade})`,
              }}
            >
              <div
                style={{
                  ...center,
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: radius,
                  // image on top, gradient underneath as a fallback
                  background: centerImage
                    ? `url("${centerImage}") center / cover no-repeat, ${circleGradient}`
                    : circleGradient,
                }}
              >
                {PROFILES.map((src, i) => {
                  const angle = (i * Math.PI) / 4
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        width: 96,
                        height: 96,
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "4px solid #1f2937",
                        boxShadow: "0 10px 15px rgba(0,0,0,0.4)",
                        opacity: fade,
                        transition: "transform 0.3s ease-out",
                        transform: `translate(${expandRadius * Math.cos(angle)}px, ${expandRadius * Math.sin(angle)}px)`,
                      }}
                    >
                      <img
                        src={src}
                        alt={`Profile ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  )
                })}

                <div
                  style={{
                    ...center,
                    flexDirection: "column",
                    position: "relative",
                    zIndex: 20,
                    textAlign: "center",
                    opacity: scrollY > SCROLL_DISTANCE * 0.5 ? fade : 0,
                    transition: "opacity 0.5s",
                  }}
                >
                  <h1 style={{ fontSize: 36, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Empowering</h1>
                  <h1 style={{ fontSize: 36, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>Every User</h1>
                  <p style={{ maxWidth: 320, color: "#9ca3af", margin: 0 }}>
                    From entrepreneurs to educators, Gen AI provides tools to simplify work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Hero({
  images = DEFAULT_HERO_IMAGES,
  centerImage = DEFAULT_CENTER_IMAGE,
}: {
  images?: string[]
  centerImage?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const controlsRef = useRef<any>(null)
  const virtual = useRef(0) // wheel/touch driven "scroll" position, 0..TOTAL_SCROLL
  const expanded = useRef(false) // true once fully zoomed -> page scrolls normally
  const touchStartY = useRef(0)
  const [visible, setVisible] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [count, setCount] = useState(1200)
  const [scrollY, setScrollY] = useState(0) // virtual px driving the animation

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    setCount(window.matchMedia("(max-width: 768px)").matches ? 500 : 1500)

    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    if (ref.current) io.observe(ref.current)

    window.scrollTo(0, 0)

    const update = (v: number) => {
      virtual.current = Math.min(Math.max(v, 0), TOTAL_SCROLL)
      if (virtual.current >= TOTAL_SCROLL) expanded.current = true
      progress.current = Math.min(virtual.current / SCROLL_DISTANCE, 1)
      setScrollY(virtual.current)
    }

    const onWheel = (e: WheelEvent) => {
      if (expanded.current && e.deltaY < 0 && window.scrollY <= 5) {
        // scrolling back up at the top: play the animation in reverse
        expanded.current = false
        e.preventDefault()
      } else if (!expanded.current) {
        e.preventDefault()
        update(virtual.current + e.deltaY)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartY.current) return
      const y = e.touches[0].clientY
      const deltaY = touchStartY.current - y
      if (expanded.current && deltaY < -20 && window.scrollY <= 5) {
        expanded.current = false
        e.preventDefault()
      } else if (!expanded.current) {
        e.preventDefault()
        update(virtual.current + deltaY * (deltaY < 0 ? 6 : 4))
        touchStartY.current = y
      }
    }

    const onTouchEnd = () => {
      touchStartY.current = 0
    }

    // keep the page at the top until the hero has finished
    const onScroll = () => {
      if (!expanded.current) window.scrollTo(0, 0)
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: false })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("scroll", onScroll)

    return () => {
      io.disconnect()
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <section
      ref={ref}
      className="hero-root"
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 70% 55% at 50% 42%, #0a1a5c 0%, #050b2a 40%, #02040f 70%, #000000 100%)",
      }}
    >
      {/* stops global CSS from painting opaque backgrounds over the hero */}
      <style>{`
        .hero-root div { background-color: transparent; }
        .hero-root canvas { background: transparent !important; }
      `}</style>

      {/* bottom blue glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "33%",
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(30,80,255,0.35) 0%, rgba(30,80,255,0) 70%)",
        }}
      />

      <Canvas
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [-9.3, 5.3, 9.3], fov: 50 }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        {/* lights for the 3D tile edges */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[-10, 12, 10]} intensity={2.2} />
        <pointLight position={[0, 6, 0]} intensity={60} color="#3c6eff" />

        <SafeBoundary name="particles">
          <Suspense fallback={null}>
            <HeroParticles count={count} />
          </Suspense>
        </SafeBoundary>

        <SafeBoundary name="images">
          <Suspense fallback={null}>
            <HeroImages images={images} />
          </Suspense>
        </SafeBoundary>

        <HeroScrollAnimation progress={progress} />
        <CameraRig controls={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enablePan={false}
          autoRotate={!reduced}
          autoRotateSpeed={0.4}
        />
      </Canvas>

      <HeroCenter scrollY={scrollY} centerImage={centerImage} />
    </section>
  )
}