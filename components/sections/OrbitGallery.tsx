"use client"

import React, { Suspense, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, PerformanceMonitor, useTexture } from "@react-three/drei"
import * as THREE from "three"

const RADIUS = 9
const IMAGE_SIZE = 1.5
// The page is locked while the hero plays (wheel / touch / keys drive it), then normal scrolling is released.
const SCROLL_DISTANCE = 250 // px of input the circle needs to open up
const ZOOM_DISTANCE = 400 // extra px of input used to zoom the center circle over the screen
const HOLD_DISTANCE = 600 // px of input AFTER the circle is fully open, before the zoom starts
const TOTAL_SCROLL = SCROLL_DISTANCE + HOLD_DISTANCE + ZOOM_DISTANCE
const TILT = 10 // degrees, top leans away from the viewer
const TOUCH_FORWARD = 4 // finger travel multiplier (scrolling down)
const TOUCH_BACK = 6 // finger travel multiplier (scrolling back up)

// SIZE OF THE BIG CENTER CIRCLE (px) - change this one number to resize it
const CENTER_SIZE = 320

// Fraction of hero height the circle + orbit sit ABOVE the screen center (room for text/buttons under the circle)
const STAGE_SHIFT = 0.12
// Same, but while the circle is opened: 0 = exact center
const STAGE_SHIFT_OPEN = 0

// ---- Responsive design reference ----
// DOM layer scales down on small screens: scale = min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 720
const REF_HEIGHT = 1080 // the height the 3D orbit was tuned at
const MOBILE_ORBIT_ZOOM = 0.85 // extra shrink of the 3D orbit on screens <= 768px wide (smaller = more of the ring visible)

// ---- Low-end device handling ----
type Tier = "low" | "mid" | "high"
type Env = { tier: Tier; coarse: boolean; reduced: boolean }

const PARTICLES: Record<Tier, number> = { low: 250, mid: 700, high: 1500 }
const DPR: Record<Tier, number | [number, number]> = { low: 1, mid: [1, 1.25], high: [1, 1.5] }
const LOW_FPS = 30 // low tier renders at 30fps (half the GPU work)

function detectEnv(): Env {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const mem = nav.deviceMemory ?? 8
  const cores = nav.hardwareConcurrency ?? 8
  const saveData = !!nav.connection?.saveData
  const coarse = window.matchMedia("(pointer: coarse)").matches
  const small = window.matchMedia("(max-width: 768px)").matches
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let tier: Tier = "high"
  if (saveData || mem <= 4 || cores <= 4) tier = "low"
  else if (coarse || small) tier = mem >= 8 && cores >= 6 ? "mid" : "low"
  return { tier, coarse, reduced }
}

const designScale = (w: number, h: number) => Math.max(0.3, Math.min(1, w / DESIGN_WIDTH, h / DESIGN_HEIGHT))

// Tile settings
const TILE_DEPTH = 0.01
const TILE_BEVEL = 0.02
const TILE_RADIUS = 0.02
const FACE_Z = TILE_DEPTH / 2 + TILE_BEVEL + 0.002

// Orbit position switching
const VIEW_INTERVAL = 12000
const USER_PAUSE = 4000
const VIEW_ANGLES = [68, 105, 200]

const DEFAULT_HERO_IMAGES: string[] = Array(30).fill("/images/sample1.png")

// Video that fills the big center circle (put your file in /public/videos/)
const DEFAULT_CENTER_VIDEO = "/videos/circle.mp4"
// Poster shown until the video loads (and the ONLY thing shown on low-end devices)
const DEFAULT_CENTER_IMAGE = "/images/hero.png"

const PROFILES = [
  "/images/github.jpg",
  "/images/metaads.jpg",
  "/images/SEO.jpg",
  "/images/vs-code.jpg",
  "/images/social-media.jpg",
  "/images/react.jpg",
  "/images/google-ads.jpg",
  "/images/growth.jpg",
]

const CARD_ANGLES = PROFILES.map((_, i) => {
  const a = (i * Math.PI) / 4
  return { cos: Math.cos(a), sin: Math.sin(a) }
})

// ---- Canvas config hoisted so React never re-creates these objects ----
const CANVAS_STYLE: React.CSSProperties = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }
const CANVAS_STYLE_COVERED: React.CSSProperties = { ...CANVAS_STYLE, pointerEvents: "none" }
const CANVAS_CAMERA = { position: [-9.3, 5.3, 9.3] as [number, number, number], fov: 50, near: 1, far: 80 }
const GL_LOW = { antialias: false, alpha: true, stencil: false, powerPreference: "low-power" as const }
const GL_FULL = { antialias: false, alpha: true, stencil: false, powerPreference: "high-performance" as const }
const CANVAS_RESIZE = { scroll: false }
const onCanvasCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => gl.setClearColor(0x000000, 0)

