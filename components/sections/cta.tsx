"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const CSS = `
.st-cta { position: relative; background: #02040c; }
.st-cta__stick { position: sticky; top: 0; height: 100vh; overflow: hidden; }
.st-cta__canvas { position: absolute; inset: 0; }
.st-cta__canvas canvas { display: block; width: 100%; height: 100%; }

.st-cta__hint {
  position: absolute; left: 50%; bottom: 6vh; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  color: #bcd6ff; font-size: 14px; letter-spacing: 0.04em; pointer-events: none;
}
.st-cta__hint i {
  width: 22px; height: 36px; border: 1.5px solid #3aa0ff; border-radius: 12px; position: relative;
  box-shadow: 0 0 12px rgba(58, 160, 255, 0.5);
}
.st-cta__hint i::after {
  content: ""; position: absolute; left: 50%; top: 7px; width: 3px; height: 7px; margin-left: -1.5px;
  background: #3aa0ff; border-radius: 2px; animation: st-wheel 1.6s ease-in-out infinite;
}
@keyframes st-wheel { 0% { opacity: 0; transform: translateY(0); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(12px); } }

.st-cta__panel {
  position: absolute; left: 6vw; top: 50%; transform: translateY(-50%);
  width: min(440px, 88vw); padding: 28px; color: #e8f1ff; overflow: hidden;
  background: rgba(6, 14, 34, 0.55); backdrop-filter: blur(14px);
  border: 1px solid rgba(58, 160, 255, 0.55); border-radius: 22px;
  box-shadow: 0 0 28px rgba(58, 160, 255, 0.22), inset 0 0 24px rgba(58, 160, 255, 0.08);
  animation: st-panel 1s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.st-cta__panel::before {
  content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(120, 190, 255, 0.28), transparent);
  animation: st-sweep 1.4s 0.3s ease-out both;
}
.st-cta__panel > * { animation: st-rise 0.7s cubic-bezier(0.2, 0.9, 0.2, 1) both; }
.st-cta__panel > *:nth-child(1) { animation-delay: 0.2s; }
.st-cta__panel > *:nth-child(2) { animation-delay: 0.35s; }
.st-cta__panel > *:nth-child(3) { animation-delay: 0.5s; }
.st-cta__panel > *:nth-child(4) { animation-delay: 0.65s; }
.st-cta__panel > *:nth-child(5) { animation-delay: 0.8s; }
@keyframes st-panel {
  from { opacity: 0; transform: translateY(-44%) scale(0.92); filter: blur(10px); }
  to { opacity: 1; transform: translateY(-50%) scale(1); filter: blur(0); }
}
@keyframes st-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes st-sweep { from { left: -60%; } to { left: 130%; } }
.st-cta__panel h2 { margin: 0 0 10px; font-size: clamp(26px, 3.2vw, 36px); line-height: 1.1; font-weight: 700; }
.st-cta__panel p { margin: 0 0 20px; font-size: 15px; line-height: 1.55; color: #a9c0e6; }
.st-cta__panel label { display: block; margin-bottom: 14px; font-size: 13px; color: #8fb2e8; }
.st-cta__panel input,
.st-cta__panel select {
  width: 100%; margin-top: 6px; padding: 12px 14px; font: inherit; font-size: 15px; color: #fff;
  background: rgba(10, 22, 52, 0.8); border: 1px solid rgba(120, 170, 255, 0.35); border-radius: 12px; outline: none;
}
.st-cta__panel input:focus,
.st-cta__panel select:focus { border-color: #3aa0ff; box-shadow: 0 0 0 3px rgba(58, 160, 255, 0.25); }
.st-cta__select { display: block; position: relative; }
.st-cta__select img { position: absolute; left: 12px; top: 50%; margin-top: 3px; transform: translateY(-50%); width: 24px; border-radius: 3px; z-index: 1; }
.st-cta__select img + select { padding-left: 46px; }
.st-cta__select option { background: #0a1634; }

.st-cta__go {
  display: inline-block; width: 100%; margin-top: 6px; padding: 13px 28px; font: inherit; font-size: 16px; font-weight: 600; color: #fff;
  background: rgba(58, 160, 255, 0.12); border: 1.5px solid #3aa0ff; border-radius: 999px; cursor: pointer;
  box-shadow: 0 0 18px rgba(58, 160, 255, 0.45), inset 0 0 12px rgba(58, 160, 255, 0.2);
  transition: background 0.2s, box-shadow 0.2s;
}
.st-cta__go:hover:not(:disabled) { background: rgba(58, 160, 255, 0.3); box-shadow: 0 0 28px rgba(58, 160, 255, 0.75); }
.st-cta__go:disabled { opacity: 0.4; cursor: not-allowed; }
.st-cta__go:focus-visible, .st-cta__start:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.st-cta__start {
  position: absolute; left: 0; top: 0; display: inline-flex; align-items: center; justify-content: center;
  height: 50px; overflow: hidden; white-space: nowrap; font: inherit; font-size: 17px; font-weight: 700; color: #fff;
  text-decoration: none; background: rgba(10, 28, 64, 0.82); backdrop-filter: blur(8px);
  border: 1.5px solid #6cc6ff; border-radius: 999px; cursor: pointer;
  box-shadow: 0 0 26px rgba(80, 180, 255, 0.7), inset 0 0 14px rgba(80, 180, 255, 0.3);
  animation: st-morph 1s cubic-bezier(0.2, 0.9, 0.2, 1) both, st-pulse 2.4s 1.1s ease-in-out infinite;
}
.st-cta__start { transition: opacity 0.3s; }
.st-cta__start span { animation: st-text 0.5s 0.55s ease both; }
.st-cta__start:hover { background: rgba(40, 110, 220, 0.6); }
@keyframes st-morph {
  0% { max-width: 50px; padding: 0; box-shadow: 0 0 60px 14px rgba(160, 220, 255, 0.95); }
  100% { max-width: 300px; padding: 0 34px; }
}
@keyframes st-text { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes st-pulse { 0%, 100% { box-shadow: 0 0 22px rgba(80, 180, 255, 0.6), inset 0 0 14px rgba(80, 180, 255, 0.3); } 50% { box-shadow: 0 0 44px rgba(120, 210, 255, 1), inset 0 0 18px rgba(80, 180, 255, 0.5); } }

.st-cta__welcome {
  position: absolute; left: 50%; top: 9vh; transform: translateX(-50%); margin: 0; text-align: center;
  font-size: clamp(20px, 2.6vw, 30px); color: #e8f1ff; text-shadow: 0 0 18px rgba(58, 160, 255, 0.7);
  animation: st-fade 1s 1.4s ease both;
}
@keyframes st-fade { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 760px) {
  .st-cta__panel { left: 50%; top: auto; bottom: 4vh; transform: translateX(-50%); padding: 20px; animation: st-panel-m 1s cubic-bezier(0.2, 0.9, 0.2, 1) both; }
  .st-cta__panel p { display: none; }
}
@keyframes st-panel-m { from { opacity: 0; transform: translateX(-50%) translateY(40px) scale(0.94); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .st-cta__hint i::after, .st-cta__panel, .st-cta__panel::before, .st-cta__panel > *, .st-cta__start, .st-cta__start span, .st-cta__welcome { animation: none; }
}
`;

/* ---------- tweakables ---------- */
const SCROLL_VH = 450; // total scroll length of the section (in vh)
const PANEL_AT = 0.72; // scroll progress (0-1) at which the panel appears
const R = 60; // planet radius
const FLAG_X = -0.3; // where the flag pole is planted (local to landing site)
const STAND_X = 3.4; // where the astronaut stands
const SHIP_POS = new THREE.Vector3(-4.6, 0, -2.2); // where the rocket lands
const ANCHOR = new THREE.Vector3(0, 0.3, 5.2); // where the "Let's Start" button floats: centre of the screen, low, in front of everyone
const CAT_POS = new THREE.Vector3(4.7, 0, 1.3); // where Billu the cat stays (next to the astronaut)
const BRAND_POS = new THREE.Vector3(FLAG_X - 0.6, 0, 0); // where the ShivayTech flag pole rises (its cloth flows LEFT)
const IDLE_AMP = 0.2; // how strongly the flags keep waving in the "wind"
const SUN = new THREE.Vector3(-0.45, 0.55, 0.75).normalize();

const CODES =
  "IN US GB CA AU AE SA QA KW OM BH PK BD NP LK BT MV AF ID MY SG TH VN PH CN JP KR HK TW MN RU UA PL DE FR IT ES PT NL BE CH AT SE NO DK FI IE GR TR IL EG ZA NG KE GH ET MA DZ TN TZ UG BR AR MX CO CL PE VE CU NZ FJ IR IQ KZ UZ RO CZ HU BG RS HR".split(
    " "
  );

/* ---------- planet shaders (alien palette: violet seas, teal land, rose deserts) ---------- */
const PLANET_VS = `
varying vec3 vP, vWN, vW;
void main(){
  vP = position; vWN = normalize(mat3(modelMatrix) * position);
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PLANET_FS = `
uniform vec3 uSun; uniform float uTime;
varying vec3 vP, vWN, vW;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm(vec3 p, int n){ float a = .5, s = 0.; for(int i=0;i<6;i++){ if(i>=n) break; s += a*noise(p); p *= 2.03; a *= .5; } return s; }
void main(){
  vec3 N0 = normalize(vWN), V = normalize(cameraPosition - vW);
  float fd = length(cameraPosition - vW);
  float detail = 1.0 - smoothstep(30.0, 160.0, fd);
  float fine = 1.0 - smoothstep(10.0, 60.0, fd);
  float lat = abs(normalize(vP).y);

  vec3 q = vP*0.03;
  float warp = fbm(q*2.0 + 11.0, 3);
  float cont = fbm(q + warp*0.8 + 3.0, 6);
  float land = smoothstep(.465, .49, cont);
  float cap = smoothstep(.88, .94, lat + (cont-.5)*.1);

  float hh = detail*fbm(vP*1.1, 3)*.35 + fine*fbm(vP*6.0, 2)*.12;
  float hb = hh * max(land, cap);
  vec3 dpx = dFdx(vW), dpy = dFdy(vW); float dhx = dFdx(hb), dhy = dFdy(hb);
  vec3 r1 = cross(dpy, N0), r2 = cross(N0, dpx); float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx*r1 + dhy*r2);
  vec3 N = normalize(abs(det)*N0 - 0.7*grad);

  vec3 ocean = mix(vec3(.004,.02,.09), vec3(.02,.12,.34), smoothstep(.36,.47,cont));
  float dry = smoothstep(.45, .68, fbm(vP*.05 + 7.0, 4) + (1.0 - smoothstep(.0, .55, lat))*.25);
  vec3 veg = mix(vec3(.03,.09,.04), vec3(.07,.15,.05), smoothstep(.4,.7,fbm(vP*.12 + 2.0, 3)));
  vec3 rock = mix(veg, vec3(.40,.32,.20), dry);
  rock = mix(rock, vec3(.30,.27,.25), smoothstep(.60,.78,cont));
  rock = mix(rock, vec3(.80,.85,.90), smoothstep(.76,.88,cont)*.9);
  rock *= .82 + .36*mix(.5, fbm(vP*3.0, 3), detail);

  vec3 dust = mix(vec3(.17,.18,.20), vec3(.40,.37,.33), smoothstep(.25,.8, cont + hh));
  vec3 ground = mix(dust, vec3(.58,.63,.69), smoothstep(.55,.8,fbm(vP*.25,3))*.55);
  vec3 capCol = mix(vec3(.82,.87,.94), ground, detail);
  vec3 alb = mix(mix(ocean, rock, land), capCol, cap);

  float d = max(dot(N, uSun), 0.0);
  float d0 = max(dot(N0, uSun), 0.0);
  vec3 H = normalize(uSun + V);
  float wet = (1.0-land)*(1.0-cap);
  float spec = (pow(max(dot(N0,H),0.0), 400.0)*.6 + pow(max(dot(N0,H),0.0), 40.0)*.06) * wet;
  vec3 col = alb*(vec3(1.0,.96,.9)*d*1.3 + vec3(.02,.035,.07)) + spec*vec3(1.0,.95,.85);

  float night = smoothstep(.08, -.2, dot(N0, uSun));
  float lights = smoothstep(.8, .92, noise(vP*7.0)) * land * (1.0-cap) * night * (1.0 - detail);
  col += vec3(1.0,.78,.45) * lights * .8;

  float c1 = fbm(vP*0.05 + vec3(uTime*.003, 0.0, 0.0) + warp*.5, 6);
  float cl = smoothstep(.55, .75, c1) * smoothstep(25.0, 110.0, fd);
  col = mix(col, vec3(.97,.98,1.0)*(d0*1.2 + .03), cl*.9);

  float rim = pow(1.0 - max(dot(N0, V), 0.0), 3.0) * 0.35 * (0.3 + d0);
  col += rim*vec3(.3,.6,1.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const ATMO_FS = `
uniform vec3 uSun; uniform float uA;
varying vec3 vP, vWN, vW;
void main(){
  vec3 N = normalize(vWN), V = normalize(cameraPosition - vW);
  float f = pow(clamp(-dot(N, V)*2.8, 0.0, 1.0), 2.5);
  float lit = 0.25 + 0.75*smoothstep(-.2, .6, dot(N, uSun));
  gl_FragColor = vec4(vec3(.2,.5,1.0)*f*lit*uA*1.0, 1.0);
}`;

/* ---------- planet ring shader ---------- */
const RING_VS = `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FS = `
uniform float uA;
varying vec3 vP;
void main(){
  float t = (length(vP.xy) - ${(R * 1.35).toFixed(1)}) / ${(R * 0.75).toFixed(1)};
  float bands = 0.5 + 0.5 * sin(t * 70.0 + sin(t * 19.0) * 2.0);
  float a = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.85, t) * (0.12 + 0.5 * bands);
  gl_FragColor = vec4(mix(vec3(.78,.9,1.0), vec3(.3,.6,1.0), t), a * uA);
}`;

/* ---------- helpers ---------- */
const std = (c: string, r = 0.6, m = 0) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

const gy = (x: number, z: number) => Math.sqrt(R * R - x * x - z * z) - R;

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};
const ringAt = (r: number, t: number, mat: THREE.Material, y: number) => {
  const m = mesh(new THREE.TorusGeometry(r, t, 12, 36), mat, 0, y, 0);
  m.rotation.x = Math.PI / 2;
  return m;
};

function blob(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(0,0,0,.7)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}

function fabricTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#808080"; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "#5c5c5c"; x.lineWidth = 1.5;
  for (let i = 0; i < 128; i += 4) {
    x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke();
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke();
  }
  for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? "#8c8c8c" : "#727272"; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

function stPatchTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0b1a33"; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  x.strokeStyle = "#6cc6ff"; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke();
  x.fillStyle = "#ffffff"; x.font = "bold 58px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText("ST", 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- astronaut ---------- */
function buildAstronaut(fab: THREE.Texture, patchTex: THREE.Texture) {
  const suit = new THREE.MeshPhysicalMaterial({
    color: "#f0f1f4", roughness: 0.78, bumpMap: fab, bumpScale: 1.5,
    sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color("#ffffff"),
  });
  const dusty = new THREE.MeshPhysicalMaterial({ color: "#c4c4c8", roughness: 0.9, bumpMap: fab, bumpScale: 1.5 });
  const metal = std("#bfc6d1", 0.28, 0.95), dark = std("#1d2027", 0.65, 0.25), rubber = std("#121418", 0.9, 0);
  const glove = std("#b4b9c3", 0.7, 0.05);
  const gold = new THREE.MeshPhysicalMaterial({ color: "#e3b04b", metalness: 1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03 });
  const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 20);
  const sph = (r: number) => new THREE.SphereGeometry(r, 20, 14);
  const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r);

  const b = new THREE.Group();
  b.add(mesh(rb(0.42, 0.22, 0.28, 0.08), suit, 0, 1.08, 0));
  b.add(ringAt(0.2, 0.03, metal, 1.2));
  b.add(mesh(rb(0.56, 0.5, 0.36, 0.13), suit, 0, 1.45, 0));
  b.add(ringAt(0.17, 0.035, metal, 1.72));

  // chest control unit
  b.add(mesh(rb(0.32, 0.18, 0.06, 0.02), dark, 0, 1.38, 0.2));
  const disp = mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ color: "#4fc3ff" }), -0.07, 1.41, 0.232);
  b.add(disp);
  ["#e5483a", "#ffffff", "#3aa0ff", "#f0a030", "#ffffff", "#e5483a"].forEach((c, i) => {
    const bt = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 10), new THREE.MeshBasicMaterial({ color: c }), 0.02 + (i % 3) * 0.045, 1.405 - Math.floor(i / 3) * 0.04, 0.235);
    bt.rotation.x = Math.PI / 2; b.add(bt);
  });
  // patches: country flag (left) and ST (right)
  const flagPatchMat = new THREE.MeshStandardMaterial({ color: "#445566", roughness: 0.85 });
  b.add(mesh(new THREE.PlaneGeometry(0.14, 0.095), flagPatchMat, -0.14, 1.6, 0.186));
  b.add(mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshStandardMaterial({ map: patchTex, transparent: true, roughness: 0.8 }), 0.14, 1.6, 0.186));

  // hoses
  const hose = (s: number, col: string) => {
    const pts = [[s * 0.1, 1.36, 0.22], [s * 0.2, 1.12, 0.3], [s * 0.36, 1.0, 0.1], [s * 0.34, 1.2, -0.22]].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.018, 8), std(col, 0.6, 0.2));
  };
  b.add(hose(1, "#d0d4da"), hose(-1, "#d9772b"));

  // backpack (life support)
  b.add(mesh(rb(0.52, 0.68, 0.3, 0.07), suit, 0, 1.45, -0.38));
  b.add(mesh(rb(0.4, 0.12, 0.26, 0.04), dark, 0, 1.82, -0.38));
  b.add(mesh(cap(0.07, 0.4), metal, 0.2, 1.42, -0.56), mesh(cap(0.07, 0.4), metal, -0.2, 1.42, -0.56));
  b.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.45, 8), metal, 0.18, 2.02, -0.4), mesh(sph(0.02), metal, 0.18, 2.25, -0.4));

  // helmet
  const head = new THREE.Group(); head.position.y = 1.92;
  head.add(mesh(new THREE.SphereGeometry(0.3, 48, 32), suit));
  head.add(mesh(new THREE.SphereGeometry(0.306, 48, 32, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.3, Math.PI * 0.42), gold));
  const lampMat = new THREE.MeshStandardMaterial({ color: "#222", emissive: "#fff6d8", emissiveIntensity: 2 });
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.04), dark, s * 0.3, 0, 0));
    const l = mesh(rb(0.05, 0.035, 0.06, 0.012), lampMat, s * 0.2, 0.2, 0.2); l.rotation.y = s * 0.5; head.add(l);
  }
  b.add(head);

  // legs
  const leg = (x: number) => {
    const hip = new THREE.Group(); hip.position.set(x, 1.02, 0);
    hip.add(mesh(sph(0.15), suit), mesh(cap(0.14, 0.3), suit, 0, -0.23, 0));
    const knee = new THREE.Group(); knee.position.y = -0.46;
    knee.add(mesh(sph(0.125), metal), mesh(cap(0.115, 0.26), dusty, 0, -0.2, 0));
    knee.add(mesh(rb(0.22, 0.17, 0.42, 0.06), dark, 0, -0.46, 0.07));
    knee.add(mesh(rb(0.24, 0.04, 0.44, 0.015), rubber, 0, -0.55, 0.07));
    knee.add(ringAt(0.1, 0.02, metal, -0.38));
    hip.add(knee);
    return { hip, knee };
  };
  const legs = [leg(-0.15), leg(0.15)];
  legs.forEach((l) => b.add(l.hip));

  // arms
  const arm = (x: number) => {
    const sh = new THREE.Group(); sh.position.set(x, 1.58, 0);
    sh.add(mesh(sph(0.13), suit), mesh(cap(0.095, 0.2), suit, 0, -0.2, 0));
    const el = new THREE.Group(); el.position.y = -0.38;
    el.add(mesh(sph(0.09), metal), mesh(cap(0.082, 0.2), suit, 0, -0.18, 0), ringAt(0.075, 0.022, metal, -0.34));
    el.add(mesh(rb(0.1, 0.11, 0.07, 0.03), glove, 0, -0.44, 0.01), mesh(rb(0.1, 0.07, 0.05, 0.02), glove, 0, -0.52, 0.02), mesh(cap(0.024, 0.05), glove, 0.06, -0.42, 0.03));
    sh.add(el);
    return { sh, el };
  };
  const arms = [arm(-0.37), arm(0.37)];
  arms.forEach((a) => b.add(a.sh));

  b.scale.setScalar(0.87);
  const g = new THREE.Group();
  g.add(b, blob(1.9));
  return { g, b, legs, arms, flagPatchMat };
}

