"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

/* ------------------------------------------------------------------ */
/*  DATA – replace with your real client reviews                       */
/*  fx/fy = final position on desktop, mx/my = on mobile               */
/*  (fractions of the stage width / height, measured from the center)  */
/* ------------------------------------------------------------------ */
type Review = {
  id: number;
  name: string;
  role: string;
  text: string;
  rating: number;
  fx: number;
  fy: number;
  mx: number;
  my: number;
  tilt: number;
};

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
];

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** per-card spill progress (staggered) */
const cardEase = (index: number, p: number) => {
  const start = 0.04 + index * 0.09;
  return easeOutCubic(clamp((p - start) / 0.3));
};

type Pt = [number, number];

const pointInPoly = (x: number, y: number, poly: Pt[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/* ------------------------------------------------------------------ */
/*  Sound – synthesised with the Web Audio API (no audio files)        */
/*  • a low cosmic hum while a review hovers over the galaxy           */
/*  • a modern "warp whoosh + bloop + sub thump + chime" when a        */
/*    review gets swallowed                                            */
/* ------------------------------------------------------------------ */
function createGalaxySound() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let reverb: ConvolverNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;
  let hover: { stop: () => void } | null = null;

  /** must first be called from a user gesture (pointerdown) */
  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ctx.destination);

      // light synthetic reverb tail (short + mono = cheap to build, no hitch on first grab)
      const len = Math.floor(ctx.sampleRate * 0.8);
      const imp = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = imp.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
      }
      reverb = ctx.createConvolver();
      reverb.buffer = imp;
      const wet = ctx.createGain();
      wet.gain.value = 0.4;
      reverb.connect(wet);
      wet.connect(master);

      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate);
      const nd = noise.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  const stopHover = () => {
    if (hover) {
      hover.stop();
      hover = null;
    }
  };

  return {
    unlock() {
      ensure();
    },

    stopHover,

    setMuted(m: boolean) {
      muted = m;
      if (m) stopHover();
    },

    startHover() {
      const c = ensure();
      const m = master;
      if (!c || !m || muted || hover) return;
      const t = c.currentTime;

      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.3);

      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;

      const o1 = c.createOscillator();
      o1.type = "sine";
      o1.frequency.setValueAtTime(48, t);
      o1.frequency.linearRampToValueAtTime(74, t + 2.5);
      const o2 = c.createOscillator();
      o2.type = "triangle";
      o2.frequency.setValueAtTime(96.5, t);
      o2.frequency.linearRampToValueAtTime(148, t + 2.5);

      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(m);
      o1.start(t);
      o2.start(t);

      hover = {
        stop() {
          const n = c.currentTime;
          g.gain.cancelScheduledValues(n);
          g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), n);
          g.gain.exponentialRampToValueAtTime(0.0001, n + 0.2);
          o1.stop(n + 0.25);
          o2.stop(n + 0.25);
        },
      };
    },

    swallow() {
      const c = ensure();
      const m = master;
      const rv = reverb;
      const nb = noise;
      if (!c || !m || !rv || !nb || muted) return;
      stopHover();
      const t = c.currentTime + 0.01;

      const out = c.createGain();
      out.gain.value = 0.9;
      out.connect(m);
      out.connect(rv);

      const tone = (
        type: OscillatorType,
        f0: number,
        f1: number,
        st: number,
        dur: number,
        peak: number
      ) => {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f0, st);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, st + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(peak, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g);
        g.connect(out);
        o.start(st);
        o.stop(st + dur + 0.02);
      };

      /* 1. airy warp whoosh */
      const n = c.createBufferSource();
      n.buffer = nb;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 2;
      bp.frequency.setValueAtTime(5200, t);
      bp.frequency.exponentialRampToValueAtTime(420, t + 0.22);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      n.start(t);
      n.stop(t + 0.3);

      /* 2. glassy "bloop" sucking in */
      tone("sine", 1500, 240, t, 0.17, 0.32);

      /* 3. tight sub thump */
      tone("sine", 100, 40, t + 0.13, 0.4, 0.65);

      /* 4. bright pentatonic chime (edit these notes to change the vibe) */
      [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => {
        const st = t + 0.16 + i * 0.065;
        tone("triangle", f, f, st, 0.55, 0.1);
        tone("sine", f * 2, f * 2, st, 0.35, 0.035);
      });
    },

    dispose() {
      stopHover();
      if (ctx) void ctx.close();
      ctx = null;
      master = null;
      reverb = null;
      noise = null;
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Tiny 4x4 matrix toolkit (column-major, no dependencies)            */
/* ------------------------------------------------------------------ */
type Mat = Float32Array;
const ident = (): Mat => {
  const o = new Float32Array(16);
  o[0] = o[5] = o[10] = o[15] = 1;
  return o;
};
const mul = (a: Mat, b: Mat): Mat => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
};
const persp = (fov: number, aspect: number, n: number, f: number): Mat => {
  const t = 1 / Math.tan(fov / 2);
  const o = new Float32Array(16);
  o[0] = t / aspect;
  o[5] = t;
  o[10] = (f + n) / (n - f);
  o[11] = -1;
  o[14] = (2 * f * n) / (n - f);
  return o;
};
const rotX = (a: number): Mat => {
  const o = ident();
  const c = Math.cos(a);
  const s = Math.sin(a);
  o[5] = c; o[6] = s; o[9] = -s; o[10] = c;
  return o;
};
const rotY = (a: number): Mat => {
  const o = ident();
  const c = Math.cos(a);
  const s = Math.sin(a);
  o[0] = c; o[2] = -s; o[8] = s; o[10] = c;
  return o;
};
const rotZ = (a: number): Mat => {
  const o = ident();
  const c = Math.cos(a);
  const s = Math.sin(a);
  o[0] = c; o[1] = s; o[4] = -s; o[5] = c;
  return o;
};
const trans = (x: number, y: number, z: number): Mat => {
  const o = ident();
  o[12] = x; o[13] = y; o[14] = z;
  return o;
};
/** world point -> CSS pixel position on the canvas */
const project = (m: Mat, x: number, y: number, z: number, w: number, h: number): Pt => {
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  return [(cx / cw * 0.5 + 0.5) * w, (1 - (cy / cw * 0.5 + 0.5)) * h];
};

/** hit area of the galaxy on screen (the "dustbin" drop test + glow ring).
 *  Computed on demand instead of every frame. */
const galaxyPoly = (m: Mat, w: number, h: number): Pt[] => {
  const poly: Pt[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    poly.push(project(m, Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86, w, h));
  }
  return poly;
};

type HitInfo = { mvp: Mat | null; w: number; h: number };

/* ------------------------------------------------------------------ */
/*  Galaxy – a real 3D particle galaxy rendered with raw WebGL         */
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
uniform float uSizeMul;
uniform float uPx;
uniform float uMaxPt;
uniform float uBoost;
uniform float uReveal;
uniform float uRadial;

varying vec3  vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  // inner regions orbit a little faster than the outer disc
  float speed = 1.0;
  if (uDiff > 0.0) speed += uDiff * 2.2 * exp(-aR * 5.0);
  float ang = aTheta + uSpin * speed;

  vec3 p = vec3(cos(ang) * aR, aY, sin(ang) * aR);

  // the outer disc is bent like the real Milky Way warp (fixed in space)
  float wa = p.x * 0.825 + p.z * 0.565;
  p.y += uWarp * 0.1 * wa * aR;

  // living, breathing motion (skipped for sets that don't use it)
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
  float fl = 0.0;
  if (uTwinkle > 0.0) {
    tw = 1.0 + uTwinkle * sin(uTime * uTwSpeed * (1.5 + aSeed * 4.0) + aSeed * 60.0);
    // rare bright flares on random stars
    fl = pow(max(0.0, sin(uTime * 0.25 + aSeed * 400.0)), 60.0);
  }

  float size = aSize * uSizeMul * (1.0 + fl * uTwinkle * 3.0 + uBoost * 0.12);
  float raw = size * uPx / clip.w;
  gl_PointSize = clamp(raw, 1.0, uMaxPt);

  // intro: the galaxy ignites from the core and the light spreads outwards
  float rv = mix(clamp(uReveal * 2.0, 0.0, 1.0), clamp((uReveal * 1.45 - aR) * 3.5, 0.0, 1.0), uRadial);

  vColor = aColor;
  vSeed = aSeed;
  vAlpha = rv * aAlpha * tw * (1.0 + uBoost * 0.55) * (1.0 + fl * uTwinkle * 4.0) * min(1.0, raw);
}
`;

/* Every sprite fades smoothly to zero before the edge of its quad, so no hard
   outlines show. "Cloud" sprites (nebulae, dust) sample a pre-baked tileable
   noise texture (uNoise) instead of computing fbm per pixel. */
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3  vColor;
varying float vAlpha;
varying float vSeed;
uniform float uSpike;
uniform float uCloud;
uniform sampler2D uNoise;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  float f;
  if (uSpike > 0.5) {
    float core = exp(-d * 14.0) + exp(-d * 4.0) * 0.25;
    float s = exp(-abs(c.x) * 70.0) * exp(-abs(c.y) * 9.0)
            + exp(-abs(c.y) * 70.0) * exp(-abs(c.x) * 9.0);
    f = core + s * 0.4;
    f *= smoothstep(0.5, 0.3, max(abs(c.x), abs(c.y)));
  } else {
    if (d > 1.0) discard;
    f = exp(-d * 3.0) * (1.0 - smoothstep(0.45, 1.0, d));
    if (uCloud > 0.5) {
      float ang = vSeed * 6.2831;
      mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
      float n = texture2D(uNoise, (rot * c * 3.4 + vSeed * 41.0) * 0.0625).r;
      float body = 1.0 - smoothstep(0.05, 1.0, d);
      f = body * (0.12 + 1.9 * smoothstep(0.25, 0.8, n));
    }
  }
  gl_FragColor = vec4(vColor * f * vAlpha, f * vAlpha);
}
`;