// Catches errors (like a missing texture file) so they can't crash the whole 3D scene
class SafeBoundary extends React.Component<{ children: React.ReactNode; name: string }, { failed: boolean }> {
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
  const tex = useMemo(() => {
    const size = 32
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
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

const HeroParticles = memo(function HeroParticles({ count }: { count: number }) {
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
})

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

// Neon glow textures (skipped entirely on low-end devices: no canvas blur work, no additive overdraw)
function useGlowTextures(enabled: boolean) {
  const tex = useMemo(() => {
    if (!enabled) return null
    const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    const S = 256
    const outer = document.createElement("canvas")
    outer.width = outer.height = S
    const o = outer.getContext("2d")!
    o.shadowColor = "rgba(0,110,255,1)"
    o.shadowBlur = 55
    o.fillStyle = "rgba(0,110,255,1)"
    rr(o, S * 0.25, S * 0.25, S * 0.5, S * 0.5, 8)
    o.fill()

    const inner = document.createElement("canvas")
    inner.width = inner.height = S
    const n = inner.getContext("2d")!
    n.save()
    rr(n, 0, 0, S, S, 4)
    n.clip()
    n.shadowColor = "rgba(0,110,255,0.9)"
    n.shadowBlur = 38
    n.fillStyle = "#000"
    n.beginPath()
    n.rect(-200, -200, S + 400, S + 400)
    rr(n, 0, 0, S, S, 4)
    n.fill("evenodd")
    n.restore()

    const outerTex = new THREE.CanvasTexture(outer)
    const innerTex = new THREE.CanvasTexture(inner)
    outerTex.colorSpace = innerTex.colorSpace = THREE.SRGBColorSpace
    return { outerTex, innerTex }
  }, [enabled])

  useEffect(
    () => () => {
      tex?.outerTex.dispose()
      tex?.innerTex.dispose()
    },
    [tex]
  )
  return tex
}

// One draw call for N copies of the same mesh (all tiles are static, so matrices are written once)
function Instances({
  geometry,
  matrices,
  children,
}: {
  geometry: THREE.BufferGeometry
  matrices: THREE.Matrix4[]
  children: React.ReactNode
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i])
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, matrices.length]}
      geometry={geometry}
      frustumCulled={false}
      matrixAutoUpdate={false}
    >
      {children}
    </instancedMesh>
  )
}

const HeroImages = memo(function HeroImages({ images, tier }: { images: string[]; tier: Tier }) {
  const fx = tier !== "low" // fancy neon layers + lit materials only when the device can afford them

  // identical URLs share ONE texture
  const unique = useMemo(() => Array.from(new Set(images)), [images])
  const textures = useTexture(unique) as THREE.Texture[]
  const glowTex = useGlowTextures(fx)

  // lighter texture sampling on low-end (no mipmaps = less GPU memory + upload time)
  useLayoutEffect(() => {
    for (const t of textures) {
      t.anisotropy = 1
      t.generateMipmaps = fx
      t.minFilter = fx ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter
      t.needsUpdate = true
    }
  }, [textures, fx])

  const { bodyGeo, faceGeo, glowGeo } = useMemo(() => {
    const bodySize = IMAGE_SIZE - TILE_BEVEL * 2
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(bodySize, bodySize, TILE_RADIUS), {
      depth: TILE_DEPTH,
      bevelEnabled: true,
      bevelThickness: TILE_BEVEL,
      bevelSize: TILE_BEVEL,
      bevelSegments: fx ? 2 : 1,
      curveSegments: fx ? 6 : 3,
    })
    bodyGeo.translate(0, 0, -TILE_DEPTH / 2)

    const faceSize = IMAGE_SIZE - 0.14
    const faceGeo = new THREE.ShapeGeometry(roundedRectShape(faceSize, faceSize, TILE_RADIUS * 0.8), fx ? 6 : 3)
    const pos = faceGeo.attributes.position
    const uv = faceGeo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / faceSize + 0.5, pos.getY(i) / faceSize + 0.5)
    }
    uv.needsUpdate = true

    const glowGeo = fx ? new THREE.PlaneGeometry(IMAGE_SIZE * 2, IMAGE_SIZE * 2) : null
    return { bodyGeo, faceGeo, glowGeo }
  }, [fx])

  const parts = useMemo(() => {
    const n = images.length
    const indexOf = new Map(unique.map((u, i) => [u, i]))
    const tile = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const one = new THREE.Vector3(1, 1, 1)
    const qId = new THREE.Quaternion()
    const qFlip = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))
    const local = {
      front: new THREE.Matrix4().compose(new THREE.Vector3(0, 0, FACE_Z), qId, one),
      frontGlow: new THREE.Matrix4().compose(new THREE.Vector3(0, 0, FACE_Z + 0.001), qId, one),
      back: new THREE.Matrix4().compose(new THREE.Vector3(0, 0, -FACE_Z), qFlip, one),
      backGlow: new THREE.Matrix4().compose(new THREE.Vector3(0, 0, -FACE_Z - 0.001), qFlip, one),
    }
    const glow: THREE.Matrix4[] = []
    const body: THREE.Matrix4[] = []
    const frontGlow: THREE.Matrix4[] = []
    const backGlow: THREE.Matrix4[] = []
    const front: THREE.Matrix4[][] = unique.map(() => [])
    const back: THREE.Matrix4[][] = unique.map(() => [])

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      pos.set(RADIUS * Math.cos(a), 0, RADIUS * Math.sin(a))
      q.setFromEuler(e.set(0, Math.PI / 2 - a, 0))
      tile.compose(pos, q, one)
      const g = indexOf.get(images[i])!
      glow.push(tile.clone())
      body.push(tile.clone())
      frontGlow.push(new THREE.Matrix4().multiplyMatrices(tile, local.frontGlow))
      backGlow.push(new THREE.Matrix4().multiplyMatrices(tile, local.backGlow))
      front[g].push(new THREE.Matrix4().multiplyMatrices(tile, local.front))
      back[g].push(new THREE.Matrix4().multiplyMatrices(tile, local.back))
    }
    return { glow, body, frontGlow, backGlow, front, back }
  }, [images, unique])

  useEffect(
    () => () => {
      bodyGeo.dispose()
      faceGeo.dispose()
      glowGeo?.dispose()
    },
    [bodyGeo, faceGeo, glowGeo]
  )

  if (!images.length) return null

  return (
    <>
      {/* outer neon glow (high/mid only) */}
      {fx && glowTex && glowGeo && (
        <Instances geometry={glowGeo} matrices={parts.glow}>
          <meshBasicMaterial
            map={glowTex.outerTex}
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </Instances>
      )}

      {/* neon rim: lit material on capable devices, flat unlit blue on low-end (no lights needed) */}
      <Instances geometry={bodyGeo} matrices={parts.body}>
        {fx ? (
          <meshStandardMaterial
            color="#0b0e16"
            metalness={0.4}
            roughness={0.4}
            emissive="#1a8cff"
            emissiveIntensity={1.6}
          />
        ) : (
          <meshBasicMaterial color="#1f7fff" toneMapped={false} />
        )}
      </Instances>

      {textures.map((map, g) =>
        parts.front[g].length ? (
          <React.Fragment key={g}>
            <Instances geometry={faceGeo} matrices={parts.front[g]}>
              <meshBasicMaterial map={map} toneMapped={false} />
            </Instances>
            <Instances geometry={faceGeo} matrices={parts.back[g]}>
              <meshBasicMaterial map={map} toneMapped={false} />
            </Instances>
          </React.Fragment>
        ) : null
      )}

      {fx && glowTex && (
        <>
          <Instances geometry={faceGeo} matrices={parts.frontGlow}>
            <meshBasicMaterial
              map={glowTex.innerTex}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </Instances>
          <Instances geometry={faceGeo} matrices={parts.backGlow}>
            <meshBasicMaterial
              map={glowTex.innerTex}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </Instances>
        </>
      )}
    </>
  )
})

