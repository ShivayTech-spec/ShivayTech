"use client";

import { useEffect, useRef, useState } from "react";
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
    name: "Client Name",
    role: "Founder, Company",
    text: "ShivayTech delivered our website ahead of schedule and the quality blew us away. Highly recommended!",
    rating: 5,
    fx: -0.31, fy: -0.27, mx: -0.16, my: -0.36, tilt: -4,
  },
  {
    id: 1,
    name: "Client Name",
    role: "CEO, Company",
    text: "Professional team, clean design and great communication from start to finish.",
    rating: 5,
    fx: 0.31, fy: -0.29, mx: 0.16, my: -0.22, tilt: 3,
  },
  {
    id: 2,
    name: "Client Name",
    role: "Marketing Head",
    text: "Our traffic and leads went up after the redesign. The attention to detail is unreal.",
    rating: 5,
    fx: -0.36, fy: 0.06, mx: -0.16, my: -0.08, tilt: 5,
  },
  {
    id: 3,
    name: "Client Name",
    role: "Store Owner",
    text: "Fast, reliable and creative. They understood our idea and made it even better.",
    rating: 4,
    fx: 0.36, fy: 0.08, mx: 0.16, my: 0.06, tilt: -3,
  },
  {
    id: 4,
    name: "Client Name",
    role: "Startup Founder",
    text: "From design to launch, everything was smooth. Support after delivery was excellent too.",
    rating: 5,
    fx: -0.21, fy: 0.34, mx: -0.16, my: 0.2, tilt: -2,
  },
  {
    id: 5,
    name: "Client Name",
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
/*  • a suction sweep + deep boom + sparkles when it gets swallowed    */
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

      // synthetic "deep space" reverb tail
      const len = Math.floor(ctx.sampleRate * 2.4);
      const imp = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = imp.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
        }
      }
      reverb = ctx.createConvolver();
      reverb.buffer = imp;
      const wet = ctx.createGain();
      wet.gain.value = 0.4;
      reverb.connect(wet);
      wet.connect(master);

      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
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
      const t = c.currentTime;

      const out = c.createGain();
      out.gain.value = 1;
      out.connect(m);
      out.connect(rv);

      /* 1. suction sweep: pitch + filter fall into the core */
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.75);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 6;
      lp.frequency.setValueAtTime(3500, t);
      lp.frequency.exponentialRampToValueAtTime(120, t + 0.75);
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.26, t + 0.05);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      o.connect(lp);
      lp.connect(og);
      og.connect(out);
      o.start(t);
      o.stop(t + 0.9);

      /* 2. air / dust whoosh */
      const n = c.createBufferSource();
      n.buffer = nb;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(2400, t);
      bp.frequency.exponentialRampToValueAtTime(180, t + 0.8);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.34, t + 0.12);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      n.start(t);
      n.stop(t + 1);

      /* 3. deep boom when it reaches the core */
      const b = c.createOscillator();
      b.type = "sine";
      b.frequency.setValueAtTime(110, t + 0.3);
      b.frequency.exponentialRampToValueAtTime(32, t + 1.4);
      const bg = c.createGain();
      bg.gain.setValueAtTime(0.0001, t + 0.3);
      bg.gain.exponentialRampToValueAtTime(0.75, t + 0.34);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      b.connect(bg);
      bg.connect(out);
      b.start(t + 0.3);
      b.stop(t + 1.7);

      /* 4. little star sparkles that bloom after the boom */
      for (let i = 0; i < 7; i++) {
        const st = t + 0.36 + i * 0.05 + Math.random() * 0.05;
        const so = c.createOscillator();
        so.type = "sine";
        so.frequency.value = 1100 + Math.random() * 2600;
        const sg = c.createGain();
        sg.gain.setValueAtTime(0.0001, st);
        sg.gain.exponentialRampToValueAtTime(0.045, st + 0.01);
        sg.gain.exponentialRampToValueAtTime(0.0001, st + 0.5 + Math.random() * 0.4);
        so.connect(sg);
        sg.connect(out);
        so.start(st);
        so.stop(st + 1);
      }
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
  float speed = 1.0 + uDiff * 2.2 * exp(-aR * 5.0);
  float ang = aTheta + uSpin * speed;

  vec3 p = vec3(cos(ang) * aR, aY, sin(ang) * aR);

  // the outer disc is bent like the real Milky Way warp (fixed in space)
  float wa = p.x * 0.825 + p.z * 0.565;
  p.y += uWarp * 0.1 * wa * aR;

  // living, breathing motion
  p += uJitter * 0.012 * vec3(
    sin(uTime * 0.7 + aSeed * 91.0),
    0.5 * sin(uTime * 0.5 + aSeed * 57.0),
    cos(uTime * 0.6 + aSeed * 33.0)
  );

  vec4 clip = uMVP * vec4(p, 1.0);
  gl_Position = clip;

  float tw = 1.0 + uTwinkle * sin(uTime * uTwSpeed * (1.5 + aSeed * 4.0) + aSeed * 60.0);
  // rare bright flares on random stars
  float fl = pow(max(0.0, sin(uTime * 0.25 + aSeed * 400.0)), 60.0);

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