const UNIFORMS = [
  "uMVP", "uTime", "uSpin", "uDiff", "uWarp", "uJitter", "uTwinkle", "uTwSpeed",
  "uSizeMul", "uPx", "uMaxPt", "uBoost", "uSpike", "uReveal", "uRadial", "uCloud", "uNoise",
] as const;

/** Tileable fbm noise baked into a 256x256 texture (covers 16 base cells). */
function makeNoiseTexture(gl: WebGLRenderingContext): WebGLTexture | null {
  const N = 256;
  const P = 16;
  const hash = (x: number, y: number, per: number) => {
    const xi = ((x % per) + per) % per;
    const yi = ((y % per) + per) % per;
    let h = (Math.imul(xi, 374761393) + Math.imul(yi, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const vn = (x: number, y: number, per: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let fx = x - ix;
    let fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, per);
    const b = hash(ix + 1, iy, per);
    const c = hash(ix, iy + 1, per);
    const d = hash(ix + 1, iy + 1, per);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const data = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = (x / N) * P;
      const py = (y / N) * P;
      const v =
        0.5 * vn(px, py, P) +
        0.25 * vn(px * 2 + 17, py * 2 + 9, P * 2) +
        0.125 * vn(px * 4 + 34, py * 4 + 18, P * 4);
      data[y * N + x] = Math.round(clamp(v) * 255);
    }
  }
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, N, N, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.activeTexture(gl.TEXTURE0);
  return tex;
}

type StarSet = {
  buf: WebGLBuffer;
  count: number;
  additive: boolean;
  spin: number;
  diff: number;
  warp: number;
  jitter: number;
  twinkle: number;
  twSpeed: number;
  sizeMul: number;
  spike: number;
  radial: number;
  cloud: number;
};

/* --- galaxy generation helpers --- */
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = () =>
  (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;
const expR = (h: number) => {
  const u = Math.random();
  return -h * Math.log(1 - u * (1 - Math.exp(-1 / h)));
};

/** spiral arm centre-line: 4 arms, slightly irregular, starting at the bar ends */
const armTheta = (k: number, r: number) =>
  0.5 + k * (Math.PI / 2) + 2.7 * Math.log(1 + r * 9) + 0.11 * Math.sin(r * 13 + k * 1.7);

/** two strong arms (0 & 2) and two weaker ones (1 & 3), like the Milky Way */
const pickArm = () =>
  Math.random() < 0.62 ? (Math.random() < 0.5 ? 0 : 2) : Math.random() < 0.5 ? 1 : 3;

/** star clusters / cloud complexes along the arms – makes the arms knotty & organic */
type Clump = { r: number; th: number; s: number };
const makeClumps = (n: number): Clump[] => {
  const out: Clump[] = [];
  for (let i = 0; i < n; i++) {
    const r = clamp(expR(0.4), 0.06, 0.98);
    out.push({
      r,
      th: armTheta(pickArm(), r) + gauss() * 0.04,
      s: rand(0.012, 0.045) * (0.6 + r),
    });
  }
  return out;
};
const inClump = (c: Clump): Pt => {
  const r = clamp(c.r + gauss() * c.s, 0.01, 1);
  return [r, c.th + (gauss() * c.s) / Math.max(r, 0.12)];
};

const mix = (a: number[], b: number[], t: number) => {
  const k = clamp(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
const WARM = [1, 0.8, 0.55];
const CREAM = [1, 0.93, 0.82];
const BLUEW = [0.78, 0.86, 1];
const BLUE = [0.55, 0.7, 1];
const CYAN = [0.5, 0.85, 1];

/** real star colours: old warm core, young blue arms, a few giants */
const starColor = (r: number) => {
  const roll = Math.random();
  if (roll < 0.07) return [1, 0.62, 0.4];
  if (roll < 0.14) return [0.65, 0.78, 1];
  if (r < 0.18) return mix(WARM, CREAM, Math.random());
  if (r < 0.5) return mix(CREAM, BLUEW, (r - 0.18) / 0.32 + (Math.random() - 0.5) * 0.4);
  return mix(BLUEW, Math.random() < 0.25 ? CYAN : BLUE, Math.random());
};

/** soft nebula gas colours: violet -> blue -> cyan */
const hazeColor = (r: number) => {
  if (r < 0.3) return mix([0.95, 0.5, 0.85], [0.55, 0.35, 1], r / 0.3);
  if (r < 0.65) return mix([0.55, 0.35, 1], [0.2, 0.4, 1], (r - 0.3) / 0.35);
  return mix([0.2, 0.4, 1], [0.1, 0.7, 1], (r - 0.65) / 0.35);
};

/** growable typed-array point list (no giant number[] with millions of pushes) */
class Pts {
  d: Float32Array;
  n = 0;
  constructor(cap = 1024) {
    this.d = new Float32Array(cap * 9);
  }
  add(r: number, th: number, y: number, size: number, c: number[], a: number) {
    if (this.n + 9 > this.d.length) {
      const nd = new Float32Array(this.d.length * 2);
      nd.set(this.d);
      this.d = nd;
    }
    const d = this.d;
    const n = this.n;
    d[n] = r;
    d[n + 1] = th;
    d[n + 2] = y;
    d[n + 3] = size;
    d[n + 4] = c[0];
    d[n + 5] = c[1];
    d[n + 6] = c[2];
    d[n + 7] = a;
    d[n + 8] = Math.random();
    this.n = n + 9;
  }
  get count() {
    return this.n / 9;
  }
  get data() {
    return this.d.subarray(0, this.n);
  }
}

/** k = particle density (1 = full, lower = weaker devices).
 *  ultra = the lightest tier: drops every decorative layer (nebula clouds, dust
 *  lanes, dwarf galaxies, deep field, bokeh motes, spike stars) and keeps only
 *  the core look: stars + haze + bulge + core glow.
 *  Returns small build steps; the render loop runs a few ms of them per frame
 *  so generating particles never freezes the page. */
function buildSteps(
  gl: WebGLRenderingContext,
  k: number,
  sets: StarSet[],
  ultra: boolean
): (() => void)[] {
  const steps: (() => void)[] = [];
  const clumps = makeClumps(k < 1 ? 220 : 520);
  const clump = () => inClump(clumps[(Math.random() * clumps.length) | 0]);

  const finish = (pts: Pts, o: Partial<Omit<StarSet, "buf" | "count">>) => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, pts.data, gl.STATIC_DRAW);
    sets.push({
      buf,
      count: pts.count,
      additive: true,
      spin: 1,
      diff: 0.2,
      warp: 1,
      jitter: 0,
      twinkle: 0,
      twSpeed: 1,
      sizeMul: 1,
      spike: 0,
      radial: 1,
      cloud: 0,
      ...o,
    });
  };

  /* 1. far background stars (spin 0 -> only camera parallax moves them) */
  steps.push(() => {
    const n = Math.floor(3000 * k);
    const p = new Pts(n + 8);
    for (let i = 0; i < n; i++) {
      const rr = rand(3.5, 9);
      const phi = Math.acos(rand(-1, 1));
      const th = Math.random() * Math.PI * 2;
      const rxz = rr * Math.sin(phi);
      const tint = Math.random();
      const col = tint < 0.65 ? [0.8, 0.88, 1] : tint < 0.85 ? [1, 0.9, 0.78] : [0.85, 0.8, 1];
      const a = 0.12 + Math.pow(Math.random(), 3) * 0.85;
      p.add(rxz, th, rr * Math.cos(phi), rand(0.01, 0.026) * (rr / 4), col, a);
    }
    finish(p, { spin: 0, diff: 0, warp: 0, twinkle: ultra ? 0 : 0.35, radial: 0 });
  });

  /* 2. faint halo of old stars around the galaxy (gives real depth) */
  steps.push(() => {
    const n = Math.floor(3200 * k);
    const p = new Pts(n + 8);
    for (let i = 0; i < n; i++) {
      const rr = rand(0.12, 1.5) * (0.5 + 0.5 * Math.random());
      const phi = Math.acos(rand(-1, 1));
      const th = Math.random() * Math.PI * 2;
      p.add(
        rr * Math.sin(phi),
        th,
        rr * Math.cos(phi) * 0.75,
        rand(0.0025, 0.006),
        mix(WARM, CREAM, Math.random()),
        rand(0.15, 0.5)
      );
    }
    finish(p, { spin: 0.2, diff: 0, warp: 0, twinkle: ultra ? 0 : 0.2 });
  });

  /* 3. glowing gas + unresolved starlight */
  steps.push(() => {
    const p = new Pts(Math.floor(10000 * k) + 8);
    const n = Math.floor(6500 * k);
    for (let i = 0; i < n; i++) {
      let r: number;
      let th: number;
      if (Math.random() < 0.4) {
        [r, th] = clump();
      } else {
        r = clamp(expR(0.38), 0.03, 1);
        th = armTheta(pickArm(), r) + gauss() * (0.12 + 0.2 * r);
      }
      const a = rand(0.01, 0.026) * (1 - r * 0.5) * (0.35 + 0.65 * Math.min(1, r * 3));
      p.add(r, th, gauss() * 0.02, rand(0.08, 0.22) * (0.6 + 0.8 * r), hazeColor(r), a);
    }
    const m = Math.floor(3500 * k);
    for (let i = 0; i < m; i++) {
      const r = clamp(expR(0.3), 0.02, 1);
      const onArm = Math.random() < 0.55;
      const th = onArm ? armTheta(pickArm(), r) + gauss() * (0.16 + 0.2 * r) : Math.random() * Math.PI * 2;
      const col = mix(CREAM, BLUEW, clamp((r - 0.15) / 0.6));
      p.add(r, th, gauss() * 0.02, rand(0.1, 0.2), col, rand(0.006, 0.014) * (1 - r * 0.4));
    }
    finish(p, { jitter: ultra ? 0 : 0.5 });
  });

  /* 3b. colourful emission nebulae (skipped on ultra-light devices) */
  if (!ultra) {
    steps.push(() => {
      const n = Math.floor(420 * k);
      const p = new Pts(n + 8);
      const pal = [[1, 0.25, 0.5], [0.25, 0.8, 1], [1, 0.5, 0.2], [0.6, 0.3, 1], [1, 0.3, 0.7]];
      for (let i = 0; i < n; i++) {
        const [r, th] = clump();
        const base = pal[(Math.random() * pal.length) | 0];
        p.add(r, th, gauss() * 0.015, rand(0.14, 0.34) * (0.6 + 0.6 * r), mix(base, hazeColor(r), 0.25), rand(0.02, 0.045));
      }
      finish(p, { jitter: 0.4, twinkle: 0.05, twSpeed: 0.3, cloud: 1 });
    });
  }

  /* 4. the main disc: tiny individual stars, built in 4 chunks so no single
        frame is blocked for long. */
  {
    const discN = Math.floor(110000 * k);
    const disc = new Pts(discN + 8);
    const CH = 4;
    for (let c = 0; c < CH; c++) {
      const from = Math.floor((discN * c) / CH);
      const to = Math.floor((discN * (c + 1)) / CH);
      steps.push(() => {
        for (let i = from; i < to; i++) {
          let r = 0;
          let th = 0;
          if (Math.random() < 0.22) {
            [r, th] = clump();
          } else {
            r = clamp(expR(0.29), 0.01, 1);
            const onArm = Math.random() < 0.3 + 0.55 * r;
            th = onArm
              ? armTheta(pickArm(), r) + gauss() * (0.1 + 0.2 * r)
              : Math.random() * Math.PI * 2;
          }
          const thick = 0.012 + 0.03 * Math.exp(-r * 4);
          // on weak screens (low DPR) each star is drawn a bit bigger so the
          // thinner particle count still reads as a full galaxy
          const sMul = k < 1 ? 1.5 : 1;
          const size =
            (Math.random() < 0.012 ? rand(0.007, 0.011) : rand(0.0022, 0.0048)) * sMul;
          const a = rand(0.25, 0.8) * (0.4 + 0.6 * Math.min(1, r * 2.2));
          disc.add(r, th, gauss() * thick, size, starColor(r), a);
        }
        if (c === CH - 1) finish(disc, { jitter: ultra ? 0 : 0.35, twinkle: ultra ? 0 : 0.12 });
      });
    }
  }

  /* 5. dark dust lanes (skipped on ultra-light devices) */
  if (!ultra) {
    steps.push(() => {
      const n = Math.floor(5200 * k);
      const p = new Pts(n + 208);
      for (let i = 0; i < n; i++) {
        let r: number;
        let th: number;
        if (Math.random() < 0.45) {
          [r, th] = clump();
          th -= 0.1;
        } else {
          r = rand(0.12, 0.95);
          th = armTheta(pickArm(), r) - 0.13 + gauss() * 0.05;
        }
        p.add(
          r,
          th,
          gauss() * 0.008,
          rand(0.05, 0.13) * (0.7 + r * 0.7),
          [0.015, 0.01, 0.03],
          rand(0.05, 0.11)
        );
      }
      for (let i = 0; i < 200; i++) {
        p.add(
          rand(0.1, 0.22),
          Math.random() * Math.PI * 2,
          gauss() * 0.01,
          rand(0.05, 0.1),
          [0.02, 0.012, 0.03],
          rand(0.07, 0.14)
        );
      }
      finish(p, { additive: false, cloud: 1 });
    });
  }

  /* 6. pink star-forming knots (HII regions) inside the clusters */
  steps.push(() => {
    const n = Math.floor(230 * k);
    const p = new Pts(n * 2 + 8);
    for (let i = 0; i < n; i++) {
      const [r, th] = clump();
      const y = gauss() * 0.01;
      const col = Math.random() < 0.5 ? [1, 0.35, 0.7] : [1, 0.5, 0.8];
      p.add(r, th, y, rand(0.02, 0.05), col, rand(0.18, 0.4));
      p.add(r, th, y, 0.007, [1, 0.85, 0.95], 0.8);
    }
    finish(p, { twinkle: ultra ? 0 : 0.15, twSpeed: 0.5 });
  });

  /* 6b. young blue giants – bright jewels */
  steps.push(() => {
    const n = Math.floor(700 * k);
    const p = new Pts(n + 8);
    for (let i = 0; i < n; i++) {
      const [r, th] = clump();
      p.add(r, th, gauss() * 0.012, rand(0.009, 0.02), mix([0.7, 0.85, 1], [1, 1, 1], Math.random() * 0.6), rand(0.35, 0.9));
    }
    finish(p, { twinkle: ultra ? 0 : 0.3, twSpeed: 0.8 });
  });

  /* 7. dense warm bulge + a subtle central bar */
  steps.push(() => {
    const n = Math.floor(11000 * k);
    const bar = Math.floor(2400 * k);
    const p = new Pts(n + bar + 8);
    for (let i = 0; i < n; i++) {
      const r = Math.abs(gauss()) * 0.085;
      p.add(
        r,
        Math.random() * Math.PI * 2,
        gauss() * 0.035,
        rand(0.004, 0.009),
        mix(WARM, CREAM, Math.random()),
        rand(0.25, 0.65)
      );
    }
    for (let i = 0; i < bar; i++) {
      const along = gauss() * 0.11;
      const across = gauss() * 0.035;
      const ang = 0.5;
      const x = along * Math.cos(ang) - across * Math.sin(ang);
      const z = along * Math.sin(ang) + across * Math.cos(ang);
      p.add(Math.hypot(x, z), Math.atan2(z, x), gauss() * 0.02, rand(0.004, 0.008), mix(WARM, CREAM, 0.5), rand(0.2, 0.5));
    }
    finish(p, { twinkle: ultra ? 0 : 0.1 });
  });

  /* 8. glow of the galactic core */
  steps.push(() => {
    const p = new Pts(8);
    p.add(0, 0, 0, 0.6, [0.95, 0.5, 0.8], 0.04);
    p.add(0, 0, 0, 0.34, [1, 0.72, 0.55], 0.1);
    p.add(0, 0, 0, 0.16, [1, 0.88, 0.72], 0.26);
    p.add(0, 0, 0, 0.06, [1, 1, 1], 0.55);
    finish(p, { spin: 0, diff: 0, warp: 0, twinkle: ultra ? 0 : 0.1, twSpeed: 0.18 });
  });

  if (!ultra) {
    /* 10. companion dwarf galaxies + globular clusters */
    steps.push(() => {
      const p = new Pts(8000);
      const cart = (x: number, y: number, z: number, size: number, c: number[], a: number) =>
        p.add(Math.hypot(x, z), Math.atan2(z, x), y, size, c, a);
      const dwarfs: [number, number, number, number][] = [
        [1.28, 0.16, -0.5, 1],
        [-1.2, -0.12, 0.62, 0.7],
      ];
      for (const [cx, cy, cz, sc] of dwarfs) {
        const n = Math.floor(2200 * sc * k);
        for (let i = 0; i < n; i++) {
          cart(
            cx + gauss() * 0.09 * sc,
            cy + gauss() * 0.045 * sc,
            cz + gauss() * 0.07 * sc,
            rand(0.003, 0.007),
            mix(BLUEW, CREAM, Math.random()),
            rand(0.2, 0.7)
          );
        }
        for (let i = 0; i < 30; i++) {
          cart(
            cx + gauss() * 0.06 * sc,
            cy + gauss() * 0.03 * sc,
            cz + gauss() * 0.05 * sc,
            rand(0.08, 0.16) * sc,
            [0.6, 0.75, 1],
            rand(0.012, 0.025)
          );
        }
      }
      for (let c = 0; c < 12; c++) {
        const rr = rand(0.5, 1.4);
        const a = Math.random() * Math.PI * 2;
        const cx = Math.cos(a) * rr;
        const cz = Math.sin(a) * rr;
        const cy = gauss() * 0.35;
        for (let i = 0; i < 110; i++) {
          cart(cx + gauss() * 0.018, cy + gauss() * 0.018, cz + gauss() * 0.018, rand(0.003, 0.006), [1, 0.85, 0.6], rand(0.3, 0.8));
        }
        cart(cx, cy, cz, 0.05, [1, 0.85, 0.65], 0.03);
      }
      finish(p, { spin: 0, diff: 0, warp: 0, twinkle: 0.15, radial: 0 });
    });

    /* 11. deep field: distant galaxies as tiny elliptical smudges */
    steps.push(() => {
      const p = new Pts(256);
      const n = Math.floor(26 * k);
      for (let i = 0; i < n; i++) {
        const rr = rand(4, 8);
        const phi = Math.acos(rand(-1, 1));
        const th = Math.random() * Math.PI * 2;
        const x = rr * Math.sin(phi) * Math.cos(th);
        const y = rr * Math.cos(phi);
        const z = rr * Math.sin(phi) * Math.sin(th);
        const ang = Math.random() * Math.PI;
        const col = Math.random() < 0.5 ? [1, 0.82, 0.6] : [0.7, 0.82, 1];
        for (let j = -3; j <= 3; j++) {
          const t = j / 3;
          const fade = 1 - Math.abs(t) * 0.6;
          const x2 = x + Math.cos(ang) * t * 0.35;
          const z2 = z + Math.sin(ang) * t * 0.35;
          p.add(Math.hypot(x2, z2), Math.atan2(z2, x2), y + t * 0.05, rand(0.1, 0.18) * fade, col, 0.05 * fade);
        }
      }
      finish(p, { spin: 0, diff: 0, warp: 0, radial: 0 });
    });

    /* 12. drifting space-dust motes near the camera */
    steps.push(() => {
      const n = Math.floor(36 * k);
      const p = new Pts(n + 8);
      for (let i = 0; i < n; i++) {
        p.add(
          rand(0.25, 1.5),
          Math.random() * Math.PI * 2,
          rand(-0.6, 0.6),
          rand(0.035, 0.1),
          mix(BLUEW, CREAM, Math.random()),
          rand(0.02, 0.07)
        );
      }
      finish(p, { spin: 0.12, diff: 0, warp: 0, jitter: 1.5, twinkle: 0.25, twSpeed: 0.4, radial: 0 });
    });

    /* 9. bright foreground stars with soft diffraction spikes */
    steps.push(() => {
      const n = Math.floor(40 * k);
      const p = new Pts(n + 8);
      for (let i = 0; i < n; i++) {
        const r = rand(0.08, 1.2);
        const th = Math.random() * Math.PI * 2;
        const col = Math.random() < 0.6 ? [0.8, 0.9, 1] : [1, 0.9, 0.78];
        p.add(r, th, gauss() * 0.12, rand(0.03, 0.055), col, rand(0.3, 0.65));
      }
      finish(p, { spin: 0.3, diff: 0, warp: 0.5, twinkle: 0.35, spike: 1, radial: 0 });
    });
  }

  return steps;
}

/* ------------------------------------------------------------------ */
/*  Cinematic post-processing: bloom, filmic tone-mapping, vignette    */
/*  (skipped entirely on the ultra-light tier)                         */
/* ------------------------------------------------------------------ */
const QUAD_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

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
  c = min(c, vec3(8.0));
  float l = max(c.r, max(c.g, c.b));
  float k = uThresh < 0.0 ? 1.0 : smoothstep(uThresh, uThresh + uKnee, l);
  gl_FragColor = vec4(c * k, 1.0);
}
`;

const BLUR_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.227027;
  c += (texture2D(uTex, vUv + uDir * 1.0).rgb + texture2D(uTex, vUv - uDir * 1.0).rgb) * 0.1945946;
  c += (texture2D(uTex, vUv + uDir * 2.0).rgb + texture2D(uTex, vUv - uDir * 2.0).rgb) * 0.1216216;
  c += (texture2D(uTex, vUv + uDir * 3.0).rgb + texture2D(uTex, vUv - uDir * 3.0).rgb) * 0.054054;
  c += (texture2D(uTex, vUv + uDir * 4.0).rgb + texture2D(uTex, vUv - uDir * 4.0).rgb) * 0.016216;
  gl_FragColor = vec4(c, 1.0);
}
`;

const COMP_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uStreak;
uniform float uStreakAmt;
uniform float uExpo;
uniform float uBloomAmt;
uniform float uTime;
uniform float uFade;
uniform vec2 uRes;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);

  // a touch of lens chromatic aberration toward the edges
  vec2 off = d * r2 * 0.014;
  vec3 s = vec3(
    texture2D(uScene, vUv + off).r,
    texture2D(uScene, vUv).g,
    texture2D(uScene, vUv - off).b
  );

  vec3 b = texture2D(uBloom1, vUv).rgb * 0.75 + texture2D(uBloom2, vUv).rgb * 1.0;
  vec3 c = s + b * uBloomAmt;
  // cinematic anamorphic light streak from the brightest points
  c += texture2D(uStreak, vUv).rgb * vec3(0.45, 0.65, 1.0) * uStreakAmt;

  // richer colour, then filmic curve
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.2);
  c = aces(c * uExpo);

  // vignette
  c *= 1.0 - smoothstep(0.18, 0.55, r2) * 0.5;

  // film grain (hides banding in the dark gradients)
  float g = fract(sin(dot(vUv * uRes + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
  c += (g - 0.5) * 0.014;

  c = clamp(c * uFade, 0.0, 1.0);
  float a = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c, a);
}
`;

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };

function createTarget(gl: WebGLRenderingContext, w: number, h: number, type: number): Target | null {
  const tex = gl.createTexture();
  const fb = gl.createFramebuffer();
  if (!tex || !fb) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fb);
    return null;
  }
  return { tex, fb, w, h };
}

function destroyTarget(gl: WebGLRenderingContext, t: Target | null) {
  if (!t) return;
  gl.deleteTexture(t.tex);
  gl.deleteFramebuffer(t.fb);
}

function makeProgram(
  gl: WebGLRenderingContext,
  vsSrc: string,
  fsSrc: string,
  attrs: string[]
): WebGLProgram | null {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, vsSrc);
  const fs = sh(gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  attrs.forEach((n, i) => gl.bindAttribLocation(prog, i, n));
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

type Shooter = { x: number; y: number; vx: number; vy: number; life: number; max: number };

function Galaxy({
  progressRef,
  hotRef,
  flashRef,
  hitRef,
}: {
  progressRef: MutableRefObject<number>;
  hotRef: MutableRefObject<boolean>;
  flashRef: MutableRefObject<number>;
  hitRef: MutableRefObject<HitInfo>;
}) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = glRef.current;
    const ring = ringRef.current;
    if (!canvas || !ring) return;

    /* ---- device tier: scale quality to the hardware (decided BEFORE the
            GL context is created so we can pick the right power profile) ---- */
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const lite = window.innerWidth < 700;
    const cores = nav.hardwareConcurrency || 4;
    const mem = nav.deviceMemory || 4;
    const saveData = !!nav.connection?.saveData;
    // ultra: the lightest tier (cheap phones, data-saver mode) – no bloom, no
    // decorative layers, very low particle count and resolution
    const ultra = saveData || mem <= 2 || (lite && (cores <= 4 || mem <= 3));
    // weak: every phone + any low-core / low-RAM machine
    const weak = ultra || lite || cores <= 4 || mem <= 4;
    const density = ultra ? 0.1 : weak ? 0.2 : 1;
    const baseDpr = ultra ? 0.6 : weak ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.75);
    let q = 1; // dynamic resolution multiplier – only ever goes down

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: weak ? "default" : "high-performance",
      // refuse software rendering: a CSS background is far better than a slideshow
      failIfMajorPerformanceCaveat: true,
    }) as WebGLRenderingContext | null;
    const rctx = ring.getContext("2d");
    if (!gl || !rctx) return;

    /* ---- programs ---- */
    const starProg = makeProgram(gl, VERT, FRAG, [
      "aR", "aTheta", "aY", "aSize", "aColor", "aAlpha", "aSeed",
    ]);
    if (!starProg) return;
    const brightProg = ultra ? null : makeProgram(gl, QUAD_VERT, BRIGHT_FRAG, ["aPos"]);
    const blurProg = ultra ? null : makeProgram(gl, QUAD_VERT, BLUR_FRAG, ["aPos"]);
    const compProg = ultra ? null : makeProgram(gl, QUAD_VERT, COMP_FRAG, ["aPos"]);
    const hasPost = !!(brightProg && blurProg && compProg);

    const uloc = (p: WebGLProgram, names: string[]) => {
      const o: Record<string, WebGLUniformLocation | null> = {};
      names.forEach((n) => (o[n] = gl.getUniformLocation(p, n)));
      return o;
    };

    gl.useProgram(starProg);
    const U = {} as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
    UNIFORMS.forEach((n) => (U[n] = gl.getUniformLocation(starProg, n)));
    const maxPt = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64;
    gl.uniform1f(U.uMaxPt, weak ? Math.min(maxPt, 40) : maxPt);
    gl.uniform1i(U.uNoise, 4); // baked cloud noise lives on texture unit 4

    const BU = brightProg ? uloc(brightProg, ["uTex", "uTexel", "uThresh", "uKnee"]) : {};
    const LU = blurProg ? uloc(blurProg, ["uTex", "uDir"]) : {};
    const CU = compProg
      ? uloc(compProg, ["uScene", "uBloom1", "uBloom2", "uStreak", "uStreakAmt", "uExpo", "uBloomAmt", "uTime", "uFade", "uRes"])
      : {};

    const quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const setAttribs = (n: number) => {
      for (let i = 0; i < 7; i++) {
        if (i < n) gl.enableVertexAttribArray(i);
        else gl.disableVertexAttribArray(i);
      }
    };

    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    /* ---- particles are generated in small slices across frames ---- */
    const sets: StarSet[] = [];
    const noise: { tex: WebGLTexture | null } = { tex: null };
    const first: (() => void)[] = ultra
      ? []
      : [
          () => {
            noise.tex = makeNoiseTexture(gl);
          },
        ];
    const steps: (() => void)[] = first.concat(buildSteps(gl, density, sets, ultra));
    let stepIdx = 0;
    let building = true;

    /* ---- render targets for the bloom chain ---- */
    let scene: Target | null = null;
    let halfA: Target | null = null;
    let halfB: Target | null = null;
    let quarterA: Target | null = null;
    let quarterB: Target | null = null;
    let streakA: Target | null = null;
    let streakB: Target | null = null;
    let usePost = false;
    let hdr = false;

    const extHF = gl.getExtension("OES_texture_half_float");
    const extHFL = gl.getExtension("OES_texture_half_float_linear");
    const extCB = gl.getExtension("EXT_color_buffer_half_float");
    const canHDR = !!(extHF && extHFL && extCB);

    const freeTargets = () =>
      [scene, halfA, halfB, quarterA, quarterB, streakA, streakB].forEach((t) => destroyTarget(gl, t));

    const buildTargets = () => {
      freeTargets();
      scene = halfA = halfB = quarterA = quarterB = streakA = streakB = null;
      if (!hasPost) {
        usePost = false; // ultra tier: render straight to the screen, zero extra memory
        return;
      }
      const W = canvas.width;
      const H = canvas.height;
      const make = (type: number) => {
        scene = createTarget(gl, W, H, type);
        halfA = createTarget(gl, Math.max(1, W >> 1), Math.max(1, H >> 1), type);
        halfB = createTarget(gl, Math.max(1, W >> 1), Math.max(1, H >> 1), type);
        quarterA = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
        quarterB = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
        // light-streak buffers are only used on strong devices
        if (!weak) {
          streakA = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
          streakB = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
          return !!(scene && halfA && halfB && quarterA && quarterB && streakA && streakB);
        }
        return !!(scene && halfA && halfB && quarterA && quarterB);
      };
      hdr = false;
      let ok = false;
      if (canHDR && extHF) {
        ok = make(extHF.HALF_FLOAT_OES);
        hdr = ok;
        if (!ok) freeTargets();
      }
      if (!ok) ok = make(gl.UNSIGNED_BYTE);
      usePost = ok;
    };

    /* ---- sizing ---- */
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const nd = baseDpr * q;
      // ignore no-op resizes (mobile URL bar show/hide fires "resize" while scrolling)
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ring.width = canvas.width;
      ring.height = canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      buildTargets();
    };
    resize();
    // debounced: rotating a phone / resizing a window must not rebuild GPU buffers 60x per second
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    window.addEventListener("resize", onResize);

    /* ---- mouse parallax (mouse only – touch drags must not shake the camera) ---- */
    let mxT = 0;
    let myT = 0;
    let mx = 0;
    let my = 0;
    const onMouse = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mxT = (e.clientX / window.innerWidth - 0.5) * 2;
      myT = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!weak) window.addEventListener("pointermove", onMouse, { passive: true });

    /* ---- visibility + cinematic intro (starts when the section scrolls in) ---- */
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const INTRO = reduced ? 0.01 : ultra ? 2.5 : 5.5;
    let visible = typeof IntersectionObserver === "undefined";
    let introStart = visible ? performance.now() : -1;
    let raf = 0;
    let last = performance.now();
    let lost = false;

    /** the loop fully stops while the section is off-screen and restarts here */
    const start = () => {
      if (!raf && !lost) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    // GPU context lost (common on low-memory phones): stop cleanly, the CSS
    // gradient behind the canvas keeps the section looking fine
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                visible = e.isIntersecting;
                if (e.isIntersecting) {
                  if (e.intersectionRatio >= 0.2 && introStart < 0) introStart = performance.now();
                  start();
                }
              }
            },
            { threshold: [0, 0.2] }
          )
        : null;
    io?.observe(canvas);

    /* ---- shooting stars (2D overlay) ---- */
    const shooters: Shooter[] = [];
    let nextShoot = 6;
    let ringDirty = false;

    /* ---- animation loop ---- */
    const STRIDE = 36;
    let t = 0;
    let spinAcc = 0;
    let glow = 0;
    let slow = 0;
    const fov = Math.PI / 4;

    const pump = (budget: number) => {
      const t0 = performance.now();
      do {
        steps[stepIdx++]();
      } while (stepIdx < steps.length && performance.now() - t0 < budget);
      if (stepIdx >= steps.length) {
        building = false;
        // the intro should play on a finished galaxy, not on an empty sky
        if (introStart >= 0) introStart = performance.now();
      }
    };

    const drawSet = (s: StarSet, boost: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, s.buf);
      gl.vertexAttribPointer(0, 1, gl.FLOAT, false, STRIDE, 0);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, STRIDE, 4);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE, 8);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE, 12);
      gl.vertexAttribPointer(4, 3, gl.FLOAT, false, STRIDE, 16);
      gl.vertexAttribPointer(5, 1, gl.FLOAT, false, STRIDE, 28);
      gl.vertexAttribPointer(6, 1, gl.FLOAT, false, STRIDE, 32);
      gl.blendFunc(gl.ONE, s.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(U.uSpin, spinAcc * s.spin);
      gl.uniform1f(U.uDiff, s.diff);
      gl.uniform1f(U.uWarp, s.warp);
      gl.uniform1f(U.uJitter, s.jitter);
      gl.uniform1f(U.uTwinkle, s.twinkle);
      gl.uniform1f(U.uTwSpeed, s.twSpeed);
      gl.uniform1f(U.uSizeMul, s.sizeMul);
      gl.uniform1f(U.uSpike, s.spike);
      gl.uniform1f(U.uRadial, s.radial);
      gl.uniform1f(U.uCloud, s.cloud);
      gl.uniform1f(U.uBoost, s.additive ? boost : 0);
      gl.drawArrays(gl.POINTS, 0, s.count);
    };

    const bindTex = (unit: number, tex: WebGLTexture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    };
    const toTarget = (tg: Target | null, W: number, H: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tg ? tg.fb : null);
      gl.viewport(0, 0, W, H);
    };
    const drawQuad = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const frame = (now: number) => {
      raf = 0;
      if (lost) return;

      // generate the galaxy a few ms per frame (even while off-screen)
      if (building) pump(weak ? 4 : 6);

      if (!visible) {
        last = now;
        slow = 0;
        if (building) raf = requestAnimationFrame(frame);
        return; // off-screen and finished: loop stops completely until it scrolls back in
      }
      raf = requestAnimationFrame(frame);

      const ms = now - last;
      if (weak && ms < 28) return; // cap weak devices at ~30fps = steady, no judder

      // 20 slow frames in a row -> render fewer pixels (auto-adaptive resolution)
      if (ms < 120) {
        slow = ms > (weak ? 45 : 26) ? slow + 1 : 0;
        if (slow >= (weak ? 12 : 20) && q > 0.5) {
          q = Math.max(0.5, q - 0.15);
          slow = 0;
          resize();
        }
      }

      const dt = Math.min(ms / 1000, 0.05);
      last = now;

      const p = progressRef.current;
      const hot = hotRef.current;
      const flash = flashRef.current;
      flashRef.current = Math.max(0, flash - dt * 1.8);

      /* intro: 0 -> 1 */
      const it = introStart < 0 || building ? 0 : clamp((now - introStart) / 1000 / INTRO);
      const reveal = it * it * (3 - 2 * it);
      const intro = 1 - easeOutCubic(it);

      t += dt;
      spinAcc += dt * (0.035 + p * 0.12 + (hot ? 0.25 : 0) + intro * 0.9);
      glow += ((hot ? 1 : 0) - glow) * Math.min(1, dt * 6);
      const boost = glow + flash;

      mx += (mxT - mx) * Math.min(1, dt * 2.5);
      my += (myT - my) * Math.min(1, dt * 2.5);

      /* camera: slowly drifts, reacts to the mouse, opens up while scrolling,
         and pulls back from the core during the intro */
      const aspect = w / h;
      const dist =
        ((1 / (2 * Math.tan(fov / 2))) * h) / (0.42 * Math.min(w, h)) *
        (1 - p * 0.07) * (1 - intro * 0.3);
      const pitch = 0.62 + 0.14 * p + my * 0.06 + intro * 0.5;
      const yaw = Math.sin(t * 0.07) * 0.16 + mx * 0.14 + intro * 0.5;
      const roll = -0.3 + Math.sin(t * 0.05) * 0.02;

      const view = mul(trans(0, 0, -dist), mul(rotZ(roll), mul(rotX(pitch), rotY(yaw))));
      const mvp = mul(persp(fov, aspect, 0.05, 50), view);

      // hand the camera to the drag logic (it builds the hit polygon only when needed)
      const hi = hitRef.current;
      hi.mvp = mvp;
      hi.w = w;
      hi.h = h;

      /* ---------- pass 1: the stars ---------- */
      const sc = scene as Target | null;
      if (usePost && sc) toTarget(sc, sc.w, sc.h);
      else toTarget(null, canvas.width, canvas.height);
      gl.useProgram(starProg);
      setAttribs(7);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniformMatrix4fv(U.uMVP, false, mvp);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uReveal, reveal);
      gl.uniform1f(U.uPx, canvas.height / (2 * Math.tan(fov / 2)));
      for (const s of sets) drawSet(s, boost);

      /* ---------- passes 2..n: bloom + light streak + grade ---------- */
      const hA = halfA as Target | null;
      const hB = halfB as Target | null;
      const qA = quarterA as Target | null;
      const qB = quarterB as Target | null;
      const sA = streakA as Target | null;
      const sB = streakB as Target | null;
      const streakOn = !weak && !!(sA && sB);
      if (usePost && sc && hA && hB && qA && qB && brightProg && blurProg && compProg) {
        gl.disable(gl.BLEND);
        setAttribs(1);

        const bright = (src: Target, dst: Target, thresh: number, knee: number) => {
          toTarget(dst, dst.w, dst.h);
          gl.useProgram(brightProg);
          bindTex(0, src.tex);
          gl.uniform1i(BU.uTex, 0);
          gl.uniform2f(BU.uTexel, 1 / src.w, 1 / src.h);
          gl.uniform1f(BU.uThresh, thresh);
          gl.uniform1f(BU.uKnee, knee);
          drawQuad();
        };
        const blur = (src: Target, dst: Target, dx: number, dy: number) => {
          toTarget(dst, dst.w, dst.h);
          gl.useProgram(blurProg);
          bindTex(0, src.tex);
          gl.uniform1i(LU.uTex, 0);
          gl.uniform2f(LU.uDir, dx, dy);
          drawQuad();
        };

        // tight glow (half res)
        bright(sc, hA, hdr ? 0.9 : 0.5, hdr ? 1.4 : 0.5);
        blur(hA, hB, 1 / hA.w, 0);
        blur(hB, hA, 0, 1 / hA.h);
        // wide, dreamy halo (quarter res)
        bright(hA, qA, -1, 1);
        blur(qA, qB, 1.8 / qA.w, 0);
        blur(qB, qA, 0, 1.8 / qA.h);
        if (!weak) {
          blur(qA, qB, 2.6 / qA.w, 0);
          blur(qB, qA, 0, 2.6 / qA.h);
        }
        // anamorphic streak: only the very brightest points, smeared sideways
        if (streakOn && sA && sB) {
          bright(sc, sA, hdr ? 2.2 : 0.85, hdr ? 2.0 : 0.15);
          blur(sA, sB, 3 / sA.w, 0);
          blur(sB, sA, 7 / sA.w, 0);
          blur(sA, sB, 16 / sA.w, 0);
        }

        // final grade -> screen
        toTarget(null, canvas.width, canvas.height);
        gl.useProgram(compProg);
        bindTex(0, sc.tex);
        bindTex(1, hA.tex);
        bindTex(2, qA.tex);
        bindTex(3, (streakOn && sB ? sB : qA).tex);
        gl.uniform1i(CU.uScene, 0);
        gl.uniform1i(CU.uBloom1, 1);
        gl.uniform1i(CU.uBloom2, 2);
        gl.uniform1i(CU.uStreak, 3);
        gl.uniform1f(CU.uBloomAmt, (hdr ? 0.55 : 0.85) + boost * 0.7);
        gl.uniform1f(CU.uStreakAmt, streakOn ? (hdr ? 0.5 : 0.35) + boost * 0.5 : 0);
        gl.uniform1f(CU.uExpo, hdr ? 1.0 : 1.12);
        gl.uniform1f(CU.uTime, t);
        gl.uniform1f(CU.uFade, 1);
        gl.uniform2f(CU.uRes, canvas.width, canvas.height);
        drawQuad();
        gl.activeTexture(gl.TEXTURE0);
      }

      /* shooting stars spawn */
      if (!reduced && !weak && it > 0.9) {
        nextShoot -= dt;
        if (nextShoot <= 0) {
          const ang = rand(0.25, 0.6);
          const sp = rand(900, 1500);
          const dir = Math.random() < 0.5 ? 1 : -1;
          shooters.push({
            x: rand(w * 0.1, w * 0.9),
            y: rand(h * 0.04, h * 0.45),
            vx: Math.cos(ang) * sp * dir,
            vy: Math.sin(ang) * sp,
            life: 0,
            max: rand(0.6, 1.0),
          });
          nextShoot = rand(3.5, 8);
        }
      }

      /* 2D overlay: drop-zone ring + ripple + shooting stars.
         Only touched when there is something to draw (or to erase). */
      const wantPoly = glow > 0.02 || flash > 0.01;
      const anyOverlay = shooters.length > 0 || wantPoly;
      if (anyOverlay || ringDirty) {
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rctx.clearRect(0, 0, w, h);

        for (let i = shooters.length - 1; i >= 0; i--) {
          const s = shooters[i];
          s.life += dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const k = s.life / s.max;
          if (k >= 1) {
            shooters.splice(i, 1);
            continue;
          }
          const a = Math.sin(k * Math.PI);
          const g = rctx.createLinearGradient(s.x - s.vx * 0.14, s.y - s.vy * 0.14, s.x, s.y);
          g.addColorStop(0, "rgba(160,200,255,0)");
          g.addColorStop(1, `rgba(235,245,255,${(0.9 * a).toFixed(3)})`);
          rctx.strokeStyle = g;
          rctx.lineWidth = 1.6;
          rctx.lineCap = "round";
          rctx.beginPath();
          rctx.moveTo(s.x - s.vx * 0.14, s.y - s.vy * 0.14);
          rctx.lineTo(s.x, s.y);
          rctx.stroke();
          rctx.beginPath();
          rctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
          rctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
          rctx.shadowColor = "rgba(160,200,255,0.9)";
          rctx.shadowBlur = weak ? 0 : 10;
          rctx.fill();
          rctx.shadowBlur = 0;
        }

        if (wantPoly) {
          const poly = galaxyPoly(mvp, w, h);

          if (glow > 0.02) {
            rctx.beginPath();
            poly.forEach(([x, y], i) => (i ? rctx.lineTo(x, y) : rctx.moveTo(x, y)));
            rctx.closePath();
            rctx.fillStyle = `rgba(59,130,246,${0.07 * glow})`;
            rctx.fill();
            rctx.strokeStyle = `rgba(110,180,255,${0.35 + 0.6 * glow})`;
            rctx.lineWidth = 2;
            rctx.shadowColor = "rgba(59,130,246,0.9)";
            rctx.shadowBlur = weak ? 0 : 30 * glow;
            rctx.stroke();
            rctx.shadowBlur = 0;
          }
          if (flash > 0.01) {
            const [cx, cy] = project(mvp, 0, 0, 0, w, h);
            const s = 0.3 + (1 - flash) * 1.0;
            rctx.beginPath();
            poly.forEach(([x, y], i) => {
              const px = cx + (x - cx) * s;
              const py = cy + (y - cy) * s;
              if (i) rctx.lineTo(px, py);
              else rctx.moveTo(px, py);
            });
            rctx.closePath();
            rctx.strokeStyle = `rgba(130,195,255,${(flash * 0.75).toFixed(3)})`;
            rctx.lineWidth = 2 + flash * 5;
            rctx.stroke();
          }
        }
      }
      ringDirty = anyOverlay;
    };
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lost = true;
      window.clearTimeout(resizeTimer);
      io?.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMouse);
      sets.forEach((s) => gl.deleteBuffer(s.buf));
      if (noise.tex) gl.deleteTexture(noise.tex);
      freeTargets();
      gl.deleteBuffer(quad);
      gl.deleteProgram(starProg);
      if (brightProg) gl.deleteProgram(brightProg);
      if (blurProg) gl.deleteProgram(blurProg);
      if (compProg) gl.deleteProgram(compProg);
      // hand the GPU memory back immediately (matters on low-RAM phones)
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [progressRef, hotRef, flashRef, hitRef]);

  const fill = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none" as const,
  };

  return (
    <>
      <canvas ref={glRef} aria-hidden="true" style={{ ...fill, zIndex: 1 }} />
      <canvas ref={ringRef} aria-hidden="true" style={{ ...fill, zIndex: 2 }} />
    </>
  );
}

/** memoised so UI state updates never re-render the galaxy layer */
const GalaxyLayer = memo(Galaxy);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/*                                                                     */
/*  PERF: card positions, scroll progress and drag offsets live in     */
/*  refs and are written straight to the DOM (transform / opacity).    */
/*  React state is only used for things that really change the markup  */
/*  (hint text, mute icon, compact layout), so scrolling and dragging  */
/*  never re-render the whole component every frame.                   */
/* ------------------------------------------------------------------ */
const SHADOW_IDLE = "0 0 22px rgba(37,99,235,0.55), inset 0 0 12px rgba(37,99,235,0.2)";
const SHADOW_DRAG = "0 0 38px rgba(59,130,246,0.95), inset 0 0 18px rgba(59,130,246,0.35)";
// phones: smaller blur radius, no inset layer = far cheaper to paint
const SHADOW_IDLE_LITE = "0 0 10px rgba(37,99,235,0.5)";
const SHADOW_DRAG_LITE = "0 0 18px rgba(59,130,246,0.9)";
const CARD_TRANSITION = "transform 0.45s cubic-bezier(.2,.8,.2,1), opacity 0.45s";

/* Real viewport units: `svh` stays constant while the mobile URL bar shows /
   hides, so the stage never resizes mid-scroll (which would rebuild the GPU
   buffers and cause jank). `vh` is the fallback for older browsers. */
const CSS = `
.st-sec{position:relative;height:320vh;height:320svh;background:#000;overflow-x:clip}
.st-stage{position:sticky;top:0;width:100%;height:100vh;height:100svh;overflow:hidden;contain:layout paint;
  -webkit-tap-highlight-color:transparent;
  background:radial-gradient(ellipse 60% 45% at 25% 22%,rgba(88,40,160,.2),transparent 70%),
  radial-gradient(ellipse 55% 40% at 78% 74%,rgba(20,70,200,.2),transparent 70%),
  radial-gradient(ellipse at center,#050b24 0%,#02040f 55%,#000 100%)}
.st-card{position:absolute;left:50%;top:50%;opacity:0;pointer-events:none;cursor:grab;touch-action:none;
  user-select:none;-webkit-user-select:none;border-radius:18px;background:rgba(4,10,32,.82);
  border:1px solid rgba(59,130,246,.75);color:#e6efff;will-change:transform,opacity;box-sizing:border-box}
.st-btn{position:absolute;z-index:60;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
  cursor:pointer;color:#93b4ff;background:rgba(4,10,32,.85);border:1px solid rgba(59,130,246,.6);padding:0}
.st-btn:focus-visible{outline:2px solid #93b4ff;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.st-card{transition:none!important}}
`;

type DragState = { id: number; sx: number; sy: number; ox: number; oy: number; cx: number; cy: number };

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const lastTransform = useRef<string[]>([]);
  const lastMeta = useRef<string[]>([]);

  const progressRef = useRef(0);
  const hotRef = useRef(false);
  const flashRef = useRef(0);
  const hitRef = useRef<HitInfo>({ mvp: null, w: 0, h: 0 });

  const sizeRef = useRef({ w: 1200, h: 800 });
  const stageHRef = useRef(0);
  const mobileRef = useRef(false);
  const compactRef = useRef(false);
  const offsetsRef = useRef<Record<number, { x: number; y: number }>>({});
  const dismissedRef = useRef<Set<number>>(new Set());
  const draggingRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragRaf = useRef(0);

  const [near, setNear] = useState(false);
  const [compact, setCompact] = useState(false); // phones + short landscape screens
  const [early, setEarly] = useState(true); // p < 0.08 -> "scroll down" hint
  const [dismissedCount, setDismissedCount] = useState(0);
  const [hot, setHot] = useState(false);
  const [muted, setMuted] = useState(false);

  const [sound] = useState(createGalaxySound);

  const cardW = compact ? 220 : 290;

  /* ---- geometry helpers (all ref based, so they never go stale) ---- */
  const basePos = useCallback((r: Review) => {
    const { w, h } = sizeRef.current;
    const e = cardEase(r.id, progressRef.current);
    const fx = mobileRef.current ? r.mx : r.fx;
    const fy = mobileRef.current ? r.my : r.fy;
    return { x: fx * w * e, y: fy * h * e, e };
  }, []);

  const isInteractive = useCallback(
    (r: Review) => !dismissedRef.current.has(r.id) && cardEase(r.id, progressRef.current) > 0.95,
    []
  );

  /** is a point (stage coordinates) over the 3D galaxy disc? */
  const inGalaxy = useCallback((cx: number, cy: number) => {
    const hi = hitRef.current;
    if (hi.mvp) return pointInPoly(cx, cy, galaxyPoly(hi.mvp, hi.w, hi.h));
    const { w, h } = sizeRef.current;
    return Math.hypot(cx - w / 2, cy - h / 2) < Math.min(w, h) * 0.34 * 0.9;
  }, []);

  /** write one card's position / look straight to the DOM.
   *  Only transform + opacity change while scrolling; the other style
   *  properties are written only when their value actually changes. */
  const applyCard = useCallback(
    (r: Review) => {
      const el = cardEls.current[r.id];
      if (!el) return;
      const b = basePos(r);
      const isDismissed = dismissedRef.current.has(r.id);
      const off = offsetsRef.current[r.id];
      const isDragging = draggingRef.current === r.id;

      const x = isDismissed ? 0 : b.x + (off ? off.x : 0);
      const y = isDismissed ? 0 : b.y + (off ? off.y : 0);
      const scale = isDismissed ? 0 : 0.15 + 0.85 * b.e;
      const rot = (1 - b.e) * (r.id % 2 ? -540 : 540) + r.tilt * b.e;

      const tf = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${(isDragging ? scale * 1.05 : scale).toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      if (lastTransform.current[r.id] !== tf) {
        lastTransform.current[r.id] = tf;
        el.style.transform = tf;
        el.style.opacity = (isDismissed ? 0 : b.e).toFixed(2);
      }

      const interactive = !isDismissed && b.e > 0.95;
      const meta = `${interactive ? 1 : 0}${isDragging ? 1 : 0}${compactRef.current ? 1 : 0}`;
      if (lastMeta.current[r.id] !== meta) {
        lastMeta.current[r.id] = meta;
        el.style.pointerEvents = interactive ? "auto" : "none";
        el.style.cursor = isDragging ? "grabbing" : "grab";
        el.style.zIndex = isDragging ? "50" : "10";
        el.style.transition = isDragging ? "none" : CARD_TRANSITION;
        el.style.boxShadow = compactRef.current
          ? isDragging ? SHADOW_DRAG_LITE : SHADOW_IDLE_LITE
          : isDragging ? SHADOW_DRAG : SHADOW_IDLE;
      }
    },
    [basePos]
  );

  const applyAll = useCallback(() => {
    REVIEWS.forEach(applyCard);
  }, [applyCard]);

  /* ---- only create the galaxy (WebGL context + particles) when the
          section is about to scroll into view, so page load stays fast ---- */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---- sound: hum while hovering over the galaxy, cleanup on unmount ---- */
  useEffect(() => {
    if (hot) sound.startHover();
    else sound.stopHover();
  }, [hot, sound]);

  useEffect(() => {
    return () => sound.dispose();
  }, [sound]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    if (!next) sound.unlock();
  };

  /* ---- scroll progress (no React re-render, DOM written directly) ---- */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // use the real (stable) stage height so progress always reaches exactly 0..1,
      // even when the mobile URL bar changes window.innerHeight
      const total = rect.height - (stageHRef.current || window.innerHeight);
      const v = total > 0 ? clamp(-rect.top / total) : 0;
      const prev = progressRef.current;
      progressRef.current = v;
      // skip tiny changes so we don't touch the DOM for sub-pixel scroll
      if (Math.abs(v - prev) <= 0.0005 && v !== 0 && v !== 1) return;

      setEarly(v < 0.08); // no-op unless the value actually flips

      // back at the start: everything returns to the galaxy
      if (v < 0.01 && (dismissedRef.current.size > 0 || Object.keys(offsetsRef.current).length > 0)) {
        dismissedRef.current = new Set();
        offsetsRef.current = {};
        setDismissedCount(0);
      }

      if (headingRef.current) headingRef.current.style.opacity = clamp(0.35 + v * 2).toFixed(2);
      applyAll();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [applyAll]);

  /* ---- stage size ---- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      sizeRef.current = { w, h };
      stageHRef.current = h;
      const m = w < 700;
      mobileRef.current = m; // phone card layout
      const c = m || h < 520; // phones AND short landscape screens get smaller cards
      compactRef.current = c;
      setCompact(c); // no-op unless it flips
      applyAll();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyAll]);

  useEffect(() => {
    return () => {
      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
    };
  }, []);

  /* ---- drag handlers ---- */
  const processDrag = useCallback(() => {
    dragRaf.current = 0;
    const d = dragRef.current;
    if (!d) return;
    const r = REVIEWS[d.id];
    const off = { x: d.ox + (d.cx - d.sx), y: d.oy + (d.cy - d.sy) };
    offsetsRef.current[r.id] = off;

    const { w, h } = sizeRef.current;
    const b = basePos(r);
    const over = inGalaxy(w / 2 + b.x + off.x, h / 2 + b.y + off.y);
    if (over !== hotRef.current) {
      hotRef.current = over;
      setHot(over);
    }
    applyCard(r);
  }, [basePos, inGalaxy, applyCard]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
    if (!isInteractive(r)) return;
    sound.unlock(); // browsers only allow audio after a user gesture
    e.currentTarget.setPointerCapture(e.pointerId);
    const o = offsetsRef.current[r.id] ?? { x: 0, y: 0 };
    dragRef.current = { id: r.id, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, cx: e.clientX, cy: e.clientY };
    draggingRef.current = r.id;
    applyCard(r);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
    const d = dragRef.current;
    if (!d || d.id !== r.id) return;
    d.cx = e.clientX;
    d.cy = e.clientY;
    // coalesce high-frequency pointer events into one update per frame
    if (!dragRaf.current) dragRaf.current = requestAnimationFrame(processDrag);
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
    const d = dragRef.current;
    if (!d || d.id !== r.id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (dragRaf.current) {
      cancelAnimationFrame(dragRaf.current);
      dragRaf.current = 0;
    }
    processDrag(); // settle on the final pointer position

    if (hotRef.current) {
      // swallowed by the galaxy – hidden until the user scrolls back to the top
      dismissedRef.current.add(r.id);
      setDismissedCount(dismissedRef.current.size);
      flashRef.current = 1;
      sound.swallow(); // 🔊 warp whoosh + bloop + sub thump + chime
    }
    dragRef.current = null;
    draggingRef.current = null;
    hotRef.current = false;
    setHot(false);
    applyCard(r);
  };

  /* ---- render ---- */
  return (
    <section ref={sectionRef} className="st-sec" aria-label="Client testimonials">
      <style>{CSS}</style>
      <div ref={stageRef} className="st-stage">
        {near && (
          <GalaxyLayer
            progressRef={progressRef}
            hotRef={hotRef}
            flashRef={flashRef}
            hitRef={hitRef}
          />
        )}

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
            padding: "0 56px", // keeps the title clear of the mute button on narrow screens
            willChange: "opacity",
          }}
        >
          <p
            style={{
              margin: 0,
              letterSpacing: "0.3em",
              fontSize: 12,
              color: "#60a5fa",
              textTransform: "uppercase",
            }}
          >
            Testimonials
          </p>
          <h2
            style={{
              margin: "6px 0 0",
              fontSize: "clamp(22px, 6.2vw, 44px)",
              lineHeight: 1.15,
              fontWeight: 800,
              color: "#fff",
              // glow is a big repaint on phones, so it is only used on larger screens
              textShadow: compact ? "none" : "0 0 24px rgba(59,130,246,0.9)",
            }}
          >
            What Our Clients Say
          </h2>
        </div>

        {/* review cards – transform / opacity / shadow / z-index / cursor are
            written imperatively by applyCard(); the values below are only the
            constant starting state and React never overwrites them */}
        {REVIEWS.map((r) => (
          <div
            key={r.id}
            ref={(el) => {
              cardEls.current[r.id] = el;
            }}
            className="st-card"
            onPointerDown={(e) => onDown(e, r)}
            onPointerMove={(e) => onMove(e, r)}
            onPointerUp={(e) => onUp(e, r)}
            onPointerCancel={(e) => onUp(e, r)}
            style={{
              width: `min(${cardW}px, ${compact ? 66 : 90}vw)`,
              transform: "translate3d(-50%, -50%, 0) scale(0.15)",
              transition: CARD_TRANSITION,
              zIndex: 10,
              padding: compact ? 12 : 18,
              boxShadow: compact ? SHADOW_IDLE_LITE : SHADOW_IDLE,
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
                ...(compact
                  ? {
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }
                  : null),
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
  );
}