// Every VIEW_INTERVAL ms, smoothly moves the camera to the next polar angle.
function CameraRig({ controls }: { controls: React.MutableRefObject<any> }) {
  const index = useRef(0)
  const gliding = useRef(true)
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

// Low-end devices render at a fixed 30fps. The Canvas runs with frameloop="never" and this drives it manually.
function FrameLimiter({ fps }: { fps: number }) {
  const advance = useThree((s) => s.advance)
  const get = useThree((s) => s.get)
  useEffect(() => {
    let raf = 0
    let last = 0
    const step = 1000 / fps - 2
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < step) return
      const dt = Math.min((t - last) / 1000, 0.1) // cap so resuming never causes a jump
      last = t
      advance(get().clock.elapsedTime + dt)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [advance, get, fps])
  return null
}

// Lowers pixel ratio if the device struggles; if it keeps struggling, drops the whole scene to the low tier
function AdaptiveQuality({ onFallback }: { onFallback: () => void }) {
  const setDpr = useThree((s) => s.setDpr)
  return (
    <PerformanceMonitor
      flipflops={3}
      onChange={({ factor }) => setDpr(Math.min(window.devicePixelRatio || 1, THREE.MathUtils.lerp(1, 1.5, factor)))}
      onFallback={() => {
        setDpr(1)
        onFallback()
      }}
    />
  )
}

// Shifts the 3D scene up (without resizing it) to line up with the shifted center circle, and shrinks the
// orbit on narrow screens so it matches the scaled-down DOM circle. Only touches the projection when something changed.
function StageOffset({ shift }: { shift: React.MutableRefObject<number> }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const last = useRef({ s: NaN, w: 0, h: 0 })
  useFrame(() => {
    const s = shift.current
    const l = last.current
    if (l.s === s && l.w === size.width && l.h === size.height) return
    l.s = s
    l.w = size.width
    l.h = size.height
    const cam = camera as THREE.PerspectiveCamera
    cam.zoom =
      size.width <= 768
        ? THREE.MathUtils.clamp(((REF_HEIGHT * designScale(size.width, size.height)) / size.height) * MOBILE_ORBIT_ZOOM, 0.35, 1.2)
        : 1
    cam.setViewOffset(size.width, size.height, 0, size.height * s, size.width, size.height)
  })
  useEffect(
    () => () => {
      const cam = camera as THREE.PerspectiveCamera
      cam.zoom = 1
      cam.clearViewOffset()
      cam.updateProjectionMatrix()
    },
    [camera]
  )
  return null
}

// ---------------------------------------------------------------------------------------
// DOM layer (center circle + text). Animated imperatively through refs: no React re-render
// happens while scrolling, and all per-frame writes are batched into one rAF.
// ---------------------------------------------------------------------------------------
type Els = {
  centerRoot: HTMLDivElement | null
  scaleWrap: HTMLDivElement | null
  ring600: HTMLDivElement | null
  ring500: HTMLDivElement | null
  emblem: HTMLDivElement | null
  emblemGlow: HTMLDivElement | null
  textBox: HTMLDivElement | null
  video: HTMLVideoElement | null
  cards: (HTMLDivElement | null)[]
  content: HTMLDivElement | null
  ctaRow: HTMLDivElement | null
}

const createEls = (): Els => ({
  centerRoot: null,
  scaleWrap: null,
  ring600: null,
  ring500: null,
  emblem: null,
  emblemGlow: null,
  textBox: null,
  video: null,
  cards: [],
  content: null,
  ctaRow: null,
})

const CENTER: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" }
const FILL: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" }
const RADIUS_VAR = `var(--r, ${CENTER_SIZE / 2}px)` // set once per frame on the emblem, inherited by its children

const circleGradient =
  "radial-gradient(circle at 50% 35%, rgba(10,26,92,0.92) 0%, rgba(5,11,42,0.94) 60%, rgba(2,4,15,0.96) 100%)"

const HeroCenter = memo(function HeroCenter({
  els,
  centerImage,
  centerVideo,
  useVideo,
}: {
  els: Els
  centerImage?: string
  centerVideo?: string
  useVideo: boolean
}) {
  return (
    <div
      ref={(el) => {
        els.centerRoot = el
      }}
      className="hero-center"
      style={{
        ...CENTER,
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        perspective: 1200,
        willChange: "transform",
        transform: `translateY(${-STAGE_SHIFT * 100}%)`,
      }}
    >
      <div
        ref={(el) => {
          els.scaleWrap = el
        }}
        style={{ transform: `scale(1) rotateX(${TILT}deg)` }}
      >
        <div style={{ ...CENTER, position: "relative", width: 600, height: 600, borderRadius: "50%" }}>
          <div
            ref={(el) => {
              els.ring600 = el
            }}
            className="hero-ring"
          />
          <div style={{ ...CENTER, position: "relative", width: 500, height: 500, borderRadius: "50%" }}>
            <div
              ref={(el) => {
                els.ring500 = el
              }}
              className="hero-ring"
            />
            <div
              ref={(el) => {
                els.emblem = el
              }}
              style={{
                ...CENTER,
                position: "relative",
                width: CENTER_SIZE,
                height: CENTER_SIZE,
                flexShrink: 0,
                borderRadius: RADIUS_VAR,
                padding: 3,
                background: "linear-gradient(135deg, #b5ecff, #1a9bff, #006bff)",
              }}
            >
              <div
                ref={(el) => {
                  els.emblemGlow = el
                }}
                className="hero-emblem-glow"
              />
              <div
                style={{
                  ...CENTER,
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: RADIUS_VAR,
                  background: circleGradient,
                }}
              >
                {/* poster image (always) + video on top (only on capable devices, after the page is idle) */}
                {(centerImage || (centerVideo && useVideo)) && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS_VAR, overflow: "hidden" }}>
                    {centerImage && <img src={centerImage} alt="" decoding="async" draggable={false} style={FILL} />}
                    {centerVideo && useVideo && (
                      <video
                        ref={(el) => {
                          els.video = el
                        }}
                        src={centerVideo}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        disablePictureInPicture
                        disableRemotePlayback
                        style={{ ...FILL, position: "absolute", inset: 0 }}
                      />
                    )}
                  </div>
                )}

                {PROFILES.map((src, i) => (
                  <div
                    key={src}
                    ref={(el) => {
                      els.cards[i] = el
                    }}
                    className="hero-card"
                  >
                    <img src={src} alt="" width={96} height={96} decoding="async" draggable={false} style={FILL} />
                  </div>
                ))}

                <div
                  ref={(el) => {
                    els.textBox = el
                  }}
                  style={{
                    ...CENTER,
                    flexDirection: "column",
                    position: "relative",
                    zIndex: 20,
                    textAlign: "center",
                    opacity: 0,
                    transition: "opacity 0.5s",
                  }}
                >
                  {/* <h1 ...>Empowering</h1> ... put center text here if you want it */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// ---- Hero text, services pill and buttons, right under the center circle ----
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const

const SERVICES: { label: string; icon: React.ReactNode }[] = [
  {
    label: "Web Development",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <polyline points="8 6 2 12 8 18" />
        <polyline points="16 6 22 12 16 18" />
        <line x1="14" y1="4" x2="10" y2="20" />
      </svg>
    ),
  },
  {
    label: "SEO",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} strokeWidth={2.5}>
        <line x1="5" y1="20" x2="5" y2="14" />
        <line x1="10" y1="20" x2="10" y2="9" />
        <line x1="15" y1="20" x2="15" y2="12" />
        <line x1="20" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    label: "Digital Marketing",
    icon: (
      <svg width="24" height="22" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} style={{ color: "#1a8cff" }}>
        <path d="M6.5 8C3.5 8 2 11 2 12.5S3.5 17 6.5 17c3.5 0 5-5 5.5-5s2 5 5.5 5c3 0 4.5-3 4.5-4.5S20.5 8 17.5 8c-3.5 0-5 5-5.5 5S10 8 6.5 8z" />
      </svg>
    ),
  },
  {
    label: "Web Maintenance",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
]