/* Every sprite fades smoothly to zero before the edge of its quad,
   so no hard disc / square outlines are ever visible (that was the
   "lego block" look on the big gas and dust sprites). */
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

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

/* Every sprite fades smoothly to zero before the edge of its quad, so no hard
   outlines show. "Cloud" sprites (nebulae, dust) get a turbulent fbm texture,
   each rotated differently, so overlapping sprites build wispy, irregular gas
   instead of round blobs. */
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
      float n = fbm(rot * c * 3.4 + vSeed * 41.0);
      float body = 1.0 - smoothstep(0.05, 1.0, d);
      f = body * (0.12 + 1.9 * smoothstep(0.25, 0.8, n));
    }
  }
  gl_FragColor = vec4(vColor * f * vAlpha, f * vAlpha);
}
`;

const UNIFORMS = [
  "uMVP", "uTime", "uSpin", "uDiff", "uWarp", "uJitter", "uTwinkle", "uTwSpeed",
  "uSizeMul", "uPx", "uMaxPt", "uBoost", "uSpike", "uReveal", "uRadial", "uCloud",
] as const;

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

class Pts {
  d: number[] = [];
  add(r: number, th: number, y: number, size: number, c: number[], a: number) {
    this.d.push(r, th, y, size, c[0], c[1], c[2], a, Math.random());
  }
  get count() {
    return this.d.length / 9;
  }
}

function buildSets(gl: WebGLRenderingContext, lite: boolean): StarSet[] {
  const k = lite ? 0.5 : 1;
  const sets: StarSet[] = [];
  const clumps = makeClumps(lite ? 260 : 520);
  const clump = () => inClump(clumps[(Math.random() * clumps.length) | 0]);

  const finish = (
    pts: Pts,
    o: Partial<Omit<StarSet, "buf" | "count">>
  ) => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts.d), gl.STATIC_DRAW);
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
  {
    const p = new Pts();
    const n = Math.floor(3000 * k);
    for (let i = 0; i < n; i++) {
      const rr = rand(3.5, 9);
      const phi = Math.acos(rand(-1, 1));
      const th = Math.random() * Math.PI * 2;
      const rxz = rr * Math.sin(phi);
      const tint = Math.random();
      const col = tint < 0.65 ? [0.8, 0.88, 1] : tint < 0.85 ? [1, 0.9, 0.78] : [0.85, 0.8, 1];
      // most are faint, very few are bright (like a real magnitude distribution)
      const a = 0.12 + Math.pow(Math.random(), 3) * 0.85;
      p.add(rxz, th, rr * Math.cos(phi), rand(0.01, 0.026) * (rr / 4), col, a);
    }
    finish(p, { spin: 0, diff: 0, warp: 0, twinkle: 0.35, radial: 0 });
  }

  /* 2. faint halo of old stars around the galaxy (gives real depth) */
  {
    const p = new Pts();
    const n = Math.floor(3200 * k);
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
    finish(p, { spin: 0.2, diff: 0, warp: 0, twinkle: 0.2 });
  }

  /* 3. glowing gas + unresolved starlight (many very faint, very soft sprites
        that melt together into a smooth luminous cloud) */
  {
    const p = new Pts();
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
    // soft warm-white glow of countless unresolved stars across the whole disc
    const m = Math.floor(3500 * k);
    for (let i = 0; i < m; i++) {
      const r = clamp(expR(0.3), 0.02, 1);
      const onArm = Math.random() < 0.55;
      const th = onArm ? armTheta(pickArm(), r) + gauss() * (0.16 + 0.2 * r) : Math.random() * Math.PI * 2;
      const col = mix(CREAM, BLUEW, clamp((r - 0.15) / 0.6));
      p.add(r, th, gauss() * 0.02, rand(0.1, 0.2), col, rand(0.006, 0.014) * (1 - r * 0.4));
    }
    finish(p, { jitter: 0.5 });
  }

  /* 3b. colourful emission nebulae – big soft glowing clouds inside the arms */
  {
    const p = new Pts();
    const n = Math.floor(420 * k);
    const pal = [[1, 0.25, 0.5], [0.25, 0.8, 1], [1, 0.5, 0.2], [0.6, 0.3, 1], [1, 0.3, 0.7]];
    for (let i = 0; i < n; i++) {
      const [r, th] = clump();
      const base = pal[(Math.random() * pal.length) | 0];
      p.add(r, th, gauss() * 0.015, rand(0.14, 0.34) * (0.6 + 0.6 * r), mix(base, hazeColor(r), 0.25), rand(0.02, 0.045));
    }
    finish(p, { jitter: 0.4, twinkle: 0.05, twSpeed: 0.3, cloud: 1 });
  }

  /* 4. the main disc: well over a hundred thousand tiny individual stars.
        Mostly very small + faint so they blend into a continuous glow,
        grouped into clusters so the arms look knotty instead of uniform. */
  {
    const p = new Pts();
    const n = Math.floor(110000 * k);
    for (let i = 0; i < n; i++) {
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
      const size = Math.random() < 0.012 ? rand(0.007, 0.011) : rand(0.0022, 0.0048);
      const a = rand(0.25, 0.8) * (0.4 + 0.6 * Math.min(1, r * 2.2));
      p.add(r, th, gauss() * thick, size, starColor(r), a);
    }
    finish(p, { jitter: 0.35, twinkle: 0.12 });
  }

  /* 5. dark dust lanes along the inner edge of the arms – patchy and
        filamentary (alpha-blended, they really hide the stars behind) */
  {
    const p = new Pts();
    const n = Math.floor(5200 * k);
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
    // dusty ring around the core
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
  }

  /* 6. pink star-forming knots (HII regions) inside the clusters */
  {
    const p = new Pts();
    const n = Math.floor(230 * k);
    for (let i = 0; i < n; i++) {
      const [r, th] = clump();
      const y = gauss() * 0.01;
      const col = Math.random() < 0.5 ? [1, 0.35, 0.7] : [1, 0.5, 0.8];
      p.add(r, th, y, rand(0.02, 0.05), col, rand(0.18, 0.4));
      p.d.push(r, th, y, 0.007, 1, 0.85, 0.95, 0.8, Math.random());
    }
    finish(p, { twinkle: 0.15, twSpeed: 0.5 });
  }

  /* 6b. young blue giants – bright jewels that glow through the bloom */
  {
    const p = new Pts();
    const n = Math.floor(700 * k);
    for (let i = 0; i < n; i++) {
      const [r, th] = clump();
      p.add(r, th, gauss() * 0.012, rand(0.009, 0.02), mix([0.7, 0.85, 1], [1, 1, 1], Math.random() * 0.6), rand(0.35, 0.9));
    }
    finish(p, { twinkle: 0.3, twSpeed: 0.8 });
  }

  /* 7. dense warm bulge + a subtle central bar */
  {
    const p = new Pts();
    const n = Math.floor(11000 * k);
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
    const bar = Math.floor(2400 * k);
    for (let i = 0; i < bar; i++) {
      const along = gauss() * 0.11;
      const across = gauss() * 0.035;
      const ang = 0.5;
      const x = along * Math.cos(ang) - across * Math.sin(ang);
      const z = along * Math.sin(ang) + across * Math.cos(ang);
      p.add(Math.hypot(x, z), Math.atan2(z, x), gauss() * 0.02, rand(0.004, 0.008), mix(WARM, CREAM, 0.5), rand(0.2, 0.5));
    }
    finish(p, { twinkle: 0.1 });
  }

  /* 8. breathing glow of the galactic core */
  {
    const p = new Pts();
    p.add(0, 0, 0, 0.6, [0.95, 0.5, 0.8], 0.04);
    p.add(0, 0, 0, 0.34, [1, 0.72, 0.55], 0.1);
    p.add(0, 0, 0, 0.16, [1, 0.88, 0.72], 0.26);
    p.add(0, 0, 0, 0.06, [1, 1, 1], 0.55);
    finish(p, { spin: 0, diff: 0, warp: 0, twinkle: 0.1, twSpeed: 0.18 });
  }

  /* 10. companion dwarf galaxies + globular clusters (fixed in space, so they
         drift with the camera parallax and give the scene real depth) */
  {
    const p = new Pts();
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
  }

  /* 11. deep field: distant galaxies as tiny elliptical smudges far behind */
  {
    const p = new Pts();
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
  }

  /* 12. drifting space-dust motes near the camera: soft bokeh for depth */
  {
    const p = new Pts();
    const n = Math.floor(36 * k);
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
  }

  /* 9. a handful of bright foreground stars with soft diffraction spikes */
  {
    const p = new Pts();
    const n = Math.floor(40 * k);
    for (let i = 0; i < n; i++) {
      const r = rand(0.08, 1.2);
      const th = Math.random() * Math.PI * 2;
      const col = Math.random() < 0.6 ? [0.8, 0.9, 1] : [1, 0.9, 0.78];
      p.add(r, th, gauss() * 0.12, rand(0.03, 0.055), col, rand(0.3, 0.65));
    }
    finish(p, { spin: 0.3, diff: 0, warp: 0.5, twinkle: 0.35, spike: 1, radial: 0 });
  }

  return sets;
}

/* ------------------------------------------------------------------ */
/*  Cinematic post-processing: bloom, filmic tone-mapping, vignette    */
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
  hitPolyRef,
}: {
  progressRef: MutableRefObject<number>;
  hotRef: MutableRefObject<boolean>;
  flashRef: MutableRefObject<number>;
  hitPolyRef: MutableRefObject<Pt[]>;
}) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = glRef.current;
    const ring = ringRef.current;
    if (!canvas || !ring) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    }) as WebGLRenderingContext | null;
    const rctx = ring.getContext("2d");
    if (!gl || !rctx) return;

    /* ---- programs ---- */
    const starProg = makeProgram(gl, VERT, FRAG, [
      "aR", "aTheta", "aY", "aSize", "aColor", "aAlpha", "aSeed",
    ]);
    if (!starProg) return;
    const brightProg = makeProgram(gl, QUAD_VERT, BRIGHT_FRAG, ["aPos"]);
    const blurProg = makeProgram(gl, QUAD_VERT, BLUR_FRAG, ["aPos"]);
    const compProg = makeProgram(gl, QUAD_VERT, COMP_FRAG, ["aPos"]);
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
    gl.uniform1f(U.uMaxPt, maxPt);

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

    const lite = window.innerWidth < 700;
    const sets = buildSets(gl, lite);

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

    // half-float targets keep the real brightness of the core and bright stars,
    // so the glow falls off like real light. Falls back to 8-bit when unsupported.
    const extHF = gl.getExtension("OES_texture_half_float");
    const extHFL = gl.getExtension("OES_texture_half_float_linear");
    const extCB = gl.getExtension("EXT_color_buffer_half_float");
    const canHDR = !!(extHF && extHFL && extCB);

    const freeTargets = () =>
      [scene, halfA, halfB, quarterA, quarterB, streakA, streakB].forEach((t) => destroyTarget(gl, t));

    const buildTargets = () => {
      freeTargets();
      const W = canvas.width;
      const H = canvas.height;
      const make = (type: number) => {
        scene = createTarget(gl, W, H, type);
        halfA = createTarget(gl, Math.max(1, W >> 1), Math.max(1, H >> 1), type);
        halfB = createTarget(gl, Math.max(1, W >> 1), Math.max(1, H >> 1), type);
        quarterA = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
        quarterB = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
        streakA = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
        streakB = createTarget(gl, Math.max(1, W >> 2), Math.max(1, H >> 2), type);
        return !!(scene && halfA && halfB && quarterA && quarterB && streakA && streakB);
      };
      hdr = false;
      let ok = false;
      if (canHDR && extHF) {
        ok = make(extHF.HALF_FLOAT_OES);
        hdr = ok;
        if (!ok) freeTargets();
      }
      if (!ok) ok = make(gl.UNSIGNED_BYTE);
      usePost = hasPost && ok;
    };

    /* ---- sizing ---- */
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ring.width = canvas.width;
      ring.height = canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      buildTargets();
    };
    resize();
    window.addEventListener("resize", resize);

    /* ---- mouse parallax ---- */
    let mxT = 0;
    let myT = 0;
    let mx = 0;
    let my = 0;
    const onMouse = (e: PointerEvent) => {
      mxT = (e.clientX / window.innerWidth - 0.5) * 2;
      myT = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMouse, { passive: true });

    /* ---- visibility + cinematic intro (starts when the section scrolls in) ---- */
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const INTRO = reduced ? 0.01 : 5.5;
    let visible = typeof IntersectionObserver === "undefined";
    let introStart = visible ? performance.now() : -1;
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                visible = e.isIntersecting;
                if (e.isIntersecting && e.intersectionRatio >= 0.2 && introStart < 0) {
                  introStart = performance.now();
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

    /* ---- animation loop ---- */
    const STRIDE = 36;
    let t = 0;
    let spinAcc = 0;
    let glow = 0;
    let last = performance.now();
    let raf = 0;
    const fov = Math.PI / 4;

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
      raf = requestAnimationFrame(frame);
      if (!visible) {
        last = now;
        return;
      }

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const p = progressRef.current;
      const hot = hotRef.current;
      const flash = flashRef.current;
      flashRef.current = Math.max(0, flash - dt * 1.8);

      /* intro: 0 -> 1 */
      const it = introStart < 0 ? 0 : clamp((now - introStart) / 1000 / INTRO);
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
      if (usePost && sc && hA && hB && qA && qB && sA && sB && brightProg && blurProg && compProg) {
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
        blur(qA, qB, 2.6 / qA.w, 0);
        blur(qB, qA, 0, 2.6 / qA.h);
        // anamorphic streak: only the very brightest points, smeared sideways
        bright(sc, sA, hdr ? 2.2 : 0.85, hdr ? 2.0 : 0.15);
        blur(sA, sB, 3 / sA.w, 0);
        blur(sB, sA, 7 / sA.w, 0);
        blur(sA, sB, 16 / sA.w, 0);

        // final grade -> screen
        toTarget(null, canvas.width, canvas.height);
        gl.useProgram(compProg);
        bindTex(0, sc.tex);
        bindTex(1, hA.tex);
        bindTex(2, qA.tex);
        bindTex(3, sB.tex);
        gl.uniform1i(CU.uScene, 0);
        gl.uniform1i(CU.uBloom1, 1);
        gl.uniform1i(CU.uBloom2, 2);
        gl.uniform1i(CU.uStreak, 3);
        gl.uniform1f(CU.uBloomAmt, (hdr ? 0.55 : 0.85) + boost * 0.7);
        gl.uniform1f(CU.uStreakAmt, (hdr ? 0.5 : 0.35) + boost * 0.5);
        gl.uniform1f(CU.uExpo, hdr ? 1.0 : 1.12);
        gl.uniform1f(CU.uTime, t);
        gl.uniform1f(CU.uFade, 1);
        gl.uniform2f(CU.uRes, canvas.width, canvas.height);
        drawQuad();
        gl.activeTexture(gl.TEXTURE0);
      }

      /* hit area of the galaxy on screen (used for the "dustbin" drop test) */
      const poly: Pt[] = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        poly.push(project(mvp, Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86, w, h));
      }
      hitPolyRef.current = poly;

      /* 2D overlay: drop-zone ring + ripple + shooting stars */
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rctx.clearRect(0, 0, w, h);

      if (!reduced && it > 0.9) {
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
        rctx.fillStyle = `rgba(255,255,255,${(a).toFixed(3)})`;
        rctx.shadowColor = "rgba(160,200,255,0.9)";
        rctx.shadowBlur = 10;
        rctx.fill();
        rctx.shadowBlur = 0;
      }

      if (glow > 0.02) {
        rctx.beginPath();
        poly.forEach(([x, y], i) => (i ? rctx.lineTo(x, y) : rctx.moveTo(x, y)));
        rctx.closePath();
        rctx.fillStyle = `rgba(59,130,246,${0.07 * glow})`;
        rctx.fill();
        rctx.strokeStyle = `rgba(110,180,255,${0.35 + 0.6 * glow})`;
        rctx.lineWidth = 2;
        rctx.shadowColor = "rgba(59,130,246,0.9)";
        rctx.shadowBlur = 30 * glow;
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
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMouse);
      sets.forEach((s) => gl.deleteBuffer(s.buf));
      freeTargets();
      gl.deleteBuffer(quad);
      gl.deleteProgram(starProg);
      if (brightProg) gl.deleteProgram(brightProg);
      if (blurProg) gl.deleteProgram(blurProg);
      if (compProg) gl.deleteProgram(compProg);
    };
  }, [progressRef, hotRef, flashRef, hitPolyRef]);

  const fill = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none" as const,
  };

  return (
    <>
      <canvas ref={glRef} style={{ ...fill, zIndex: 1 }} />
      <canvas ref={ringRef} style={{ ...fill, zIndex: 2 }} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  const hotRef = useRef(false);
  const flashRef = useRef(0);
  const hitPolyRef = useRef<Pt[]>([]);

  const [p, setP] = useState(0);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [offsets, setOffsets] = useState<Record<number, { x: number; y: number }>>({});
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hot, setHot] = useState(false);
  const [muted, setMuted] = useState(false);

  const [sound] = useState(createGalaxySound);

  const dragRef = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);

  const mobile = size.w < 700;
  const cardW = mobile ? 220 : 290;
  const galaxyR = Math.min(size.w, size.h) * 0.34;

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

  /* ---- scroll progress ---- */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const v = total > 0 ? clamp(-rect.top / total) : 0;
      progressRef.current = v;
      setP(v);
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
  }, []);

  /* ---- stage size ---- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- back at the start: everything returns to the galaxy ---- */
  useEffect(() => {
    if (p < 0.01 && (dismissed.length > 0 || Object.keys(offsets).length > 0)) {
      setDismissed([]);
      setOffsets({});
    }
  }, [p, dismissed.length, offsets]);

  /* ---- geometry helpers ---- */
  const basePos = (r: Review) => {
    const e = cardEase(r.id, p);
    const fx = mobile ? r.mx : r.fx;
    const fy = mobile ? r.my : r.fy;
    return { x: fx * size.w * e, y: fy * size.h * e, e };
  };

  /** is a point (stage coordinates) over the 3D galaxy disc? */
  const inGalaxy = (cx: number, cy: number) => {
    const poly = hitPolyRef.current;
    if (poly.length >= 3) return pointInPoly(cx, cy, poly);
    return Math.hypot(cx - size.w / 2, cy - size.h / 2) < galaxyR * 0.9;
  };

  /* ---- drag handlers ---- */
  const onDown = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
    sound.unlock(); // browsers only allow audio after a user gesture
    e.currentTarget.setPointerCapture(e.pointerId);
    const o = offsets[r.id] ?? { x: 0, y: 0 };
    dragRef.current = { id: r.id, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y };
    setDraggingId(r.id);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
    const d = dragRef.current;
    if (!d || d.id !== r.id) return;
    const off = { x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) };
    setOffsets((prev) => ({ ...prev, [r.id]: off }));

    const b = basePos(r);
    const over = inGalaxy(size.w / 2 + b.x + off.x, size.h / 2 + b.y + off.y);
    hotRef.current = over;
    setHot(over);
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>, r: Review) => {
    const d = dragRef.current;
    if (!d || d.id !== r.id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (hotRef.current) {
      // swallowed by the galaxy – hidden until the user scrolls back to the top
      setDismissed((prev) => (prev.includes(r.id) ? prev : [...prev, r.id]));
      flashRef.current = 1;
      sound.swallow(); // 🔊 suction + boom + sparkles
    }
    dragRef.current = null;
    hotRef.current = false;
    setHot(false);
    setDraggingId(null);
  };

  /* ---- render ---- */
  return (
    <section
      ref={sectionRef}
      style={{ position: "relative", height: "320vh", background: "#000" }}
    >
      <div
        ref={stageRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          background: [
            "radial-gradient(ellipse 60% 45% at 25% 22%, rgba(88,40,160,0.2), transparent 70%)",
            "radial-gradient(ellipse 55% 40% at 78% 74%, rgba(20,70,200,0.2), transparent 70%)",
            "radial-gradient(ellipse at center, #050b24 0%, #02040f 55%, #000 100%)",
          ].join(","),
        }}
      >
        <Galaxy
          progressRef={progressRef}
          hotRef={hotRef}
          flashRef={flashRef}
          hitPolyRef={hitPolyRef}
        />

        {/* sound on / off */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          aria-pressed={muted}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 60,
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            color: "#93b4ff",
            background: "rgba(4,10,32,0.6)",
            border: "1px solid rgba(59,130,246,0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* heading */}
        <div
          style={{
            position: "absolute",
            top: mobile ? "5%" : "7%",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 3,
            pointerEvents: "none",
            opacity: clamp(0.35 + p * 2),
            padding: "0 16px",
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
              margin: "8px 0 0",
              fontSize: mobile ? 28 : 44,
              fontWeight: 800,
              color: "#fff",
              textShadow: "0 0 24px rgba(59,130,246,0.9)",
            }}
          >
            What Our Clients Say
          </h2>
        </div>

        {/* review cards */}
        {REVIEWS.map((r) => {
          const b = basePos(r);
          const isDismissed = dismissed.includes(r.id);
          const off = offsets[r.id] ?? { x: 0, y: 0 };
          const isDragging = draggingId === r.id;

          const x = isDismissed ? 0 : b.x + off.x;
          const y = isDismissed ? 0 : b.y + off.y;
          const scale = isDismissed ? 0 : 0.15 + 0.85 * b.e;
          const opacity = isDismissed ? 0 : b.e;
          const rot = (1 - b.e) * (r.id % 2 ? -540 : 540) + r.tilt * b.e;
          const interactive = !isDismissed && b.e > 0.95;

          return (
            <div
              key={r.id}
              onPointerDown={interactive ? (e) => onDown(e, r) : undefined}
              onPointerMove={(e) => onMove(e, r)}
              onPointerUp={(e) => onUp(e, r)}
              onPointerCancel={(e) => onUp(e, r)}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: cardW,
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${isDragging ? scale * 1.05 : scale}) rotate(${rot}deg)`,
                opacity,
                transition: isDragging
                  ? "none"
                  : "transform 0.45s cubic-bezier(.2,.8,.2,1), opacity 0.45s",
                zIndex: isDragging ? 50 : 10,
                pointerEvents: interactive ? "auto" : "none",
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
                userSelect: "none",
                padding: mobile ? 14 : 18,
                borderRadius: 18,
                background: "rgba(4, 10, 32, 0.6)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(59,130,246,0.75)",
                boxShadow: isDragging
                  ? "0 0 38px rgba(59,130,246,0.95), inset 0 0 18px rgba(59,130,246,0.35)"
                  : "0 0 22px rgba(37,99,235,0.55), inset 0 0 12px rgba(37,99,235,0.2)",
                color: "#e6efff",
                willChange: "transform, opacity",
              }}
            >
              <div style={{ color: "#fbbf24", fontSize: 15, letterSpacing: 2, marginBottom: 8 }}>
                {"★".repeat(r.rating)}
                <span style={{ color: "#334155" }}>{"★".repeat(5 - r.rating)}</span>
              </div>
              <p style={{ margin: 0, fontSize: mobile ? 13 : 14.5, lineHeight: 1.55 }}>
                “{r.text}”
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    color: "#fff",
                    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                    boxShadow: "0 0 12px rgba(59,130,246,0.8)",
                  }}
                >
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#93b4ff" }}>{r.role}</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* hints */}
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 13,
            color: "#93b4ff",
            zIndex: 3,
            pointerEvents: "none",
            padding: "0 16px",
          }}
        >
          {p < 0.08
            ? "↓ Scroll down to release the reviews from the galaxy"
            : dismissed.length > 0
            ? `${dismissed.length} review${dismissed.length > 1 ? "s" : ""} swallowed – scroll back to the top to bring them back`
            : hot
            ? "Release to feed it to the galaxy"
            : "Drag a review into the galaxy to dismiss it • Scroll up to send them all back"}
        </div>
      </div>
    </section>
  );
}