/* ---------- cat (Billu) ---------- */
function nameTag(text: string) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 96;
  const x = c.getContext("2d")!;
  x.fillStyle = "rgba(11, 23, 48, 0.85)"; x.beginPath(); x.roundRect(8, 12, 240, 72, 36); x.fill();
  x.strokeStyle = "#6cc6ff"; x.lineWidth = 4; x.stroke();
  x.fillStyle = "#ffffff"; x.font = "bold 46px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(0.62, 0.23, 1);
  sp.position.set(0, 1.12, 0);
  return sp;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const at = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0): T => { o.position.set(x, y, z); return o; };

/* ---------- Billu: chibi astronaut kitten (standing on two legs) ----------
   Everything that animates is driven from `state` inside update(), so quick
   repeated clicks can never leave the mouth / eyes / arms stuck in a pose. */
function buildCat(fab: THREE.Texture, patchTex: THREE.Texture) {
  const g = new THREE.Group(), b = new THREE.Group();
  const state = {
    hover: false, walking: false, ph: 0,
    mouth: 0, joy: 0, wave: 0, nod: 0, hop: 0, lastClick: 0,
  };

  const suit = new THREE.MeshPhysicalMaterial({
    color: "#f4f5f8", roughness: 0.62, bumpMap: fab, bumpScale: 0.8,
    sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color("#ffffff"),
  });
  const dusty = new THREE.MeshPhysicalMaterial({ color: "#d6d8de", roughness: 0.85, bumpMap: fab, bumpScale: 0.8 });
  const metal = std("#c9d0db", 0.28, 0.9), dark = std("#1d2027", 0.6, 0.25), rubber = std("#121418", 0.9, 0);
  const rimMat = std("#e8edf5", 0.25, 0.8);
  const visorMat = new THREE.MeshPhysicalMaterial({ color: "#04070f", metalness: 0.4, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8 });
  const glow = new THREE.MeshBasicMaterial({ color: "#8ff0ff" });
  const blueGlow = new THREE.MeshBasicMaterial({ color: "#3aa0ff" });
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const pink = new THREE.MeshBasicMaterial({ color: "#ff8fb1" });
  const padMat = std("#ff9bb8", 0.7, 0);
  const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 20);
  const sph = (r: number) => new THREE.SphereGeometry(r, 20, 14);
  const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r);

  /* ---- torso ---- */
  const torso = at(new THREE.Group(), 0, 0.43, 0); b.add(torso);
  torso.add(mesh(rb(0.3, 0.28, 0.22, 0.09), suit));
  const waist = ringAt(0.125, 0.014, metal, -0.12); waist.scale.set(1.1, 0.85, 1); torso.add(waist);
  const waistGlow = ringAt(0.125, 0.006, blueGlow, -0.095); waistGlow.scale.set(1.1, 0.85, 1); torso.add(waistGlow);

  // chest control panel (green screen + 3 buttons) and ST patch
  torso.add(mesh(rb(0.14, 0.09, 0.03, 0.012), dark, 0.03, 0.03, 0.108));
  torso.add(mesh(new THREE.PlaneGeometry(0.07, 0.035), new THREE.MeshBasicMaterial({ color: "#6dffc4" }), 0.012, 0.045, 0.1245));
  ["#ff5a5a", "#ffd24a", "#3aa0ff"].forEach((c, i) => {
    const bt = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10), new THREE.MeshBasicMaterial({ color: c }), 0.0 + i * 0.03, 0.012, 0.1245);
    bt.rotation.x = Math.PI / 2; torso.add(bt);
  });
  torso.add(mesh(new THREE.PlaneGeometry(0.055, 0.055), new THREE.MeshStandardMaterial({ map: patchTex, transparent: true, roughness: 0.8 }), -0.09, 0.07, 0.113));

  // backpack
  torso.add(mesh(rb(0.22, 0.24, 0.1, 0.04), suit, 0, 0.03, -0.15));
  torso.add(mesh(rb(0.16, 0.04, 0.08, 0.015), dark, 0, 0.16, -0.15));
  for (const s of [-1, 1]) torso.add(mesh(cap(0.025, 0.1), metal, s * 0.085, 0.0, -0.215));

  /* ---- legs (two legs, standing) ---- */
  const boot = () => {
    const g2 = new THREE.Group();
    g2.add(mesh(rb(0.11, 0.07, 0.17, 0.03), dark), mesh(rb(0.115, 0.016, 0.175, 0.008), rubber, 0, -0.035, 0));
    g2.add(mesh(rb(0.08, 0.008, 0.02, 0.003), blueGlow, 0, 0.0, 0.087));
    return g2;
  };
  const leg = (x: number) => {
    const hip = at(new THREE.Group(), x, 0.3, 0);
    hip.add(mesh(sph(0.055), suit), at(mesh(cap(0.048, 0.05), suit), 0, -0.065, 0));
    const knee = at(new THREE.Group(), 0, -0.13, 0);
    knee.add(mesh(sph(0.04), metal), at(mesh(cap(0.044, 0.03), dusty), 0, -0.07, 0), ringAt(0.046, 0.01, blueGlow, -0.1), at(boot(), 0, -0.135, 0.02));
    hip.add(knee);
    return { hip, knee };
  };
  const legs = [leg(-0.08), leg(0.08)];
  legs.forEach((l) => b.add(l.hip));

  /* ---- arms with paw gloves (pink pad + toe beans) ---- */
  const arm = (x: number) => {
    const sh = at(new THREE.Group(), x, 0.52, 0);
    sh.add(mesh(sph(0.055), suit), at(mesh(cap(0.04, 0.06), suit), 0, -0.09, 0));
    const el = at(new THREE.Group(), 0, -0.16, 0);
    el.add(mesh(sph(0.04), metal), at(mesh(cap(0.037, 0.04), suit), 0, -0.06, 0), ringAt(0.04, 0.009, blueGlow, -0.105));
    const paw = at(new THREE.Group(), 0, -0.15, 0.01);
    paw.add(mesh(sph(0.055), suit));
    paw.add(mesh(new THREE.SphereGeometry(0.024, 12, 8).scale(1, 0.85, 0.4), padMat, 0, -0.005, 0.048));
    for (const dx of [-0.026, 0, 0.026]) {
      paw.add(mesh(new THREE.SphereGeometry(0.011, 8, 6).scale(1, 1, 0.5), padMat, dx, 0.028 - Math.abs(dx) * 0.5, 0.05));
    }
    el.add(paw);
    sh.add(el);
    return { sh, el };
  };
  const arms = [arm(-0.18), arm(0.18)];
  arms.forEach((a) => b.add(a.sh));

  /* ---- tail: suit segments, metal rings, glowing tip ---- */
  const tail = at(new THREE.Group(), 0, 0.3, -0.12);
  const orient = new THREE.Group(); orient.rotation.x = -1.15; tail.add(orient);
  const tailSegs: THREE.Group[] = [];
  const N = 7, SL = 0.055;
  let parent: THREE.Group = orient;
  for (let i = 0; i < N; i++) {
    const r0 = 0.024 - i * 0.0014, r1 = r0 - 0.0014;
    const seg = at(new THREE.Group(), 0, i ? SL : 0, 0); seg.rotation.x = i ? 0.17 : 0;
    seg.add(mesh(new THREE.SphereGeometry(r0 * 0.97, 14, 10), suit));
    seg.add(mesh(new THREE.CylinderGeometry(r1, r0, SL, 14, 1, true).translate(0, SL / 2, 0), suit));
    if (i % 2 === 1) seg.add(at(ringAt(r0 * 1.05, 0.005, i > 3 ? blueGlow : metal, 0), 0, SL * 0.5, 0));
    if (i === N - 1) {
      seg.add(at(mesh(sph(r1 * 1.3), glow), 0, SL, 0));
      seg.add(at(mesh(sph(r1 * 2.6), new THREE.MeshBasicMaterial({ color: "#5db8ff", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })), 0, SL, 0));
    }
    parent.add(seg); tailSegs.push(seg); parent = seg;
  }
  b.add(tail);

  /* ---- big round helmet ---- */
  const HR = 0.33, VR = HR + 0.012;
  const head = at(new THREE.Group(), 0, 0.84, 0.01);
  head.add(mesh(new THREE.SphereGeometry(HR, 56, 40), suit));
  // silver rim + black glossy visor
  head.add(mesh(new THREE.SphereGeometry(HR + 0.004, 56, 40, Math.PI / 2 - 1.3, 2.6, Math.PI * 0.2, Math.PI * 0.62), rimMat));
  head.add(mesh(new THREE.SphereGeometry(HR + 0.009, 56, 40, Math.PI / 2 - 1.22, 2.44, Math.PI * 0.225, Math.PI * 0.56), visorMat));
  head.add(mesh(
    new THREE.SphereGeometry(HR + 0.013, 24, 12, Math.PI / 2 + 0.3, 0.6, Math.PI * 0.3, Math.PI * 0.18),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  ));
  // neck collar
  head.add(ringAt(0.19, 0.028, metal, -0.29), ringAt(0.195, 0.007, blueGlow, -0.262));
  // side comm modules
  for (const s of [-1, 1]) head.add(mesh(sph(0.05), dark, s * 0.325, -0.02, 0), at(mesh(sph(0.018), blueGlow), s * 0.368, -0.02, 0));

  // antenna with a pulsing ball
  head.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 8), metal, 0, 0.36, -0.06));
  const orbMat = new THREE.MeshStandardMaterial({ color: "#1e5fb8", emissive: "#3aa0ff", emissiveIntensity: 1.5 });
  const orbMesh = mesh(sph(0.03), orbMat, 0, 0.43, -0.06);
  head.add(orbMesh);

  // face elements sit on the visor surface
  const face = (x: number, y: number) => {
    const z = Math.sqrt(VR * VR - x * x - y * y);
    const f = at(new THREE.Group(), x, y, z);
    f.rotation.order = "YXZ"; f.rotation.set(-Math.atan2(y, z), Math.atan2(x, z), 0);
    head.add(f);
    return f;
  };
  const blushMat = new THREE.MeshBasicMaterial({ color: "#ff8fb1", transparent: true, opacity: 0.6 });
  const eyes: THREE.Group[] = [], happy: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const f = face(s * 0.105, 0.04);
    const e = new THREE.Group();
    e.add(mesh(new THREE.SphereGeometry(0.062, 24, 18).scale(0.85, 1.15, 0.2), glow));
    e.add(at(mesh(new THREE.SphereGeometry(0.017, 10, 8), white), -0.014, 0.025, 0.012));
    e.add(at(mesh(new THREE.SphereGeometry(0.008, 8, 6), white), 0.018, -0.02, 0.012));
    f.add(e); eyes.push(e);
    const hp = at(mesh(new THREE.TorusGeometry(0.042, 0.01, 8, 20, Math.PI), glow), 0, -0.015, 0.004);
    hp.visible = false; f.add(hp); happy.push(hp);
    face(s * 0.18, -0.065).add(mesh(new THREE.CircleGeometry(0.032, 20).scale(1.4, 0.8, 1), blushMat));
  }
  face(0, -0.045).add(mesh(sph(0.011), pink));

  // closed smile "ω"
  const smile = new THREE.Group();
  for (const k of [-1, 1]) {
    const w = mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 16, Math.PI), glow, k * 0.02, 0, 0);
    w.rotation.z = Math.PI; smile.add(w);
  }
  face(0, -0.068).add(smile);

  // open mouth (only visible while meowing) with tongue
  const mouthG = face(0, -0.088);
  mouthG.add(mesh(new THREE.SphereGeometry(0.03, 16, 12).scale(1, 1, 0.2), new THREE.MeshBasicMaterial({ color: "#7a1233" })));
  mouthG.add(at(mesh(new THREE.SphereGeometry(0.016, 12, 8).scale(1.2, 0.7, 0.2), pink), 0, -0.012, 0.004));
  mouthG.visible = false;

  // cat ears (suit shell, pink inside)
  const earIn = new THREE.MeshStandardMaterial({ color: "#f6b4bb", roughness: 0.6, emissive: "#ff8fb1", emissiveIntensity: 0.25 });
  const earGeo = new THREE.ConeGeometry(0.1, 0.19, 4).translate(0, 0.095, 0).scale(1, 1, 0.45);
  const earInGeo = new THREE.ConeGeometry(0.06, 0.13, 4).translate(0, 0.065, 0).scale(1, 1, 0.3);
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const ep = at(new THREE.Group(), s * 0.19, 0.22, -0.03);
    ep.rotation.set(0.1, 0, -s * 0.42); ep.userData.z = -s * 0.42;
    ep.add(new THREE.Mesh(earGeo, suit), at(new THREE.Mesh(earInGeo, earIn), 0, 0.005, 0.02), ringAt(0.07, 0.008, metal, 0.01));
    head.add(ep); ears.push(ep);
  }
  b.add(head);

  /* ---- floating heart (click) ---- */
  const heartTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ff6f9d"; x.shadowColor = "#ff9fbd"; x.shadowBlur = 6;
    x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 24, 10); x.bezierCurveTo(30, 10, 32, 16, 32, 20);
    x.bezierCurveTo(32, 16, 34, 10, 40, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const heart = () => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    sp.position.set((Math.random() < 0.5 ? -1 : 1) * 0.42 + rnd(-0.05, 0.05), 1.2, 0.3); sp.scale.setScalar(0.01); g.add(sp);
    gsap.timeline({ onComplete() { g.remove(sp); sp.material.dispose(); } })
      .to(sp.scale, { x: 0.18, y: 0.18, duration: 0.3, ease: "back.out(2)" })
      .to(sp.position, { y: 1.75, x: sp.position.x + rnd(-0.15, 0.15), duration: 1.4, ease: "power1.out" }, 0)
      .to(sp.material, { opacity: 0, duration: 0.6 }, 0.8);
  };

  /* ---- hit area, shadow, tag ---- */
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ visible: false })), 0, 0.72, 0.05));
  const tag = nameTag("Billu (Sakshi)"); tag.position.y = 1.62;
  g.add(b, blob(0.8), tag);

  /* ---- per-frame animation, fully state-driven ---- */
  let nextBlink = 2, blinkT = -1, nextTwitch = 4, twitchT = -1, twitchEar = 0, tph = 0, earX = 0.1, walkAmt = 0, hAmt = 0;
  const update = (t: number, dt: number) => {
    const hv = state.hover;
    const now = performance.now() / 1000;
    // safety net: if no click for a while, relax everything back to rest (mouth can never stay open)
    if (now - state.lastClick > 1.8) {
      const k = Math.min(1, dt * 10);
      state.mouth -= state.mouth * k; state.joy -= state.joy * k; state.wave -= state.wave * k;
      state.nod -= state.nod * k; state.hop -= state.hop * k;
    }
    walkAmt += ((state.walking ? 1 : 0) - walkAmt) * Math.min(1, dt * 8);
    hAmt += ((hv ? 1 : 0) - hAmt) * Math.min(1, dt * 8);
    if (state.walking) state.ph += dt * 9;
    const s = Math.sin(state.ph), c = Math.cos(state.ph);

    // body
    torso.scale.set(1 + 0.008 * Math.sin(t * 1.9), 1 + 0.014 * Math.sin(t * 1.9), 1);
    b.position.y = state.hop + Math.abs(s) * 0.03 * walkAmt;
    b.rotation.z = s * 0.03 * walkAmt;

    // legs
    legs[0].hip.rotation.x = -s * 0.5 * walkAmt; legs[1].hip.rotation.x = s * 0.5 * walkAmt;
    legs[0].knee.rotation.x = Math.max(0, c) * 0.8 * walkAmt; legs[1].knee.rotation.x = Math.max(0, -c) * 0.8 * walkAmt;

    // arms (walk swing, hover lift, click wave)
    arms.forEach((a, i) => {
      const side = i ? 1 : -1;
      a.sh.rotation.x = (i ? s : -s) * 0.45 * walkAmt;
      a.sh.rotation.z = side * (0.28 + (i ? 0.5 : 0.4) * hAmt + state.wave * (i ? 2.2 : 1.6));
      a.el.rotation.z = side * state.wave * Math.sin(t * 22) * 0.25;
    });

    // head
    head.rotation.y = (Math.sin(t * 0.45) * 0.14 + Math.sin(t * 0.17 + 1) * 0.1) * (hv ? 0.25 : 1);
    head.rotation.x = state.nod;
    head.rotation.z = hAmt * 0.2;

    // tail + antenna ball
    tph += dt * (hv ? 3.6 : 2.2);
    tailSegs.forEach((sg, i) => { sg.rotation.y = Math.sin(tph - i * 0.5) * (hv ? 0.14 : 0.09); });
    orbMat.emissiveIntensity = 0.8 + 1.6 * Math.max(0, Math.sin(t * 3.2));
    orbMesh.scale.setScalar(1 + 0.18 * Math.sin(t * (hv ? 6 : 2.5)));

    // blink
    if (blinkT < 0 && t > nextBlink) blinkT = 0;
    let lid = 0.08;
    if (blinkT >= 0) {
      blinkT += dt;
      const p = blinkT / 0.18;
      lid = lid + (1 - lid) * Math.sin(Math.min(p, 1) * Math.PI);
      if (p >= 1) { blinkT = -1; nextBlink = t + rnd(2.5, 6); }
    }
    // hover / click = happy ^ ^ eyes
    const happyNow = hv || state.joy > 0.5;
    eyes.forEach((e) => { e.visible = !happyNow; e.scale.y = Math.max(0.08, 1 - lid); });
    happy.forEach((h) => { h.visible = happyNow; });

    // mouth: closed ω smile unless actually meowing
    const mo = THREE.MathUtils.clamp(state.mouth, 0, 1);
    const open = mo > 0.06;
    mouthG.visible = open; smile.visible = !open;
    mouthG.scale.set(1, Math.max(0.05, mo), 1);

    // ears
    if (twitchT < 0 && t > nextTwitch) { twitchT = 0; twitchEar = Math.random() < 0.5 ? 0 : 1; }
    earX += ((happyNow ? -0.12 : 0.1) - earX) * Math.min(1, dt * 8);
    ears.forEach((e, i) => {
      let z = e.userData.z as number;
      if (twitchT >= 0 && i === twitchEar) z += Math.sin(Math.min(twitchT / 0.35, 1) * Math.PI * 3) * 0.16;
      e.rotation.z = z; e.rotation.x = earX;
    });
    if (twitchT >= 0) { twitchT += dt; if (twitchT > 0.35) { twitchT = -1; nextTwitch = t + rnd(4, 9); } }
  };

  g.scale.setScalar(0.95);
  return { g, b, head, tail, state, heart, update };
}