// All styling lives here (classes) so the low-end tier can swap heavy effects with one attribute: data-tier="low".
// Prefixed with .hero-root so they beat the section rule that clears div backgrounds.
const HERO_CSS = `
.hero-root{position:relative;width:100%;height:100vh;height:100svh;overflow:hidden;background:radial-gradient(ellipse 70% 55% at 50% 42%,#0a1a5c 0%,#050b2a 40%,#02040f 70%,#000 100%);-webkit-tap-highlight-color:transparent}
.hero-root:not([data-ready]) .hero-center,.hero-root:not([data-ready]) .hero-content{opacity:0}
.hero-root div{background-color:transparent}
.hero-root canvas{background:transparent !important;display:block}
.hero-root .hero-bottom-glow{position:absolute;left:0;right:0;bottom:0;height:33%;pointer-events:none;background:radial-gradient(ellipse 60% 100% at 50% 100%,rgba(30,80,255,.35) 0%,rgba(30,80,255,0) 70%)}
.hero-root .hero-ring{position:absolute;inset:0;box-sizing:border-box;border-radius:50%;border:2px solid rgba(0,110,255,.9);box-shadow:0 0 25px rgba(0,110,255,.5),0 0 60px rgba(0,110,255,.15),inset 0 0 30px rgba(0,110,255,.25),inset 0 2px 8px rgba(0,110,255,.4);opacity:0;transition:opacity .5s;pointer-events:none}
.hero-root .hero-emblem-glow{position:absolute;inset:0;border-radius:var(--r,160px);pointer-events:none;box-shadow:0 0 14px rgba(0,200,255,.9),0 0 34px rgba(0,143,255,.7),0 0 80px rgba(0,107,255,.4),inset 0 0 12px rgba(0,200,255,.5)}
.hero-root .hero-card{position:absolute;width:96px;height:96px;border-radius:16px;overflow:hidden;border:4px solid #1f2937;box-shadow:0 0 8px rgba(255,255,255,.6),0 0 25px rgba(255,255,255,.5),0 0 60px rgba(255,255,255,.15);transition:transform .3s ease-out;will-change:transform,opacity;transform:translate3d(0,0,0)}
.hero-root .hero-content{position:absolute;left:0;right:0;top:calc(${(0.5 - STAGE_SHIFT) * 100}% + ${CENTER_SIZE / 2}px * var(--s,1));bottom:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:clamp(4px,1vh,12px) 20px env(safe-area-inset-bottom,0px);font-family:var(--font-montserrat,inherit);will-change:opacity,transform;pointer-events:none}
.hero-root .hero-title-wrap{position:relative;max-width:100%}
.hero-root .hero-h1{margin:0;font-size:clamp(26px,min(2.8vw,5.8vh),56px);font-weight:800;line-height:1.08;letter-spacing:-.01em}
.hero-root .hero-h-a,.hero-root .hero-h-b{display:block;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.hero-root .hero-h-a{background-image:linear-gradient(180deg,#fff 0%,#e6ecf7 40%,#8fa0bd 100%);filter:drop-shadow(0 2px 4px rgba(0,0,0,.7)) drop-shadow(0 0 10px rgba(180,200,235,.25))}
.hero-root .hero-h-b{font-style:italic;background-image:linear-gradient(180deg,#5cc3ff 0%,#1a8cff 45%,#006bff 100%);filter:drop-shadow(0 0 8px rgba(0,143,255,.85)) drop-shadow(0 0 22px rgba(0,107,255,.55))}
.hero-root .hero-swoosh{position:absolute;left:40%;bottom:-14px;width:48%;height:14px;filter:drop-shadow(0 0 3px rgba(0,200,255,.9)) drop-shadow(0 0 8px rgba(0,143,255,.7))}
.hero-root .hero-services{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:clamp(18px,3vh,28px);padding:clamp(8px,1.2vh,12px) clamp(10px,1.4vw,26px);border-radius:999px;border:2px solid #1a8cff;background:rgba(2,8,23,.75);box-shadow:0 0 10px rgba(26,140,255,.9),0 0 28px rgba(0,107,255,.5),inset 0 0 14px rgba(0,143,255,.35)}
.hero-root .hero-services-item{display:flex;align-items:center;gap:10px;padding:4px clamp(12px,1.4vw,26px);font-size:clamp(13px,.95vw,18px);font-weight:500;color:#fff;white-space:nowrap}
.hero-root .hero-services-item svg{flex-shrink:0}
.hero-root .hero-services-item + .hero-services-item{border-left:1px solid rgba(198,213,234,.3)}
.hero-root .hero-cta-row{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(12px,1.2vw,22px);margin-top:clamp(12px,2vh,20px)}
.hero-root .hero-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:clamp(44px,6vh,58px);padding:0 clamp(24px,2.2vw,40px);border-radius:999px;font-size:clamp(14px,1vw,18px);font-weight:600;color:#fff;text-decoration:none;white-space:nowrap;cursor:pointer;touch-action:manipulation;transition:box-shadow .25s ease,transform .25s ease,border-color .25s ease}
.hero-root .hero-btn svg{flex-shrink:0}
.hero-root .hero-btn-primary{background:linear-gradient(180deg,#2a9bff 0%,#0a6bff 50%,#0537c9 100%);border:2px solid #3fc8ff;box-shadow:0 0 12px rgba(0,200,255,.7),0 0 32px rgba(0,120,255,.65),0 0 70px rgba(0,80,255,.3),inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 16px rgba(0,200,255,.35)}
.hero-root .hero-btn-secondary{background:rgba(2,6,20,.8);border:2px solid #2a86ff;box-shadow:0 0 12px rgba(26,140,255,.7),0 0 30px rgba(0,107,255,.35),inset 0 0 14px rgba(0,107,255,.3)}
@media (hover:hover){
.hero-root .hero-btn-primary:hover{transform:translateY(-1px);border-color:#8fe6ff;box-shadow:0 0 16px rgba(0,220,255,.9),0 0 42px rgba(0,140,255,.8),0 0 90px rgba(0,80,255,.4),inset 0 1px 0 rgba(255,255,255,.55),inset 0 0 20px rgba(0,200,255,.5)}
.hero-root .hero-btn-secondary:hover{transform:translateY(-1px);border-color:#5aa8ff;box-shadow:0 0 18px rgba(26,140,255,.9),0 0 40px rgba(0,107,255,.5),inset 0 0 18px rgba(0,107,255,.4)}
}
.hero-root .hero-btn:active{transform:scale(.97)}

/* ---- tablets + phones: 2x2 services grid, side-by-side buttons ---- */
@media (max-width:820px){
.hero-root .hero-content{padding-left:16px;padding-right:16px}
.hero-root .hero-h1{font-size:clamp(24px,7vw,40px)}
.hero-root .hero-services{display:grid;grid-template-columns:1fr 1fr;width:min(100%,360px);margin-top:clamp(16px,2.6vh,24px);padding:6px 8px;border-radius:22px}
.hero-root .hero-services-item{padding:7px 8px;gap:8px;font-size:13px}
.hero-root .hero-services-item + .hero-services-item{border-left:none}
.hero-root .hero-services-item svg{width:18px;height:18px}
.hero-root .hero-cta-row{flex-wrap:nowrap;width:min(100%,360px);gap:10px;margin-top:clamp(12px,2vh,18px)}
.hero-root .hero-btn{flex:1 1 0;min-width:0;height:46px;padding:0 10px;gap:6px;font-size:14px}
.hero-root .hero-btn svg{width:16px;height:16px}
}
@media (max-width:360px){
.hero-root .hero-services-item{font-size:12px;padding:6px}
.hero-root .hero-btn{font-size:13px;padding:0 6px}
}
/* short screens (landscape phones, small laptops) */
@media (max-height:560px){
.hero-root .hero-h1{font-size:clamp(20px,5.2vh,32px)}
.hero-root .hero-services{margin-top:12px}
.hero-root .hero-services-item{padding-top:3px;padding-bottom:3px}
.hero-root .hero-btn{height:40px}
.hero-root .hero-cta-row{margin-top:10px}
}

/* ---- LOW-END TIER: swap big blurs/filters for cheap shadows (painting big box-shadows is what lags weak GPUs) ---- */
.hero-root[data-tier="low"] .hero-ring{box-shadow:0 0 16px rgba(0,110,255,.5),inset 0 0 18px rgba(0,110,255,.25)}
.hero-root[data-tier="low"] .hero-emblem-glow{box-shadow:0 0 14px rgba(0,200,255,.8),0 0 30px rgba(0,143,255,.45)}
.hero-root[data-tier="low"] .hero-card{box-shadow:0 0 10px rgba(255,255,255,.45);transition:none}
.hero-root[data-tier="low"] .hero-h-a,.hero-root[data-tier="low"] .hero-h-b,.hero-root[data-tier="low"] .hero-swoosh{filter:none}
.hero-root[data-tier="low"] .hero-services{box-shadow:0 0 10px rgba(26,140,255,.7)}
.hero-root[data-tier="low"] .hero-btn-primary{box-shadow:0 0 12px rgba(0,160,255,.6),inset 0 1px 0 rgba(255,255,255,.35)}
.hero-root[data-tier="low"] .hero-btn-secondary{box-shadow:0 0 10px rgba(26,140,255,.55)}
.hero-root[data-tier="low"] .hero-bottom-glow{display:none}
@media (prefers-reduced-motion:reduce){.hero-root *{transition:none !important}}
`

