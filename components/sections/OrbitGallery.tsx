"use client"

import React, { Suspense, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, PerformanceMonitor, useTexture } from "@react-three/drei"
import * as THREE from "three"

const RADIUS = 9
const IMAGE_SIZE = 1.5
// The page is locked while the hero plays (wheel / touch drive it), then normal scrolling is released.
const SCROLL_DISTANCE = 250 // px of wheel/touch input the circle needs to open up
const ZOOM_DISTANCE = 400 // extra px of wheel/touch input used to zoom the center circle over the screen
const HOLD_DISTANCE = 600 // px of wheel/touch input AFTER the circle is fully open, before the zoom starts (the opened circle stays on screen)
const TOTAL_SCROLL = SCROLL_DISTANCE + HOLD_DISTANCE + ZOOM_DISTANCE
const TILT = 10 // degrees, top leans away from the viewer (negative = other way)

// SIZE OF THE BIG CENTER CIRCLE (px) - change this one number to resize it
const CENTER_SIZE = 320

// How far (fraction of hero height) the circle + orbit sit ABOVE the screen center, so the text/buttons fit under the circle.
// Set to 0 to put everything back to the exact center.
const STAGE_SHIFT = 0.12
// Same thing, but for while the circle is opened (after scrolling): 0 = exact center, negative = lower than center.
const STAGE_SHIFT_OPEN = 0

// 3D tile settings
const TILE_DEPTH = 0.01 // slab thickness
const TILE_BEVEL = 0.02 // edge bevel size
const TILE_RADIUS = 0.02 // corner roundness
const FACE_Z = TILE_DEPTH / 2 + TILE_BEVEL + 0.002

// Orbit position switching
const VIEW_INTERVAL = 12000 // ms between position changes
const USER_PAUSE = 4000 // ms after the user lets go before auto-change can happen again
// Camera polar angle in degrees (0 = straight down, 90 = level, 180 = straight up), in order:
// 1) from far below looking almost straight up (near side on top),
// 2) almost top-down (ring face-on), 3) from above (near side at the bottom)
const VIEW_ANGLES = [68, 105, 200]

// const DEFAULT_HERO_IMAGES: string[] = Array(30).fill("/images/sample1.png")
const DEFAULT_HERO_IMAGES: string[] = Array(30).fill("/images/sample1.png")

// Video that fills the big center circle (put your file in /public/videos/)
const DEFAULT_CENTER_VIDEO = "/videos/circle.mp4"