/* ---------- flags ---------- */
const FW = 1.5, FH = 1.0, NW = 1.1, NH = 0.38, POLE = 4.4;

// telescoping aluminium pole: 3 tapered sections, dark joint collars, gold finial, braced base plate
function buildPole(h: number) {
  const g = new THREE.Group(), base = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: "#d4d9e1", roughness: 0.22, metalness: 1 });
  const dark = std("#14171d", 0.6, 0.5), gold = std("#e3b04b", 0.2, 1);
  const secs: [number, number, number][] = [[0, 0.38, 0.04], [0.38, 0.7, 0.032], [0.7, 1, 0.024]];
  for (const [a, b, r] of secs) {
    const len = (b - a) * h;
    g.add(mesh(new THREE.CylinderGeometry(r * 0.92, r, len, 20), alu, 0, a * h + len / 2, 0));
    if (a > 0) g.add(mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.07, 20), dark, 0, a * h, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 16), gold, 0, h, 0));
  g.add(mesh(new THREE.SphereGeometry(0.055, 18, 14), gold, 0, h + 0.07, 0));
  g.add(mesh(new THREE.ConeGeometry(0.014, 0.14, 12), gold, 0, h + 0.17, 0));
  // base (sits at ground level; the pole group is planted 0.2 below it)
  base.position.y = 0.2;
  base.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.04, 28), dark, 0, 0.02, 0));
  base.add(mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.22, 20), alu, 0, 0.13, 0));
  base.add(ringAt(0.07, 0.012, dark, 0.22));
  for (let i = 0; i < 3; i++) {
    const hold = new THREE.Group(); hold.rotation.y = (i * Math.PI * 2) / 3;
    const brace = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), alu, 0.12, 0.14, 0); brace.rotation.z = -0.55;
    hold.add(brace); base.add(hold);
  }
  return { g, base };
}

