"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react"

/* ------------------------------------------------------------------ */
/*  DATA: replace with your real client reviews                        */
/*  fx/fy = final position on desktop, mx/my = on mobile               */
/*  (fractions of the stage width / height, measured from the center)  */
/* ------------------------------------------------------------------ */
type Review = {
	id: number
	name: string
	role: string
	text: string
	rating: number
	fx: number
	fy: number
	mx: number
	my: number
	tilt: number
}

const REVIEWS: Review[] = [
	{
		id: 0,
		name: "Aarav Mehta",
		role: "Founder, Mehta Digital",
		text: "ShivayTech delivered our website ahead of schedule and the quality blew us away. Highly recommended!",
		rating: 5,
		fx: -0.31, fy: -0.27, mx: -0.16, my: -0.36, tilt: -4,
	},
	{
		id: 1,
		name: "Emily Carter",
		role: "CEO, Brightpath Studio",
		text: "Professional team, clean design and great communication from start to finish.",
		rating: 5,
		fx: 0.31, fy: -0.29, mx: 0.16, my: -0.22, tilt: 3,
	},
	{
		id: 2,
		name: "Priya Sharma",
		role: "Marketing Head",
		text: "Our traffic and leads went up after the redesign. The attention to detail is unreal.",
		rating: 5,
		fx: -0.36, fy: 0.06, mx: -0.16, my: -0.08, tilt: 5,
	},
	{
		id: 3,
		name: "Rohan Verma",
		role: "Store Owner",
		text: "Fast, reliable and creative. They understood our idea and made it even better.",
		rating: 4,
		fx: 0.36, fy: 0.08, mx: 0.16, my: 0.06, tilt: -3,
	},
	{
		id: 4,
		name: "Liam Tremblay",
		role: "Startup Founder",
		text: "From design to launch, everything was smooth. Support after delivery was excellent too.",
		rating: 5,
		fx: -0.21, fy: 0.34, mx: -0.16, my: 0.2, tilt: -2,
	},
	{
		id: 5,
		name: "Ananya Iyer",
		role: "Business Owner",
		text: "Best decision we made for our brand. Great value and outstanding results.",
		rating: 5,
		fx: 0.21, fy: 0.35, mx: 0.16, my: 0.34, tilt: 4,
	},
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
type Pt = [number, number]

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** per-card spill progress (staggered) */
const cardEase = (index: number, p: number) => easeOutCubic(clamp((p - (0.04 + index * 0.09)) / 0.3))

const pointInPoly = (x: number, y: number, poly: Pt[]) => {
	let inside = false
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i]
		const [xj, yj] = poly[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
	}
	return inside
}

/* ------------------------------------------------------------------ */
/*  Sound: synthesised with the Web Audio API (no audio files)         */
/*  - a low cosmic hum while a review hovers over the galaxy           */
/*  - "warp whoosh + bloop + sub thump + chime" when one is swallowed  */
/* ------------------------------------------------------------------ */
function createGalaxySound() {
	let ctx: AudioContext | null = null
	let master: GainNode | null = null
	let reverb: ConvolverNode | null = null
	let noise: AudioBuffer | null = null
	let muted = false
	let hover: { stop: () => void } | null = null

	/** must first be called from a user gesture (pointerdown) */
	const ensure = () => {
		if (!ctx) {
			const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
			if (!AC) return null
			ctx = new AC()

			const comp = ctx.createDynamicsCompressor()
			master = ctx.createGain()
			master.gain.value = 0.85
			master.connect(comp)
			comp.connect(ctx.destination)

			// light synthetic reverb tail (short + mono = cheap to build, no hitch on first grab)
			const len = Math.floor(ctx.sampleRate * 0.8)
			const imp = ctx.createBuffer(1, len, ctx.sampleRate)
			const d = imp.getChannelData(0)
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
			reverb = ctx.createConvolver()
			reverb.buffer = imp
			const wet = ctx.createGain()
			wet.gain.value = 0.4
			reverb.connect(wet)
			wet.connect(master)

			noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate)
			const nd = noise.getChannelData(0)
			for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
		}
		if (ctx.state === "suspended") void ctx.resume()
		return ctx
	}

	const stopHover = () => {
		hover?.stop()
		hover = null
	}

	return {
		unlock: ensure,
		stopHover,

		setMuted(m: boolean) {
			muted = m
			if (m) stopHover()
		},

		startHover() {
			const c = ensure()
			const m = master
			if (!c || !m || muted || hover) return
			const t = c.currentTime

			const g = c.createGain()
			g.gain.setValueAtTime(0.0001, t)
			g.gain.exponentialRampToValueAtTime(0.07, t + 0.3)

			const lp = c.createBiquadFilter()
			lp.type = "lowpass"
			lp.frequency.value = 420

			const o1 = c.createOscillator()
			o1.type = "sine"
			o1.frequency.setValueAtTime(48, t)
			o1.frequency.linearRampToValueAtTime(74, t + 2.5)
			const o2 = c.createOscillator()
			o2.type = "triangle"
			o2.frequency.setValueAtTime(96.5, t)
			o2.frequency.linearRampToValueAtTime(148, t + 2.5)

			o1.connect(lp)
			o2.connect(lp)
			lp.connect(g)
			g.connect(m)
			o1.start(t)
			o2.start(t)

			hover = {
				stop() {
					const n = c.currentTime
					g.gain.cancelScheduledValues(n)
					g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), n)
					g.gain.exponentialRampToValueAtTime(0.0001, n + 0.2)
					o1.stop(n + 0.25)
					o2.stop(n + 0.25)
				},
			}
		},

		swallow() {
			const c = ensure()
			const m = master
			const rv = reverb
			const nb = noise
			if (!c || !m || !rv || !nb || muted) return
			stopHover()
			const t = c.currentTime + 0.01

			const out = c.createGain()
			out.gain.value = 0.9
			out.connect(m)
			out.connect(rv)

			const tone = (type: OscillatorType, f0: number, f1: number, st: number, dur: number, peak: number) => {
				const o = c.createOscillator()
				o.type = type
				o.frequency.setValueAtTime(f0, st)
				if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, st + dur)
				const g = c.createGain()
				g.gain.setValueAtTime(0.0001, st)
				g.gain.exponentialRampToValueAtTime(peak, st + 0.008)
				g.gain.exponentialRampToValueAtTime(0.0001, st + dur)
				o.connect(g)
				g.connect(out)
				o.start(st)
				o.stop(st + dur + 0.02)
			}

			/* 1. airy warp whoosh */
			const n = c.createBufferSource()
			n.buffer = nb
			const bp = c.createBiquadFilter()
			bp.type = "bandpass"
			bp.Q.value = 2
			bp.frequency.setValueAtTime(5200, t)
			bp.frequency.exponentialRampToValueAtTime(420, t + 0.22)
			const ng = c.createGain()
			ng.gain.setValueAtTime(0.0001, t)
			ng.gain.exponentialRampToValueAtTime(0.2, t + 0.03)
			ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
			n.connect(bp)
			bp.connect(ng)
			ng.connect(out)
			n.start(t)
			n.stop(t + 0.3)

			/* 2. glassy "bloop" sucking in */
			tone("sine", 1500, 240, t, 0.17, 0.32)

			/* 3. tight sub thump */
			tone("sine", 100, 40, t + 0.13, 0.4, 0.65)

			/* 4. bright pentatonic chime (edit these notes to change the vibe) */
			;[659.25, 783.99, 987.77, 1318.51].forEach((f, i) => {
				const st = t + 0.16 + i * 0.065
				tone("triangle", f, f, st, 0.55, 0.1)
				tone("sine", f * 2, f * 2, st, 0.35, 0.035)
			})
		},

		dispose() {
			stopHover()
			if (ctx) void ctx.close()
			ctx = master = reverb = noise = null
		},
	}
}

/* ------------------------------------------------------------------ */
/*  Tiny 4x4 matrix toolkit (column-major, no dependencies)            */
/* ------------------------------------------------------------------ */
type Mat = Float32Array