// Optional poster shown until the video loads (falls back to the dark gradient if empty/missing)
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
const CANVAS_CAMERA = { position: [-9.3, 5.3, 9.3] as [number, number, number], fov: 50 }
const CANVAS_GL = { antialias: false, powerPreference: "high-performance" as const, alpha: true }
const CANVAS_DPR: [number, number] = [1, 1.5]
const CANVAS_RESIZE = { scroll: false } // no re-measure / canvas reset on every page scroll
const onCanvasCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => gl.setClearColor(0x000000, 0)

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
  const tex = useMemo(() => {
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

// Navbar-style neon for the orbit tiles: a soft outer glow sprite and an inner edge glow overlay
function useGlowTextures() {
  return useMemo(() => {
    const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    // outer glow (drawn on a plane 2x the tile size, tile occupies the middle 50%)
    const S = 256
    const outer = document.createElement("canvas")
    outer.width = outer.height = S
    const o = outer.getContext("2d")!
    o.shadowColor = "rgba(0,110,255,1)"
    o.shadowBlur = 55
    o.fillStyle = "rgba(0,110,255,1)"
    rr(o, S * 0.25, S * 0.25, S * 0.5, S * 0.5, 8)
    o.fill()

    // inner glow (transparent centre, blue edges, laid over the image face)
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
  }, [])
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

const HeroImages = memo(function HeroImages({ images }: { images: string[] }) {
  // identical URLs share ONE texture (was: one GPU texture per tile)
  const unique = useMemo(() => Array.from(new Set(images)), [images])
  const textures = useTexture(unique) as THREE.Texture[]
  const { outerTex, innerTex } = useGlowTextures()

  const { bodyGeo, faceGeo, glowGeo } = useMemo(() => {
    // thick beveled slab
    const bodySize = IMAGE_SIZE - TILE_BEVEL * 2
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(bodySize, bodySize, TILE_RADIUS), {
      depth: TILE_DEPTH,
      bevelEnabled: true,
      bevelThickness: TILE_BEVEL,
      bevelSize: TILE_BEVEL,
      bevelSegments: 2,
      curveSegments: 6,
    })
    bodyGeo.translate(0, 0, -TILE_DEPTH / 2)

    // rounded image face, inset so the bevel rim stays visible
    const faceSize = IMAGE_SIZE - 0.14
    const faceGeo = new THREE.ShapeGeometry(roundedRectShape(faceSize, faceSize, TILE_RADIUS * 0.8), 6)
    const pos = faceGeo.attributes.position
    const uv = faceGeo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / faceSize + 0.5, pos.getY(i) / faceSize + 0.5)
    }
    uv.needsUpdate = true

    const glowGeo = new THREE.PlaneGeometry(IMAGE_SIZE * 2, IMAGE_SIZE * 2)
    return { bodyGeo, faceGeo, glowGeo }
  }, [])

  // per-tile matrices, grouped by part (and by texture for the image faces)
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
      glowGeo.dispose()
      outerTex.dispose()
      innerTex.dispose()
    },
    [bodyGeo, faceGeo, glowGeo, outerTex, innerTex]
  )

  if (!images.length) return null

  return (
    <>
      {/* outer neon glow (sits inside the slab, so only the part past the edges shows) */}
      <Instances geometry={glowGeo} matrices={parts.glow}>
        <meshBasicMaterial
          map={outerTex}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </Instances>

      {/* neon rim: the bevel edge around the image */}
      <Instances geometry={bodyGeo} matrices={parts.body}>
        <meshStandardMaterial
          color="#0b0e16"
          metalness={0.4}
          roughness={0.4}
          emissive="#1a8cff"
          emissiveIntensity={1.6}
        />
      </Instances>

      {textures.map((map, g) =>
        parts.front[g].length ? (
          <React.Fragment key={g}>
            {/* front */}
            <Instances geometry={faceGeo} matrices={parts.front[g]}>
              <meshBasicMaterial map={map} toneMapped={false} />
            </Instances>
            {/* back (so tiles on the far side still show the image) */}
            <Instances geometry={faceGeo} matrices={parts.back[g]}>
              <meshBasicMaterial map={map} toneMapped={false} />
            </Instances>
          </React.Fragment>
        ) : null
      )}

      {/* front inner glow */}
      <Instances geometry={faceGeo} matrices={parts.frontGlow}>
        <meshBasicMaterial
          map={innerTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </Instances>

      {/* back inner glow */}
      <Instances geometry={faceGeo} matrices={parts.backGlow}>
        <meshBasicMaterial
          map={innerTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </Instances>
    </>
  )
})

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

// Lowers pixel ratio only if the device actually struggles, raises it back when it recovers
function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr)
  return (
    <PerformanceMonitor
      flipflops={3}
      onChange={({ factor }) =>
        setDpr(Math.min(window.devicePixelRatio || 1, THREE.MathUtils.lerp(1, 1.5, factor)))
      }
      onFallback={() => setDpr(1)}
    />
  )
}