// cloth is anchored at the pole (x = 0) and streams to the right (dir = 1) or to the left (dir = -1)
function makeCloth(w: number, h: number, sx: number, sy: number, fab: THREE.Texture, y: number, rodMat: THREE.Material, dir = 1) {
  const geo = new THREE.PlaneGeometry(w, h, sx, sy); geo.translate((dir * w) / 2, -h / 2, 0);
  const pos = geo.attributes.position, xs = new Float32Array(pos.count), ys = new Float32Array(pos.count), s = w / 2.4;
  for (let i = 0; i < pos.count; i++) { xs[i] = pos.getX(i); ys[i] = pos.getY(i); }
  const update = (t: number, amp: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = xs[i], yy = ys[i], ax = Math.abs(x), u = ax / w, v = -yy / h;
      const fold = Math.sin(ax * 7 + Math.sin(yy * 1.7) * 1.5) * 0.07 + Math.sin(ax * 15 + yy * 2) * 0.02 + Math.sin(ax * 3.1 + 1) * 0.05;
      const wave = amp * (Math.sin(ax * 3.2 - t * 7 + v * 1.5) + 0.35 * Math.sin(ax * 5.6 - t * 10.5 + yy * 2.3));
      pos.setZ(i, (fold + wave) * s * u * (0.1 + 0.9 * v));
      // the cloth pulls in a little as it ripples
      pos.setX(i, x - dir * w * u * u * amp * 0.1 * (1 + Math.sin(t * 4 + v * 2)));
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  update(0, 0);
  const bump = fab.clone(); bump.repeat.set(10, 8); bump.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92, side: THREE.DoubleSide, bumpMap: bump, bumpScale: 1 });
  const group = new THREE.Group(); group.position.set(dir * 0.04, y, 0);
  const rod = mesh(new THREE.CylinderGeometry(0.016, 0.016, w + 0.06, 10), rodMat, (dir * w) / 2, 0.01, 0);
  rod.rotation.z = Math.PI / 2;
  group.add(new THREE.Mesh(geo, mat), rod);
  group.scale.x = 0.04;
  return { group, mat, update };
}

function buildFlag(fab: THREE.Texture, o: { dir?: 1 | -1; w?: number; h?: number; name?: boolean; poleH?: number } = {}) {
  const { dir = 1, w = FW, h = FH, name = true, poleH = POLE } = o;
  const metal = std("#c9ced6", 0.3, 1);
  const g = new THREE.Group();
  const pole = buildPole(poleH);
  g.add(pole.g, pole.base);
  const top = makeCloth(w, h, 48, 32, fab, poleH - 0.3, metal, dir);
  g.add(top.group, ringAt(0.03, 0.007, metal, poleH - 0.3), ringAt(0.03, 0.007, metal, poleH - 0.3 - h));
  const cloths = [top.group];
  let low: ReturnType<typeof makeCloth> | null = null;
  if (name) {
    low = makeCloth(NW, NH, 36, 14, fab, poleH - 0.3 - h - 0.15, metal, dir);
    g.add(low.group, ringAt(0.03, 0.007, metal, poleH - 0.3 - h - 0.15));
    cloths.push(low.group);
  }
  return {
    g, base: pole.base, cloths, mats: { flag: top.mat, name: low ? low.mat : top.mat },
    update: (t: number, a: number) => { top.update(t, a); low?.update(t + 0.3, a); },
  };
}

// ShivayTech flag artwork: navy field + your real logo image (falls back to drawn text until / unless it loads)
function brandFlagTexture(logoSrc?: string) {
  const c = document.createElement("canvas"); c.width = 960; c.height = 640;
  const x = c.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing?: string };
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const stars = Array.from({ length: 70 }, () => [Math.random() * 960, Math.random() * 640, 0.2 + Math.random() * 0.6]);
  const draw = (img?: HTMLImageElement) => {
    x.shadowBlur = 0; x.letterSpacing = "0px";
    const bg = x.createLinearGradient(0, 0, 960, 640);
    bg.addColorStop(0, "#030816"); bg.addColorStop(0.6, "#0a1d46"); bg.addColorStop(1, "#0b2a66");
    x.fillStyle = bg; x.fillRect(0, 0, 960, 640);
    const gl = x.createRadialGradient(480, 300, 10, 480, 300, 420);
    gl.addColorStop(0, "rgba(58,160,255,.4)"); gl.addColorStop(1, "rgba(58,160,255,0)");
    x.fillStyle = gl; x.fillRect(0, 0, 960, 640);
    stars.forEach(([sx, sy, a]) => { x.fillStyle = `rgba(190,220,255,${a})`; x.fillRect(sx, sy, 2, 2); });
    x.strokeStyle = "#6cc6ff"; x.lineWidth = 14; x.strokeRect(24, 24, 912, 592);
    x.lineWidth = 3; x.strokeRect(46, 46, 868, 548);
    x.textAlign = "center"; x.textBaseline = "middle";
    if (img && img.naturalWidth) {
      // fit the logo inside a 760 x 440 box, keep its aspect ratio, add a soft blue glow
      const k = Math.min(760 / img.naturalWidth, 440 / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      x.shadowColor = "#3aa0ff"; x.shadowBlur = 28;
      x.drawImage(img, 480 - w / 2, 320 - h / 2, w, h);
      x.shadowBlur = 0;
    } else {
      x.shadowColor = "#3aa0ff"; x.shadowBlur = 40; x.fillStyle = "#ffffff";
      x.font = "bold 250px Arial, sans-serif"; x.fillText("ST", 480, 255);
      x.shadowBlur = 0;
      x.font = "bold 92px Arial, sans-serif"; x.letterSpacing = "10px"; x.fillText("SHIVAYTECH", 480, 440);
      x.font = "bold 34px Arial, sans-serif"; x.letterSpacing = "14px"; x.fillStyle = "#6cc6ff"; x.fillText("TECHNOLOGY SOLUTIONS", 480, 520);
    }
    t.needsUpdate = true;
  };
  draw();
  if (logoSrc) {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => draw(img);
    img.src = logoSrc;
  }
  return t;
}

/* ---------- rocket ---------- */
function steelTexture(seams: number[]) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024;
  const x = c.getContext("2d")!;
  const gr = x.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, "#c9ced6"); gr.addColorStop(0.75, "#aab0b9"); gr.addColorStop(1, "#2a2622");
  x.fillStyle = gr; x.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 9000; i++) { x.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.06)"; x.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2); }
  x.strokeStyle = "rgba(20,22,28,.85)"; x.lineWidth = 3;
  seams.forEach((v) => { const y = (1 - v) * 1024; x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke(); });
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 1024); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildShip() {
  const g = new THREE.Group();
  const prof: [number, number][] = [[0, 0.35], [0.42, 0.35], [0.6, 0.5]];
  const cylN = 30;
  for (let i = 0; i <= cylN; i++) prof.push([0.6, 0.5 + (2.9 * i) / cylN]);
  for (let i = 1; i <= 24; i++) { const t = i / 24; prof.push([0.6 * Math.pow(1 - t * t, 0.55), 3.4 + 1.9 * t]); }
  const seams: number[] = [];
  for (let i = 8; i <= 33; i += 5) seams.push(i / (prof.length - 1));
  const tex = steelTexture(seams);
  const hull = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.5, metalness: 0.85, roughness: 0.38 });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 72), hull));

  const navy = std("#1a2236", 0.45, 0.8); // navy fins / legs
  const emissive = (c: string, i: number) => new THREE.MeshStandardMaterial({ color: "#000", emissive: c, emissiveIntensity: i, side: THREE.DoubleSide });
  const arc = (r: number, h: number, len: number, mat: THREE.Material, y: number) =>
    mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true, -len / 2, len), mat, 0, y, 0);

  // logo + portholes
  const lc = document.createElement("canvas"); lc.width = 256; lc.height = 256;
  const lx = lc.getContext("2d")!;
  lx.fillStyle = "#0b1a33"; lx.font = "bold 150px Arial, sans-serif"; lx.textAlign = "center"; lx.fillText("ST", 128, 150);
  lx.font = "bold 28px Arial, sans-serif"; lx.fillText("SHIVAYTECH", 128, 200);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
  g.add(arc(0.605, 0.55, 0.86, new THREE.MeshBasicMaterial({ map: lt, transparent: true, side: THREE.DoubleSide }), 3.1));
  for (const th of [-0.42, 0, 0.42]) {
    const p = mesh(new THREE.CircleGeometry(0.07, 20), emissive("#9fd8ff", 1.6), 0.604 * Math.sin(th), 3.75, 0.604 * Math.cos(th));
    p.rotation.y = th; g.add(p);
  }

  // door (curved to follow the hull) + glowing airlock behind it
  const DY = 1.9, DA = 0.9, DR = 0.615;
  g.add(arc(0.602, 1.04, 1.0, std("#0a0d14", 0.8, 0.2), DY));
  const inner = arc(0.604, 0.96, 0.86, emissive("#cfe8ff", 2.2), DY);
  g.add(inner);
  const hx = -DR * Math.sin(DA / 2), hz = DR * Math.cos(DA / 2);
  const doorGeo = new THREE.CylinderGeometry(DR, DR, 1.0, 24, 1, true, -DA / 2, DA);
  doorGeo.translate(-hx, 0, -hz);
  const door = new THREE.Group(); door.position.set(hx, DY, hz);
  door.add(new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: "#c3c9d2", metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide })));
  g.add(door);
  const doorLight = new THREE.PointLight("#bfe0ff", 0, 12); doorLight.position.set(0, DY, 1.3); g.add(doorLight);

  // fins / flaps
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.85, -0.15); sh.lineTo(0.85, 0.35); sh.lineTo(0, 1.2); sh.closePath();
  const finGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); finGeo.translate(0, 0, -0.03);
  const smallFin = finGeo.clone(); smallFin.scale(0.55, 0.55, 1);
  for (const s of [-1, 1]) {
    const h1 = new THREE.Group(); h1.rotation.y = s * Math.PI / 2;
    const f1 = mesh(finGeo, navy, 0.56, 0.45, 0); h1.add(f1); g.add(h1);
    const h2 = new THREE.Group(); h2.rotation.y = s * Math.PI / 2;
    const f2 = mesh(smallFin, navy, 0.56, 3.35, 0); f2.scale.y = -1; h2.add(f2); g.add(h2);
  }

  // legs (deploy during descent)
  const legs: THREE.Group[] = [];
  const metalMat = std("#9aa1ad", 0.35, 0.9);
  [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((a) => {
    const holder = new THREE.Group(); holder.rotation.y = a;
    const pivot = new THREE.Group(); pivot.position.set(0.55, 1.0, 0); pivot.rotation.z = 0.08;
    pivot.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.3, 10), metalMat, 0, -0.65, 0));
    pivot.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 20), navy, 0, -1.3, 0));
    pivot.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), std("#d5dbe6", 0.3, 0.9), 0, -0.3, 0));
    holder.add(pivot); g.add(holder); legs.push(pivot);
  });

  // engines + flames (warm orange)
  const flames = new THREE.Group();
  const fm = (col: string, r: number, h: number, o: number) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    m.rotation.x = Math.PI; m.position.y = -h / 2; return m;
  };
  [0, 1, 2].forEach((i) => {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 2, ex = 0.24 * Math.cos(a), ez = 0.24 * Math.sin(a);
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.32, 18, 1, true), std("#23262e", 0.45, 0.85), ex, 0.28, ez));
    const f = new THREE.Group(); f.position.set(ex, 0.12, ez);
    f.add(fm("#6cc6ff", 0.17, 1.7, 0.75), fm("#ffffff", 0.09, 1.1, 0.9));
    flames.add(f);
  });
  const light = new THREE.PointLight("#7fc8ff", 60, 30); light.position.y = -1.2;
  g.add(flames, light, blob(6));
  return { g, door, inner, doorLight, flames, light, legs };
}

/* ---------- landing pad (lights up when the rocket touches down) ---------- */
function buildPad() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.05, 48), std("#15171f", 0.8, 0.3), 0, 0.025, 0));
  g.add(ringAt(2.0, 0.025, new THREE.MeshBasicMaterial({ color: "#3aa0ff" }), 0.06));
  const lamps: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const l = mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: "#333333" }), Math.cos(a) * 2.2, 0.08, Math.sin(a) * 2.2);
    g.add(l); lamps.push(l);
  }
  g.visible = false;
  return { g, lamps };
}

function buildOrb() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshBasicMaterial({ color: "#d6f1ff" })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: "#5db8ff", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
  const rm = new THREE.MeshBasicMaterial({ color: "#6cc6ff" });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 8, 48), rm), r2 = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 8, 48), rm);
  r2.rotation.y = Math.PI / 2; g.add(r1, r2);
  g.add(new THREE.PointLight("#6cc6ff", 6, 8));
  g.visible = false; g.scale.setScalar(0);
  return { g, r1, r2 };
}

/* =====================================================================
   lunarEnvironment.ts  (stages 2 + 3)
   Procedural moon terrain + instanced rocks, Earth with city lights and
   atmosphere, sun flare, nebula backdrop and instanced asteroids.
   Everything is generated in code. One call, one dispose().
   ===================================================================== */