const ident = (): Mat => {
	const o = new Float32Array(16)
	o[0] = o[5] = o[10] = o[15] = 1
	return o
}
const mul = (a: Mat, b: Mat): Mat => {
	const o = new Float32Array(16)
	for (let c = 0; c < 4; c++)
		for (let r = 0; r < 4; r++) {
			let s = 0
			for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
			o[c * 4 + r] = s
		}
	return o
}
const persp = (fov: number, aspect: number, n: number, f: number): Mat => {
	const t = 1 / Math.tan(fov / 2)
	const o = new Float32Array(16)
	o[0] = t / aspect
	o[5] = t
	o[10] = (f + n) / (n - f)
	o[11] = -1
	o[14] = (2 * f * n) / (n - f)
	return o
}
const rotX = (a: number): Mat => {
	const o = ident()
	const c = Math.cos(a)
	const s = Math.sin(a)
	o[5] = c; o[6] = s; o[9] = -s; o[10] = c
	return o
}
const rotY = (a: number): Mat => {
	const o = ident()
	const c = Math.cos(a)
	const s = Math.sin(a)
	o[0] = c; o[2] = -s; o[8] = s; o[10] = c
	return o
}
const rotZ = (a: number): Mat => {
	const o = ident()
	const c = Math.cos(a)
	const s = Math.sin(a)
	o[0] = c; o[1] = s; o[4] = -s; o[5] = c
	return o
}
const trans = (x: number, y: number, z: number): Mat => {
	const o = ident()
	o[12] = x; o[13] = y; o[14] = z
	return o
}

/** world point -> CSS pixel position on the canvas */
const project = (m: Mat, x: number, y: number, z: number, w: number, h: number): Pt => {
	const cx = m[0] * x + m[4] * y + m[8] * z + m[12]
	const cy = m[1] * x + m[5] * y + m[9] * z + m[13]
	const cw = m[3] * x + m[7] * y + m[11] * z + m[15]
	return [((cx / cw) * 0.5 + 0.5) * w, (1 - ((cy / cw) * 0.5 + 0.5)) * h]
}

/** hit area of the galaxy on screen (the "dustbin" drop test + glow ring), computed on demand */
const galaxyPoly = (m: Mat, w: number, h: number): Pt[] => {
	const poly: Pt[] = []
	for (let i = 0; i < 32; i++) {
		const a = (i / 32) * Math.PI * 2
		poly.push(project(m, Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86, w, h))
	}
	return poly
}

type HitInfo = { mvp: Mat | null; w: number; h: number }

/* ------------------------------------------------------------------ */
/*  Galaxy: a real 3D particle galaxy rendered with raw WebGL          */
/*  PERF build: no cloud / noise sprites, no spikes, no streak pass,   */
/*  8-bit bloom targets, small sprite cap, low particle counts.        */
/* ------------------------------------------------------------------ */
const VERT = `
precision highp float;
attribute float aR;
attribute float aTheta;
attribute float aY;
attribute float aSize;
attribute vec3  aColor;
attribute float aAlpha;
attribute float aSeed;

uniform mat4  uMVP;
uniform float uTime;
uniform float uSpin;
uniform float uDiff;
uniform float uWarp;
uniform float uJitter;
uniform float uTwinkle;
uniform float uTwSpeed;
uniform float uPx;
uniform float uMaxPt;
uniform float uBoost;
uniform float uReveal;
uniform float uRadial;

varying vec3  vColor;
varying float vAlpha;

void main() {
  float speed = 1.0;
  if (uDiff > 0.0) speed += uDiff * 2.2 * exp(-aR * 5.0);
  float ang = aTheta + uSpin * speed;

  vec3 p = vec3(cos(ang) * aR, aY, sin(ang) * aR);

  float wa = p.x * 0.825 + p.z * 0.565;
  p.y += uWarp * 0.1 * wa * aR;

  if (uJitter > 0.0) {
    p += uJitter * 0.012 * vec3(
      sin(uTime * 0.7 + aSeed * 91.0),
      0.5 * sin(uTime * 0.5 + aSeed * 57.0),
      cos(uTime * 0.6 + aSeed * 33.0)
    );
  }

  vec4 clip = uMVP * vec4(p, 1.0);
  gl_Position = clip;

  float tw = 1.0;
  if (uTwinkle > 0.0) {
    tw = 1.0 + uTwinkle * sin(uTime * uTwSpeed * (1.5 + aSeed * 4.0) + aSeed * 60.0);
  }

  float size = aSize * (1.0 + uBoost * 0.12);
  float raw = size * uPx / clip.w;
  gl_PointSize = clamp(raw, 1.0, uMaxPt);

  float rv = mix(clamp(uReveal * 2.0, 0.0, 1.0), clamp((uReveal * 1.45 - aR) * 3.5, 0.0, 1.0), uRadial);

  vColor = aColor;
  vAlpha = rv * aAlpha * tw * (1.0 + uBoost * 0.55) * min(1.0, raw);
}
`

const FRAG = `
precision mediump float;
varying vec3  vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float f = exp(-d * 3.0) * (1.0 - smoothstep(0.45, 1.0, d));
  gl_FragColor = vec4(vColor * f * vAlpha, f * vAlpha);
}
`

const UNIFORMS = [
	"uMVP", "uTime", "uSpin", "uDiff", "uWarp", "uJitter", "uTwinkle", "uTwSpeed",
	"uPx", "uMaxPt", "uBoost", "uReveal", "uRadial",
] as const

type StarSet = {
	buf: WebGLBuffer
	count: number
	spin: number
	diff: number
	warp: number
	jitter: number
	twinkle: number
	twSpeed: number
	radial: number
}

/* --- galaxy generation helpers --- */
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73
const expR = (h: number) => -h * Math.log(1 - Math.random() * (1 - Math.exp(-1 / h)))

/** spiral arm centre-line: 4 arms, slightly irregular, starting at the bar ends */
const armTheta = (k: number, r: number) =>
	0.5 + k * (Math.PI / 2) + 2.7 * Math.log(1 + r * 9) + 0.11 * Math.sin(r * 13 + k * 1.7)

/** two strong arms (0 & 2) and two weaker ones (1 & 3), like the Milky Way */
const pickArm = () => (Math.random() < 0.62 ? (Math.random() < 0.5 ? 0 : 2) : Math.random() < 0.5 ? 1 : 3)

/** star clusters along the arms: makes the arms knotty & organic */
type Clump = { r: number; th: number; s: number }
const makeClumps = (n: number): Clump[] =>
	Array.from({ length: n }, () => {
		const r = clamp(expR(0.4), 0.06, 0.98)
		return { r, th: armTheta(pickArm(), r) + gauss() * 0.04, s: rand(0.012, 0.045) * (0.6 + r) }
	})
const inClump = (c: Clump): Pt => {
	const r = clamp(c.r + gauss() * c.s, 0.01, 1)
	return [r, c.th + (gauss() * c.s) / Math.max(r, 0.12)]
}

const mix = (a: number[], b: number[], t: number) => {
	const k = clamp(t)
	return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}
const WARM = [1, 0.8, 0.55]
const CREAM = [1, 0.93, 0.82]
const BLUEW = [0.78, 0.86, 1]
const BLUE = [0.55, 0.7, 1]
const CYAN = [0.5, 0.85, 1]

/** real star colours: old warm core, young blue arms, a few giants */
const starColor = (r: number) => {
	const roll = Math.random()
	if (roll < 0.07) return [1, 0.62, 0.4]
	if (roll < 0.14) return [0.65, 0.78, 1]
	if (r < 0.18) return mix(WARM, CREAM, Math.random())
	if (r < 0.5) return mix(CREAM, BLUEW, (r - 0.18) / 0.32 + (Math.random() - 0.5) * 0.4)
	return mix(BLUEW, Math.random() < 0.25 ? CYAN : BLUE, Math.random())
}

/** soft gas colours: violet -> blue -> cyan */
const hazeColor = (r: number) => {
	if (r < 0.3) return mix([0.95, 0.5, 0.85], [0.55, 0.35, 1], r / 0.3)
	if (r < 0.65) return mix([0.55, 0.35, 1], [0.2, 0.4, 1], (r - 0.3) / 0.35)
	return mix([0.2, 0.4, 1], [0.1, 0.7, 1], (r - 0.65) / 0.35)
}