// Shifts the 3D scene up on screen (without resizing it) so it lines up with the shifted center circle.
// `shift` is the same animated value the circle uses, so the orbit and the circle always move together.
// Only touches the projection matrix when the shift or canvas size actually changed.
function StageOffset({ shift }: { shift: React.MutableRefObject<number> }) {
  const { camera, size } = useThree()
  const last = useRef({ s: NaN, w: 0, h: 0 })
  useFrame(() => {
    const s = shift.current
    const l = last.current
    if (l.s === s && l.w === size.width && l.h === size.height) return
    l.s = s
    l.w = size.width
    l.h = size.height
    const cam = camera as THREE.PerspectiveCamera
    cam.setViewOffset(size.width, size.height, 0, size.height * s, size.width, size.height)
  })
  useEffect(
    () => () => {
      const cam = camera as THREE.PerspectiveCamera
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

// same neon glow as the navbar (outer glow, wide ambient glow, inner glow, bright inner top edge)
const NEON =
  "0 0 25px rgba(0,110,255,0.5), 0 0 60px rgba(0,110,255,0.15), inset 0 0 30px rgba(0,110,255,0.25), inset 0 2px 8px rgba(0,110,255,0.4)"

// brighter, controlled glow for the main emblem rim
const EMBLEM_GLOW =
  "0 0 14px rgba(0,200,255,0.9), 0 0 34px rgba(0,143,255,0.7), 0 0 80px rgba(0,107,255,0.4), inset 0 0 12px rgba(0,200,255,0.5)"

const CARD_GLOW = "0 0 8px rgba(255,255,255,0.6), 0 0 25px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.15)"

// Ring borders/glows live on their own overlay so only `opacity` (compositor-only) animates
const RING: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  boxSizing: "border-box",
  borderRadius: "50%",
  border: "2px solid rgba(0,110,255,0.9)",
  boxShadow: NEON,
  opacity: 0,
  transition: "opacity 0.5s",
  pointerEvents: "none",
}

const RADIUS_VAR = `var(--r, ${CENTER_SIZE / 2}px)` // set once per frame on the emblem, inherited by its children

const circleGradient =
  "radial-gradient(circle at 50% 35%, rgba(10,26,92,0.92) 0%, rgba(5,11,42,0.94) 60%, rgba(2,4,15,0.96) 100%)"

// Center section that sits inside the orbit
const HeroCenter = memo(function HeroCenter({
  els,
  centerImage,
  centerVideo,
}: {
  els: Els
  centerImage?: string
  centerVideo?: string
}) {
  return (
    <div
      ref={(el) => {
        els.centerRoot = el
      }}
      style={{
        ...CENTER,
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        perspective: 1200,
        willChange: "transform",
        transform: `translateY(${-STAGE_SHIFT * 1080}px)`,
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
            style={RING}
          />
          <div style={{ ...CENTER, position: "relative", width: 500, height: 500, borderRadius: "50%" }}>
            <div
              ref={(el) => {
                els.ring500 = el
              }}
              style={RING}
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
              {/* emblem rim glow (own layer, only its opacity animates) */}
              <div
                ref={(el) => {
                  els.emblemGlow = el
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: RADIUS_VAR,
                  boxShadow: EMBLEM_GLOW,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  ...CENTER,
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: RADIUS_VAR,
                  // gradient underneath as a fallback while the video loads
                  background: circleGradient,
                }}
              >
                {/* video fills the whole circle */}
                {centerVideo && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: RADIUS_VAR,
                      overflow: "hidden", // clips only the video, not the profile cards
                    }}
                  >
                    <video
                      ref={(el) => {
                        els.video = el
                      }}
                      src={centerVideo}
                      poster={centerImage || undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      disablePictureInPicture
                      disableRemotePlayback
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}

                {PROFILES.map((src, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      els.cards[i] = el
                    }}
                    style={{
                      position: "absolute",
                      width: 96,
                      height: 96,
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "4px solid #1f2937",
                      // white glow (outer layers only; inset layers would be hidden under the image)
                      boxShadow: CARD_GLOW,
                      transition: "transform 0.3s ease-out",
                      willChange: "transform, opacity",
                      transform: "translate3d(0px, 0px, 0)",
                    }}
                  >
                    <img
                      src={src}
                      alt={`Profile ${i + 1}`}
                      decoding="async"
                      draggable={false}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
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
                  {/* <h1 style={{ fontSize: 36, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Empowering</h1> */}
                  {/* <h1 style={{ fontSize: 36, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>Every User</h1> */}
                  {/* <p style={{ maxWidth: 320, color: "#9ca3af", margin: 0 }}>
                    From entrepreneurs to educators, Gen AI provides tools to simplify work.
                  </p> */}
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

// Prefixed with .hero-root so they beat the section rule that clears div backgrounds
const HERO_CSS = `
.hero-root div{background-color:transparent}
.hero-root canvas{background:transparent !important}
.hero-root .hero-services{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:clamp(18px,3vh,28px);padding:clamp(8px,1.2vh,12px) clamp(10px,1.4vw,26px);border-radius:999px;border:2px solid #1a8cff;background:rgba(2,8,23,.75);box-shadow:0 0 10px rgba(26,140,255,.9),0 0 28px rgba(0,107,255,.5),inset 0 0 14px rgba(0,143,255,.35)}
.hero-root .hero-services-item{display:flex;align-items:center;gap:10px;padding:4px clamp(12px,1.4vw,26px);font-size:clamp(13px,.95vw,18px);font-weight:500;color:#fff;white-space:nowrap}
.hero-root .hero-services-item + .hero-services-item{border-left:1px solid rgba(198,213,234,.3)}
.hero-root .hero-cta-row{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(12px,1.2vw,22px);margin-top:clamp(12px,2vh,20px)}
.hero-root .hero-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:clamp(44px,6vh,58px);padding:0 clamp(24px,2.2vw,40px);border-radius:999px;font-size:clamp(14px,1vw,18px);font-weight:600;color:#fff;text-decoration:none;white-space:nowrap;cursor:pointer;transition:box-shadow .25s ease,transform .25s ease,border-color .25s ease}
.hero-root .hero-btn-primary{background:linear-gradient(180deg,#2a9bff 0%,#0a6bff 50%,#0537c9 100%);border:2px solid #3fc8ff;box-shadow:0 0 12px rgba(0,200,255,.7),0 0 32px rgba(0,120,255,.65),0 0 70px rgba(0,80,255,.3),inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 16px rgba(0,200,255,.35)}
.hero-root .hero-btn-primary:hover{transform:translateY(-1px);border-color:#8fe6ff;box-shadow:0 0 16px rgba(0,220,255,.9),0 0 42px rgba(0,140,255,.8),0 0 90px rgba(0,80,255,.4),inset 0 1px 0 rgba(255,255,255,.55),inset 0 0 20px rgba(0,200,255,.5)}
.hero-root .hero-btn-secondary{background:rgba(2,6,20,.8);border:2px solid #2a86ff;box-shadow:0 0 12px rgba(26,140,255,.7),0 0 30px rgba(0,107,255,.35),inset 0 0 14px rgba(0,107,255,.3)}
.hero-root .hero-btn-secondary:hover{transform:translateY(-1px);border-color:#5aa8ff;box-shadow:0 0 18px rgba(26,140,255,.9),0 0 40px rgba(0,107,255,.5),inset 0 0 18px rgba(0,107,255,.4)}
@media (max-width:640px){
.hero-root .hero-services{border-radius:22px}
.hero-root .hero-services-item{padding:6px 12px}
.hero-root .hero-services-item + .hero-services-item{border-left:none}
.hero-root .hero-cta-row{gap:12px}
}
`

const gradText = (bg: string, glow: string): React.CSSProperties => ({
  background: bg,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
  filter: glow,
})

const HeroContent = memo(function HeroContent({ els }: { els: Els }) {
  return (
    <div
      ref={(el) => {
        els.content = el
      }}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        // starts at the bottom edge of the (shifted) center circle and runs to the bottom of the hero
        top: `calc(${(0.5 - STAGE_SHIFT) * 100}% + ${CENTER_SIZE / 2}px)`,
        bottom: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "center",
        padding: "clamp(4px, 1vh, 12px) 20px 0",
        fontFamily: "var(--font-montserrat, inherit)", // picks up Montserrat automatically if you load it with that variable
        willChange: "opacity, transform",
        pointerEvents: "none",
      }}
    >
      {/* headline */}
      <div style={{ position: "relative" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(26px, min(2.8vw, 5.8vh), 56px)",
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
          }}
        >
          <span
            style={{
              display: "block",
              ...gradText(
                "linear-gradient(180deg, #ffffff 0%, #e6ecf7 40%, #8fa0bd 100%)",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(180,200,235,0.25))"
              ),
            }}
          >
            Web Solutions That
          </span>
          <span
            style={{
              display: "block",
              fontStyle: "italic",
              ...gradText(
                "linear-gradient(180deg, #5cc3ff 0%, #1a8cff 45%, #006bff 100%)",
                "drop-shadow(0 0 8px rgba(0,143,255,0.85)) drop-shadow(0 0 22px rgba(0,107,255,0.55))"
              ),
            }}
          >
            Grow Your Business.
          </span>
        </h1>
        {/* thin illuminated underline */}
        <svg
          viewBox="0 0 400 20"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            left: "40%",
            bottom: -14,
            width: "48%",
            height: 14,
            filter: "drop-shadow(0 0 3px rgba(0,200,255,0.9)) drop-shadow(0 0 8px rgba(0,143,255,0.7))",
          }}
        >
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

      {/* services pill */}
      <div className="hero-services">
        {SERVICES.map((sv) => (
          <div key={sv.label} className="hero-services-item">
            {sv.icon}
            {sv.label}
          </div>
        ))}
      </div>

      {/* buttons */}
      <div
        ref={(el) => {
          els.ctaRow = el
        }}
        className="hero-cta-row"
        style={{ pointerEvents: "auto" }}
      >
        <a href="#contact" className="hero-btn hero-btn-primary">
          Get a Quote
          <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
        <a href="#work" className="hero-btn hero-btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
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
}: {
  images?: string[]
  centerImage?: string
  centerVideo?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const controlsRef = useRef<any>(null)
  const virtual = useRef(0) // wheel/touch driven "scroll" position, 0..TOTAL_SCROLL
  const expanded = useRef(false) // true once fully zoomed -> page scrolls normally
  const touchStartY = useRef(0)
  const stage = useRef(STAGE_SHIFT) // smoothed stage shift (fraction of hero height)
  const visibleRef = useRef(true)
  const [els] = useState(createEls)

  // React state only for things that change rarely (never per scroll tick)
  const [visible, setVisible] = useState(true)
  const [covered, setCovered] = useState(false) // true when the full-screen video hides the 3D scene
  const [reduced, setReduced] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const section = ref.current
    if (!section) return

    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    setCount(window.matchMedia("(max-width: 768px)").matches ? 500 : 1500)

    const layout = { scale: 1, vw: 1920, vh: 1080, heroH: 1080 }
    const last = { shift: NaN, v: NaN, zoom: NaN, open: NaN, fade: NaN, covered: false }
    let layoutDirty = true
    let measureDirty = true
    let raf = 0
    let lastT = 0

    // ---- reads (only on resize, once per frame) ----
    const measure = () => {
      layout.scale = Math.min(1, window.innerWidth / 700)
      layout.vw = window.innerWidth
      layout.vh = window.innerHeight
      layout.heroH = section.clientHeight || window.innerHeight
      layoutDirty = true
      if (els.content) {
        els.content.style.top = `calc(${(0.5 - STAGE_SHIFT) * 100}% + ${(CENTER_SIZE / 2) * layout.scale}px)`
      }
    }

    // ---- writes (styles only, no layout reads) ----
    const apply = () => {
      const { scale, vw, vh, heroH } = layout
      const v = virtual.current
      const shift = stage.current

      if (shift !== last.shift || layoutDirty) {
        last.shift = shift
        if (els.centerRoot) els.centerRoot.style.transform = `translateY(${-shift * vh}px)`
        if (els.content) els.content.style.transform = `translate3d(0, ${(STAGE_SHIFT - shift) * heroH}px, 0)`
      }

      if (v !== last.v || layoutDirty) {
        last.v = v
        const open = Math.min(v / SCROLL_DISTANCE, 1)
        // 0 -> 1 during the zoom phase (after the circle has fully opened and the hold phase is over)
        const zoom = Math.min(Math.max((v - SCROLL_DISTANCE - HOLD_DISTANCE) / ZOOM_DISTANCE, 0), 1)
        // rings, small images and text fade out as the zoom starts
        const fade = 1 - Math.min(zoom * 3, 1)

        if (zoom !== last.zoom || layoutDirty) {
          last.zoom = zoom
          // the circle morphs into a full-screen landscape rectangle (size + corner radius, no scaling)
          const ease = zoom * zoom * (3 - 2 * zoom)
          const curW = CENTER_SIZE + (vw / scale + 4 - CENTER_SIZE) * ease
          const curH = CENTER_SIZE + (vh / scale + 4 - CENTER_SIZE) * ease
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
          if (els.emblemGlow) els.emblemGlow.style.opacity = String(fade)
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
        if (els.content) els.content.style.opacity = String(heroFade)
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

      // smooth the stage shift (frame-rate independent version of the old 0.12-per-frame ease)
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
      progress.current = Math.min(virtual.current / SCROLL_DISTANCE, 1)
      schedule()
    }

    const onWheel = (e: WheelEvent) => {
      if (expanded.current && e.deltaY < 0 && window.scrollY <= 5) {
        // scrolling back up at the top: play the animation in reverse
        setExpanded(false)
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
        setExpanded(false)
        if (e.cancelable) e.preventDefault()
      } else if (!expanded.current) {
        if (e.cancelable) e.preventDefault()
        update(virtual.current + deltaY * (deltaY < 0 ? 6 : 4))
        touchStartY.current = y
      }
    }

    const onTouchEnd = () => {
      touchStartY.current = 0
    }

    // The blocking (non-passive) wheel/touchmove listeners are only attached while they can actually
    // be needed: during the hero, or when the page is back at the top. Otherwise normal page
    // scrolling stays on the fast compositor path with no main-thread wait.
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

    const onResize = () => {
      measureDirty = true
      schedule()
    }

    // ---- visibility: pause 3D + video when the hero is off screen / tab hidden ----
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

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize, { passive: true })
    document.addEventListener("visibilitychange", syncVideo)
    syncBlocking()

    // initial layout + first paint of the DOM layer
    measureDirty = false
    measure()
    apply()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", syncVideo)
    }
  }, [els])

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
      {/* stops global CSS from painting opaque backgrounds over the hero + hero text/button styles */}
      <style>{HERO_CSS}</style>

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
        style={covered ? CANVAS_STYLE_COVERED : CANVAS_STYLE}
        frameloop={visible && !covered ? "always" : "never"}
        dpr={CANVAS_DPR}
        resize={CANVAS_RESIZE}
        camera={CANVAS_CAMERA}
        gl={CANVAS_GL}
        onCreated={onCanvasCreated}
      >
        <AdaptiveQuality />
        <StageOffset shift={stage} />

        {/* lights for the 3D tile edges */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[-10, 12, 10]} intensity={2.2} />
        <pointLight position={[0, 6, 0]} intensity={60} color="#3c6eff" />

        {count > 0 && (
          <SafeBoundary name="particles">
            <Suspense fallback={null}>
              <HeroParticles count={count} />
            </Suspense>
          </SafeBoundary>
        )}

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

      <HeroCenter els={els} centerImage={centerImage} centerVideo={centerVideo} />
      <HeroContent els={els} />
    </section>
  )
}