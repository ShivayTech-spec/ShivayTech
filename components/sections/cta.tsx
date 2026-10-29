"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";

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
const ANCHOR = new THREE.Vector3(-3.4, 3.1, 2.4); // where the "Let's Start" button floats
const SUN = new THREE.Vector3(-0.45, 0.55, 0.75).normalize();

const CODES =
  "IN US GB CA AU AE SA QA KW OM BH PK BD NP LK BT MV AF ID MY SG TH VN PH CN JP KR HK TW MN RU UA PL DE FR IT ES PT NL BE CH AT SE NO DK FI IE GR TR IL EG ZA NG KE GH ET MA DZ TN TZ UG BR AR MX CO CL PE VE CU NZ FJ IR IQ KZ UZ RO CZ HU BG RS HR".split(
    " "
  );

/* ---------- planet shaders ---------- */
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

  vec3 ocean = mix(vec3(.008,.025,.07), vec3(.03,.14,.20), smoothstep(.36,.47,cont));
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
  col += rim*vec3(.35,.6,1.0);
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
  gl_FragColor = vec4(vec3(.28,.58,1.0)*f*lit*uA*1.0, 1.0);
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

/* ---------- flag ---------- */
const FW = 1.5, FH = 1.0, NW = 1.1, NH = 0.38, POLE = 4.4;

function makeCloth(w: number, h: number, sx: number, sy: number, fab: THREE.Texture, y: number, rodMat: THREE.Material) {
  const geo = new THREE.PlaneGeometry(w, h, sx, sy); geo.translate(w / 2, -h / 2, 0);
  const pos = geo.attributes.position, xs = new Float32Array(pos.count), ys = new Float32Array(pos.count), s = w / 2.4;
  for (let i = 0; i < pos.count; i++) { xs[i] = pos.getX(i); ys[i] = pos.getY(i); }
  const update = (t: number, amp: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = xs[i], yy = ys[i], u = x / w, v = -yy / h;
      const fold = Math.sin(x * 7 + Math.sin(yy * 1.7) * 1.5) * 0.07 + Math.sin(x * 15 + yy * 2) * 0.02 + Math.sin(x * 3.1 + 1) * 0.05;
      const wave = amp * Math.sin(x * 3.2 - t * 7 + v * 1.5);
      pos.setZ(i, (fold + wave) * s * u * (0.1 + 0.9 * v));
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  update(0, 0);
  const bump = fab.clone(); bump.repeat.set(10, 8); bump.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92, side: THREE.DoubleSide, bumpMap: bump, bumpScale: 1 });
  const group = new THREE.Group(); group.position.y = y;
  const rod = mesh(new THREE.CylinderGeometry(0.016, 0.016, w + 0.06, 10), rodMat, w / 2, 0.01, 0);
  rod.rotation.z = Math.PI / 2;
  group.add(new THREE.Mesh(geo, mat), rod);
  group.scale.x = 0.04;
  return { group, mat, update };
}

function buildFlag(fab: THREE.Texture) {
  const metal = std("#c9ced6", 0.3, 1);
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.024, 0.024, POLE, 14), metal, 0, POLE / 2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.05, 16, 12), std("#e3b04b", 0.2, 1), 0, POLE + 0.03, 0));
  const top = makeCloth(FW, FH, 48, 32, fab, POLE - 0.3, metal);
  const low = makeCloth(NW, NH, 36, 14, fab, POLE - 0.3 - FH - 0.15, metal);
  g.add(top.group, low.group);
  return {
    g, cloths: [top.group, low.group], mats: { flag: top.mat, name: low.mat },
    update: (t: number, a: number) => { top.update(t, a); low.update(t, a); },
  };
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

  const navy = std("#1a2236", 0.45, 0.8);
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

  // engines + flames
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

/* ---------- component ---------- */
type Api = { plant: (name: string, code: string) => void };

export default function CTASection({ startHref = "/contact" }: { startHref?: string }) {
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
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#02040c");
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.7;
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
    const sunL = new THREE.DirectionalLight("#fff4e6", 3);
    sunL.position.copy(SUN).multiplyScalar(100);
    scene.add(sunL, new THREE.HemisphereLight("#5b7cff", "#10131f", 0.35));

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

    // planet + atmosphere
    const planetMat = new THREE.ShaderMaterial({ uniforms: { uSun: { value: SUN }, uTime: { value: 0 } }, vertexShader: PLANET_VS, fragmentShader: PLANET_FS });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), planetMat);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN }, uA: { value: 1 } },
      vertexShader: PLANET_VS, fragmentShader: ATMO_FS,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(planet, new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 96, 64), atmoMat));

    // landing site
    const site = new THREE.Group();
    site.position.set(0, R, 0);
    scene.add(site);
    const fab = fabricTexture(), patchTex = stPatchTexture();
    const astro = buildAstronaut(fab, patchTex), flag = buildFlag(fab), ship = buildShip(), orb = buildOrb();
    const [legL, legR] = astro.legs, [armA, armB] = astro.arms;
    astro.g.visible = false;
    astro.g.add(flag.g);
    flag.g.visible = false;
    flag.g.position.set(-0.55, 0.3, 0.25);
    ship.g.visible = false;
    ship.g.position.set(SHIP_POS.x, 40, SHIP_POS.z);
    ship.flames.visible = true;
    site.add(astro.g, ship.g, orb.g);

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
    const sfx = {
      thud: () => { tone("sine", 95, 32, 0.45, 0.9); noise(0.3, "lowpass", 600, 120, 0.7); },
      flap: () => noise(0.9, "bandpass", 500, 1600, 0.25),
      chime: () => [660, 880, 1320].forEach((f, i) => tone("triangle", f, f, 1.4, 0.18, i * 0.12)),
      whoosh: () => noise(3, "bandpass", 150, 900, 0.35),
      land: () => { tone("sine", 70, 28, 0.6, 0.8); noise(0.8, "lowpass", 900, 100, 0.5); },
      door: () => { noise(0.8, "highpass", 2000, 7000, 0.22); tone("square", 140, 60, 0.18, 0.25, 0.7); },
      orb: () => { tone("sine", 500, 1400, 0.5, 0.2); tone("triangle", 1400, 1400, 0.8, 0.12, 0.45); },
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

    // runtime state
    const st = { walk: false, ph: 0, shake: 0, descending: false, btnOn: false, landed: false, flagAmp: 0 };

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
          sfx.thud(); puff(FLAG_X, 0); st.shake = 1;
          st.flagAmp = 0.1;
          gsap.to(flag.cloths.map((c) => c.scale), { x: 1, duration: 1.2, ease: "power2.out", delay: 0.25 });
          gsap.to(st, { flagAmp: 0, duration: 4, ease: "power2.out", delay: 0.4 });
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
      atmoMat.uniforms.uA.value = 1 - THREE.MathUtils.smoothstep(sp, 0.55, 0.85);
      if (hint.current) hint.current.style.opacity = String(1 - THREE.MathUtils.clamp(sp * 8, 0, 1));

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
      if (st.flagAmp > 0.002) flag.update(time, st.flagAmp);
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
      gsap.killTweensOf("*");
      ac?.close();
      renderer.dispose();
      renderer.forceContextLoss();
      host.removeChild(renderer.domElement);
    };
  }, []);

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