/** growable typed-array point list */
class Pts {
	d: Float32Array
	n = 0
	constructor(cap = 1024) {
		this.d = new Float32Array(cap * 9)
	}
	add(r: number, th: number, y: number, size: number, c: number[], a: number) {
		if (this.n + 9 > this.d.length) {
			const nd = new Float32Array(this.d.length * 2)
			nd.set(this.d)
			this.d = nd
		}
		const d = this.d
		const n = this.n
		d[n] = r
		d[n + 1] = th
		d[n + 2] = y
		d[n + 3] = size
		d[n + 4] = c[0]
		d[n + 5] = c[1]
		d[n + 6] = c[2]
		d[n + 7] = a
		d[n + 8] = Math.random()
		this.n = n + 9
	}
	get count() {
		return this.n / 9
	}
	get data() {
		return this.d.subarray(0, this.n)
	}
}

/** k = particle density. calm = no per-vertex twinkle / jitter (weak devices).
 *  Returns small build steps; the render loop runs a few ms of them per frame
 *  so generating particles never freezes the page. */
function buildSteps(gl: WebGLRenderingContext, k: number, sets: StarSet[], calm: boolean): (() => void)[] {
	const steps: (() => void)[] = []
	const clumps = makeClumps(220)
	const clump = () => inClump(clumps[(Math.random() * clumps.length) | 0])

	const finish = (pts: Pts, o: Partial<Omit<StarSet, "buf" | "count">>) => {
		const buf = gl.createBuffer()
		if (!buf) return // context lost mid-build: skip quietly
		gl.bindBuffer(gl.ARRAY_BUFFER, buf)
		gl.bufferData(gl.ARRAY_BUFFER, pts.data, gl.STATIC_DRAW)
		sets.push({
			buf,
			count: pts.count,
			spin: 1,
			diff: 0.2,
			warp: 1,
			jitter: 0,
			twinkle: 0,
			twSpeed: 1,
			radial: 1,
			...o,
		})
	}

	/* 1. far background stars (spin 0 -> only camera parallax moves them) */
	steps.push(() => {
		const n = Math.floor(1500 * Math.max(k, 0.3))
		const p = new Pts(n + 8)
		for (let i = 0; i < n; i++) {
			const rr = rand(3.5, 9)
			const phi = Math.acos(rand(-1, 1))
			const th = Math.random() * Math.PI * 2
			const tint = Math.random()
			const col = tint < 0.65 ? [0.8, 0.88, 1] : tint < 0.85 ? [1, 0.9, 0.78] : [0.85, 0.8, 1]
			const a = 0.12 + Math.pow(Math.random(), 3) * 0.85
			p.add(rr * Math.sin(phi), th, rr * Math.cos(phi), rand(0.01, 0.026) * (rr / 4), col, a)
		}
		finish(p, { spin: 0, diff: 0, warp: 0, twinkle: calm ? 0 : 0.35, radial: 0 })
	})

	/* 2. faint halo of old stars around the galaxy */
	steps.push(() => {
		const n = Math.floor(1500 * Math.max(k, 0.3))
		const p = new Pts(n + 8)
		for (let i = 0; i < n; i++) {
			const rr = rand(0.12, 1.5) * (0.5 + 0.5 * Math.random())
			const phi = Math.acos(rand(-1, 1))
			const th = Math.random() * Math.PI * 2
			p.add(rr * Math.sin(phi), th, rr * Math.cos(phi) * 0.75, rand(0.0025, 0.006), mix(WARM, CREAM, Math.random()), rand(0.15, 0.5))
		}
		finish(p, { spin: 0.2, diff: 0 , warp: 0, twinkle: calm ? 0 : 0.2 })
	})

	/* 3. glowing gas (few, soft, mid-size sprites: the main overdraw cost, so kept small) */
	steps.push(() => {
		const n = Math.floor(1400 * Math.max(k, 0.3))
		const p = new Pts(n + 8)
		for (let i = 0; i < n; i++) {
			let r: number
			let th: number
			if (Math.random() < 0.4) {
				;[r, th] = clump()
			} else {
				r = clamp(expR(0.38), 0.03, 1)
				th = armTheta(pickArm(), r) + gauss() * (0.12 + 0.2 * r)
			}
			const a = rand(0.022, 0.05) * (1 - r * 0.5) * (0.35 + 0.65 * Math.min(1, r * 3))
			p.add(r, th, gauss() * 0.02, rand(0.06, 0.16) * (0.6 + 0.8 * r), hazeColor(r), a)
		}
		finish(p, { jitter: calm ? 0 : 0.5 })
	})

	/* 4. the main disc: tiny individual stars, built in 4 chunks so no single frame is blocked for long */
	{
		const discN = Math.floor(110000 * k)
		const disc = new Pts(discN + 8)
		const CH = 4
		for (let c = 0; c < CH; c++) {
			const from = Math.floor((discN * c) / CH)
			const to = Math.floor((discN * (c + 1)) / CH)
			steps.push(() => {
				for (let i = from; i < to; i++) {
					let r = 0
					let th = 0
					if (Math.random() < 0.22) {
						;[r, th] = clump()
					} else {
						r = clamp(expR(0.29), 0.01, 1)
						const onArm = Math.random() < 0.3 + 0.55 * r
						th = onArm ? armTheta(pickArm(), r) + gauss() * (0.1 + 0.2 * r) : Math.random() * Math.PI * 2
					}
					const thick = 0.012 + 0.03 * Math.exp(-r * 4)
					// fewer stars -> each one drawn a bit bigger so the galaxy still reads as full
					const size = (Math.random() < 0.012 ? rand(0.007, 0.011) : rand(0.0022, 0.0048)) * (k < 1 ? 1.15 : 1)
					const a = rand(0.25, 0.8) * (0.4 + 0.6 * Math.min(1, r * 2.2)) * 0.8
					disc.add(r, th, gauss() * thick, size, starColor(r), Math.min(a, 1))
				}
				if (c === CH - 1) finish(disc, { jitter: 0, twinkle: calm ? 0 : 0.12 })
			})
		}
	}

	/* 5. pink star-forming knots */
	steps.push(() => {
		const n = Math.floor(230 * Math.max(k, 0.4))
		const p = new Pts(n * 2 + 8)
		for (let i = 0; i < n; i++) {
			const [r, th] = clump()
			const y = gauss() * 0.01
			p.add(r, th, y, rand(0.02, 0.05), Math.random() < 0.5 ? [1, 0.35, 0.7] : [1, 0.5, 0.8], rand(0.18, 0.4))
			p.add(r, th, y, 0.007, [1, 0.85, 0.95], 0.8)
		}
		finish(p, { twinkle: calm ? 0 : 0.15, twSpeed: 0.5 })
	})

	/* 6. young blue giants */
	steps.push(() => {
		const n = Math.floor(700 * Math.max(k, 0.4))
		const p = new Pts(n + 8)
		for (let i = 0; i < n; i++) {
			const [r, th] = clump()
			p.add(r, th, gauss() * 0.012, rand(0.009, 0.02), mix([0.7, 0.85, 1], [1, 1, 1], Math.random() * 0.6), rand(0.35, 0.9))
		}
		finish(p, { twinkle: calm ? 0 : 0.3, twSpeed: 0.8 })
	})

	/* 7. dense warm bulge + a subtle central bar */
	steps.push(() => {
		const n = Math.floor(11000 * Math.max(k, 0.25))
		const bar = Math.floor(2400 * Math.max(k, 0.25))
		const p = new Pts(n + bar + 8)
		for (let i = 0; i < n; i++) {
			p.add(Math.abs(gauss()) * 0.085, Math.random() * Math.PI * 2, gauss() * 0.035, rand(0.004, 0.009), mix(WARM, CREAM, Math.random()), rand(0.1, 0.28))
		}
		for (let i = 0; i < bar; i++) {
			const along = gauss() * 0.11
			const across = gauss() * 0.035
			const x = along * Math.cos(0.5) - across * Math.sin(0.5)
			const z = along * Math.sin(0.5) + across * Math.cos(0.5)
			p.add(Math.hypot(x, z), Math.atan2(z, x), gauss() * 0.02, rand(0.004, 0.008), mix(WARM, CREAM, 0.5), rand(0.08, 0.2))
		}
		finish(p, { twinkle: calm ? 0 : 0.1 })
	})

	/* 8. glow of the galactic core */
	steps.push(() => {
		const p = new Pts(8)
		p.add(0, 0, 0, 0.6, [0.95, 0.5, 0.8], 0.03)
		p.add(0, 0, 0, 0.34, [1, 0.72, 0.55], 0.05)
		p.add(0, 0, 0, 0.16, [1, 0.8, 0.6], 0.1)
		p.add(0, 0, 0, 0.06, [1, 0.92, 0.8], 0.22)
		finish(p, { spin: 0, diff: 0, warp: 0, twinkle: 0, twSpeed: 0.18 })
	})

	return steps
}