const HeroContent = memo(function HeroContent({ els }: { els: Els }) {
  return (
    <div
      ref={(el) => {
        els.content = el
      }}
      className="hero-content"
    >
      <div className="hero-title-wrap">
        <h1 className="hero-h1">
          <span className="hero-h-a">Web Solutions That</span>
          <span className="hero-h-b">Grow Your Business.</span>
        </h1>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="hero-swoosh" aria-hidden="true">
          <defs>
            <linearGradient id="hero-swoosh" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#008fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#4db8ff" stopOpacity="1" />
              <stop offset="1" stopColor="#008fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 14 Q 200 2 400 10" fill="none" stroke="url(#hero-swoosh)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="hero-services">
        {SERVICES.map((sv) => (
          <div key={sv.label} className="hero-services-item">
            {sv.icon}
            {sv.label}
          </div>
        ))}
      </div>

      <div
        ref={(el) => {
          els.ctaRow = el
        }}
        className="hero-cta-row"
        style={{ pointerEvents: "auto" }}
      >
        <a href="#contact" className="hero-btn hero-btn-primary">
          Get a Quote
          <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
        <a href="#work" className="hero-btn hero-btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
          See Our Work
        </a>
      </div>
    </div>
  )
})

export default function Hero({
  images = DEFAULT_HERO_IMAGES,
  centerImage = DEFAULT_CENTER_IMAGE,
  centerVideo = DEFAULT_CENTER_VIDEO,
  videoOnLowEnd = false, // set true to also play the center video on low-end devices (not recommended)
}: {
  images?: string[]
  centerImage?: string
  centerVideo?: string
  videoOnLowEnd?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const controlsRef = useRef<any>(null)
  const virtual = useRef(0) // wheel/touch driven "scroll" position, 0..TOTAL_SCROLL
  const expanded = useRef(false) // true once fully zoomed -> page scrolls normally
  const touchStartY = useRef(0)
  const stage = useRef(STAGE_SHIFT) // smoothed stage shift (fraction of hero height)
  const visibleRef = useRef(true)
  const [els] = useState(createEls)

  // React state only for things that change rarely (never per scroll tick)
  const [env, setEnv] = useState<Env | null>(null) // null until the device has been measured
  const [visible, setVisible] = useState(true)
  const [covered, setCovered] = useState(false) // true when the full-screen video hides the 3D scene
  const [videoOn, setVideoOn] = useState(false)

  useEffect(() => {
    setEnv(detectEnv())
  }, [])

  const downgrade = useCallback(() => setEnv((e) => (e && e.tier !== "low" ? { ...e, tier: "low" } : e)), [])

  // video: never on low-end; on capable devices it starts only after the page is idle
  const allowVideo = !!centerVideo && !!env && (env.tier !== "low" || videoOnLowEnd)
  useEffect(() => {
    if (!allowVideo) {
      setVideoOn(false)
      return
    }
    const w = window as any
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setVideoOn(true), { timeout: 1500 }) : window.setTimeout(() => setVideoOn(true), 600)
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : clearTimeout(id))
  }, [allowVideo])

  useEffect(() => {
    const section = ref.current
    if (!section) return

    const layout = { scale: 1, vw: 1920, heroH: 1080 }
    const last = { shift: NaN, v: NaN, zoom: NaN, open: NaN, fade: NaN, covered: false }
    let layoutDirty = true
    let measureDirty = true
    let raf = 0
    let lastT = 0

    // ---- reads (only on resize, once per frame) ----
    const measure = () => {
      layout.vw = section.clientWidth || window.innerWidth
      layout.heroH = section.clientHeight || window.innerHeight
      layout.scale = designScale(layout.vw, layout.heroH)
      section.style.setProperty("--s", String(layout.scale)) // drives the text block position in CSS
      layoutDirty = true
    }

    const setVis = (el: HTMLElement | null, on: boolean) => {
      if (el) el.style.visibility = on ? "visible" : "hidden"
    }

    // ---- writes (styles only, no layout reads) ----
    const apply = () => {
      const { scale, vw, heroH } = layout
      const v = virtual.current
      const shift = stage.current

      if (shift !== last.shift || layoutDirty) {
        last.shift = shift
        if (els.centerRoot) els.centerRoot.style.transform = `translateY(${-shift * heroH}px)`
        if (els.content) els.content.style.transform = `translate3d(0, ${(STAGE_SHIFT - shift) * heroH}px, 0)`
      }

      if (v !== last.v || layoutDirty) {
        last.v = v
        const open = Math.min(v / SCROLL_DISTANCE, 1)
        const zoom = Math.min(Math.max((v - SCROLL_DISTANCE - HOLD_DISTANCE) / ZOOM_DISTANCE, 0), 1)
        const fade = 1 - Math.min(zoom * 3, 1)

        if (zoom !== last.zoom || layoutDirty) {
          last.zoom = zoom
          // the circle morphs into a full-screen rectangle (size + corner radius, no scaling)
          const ease = zoom * zoom * (3 - 2 * zoom)
          const curW = CENTER_SIZE + (vw / scale + 4 - CENTER_SIZE) * ease
          const curH = CENTER_SIZE + (heroH / scale + 4 - CENTER_SIZE) * ease
          const radius = (Math.min(curW, curH) / 2) * (1 - ease)
          if (els.scaleWrap) els.scaleWrap.style.transform = `scale(${scale}) rotateX(${TILT * (1 - zoom)}deg)`
          const em = els.emblem
          if (em) {
            em.style.width = `${curW}px`
            em.style.height = `${curH}px`
            em.style.padding = `${3 * (1 - ease)}px`
            em.style.setProperty("--r", `${radius}px`)
          }
        }

        if (fade !== last.fade) {
          // once faded out, hide the glow / cards / text completely so the browser stops painting them during the zoom
          const on = fade > 0
          if (els.emblemGlow) els.emblemGlow.style.opacity = String(fade)
          setVis(els.emblemGlow, on)
          setVis(els.textBox, on)
          for (let i = 0; i < els.cards.length; i++) setVis(els.cards[i], on)
        }
        if (els.ring600) els.ring600.style.opacity = v > SCROLL_DISTANCE * 0.6 ? String(fade) : "0"
        if (els.ring500) els.ring500.style.opacity = v > SCROLL_DISTANCE * 0.2 ? String(fade) : "0"
        if (els.textBox) els.textBox.style.opacity = v > SCROLL_DISTANCE * 0.5 ? String(fade) : "0"

        if (open !== last.open || fade !== last.fade) {
          const expandRadius = open * 300
          const cards = els.cards
          for (let i = 0; i < cards.length; i++) {
            const c = cards[i]
            if (!c) continue
            c.style.transform = `translate3d(${expandRadius * CARD_ANGLES[i].cos}px, ${expandRadius * CARD_ANGLES[i].sin}px, 0)`
            c.style.opacity = String(fade)
          }
        }
        last.open = open
        last.fade = fade

        // headline / pill / buttons: visible while the circle is closed, gone as soon as it starts opening
        const heroFade = 1 - Math.min(v / (SCROLL_DISTANCE * 0.4), 1)
        if (els.content) {
          els.content.style.opacity = String(heroFade)
          els.content.style.visibility = heroFade > 0 ? "visible" : "hidden"
        }
        if (els.ctaRow) els.ctaRow.style.pointerEvents = heroFade > 0.1 ? "auto" : "none"

        // once the video covers the screen the 3D scene is invisible -> stop rendering it
        const isCovered = v >= TOTAL_SCROLL
        if (isCovered !== last.covered) {
          last.covered = isCovered
          setCovered(isCovered)
        }
      }
      layoutDirty = false
    }

    const tick = (t: number) => {
      raf = 0
      if (measureDirty) {
        measureDirty = false
        measure()
      }

      // smooth the stage shift (frame-rate independent ease)
      const dt = lastT ? Math.min(t - lastT, 50) : 16.7
      lastT = t
      const open = Math.min(virtual.current / SCROLL_DISTANCE, 1)
      const target = STAGE_SHIFT + (STAGE_SHIFT_OPEN - STAGE_SHIFT) * open
      const diff = target - stage.current
      if (Math.abs(diff) > 0.0003) {
        const k = 1 - Math.pow(1 - 0.12, dt / 16.667)
        stage.current = Math.abs(diff) < 0.001 ? target : stage.current + diff * k
      }

      apply()

      if (Math.abs(target - stage.current) > 0.0003) schedule()
      else lastT = 0
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    // ---- input ----
    window.scrollTo(0, 0)

    const update = (v: number) => {
      virtual.current = Math.min(Math.max(v, 0), TOTAL_SCROLL)
      if (virtual.current >= TOTAL_SCROLL) setExpanded(true)
      schedule()
    }

    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY // Firefox reports lines, not pixels
      if (expanded.current && dy < 0 && window.scrollY <= 5) {
        setExpanded(false) // scrolling back up at the top: play the animation in reverse
        e.preventDefault()
      } else if (!expanded.current) {
        e.preventDefault()
        update(virtual.current + dy)
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
        setExpanded(false)
        touchStartY.current = y
        if (e.cancelable) e.preventDefault()
      } else if (!expanded.current) {
        if (e.cancelable) e.preventDefault()
        update(virtual.current + deltaY * (deltaY < 0 ? TOUCH_BACK : TOUCH_FORWARD))
        touchStartY.current = y
      }
    }

    const onTouchEnd = () => {
      touchStartY.current = 0
    }

    // keyboard users: space / arrows / page keys drive the hero too (otherwise the scroll lock would trap them)
    const onKey = (e: KeyboardEvent) => {
      if (expanded.current) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      let step = 0
      if (e.key === "ArrowDown") step = 80
      else if (e.key === "ArrowUp") step = -80
      else if (e.key === " " || e.key === "PageDown") step = 300
      else if (e.key === "PageUp") step = -300
      else if (e.key === "End") step = TOTAL_SCROLL
      if (!step) return
      e.preventDefault()
      update(virtual.current + step)
    }

    // blocking (non-passive) listeners are only attached while they can be needed, so normal page
    // scrolling stays on the fast compositor path
    let blocking = false
    const syncBlocking = () => {
      const need = !expanded.current || window.scrollY <= 5
      if (need === blocking) return
      blocking = need
      if (need) {
        window.addEventListener("wheel", onWheel, { passive: false })
        window.addEventListener("touchmove", onTouchMove, { passive: false })
      } else {
        window.removeEventListener("wheel", onWheel)
        window.removeEventListener("touchmove", onTouchMove)
      }
    }

    const setExpanded = (val: boolean) => {
      expanded.current = val
      syncBlocking()
    }

    // keep the page at the top until the hero has finished
    const onScroll = () => {
      if (!expanded.current) window.scrollTo(0, 0)
      syncBlocking()
    }

    // CTA buttons: while the hero is locked a plain #anchor would be reset by onScroll, so finish the hero first, then jump
    const onCta = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null
      if (!a) return
      const hash = a.getAttribute("href") || ""
      e.preventDefault()
      update(TOTAL_SCROLL)
      setExpanded(true)
      requestAnimationFrame(() => {
        try {
          if (hash.length > 1) document.querySelector(hash)?.scrollIntoView()
        } catch {
          /* invalid selector: ignore */
        }
      })
    }

    // ---- visibility: pause video when the hero is off screen / tab hidden ----
    const syncVideo = () => {
      const vid = els.video
      if (!vid) return
      if (visibleRef.current && !document.hidden) vid.play()?.catch(() => {})
      else vid.pause()
    }

    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting
      setVisible(e.isIntersecting)
      syncVideo()
    })
    io.observe(section)

    // ResizeObserver also catches mobile address-bar show/hide and rotation
    const ro = new ResizeObserver(() => {
      measureDirty = true
      schedule()
    })
    ro.observe(section)

    const cta = els.ctaRow
    cta?.addEventListener("click", onCta)
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("keydown", onKey)
    document.addEventListener("visibilitychange", syncVideo)
    syncBlocking()

    // initial layout + first paint of the DOM layer
    measureDirty = false
    measure()
    apply()
    section.setAttribute("data-ready", "1")

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      cta?.removeEventListener("click", onCta)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("visibilitychange", syncVideo)
    }
  }, [els])

  const low = env?.tier === "low"
  const count = env ? PARTICLES[env.tier] : 0

  return (
    <section ref={ref} className="hero-root" data-tier={env?.tier ?? "mid"}>
      <style>{HERO_CSS}</style>

      <div className="hero-bottom-glow" />

      {env && (
        <Canvas
          style={covered ? CANVAS_STYLE_COVERED : CANVAS_STYLE}
          // low tier: always "never" and the FrameLimiter renders at 30fps; others render every frame while visible
          frameloop={low ? "never" : visible && !covered ? "always" : "never"}
          dpr={DPR[env.tier]}
          resize={CANVAS_RESIZE}
          camera={CANVAS_CAMERA}
          gl={low ? GL_LOW : GL_FULL}
          onCreated={onCanvasCreated}
        >
          {!low && <AdaptiveQuality onFallback={downgrade} />}
          <StageOffset shift={stage} />

          {/* lights are only needed for the lit tile edges (high/mid) */}
          {!low && (
            <>
              <ambientLight intensity={0.6} />
              <directionalLight position={[-10, 12, 10]} intensity={2.2} />
              <pointLight position={[0, 6, 0]} intensity={60} color="#3c6eff" />
            </>
          )}

          {count > 0 && (
            <SafeBoundary name="particles">
              <Suspense fallback={null}>
                <HeroParticles count={count} />
              </Suspense>
            </SafeBoundary>
          )}

          <SafeBoundary name="images">
            <Suspense fallback={null}>
              <HeroImages images={images} tier={env.tier} />
            </Suspense>
          </SafeBoundary>

          {!env.reduced && <CameraRig controls={controlsRef} />}
          <OrbitControls
            ref={controlsRef}
            enableZoom={false}
            enablePan={false}
            enableRotate={!env.coarse} // on touch screens the drag is used to scrub the hero, not to rotate
            autoRotate={!env.reduced}
            autoRotateSpeed={0.4}
          />
          {low && visible && !covered && <FrameLimiter fps={LOW_FPS} />}
        </Canvas>
      )}

      <HeroCenter els={els} centerImage={centerImage} centerVideo={centerVideo} useVideo={videoOn} />
      <HeroContent els={els} />
    </section>
  )
}