/* ---------- deterministic noise / rng ---------- */
const fract = (x: number) => x - Math.floor(x);
const lerp = THREE.MathUtils.lerp;
const sstep = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const hash3 = (x: number, y: number, z: number) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
const ease = (t: number) => t * t * (3 - 2 * t);

function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = ease(x - xi), v = ease(y - yi), w = ease(z - zi);
  return lerp(
    lerp(lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    lerp(lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v),
    w
  );
}
function fbm(x: number, y: number, z: number, oct = 4) {
  let a = 0.5, s = 0, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- textures ---------- */
// Grey regolith: speckle + small craters with bright rims. Used as colour and bump.
function regolithTexture(seed = 7) {
  const r = rng(seed), c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#777777"; x.fillRect(0, 0, 512, 512);
  // draws a shape at (cx, cy) and its wrapped copies so the tile has no seams
  const wrap = (cx: number, cy: number, rad: number, draw: (px: number, py: number) => void) => {
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      const px = cx + ox, py = cy + oy;
      if (px < -rad * 1.3 || px > 512 + rad * 1.3 || py < -rad * 1.3 || py > 512 + rad * 1.3) continue;
      draw(px, py);
    }
  };
  // big soft light / dark patches (uneven soil, no hard edges)
  for (let i = 0; i < 220; i++) {
    const rad = 25 + r() * 70, v = r() < 0.5 ? 35 : 200, a = 0.05 + r() * 0.07;
    wrap(r() * 512, r() * 512, rad, (px, py) => {
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
  // fine grit
  for (let i = 0; i < 9000; i++) {
    const v = (90 + r() * 110) | 0, sz = 0.6 + r() * 1.6;
    x.fillStyle = `rgba(${v},${v},${v},.22)`; x.fillRect(r() * 512, r() * 512, sz, sz);
  }
  // craters: soft shaded bowl + lopsided lit rim (light from one side), many small, few large
  for (let i = 0; i < 420; i++) {
    const rad = 2.5 + Math.pow(r(), 3.2) * 46, depth = 0.16 + r() * 0.2;
    wrap(r() * 512, r() * 512, rad, (px, py) => {
      const bowl = x.createRadialGradient(px - rad * 0.18, py - rad * 0.18, rad * 0.05, px, py, rad * 0.95);
      bowl.addColorStop(0, `rgba(25,25,25,${depth})`); bowl.addColorStop(0.65, `rgba(40,40,40,${depth * 0.6})`); bowl.addColorStop(1, "rgba(60,60,60,0)");
      x.fillStyle = bowl; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
      const rim = x.createRadialGradient(px + rad * 0.12, py + rad * 0.12, rad * 0.8, px, py, rad * 1.18);
      rim.addColorStop(0, "rgba(215,215,215,0)"); rim.addColorStop(0.55, `rgba(215,215,215,${depth * 0.9})`); rim.addColorStop(1, "rgba(215,215,215,0)");
      x.fillStyle = rim; x.beginPath(); x.arc(px, py, rad * 1.18, 0, 7); x.fill();
    });
  }
  // film grain over everything
  const img = x.getImageData(0, 0, 512, 512), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 26;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function flareTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,240,1)"); g.addColorStop(0.08, "rgba(255,220,150,.95)");
  g.addColorStop(0.3, "rgba(255,150,60,.35)"); g.addColorStop(1, "rgba(255,120,40,0)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const streak = (horiz: boolean) => {
    const s = horiz ? x.createLinearGradient(0, 0, 256, 0) : x.createLinearGradient(0, 0, 0, 256);
    s.addColorStop(0, "rgba(255,200,120,0)"); s.addColorStop(0.5, "rgba(255,230,180,.9)"); s.addColorStop(1, "rgba(255,200,120,0)");
    x.fillStyle = s;
    if (horiz) x.fillRect(0, 126, 256, 4); else x.fillRect(126, 0, 4, 256);
  };
  streak(true); streak(false);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- shaders ---------- */
const GLSL_NOISE = `
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm(vec3 p, int n){ float a = .5, s = 0.; for(int i=0;i<6;i++){ if(i>=n) break; s += a*noise(p); p *= 2.03; a *= .5; } return s; }
`;

const BODY_VS = `
varying vec3 vP, vWN, vW;
void main(){
  vP = position; vWN = normalize(mat3(modelMatrix) * position);
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const EARTH_FS = `
uniform vec3 uSun; uniform float uTime, uFade;
varying vec3 vP, vWN, vW;
${GLSL_NOISE}
void main(){
  vec3 N = normalize(vWN), V = normalize(cameraPosition - vW);
  vec3 q = normalize(vP) * 2.2;
  float lat = abs(normalize(vP).y);
  float warp = fbm(q*2.0 + 4.0, 3);
  float cont = fbm(q + warp*0.7 + 1.0, 6);
  float land = smoothstep(.48, .52, cont);
  float cap = smoothstep(.86, .93, lat + (cont-.5)*.1);

  vec3 ocean = mix(vec3(.005,.03,.12), vec3(.02,.14,.34), smoothstep(.35,.5,cont));
  float dry = smoothstep(.4, .7, fbm(q*1.5 + 7.0, 4) + (1.0 - smoothstep(.0,.5,lat))*.25);
  vec3 rock = mix(vec3(.05,.13,.05), vec3(.45,.36,.22), dry);
  rock = mix(rock, vec3(.7,.75,.8), smoothstep(.62,.8,cont)*.7);
  vec3 alb = mix(mix(ocean, rock, land), vec3(.85,.9,.96), cap);

  float d = max(dot(N, uSun), 0.0);
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(N,H),0.0), 120.0) * (1.0-land) * (1.0-cap);
  vec3 col = alb*(vec3(1.0,.96,.9)*d*1.25 + vec3(.012,.02,.045)) + spec*vec3(1.0,.95,.85)*.6;

  float c1 = fbm(q*3.5 + vec3(uTime*.01, 0., 0.) + warp, 5);
  float cl = smoothstep(.52, .72, c1);

  float night = smoothstep(.12, -.15, dot(N, uSun));
  float lights = land * (1.0-cap) * night * smoothstep(.6, .88, fbm(q*9.0 + 2.0, 4)) * (.4 + fbm(q*3.0, 3)) * (1.0 - cl*.8);
  col += vec3(1.0,.72,.38) * lights * 1.6;

  col = mix(col, vec3(.95,.97,1.0)*(d*1.15 + .04), cl*.85);

  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * (.3 + .9*d);
  col += vec3(.3,.55,1.0) * rim * .8;
  gl_FragColor = vec4(col, uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const EARTH_ATMO_FS = `
uniform vec3 uSun; uniform float uFade;
varying vec3 vP, vWN, vW;
void main(){
  vec3 N = normalize(vWN), V = normalize(cameraPosition - vW);
  float f = pow(clamp(-dot(N, V)*2.8, 0.0, 1.0), 2.5);
  float lit = 0.35 + 0.65*smoothstep(-.3, .6, dot(N, uSun));
  gl_FragColor = vec4(vec3(.28,.58,1.0)*f*lit*uFade*1.5, 1.0);
}`;

const NEBULA_VS = `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const NEBULA_FS = `
varying vec3 vD;
${GLSL_NOISE}
void main(){
  vec3 d = normalize(vD);
  vec3 bn = normalize(vec3(.6, .7, -.05));
  float band = exp(-pow(dot(d, bn)*3.0, 2.0));
  float n = fbm(d*3.5 + 2.0, 5), m = fbm(d*9.0 + 5.0, 4);
  float dust = smoothstep(.45, .75, fbm(d*6.0 + 20.0, 4));
  vec3 col = vec3(.01,.04,.16)*band*(.5 + n*1.6) + vec3(.03,.12,.34)*band*pow(n,3.0)*1.8 + vec3(.0,.08,.2)*band*m*n*.5;
  col *= (1.0 - dust*.55*band);
  col += vec3(.004,.008,.02);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- API ---------- */
interface LunarEnvOptions {
  scene: THREE.Scene;
  site: THREE.Group; // group at (0, R, 0): rocks live in its local space
  R: number;         // planet radius
}

/* ---------- natural rock: welded + smooth-shaded, lumpy shape, ridged cracks, mottled vertex colour ---------- */
function rockGeometry(detail: number, sq: [number, number, number], seed: number) {
  const g0 = new THREE.IcosahedronGeometry(1, detail);
  g0.deleteAttribute("normal"); g0.deleteAttribute("uv");
  const g = mergeVertices(g0, 1e-4);
  g0.dispose();
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const big = fbm(x * 1.2 + seed, y * 1.2, z * 1.2, 3);
    const ridge = 1 - Math.abs(fbm(x * 2.4 + seed * 2, y * 2.4, z * 2.4, 3) * 2 - 1);
    const fine = fbm(x * 7 + seed, y * 7, z * 7, 3);
    const k = 0.6 + 0.7 * big + 0.18 * ridge * ridge + 0.07 * fine;
    p.setXYZ(i, x * k * sq[0], y * k * sq[1], z * k * sq[2]);
    const m = 0.7 + 0.6 * fbm(x * 5 + seed * 3, y * 5, z * 5, 3) - 0.15 * ridge;
    col[i * 3] = m; col[i * 3 + 1] = m; col[i * 3 + 2] = m * 1.03;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function createLunarEnvironment({ scene, site, R }: LunarEnvOptions) {
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);
  const gy = (x: number, z: number) => Math.sqrt(Math.max(R * R - x * x - z * z, 0)) - R;
  const regolith = own(regolithTexture());

  /* ===== moon terrain: a displaced spherical cap sitting on top of the planet ===== */
  const CAP = 0.62; // radians
  const capR = R * Math.sin(CAP);
  const craters: { x: number; z: number; r: number }[] = [];
  {
    const r = rng(11);
    for (let i = 0; i < 170; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * capR * 0.95;
      craters.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 0.9 + Math.pow(r(), 3) * 6 });
    }
  }
  // Height is always >= 0 (so it never dips under the planet) and is forced to 0 in a
  // flat ellipse around the landing site so the existing characters keep standing correctly.
  const heightAt = (x: number, z: number) => {
    const e = Math.hypot(x / 15, (z - 1) / 5.5);
    const clear = sstep(e, 0.95, 1.7);
    if (clear <= 0) return 0;
    let h = 0.28 + 0.24 * (fbm(x * 0.25, 3.1, z * 0.25, 4) - 0.5) + 0.03 * fbm(x * 1.7, 0, z * 1.7, 2);
    for (const c of craters) {
      const dx = x - c.x, dz = z - c.z, d2 = (dx * dx + dz * dz) / (c.r * c.r);
      if (d2 > 2.6) continue;
      const d = Math.sqrt(d2);
      const depth = 0.12 * Math.pow(c.r, 0.8);
      if (d < 1) h += (d2 - 1) * depth;
      h += Math.exp(-Math.pow((d - 1.05) * 3.2, 2)) * 0.1 * Math.pow(c.r, 0.7);
    }
    const edge = 1 - sstep(Math.hypot(x, z) / capR, 0.75, 1);
    return Math.max(h, 0) * clear * edge;
  };

  const raw = new THREE.SphereGeometry(R, 260, 110, 0, Math.PI * 2, 0, CAP);
  raw.deleteAttribute("normal"); raw.deleteAttribute("uv");
  const geo = own(mergeVertices(raw, 1e-4)); // welds the phi seam so normals are continuous
  raw.dispose();
  {
    const p = geo.attributes.position, n = p.count;
    const col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = heightAt(x, z), k = (R + h) / R;
      p.setXYZ(i, x * k, y * k, z * k);
      uv[i * 2] = x / 9; uv[i * 2 + 1] = z / 9;
      const t = fbm(x * 0.18, 5, z * 0.18, 3) * 0.7 + fbm(x * 1.1, 9, z * 1.1, 3) * 0.3;
      const s = (0.3 + 0.3 * t) * (0.82 + 0.6 * Math.min(h / 0.5, 1) * 0.5 + 0.18);
      col[i * 3] = s * 0.92; col[i * 3 + 1] = s * 0.96; col[i * 3 + 2] = s * 1.06;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
  }
  const moonMat = own(new THREE.MeshStandardMaterial({
    vertexColors: true, map: regolith, bumpMap: regolith, bumpScale: 3, roughness: 0.96, metalness: 0,
    transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const moon = new THREE.Mesh(geo, moonMat);
  moon.receiveShadow = true; moon.visible = false;
  scene.add(moon);

  /* ===== instanced rocks (one draw call) ===== */
  const rockGeo = own(rockGeometry(4, [1, 1, 1], 9));
  const rockMat = own(new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 1, metalness: 0 }));
  const ROCKS = 300;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
  {
    const rr = rng(23), dummy = new THREE.Object3D(), tint = new THREE.Color();
    let n = 0, guard = 0;
    while (n < ROCKS && guard++ < ROCKS * 40) {
      const fg = rr() < 0.38;
      const x = fg ? (rr() - 0.5) * 34 : (rr() - 0.5) * 76;
      const z = fg ? 6.6 + rr() * 3.6 : -34 + rr() * 40;
      if (Math.hypot(x / 15, (z - 1) / 5.5) < 1.02 || Math.hypot(x, z) > capR * 0.86) continue;
      let s = 0.06 + Math.pow(rr(), 3.2) * 0.85; if (fg) s *= 1.15;
      dummy.position.set(x, gy(x, z) + heightAt(x, z) - s * 0.3, z);
      dummy.rotation.set((rr() - 0.5) * 0.5, rr() * 6.283, (rr() - 0.5) * 0.5);
      dummy.scale.set(s * (0.8 + rr() * 0.5), s * (0.55 + rr() * 0.35), s * (0.8 + rr() * 0.5));
      dummy.updateMatrix();
      rocks.setMatrixAt(n, dummy.matrix);
      rocks.setColorAt(n, tint.setHSL(0.1 + rr() * 0.5 * 0.1, 0.06, 0.2 + rr() * 0.14));
      n++;
    }
    rocks.count = n;
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  }
  rocks.castShadow = true; rocks.receiveShadow = true; rocks.frustumCulled = false; rocks.visible = false;
  site.add(rocks);
  disposables.push({ dispose: () => rocks.dispose() });

  /* ===== glowing crystal clusters (teal + a few pink), instanced ===== */
  const crysGeo = own(new THREE.ConeGeometry(0.12, 1, 5).translate(0, 0.5, 0));
  const crysMat = own(new THREE.MeshStandardMaterial({
    color: "#ffffff", emissive: "#2a8cff", emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.3, flatShading: true,
  }));
  const CN = 48;
  const crystals = new THREE.InstancedMesh(crysGeo, crysMat, CN);
  {
    const d = new THREE.Object3D(), c = new THREE.Color();
    let n = 0;
    while (n < CN) {
      const cx = rnd(-18, 18), cz = rnd(-16, -8);
      if (Math.hypot(cx / 15, (cz - 1) / 5.5) < 1.1) continue;
      const tint = Math.random() < 0.7 ? "#6cc6ff" : "#b8e4ff";
      for (let k = 0; k < 4 && n < CN; k++, n++) {
        const x = cx + rnd(-0.5, 0.5), z = cz + rnd(-0.5, 0.5);
        d.position.set(x, gy(x, z) + heightAt(x, z) - 0.05, z);
        d.rotation.set(rnd(-0.4, 0.4), rnd(0, 6.28), rnd(-0.4, 0.4));
        d.scale.set(rnd(0.7, 1.3), rnd(0.4, 1.8), rnd(0.7, 1.3));
        d.updateMatrix();
        crystals.setMatrixAt(n, d.matrix);
        crystals.setColorAt(n, c.set(tint));
      }
    }
    crystals.instanceMatrix.needsUpdate = true;
    if (crystals.instanceColor) crystals.instanceColor.needsUpdate = true;
  }
  crystals.frustumCulled = false; crystals.visible = false;
  site.add(crystals);
  disposables.push({ dispose: () => crystals.dispose() });

  /* ===== Earth (shader), atmosphere, sun flare ===== */
  const EARTH_RAD = 75;
  const EARTH_POS = new THREE.Vector3(85, R + 40, -170);
  const EARTH_SUN = new THREE.Vector3(0.9, 0.45, -0.35).normalize();
  const earthGroup = new THREE.Group();
  earthGroup.position.copy(EARTH_POS); earthGroup.visible = false;

  const earthMat = own(new THREE.ShaderMaterial({
    uniforms: { uSun: { value: EARTH_SUN }, uTime: { value: 0 }, uFade: { value: 0 } },
    vertexShader: BODY_VS, fragmentShader: EARTH_FS, transparent: true,
  }));
  const earth = new THREE.Mesh(own(new THREE.SphereGeometry(EARTH_RAD, 128, 96)), earthMat);
  const atmoMat = own(new THREE.ShaderMaterial({
    uniforms: { uSun: { value: EARTH_SUN }, uFade: { value: 0 } },
    vertexShader: BODY_VS, fragmentShader: EARTH_ATMO_FS,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const atmo = new THREE.Mesh(own(new THREE.SphereGeometry(EARTH_RAD * 1.06, 96, 64)), atmoMat);
  earthGroup.add(earth, atmo);
  scene.add(earthGroup);

  const flareMat = own(new THREE.SpriteMaterial({
    map: own(flareTexture()), transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false, toneMapped: false,
  }));
  const flare = new THREE.Sprite(flareMat);
  {
    const toCam = new THREE.Vector3(0, R + 1.7, 11).sub(EARTH_POS).normalize();
    const perp = EARTH_SUN.clone().addScaledVector(toCam, -EARTH_SUN.dot(toCam)).normalize();
    flare.position.copy(EARTH_POS).addScaledVector(perp, EARTH_RAD);
    flare.scale.setScalar(46);
  }
  flare.visible = false; flare.renderOrder = 10;
  scene.add(flare);

  /* ===== nebula / milky way backdrop ===== */
  const nebulaMat = own(new THREE.ShaderMaterial({
    vertexShader: NEBULA_VS, fragmentShader: NEBULA_FS, side: THREE.BackSide, depthWrite: false, depthTest: false,
  }));
  const nebula = new THREE.Mesh(own(new THREE.SphereGeometry(1700, 48, 32)), nebulaMat);
  nebula.renderOrder = -10; nebula.frustumCulled = false;
  scene.add(nebula);

  /* ===== instanced asteroids ===== */
  // [x, yAboveR, z, scale]  (world space, framed for the final camera at (0, R+1.7, 11))
  const AST: [number, number, number, number][] = [
    [-7.2, 5.3, 1.0, 1.6], [-9.5, 3.0, -3.0, 0.55], [-3.5, 7.5, -22, 0.8],
    [13, 3.6, -6, 0.45], [7.5, 8.5, -26, 0.9], [-14, 9, -30, 1.2],
    [3, 2.4, -34, 0.35], [16, 6.5, -14, 0.7], [-12, 1.2, -16, 0.5],
  ];
  const astGeo = own(rockGeometry(5, [1.1, 0.82, 1], 4));
  const astMat = own(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, metalness: 0.02, vertexColors: true, emissive: "#0c2450", emissiveIntensity: 0.35 }));
  const asts = new THREE.InstancedMesh(astGeo, astMat, AST.length);
  asts.frustumCulled = false; asts.visible = false;
  {
    const rr = rng(5), tint = new THREE.Color();
    AST.forEach((_, i) => asts.setColorAt(i, tint.setHSL(0.6 + rr() * 0.05, 0.1, 0.22 + rr() * 0.12)));
  }
  const spin = AST.map((_, i) => {
    const rr = rng(100 + i);
    return { ax: rr() * 6, ay: rr() * 6, sx: (rr() - 0.5) * 0.12, sy: (rr() - 0.5) * 0.1 };
  });
  scene.add(asts);
  disposables.push({ dispose: () => asts.dispose() });
  const dummy = new THREE.Object3D();

  return {
    heightAt,
    /** call every frame; sp = scroll progress 0..1 */
    update(t: number, dt: number, sp: number) {
      const fMoon = sstep(sp, 0.5, 0.85), fSky = sstep(sp, 0.55, 0.9), fAst = sstep(sp, 0.6, 0.9);

      moonMat.opacity = fMoon; moon.visible = fMoon > 0.005; rocks.visible = fMoon > 0.5;

      // crystals pulse gently
      crystals.visible = fMoon > 0.5;
      crysMat.emissiveIntensity = 1.3 + 0.5 * Math.sin(t * 1.5);

      earthGroup.visible = flare.visible = fSky > 0.005;
      earthMat.uniforms.uFade.value = fSky; atmoMat.uniforms.uFade.value = fSky; flareMat.opacity = fSky * 0.9;
      earthMat.uniforms.uTime.value = t;
      earth.rotation.y += dt * 0.004;

      asts.visible = fAst > 0.005;
      if (asts.visible) {
        AST.forEach(([x, y, z, s], i) => {
          const sp2 = spin[i];
          dummy.position.set(x, R + y + Math.sin(t * 0.3 + i) * 0.08, z);
          dummy.rotation.set(sp2.ax + t * sp2.sx, sp2.ay + t * sp2.sy, 0);
          dummy.scale.setScalar(s * fAst);
          dummy.updateMatrix();
          asts.setMatrixAt(i, dummy.matrix);
        });
        asts.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      scene.remove(moon, earthGroup, flare, nebula, asts);
      site.remove(rocks, crystals);
      disposables.forEach((d) => d.dispose());
    },
  };
}

/* ---------- component ---------- */
type Api = { plant: (name: string, code: string) => void };

// logoSrc: path to your real logo image (PNG with transparent background works best), e.g. the one used in the navbar
export default function CTASection({ startHref = "/contact", logoSrc = "/images/nav.png" }: { startHref?: string; logoSrc?: string }) {
  const outer = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLAnchorElement>(null);
  const api = useRef<Api | null>(null);
  const [landed, setLanded] = useState(false);
  const [phase, setPhase] = useState<"ready" | "planting" | "done">("ready");
  const [btnOn, setBtnOn] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const countries = useMemo(() => {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return CODES.map((c) => ({ c, n: dn.of(c) ?? c })).sort((a, b) => a.n.localeCompare(b.n));
  }, []);

  useEffect(() => {
    const host = mount.current!, section = outer.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // real shadows for the characters, rocket and flag on the moon surface
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#02040c");
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
    const sunL = new THREE.DirectionalLight("#fff1e0", 2.2);
    // sun aims at the landing site and carries a tight shadow frustum around it
    sunL.position.copy(SUN).multiplyScalar(60).add(new THREE.Vector3(0, R, 0));
    sunL.target.position.set(0, R, 0);
    sunL.castShadow = true;
    Object.assign(sunL.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 5, far: 140 });
    sunL.shadow.mapSize.set(2048, 2048);
    sunL.shadow.bias = -0.0004;
    sunL.shadow.normalBias = 0.03;
    scene.add(sunL, sunL.target, new THREE.HemisphereLight("#3a6bff", "#10131f", 0.35));

    // stars (few, flat 2D twinkle)
    const SN = 1100, sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3), sPh = new Float32Array(SN), sSz = new Float32Array(SN);
    const tints = [new THREE.Color("#ffffff"), new THREE.Color("#ffe6c8"), new THREE.Color("#bcd6ff")];
    for (let i = 0; i < SN; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(1000 + Math.random() * 400);
      sPos.set([v.x, v.y, v.z], i * 3);
      const c = tints[Math.floor(Math.random() * 3)];
      sCol.set([c.r, c.g, c.b], i * 3);
      sPh[i] = Math.random() * 6.283;
      sSz[i] = Math.random() < 0.1 ? 5 + Math.random() * 3 : 1.4 + Math.random() * 1.4;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sg.setAttribute("aColor", new THREE.BufferAttribute(sCol, 3));
    sg.setAttribute("aPhase", new THREE.BufferAttribute(sPh, 1));
    sg.setAttribute("aSize", new THREE.BufferAttribute(sSz, 1));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float aPhase; attribute float aSize; attribute vec3 aColor;
        uniform float uTime, uPR; varying float vA, vBig; varying vec3 vC;
        void main(){
          vA = 0.55 + 0.45*sin(uTime*(0.7 + fract(aPhase*13.0)*1.8) + aPhase);
          vBig = step(4.0, aSize); vC = aColor;
          gl_PointSize = aSize * uPR * (0.85 + 0.3*vA);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying float vA, vBig; varying vec3 vC;
        void main(){
          vec2 p = gl_PointCoord - 0.5;
          float dotv = smoothstep(0.5, 0.05, length(p));
          float cr = (max(0.0,1.0-abs(p.x)*16.0)*max(0.0,1.0-abs(p.y)*2.0) + max(0.0,1.0-abs(p.y)*16.0)*max(0.0,1.0-abs(p.x)*2.0)) * vBig;
          float a = (dotv*0.9 + cr) * vA;
          gl_FragColor = vec4(vC*a, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(sg, starMat));

    // shooting stars: one streak at a time, every few seconds
    const shootArr = new Float32Array(6);
    const shootGeo = new THREE.BufferGeometry();
    shootGeo.setAttribute("position", new THREE.BufferAttribute(shootArr, 3));
    const shootMat = new THREE.LineBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const shootLine = new THREE.Line(shootGeo, shootMat);
    shootLine.frustumCulled = false;
    scene.add(shootLine);
    const shoot = { life: -1, next: 3, pos: new THREE.Vector3(), dir: new THREE.Vector3(), head: new THREE.Vector3(), tail: new THREE.Vector3() };

    // planet + atmosphere
    const planetMat = new THREE.ShaderMaterial({ uniforms: { uSun: { value: SUN }, uTime: { value: 0 } }, vertexShader: PLANET_VS, fragmentShader: PLANET_FS });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), planetMat);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN }, uA: { value: 1 } },
      vertexShader: PLANET_VS, fragmentShader: ATMO_FS,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(planet, new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 96, 64), atmoMat));

    // tilted banded ring (fades out as the camera lands)
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 1 } },
      vertexShader: RING_VS, fragmentShader: RING_FS,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.35, R * 2.1, 160, 1), ringMat);
    ring.rotation.set(1.25, 0, 0.2);
    scene.add(ring);

    // landing site
    const site = new THREE.Group();
    site.position.set(0, R, 0);
    scene.add(site);

    // moon terrain + rocks + crystals + Earth + nebula + asteroids
    const env = createLunarEnvironment({ scene, site, R });

    const fab = fabricTexture(), patchTex = stPatchTexture();
    const astro = buildAstronaut(fab, patchTex), flag = buildFlag(fab), ship = buildShip(), orb = buildOrb(), cat = buildCat(fab, patchTex);
    const pad = buildPad();
    // ShivayTech flag: pole rises from the ground after the rocket lands, cloth streams to the LEFT
    const brand = buildFlag(fab, { dir: -1, name: false, poleH: 4.0 });
    {
      const bt = brandFlagTexture(logoSrc);
      brand.mats.flag.map = bt; brand.mats.flag.emissiveMap = bt;
      brand.mats.flag.emissive.set("#ffffff"); brand.mats.flag.emissiveIntensity = 0.35;
      brand.mats.flag.needsUpdate = true;
      brand.g.visible = false;
      brand.g.rotation.y = 0;
      brand.g.position.set(BRAND_POS.x, gy(BRAND_POS.x, BRAND_POS.z) - 4.6, BRAND_POS.z);
    }
    const [legL, legR] = astro.legs, [armA, armB] = astro.arms;
    astro.g.visible = false;
    astro.g.add(flag.g);
    flag.g.visible = false;
    flag.base.visible = false; // base plate appears once the pole is planted
    flag.g.position.set(-0.55, 0.3, 0.25);
    ship.g.visible = false;
    ship.g.position.set(SHIP_POS.x, 40, SHIP_POS.z);
    ship.flames.visible = true;
    cat.g.visible = false;
    pad.g.position.set(SHIP_POS.x, gy(SHIP_POS.x, SHIP_POS.z), SHIP_POS.z);
    site.add(astro.g, ship.g, orb.g, cat.g, pad.g, brand.g);

    // solid meshes of the characters, rocket and flag cast shadows
    [astro.g, cat.g, ship.g, flag.g, brand.g].forEach((o) =>
      o.traverse((m) => {
        const me = m as THREE.Mesh, mt = me.material as THREE.Material & { isMeshBasicMaterial?: boolean };
        if (me.isMesh && !mt.isMeshBasicMaterial && !mt.transparent) me.castShadow = true;
      })
    );

    // audio
    let ac: AudioContext | null = null;
    const tone = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) => {
      if (!ac) return;
      const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
    };
    const noise = (dur: number, filt: BiquadFilterType, f0: number, f1: number, vol: number, delay = 0) => {
      if (!ac) return;
      const t = ac.currentTime + delay, len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; f.type = filt; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.value = vol; s.connect(f).connect(g).connect(ac.destination); s.start(t);
    };

    // ---- cat voice: a sawtooth "vocal cord" run through moving vowel filters (formants) ----
    type Pts = [number, number][]; // [time as 0..1 fraction of the sound, value]
    const ramp = (p: AudioParam, pts: Pts, t: number, dur: number) => {
      p.setValueAtTime(pts[0][1], t + pts[0][0] * dur);
      for (let i = 1; i < pts.length; i++) p.linearRampToValueAtTime(pts[i][1], t + pts[i][0] * dur);
    };
    const catVoice = (o: { delay?: number; dur: number; vol: number; f0: Pts; f1: Pts; f2: Pts; vib?: number; trem?: number; breath?: number }) => {
      if (!ac) return;
      const A = ac, t = A.currentTime + (o.delay ?? 0), dur = o.dur;
      const osc = A.createOscillator(); osc.type = "sawtooth";
      ramp(osc.frequency, o.f0, t, dur);
      if (o.vib) {
        const l = A.createOscillator(), lg = A.createGain();
        l.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib, t + dur * 0.7);
        l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05);
      }
      const mix = A.createGain(); mix.gain.value = 3.5;
      const formant = (pts: Pts, q: number, gain: number) => {
        const f = A.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q; ramp(f.frequency, pts, t, dur);
        const gn = A.createGain(); gn.gain.value = gain; osc.connect(f).connect(gn).connect(mix);
      };
      formant(o.f1, 6, 1.0); formant(o.f2, 8, 0.8); formant([[0, 3300], [1, 3300]], 6, 0.25);
      let out: AudioNode = mix;
      if (o.trem) { // fast amplitude flutter = rolled "rrr"
        const am = A.createGain(); am.gain.value = 0.55;
        const l = A.createOscillator(), lg = A.createGain(); l.frequency.value = o.trem; lg.gain.value = 0.45;
        l.connect(lg).connect(am.gain); l.start(t); l.stop(t + dur + 0.05);
        mix.connect(am); out = am;
      }
      const env = A.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(o.vol, t + dur * 0.12);
      env.gain.setValueAtTime(o.vol, t + dur * 0.4);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(env); env.connect(A.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
      if (o.breath) noise(dur * 0.8, "bandpass", 2600, 3400, o.breath, o.delay ?? 0);
    };

    // purr: looping brown noise, chopped ~25x per second
    let purr: { stop: () => void } | null = null;
    const purrStart = () => {
      if (!ac || purr) return;
      const A = ac, len = A.sampleRate * 2, buf = A.createBuffer(1, len, A.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 5; }
      const src = A.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const am = A.createGain(); am.gain.value = 0.5;
      const lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 25; lg.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain);
      const g = A.createGain(); g.gain.setValueAtTime(0.0001, A.currentTime); g.gain.exponentialRampToValueAtTime(0.45, A.currentTime + 0.7);
      src.connect(lp).connect(am).connect(g).connect(A.destination);
      src.start(); lfo.start();
      purr = {
        stop() {
          const t = A.currentTime;
          g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
          src.stop(t + 0.4); lfo.stop(t + 0.4);
        },
      };
    };
    const purrStop = () => { try { purr?.stop(); } catch { /* context already closed */ } purr = null; };

    const sfx = {
      thud: () => { tone("sine", 95, 32, 0.45, 0.9); noise(0.3, "lowpass", 600, 120, 0.7); },
      flap: () => noise(0.9, "bandpass", 500, 1600, 0.25),
      chime: () => [660, 880, 1320].forEach((f, i) => tone("triangle", f, f, 1.4, 0.18, i * 0.12)),
      whoosh: () => noise(3, "bandpass", 150, 900, 0.35),
      land: () => { tone("sine", 70, 28, 0.6, 0.8); noise(0.8, "lowpass", 900, 100, 0.5); },
      door: () => { noise(0.8, "highpass", 2000, 7000, 0.22); tone("square", 140, 60, 0.18, 0.25, 0.7); },
      orb: () => { tone("sine", 500, 1400, 0.5, 0.2); tone("triangle", 1400, 1400, 0.8, 0.12, 0.45); },
      rise: () => { noise(1.2, "bandpass", 300, 1400, 0.14); tone("triangle", 220, 660, 1.0, 0.1); },
      // click: tiny kitten "mi-aow" (sometimes a second "mew", sometimes a squeak on the end)
      meow: () => {
        const p = 0.95 + Math.random() * 0.3;
        catVoice({
          dur: 0.46, vol: 0.5, vib: 16 * p, breath: 0.035,
          f0: [[0, 800 * p], [0.18, 1280 * p], [0.4, 1420 * p], [1, 860 * p]],
          f1: [[0, 400], [0.2, 540], [0.5, 900], [1, 660]],
          f2: [[0, 2700], [0.25, 3100], [0.6, 2000], [1, 1500]],
        });
        if (Math.random() < 0.45) {
          catVoice({
            delay: 0.44, dur: 0.32, vol: 0.42, vib: 14 * p, breath: 0.03,
            f0: [[0, 900 * p], [0.25, 1450 * p], [1, 980 * p]],
            f1: [[0, 420], [0.3, 600], [1, 720]],
            f2: [[0, 2800], [0.3, 3200], [1, 1700]],
          });
        }
        if (Math.random() < 0.2) {
          catVoice({ delay: 0.78, dur: 0.12, vol: 0.28, f0: [[0, 1500 * p], [1, 2100 * p]], f1: [[0, 800], [1, 900]], f2: [[0, 3000], [1, 3400]] });
        }
      },
      // hover: cute little kitten "mi-mii?" (soft, smooth, no rolling)
      trill: () => {
        const p = 0.97 + Math.random() * 0.08; // tiny random pitch so it's not identical every hover
        catVoice({
          dur: 0.13, vol: 0.3, breath: 0.01,
          f0: [[0, 950 * p], [1, 1300 * p]],
          f1: [[0, 340], [1, 480]],
          f2: [[0, 2700], [1, 3200]],
        });
        catVoice({
          delay: 0.14, dur: 0.28, vol: 0.32, vib: 12 * p, breath: 0.015,
          f0: [[0, 1150 * p], [0.55, 1750 * p], [1, 1650 * p]],
          f1: [[0, 360], [1, 520]],
          f2: [[0, 2800], [1, 3300]],
        });
      },
    };

    // dust puff
    const puff = (x: number, z: number) => {
      const n = 50, v: number[][] = [], pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6;
        v.push([Math.cos(a) * s, 0.3 + Math.random() * 0.7, Math.sin(a) * s]);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: "#9aa5b8", size: 0.14, transparent: true, opacity: 0.8, depthWrite: false });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; site.add(pts);
      const o = { t: 0 }, y0 = gy(x, z) + 0.05;
      gsap.to(o, {
        t: 1, duration: 1.4, ease: "power2.out",
        onUpdate() {
          for (let i = 0; i < n; i++) pos.set([x + v[i][0] * o.t, y0 + v[i][1] * o.t * (1 - o.t * 0.6), z + v[i][2] * o.t], i * 3);
          mat.opacity = 0.8 * (1 - o.t); geo.attributes.position.needsUpdate = true;
        },
        onComplete() { site.remove(pts); geo.dispose(); mat.dispose(); },
      });
    };

    // glowing shockwave ring on the ground
    const shockwave = (x: number, z: number) => {
      const waveMat = new THREE.MeshBasicMaterial({ color: "#6cc6ff", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), waveMat);
      wave.rotation.x = -Math.PI / 2;
      wave.position.set(x, gy(x, z) + 0.08, z);
      wave.scale.setScalar(0.1);
      site.add(wave);
      gsap.to(wave.scale, { x: 5, y: 5, z: 5, duration: 1.6, ease: "power2.out" });
      gsap.to(waveMat, {
        opacity: 0, duration: 1.6,
        onComplete() { site.remove(wave); wave.geometry.dispose(); waveMat.dispose(); },
      });
    };

    // runtime state
    const st = { walk: false, ph: 0, shake: 0, descending: false, btnOn: false, landed: false, flagAmp: 0, brandAmp: 0 };

    // cat: click / touch -> meow + heart, hover -> trill + purr
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hitCat = (e: PointerEvent) => {
      if (!cat.g.visible) return false;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      return ray.intersectObject(cat.g, true).length > 0;
    };

    // Every click kills the previous click animation and starts a fresh one that ALWAYS ends
    // with mouth = 0, so spam-clicking can never leave the mouth open.
    let clickTl: gsap.core.Timeline | null = null;
    const meowAnim = () => {
      sfx.meow();
      cat.heart();
      const s = cat.state;
      s.lastClick = performance.now() / 1000;
      clickTl?.kill();
      clickTl = gsap.timeline({
        onComplete() { s.mouth = 0; s.joy = 0; s.wave = 0; s.nod = 0; s.hop = 0; },
      })
        .to(s, { hop: 0.14, nod: -0.25, mouth: 1, joy: 1, wave: 1, duration: 0.14, ease: "power2.out" })
        .to(s, { hop: 0, duration: 0.35, ease: "bounce.out" }, 0.14)
        .to(s, { nod: 0, duration: 0.3, ease: "sine.inOut" }, 0.14)
        .to(s, { mouth: 0, duration: 0.22, ease: "sine.in" }, 0.36)
        .to(s, { wave: 0, joy: 0, duration: 0.3, ease: "sine.inOut" }, 0.8);
    };
    let hov = false;
    const setHover = (v: boolean) => {
      if (v === hov) return;
      hov = v; cat.state.hover = v;
      if (v) { sfx.trill(); purrStart(); } else { purrStop(); }
    };
    const onDown = (e: PointerEvent) => { if (hitCat(e)) meowAnim(); };
    const onMove = (e: PointerEvent) => {
      const h = e.pointerType !== "touch" && hitCat(e);
      host.style.cursor = h ? "pointer" : "";
      setHover(h);
    };
    const onLeave = () => { host.style.cursor = ""; setHover(false); };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    const orbToButton = () => {
      const start = new THREE.Vector3(SHIP_POS.x, 1.9, SHIP_POS.z + 0.5);
      orb.g.position.copy(start); orb.g.visible = true;
      gsap.timeline()
        .to(orb.g.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(2)" })
        .to(orb.g.position, { x: start.x + 0.5, y: 2.5, z: start.z + 1.7, duration: 0.9, ease: "power2.out" })
        .to(orb.g.position, { x: ANCHOR.x, y: ANCHOR.y, z: ANCHOR.z, duration: 1.1, ease: "power2.inOut" })
        .add(() => {
          sfx.orb(); st.btnOn = true; setBtnOn(true);
          gsap.to(ship.door.rotation, { y: 0, duration: 1.1, ease: "power2.inOut" });
          gsap.to(ship.doorLight, { intensity: 0, duration: 1.1 });
        })
        .to(orb.g.scale, { x: 0, y: 0, z: 0, duration: 0.35, ease: "power2.in" }, "<")
        .add(() => { orb.g.visible = false; });
    };

    api.current = {
      plant(nm, cc) {
        ac = new AudioContext();
        const mk = (w: number, h: number) => {
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
          return { x: c.getContext("2d")!, tx };
        };
        const F = mk(960, 640), Nm = mk(880, 304), P = mk(150, 100);
        const draw = (img?: HTMLImageElement) => {
          F.x.fillStyle = "#334155"; F.x.fillRect(0, 0, 960, 640);
          if (img) F.x.drawImage(img, 0, 0, 960, 640);
          F.tx.needsUpdate = true;
          const x = Nm.x;
          x.fillStyle = "#0b1730"; x.fillRect(0, 0, 880, 304);
          x.fillStyle = "#6cc6ff"; x.fillRect(0, 0, 880, 8); x.fillRect(0, 296, 880, 8);
          let fs = 130; x.font = `bold ${fs}px Arial, sans-serif`;
          while (x.measureText(nm).width > 800 && fs > 24) { fs -= 2; x.font = `bold ${fs}px Arial, sans-serif`; }
          x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle";
          x.fillText(nm, 440, 160);
          Nm.tx.needsUpdate = true;
          P.x.fillStyle = "#334155"; P.x.fillRect(0, 0, 150, 100);
          if (img) P.x.drawImage(img, 0, 0, 150, 100);
          P.tx.needsUpdate = true;
        };
        draw();
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => draw(img);
        img.src = `https://flagcdn.com/w640/${cc.toLowerCase()}.png`;
        flag.mats.flag.map = F.tx; flag.mats.flag.needsUpdate = true;
        flag.mats.name.map = Nm.tx; flag.mats.name.needsUpdate = true;
        astro.flagPatchMat.map = P.tx; astro.flagPatchMat.color.set("#ffffff"); astro.flagPatchMat.needsUpdate = true;

        astro.g.visible = true; flag.g.visible = true;
        astro.g.position.set(11, 0, 1.2); astro.g.rotation.y = -Math.PI / 2;
        armA.sh.rotation.x = -0.6; armA.el.rotation.x = -0.9;
        st.walk = true;

        // Billu follows the astronaut and settles beside him
        cat.g.visible = true;
        cat.g.position.set(12.6, 0, CAT_POS.z); cat.g.rotation.y = -Math.PI / 2;
        cat.state.walking = true;
        gsap.to(cat.g.position, {
          x: CAT_POS.x, duration: 3.9, ease: "power1.inOut",
          onComplete() {
            cat.state.walking = false;
            gsap.to(cat.g.rotation, { y: -0.35, duration: 0.7, ease: "power2.inOut" });
          },
        });

        const tl = gsap.timeline();
        tl.to(astro.g.position, { x: STAND_X, duration: 3.6, ease: "power1.inOut" })
          .add(() => { st.walk = false; })
          .to([legL.hip.rotation, legR.hip.rotation, legL.knee.rotation, legR.knee.rotation, armB.sh.rotation], { x: 0, duration: 0.3 })
          .to(astro.g.rotation, { y: -0.5, duration: 0.7, ease: "power2.inOut" }, "<")
          .to(armA.sh.rotation, { x: -2.4, duration: 0.5, ease: "power2.out" })
          .to(armA.el.rotation, { x: -0.2, duration: 0.5 }, "<")
          .add(() => {
            site.attach(flag.g);
            gsap.to(flag.g.rotation, { x: 0, y: 0, z: 0, duration: 0.35 });
            gsap.to(armA.sh.rotation, { x: -0.9, duration: 0.35, ease: "power3.in" });
            gsap.to(flag.g.position, { x: FLAG_X, y: gy(FLAG_X, 0) - 0.2, z: 0, duration: 0.35, ease: "power3.in", onComplete: impact });
          });
        function impact() {
          sfx.thud(); puff(FLAG_X, 0); shockwave(FLAG_X, 0); st.shake = 1;
          flag.base.visible = true;
          st.flagAmp = 0.45;
          gsap.to(flag.cloths.map((c) => c.scale), { x: 1, duration: 1.2, ease: "power2.out", delay: 0.25 });
          gsap.to(st, { flagAmp: IDLE_AMP, duration: 4, ease: "power2.out", delay: 0.4 });
          setTimeout(() => { sfx.flap(); sfx.chime(); }, 250);
          gsap.timeline({ delay: 0.5 })
            .to(astro.g.rotation, { y: 0.15, duration: 0.6 })
            .to(armB.sh.rotation, { z: 2.6, duration: 0.5 })
            .to(armB.el.rotation, { z: 0.7, duration: 0.3, yoyo: true, repeat: 5, ease: "sine.inOut" })
            .to([armB.sh.rotation, armB.el.rotation], { z: 0, duration: 0.5 })
            .to(armA.sh.rotation, { x: 0, duration: 0.5 }, "<")
            .to(armA.el.rotation, { x: 0, duration: 0.5 }, "<");
          setPhase("done");
          setTimeout(() => {
            sfx.whoosh(); ship.g.visible = true; st.descending = true;
            ship.legs.forEach((l) => gsap.to(l.rotation, { z: 0.78, duration: 1.4, delay: 0.6, ease: "power2.out" }));
            gsap.to(ship.g.position, {
              y: gy(SHIP_POS.x, SHIP_POS.z) + 0.02, duration: 3, ease: "power3.out",
              onComplete() {
                st.descending = false; ship.flames.visible = false; ship.light.visible = false;
                sfx.land(); puff(SHIP_POS.x, SHIP_POS.z); st.shake = 0.8;

                // landing pad pops up and its lamps switch on one by one
                pad.g.visible = true; pad.g.scale.setScalar(0.01);
                gsap.to(pad.g.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "back.out(1.6)" });
                pad.lamps.forEach((l, i) =>
                  gsap.delayedCall(0.4 + i * 0.1, () => (l.material as THREE.MeshBasicMaterial).color.set("#6cc6ff"))
                );

                // ShivayTech flag: pole telescopes up out of the ground, then the cloth unfurls to the left
                gsap.delayedCall(1.4, () => {
                  sfx.rise(); puff(BRAND_POS.x, BRAND_POS.z);
                  brand.g.visible = true;
                  gsap.to(brand.g.position, { y: gy(BRAND_POS.x, BRAND_POS.z) - 0.2, duration: 1.8, ease: "power2.out" });
                  gsap.delayedCall(1.5, () => {
                    sfx.flap(); sfx.chime();
                    st.brandAmp = 0.45;
                    gsap.to(brand.cloths.map((c) => c.scale), { x: 1, duration: 1.4, ease: "power2.out" });
                    gsap.to(st, { brandAmp: IDLE_AMP, duration: 4, ease: "power2.out", delay: 0.3 });
                  });
                });

                gsap.timeline({ delay: 0.8 })
                  .add(() => sfx.door())
                  .to(ship.door.rotation, { y: -1.9, duration: 1.1, ease: "power2.inOut" })
                  .to(ship.doorLight, { intensity: 10, duration: 0.6 }, "<")
                  .add(orbToButton, "-=0.2");
              },
            });
          }, 1800);
        }
      },
    };

    // loop
    const sizeIt = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      cam.aspect = host.clientWidth / host.clientHeight; cam.updateProjectionMatrix();
    };
    sizeIt(); window.addEventListener("resize", sizeIt);

    const P0 = new THREE.Vector3(0, 35, 430), P1 = new THREE.Vector3(0, R * 3, 170), P2 = new THREE.Vector3(0, R + 1.7, 11);
    const look = new THREE.Vector3(), tmp = new THREE.Vector3(), clock = new THREE.Clock();
    let sp = 0, raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05), vh = window.innerHeight, time = clock.elapsedTime;
      const r = section.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const tgt = THREE.MathUtils.clamp(-r.top / (r.height - vh), 0, 1);
      sp += (tgt - sp) * Math.min(1, dt * 5);

      const t = 1 - Math.pow(1 - sp, 1.8), a = 1 - t;
      cam.position.set(0, a * a * P0.y + 2 * a * t * P1.y + t * t * P2.y, a * a * P0.z + 2 * a * t * P1.z + t * t * P2.z);
      const k = t * t * (3 - 2 * t);
      cam.lookAt(look.set(0, k * (R + 1.3), 0));
      if (st.shake > 0.01) { cam.position.y += Math.sin(time * 60) * 0.03 * st.shake; st.shake *= 0.9; }

      planet.rotation.y += dt * 0.06 * (1 - THREE.MathUtils.smoothstep(sp, 0.35, 0.8));
      planetMat.uniforms.uTime.value = time;
      starMat.uniforms.uTime.value = time;
      const atmoFade = 1 - THREE.MathUtils.smoothstep(sp, 0.55, 0.85);
      atmoMat.uniforms.uA.value = atmoFade;
      ringMat.uniforms.uA.value = atmoFade;
      ring.visible = atmoFade > 0.005;
      ring.rotation.z += dt * 0.01;
      if (hint.current) hint.current.style.opacity = String(1 - THREE.MathUtils.clamp(sp * 8, 0, 1));

      // shooting star
      shoot.next -= dt;
      if (shoot.life < 0 && shoot.next < 0) {
        shoot.pos.randomDirection().multiplyScalar(900);
        shoot.pos.z = -Math.abs(shoot.pos.z); shoot.pos.y = Math.abs(shoot.pos.y);
        shoot.dir.randomDirection().cross(shoot.pos).normalize();
        shoot.life = 0; shoot.next = rnd(4, 9);
      }
      if (shoot.life >= 0) {
        shoot.life += dt;
        shoot.head.copy(shoot.pos).addScaledVector(shoot.dir, shoot.life * 900);
        shoot.tail.copy(shoot.head).addScaledVector(shoot.dir, -200);
        shoot.tail.toArray(shootArr, 0); shoot.head.toArray(shootArr, 3);
        shootGeo.attributes.position.needsUpdate = true;
        shootMat.opacity = Math.sin(Math.min(shoot.life / 0.8, 1) * Math.PI);
        if (shoot.life > 0.8) { shoot.life = -1; shootMat.opacity = 0; }
      }

      // fade in moon / crystals / Earth / asteroids with scroll progress
      env.update(time, dt, sp);

      const isLanded = sp > PANEL_AT;
      if (isLanded !== st.landed) { st.landed = isLanded; setLanded(isLanded); }

      if (st.walk) {
        st.ph += dt * 5.5;
        const s = Math.sin(st.ph), c = Math.cos(st.ph);
        legL.hip.rotation.x = -s * 0.5; legR.hip.rotation.x = s * 0.5;
        legL.knee.rotation.x = Math.max(0, c) * 0.8; legR.knee.rotation.x = Math.max(0, -c) * 0.8;
        armB.sh.rotation.x = s * 0.45;
        astro.b.position.y = Math.abs(s) * 0.045;
        astro.b.rotation.z = s * 0.03;
      } else { astro.b.position.y *= 0.8; astro.b.rotation.z *= 0.8; }
      if (astro.g.visible) astro.g.position.y = gy(astro.g.position.x, astro.g.position.z) - 0.02;
      if (cat.g.visible) {
        cat.update(time, dt);
        cat.g.position.y = gy(cat.g.position.x, cat.g.position.z) - 0.02;
      }
      // flags keep waving: steady breeze plus slow gusts (country flag streams right, ShivayTech flag left)
      const gust = 1 + 0.25 * Math.sin(time * 0.9) + 0.15 * Math.sin(time * 2.3 + 1);
      if (flag.g.visible) flag.update(time, st.flagAmp * gust);
      if (brand.g.visible) brand.update(time + 1.7, st.brandAmp * gust);
      if (st.descending) {
        const f = 0.85 + Math.random() * 0.3;
        ship.flames.scale.set(f, 0.9 + Math.random() * 0.25, f); ship.light.intensity = 45 + Math.random() * 30;
      }
      if (orb.g.visible) { orb.r1.rotation.x += dt * 3; orb.r2.rotation.z += dt * 4; }
      if (st.btnOn && btn.current) {
        const w = host.clientWidth, h = host.clientHeight;
        const v = site.localToWorld(tmp.set(ANCHOR.x, ANCHOR.y + Math.sin(time * 2) * 0.06, ANCHOR.z)).project(cam);
        const px = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * w, 90, w - 90), py = THREE.MathUtils.clamp((-v.y * 0.5 + 0.5) * h, 70, h - 70);
        btn.current.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
        btn.current.style.opacity = st.landed ? "1" : "0";
        btn.current.style.pointerEvents = st.landed ? "auto" : "none";
      }
      renderer.render(scene, cam);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sizeIt);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      clickTl?.kill();
      gsap.killTweensOf("*");
      purrStop();
      ac?.close();
      shootGeo.dispose(); shootMat.dispose();
      ringMat.dispose(); ring.geometry.dispose();
      env.dispose(); // frees terrain, rocks, crystals, Earth, nebula and asteroid resources
      renderer.dispose();
      renderer.forceContextLoss();
      host.removeChild(renderer.domElement);
    };
  }, [logoSrc]);

  const plant = () => {
    setPhase("planting");
    api.current?.plant(name.trim(), code);
  };

  return (
    <section ref={outer} className="st-cta" style={{ height: `${SCROLL_VH}vh` }}>
      <style>{CSS}</style>
      <div className="st-cta__stick">
        <div ref={mount} className="st-cta__canvas" />

        <div ref={hint} className="st-cta__hint">
          <span>Scroll to approach ST planet</span>
          <i />
        </div>

        {landed && phase === "ready" && (
          <div className="st-cta__panel">
            <h2>Land on ST planet</h2>
            <p>
              Press the button and start your dream project with ShivayTech. Pick your country, add your name, and
              we will put your flag on this planet.
            </p>
            <label>
              Your name
              <input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </label>
            <label>
              Your country
              <span className="st-cta__select">
                {code && <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt="" />}
                <select value={code} onChange={(e) => setCode(e.target.value)}>
                  <option value="">Select your country</option>
                  {countries.map((c) => (
                    <option key={c.c} value={c.c}>{c.n}</option>
                  ))}
                </select>
              </span>
            </label>
            <button className="st-cta__go" disabled={!name.trim() || !code} onClick={plant}>
              Plant my flag
            </button>
          </div>
        )}

        {phase === "done" && (
          <p className="st-cta__welcome">
            Welcome to ST planet, <b>{name.trim()}</b>
          </p>
        )}

        {btnOn && (
          <a ref={btn} href={startHref} className="st-cta__start">
            <span>Let&apos;s Start</span>
          </a>
        )}
      </div>
    </section>
  );
}