/* ------------------------------------------------------------------ */
/*  Light post-processing: bloom + filmic tone-map + vignette          */
/*  (skipped entirely on the ultra-light tier)                         */
/* ------------------------------------------------------------------ */
const QUAD_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

/* bright-pass + 2x downsample (thresh < 0 = plain downsample) */
const BRIGHT_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThresh;
uniform float uKnee;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-0.75, -0.75)).rgb
         + texture2D(uTex, vUv + uTexel * vec2( 0.75, -0.75)).rgb
         + texture2D(uTex, vUv + uTexel * vec2(-0.75,  0.75)).rgb
         + texture2D(uTex, vUv + uTexel * vec2( 0.75,  0.75)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = uThresh < 0.0 ? 1.0 : smoothstep(uThresh, uThresh + uKnee, l);
  gl_FragColor = vec4(c * k, 1.0);
}
`

/* 5-tap blur using linear filtering (cheaper than the old 9-tap) */
const BLUR_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.2270270;
  c += (texture2D(uTex, vUv + uDir * 1.3846).rgb + texture2D(uTex, vUv - uDir * 1.3846).rgb) * 0.3162162;
  c += (texture2D(uTex, vUv + uDir * 3.2308).rgb + texture2D(uTex, vUv - uDir * 3.2308).rgb) * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}
`

const COMP_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom1;
uniform float uExpo;
uniform float uBloomAmt;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 d = vUv - 0.5;
  vec3 c = texture2D(uScene, vUv).rgb + texture2D(uBloom1, vUv).rgb * uBloomAmt;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.3); // keep the colour rich
  c = aces(c * uExpo);
  c *= 1.0 - smoothstep(0.18, 0.55, dot(d, d)) * 0.5;
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}
`

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }

function createTarget(gl: WebGLRenderingContext, w: number, h: number): Target | null {
	const tex = gl.createTexture()
	const fb = gl.createFramebuffer()
	if (!tex || !fb) return null
	gl.bindTexture(gl.TEXTURE_2D, tex)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
	const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	if (!ok) {
		gl.deleteTexture(tex)
		gl.deleteFramebuffer(fb)
		return null
	}
	return { tex, fb, w, h }
}

function destroyTarget(gl: WebGLRenderingContext, t: Target | null) {
	if (!t) return
	gl.deleteTexture(t.tex)
	gl.deleteFramebuffer(t.fb)
}

function makeProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string, attrs: string[]): WebGLProgram | null {
	if (gl.isContextLost()) {
		console.warn("[Galaxy] WebGL context is lost, skipping shader compile")
		return null
	}
	const sh = (type: number, src: string) => {
		const s = gl.createShader(type)
		if (!s) return null
		gl.shaderSource(s, src)
		gl.compileShader(s)
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			console.error(gl.isContextLost() ? "[Galaxy] context lost during shader compile" : gl.getShaderInfoLog(s))
			gl.deleteShader(s)
			return null
		}
		return s
	}
	const vs = sh(gl.VERTEX_SHADER, vsSrc)
	const fs = sh(gl.FRAGMENT_SHADER, fsSrc)
	if (!vs || !fs) {
		if (vs) gl.deleteShader(vs)
		if (fs) gl.deleteShader(fs)
		return null
	}
	const prog = gl.createProgram()
	if (!prog) {
		gl.deleteShader(vs)
		gl.deleteShader(fs)
		return null
	}
	gl.attachShader(prog, vs)
	gl.attachShader(prog, fs)
	attrs.forEach((n, i) => gl.bindAttribLocation(prog, i, n))
	gl.linkProgram(prog)
	gl.deleteShader(vs)
	gl.deleteShader(fs)
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.error(gl.isContextLost() ? "[Galaxy] context lost during program link" : gl.getProgramInfoLog(prog))
		gl.deleteProgram(prog)
		return null
	}
	return prog
}

/* ---- PERF SWITCHES ---- */
const POST = false // bloom/tone-map pass: the heaviest GPU cost. Set true only on strong GPUs.
const FRAME_MS = 30 // cap the galaxy at ~33fps: half the GPU work, scrolling/cards still run at full speed

type Shooter = { x: number; y: number; vx: number; vy: number; life: number; max: number }

const FILL = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" } as const
const GL_STYLE = { ...FILL, zIndex: 1 }
const RING_STYLE = { ...FILL, zIndex: 2 }

function Galaxy({
	progressRef,
	hotRef,
	flashRef,
	hitRef,
}: {
	progressRef: MutableRefObject<number>
	hotRef: MutableRefObject<boolean>
	flashRef: MutableRefObject<number>
	hitRef: MutableRefObject<HitInfo>
}) {
	// The WebGL canvas is created INSIDE the effect (and removed in cleanup) so React Strict Mode
	// remounts never inherit a lost context.
	const hostRef = useRef<HTMLDivElement>(null)
	const ringRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const host = hostRef.current
		const ring = ringRef.current
		if (!host || !ring) return

		const canvas = document.createElement("canvas")
		canvas.setAttribute("aria-hidden", "true")
		canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none"
		host.appendChild(canvas)

		const bail = (gl?: WebGLRenderingContext | null) => {
			gl?.getExtension("WEBGL_lose_context")?.loseContext()
			canvas.remove()
		}

		/* ---- device tier ---- */
		const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
		const lite = innerWidth < 700
		const cores = nav.hardwareConcurrency || 4
		const mem = nav.deviceMemory || 4
		const ultra = !!nav.connection?.saveData || mem <= 2 || (lite && (cores <= 4 || mem <= 3))
		const weak = ultra || lite || cores <= 4 || mem <= 4
		const density = ultra ? 0.08 : weak ? 0.15 : 0.35
		const baseDpr = ultra ? 0.7 : weak ? 0.85 : Math.min(devicePixelRatio || 1, 1)
		let q = 1 // dynamic resolution multiplier: only ever goes down

		const gl = canvas.getContext("webgl", {
			alpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: true,
			powerPreference: weak ? "default" : "high-performance",
			failIfMajorPerformanceCaveat: true,
		}) as WebGLRenderingContext | null
		const rctx = ring.getContext("2d")
		if (!gl || !rctx) {
			bail(gl)
			return
		}

		/* ---- programs ---- */
		const starProg = makeProgram(gl, VERT, FRAG, ["aR", "aTheta", "aY", "aSize", "aColor", "aAlpha", "aSeed"])
		if (!starProg) {
			bail(gl)
			return
		}
		const brightProg = ultra || !POST ? null : makeProgram(gl, QUAD_VERT, BRIGHT_FRAG, ["aPos"])
		const blurProg = ultra || !POST ? null : makeProgram(gl, QUAD_VERT, BLUR_FRAG, ["aPos"])
		const compProg = ultra || !POST ? null : makeProgram(gl, QUAD_VERT, COMP_FRAG, ["aPos"])
		const hasPost = !!(brightProg && blurProg && compProg)

		const uloc = (p: WebGLProgram | null, names: string[]) => {
			const o: Record<string, WebGLUniformLocation | null> = {}
			if (p) names.forEach((n) => (o[n] = gl.getUniformLocation(p, n)))
			return o
		}

		gl.useProgram(starProg)
		const U = {} as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>
		UNIFORMS.forEach((n) => (U[n] = gl.getUniformLocation(starProg, n)))
		const maxPt = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null)?.[1] || 64
		// small sprite cap = the biggest overdraw saver
		gl.uniform1f(U.uMaxPt, Math.min(maxPt, weak ? 12 : 16))

		const BU = uloc(brightProg, ["uTex", "uTexel", "uThresh", "uKnee"])
		const LU = uloc(blurProg, ["uTex", "uDir"])
		const CU = uloc(compProg, ["uScene", "uBloom1", "uExpo", "uBloomAmt"])

		const quad = gl.createBuffer()
		if (!quad) {
			bail(gl)
			return
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, quad)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

		const setAttribs = (n: number) => {
			for (let i = 0; i < 7; i++) (i < n ? gl.enableVertexAttribArray : gl.disableVertexAttribArray).call(gl, i)
		}

		gl.disable(gl.DEPTH_TEST)
		gl.clearColor(0, 0, 0, 0)
		gl.blendFunc(gl.ONE, gl.ONE) // every set is additive: set once

		/* ---- particles are generated in small slices across frames ---- */
		const sets: StarSet[] = []
		const steps = buildSteps(gl, density, sets, weak)
		let stepIdx = 0
		let building = true

		/* ---- render targets for the bloom chain (8-bit, quarter/eighth res) ---- */
		let scene: Target | null = null
		let halfA: Target | null = null
		let halfB: Target | null = null
		let quarterA: Target | null = null
		let quarterB: Target | null = null
		let usePost = false

		const freeTargets = () => [scene, halfA, halfB, quarterA, quarterB].forEach((t) => destroyTarget(gl, t))

		const buildTargets = () => {
			freeTargets()
			scene = halfA = halfB = quarterA = quarterB = null
			if (!hasPost) {
				usePost = false // ultra tier: render straight to the screen
				return
			}
			const W = canvas.width
			const H = canvas.height
			scene = createTarget(gl, W, H)
			halfA = createTarget(gl, Math.max(1, W >> 1), Math.max(1, H >> 1))
			halfB = createTarget(gl, Math.max(1, W >> 1), Math.max(1, H >> 1))
			quarterA = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2))
			quarterB = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2))
			usePost = !!(scene && halfA && halfB && quarterA && quarterB)
		}

		/* ---- sizing ---- */
		let w = 0
		let h = 0
		let dpr = 1
		const resize = () => {
			const nw = canvas.clientWidth
			const nh = canvas.clientHeight
			const nd = baseDpr * q
			if (nw === w && nh === h && nd === dpr) return
			w = nw
			h = nh
			dpr = nd
			canvas.width = Math.max(1, Math.floor(w * dpr))
			canvas.height = Math.max(1, Math.floor(h * dpr))
			// 2D overlay stays at 1x CSS pixels: it only draws thin lines
			ring.width = Math.max(1, Math.floor(w))
			ring.height = Math.max(1, Math.floor(h))
			gl.viewport(0, 0, canvas.width, canvas.height)
			buildTargets()
		}
		resize()
		let resizeTimer = 0
		const onResize = () => {
			clearTimeout(resizeTimer)
			resizeTimer = window.setTimeout(resize, 150)
		}
		addEventListener("resize", onResize)

		/* ---- mouse parallax (mouse only) ---- */
		let mxT = 0
		let myT = 0
		let mx = 0
		let my = 0
		const onMouse = (e: PointerEvent) => {
			if (e.pointerType !== "mouse") return
			mxT = (e.clientX / innerWidth - 0.5) * 2
			myT = (e.clientY / innerHeight - 0.5) * 2
		}
		if (!weak) addEventListener("pointermove", onMouse, { passive: true })

		/* ---- visibility + intro ---- */
		const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
		const INTRO = reduced ? 0.01 : ultra ? 2 : 3.5
		let visible = false
		let introStart = -1
		let raf = 0
		let last = performance.now()
		let lost = false

		const start = () => {
			if (!raf && !lost) {
				last = performance.now()
				raf = requestAnimationFrame(frame)
			}
		}

		const onLost = (e: Event) => {
			e.preventDefault()
			lost = true
			cancelAnimationFrame(raf)
			raf = 0
		}
		canvas.addEventListener("webglcontextlost", onLost)

		const io = new IntersectionObserver(
			([e]) => {
				visible = e.isIntersecting
				if (visible) {
					if (e.intersectionRatio >= 0.2 && introStart < 0) introStart = performance.now()
					start()
				}
			},
			{ threshold: [0, 0.2] }
		)
		io.observe(canvas)

		/* ---- shooting stars (2D overlay) ---- */
		const shooters: Shooter[] = []
		let nextShoot = 6
		let ringDirty = false

		/* ---- animation loop ---- */
		const STRIDE = 36
		let t = 0
		let spinAcc = 0
		let glow = 0
		let slow = 0
		const fov = Math.PI / 4

		const pump = (budget: number) => {
			const t0 = performance.now()
			do steps[stepIdx++]()
			while (stepIdx < steps.length && performance.now() - t0 < budget)
			if (stepIdx >= steps.length) {
				building = false
				if (introStart >= 0) introStart = performance.now()
			}
		}

		const drawSet = (s: StarSet, boost: number) => {
			gl.bindBuffer(gl.ARRAY_BUFFER, s.buf)
			gl.vertexAttribPointer(0, 1, gl.FLOAT, false, STRIDE, 0)
			gl.vertexAttribPointer(1, 1, gl.FLOAT, false, STRIDE, 4)
			gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE, 8)
			gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE, 12)
			gl.vertexAttribPointer(4, 3, gl.FLOAT, false, STRIDE, 16)
			gl.vertexAttribPointer(5, 1, gl.FLOAT, false, STRIDE, 28)
			gl.vertexAttribPointer(6, 1, gl.FLOAT, false, STRIDE, 32)
			gl.uniform1f(U.uSpin, spinAcc * s.spin)
			gl.uniform1f(U.uDiff, s.diff)
			gl.uniform1f(U.uWarp, s.warp)
			gl.uniform1f(U.uJitter, s.jitter)
			gl.uniform1f(U.uTwinkle, s.twinkle)
			gl.uniform1f(U.uTwSpeed, s.twSpeed)
			gl.uniform1f(U.uRadial, s.radial)
			gl.uniform1f(U.uBoost, boost)
			gl.drawArrays(gl.POINTS, 0, s.count)
		}

		const bindTex = (unit: number, tex: WebGLTexture) => {
			gl.activeTexture(gl.TEXTURE0 + unit)
			gl.bindTexture(gl.TEXTURE_2D, tex)
		}
		const toTarget = (tg: Target | null, W: number, H: number) => {
			gl.bindFramebuffer(gl.FRAMEBUFFER, tg ? tg.fb : null)
			gl.viewport(0, 0, W, H)
		}
		const drawQuad = () => {
			gl.bindBuffer(gl.ARRAY_BUFFER, quad)
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
		}

		const frame = (now: number) => {
			raf = 0
			if (lost) return

			// generate the galaxy a few ms per frame (even while off-screen)
			if (building) pump(weak ? 4 : 6)

			if (!visible) {
				last = now
				slow = 0
				if (building) raf = requestAnimationFrame(frame)
				return // off-screen and finished: loop stops completely
			}
			raf = requestAnimationFrame(frame)

			const ms = now - last
			if (ms < FRAME_MS) return // steady ~33fps cap on every device = no judder, half the GPU load

			// slow frames in a row -> render fewer pixels (auto-adaptive resolution)
			if (ms < 120) {
				slow = ms > (weak ? 40 : 22) ? slow + 1 : 0
				if (slow >= (weak ? 8 : 12) && q > 0.75) {
					q = Math.max(0.75, q - 0.1)
					slow = 0
					resize()
				}
			}

			const dt = Math.min(ms / 1000, 0.05)
			last = now

			const p = progressRef.current
			const hot = hotRef.current
			const flash = flashRef.current
			flashRef.current = Math.max(0, flash - dt * 1.8)

			/* intro: 0 -> 1 */
			const it = introStart < 0 || building ? 0 : clamp((now - introStart) / 1000 / INTRO)
			const reveal = it * it * (3 - 2 * it)
			const intro = 1 - easeOutCubic(it)

			t += dt
			spinAcc += dt * (0.035 + p * 0.12 + (hot ? 0.25 : 0) + intro * 0.9)
			glow += ((hot ? 1 : 0) - glow) * Math.min(1, dt * 6)
			const boost = glow + flash

			mx += (mxT - mx) * Math.min(1, dt * 2.5)
			my += (myT - my) * Math.min(1, dt * 2.5)

			/* camera */
			const aspect = w / h
			const dist = ((1 / (2 * Math.tan(fov / 2))) * h) / (0.42 * Math.min(w, h)) * (1 - p * 0.07) * (1 - intro * 0.3)
			const pitch = 0.62 + 0.14 * p + my * 0.06 + intro * 0.5
			const yaw = Math.sin(t * 0.07) * 0.16 + mx * 0.14 + intro * 0.5
			const roll = -0.3 + Math.sin(t * 0.05) * 0.02

			const view = mul(trans(0, 0, -dist), mul(rotZ(roll), mul(rotX(pitch), rotY(yaw))))
			const mvp = mul(persp(fov, aspect, 0.05, 50), view)

			const hi = hitRef.current
			hi.mvp = mvp
			hi.w = w
			hi.h = h

			/* ---------- pass 1: the stars ---------- */
			const sc = scene as Target | null
			if (usePost && sc) toTarget(sc, sc.w, sc.h)
			else toTarget(null, canvas.width, canvas.height)
			gl.useProgram(starProg)
			setAttribs(7)
			gl.enable(gl.BLEND)
			gl.clear(gl.COLOR_BUFFER_BIT)
			gl.uniformMatrix4fv(U.uMVP, false, mvp)
			gl.uniform1f(U.uTime, t)
			gl.uniform1f(U.uReveal, reveal)
			gl.uniform1f(U.uPx, canvas.height / (2 * Math.tan(fov / 2)))
			for (const s of sets) drawSet(s, boost)

			/* ---------- bloom + grade ---------- */
			const hA = halfA as Target | null
			const hB = halfB as Target | null
			const qA = quarterA as Target | null
			const qB = quarterB as Target | null
			if (usePost && sc && hA && hB && qA && qB && brightProg && blurProg && compProg) {
				gl.disable(gl.BLEND)
				setAttribs(1)

				const bright = (src: Target, dst: Target, thresh: number, knee: number) => {
					toTarget(dst, dst.w, dst.h)
					gl.useProgram(brightProg)
					bindTex(0, src.tex)
					gl.uniform1i(BU.uTex, 0)
					gl.uniform2f(BU.uTexel, 1 / src.w, 1 / src.h)
					gl.uniform1f(BU.uThresh, thresh)
					gl.uniform1f(BU.uKnee, knee)
					drawQuad()
				}
				const blur = (src: Target, dst: Target, dx: number, dy: number) => {
					toTarget(dst, dst.w, dst.h)
					gl.useProgram(blurProg)
					bindTex(0, src.tex)
					gl.uniform1i(LU.uTex, 0)
					gl.uniform2f(LU.uDir, dx, dy)
					drawQuad()
				}

				// bright pass -> half res -> quarter res, then one separable blur at quarter res
				bright(sc, hA, 0.75, 0.6)
				bright(hA, qA, -1, 1)
				blur(qA, qB, 1.8 / qA.w, 0)
				blur(qB, qA, 0, 1.8 / qA.h)

				// final grade -> screen
				toTarget(null, canvas.width, canvas.height)
				gl.useProgram(compProg)
				bindTex(0, sc.tex)
				bindTex(1, qA.tex)
				gl.uniform1i(CU.uScene, 0)
				gl.uniform1i(CU.uBloom1, 1)
				gl.uniform1f(CU.uBloomAmt, 0.5 + boost * 0.5)
				gl.uniform1f(CU.uExpo, 0.95)
				drawQuad()
				gl.activeTexture(gl.TEXTURE0)
			}

			/* shooting stars spawn */
			if (false) {
				nextShoot -= dt
				if (nextShoot <= 0) {
					const ang = rand(0.25, 0.6)
					const sp = rand(900, 1500)
					const dir = Math.random() < 0.5 ? 1 : -1
					shooters.push({
						x: rand(w * 0.1, w * 0.9),
						y: rand(h * 0.04, h * 0.45),
						vx: Math.cos(ang) * sp * dir,
						vy: Math.sin(ang) * sp,
						life: 0,
						max: rand(0.6, 1.0),
					})
					nextShoot = rand(3.5, 8)
				}
			}

			/* 2D overlay: drop-zone ring + ripple + shooting stars (no shadowBlur anywhere).
			   Only touched when there is something to draw (or to erase). */
			const wantPoly = glow > 0.02 || flash > 0.01
			const anyOverlay = shooters.length > 0 || wantPoly
			if (anyOverlay || ringDirty) {
				rctx.clearRect(0, 0, w, h)

				for (let i = shooters.length - 1; i >= 0; i--) {
					const s = shooters[i]
					s.life += dt
					s.x += s.vx * dt
					s.y += s.vy * dt
					const k = s.life / s.max
					if (k >= 1) {
						shooters.splice(i, 1)
						continue
					}
					const a = Math.sin(k * Math.PI)
					const g = rctx.createLinearGradient(s.x - s.vx * 0.14, s.y - s.vy * 0.14, s.x, s.y)
					g.addColorStop(0, "rgba(160,200,255,0)")
					g.addColorStop(1, `rgba(235,245,255,${(0.9 * a).toFixed(3)})`)
					rctx.strokeStyle = g
					rctx.lineWidth = 1.6
					rctx.lineCap = "round"
					rctx.beginPath()
					rctx.moveTo(s.x - s.vx * 0.14, s.y - s.vy * 0.14)
					rctx.lineTo(s.x, s.y)
					rctx.stroke()
				}

				if (wantPoly) {
					const poly = galaxyPoly(mvp, w, h)

					if (glow > 0.02) {
						rctx.beginPath()
						poly.forEach(([x, y], i) => (i ? rctx.lineTo(x, y) : rctx.moveTo(x, y)))
						rctx.closePath()
						rctx.fillStyle = `rgba(59,130,246,${0.07 * glow})`
						rctx.fill()
						rctx.strokeStyle = `rgba(110,180,255,${0.35 + 0.6 * glow})`
						rctx.lineWidth = 2 + glow * 2
						rctx.stroke()
					}
					if (flash > 0.01) {
						const [cx, cy] = project(mvp, 0, 0, 0, w, h)
						const s = 0.3 + (1 - flash) * 1.0
						rctx.beginPath()
						poly.forEach(([x, y], i) => {
							const px = cx + (x - cx) * s
							const py = cy + (y - cy) * s
							if (i) rctx.lineTo(px, py)
							else rctx.moveTo(px, py)
						})
						rctx.closePath()
						rctx.strokeStyle = `rgba(130,195,255,${(flash * 0.75).toFixed(3)})`
						rctx.lineWidth = 2 + flash * 5
						rctx.stroke()
					}
				}
			}
			ringDirty = anyOverlay
		}
		start()

		return () => {
			cancelAnimationFrame(raf)
			raf = 0
			lost = true
			clearTimeout(resizeTimer)
			io.disconnect()
			canvas.removeEventListener("webglcontextlost", onLost)
			removeEventListener("resize", onResize)
			removeEventListener("pointermove", onMouse)
			sets.forEach((s) => gl.deleteBuffer(s.buf))
			freeTargets()
			gl.deleteBuffer(quad)
			gl.deleteProgram(starProg)
			if (brightProg) gl.deleteProgram(brightProg)
			if (blurProg) gl.deleteProgram(blurProg)
			if (compProg) gl.deleteProgram(compProg)
			gl.getExtension("WEBGL_lose_context")?.loseContext()
			canvas.remove()
		}
	}, [progressRef, hotRef, flashRef, hitRef])

	return (
		<>
			<div ref={hostRef} aria-hidden="true" style={GL_STYLE} />
			<canvas ref={ringRef} aria-hidden="true" style={RING_STYLE} />
		</>
	)
}

/** memoised so UI state updates never re-render the galaxy layer */
const GalaxyLayer = memo(Galaxy)

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/*                                                                     */
/*  PERF: card positions, scroll progress and drag offsets live in     */
/*  refs and are written straight to the DOM (transform / opacity).    */
/*  React state is only used for things that really change the markup  */
/*  (hint text, mute icon, compact layout), so scrolling and dragging  */
/*  never re-render the whole component every frame.                   */
/* ------------------------------------------------------------------ */
// one light, cheap shadow for every device (no inset layer, small blur)
const SHADOW_IDLE = "0 0 10px rgba(37,99,235,0.5)"
const SHADOW_DRAG = "0 0 18px rgba(59,130,246,0.9)"
// no transform transition: transform is rewritten on every scroll tick, a transition would make every card chase it
const CARD_TRANSITION = "none"

const CSS = `
.st-sec{position:relative;height:320vh;height:320svh;background:#000;overflow-x:clip}
.st-stage{position:sticky;top:0;width:100%;height:100vh;height:100svh;overflow:hidden;contain:layout paint;
  -webkit-tap-highlight-color:transparent;
  background:radial-gradient(ellipse 60% 45% at 25% 22%,rgba(88,40,160,.2),transparent 70%),
  radial-gradient(ellipse 55% 40% at 78% 74%,rgba(20,70,200,.2),transparent 70%),
  radial-gradient(ellipse at center,#050b24 0%,#02040f 55%,#000 100%)}
.st-card{position:absolute;left:50%;top:50%;translate:-50% -50%;opacity:0;pointer-events:none;cursor:grab;touch-action:none;
  user-select:none;-webkit-user-select:none;border-radius:18px;background:rgba(4,10,32,.9);
  border:1px solid rgba(59,130,246,.75);color:#e6efff;will-change:transform,opacity;box-sizing:border-box;
  backface-visibility:hidden}
.st-btn{position:absolute;z-index:60;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
  cursor:pointer;color:#93b4ff;background:rgba(4,10,32,.85);border:1px solid rgba(59,130,246,.6);padding:0}
.st-btn:focus-visible{outline:2px solid #93b4ff;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.st-card{transition:none!important}}
`

type DragState = { id: number; sx: number; sy: number; ox: number; oy: number; cx: number; cy: number }

export default function Testimonials() {
	const sectionRef = useRef<HTMLElement>(null)
	const stageRef = useRef<HTMLDivElement>(null)
	const headingRef = useRef<HTMLDivElement>(null)
	const cardEls = useRef<(HTMLDivElement | null)[]>([])
	const lastTransform = useRef<string[]>([])
	const lastMeta = useRef<string[]>([])

	const progressRef = useRef(0)
	const hotRef = useRef(false)
	const flashRef = useRef(0)
	const hitRef = useRef<HitInfo>({ mvp: null, w: 0, h: 0 })

	const sizeRef = useRef({ w: 1200, h: 800 })
	const mobileRef = useRef(false)
	const compactRef = useRef(false)
	const offsetsRef = useRef<Record<number, { x: number; y: number }>>({})
	const dismissedRef = useRef<Set<number>>(new Set())
	const draggingRef = useRef<number | null>(null)
	const dragRef = useRef<DragState | null>(null)
	const dragRaf = useRef(0)

	const [near, setNear] = useState(false)
	const [compact, setCompact] = useState(false) // phones + short landscape screens
	const [early, setEarly] = useState(true) // p < 0.08 -> "scroll down" hint
	const [dismissedCount, setDismissedCount] = useState(0)
	const [hot, setHot] = useState(false)
	const [muted, setMuted] = useState(false)

	const [sound] = useState(createGalaxySound)

	const cardW = compact ? 220 : 290

	/* ---- geometry helpers (all ref based, so they never go stale) ---- */
	const basePos = useCallback((r: Review) => {
		const { w, h } = sizeRef.current
		const e = cardEase(r.id, progressRef.current)
		const m = mobileRef.current
		return { x: (m ? r.mx : r.fx) * w * e, y: (m ? r.my : r.fy) * h * e, e }
	}, [])

	const isInteractive = useCallback(
		(r: Review) => !dismissedRef.current.has(r.id) && cardEase(r.id, progressRef.current) > 0.95,
		[]
	)

	/** is a point (stage coordinates) over the 3D galaxy disc? */
	const inGalaxy = useCallback((cx: number, cy: number) => {
		const hi = hitRef.current
		if (hi.mvp) return pointInPoly(cx, cy, galaxyPoly(hi.mvp, hi.w, hi.h))
		const { w, h } = sizeRef.current
		return Math.hypot(cx - w / 2, cy - h / 2) < Math.min(w, h) * 0.34 * 0.9
	}, [])

	/** write one card's position / look straight to the DOM.
	 *  Only transform + opacity change while scrolling; the other style
	 *  properties are written only when their value actually changes. */
	const applyCard = useCallback(
		(r: Review) => {
			const el = cardEls.current[r.id]
			if (!el) return
			const b = basePos(r)
			const gone = dismissedRef.current.has(r.id)
			const off = offsetsRef.current[r.id]
			const dragging = draggingRef.current === r.id

			const x = gone ? 0 : b.x + (off ? off.x : 0)
			const y = gone ? 0 : b.y + (off ? off.y : 0)
			const scale = gone ? 0 : 0.15 + 0.85 * b.e
			const rot = (1 - b.e) * (r.id % 2 ? -200 : 200) + r.tilt * b.e

			const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(dragging ? scale * 1.05 : scale).toFixed(3)}) rotate(${rot.toFixed(1)}deg)`
			if (lastTransform.current[r.id] !== tf) {
				lastTransform.current[r.id] = tf
				el.style.transform = tf
				el.style.opacity = (gone ? 0 : b.e).toFixed(2)
			}

			const interactive = !gone && b.e > 0.95
			const meta = `${interactive ? 1 : 0}${dragging ? 1 : 0}`
			if (lastMeta.current[r.id] !== meta) {
				lastMeta.current[r.id] = meta
				el.style.pointerEvents = interactive ? "auto" : "none"
				el.style.cursor = dragging ? "grabbing" : "grab"
				el.style.zIndex = dragging ? "50" : "10"
				el.style.boxShadow = interactive ? (dragging ? SHADOW_DRAG : SHADOW_IDLE) : "none"
			}
		},
		[basePos]
	)

	const applyAll = useCallback(() => REVIEWS.forEach(applyCard), [applyCard])

	/* ---- only create the galaxy (WebGL context + particles) when the section is about to scroll into view ---- */
	useEffect(() => {
		const io = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) {
					setNear(true)
					io.disconnect()
				}
			},
			{ rootMargin: "600px 0px" }
		)
		io.observe(sectionRef.current!)
		return () => io.disconnect()
	}, [])

	/* ---- sound: hum while hovering over the galaxy; cleanup on unmount ---- */
	useEffect(() => {
		if (hot) sound.startHover()
		else sound.stopHover()
	}, [hot, sound])

	useEffect(
		() => () => {
			sound.dispose()
			cancelAnimationFrame(dragRaf.current)
		},
		[sound]
	)

	const toggleMute = () => {
		const next = !muted
		setMuted(next)
		sound.setMuted(next)
		if (!next) sound.unlock()
	}

	/* ---- stage size (runs before the scroll effect so progress uses the real stage height) ---- */
	useEffect(() => {
		const el = stageRef.current!
		const measure = () => {
			const w = el.clientWidth
			const h = el.clientHeight
			sizeRef.current = { w, h }
			const m = w < 700
			mobileRef.current = m
			const c = m || h < 520
			compactRef.current = c
			setCompact(c) // no-op unless it flips
			applyAll()
		}
		measure()
		const ro = new ResizeObserver(measure)
		ro.observe(el)
		return () => ro.disconnect()
	}, [applyAll])

	/* ---- scroll progress (no React re-render, DOM written directly) ---- */
	useEffect(() => {
		let raf = 0
		const update = () => {
			raf = 0
			const rect = sectionRef.current!.getBoundingClientRect()
			const total = rect.height - (sizeRef.current.h || innerHeight)
			const v = total > 0 ? clamp(-rect.top / total) : 0
			const prev = progressRef.current
			progressRef.current = v
			if (Math.abs(v - prev) <= 0.0005 && v !== 0 && v !== 1) return

			setEarly(v < 0.08) // no-op unless the value actually flips

			// back at the start: everything returns to the galaxy
			if (v < 0.01 && (dismissedRef.current.size > 0 || Object.keys(offsetsRef.current).length > 0)) {
				dismissedRef.current = new Set()
				offsetsRef.current = {}
				setDismissedCount(0)
			}

			if (headingRef.current) headingRef.current.style.opacity = clamp(0.35 + v * 2).toFixed(2)
			applyAll()
		}
		const onScroll = () => {
			raf ||= requestAnimationFrame(update)
		}
		update()
		addEventListener("scroll", onScroll, { passive: true })
		addEventListener("resize", onScroll)
		return () => {
			cancelAnimationFrame(raf)
			removeEventListener("scroll", onScroll)
			removeEventListener("resize", onScroll)
		}
	}, [applyAll])

	/* ---- drag handlers ---- */
	const processDrag = useCallback(() => {
		dragRaf.current = 0
		const d = dragRef.current
		if (!d) return
		const r = REVIEWS[d.id]
		const off = { x: d.ox + (d.cx - d.sx), y: d.oy + (d.cy - d.sy) }
		offsetsRef.current[r.id] = off

		const { w, h } = sizeRef.current
		const b = basePos(r)
		const over = inGalaxy(w / 2 + b.x + off.x, h / 2 + b.y + off.y)
		if (over !== hotRef.current) {
			hotRef.current = over
			setHot(over)
		}
		applyCard(r)
	}, [basePos, inGalaxy, applyCard])

	const onDown = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
		if (!isInteractive(r)) return
		sound.unlock() // browsers only allow audio after a user gesture
		e.currentTarget.setPointerCapture(e.pointerId)
		const o = offsetsRef.current[r.id] ?? { x: 0, y: 0 }
		dragRef.current = { id: r.id, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, cx: e.clientX, cy: e.clientY }
		draggingRef.current = r.id
		applyCard(r)
	}

	const onMove = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
		const d = dragRef.current
		if (!d || d.id !== r.id) return
		d.cx = e.clientX
		d.cy = e.clientY
		// coalesce high-frequency pointer events into one update per frame
		dragRaf.current ||= requestAnimationFrame(processDrag)
	}

	const onUp = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
		const d = dragRef.current
		if (!d || d.id !== r.id) return
		if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
		cancelAnimationFrame(dragRaf.current)
		dragRaf.current = 0
		processDrag() // settle on the final pointer position

		if (hotRef.current) {
			// swallowed by the galaxy: hidden until the user scrolls back to the top
			dismissedRef.current.add(r.id)
			setDismissedCount(dismissedRef.current.size)
			flashRef.current = 1
			sound.swallow()
		}
		dragRef.current = null
		draggingRef.current = null
		hotRef.current = false
		setHot(false)
		applyCard(r)
	}

	/* ---- render ---- */
	return (
		<section ref={sectionRef} className="st-sec" aria-label="Client testimonials">
			<style>{CSS}</style>
			<div ref={stageRef} className="st-stage">
				{near && <GalaxyLayer progressRef={progressRef} hotRef={hotRef} flashRef={flashRef} hitRef={hitRef} />}

				{/* sound on / off (44px tap target, respects notches) */}
				<button
					type="button"
					className="st-btn"
					onClick={toggleMute}
					aria-label={muted ? "Turn sound on" : "Turn sound off"}
					aria-pressed={muted}
					style={{
						top: "calc(10px + env(safe-area-inset-top, 0px))",
						right: "calc(10px + env(safe-area-inset-right, 0px))",
					}}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M11 5 6 9H2v6h4l5 4V5z" />
						{muted ? (
							<>
								<line x1="22" y1="9" x2="16" y2="15" />
								<line x1="16" y1="9" x2="22" y2="15" />
							</>
						) : (
							<>
								<path d="M15.5 8.5a5 5 0 0 1 0 7" />
								<path d="M18.5 5.5a9 9 0 0 1 0 13" />
							</>
						)}
					</svg>
				</button>

				{/* heading (opacity is driven from the scroll handler) */}
				<div
					ref={headingRef}
					style={{
						position: "absolute",
						top: compact ? "calc(3% + env(safe-area-inset-top, 0px))" : "7%",
						left: 0,
						right: 0,
						textAlign: "center",
						zIndex: 3,
						pointerEvents: "none",
						opacity: 0.35,
						padding: "0 56px",
						willChange: "opacity",
					}}
				>
					<p style={{ margin: 0, letterSpacing: "0.3em", fontSize: 12, color: "#60a5fa", textTransform: "uppercase" }}>
						Testimonials
					</p>
					<h2
						style={{
							margin: "6px 0 0",
							fontSize: "clamp(22px, 6.2vw, 44px)",
							lineHeight: 1.15,
							fontWeight: 800,
							color: "#fff",
						}}
					>
						What Our Clients Say
					</h2>
				</div>

				{/* review cards: transform / opacity / shadow / z-index / cursor are written imperatively by
				    applyCard(); the values below are only the constant starting state */}
				{REVIEWS.map((r) => (
					<div
						key={r.id}
						ref={(el) => {
							cardEls.current[r.id] = el
						}}
						className="st-card"
						onPointerDown={(e) => onDown(e, r)}
						onPointerMove={(e) => onMove(e, r)}
						onPointerUp={(e) => onUp(e, r)}
						onPointerCancel={(e) => onUp(e, r)}
						style={{
							width: `min(${cardW}px, ${compact ? 66 : 90}vw)`,
							transform: "scale(0.15)",
							transition: CARD_TRANSITION,
							zIndex: 10,
							padding: compact ? 12 : 18,
							boxShadow: "none",
						}}
					>
						<div style={{ color: "#fbbf24", fontSize: compact ? 13 : 15, letterSpacing: 2, marginBottom: compact ? 6 : 8, lineHeight: 1 }}>
							{"★".repeat(r.rating)}
							<span style={{ color: "#334155" }}>{"★".repeat(5 - r.rating)}</span>
						</div>
						<p
							style={{
								margin: 0,
								fontSize: compact ? 12.5 : 14.5,
								lineHeight: 1.5,
								// phones: cap the quote at 4 lines so six cards always fit on screen
								...(compact && {
									display: "-webkit-box",
									WebkitLineClamp: 4,
									WebkitBoxOrient: "vertical" as const,
									overflow: "hidden",
								}),
							}}
						>
							“{r.text}”
						</p>
						<div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: compact ? 10 : 14 }}>
							<div
								style={{
									flex: "none",
									width: compact ? 32 : 38,
									height: compact ? 32 : 38,
									borderRadius: "50%",
									display: "grid",
									placeItems: "center",
									fontWeight: 700,
									color: "#fff",
									background: "linear-gradient(135deg,#2563eb,#7c3aed)",
								}}
							>
								{r.name.charAt(0)}
							</div>
							<div style={{ minWidth: 0 }}>
								<div style={{ fontWeight: 700, fontSize: compact ? 13 : 14 }}>{r.name}</div>
								<div style={{ fontSize: compact ? 11 : 12, color: "#93b4ff" }}>{r.role}</div>
							</div>
						</div>
					</div>
				))}

				{/* hints */}
				<div
					aria-live="polite"
					style={{
						position: "absolute",
						bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
						left: 0,
						right: 0,
						textAlign: "center",
						fontSize: compact ? 12 : 13,
						lineHeight: 1.4,
						color: "#93b4ff",
						zIndex: 3,
						pointerEvents: "none",
						padding: "0 20px",
					}}
				>
					{early
						? "↓ Scroll down to release the reviews from the galaxy"
						: dismissedCount > 0
						? `${dismissedCount} review${dismissedCount > 1 ? "s" : ""} swallowed – scroll back to the top to bring them back`
						: hot
						? "Release to feed it to the galaxy"
						: "Drag a review into the galaxy to dismiss it • Scroll up to send them all back"}
				</div>
			</div>
		</section>
	)
}