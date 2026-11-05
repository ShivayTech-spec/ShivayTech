"use client";

/**
 * ShivayTech - "Why work with us"
 * components/sections/WhyWorkWithUs.tsx (one file, CSS included)
 *
 * npm i react-pageflip
 * screenshots go in /public/images (names in REASONS)
 *
 * - the scene is only built when the section is ~2 screens away
 * - "lite" mode (weak device, save-data, reduced motion, or dropped frames while scrolling)
 *   means simpler people, no filters, no ambient motion
 * - no layout reads while scrolling; ambient animation pauses while scrolling or when the tab is hidden
 */

import {
	cloneElement,
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { CSSProperties, ReactElement } from "react";
import HTMLFlipBook from "react-pageflip";

/* @@CONTENT_START */

type HairStyle = "short" | "buzz" | "long" | "bun" | "curly" | "turban";
type Look = {
	shirt: string;
	hair: string;
	skin: string;
	hairStyle: HairStyle;
	cloth?: string; // turban colour
	glasses?: boolean;
	beard?: boolean;
	item: "phone" | "notebook"; // lying beside the laptop
	watch?: boolean;
};
type Reason = {
	title: string;
	why: string;
	steps: [string, string, string];
	project: { name: string; type: string; detail: string; tags: string[]; image: string };
	look: Look;
};

const REASONS: Reason[] = [
	{
		title: "Custom-coded builds",
		why: "No templates and no page-builder bloat. Your site is coded around your brand, so it loads fast and looks like nobody else's.",
		steps: [
			"We map your goals, pages and visitor journey.",
			"We design and code it from scratch in Next.js or React.",
			"We test on every device, then launch.",
		],
		project: {
			name: "Platinum Realtors",
			type: "Real-estate website",
			detail: "A Next.js website with its own blog and admin system, built to be managed without a developer.",
			tags: ["Next.js", "TypeScript", "Admin panel"],
			image: "/images/platinum.png",
		},
		look: { shirt: "#2f6bff", hair: "#1a1410", skin: "#d9a67c", hairStyle: "short", glasses: true, item: "notebook", watch: true },
	},
	{
		title: "SEO-first websites",
		why: "Rankings are built into the code, not added later: clean structure, fast pages and content that search engines can read.",
		steps: [
			"We research your services, city and competitors.",
			"We build a dedicated page for every service.",
			"We set up and optimise your Google Business Profile.",
		],
		project: {
			name: "Grand Home Construction Ltd",
			type: "Construction company website",
			detail: "SEO service pages, an admin dashboard and Google Business Profile optimisation.",
			tags: ["SEO pages", "Dashboard", "GMB"],
			image: "/images/grand-homes.png",
		},
		look: { shirt: "#e0334a", hair: "#2a1c14", skin: "#c48a62", hairStyle: "long", item: "phone" },
	},
	{
		title: "Stores that sell",
		why: "Shopify stores with custom sections, smooth checkout and the payment and shipping options your customers expect.",
		steps: [
			"We plan the catalogue, collections and offers.",
			"We write custom Liquid sections for your brand.",
			"We connect payments and shipping, then test orders.",
		],
		project: {
			name: "Rishi Vaidik",
			type: "Shopify store",
			detail: "Custom Liquid sections with payment and shipping integration.",
			tags: ["Shopify", "Liquid", "Payments"],
			image: "/images/rishi.png",
		},
		look: { shirt: "#c98f12", hair: "#2b1d14", skin: "#e8bb94", hairStyle: "turban", cloth: "#f1b72f", beard: true, item: "notebook" },
	},
	{
		title: "Motion and 3D",
		why: "Interactive visuals make people stop scrolling and remember you, without slowing the page down.",
		steps: [
			"We pick one signature moment for your brand.",
			"We build it with Three.js and GSAP.",
			"We optimise it so it stays smooth on phones.",
		],
		project: {
			name: "Rank Up Digitaly",
			type: "Digital agency website",
			detail: "A multi-page site with Three.js visuals and smooth AJAX navigation.",
			tags: ["Three.js", "AJAX nav", "Multi-page"],
			image: "/images/rank.png",
		},
		look: { shirt: "#19b6a6", hair: "#14100d", skin: "#b9805a", hairStyle: "curly", item: "phone" },
	},
	{
		title: "Easy to manage",
		why: "You should be able to publish and update content yourself, without calling a developer for every change.",
		steps: [
			"We agree who edits what on the site.",
			"We build a simple admin for those tasks.",
			"We train your team and hand over the docs.",
		],
		project: {
			name: "SGGS Khalsa College",
			type: "College website",
			detail: "A blog system on Node, Express and MongoDB so staff can publish on their own.",
			tags: ["Node.js", "Express", "MongoDB"],
			image: "/images/sggs.png",
		},
		look: { shirt: "#8a5cf6", hair: "#1d1612", skin: "#f0c8a0", hairStyle: "bun", glasses: true, item: "notebook" },
	},
	{
		title: "Support after launch",
		why: "Launch is the start. We keep your site updated, secure and bringing in customers with maintenance and ads.",
		steps: [
			"We monitor, back up and update your site.",
			"We fix issues quickly when something breaks.",
			"We run Google and Meta ads to bring in leads.",
		],
		project: {
			name: "Shivay Fashion",
			type: "Fashion brand",
			detail: "Replace this line with what you maintain and grow for this client.",
			tags: ["Maintenance", "Google Ads", "Meta Ads"],
			image: "/images/shivay-fashion.jpg",
		},
		look: { shirt: "#7cb7ff", hair: "#2a2018", skin: "#a8714a", hairStyle: "buzz", beard: true, item: "phone" },
	},
];

/* @@CONTENT_END */

/* ───────── constants + helpers ───────── */

const SECTION_HEIGHT_VH = 820;
const START = 0.06; // scroll progress where reason 1 begins
const END = 0.96; // scroll progress where reason 6 ends
const FLIP_MS = 1000;
const FLIP_MS_LITE = 650;
const LITE_KEY = "wwuLite";

const VB = 1000;
const SEAT_R = 335;
const TABLE_R = 255;
const ANGLES = [30, 90, 150, 210, 270, 330];
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const STAR_D = "M0,-46 C5,-14 14,-5 46,0 C14,5 5,14 0,46 C-5,14 -14,5 -46,0 C-14,-5 -5,-14 0,-46Z";
const NO_STYLE: CSSProperties = {};

type Pt = [number, number];

const n2 = (n: number) => Math.round(n * 100) / 100;

/** seeded random: server and client draw the same thing */
function rng(seed: number) {
	let s = seed % 2147483647;
	if (s <= 0) s += 2147483646;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hash(str: string) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return ((h >>> 0) % 2147483646) + 1;
}

/** 6-digit hex only */
function mix(a: string, b: string, t: number) {
	const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const y = p(b);
	return "#" + p(a).map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const darken = (c: string, t: number) => mix(c, "#000000", t);
const lighten = (c: string, t: number) => mix(c, "#ffffff", t);

/** where each person sits inside its own svg box (scale origin of the highlight) */
const ORIGINS = ANGLES.map((a) => {
	const r = (a * Math.PI) / 180;
	return `${n2((500 + SEAT_R * Math.sin(r)) / 10)}% ${n2((500 - SEAT_R * Math.cos(r)) / 10)}%`;
});

/** true = lite rendering */
const LiteCtx = createContext(false);

/* ───────── small pieces ───────── */

const Star = memo(function Star({ size = 40 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
			<defs>
				<linearGradient id="wwuStarG" x1="0" y1="-1" x2="0" y2="1">
					<stop offset="0" stopColor="#bcd8ff" />
					<stop offset="1" stopColor="#2f6bff" />
				</linearGradient>
			</defs>
			<path d={STAR_D} fill="url(#wwuStarG)" />
		</svg>
	);
});

/** Browser-style frame. The blurred backdrop copy is hidden by CSS on phones / lite (display:none + lazy = never loaded). */
const Shot = memo(function Shot({ src, name }: { src: string; name: string }) {
	const [ok, setOk] = useState(true);
	const fg = useRef<HTMLImageElement | null>(null);

	/* catches failures that happened before React attached onError */
	useEffect(() => {
		setOk(true);
		const el = fg.current;
		if (el?.complete && el.naturalWidth === 0) setOk(false);
	}, [src]);

	return (
		<div className="wwu-shot">
			<div className="bar">
				<i />
				<i />
				<i />
			</div>
			<div className="view">
				{ok ? (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img className="bg" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" fetchPriority="low" />
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							ref={fg}
							className="fg"
							src={src}
							alt={`${name} website screenshot`}
							loading="lazy"
							decoding="async"
							fetchPriority="low"
							onError={() => setOk(false)}
						/>
					</>
				) : (
					<div className="ph">{name}</div>
				)}
			</div>
		</div>
	);
});

/* ───────── book cover ───────── */

const BK_STARS = (() => {
	const r = rng(7);
	return Array.from({ length: 48 }, () => ({
		x: n2(30 + r() * 266),
		y: n2(14 + r() * 392),
		r: n2(0.4 + r() * 1.1),
		o: n2(0.3 + r() * 0.6),
	}));
})();

const BK_CORNER = "M0 0 H46 L38 8 H10 V36 L0 46 Z";
const BK_CORNERS = ["translate(34 10)", "translate(292 10) scale(-1 1)", "translate(34 410) scale(1 -1)", "translate(292 410) scale(-1 -1)"];

/** The neon glow filters are switched off by CSS on phones / lite, so no re-render is needed. */
const BookCover = memo(function BookCover({ kind }: { kind: "front" | "back" }) {
	const front = kind === "front";
	const sx = front ? 0 : 274; // spine x
	const dx = front ? 0 : -26; // content shifts left on the back cover
	const id = `wwuBk${kind}`;
	const f = `url(#${id}Gl)`;
	const ag = `url(#${id}Ag)`;
	const bl = `url(#${id}Bl)`;
	const font = { fontFamily: "inherit" };

	return (
		<svg viewBox="0 0 300 420" aria-hidden="true" className="wwu-bkart">
			<defs>
				<radialGradient id={`${id}Bg`} cx="50%" cy="50%" r="75%">
					<stop offset="0" stopColor="#0b1a4a" />
					<stop offset="0.6" stopColor="#050d2a" />
					<stop offset="1" stopColor="#02050f" />
				</radialGradient>
				<radialGradient id={`${id}Neb`} cx="50%" cy="50%" r="50%">
					<stop offset="0" stopColor="#2f6bff" stopOpacity="0.75" />
					<stop offset="0.6" stopColor="#1c3fb8" stopOpacity="0.3" />
					<stop offset="1" stopColor="#1c3fb8" stopOpacity="0" />
				</radialGradient>
				<linearGradient id={`${id}Ag`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="0.45" stopColor="#b9c4d8" />
					<stop offset="0.7" stopColor="#6b7790" />
					<stop offset="1" stopColor="#d9e2f2" />
				</linearGradient>
				<linearGradient id={`${id}Bl`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#9cc4ff" />
					<stop offset="1" stopColor="#1f55ff" />
				</linearGradient>
				<linearGradient id={`${id}Sp`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#000" />
					<stop offset="0.7" stopColor="#0a1230" />
					<stop offset="1" stopColor="#050a1c" />
				</linearGradient>
				<linearGradient id={`${id}Wt`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#1d4fe0" stopOpacity="0.85" />
					<stop offset="1" stopColor="#050d2a" stopOpacity="0" />
				</linearGradient>
				<filter id={`${id}Gl`} x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="2.6" result="b" />
					<feMerge>
						<feMergeNode in="b" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<rect width="300" height="420" fill={`url(#${id}Bg)`} />
			{BK_STARS.map((s, i) => (
				<circle key={i} cx={s.x + dx} cy={s.y} r={s.r} fill="#cfe0ff" opacity={s.o} />
			))}

			<g transform={`translate(${dx} 0)`}>
				<path d="M 44 14 H 282 L 292 24 V 396 L 282 406 H 44 L 34 396 V 24 Z" fill="none" stroke="#2f6bff" strokeWidth="2" filter={f} />
				<path d="M 49 20 H 277 L 286 29 V 391 L 277 400 H 49 L 40 391 V 29 Z" fill="none" stroke="#4f8bff" strokeOpacity="0.35" strokeWidth="0.8" />

				{BK_CORNERS.map((t, i) => (
					<g key={i} transform={t}>
						<path d={BK_CORNER} fill={ag} stroke="#1a2236" strokeWidth="0.6" />
						<path d="M 3 3 H 38" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
					</g>
				))}

				<path d="M 163 14 L 172 22 L 163 30 L 154 22 Z" fill="#1f55ff" stroke="#9cc4ff" strokeWidth="1" filter={f} />
				<path d="M 120 22 H 152 M 174 22 H 206" stroke="#4f8bff" strokeOpacity="0.8" strokeWidth="1" />

				<text x="163" y="72" textAnchor="middle" fontSize="33" fontWeight="800" fill={ag} style={font}>
					{front ? "Why Work" : "Let’s Build"}
				</text>
				<text x="163" y="106" textAnchor="middle" fontSize="33" fontWeight="800" fill={bl} filter={f} style={font}>
					{front ? "With Us" : "Yours"}
				</text>
				<path d="M 70 120 H 256" stroke="#2f6bff" strokeWidth="1.4" filter={f} />

				<circle cx="163" cy="206" r="92" fill={`url(#${id}Neb)`} />
				<circle cx="163" cy="206" r="70" fill="#050d2a" fillOpacity="0.55" stroke="#3b78ff" strokeWidth="1.4" filter={f} />
				<circle cx="163" cy="206" r="79" fill="none" stroke="#4f8bff" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="2 5" />
				<circle cx="163" cy="206" r="86" fill="none" stroke="#4f8bff" strokeOpacity="0.25" strokeWidth="0.8" />
				<g transform="translate(163 206) scale(1.35)" filter={f}>
					<path d={STAR_D} fill={bl} />
				</g>
				<g transform="translate(163 206) scale(0.95)">
					<path d={STAR_D} fill={ag} />
				</g>
				<circle cx="163" cy="206" r="5" fill="#fff" filter={f} />

				<rect x="40" y="292" width="246" height="106" fill={`url(#${id}Wt)`} />
				<path
					d="M 40 300 L 62 282 L 84 292 L 112 266 L 138 288 L 163 274 L 190 290 L 216 268 L 242 290 L 262 280 L 286 300 L 286 308 L 40 308 Z"
					fill="#030818"
					stroke="#3b78ff"
					strokeOpacity="0.8"
					strokeWidth="1"
				/>
				<g stroke="#7fb0ff" strokeOpacity="0.35" strokeWidth="0.8">
					<path d="M 90 322 H 236" />
					<path d="M 110 334 H 216" />
					<path d="M 128 346 H 198" />
				</g>
				<ellipse cx="163" cy="316" rx="46" ry="6" fill="#9cc4ff" opacity="0.4" filter={f} />

				<text x="163" y="372" textAnchor="middle" fontSize="31" fontWeight="800" letterSpacing="1" style={font}>
					<tspan fill={ag}>SHIVAY</tspan>
					<tspan fill={bl}>TECH</tspan>
				</text>
				{front && (
					<text x="163" y="389" textAnchor="middle" fontSize="7.4" letterSpacing="3.4" fill="#a9c4ff" style={font}>
						TECHNOLOGY SOLUTIONS
					</text>
				)}
			</g>

			<rect x={sx} y="0" width="26" height="420" fill={`url(#${id}Sp)`} />
			<rect x={front ? 24 : sx} y="0" width="2" height="420" fill="#2f6bff" opacity="0.8" filter={f} />
			<g transform={`translate(${sx + 13} 34) scale(0.28)`}>
				<path d={STAR_D} fill={bl} />
			</g>
			{[96, 330].map((y) => (
				<path key={y} d={`M ${sx + 5} ${y} L ${sx + 21} ${y - 14} V ${y - 7} L ${sx + 5} ${y + 7} Z`} fill={ag} opacity="0.85" />
			))}
			<text transform={`translate(${sx + 15} 214) rotate(90)`} textAnchor="middle" fontSize="14" fontWeight="800" style={font}>
				<tspan fill={ag}>Why Work </tspan>
				<tspan fill={bl}>With Us</tspan>
			</text>
		</svg>
	);
});

/* ───────── people (top-down) ───────── */

/* @@PERSON_START */

/** Tapered capsule outline from (x1,y1) to (x2,y2), radius r1 -> r2 */
function taper(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const L = Math.hypot(dx, dy) || 1;
	const nx = -dy / L;
	const ny = dx / L;
	const P = (x: number, y: number) => `${n2(x)} ${n2(y)}`;
	return (
		`M ${P(x1 + nx * r1, y1 + ny * r1)} L ${P(x2 + nx * r2, y2 + ny * r2)} ` +
		`A ${r2} ${r2} 0 0 0 ${P(x2 - nx * r2, y2 - ny * r2)} L ${P(x1 - nx * r1, y1 - ny * r1)} ` +
		`A ${r1} ${r1} 0 0 0 ${P(x1 + nx * r1, y1 + ny * r1)} Z`
	);
}

/** Round limb, cylinder-shaded across its width (no shading in lite) */
function Limb({ a, b, r1, r2, fill, k = 1 }: { a: Pt; b: Pt; r1: number; r2: number; fill: string; k?: number }) {
	const lite = useContext(LiteCtx);
	const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
	const deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
	const d = taper(0, 0, L, 0, r1, r2);
	return (
		<g transform={`translate(${n2(a[0])} ${n2(a[1])}) rotate(${n2(deg)})`}>
			<path d={d} fill={fill} />
			{!lite && <path d={d} fill="url(#wwuCyl)" opacity={k} />}
		</g>
	);
}

/** Flat fill + edge shadow + light, so shapes look volumetric (no light overlay in lite) */
function Shaded({
	shape,
	fill,
	hi = 0.28,
	lo = 0.4,
	edge = "wwuLo",
}: {
	shape: ReactElement<{ fill?: string; opacity?: number }>;
	fill: string;
	hi?: number;
	lo?: number;
	edge?: string;
}) {
	const lite = useContext(LiteCtx);
	return (
		<g>
			{cloneElement(shape, { fill })}
			{cloneElement(shape, { fill: `url(#${edge})`, opacity: lo })}
			{!lite && cloneElement(shape, { fill: "url(#wwuHi)", opacity: hi })}
		</g>
	);
}

/** Blinking, active person only */
const PERSON_CSS = `
.wwu-eyes{transform-box:fill-box;transform-origin:center}
.wwu-person.on .wwu-eyes{animation:wwuBlink 5.2s infinite}
@keyframes wwuBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@media (prefers-reduced-motion:reduce){.wwu-person.on .wwu-eyes{animation:none}}
`;

/** Shared gradients, rendered once inside the table svg. No filters on purpose. */
const PersonDefs = memo(function PersonDefs() {
	return (
		<>
			<style>{PERSON_CSS}</style>
			<radialGradient id="wwuLo" cx="50%" cy="45%" r="62%">
				<stop offset="0.55" stopColor="#000" stopOpacity="0" />
				<stop offset="1" stopColor="#000" stopOpacity="1" />
			</radialGradient>
			<radialGradient id="wwuLoSkin" cx="50%" cy="45%" r="62%">
				<stop offset="0.5" stopColor="#3a0f06" stopOpacity="0" />
				<stop offset="1" stopColor="#3a0f06" stopOpacity="1" />
			</radialGradient>
			<radialGradient id="wwuHi" cx="50%" cy="80%" r="58%">
				<stop offset="0" stopColor="#fff" stopOpacity="1" />
				<stop offset="1" stopColor="#fff" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="wwuShadow" cx="50%" cy="50%" r="50%">
				<stop offset="0" stopColor="#000" stopOpacity="0.62" />
				<stop offset="0.6" stopColor="#000" stopOpacity="0.28" />
				<stop offset="1" stopColor="#000" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="wwuScreen" cx="50%" cy="30%" r="70%">
				<stop offset="0" stopColor="#6fa3ff" stopOpacity="0.55" />
				<stop offset="1" stopColor="#6fa3ff" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="wwuFace" cx="50%" cy="85%" r="60%">
				<stop offset="0" stopColor="#9cc4ff" stopOpacity="0.4" />
				<stop offset="1" stopColor="#9cc4ff" stopOpacity="0" />
			</radialGradient>
			<linearGradient id="wwuCyl" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#000" stopOpacity="0.5" />
				<stop offset="0.3" stopColor="#000" stopOpacity="0" />
				<stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
				<stop offset="0.72" stopColor="#000" stopOpacity="0" />
				<stop offset="1" stopColor="#000" stopOpacity="0.55" />
			</linearGradient>
			<linearGradient id="wwuMetal" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stopColor="#8d9bb8" />
				<stop offset="0.55" stopColor="#5d6c8c" />
				<stop offset="1" stopColor="#3a4763" />
			</linearGradient>
			<linearGradient id="wwuAlu" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stopColor="#c4cde0" />
				<stop offset="0.45" stopColor="#8f9bb4" />
				<stop offset="1" stopColor="#5b667e" />
			</linearGradient>
			{/* the whole keyboard is one repeating key tile */}
			<pattern id="wwuKeys" x="-44.4" y="112.6" width="6.35" height="5.1" patternUnits="userSpaceOnUse">
				<rect x="0.4" y="0.4" width="5.4" height="4.2" rx="0.9" fill="#1a2234" stroke="#33405e" strokeWidth="0.3" />
				<rect x="0.8" y="0.7" width="4.6" height="0.7" rx="0.35" fill="#fff" opacity="0.08" />
			</pattern>
		</>
	);
});

/* chair */
const CHAIR_LEGS = (
	[
		[18, 84],
		[90, 66],
		[162, 84],
		[234, 88],
		[306, 88],
	] as Pt[]
).map(([a, l]) => {
	const r = (a * Math.PI) / 180;
	return { x: n2(Math.cos(r) * l), y: n2(-2 + Math.sin(r) * l) } as { x: number; y: number };
});
const SEAT =
	"M -60 -40 C -66 -40 -70 -34 -70 -26 L -68 22 C -68 46 -50 60 -28 60 L 28 60 C 50 60 68 46 68 22 L 70 -26 C 70 -34 66 -40 60 -40 Z";
const SEAT_STITCH =
	"M -57 -35 C -61 -35 -64 -31 -64 -25 L -62 21 C -62 42 -47 54 -27 54 L 27 54 C 47 54 62 42 62 21 L 64 -25 C 64 -31 61 -35 57 -35";
const BACK_OUT = "M -66 -40 C -70 -98 70 -98 66 -40 C 66 -30 62 -22 58 -20 C 52 -56 -52 -56 -58 -20 C -62 -22 -66 -30 -66 -40 Z";
const BACK_PAD = "M -59 -41 C -62 -90 62 -90 59 -41 C 58 -35 55 -30 52 -28 C 47 -51 -47 -51 -52 -28 C -55 -30 -58 -35 -59 -41 Z";
const BACK_RIBS = [-42, -28, -14, 0, 14, 28, 42]
	.map((x) => `M ${x} ${n2(-45.3 + 17.3 * (x / 52) ** 2 - 1)} L ${x} ${n2(-77.8 + 36.8 * (x / 59) ** 2 + 1)}`)
	.join(" ");

/* body, head, hands */
const TORSO =
	"M -14 -33 C -34 -33 -58 -25 -66 -7 C -70 8 -63 27 -40 32 C -20 35 20 35 40 32 C 63 27 70 8 66 -7 C 58 -25 34 -33 14 -33 Z";
const HAIR_CAP =
	"M -26 5 C -28 -16 -14 -27 0 -27 C 14 -27 28 -16 26 5 C 25.5 8 24.5 10 22.5 11 C 17 8.5 9 10.5 0 12.5 C -9 10.5 -17 8.5 -22.5 11 C -24.5 10 -25.5 8 -26 5 Z";
const HAIR_CAP_LONG =
	"M -28 6 C -31 -18 -15 -29 0 -29 C 15 -29 31 -18 28 6 C 28 14 26 22 22 26 C 20 18 14 11 0 10 C -14 11 -20 18 -22 26 C -26 22 -28 14 -28 6 Z";
const HAIR_BACK_LONG =
	"M -33 6 C -38 -26 -18 -46 0 -46 C 18 -46 38 -26 33 6 C 37 22 33 40 22 42 C 20 26 22 14 22 8 L -22 8 C -22 14 -20 26 -22 42 C -33 40 -37 22 -33 6 Z";
const HAIRLINE = "M -22.5 11 C -17 8.5 -9 10.5 0 12.5 C 9 10.5 17 8.5 22.5 11";
const BEARD =
	"M -25 10 C -27 34 -19 56 0 58 C 19 56 27 34 25 10 C 23 18 20 26 17 31 C 11 34.5 6 36 0 36 C -6 36 -11 34.5 -17 31 C -20 26 -23 18 -25 10 Z";
const FACE = "M -25 4 C -25.5 -17 -13 -23 0 -23 C 13 -23 25.5 -17 25 4 C 25 20 21 36 14 47 C 9 53.5 -9 53.5 -14 47 C -21 36 -25 20 -25 4 Z";
const BROW = "M -3 24.8 C -7 21.8 -15 21.2 -21 25.6 C -15 23.8 -8.5 24.4 -3.4 28.2 Z";
const MUSTACHE = "M 0 38.5 C -5 37.2 -11 38 -16 42 C -11 42.5 -5 41.8 0 41 C 5 41.8 11 42.5 16 42 C 11 38 5 37.2 0 38.5 Z";
const PALM = "M -10 -2 C -12.5 5 -14 14 -13.2 22.5 C -9 26 -4 25.6 0 25.8 C 4 25.6 9 26 13.2 22.5 C 13.8 14 12.5 5 10 -2 Z";
const FINGERS = [
	{ x: -9.4, w: 4.6, len: 15.5, bx: 0.9 },
	{ x: -3.3, w: 5.3, len: 19, bx: 0.4 },
	{ x: 2.9, w: 5.5, len: 20.5, bx: -0.2 },
	{ x: 8.8, w: 5.2, len: 18, bx: -0.8 },
];
const CODE_COLS = ["#7fb0ff", "#ffd479", "#9be28f", "#e6edff"];

/** Top-down person facing +y (towards the table centre) */
function Person({ look }: { look: Look }) {
	const lite = useContext(LiteCtx);
	const { shirt, hair, skin, hairStyle, cloth = "#f1b72f", glasses, beard, item, watch } = look;

	const shirtD = darken(shirt, 0.38);
	const shirtL = lighten(shirt, 0.3);
	const accL = lighten(shirt, 0.45);
	const skinD = darken(skin, 0.25);
	const skinDD = darken(skin, 0.42);
	const skinL = lighten(skin, 0.2);
	const skinW = mix(skin, "#c2463a", 0.2);
	const lipC = mix(skin, "#a83c3c", 0.5);
	const hairL = lighten(hair, 0.34);
	const hairD = darken(hair, 0.35);
	const browC = hairStyle === "turban" || hairStyle === "buzz" ? hairD : darken(hair, 0.1);
	const pants = mix(shirt, "#090e1d", 0.82);

	const ch = "#1b2447";
	const chL = "#2d3c70";
	const chD = "#0a0f22";
	const rim = "#5b84e6";

	/* everything random comes from one seed */
	const gen = useMemo(() => {
		const id = hash(`${shirt}${hair}${skin}${hairStyle}`);
		const r = rng(id);
		const jit = (a: number) => (r() - 0.5) * 2 * a;
		const joint = () => ({ ex: jit(4), ey: jit(4), wx: jit(2.5), wy: jit(3), rot: -24 + jit(4) });
		const out = {
			id,
			tilt: jit(4.5),
			blink: n2(r() * 4),
			jL: joint(),
			jR: joint(),
			variant: id % 3, // which screen this person looks at
			code: Array.from({ length: 8 }, () => ({
				x: n2((r() < 0.4 ? 4 : 0) + (r() < 0.2 ? 4 : 0)),
				w: n2(10 + r() * 32),
				c: Math.floor(r() * 4),
			})),
			bars: Array.from({ length: 6 }, () => n2(5 + r() * 15)),
			strands: [] as { d: string; l: boolean; w: number }[],
			blobs: [] as { x: number; y: number; r: number; t: number }[],
			dots: [] as { x: number; y: number }[],
		};

		if (!lite && hairStyle === "short") {
			for (let k = 0; k < 26; k++) {
				const a = (k / 26) * Math.PI * 2 + jit(0.15);
				const rr = 0.55 + r() * 0.42;
				const ex = Math.cos(a) * 24 * rr;
				const ey = -7 + Math.sin(a) * 19 * rr;
				const sw = jit(4);
				const mx = (2 + ex) / 2 - Math.sin(a) * sw;
				const my = (-9 + ey) / 2 + Math.cos(a) * sw;
				out.strands.push({ d: `M 2 -9 Q ${n2(mx)} ${n2(my)} ${n2(ex)} ${n2(ey)}`, l: k % 2 === 0, w: n2(0.6 + r() * 0.5) });
			}
		}
		if (!lite && hairStyle === "bun") {
			for (let k = 0; k < 20; k++) {
				const x = -21 + (k / 19) * 42 + jit(1);
				const y0 = 9 - Math.abs(x) * 0.18 + jit(1);
				out.strands.push({
					d: `M ${n2(x)} ${n2(y0)} Q ${n2(x * 0.75)} ${n2((y0 - 26) / 2 + jit(3))} ${n2(x * 0.35)} -26`,
					l: k % 2 === 0,
					w: n2(0.6 + r() * 0.5),
				});
			}
		}
		if (!lite && hairStyle === "long") {
			for (let k = 0; k < 14; k++) {
				const s = k % 2 ? 1 : -1;
				const yi = -24 + (k / 13) * 34 + jit(1.5);
				const ex = s * (23 + r() * 4);
				const ey = Math.min(24, yi + 14 + r() * 8);
				const cx = s * (9 + r() * 7);
				out.strands.push({ d: `M ${s} ${n2(yi)} Q ${n2(cx)} ${n2(yi - 3 + jit(2))} ${n2(ex)} ${n2(ey)}`, l: k % 3 !== 0, w: n2(0.6 + r() * 0.5) });
			}
		}
		if (hairStyle === "curly") {
			const ring = lite ? 14 : 24;
			const fill = lite ? 0 : 12;
			for (let k = 0; k < ring; k++) {
				const a = (k / ring) * Math.PI * 2 + jit(0.1);
				const rr = 0.8 + r() * 0.22;
				const y = -7 + Math.sin(a) * 24 * rr;
				if (y > 13) continue;
				out.blobs.push({ x: n2(Math.cos(a) * 24 * rr), y: n2(y), r: n2((lite ? 11 : 9) + r() * 3), t: r() });
			}
			for (let k = 0; k < fill; k++) {
				const a = r() * Math.PI * 2;
				const rad = r() * 17;
				const y = -8 + Math.sin(a) * rad * 0.95;
				if (y > 9) continue;
				out.blobs.push({ x: n2(Math.cos(a) * rad), y: n2(y), r: n2(7.5 + r() * 3), t: r() });
			}
		}
		if (!lite && hairStyle === "buzz") {
			for (let k = 0; k < 50; k++) {
				const a = r() * Math.PI * 2;
				const rad = Math.sqrt(r());
				out.dots.push({ x: n2(Math.cos(a) * 24 * rad), y: n2(-7 + Math.sin(a) * 18 * rad) });
			}
		}
		return out;
	}, [shirt, hair, skin, hairStyle, lite]);

	const sid = `wwuSg${gen.id}`;

	/* hands */
	const finger = (pts: Pt[], w: number, key: string) => {
		const d = pts.map((p, i) => `${i ? "L" : "M"} ${n2(p[0])} ${n2(p[1])}`).join(" ");
		if (lite) return <path key={key} d={d} fill="none" stroke={skin} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
		const tip = pts[pts.length - 1];
		return (
			<g key={key} fill="none" strokeLinecap="round" strokeLinejoin="round">
				<path d={d} stroke={skinD} strokeWidth={w + 1.1} />
				<path d={d} stroke={skin} strokeWidth={w} />
				<path d={d} stroke={skinL} strokeOpacity={0.3} strokeWidth={w * 0.26} transform={`translate(${n2(-w * 0.16)} 0)`} />
				<ellipse cx={tip[0]} cy={tip[1] - 1.7} rx={w * 0.32} ry={2} fill={lighten(skin, 0.5)} opacity={0.7} stroke="none" />
			</g>
		);
	};

	const hand = (
		<>
			<ellipse cx={0} cy={0} rx={8.4} ry={3.6} fill={skin} />
			{finger([[7.5, 5], [15, 12.5], [18.6, 20], [19.6, 27]], 7.2, "th")}
			{FINGERS.map((f, i) =>
				finger(
					[
						[f.x, 22.5],
						[f.x + f.bx * 0.6, 22.5 + f.len * 0.4],
						[f.x + f.bx * 1.2, 22.5 + f.len * 0.7],
						[f.x + f.bx * 1.7, 22.5 + f.len * 0.9],
					],
					f.w,
					`f${i}`
				)
			)}
			<Shaded edge="wwuLoSkin" shape={<path d={PALM} />} fill={skin} hi={0.16} lo={0.4} />
			{!lite && (
				<path d="M -8 4 L -9.2 21 M -3 3 L -3.4 22 M 3 3 L 3 22 M 8 4 L 8.8 21" stroke={skinDD} strokeOpacity={0.28} strokeWidth={0.7} strokeLinecap="round" fill="none" />
			)}
			<ellipse className="wwu-glow" cx={0} cy={22} rx={15} ry={12} fill="url(#wwuFace)" />
		</>
	);

	/* arms: drawn for the left side, mirrored for the right */
	const arm = (mirror: boolean) => {
		const j = mirror ? gen.jR : gen.jL;
		const S: Pt = [-55, 4];
		const E: Pt = [-63 + j.ex, 57 + j.ey];
		const W: Pt = [-32 + j.wx, 98 + j.wy];
		const dx = W[0] - E[0];
		const dy = W[1] - E[1];
		const at = (t: number): Pt => [E[0] + dx * t, E[1] + dy * t];
		const a34 = at(0.34);
		const a27 = at(0.27);
		const a4 = at(0.4);
		const a95 = at(0.95);

		return (
			<g transform={mirror ? "scale(-1 1)" : undefined}>
				{!lite && (
					<g opacity={0.22} transform="translate(3 6)">
						<path d={taper(S[0], S[1], E[0], E[1], 12.5, 10.5)} fill="#000" />
						<path d={taper(E[0], E[1], W[0], W[1], 9.5, 7)} fill="#000" />
					</g>
				)}

				{/* bare forearm, rolled sleeve */}
				<Limb a={E} b={W} r1={9.4} r2={6.8} fill={skin} />
				{!lite && (
					<path d={`M ${n2(a4[0] + 3)} ${n2(a4[1])} L ${n2(a95[0] + 1.5)} ${n2(a95[1])}`} stroke={lighten(skin, 0.3)} strokeOpacity={0.22} strokeWidth={2.2} strokeLinecap="round" />
				)}
				<Limb a={E} b={a34} r1={10.8} r2={10.2} fill={shirt} />
				<Limb a={a27} b={a34} r1={10.9} r2={10.9} fill={lighten(shirt, 0.14)} k={1.4} />

				{/* upper arm + elbow */}
				<Limb a={S} b={E} r1={13.2} r2={10.8} fill={shirt} />
				<circle cx={E[0]} cy={E[1]} r={10.8} fill={shirt} />
				<circle cx={E[0]} cy={E[1]} r={10.8} fill="url(#wwuLo)" opacity={0.38} />
				{!lite && (
					<>
						<path
							d={`M ${n2(S[0] + (E[0] - S[0]) * 0.65)} ${n2(S[1] + (E[1] - S[1]) * 0.65 - 9)} q 3.4 9 -1 18 M ${n2(S[0] + (E[0] - S[0]) * 0.8)} ${n2(S[1] + (E[1] - S[1]) * 0.8 - 9)} q 3.4 9 -1 18`}
							stroke={shirtD}
							strokeOpacity={0.4}
							strokeWidth={1.1}
							fill="none"
							strokeLinecap="round"
						/>
						<path d={`M ${S[0] - 6} ${S[1] - 8} Q ${S[0] - 14} ${S[1] + 8} ${E[0] - 8} ${E[1] - 20}`} stroke={shirtL} strokeOpacity={0.22} strokeWidth={4} strokeLinecap="round" fill="none" />
					</>
				)}

				{/* smart watch (left wrist) */}
				{!mirror && watch && (
					<g transform={`translate(${n2(W[0])} ${n2(W[1])}) rotate(${n2((Math.atan2(dy, dx) * 180) / Math.PI)})`}>
						<rect x={-9} y={-8.4} width={7} height={16.8} rx={2.2} fill="#141a27" />
						<rect x={-8.6} y={-5} width={6} height={10} rx={2.2} fill="#0a0e18" stroke="#6e7ea3" strokeWidth={0.7} />
						<rect x={-7.7} y={-4.1} width={4.2} height={8.2} rx={1.4} fill="#2f6bff" opacity={0.65} />
					</g>
				)}

				<g transform={`translate(${n2(W[0])} ${n2(W[1])}) rotate(${n2(j.rot)}) scale(0.8)`}>
					<g className={`wwu-hand ${mirror ? "r" : "l"}`}>{hand}</g>
				</g>
			</g>
		);
	};

	/* hair */
	const strandsEl = (
		<g fill="none" strokeLinecap="round">
			{gen.strands.map((s, i) => (
				<path key={i} d={s.d} stroke={s.l ? hairL : hairD} strokeOpacity={s.l ? 0.2 : 0.28} strokeWidth={s.w} />
			))}
		</g>
	);
	const sheen = <path d="M -16 -14 Q -5 -23 9 -21" stroke={lighten(hair, 0.55)} strokeOpacity={0.16} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
	const burns = (op: number) => (
		<g fill={hair} opacity={op}>
			<path d="M -25.5 6 C -26.5 14 -25.5 19 -23.4 23.5 L -20.8 21.5 C -22.2 16 -22.4 11.5 -22.6 8 Z" />
			<path d="M 25.5 6 C 26.5 14 25.5 19 23.4 23.5 L 20.8 21.5 C 22.2 16 22.4 11.5 22.6 8 Z" />
		</g>
	);
	const hairlineShadow = <path d={HAIRLINE} stroke={skinDD} strokeOpacity={0.3} strokeWidth={3} fill="none" transform="translate(0 2)" />;
	const gloss = (cx: number, cy: number, rx: number, ry: number, rot: number, o: number) => (
		<ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#fff" opacity={o} />
	);

	/* behind the head (long hair, bun) */
	const hairBack = () => {
		if (hairStyle === "long")
			return (
				<g>
					<path d={HAIR_BACK_LONG} fill={hair} />
					<path d={HAIR_BACK_LONG} fill="url(#wwuLo)" opacity={0.55} />
					{!lite && (
						<path
							d="M -30 12 C -32 22 -29 32 -25 40 M 30 12 C 32 22 29 32 25 40 M -26 10 C -27 22 -24 30 -22 38 M 26 10 C 27 22 24 30 22 38 M -14 -38 C -26 -28 -30 -10 -29 4 M 14 -38 C 26 -28 30 -10 29 4"
							fill="none"
							stroke={hairL}
							strokeOpacity={0.3}
							strokeWidth={1}
							strokeLinecap="round"
						/>
					)}
				</g>
			);
		if (hairStyle === "bun")
			return (
				<g>
					<circle cx={0} cy={-31} r={12.5} fill={hair} />
					<circle cx={0} cy={-31} r={12.5} fill="url(#wwuLo)" opacity={0.5} />
					{!lite && (
						<>
							<path d="M -9 -31 C -8 -40 8 -40 9 -31 C 8 -24 -4 -24 -5 -31 C -4 -36 4 -36 4 -31" fill="none" stroke={hairL} strokeOpacity={0.38} strokeWidth={1} strokeLinecap="round" />
							<ellipse cx={-4} cy={-37} rx={5} ry={2.4} fill="#fff" opacity={0.12} />
						</>
					)}
					<path d="M -12 -20 Q 0 -16 12 -20" stroke={shirtL} strokeWidth={2.6} strokeLinecap="round" fill="none" />
				</g>
			);
		return null;
	};

	/* on top of the head */
	const ex = (y: number) => 31.5 * Math.sqrt(Math.max(0, 1 - ((y + 9) / 27) ** 2)) * 0.97;
	const hairTop = () => {
		switch (hairStyle) {
			case "short":
				return (
					<g>
						{hairlineShadow}
						{burns(0.95)}
						<path d={HAIR_CAP} fill={hair} />
						<path d={HAIR_CAP} fill="url(#wwuLo)" opacity={0.42} />
						{strandsEl}
						{!lite && <path d="M -8 18 Q -5 6 2 -9" stroke={hairD} strokeOpacity={0.5} strokeWidth={1.1} fill="none" strokeLinecap="round" />}
						{sheen}
					</g>
				);
			case "buzz":
				return (
					<g>
						{hairlineShadow}
						{burns(0.8)}
						<path d={HAIR_CAP} fill={hair} opacity={0.84} />
						<path d={HAIR_CAP} fill="url(#wwuLo)" opacity={0.35} />
						{!lite && (
							<g fill={hairL} opacity={0.3}>
								{gen.dots.map((p, i) => (
									<circle key={i} cx={p.x} cy={p.y} r={0.5} />
								))}
							</g>
						)}
					</g>
				);
			case "long":
				return (
					<g>
						{hairlineShadow}
						<path d={HAIR_CAP_LONG} fill={hair} />
						<path d={HAIR_CAP_LONG} fill="url(#wwuLo)" opacity={0.4} />
						{strandsEl}
						<path d="M 0 12 C 0 0 0 -12 0 -26" stroke={skinD} strokeOpacity={0.85} strokeWidth={1.5} strokeLinecap="round" fill="none" />
						{gloss(-9, -6, 11, 5, -30, 0.12)}
					</g>
				);
			case "bun":
				return (
					<g>
						{hairlineShadow}
						{burns(0.95)}
						<path d={HAIR_CAP} fill={hair} />
						<path d={HAIR_CAP} fill="url(#wwuLo)" opacity={0.4} />
						{strandsEl}
						{!lite && <path d="M -22 9 Q -21 15 -19 19 M 22 9 Q 21 15 19 19" fill="none" stroke={hair} strokeOpacity={0.7} strokeWidth={1} strokeLinecap="round" />}
						{gloss(-8, -4, 11, 5, -26, 0.12)}
					</g>
				);
			case "curly":
				return (
					<g>
						<ellipse cx={0} cy={-6} rx={27} ry={24} fill={hairD} />
						{gen.blobs.map((b, i) => (
							<g key={i}>
								<circle cx={b.x} cy={b.y} r={b.r} fill={mix(hair, b.t > 0.5 ? hairL : hairD, 0.25 + b.t * 0.2)} stroke={hairD} strokeWidth={0.8} />
								{!lite && (
									<path
										d={`M ${n2(b.x - b.r * 0.5)} ${n2(b.y - b.r * 0.2)} Q ${b.x} ${n2(b.y - b.r * 0.75)} ${n2(b.x + b.r * 0.5)} ${n2(b.y - b.r * 0.2)}`}
										stroke={hairL}
										strokeOpacity={0.3}
										strokeWidth={0.9}
										fill="none"
										strokeLinecap="round"
									/>
								)}
							</g>
						))}
						{gloss(-8, -14, 10, 4.5, -24, 0.1)}
					</g>
				);
			case "turban": {
				const bands = Array.from({ length: lite ? 4 : 6 }, (_, i) => {
					const yl = -2 + i * (lite ? 5.4 : 3.6);
					const yr = yl - 7;
					const xl = -ex(yl);
					const xr = ex(yr);
					return `M ${n2(xl)} ${n2(yl)} C ${n2(xl * 0.55)} ${n2(yl - 17 - i)} ${n2(xr * 0.55)} ${n2(yr - 17 - i)} ${n2(xr)} ${n2(yr)}`;
				});
				return (
					<g>
						<ellipse cx={0} cy={-3} rx={32} ry={26} fill="url(#wwuShadow)" />
						<Shaded shape={<ellipse cx={0} cy={-9} rx={31.5} ry={27} />} fill={cloth} hi={0.22} lo={0.5} />
						{bands.map((d, i) => (
							<g key={i} fill="none" strokeLinecap="round">
								<path d={d} stroke={darken(cloth, 0.45)} strokeOpacity={0.6} strokeWidth={2.4} />
								{!lite && <path d={d} stroke={lighten(cloth, 0.45)} strokeOpacity={0.4} strokeWidth={1} transform="translate(0 1.8)" />}
							</g>
						))}
						<path d="M -27 3 C -17 21 17 21 27 3" stroke={darken(cloth, 0.5)} strokeOpacity={0.7} strokeWidth={2.6} fill="none" strokeLinecap="round" />
						{!lite && <path d="M -25 2 C -15 19 15 19 25 2" stroke={lighten(cloth, 0.4)} strokeOpacity={0.45} strokeWidth={1} fill="none" strokeLinecap="round" />}
						{gloss(-8, -14, 13, 6, -28, 0.14)}
					</g>
				);
			}
		}
	};

	/* face */
	const eye = (sx: number) => (
		<g transform={`translate(${sx * 9.6} 29.8)`}>
			{!lite && <ellipse cx={0} cy={1.4} rx={6.8} ry={3.8} fill={skinDD} opacity={0.2} />}
			<path d="M -5.6 1 Q 0 -3.4 5.6 1 Q 0 3.6 -5.6 1 Z" fill="#f3ece4" />
			<circle cx={0} cy={1.5} r={2.5} fill="#3b2616" />
			<circle cx={0} cy={1.6} r={1.15} fill="#0b0706" />
			{!lite && (
				<>
					<circle cx={sx * 0.7} cy={1} r={0.6} fill="#cfe2ff" opacity={0.9} />
					<path d="M -5.6 1 Q 0 -3.4 5.6 1 Q 0 0.5 -5.6 1 Z" fill={skinD} />
				</>
			)}
			<path d="M -6 1.2 Q 0 -3.9 6 1.2" stroke="#1b1210" strokeWidth={1.3} fill="none" strokeLinecap="round" />
			{!lite && <path d="M -5 -1.7 Q 0 -5 5 -1.7" stroke={skinDD} strokeOpacity={0.5} strokeWidth={0.7} fill="none" strokeLinecap="round" />}
		</g>
	);
	const brow = (sx: number) => (
		<g transform={`scale(${sx} 1)`}>
			<path d={BROW} fill={browC} opacity={0.94} />
		</g>
	);
	const ear = (sx: number) => (
		<g transform={`scale(${sx} 1)`}>
			<Shaded edge="wwuLoSkin" shape={<ellipse cx={25.5} cy={10} rx={4.8} ry={8.4} />} fill={skinW} lo={0.5} />
			{!lite && <path d="M 24.6 5.2 Q 28.3 9.5 25.4 15.6" stroke={skinDD} strokeOpacity={0.5} strokeWidth={1.1} fill="none" strokeLinecap="round" />}
		</g>
	);
	const nostrils = (
		<>
			<ellipse cx={-2.3} cy={38.7} rx={1.3} ry={0.8} fill="#1a0d08" opacity={0.55} />
			<ellipse cx={2.3} cy={38.7} rx={1.3} ry={0.8} fill="#1a0d08" opacity={0.55} />
		</>
	);
	const nose = lite ? (
		<g>
			<ellipse cx={0} cy={35.8} rx={4.6} ry={4.2} fill={skin} />
			{nostrils}
		</g>
	) : (
		<g>
			<ellipse cx={0} cy={29} rx={2} ry={7} fill="#fff" opacity={0.13} />
			<Shaded edge="wwuLoSkin" shape={<ellipse cx={0} cy={35.8} rx={4.6} ry={4.2} />} fill={skin} hi={0.38} lo={0.35} />
			<ellipse cx={-4.1} cy={37.4} rx={2.7} ry={2.4} fill={skin} />
			<ellipse cx={4.1} cy={37.4} rx={2.7} ry={2.4} fill={skin} />
			{nostrils}
			<path d="M -6 35.4 Q -7 38.4 -4.4 39.8 M 6 35.4 Q 7 38.4 4.4 39.8" stroke={skinDD} strokeOpacity={0.4} strokeWidth={0.7} fill="none" strokeLinecap="round" />
		</g>
	);
	const mouth = (
		<g>
			<path d="M -7 43.6 Q -3.5 41.6 0 42.8 Q 3.5 41.6 7 43.6 Q 3.6 44.4 0 44.4 Q -3.6 44.4 -7 43.6 Z" fill={darken(lipC, 0.12)} />
			<path d="M -6.2 44.2 Q 0 45.4 6.2 44.2 Q 4.5 48 0 48 Q -4.5 48 -6.2 44.2 Z" fill={lipC} />
			{!lite && <ellipse cx={-0.6} cy={46.6} rx={2.4} ry={0.8} fill="#fff" opacity={0.22} />}
			<path d="M -7.2 43.7 Q 0 44.8 7.2 43.7" stroke="#3a1410" strokeOpacity={0.7} strokeWidth={0.8} fill="none" strokeLinecap="round" />
		</g>
	);

	/* laptop: aluminium deck, backlit keys, visible screen */
	const bar = <rect x={-49.5} y={159.5} width={99} height={4.6} fill="#fff" opacity={0.08} />;
	const screenUi = lite ? (
		<g>
			{bar}
			<rect x={-44} y={168} width={36} height={3.4} rx={1.2} fill={accL} />
			<rect x={-44} y={174} width={28} height={2} rx={1} fill="#fff" opacity={0.4} />
			<rect x={-44} y={179} width={22} height={2} rx={1} fill="#fff" opacity={0.3} />
			<rect x={6} y={167} width={40} height={26} rx={2.5} fill={`url(#${sid}Img)`} />
		</g>
	) : gen.variant === 0 ? (
		/* website */
		<g>
			{bar}
			<circle cx={-45.5} cy={161.8} r={0.9} fill="#ff6b6b" />
			<circle cx={-42.8} cy={161.8} r={0.9} fill="#ffd25a" />
			<circle cx={-40.1} cy={161.8} r={0.9} fill="#6be27f" />
			<rect x={-34} y={160.8} width={42} height={2} rx={1} fill="#fff" opacity={0.2} />
			<rect x={-44} y={167} width={9} height={1.6} rx={0.8} fill="#fff" opacity={0.5} />
			<rect x={-31} y={167} width={8} height={1.6} rx={0.8} fill="#fff" opacity={0.35} />
			<rect x={-20} y={167} width={8} height={1.6} rx={0.8} fill="#fff" opacity={0.35} />
			<rect x={-44} y={173} width={36} height={3.4} rx={1.2} fill={accL} />
			<rect x={-44} y={178.4} width={28} height={3.4} rx={1.2} fill={accL} opacity={0.85} />
			<rect x={-44} y={184} width={32} height={1.4} rx={0.7} fill="#fff" opacity={0.4} />
			<rect x={-44} y={187} width={24} height={1.4} rx={0.7} fill="#fff" opacity={0.3} />
			<rect x={-44} y={190.2} width={15} height={4} rx={2} fill={shirt} stroke="#fff" strokeOpacity={0.5} strokeWidth={0.4} />
			<rect x={6} y={167} width={40} height={26} rx={2.5} fill={`url(#${sid}Img)`} />
			<circle cx={26} cy={180} r={7} fill="#fff" opacity={0.22} />
			<circle cx={26} cy={180} r={3} fill="#fff" opacity={0.45} />
		</g>
	) : gen.variant === 1 ? (
		/* code editor */
		<g>
			{bar}
			<rect x={-46} y={160.9} width={16} height={2} rx={0.8} fill="#fff" opacity={0.22} />
			<rect x={-49.5} y={164.1} width={7} height={29.4} fill="#000" opacity={0.18} />
			{gen.code.map((l, i) => (
				<g key={i}>
					<rect x={-47.5} y={166 + i * 3.7} width={2.4} height={1.5} rx={0.6} fill="#fff" opacity={0.28} />
					<rect x={-40 + l.x} y={166 + i * 3.7} width={l.w} height={1.6} rx={0.8} fill={CODE_COLS[l.c]} opacity={0.88} />
					{i % 3 === 0 && <rect x={-40 + l.x + l.w + 2} y={166 + i * 3.7} width={10} height={1.6} rx={0.8} fill={CODE_COLS[(l.c + 1) % 4]} opacity={0.7} />}
				</g>
			))}
			<rect x={-49.5} y={193.3} width={99} height={2.2} fill={shirt} opacity={0.85} />
		</g>
	) : (
		/* dashboard */
		<g>
			{bar}
			{[0, 1, 2].map((i) => (
				<g key={i}>
					<rect x={-46 + i * 31} y={166} width={28} height={9.5} rx={1.6} fill="#fff" opacity={0.12} />
					<rect x={-43.5 + i * 31} y={168} width={9} height={1.6} rx={0.8} fill="#fff" opacity={0.45} />
					<rect x={-43.5 + i * 31} y={171.2} width={15 - i * 2} height={2.4} rx={1} fill={accL} />
				</g>
			))}
			{gen.bars.map((h, i) => (
				<rect key={i} x={-44 + i * 6.4} y={194 - h} width={4.4} height={h} rx={0.8} fill={accL} opacity={0.5 + i * 0.08} />
			))}
			<path
				d={gen.bars.map((h, i) => `${i ? "L" : "M"} ${-44 + i * 6.4} ${n2(190 - h)}`).join(" ")}
				stroke="#fff"
				strokeOpacity={0.7}
				strokeWidth={0.9}
				fill="none"
				strokeLinejoin="round"
			/>
			<circle cx={30} cy={184} r={8} fill="none" stroke="#fff" strokeOpacity={0.15} strokeWidth={3.4} />
			<circle cx={30} cy={184} r={8} fill="none" stroke={accL} strokeWidth={3.4} strokeDasharray="32 19" transform="rotate(-90 30 184)" />
		</g>
	);

	const laptop = (
		<g>
			<defs>
				<radialGradient id={sid} cx="50%" cy="40%" r="55%">
					<stop offset="0" stopColor={shirtL} stopOpacity="0.55" />
					<stop offset="1" stopColor={shirt} stopOpacity="0" />
				</radialGradient>
				<linearGradient id={`${sid}Bg`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={darken(shirt, 0.72)} />
					<stop offset="1" stopColor={darken(shirt, 0.9)} />
				</linearGradient>
				<linearGradient id={`${sid}Img`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={shirtL} />
					<stop offset="1" stopColor={darken(shirt, 0.35)} />
				</linearGradient>
			</defs>

			<ellipse className="wwu-glow" cx={0} cy={214} rx={84} ry={30} fill={`url(#${sid})`} />

			{/* contact shadow, two plain layers (no blur) */}
			<rect x={-56} y={110} width={112} height={100} rx={12} fill="#000" opacity={0.18} />
			<rect x={-52} y={111} width={106} height={96} rx={9} fill="#000" opacity={0.28} />

			<rect x={-52} y={107} width={104} height={50} rx={6} fill="url(#wwuAlu)" stroke="#161d30" strokeWidth={0.9} />
			<rect x={-51.2} y={107.8} width={102.4} height={48.4} rx={5.4} fill="none" stroke="#e6ecfa" strokeOpacity={0.35} strokeWidth={0.7} />
			<rect x={-52} y={107} width={104} height={50} rx={6} fill="url(#wwuHi)" opacity={0.18} />

			<rect x={-46} y={110.4} width={92} height={29} rx={2.5} fill="#070a12" stroke="#0d1220" strokeWidth={0.5} />
			<rect className="wwu-glow" x={-46} y={110.4} width={92} height={29} rx={2.5} fill="#3b78ff" fillOpacity={0.4} />
			<rect x={-44.4} y={112.6} width={88.9} height={25.5} fill="url(#wwuKeys)" />

			<rect x={-18} y={142} width={36} height={11} rx={2.2} fill="#7e8aa4" stroke="#2c364f" strokeOpacity={0.7} strokeWidth={0.7} />
			{!lite && <path d="M -15 143.6 L -2 143.6" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.7} strokeLinecap="round" />}

			<rect x={-50} y={155.2} width={100} height={3.6} rx={1.6} fill="#0a0f1c" />
			<rect x={-50} y={155.6} width={100} height={0.9} rx={0.45} fill="#fff" opacity={0.2} />

			<rect x={-52.5} y={156.5} width={105} height={43.5} rx={4.5} fill="#0a0f1c" stroke="#2a3552" strokeWidth={0.8} />
			<circle cx={0} cy={158} r={0.8} fill="#1f2a44" />
			<rect x={-49.5} y={159.5} width={99} height={36} rx={2.5} fill={`url(#${sid}Bg)`} />
			{screenUi}
			<path d="M -49.5 159.5 L -6 159.5 L -28 195.5 L -49.5 195.5 Z" fill="#fff" opacity={0.06} />
			<rect x={-49.5} y={159.5} width={99} height={36} rx={2.5} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={0.5} />
			<rect x={-52.5} y={198.4} width={105} height={3.2} rx={1.6} fill="url(#wwuAlu)" stroke="#161d30" strokeWidth={0.5} />
		</g>
	);

	const cup = (
		<g>
			<path d="M 96 122 Q 106 127 96 133" stroke="#e8f0ff" strokeWidth={3.4} fill="none" strokeLinecap="round" />
			<ellipse cx={89} cy={131} rx={19} ry={19} fill="url(#wwuShadow)" />
			<Shaded shape={<circle cx={87} cy={127} r={14.5} />} fill="#cfdcf5" hi={0.2} lo={0.35} />
			<circle cx={87} cy={127} r={10.5} fill="#f4f8ff" />
			<circle cx={87} cy={127} r={8.2} fill="#2b1d12" />
			<ellipse cx={85.6} cy={125.6} rx={4.2} ry={2.7} fill="#8a6038" opacity={0.55} />
			{!lite && <ellipse cx={83.5} cy={124.4} rx={2.2} ry={1} fill="#fff" opacity={0.4} />}
		</g>
	);

	const side =
		item === "notebook" ? (
			<g transform="translate(-86 134) rotate(-10)">
				<rect x={-18} y={-24} width={36} height={48} rx={3} fill="#000" opacity={0.35} transform="translate(2 4)" />
				<rect x={-18} y={-24} width={36} height={48} rx={3} fill="#162a5e" stroke="#3c6fe0" strokeOpacity={0.7} />
				<rect x={-18} y={-24} width={6} height={48} rx={3} fill="#0d1b40" />
				<rect x={-8} y={-16} width={22} height={4} rx={1} fill={shirt} opacity={0.85} />
				<path d="M -8 -6 H 14 M -8 0 H 14 M -8 6 H 10" stroke="#7fb0ff" strokeOpacity={0.25} />
				<g transform="translate(25 0) rotate(10)">
					<rect x={-1.7} y={-19} width={3.4} height={36} rx={1.7} fill="#e8f0ff" />
					<rect x={-1.7} y={-19} width={3.4} height={9} rx={1.7} fill={shirt} />
				</g>
			</g>
		) : (
			<g transform="translate(-86 136) rotate(9)">
				<ellipse cx={0} cy={0} rx={22} ry={30} fill="url(#wwuScreen)" />
				<rect x={-9} y={-18} width={18} height={36} rx={4} fill="#000" opacity={0.35} transform="translate(2 3)" />
				<rect x={-9} y={-18} width={18} height={36} rx={4} fill="#05080f" stroke="#3c6fe0" strokeOpacity={0.7} strokeWidth={0.7} />
				<rect x={-7.5} y={-16.5} width={15} height={33} rx={2.8} fill="#1f46b8" />
				<rect x={-6} y={-12} width={12} height={4} rx={1.2} fill="#fff" opacity={0.75} />
				<rect x={-6} y={-6} width={9} height={2.4} rx={1} fill="#fff" opacity={0.4} />
				<rect x={-6} y={-1.5} width={11} height={2.4} rx={1} fill="#fff" opacity={0.4} />
				<path d="M -7.5 -16.5 L 7.5 -16.5 L 7.5 -4 Z" fill="#fff" opacity={0.08} />
			</g>
		);

	/* office chair */
	const chairBase = (
		<g>
			{CHAIR_LEGS.map((l, i) => (
				<g key={i}>
					<Limb a={[0, -2]} b={[l.x, l.y]} r1={7.5} r2={4.4} fill="#3a4768" />
					<circle cx={l.x + 1.2} cy={l.y + 1.8} r={6.6} fill="#000" opacity={0.4} />
					<circle cx={l.x} cy={l.y} r={6} fill="#10162b" stroke="#4a5d94" strokeWidth={0.9} />
					<circle cx={l.x} cy={l.y} r={3.2} fill="#222d56" />
				</g>
			))}
			<circle cx={0} cy={-2} r={12} fill={chD} stroke="#34457f" strokeWidth={0.8} />
			<circle cx={0} cy={-2} r={7} fill="#3a4768" />
		</g>
	);
	const chairSeat = (
		<g>
			<path d={SEAT} fill={ch} />
			<path d={SEAT} fill="url(#wwuLo)" opacity={0.55} />
			{!lite && (
				<>
					<path d={SEAT} fill="url(#wwuHi)" opacity={0.2} />
					<path d="M 0 -38 L 0 58" stroke={chD} strokeOpacity={0.6} strokeWidth={1.1} />
					<path d={SEAT_STITCH} stroke={rim} strokeOpacity={0.4} strokeWidth={0.9} strokeDasharray="2.4 2.2" fill="none" />
				</>
			)}
			<path d={SEAT} fill="none" stroke={rim} strokeOpacity={0.55} strokeWidth={1.4} strokeLinejoin="round" />
			<rect x={64} y={38} width={13} height={3} rx={1.5} fill="url(#wwuMetal)" stroke="#0a0f22" strokeWidth={0.5} />
			<circle cx={78} cy={39.5} r={2.6} fill="#10162b" stroke="#6c82c8" strokeWidth={0.7} />
		</g>
	);
	const chairBack = (
		<g>
			<path d={BACK_OUT} fill={chD} />
			<path d={BACK_OUT} fill="none" stroke="#3b4f8f" strokeWidth={1.4} strokeLinejoin="round" />
			<path d={BACK_PAD} fill={chL} />
			<path d={BACK_PAD} fill="url(#wwuLo)" opacity={0.6} />
			{!lite && (
				<>
					<path d={BACK_PAD} fill="url(#wwuHi)" opacity={0.22} />
					<path d={BACK_RIBS} stroke={chD} strokeOpacity={0.55} strokeWidth={1.1} strokeLinecap="round" fill="none" />
					<path d={BACK_PAD} fill="none" stroke={rim} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2.4 2.2" />
					<path d="M -44 -72 C -22 -83 22 -83 44 -72" stroke="#cfe0ff" strokeOpacity={0.2} strokeWidth={3} fill="none" strokeLinecap="round" />
				</>
			)}
		</g>
	);
	const chairArms = (
		<g>
			{[-1, 1].map((sx) => (
				<g key={sx} transform={`scale(${sx} 1)`}>
					<rect x={60} y={-4} width={14} height={30} rx={4} fill={chD} stroke="#34457f" strokeWidth={0.8} />
					<rect x={71} y={-14} width={15} height={70} rx={7.5} fill="#000" opacity={0.3} />
					<Shaded shape={<rect x={68} y={-18} width={15} height={70} rx={7.5} />} fill={chL} hi={0.3} lo={0.5} />
					{!lite && <path d="M 71.5 -11 L 71.5 44" stroke="#bcd0ff" strokeOpacity={0.24} strokeWidth={1.4} strokeLinecap="round" />}
					<rect x={68} y={-18} width={15} height={70} rx={7.5} fill="none" stroke={rim} strokeOpacity={0.5} strokeWidth={0.9} />
				</g>
			))}
		</g>
	);
	const thighs = (
		<g>
			{[-1, 1].map((sx) => (
				<g key={sx}>
					<Limb a={[sx * 24, 14]} b={[sx * 27, 66]} r1={18} r2={12} fill={pants} />
					<circle cx={sx * 27} cy={66} r={12} fill={pants} />
					<circle cx={sx * 27} cy={66} r={12} fill="url(#wwuLo)" opacity={0.5} />
				</g>
			))}
		</g>
	);

	return (
		<g>
			<circle className="wwu-halo" cx={0} cy={40} r={140} fill="url(#wwuHalo)" />

			<ellipse cx={0} cy={10} rx={112} ry={92} fill="url(#wwuShadow)" />
			{chairBase}
			{chairSeat}
			{chairBack}
			{chairArms}
			{thighs}

			<g className="wwu-body">
				<Shaded shape={<path d={TORSO} />} fill={shirt} hi={0.22} lo={0.5} />
				{!lite && (
					<path
						d="M -46 -24 Q -57 -10 -63 6 M 46 -24 Q 57 -10 63 6 M -50 8 Q -44 18 -34 24 M 50 8 Q 44 18 34 24 M -30 -28 Q -22 -22 -18 -16 M 30 -28 Q 22 -22 18 -16"
						stroke={shirtD}
						strokeOpacity={0.5}
						strokeWidth={1.2}
						strokeLinecap="round"
						fill="none"
					/>
				)}
				<ellipse cx={0} cy={-18} rx={32} ry={10} fill={shirtL} opacity={0.1} />
				<Shaded shape={<circle cx={-55} cy={4} r={14.5} />} fill={shirt} hi={0.3} lo={0.4} />
				<Shaded shape={<circle cx={55} cy={4} r={14.5} />} fill={shirt} hi={0.3} lo={0.4} />
			</g>

			<ellipse cx={0} cy={-8} rx={44} ry={36} fill="url(#wwuShadow)" />

			<ellipse cx={0} cy={-17} rx={17} ry={14} fill={shirtL} stroke={shirtD} strokeOpacity={0.5} strokeWidth={1} />
			<ellipse cx={0} cy={-16} rx={12.5} ry={10.5} fill={skinD} />
			<ellipse cx={0} cy={-16} rx={12.5} ry={10.5} fill="url(#wwuLoSkin)" opacity={0.6} />

			{side}
			{cup}
			{laptop}
			{arm(false)}
			{arm(true)}

			<g transform={`rotate(${n2(gen.tilt)} 0 8)`}>
				<g className="wwu-headg">
					{hairBack()}
					{ear(-1)}
					{ear(1)}
					<ellipse cx={0} cy={50} rx={18} ry={7} fill="url(#wwuShadow)" />

					<Shaded edge="wwuLoSkin" shape={<path d={FACE} />} fill={skin} hi={0.34} lo={0.4} />
					{!lite && (
						<>
							<ellipse cx={-23} cy={18} rx={3} ry={8} fill={skinDD} opacity={0.14} />
							<ellipse cx={23} cy={18} rx={3} ry={8} fill={skinDD} opacity={0.14} />
							<ellipse cx={-17} cy={39} rx={6} ry={8} fill={skinDD} opacity={0.12} />
							<ellipse cx={17} cy={39} rx={6} ry={8} fill={skinDD} opacity={0.12} />
							<circle cx={-15} cy={33} r={5.5} fill="#e0524a" opacity={0.1} />
							<circle cx={15} cy={33} r={5.5} fill="#e0524a" opacity={0.1} />
						</>
					)}

					{beard ? (
						<g>
							<path d={BEARD} fill={hair} />
							<path d={BEARD} fill="url(#wwuLo)" opacity={0.45} />
							{!lite && (
								<path d="M -16 40 q 1 5 0 9 M -8 44 q 1 5 0 10 M 0 46 q 0 5 0 10 M 8 44 q -1 5 0 10 M 16 40 q -1 5 0 9" stroke={lighten(hair, 0.3)} strokeOpacity={0.28} strokeWidth={0.6} fill="none" strokeLinecap="round" />
							)}
							<path d={MUSTACHE} fill={hair} />
							<path d={MUSTACHE} fill="url(#wwuLo)" opacity={0.3} />
						</g>
					) : (
						mouth
					)}

					{brow(-1)}
					{brow(1)}
					<g className="wwu-eyes" style={{ animationDelay: `${gen.blink}s` }}>
						{eye(-1)}
						{eye(1)}
					</g>
					{nose}

					<ellipse className="wwu-glow" cx={0} cy={34} rx={22} ry={14} fill="url(#wwuFace)" />

					{hairTop()}

					{glasses && (
						<g>
							<g fill="none" stroke="#0a0e18" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
								<path d="M -21 30 C -25 24 -26 16 -25.8 8" />
								<path d="M 21 30 C 25 24 26 16 25.8 8" />
								<rect x={-20} y={26.5} width={17} height={11} rx={4.5} fill="#9cc4ff" fillOpacity={0.1} />
								<rect x={3} y={26.5} width={17} height={11} rx={4.5} fill="#9cc4ff" fillOpacity={0.1} />
								<path d="M -3 29.5 Q 0 27.8 3 29.5" />
							</g>
							{!lite && <path d="M -17 28.5 L -9 28 M 7 28 L 15 28.5" stroke="#bcd8ff" strokeOpacity={0.55} strokeWidth={0.9} strokeLinecap="round" />}
						</g>
					)}
				</g>
			</g>
		</g>
	);
}

/* the people never change, so React must not redraw them when the scroll step changes */
const PersonM = memo(Person);

/* @@PERSON_END */

/* ───────── scene layers ───────── */

/** Static table + centre star + shared <defs>. Never re-renders after the first paint. */
const TableArt = memo(function TableArt() {
	return (
		<svg className="wwu-svg" viewBox={`0 0 ${VB} ${VB}`} role="img" aria-label="Six team members sitting around a table">
			<defs>
				<radialGradient id="wwuTable" cx="50%" cy="42%" r="62%">
					<stop offset="0" stopColor="#0d2f8f" />
					<stop offset="0.55" stopColor="#061a52" />
					<stop offset="1" stopColor="#020a24" />
				</radialGradient>
				<radialGradient id="wwuTableGlow" cx="50%" cy="50%" r="50%">
					<stop offset="0.72" stopColor="#2f6bff" stopOpacity="0" />
					<stop offset="0.79" stopColor="#3b8bff" stopOpacity="0.5" />
					<stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
				</radialGradient>
				<radialGradient id="wwuHalo">
					<stop offset="0" stopColor="#3b82ff" stopOpacity="0.55" />
					<stop offset="1" stopColor="#3b82ff" stopOpacity="0" />
				</radialGradient>
				<radialGradient id="wwuCoreG" cx="50%" cy="50%" r="50%">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="0.35" stopColor="#bcd8ff" />
					<stop offset="1" stopColor="#2f6bff" />
				</radialGradient>
				<radialGradient id="wwuStarAura">
					<stop offset="0" stopColor="#4f8bff" stopOpacity="0.55" />
					<stop offset="0.5" stopColor="#2f6bff" stopOpacity="0.18" />
					<stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
				</radialGradient>
				<radialGradient id="wwuStarAura2">
					<stop offset="0" stopColor="#cfe2ff" stopOpacity="0.8" />
					<stop offset="0.4" stopColor="#4f8bff" stopOpacity="0.4" />
					<stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
				</radialGradient>
				<PersonDefs />
			</defs>

			<circle cx={500} cy={500} r={TABLE_R + 70} fill="url(#wwuTableGlow)" />
			<circle cx={500} cy={500} r={TABLE_R} fill="url(#wwuTable)" stroke="#3b8bff" strokeWidth={3} />
			<circle cx={500} cy={500} r={TABLE_R - 2} fill="none" stroke="#9cc4ff" strokeOpacity={0.4} strokeWidth={1} />
			<circle cx={500} cy={500} r={TABLE_R - 34} fill="none" stroke="#4f8bff" strokeOpacity={0.28} strokeWidth={1.5} />
			<circle cx={500} cy={500} r={TABLE_R - 70} fill="none" stroke="#9cc4ff" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="2 8" />
			<ellipse cx={420} cy={372} rx={150} ry={52} transform="rotate(-28 420 372)" fill="#fff" opacity={0.045} />

			<g transform="translate(500 500)">
				<circle r={175} fill="url(#wwuStarAura)" />
				<circle className="wwu-ring" r={96} fill="none" stroke="#7fb0ff" strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray="2 9" />
				<g className="wwu-starfx">
					<circle r={84} fill="url(#wwuStarAura2)" />
					<path d={STAR_D} fill="#2f6bff" opacity={0.16} transform="scale(2.4)" />
					<path d={STAR_D} fill="#4f8bff" opacity={0.3} transform="scale(2.0)" />
					<path d={STAR_D} fill="url(#wwuCoreG)" transform="scale(1.6)" />
					<path d={STAR_D} fill="#fff" opacity={0.9} transform="scale(0.5)" />
				</g>
			</g>
		</svg>
	);
});

/** One person = one svg over the table. The highlight is applied to the <svg> box, so it is compositor-only. */
const PersonLayer = memo(function PersonLayer({ look, index, on, all }: { look: Look; index: number; on: boolean; all: boolean }) {
	return (
		<svg className={`wwu-svg wwu-psvg ${on ? "hot" : all ? "all" : ""}`} style={{ transformOrigin: ORIGINS[index] }} viewBox={`0 0 ${VB} ${VB}`} aria-hidden="true">
			<g transform={`rotate(${ANGLES[index]} 500 500) translate(500 ${500 - SEAT_R})`}>
				<g className={`wwu-person ${on ? "on" : ""}`}>
					<PersonM look={look} />
				</g>
			</g>
		</svg>
	);
});

/** Static stars are one svg; only every 3rd one twinkles (and only when `twinkle`). */
const Stars = memo(function Stars({ count, twinkle }: { count: number; twinkle: boolean }) {
	const stars = useMemo(() => {
		const r = rng(11);
		return Array.from({ length: count }, () => ({
			x: +(r() * 100).toFixed(2),
			y: +(r() * 100).toFixed(2),
			r: +(r() * 1.6 + 0.5).toFixed(2),
			d: +(r() * 5).toFixed(2),
			o: +(r() * 0.5 + 0.35).toFixed(2),
		}));
	}, [count]);

	return (
		<div className="wwu-stars" aria-hidden="true">
			<svg className="wwu-stars-s" width="100%" height="100%">
				{stars.map((s, i) => (twinkle && i % 3 === 2 ? null : <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r / 2} fill="#cfe0ff" opacity={s.o} />))}
			</svg>
			{twinkle &&
				stars.map((s, i) =>
					i % 3 !== 2 ? null : (
						<span
							key={i}
							className="wwu-star"
							style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, animationDelay: `${s.d}s`, "--o": s.o } as CSSProperties}
						/>
					)
				)}
		</div>
	);
});

/* ───────── flipbook ───────── */

type FlipApi = { flip: (page: number) => void; getCurrentPageIndex: () => number; getState: () => string };
type FlipHandle = { pageFlip: () => FlipApi };

/** Only re-renders when the size, the tier or the pages change. */
const Book = memo(function Book({
	pw,
	ph,
	pages,
	lite,
	onFlip,
	onState,
	setRef,
}: {
	pw: number;
	ph: number;
	pages: ReactElement[];
	lite: boolean;
	onFlip: (e: { data: number }) => void;
	onState: (e: { data: string }) => void;
	setRef: (r: unknown) => void;
}) {
	return (
		<HTMLFlipBook
			key={`${pw}x${ph}${lite ? "l" : "f"}`}
			ref={setRef}
			width={pw}
			height={ph}
			size="fixed"
			minWidth={pw}
			maxWidth={pw}
			minHeight={ph}
			maxHeight={ph}
			drawShadow={!lite}
			maxShadowOpacity={0.55}
			flippingTime={lite ? FLIP_MS_LITE : FLIP_MS}
			usePortrait={false}
			startZIndex={0}
			autoSize={false}
			showCover
			mobileScrollSupport
			clickEventForward
			useMouseEvents
			swipeDistance={30}
			showPageCorners={!lite}
			disableFlipByClick={false}
			startPage={0}
			className="wwu-flip"
			style={NO_STYLE}
			onFlip={onFlip}
			onChangeState={onState}
		>
			{pages}
		</HTMLFlipBook>
	);
});

/* ───────── main ───────── */

export default function WhyWorkWithUs() {
	const sectionRef = useRef<HTMLElement | null>(null);
	const stickyRef = useRef<HTMLDivElement | null>(null);
	const barRef = useRef<HTMLDivElement | null>(null);

	const [view, setView] = useState({ w: 1280, h: 800 });
	const [phase, setPhase] = useState(0); // 0 table only, 1 book hovering closed, 2 open
	const [active, setActive] = useState(-1);
	const [live, setLive] = useState(false); // near the viewport and tab visible: animations run
	const [armed, setArmed] = useState(false); // scene + book are mounted (section is ~2 screens away)
	const [lite, setLite] = useState(false);

	const liveRef = useRef(false);
	const liteRef = useRef(false);
	liteRef.current = lite;
	const kickRef = useRef<() => void>(() => {});
	const flipMsRef = useRef(FLIP_MS);
	flipMsRef.current = lite ? FLIP_MS_LITE : FLIP_MS;

	/* geometry is cached: no layout reads while scrolling */
	const geo = useRef({ top: 0, range: 1, dirty: true });
	const measure = useCallback(() => {
		const el = sectionRef.current;
		const st = stickyRef.current;
		if (!el || !st) return;
		geo.current.top = el.getBoundingClientRect().top + window.scrollY;
		geo.current.range = Math.max(1, el.offsetHeight - st.offsetHeight);
		geo.current.dirty = false;
	}, []);

	/** lite for good on this device (remembered) */
	const goLite = useCallback(() => {
		setLite(true);
		try {
			localStorage.setItem(LITE_KEY, "1");
		} catch {}
	}, []);

	/* viewport + device tier. Resize is debounced; height-only jitter < 140px (mobile address bar) is ignored. */
	useEffect(() => {
		let t = 0;
		const measureView = () => {
			const w = innerWidth;
			const h = innerHeight;
			setView((v) => (v.w === w && Math.abs(v.h - h) < 140 ? v : { w, h }));
		};
		const onResize = () => {
			clearTimeout(t);
			t = window.setTimeout(measureView, 120);
		};

		const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
		const cores = nav.hardwareConcurrency ?? 8;
		const mem = nav.deviceMemory ?? 8;
		let remembered = false;
		try {
			remembered = localStorage.getItem(LITE_KEY) === "1";
		} catch {}
		const reduce = !!matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const weak = cores <= 4 || mem <= 4 || !!nav.connection?.saveData || reduce || remembered || (innerWidth < 900 && cores <= 6);

		setView({ w: innerWidth, h: innerHeight });
		setLite(weak);

		addEventListener("resize", onResize);
		return () => {
			clearTimeout(t);
			removeEventListener("resize", onResize);
		};
	}, []);

	/* armed: build ~2 screens early. live: animate only while near the screen and the tab is visible. */
	useEffect(() => {
		const el = sectionRef.current;
		if (!el || typeof IntersectionObserver === "undefined") {
			liveRef.current = true;
			setLive(true);
			setArmed(true);
			return;
		}
		let near = false;
		const apply = () => {
			const v = near && !document.hidden;
			liveRef.current = v;
			setLive(v);
			if (v) {
				geo.current.dirty = true;
				kickRef.current(); // catch up with the scroll position
			}
		};
		const ioArm = new IntersectionObserver(([e]) => e.isIntersecting && setArmed(true), { rootMargin: "200% 0px" });
		const ioLive = new IntersectionObserver(
			([e]) => {
				near = e.isIntersecting;
				apply();
			},
			{ rootMargin: "30% 0px" }
		);
		ioArm.observe(el);
		ioLive.observe(el);
		document.addEventListener("visibilitychange", apply);
		return () => {
			ioArm.disconnect();
			ioLive.disconnect();
			document.removeEventListener("visibilitychange", apply);
		};
	}, []);

	/* idle frame-rate probe: slow first ~45 frames -> lite. Runs once. */
	const probed = useRef(false);
	useEffect(() => {
		if (!live || !armed || lite || probed.current) return;
		let raf = 0;
		let last = 0;
		let n = 0;
		const dts: number[] = [];
		const tick = (t: number) => {
			n++;
			if (last && n > 6) dts.push(t - last); // skip warm-up while the scene mounts
			last = t;
			if (n < 52) {
				raf = requestAnimationFrame(tick);
				return;
			}
			probed.current = true;
			dts.sort((a, b) => a - b);
			const med = dts[dts.length >> 1] ?? 16;
			const p90 = dts[Math.floor(dts.length * 0.9)] ?? 16;
			if (med > 24 || p90 > 48) goLite();
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [live, armed, lite, goLite]);

	/* portrait phones stack; landscape phones use the side-by-side layout */
	const mobile = view.w < 900 && view.w < view.h * 1.2;

	/* S: table alone in the centre · k, tx: scale + x-shift once the book starts · bx: book centre offset */
	const dims = useMemo(() => {
		const { w, h } = view;
		if (mobile) {
			const S = Math.min(w * 0.86, h * 0.34);
			const availH = Math.max(160, h - 78 - S - 26); // 78 = heading
			const pw = Math.max(110, Math.floor(Math.min((w - 16) / 2, 360, availH / 1.4) / 10) * 10);
			return { S, pw, ph: Math.round((pw * 1.4) / 10) * 10, k: 1, tx: 0, bx: 0 };
		}
		const S = Math.min(h * 0.94, w * 0.64);
		const Ss = Math.min(S, h * 0.86, w * 0.42);
		const ov = Math.max(100, Math.min(150, w * 0.085)); // name pills stick out of the table
		const cx = w * 0.975 - ov - Ss / 2;
		const left = w * 0.03;
		const availW = Math.max(260, cx - Ss / 2 - ov - 12 - left);
		const pw = Math.max(120, Math.floor(Math.min(availW / 2, h * 0.44) / 10) * 10);
		return { S, pw, ph: Math.round((pw * 1.4) / 10) * 10, k: Ss / S, tx: cx - w / 2, bx: left + availW / 2 - w / 2 };
	}, [view, mobile]);

	/* scroll -> phase / active. One rAF per frame, no layout reads. */
	useEffect(() => {
		const el = sectionRef.current;
		if (!el) return;
		let raf = 0;
		let lastT = 0;
		let slow = 0;
		let idle = 0;

		const update = (t: number) => {
			raf = 0;
			const g = geo.current;
			if (g.dirty) measure();
			const p = Math.min(1, Math.max(0, (scrollY - g.top) / g.range));

			setPhase(p < 0.02 ? 0 : p < START ? 1 : 2);
			setActive(p < START ? -1 : Math.min(REASONS.length - 1, Math.floor(((p - START) / (END - START)) * REASONS.length)));
			if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

			/* jank probe: frames > 48ms during a continuous scroll are dropped; enough of them -> lite */
			if (lastT && t - lastT < 120) {
				if (t - lastT > 48) {
					if (++slow >= 6 && !liteRef.current) goLite();
				} else slow = Math.max(0, slow - 0.15);
			}
			lastT = t;
		};
		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		const onScroll = () => {
			if (!liveRef.current) return;
			el.classList.add("wwu-scrolling"); // pauses ambient animation (see CSS)
			clearTimeout(idle);
			idle = window.setTimeout(() => el.classList.remove("wwu-scrolling"), 160);
			schedule();
		};
		const dirty = () => {
			geo.current.dirty = true;
			schedule();
		};

		/* layout changes above the section (images, fonts, accordions) move it */
		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (geo.current.dirty = true)) : undefined;
		ro?.observe(document.body);

		kickRef.current = schedule;
		measure();
		update(performance.now());
		addEventListener("scroll", onScroll, { passive: true });
		addEventListener("resize", dirty);
		addEventListener("load", dirty);
		return () => {
			removeEventListener("scroll", onScroll);
			removeEventListener("resize", dirty);
			removeEventListener("load", dirty);
			clearTimeout(idle);
			el.classList.remove("wwu-scrolling");
			ro?.disconnect();
			if (raf) cancelAnimationFrame(raf);
		};
	}, [measure, goLite]);

	/* book flip controller: event-driven, plus a slow safety tick so it can never get stuck */
	const bookRef = useRef<FlipHandle | null>(null);
	const targetRef = useRef(0);
	const activeRef = useRef(-1);
	const scrollFlipUntil = useRef(0); // flips started by scroll, not by the visitor's hand
	const target = phase < 2 ? 0 : active * 2 + 1;
	targetRef.current = target;
	activeRef.current = active;

	const sync = useCallback(() => {
		const api = bookRef.current?.pageFlip?.();
		if (!api) return;
		try {
			if (api.getState() !== "read") return; // a flip or drag is running
			const cur = api.getCurrentPageIndex();
			const t = targetRef.current;
			if (cur === t) return;
			const next = t === 0 ? (cur <= 1 ? 0 : cur - 2) : cur === 0 ? 1 : t > cur ? Math.min(cur + 2, t) : Math.max(cur - 2, t);
			scrollFlipUntil.current = Date.now() + flipMsRef.current + 350;
			api.flip(next);
		} catch {
			/* book not ready: the next tick tries again */
		}
	}, []);

	useEffect(() => {
		if (armed) sync();
	}, [target, armed, lite, sync]);

	/* a flip finished: keep going towards the target */
	const onState = useCallback((e: { data: string }) => {
		if (e.data === "read") setTimeout(sync, 16);
	}, [sync]);

	useEffect(() => {
		if (!armed || !live) return;
		const id = setInterval(sync, 250);
		return () => clearInterval(id);
	}, [armed, live, sync]);

	const setBookRef = useCallback((r: unknown) => {
		bookRef.current = r as FlipHandle | null;
	}, []);

	/* scroll to a reason (pill click, or the visitor flipped a page by hand) */
	const goTo = useCallback(
		(i: number, instant = false) => {
			if (geo.current.dirty) measure();
			const p = START + ((i + 0.5) / REASONS.length) * (END - START);
			scrollTo({ top: geo.current.top + p * geo.current.range, behavior: instant ? "auto" : "smooth" });
		},
		[measure]
	);

	const onFlip = useCallback(
		(e: { data: number }) => {
			if (Date.now() < scrollFlipUntil.current || e.data < 1) return;
			const i = Math.min(REASONS.length - 1, Math.floor((e.data - 1) / 2));
			if (i !== activeRef.current) goTo(i, true);
		},
		[goTo]
	);

	/* ───────── pages (rebuilt only when the font size changes) ───────── */
	const { pw, ph, S, k, tx, bx } = dims;
	const fs = Math.max(mobile ? 7.4 : 8.5, pw / 22); // text scales with the page
	const shifted = !mobile && phase >= 1; // table + team move right

	const pages = useMemo(() => {
		const out: ReactElement[] = [
			<div key="cover" className="wwu-page wwu-cover" data-density="hard">
				<BookCover kind="front" />
			</div>,
		];

		REASONS.forEach((r, i) => {
			out.push(
				<div key={`l${i}`} className="wwu-page l">
					<div className="wwu-pc" style={{ fontSize: fs }}>
						<div className="wwu-badge">
							<span>{i + 1}</span>
						</div>
						<p className="k">{`0${i + 1} / 0${REASONS.length}`}</p>
						<h3>{r.title}</h3>
						<p className="tx">{r.why}</p>
						<div className="orn">
							<i />
						</div>
						<p className="lbl">How we do it</p>
						<ol>
							{r.steps.map((s, n) => (
								<li key={s}>
									<span className="n">{n + 1}</span>
									<span>{s}</span>
								</li>
							))}
						</ol>
					</div>
				</div>,
				<div key={`r${i}`} className="wwu-page r">
					<div className="wwu-ribbon" />
					<div className="wwu-pc" style={{ fontSize: fs }}>
						<p className="k">Chapter {ROMAN[i]}</p>
						<h3 className="ch">What we did before</h3>
						<div className="orn">
							<i />
						</div>
						<Shot src={r.project.image} name={r.project.name} />
						<h4>{r.project.name}</h4>
						<p className="sub">{r.project.type}</p>
						<p className="tx">{r.project.detail}</p>
						<div className="tags">
							{r.project.tags.map((t) => (
								<span key={t}>{t}</span>
							))}
						</div>
						<p className="pn">{`— ${i * 2 + 2} —`}</p>
					</div>
					<div className="wwu-curl" />
				</div>
			);
		});

		out.push(
			<div key="back" className="wwu-page wwu-cover" data-density="hard" style={{ fontSize: fs }}>
				<BookCover kind="back" />
				<a className="wwu-cta" href="#contact">
					Get a Quote
				</a>
			</div>
		);
		return out;
	}, [fs]);

	const headW = mobile ? undefined : Math.max(150, Math.min(300, (view.w - S) / 2 - 28));

	return (
		<section
			ref={sectionRef}
			id="why-us"
			className={`wwu ${mobile ? "wwu-m" : ""} ${live ? "live" : ""} ${lite ? "wwu-lite" : ""}`}
			style={{ height: `${SECTION_HEIGHT_VH}vh` }}
		>
			<style>{CSS}</style>

			<div className="wwu-sticky" ref={stickyRef}>
				<Stars count={lite ? 36 : mobile ? 44 : 64} twinkle={!lite} />

				<header className="wwu-head" style={{ width: headW }}>
					<Star size={mobile ? 22 : 30} />
					<h2>
						Why work with <span>ShivayTech</span>
					</h2>
					<p className="wwu-now" key={active}>
						{active < 0 ? "Six reasons, one table. Keep scrolling." : REASONS[active].title}
					</p>
				</header>

				{armed && (
					<LiteCtx.Provider value={lite}>
						<div
							className="wwu-scene"
							style={{
								width: S,
								height: S,
								transform: shifted ? `translateX(${n2(tx)}px) scale(${n2(k)})` : "translateX(0px) scale(1)",
							}}
						>
							<TableArt />
							{REASONS.map((r, i) => (
								<PersonLayer key={r.title} look={r.look} index={i} on={active === i} all={active < 0} />
							))}

							{REASONS.map((r, i) => {
								const a = (ANGLES[i] * Math.PI) / 180;
								const s = Math.sin(a);
								return (
									<button
										key={r.title}
										type="button"
										className={`wwu-lab ${active === i ? "on" : ""}`}
										style={{
											left: `${50 + 45.5 * s}%`,
											top: `${50 - 45.5 * Math.cos(a)}%`,
											transform: `translate(${s > 0.9 ? "0%" : s < -0.9 ? "-100%" : "-50%"}, -50%)`,
										}}
										onClick={() => goTo(i)}
										aria-label={`Reason ${i + 1}: ${r.title}`}
									>
										<b>{i + 1}</b>
										<span>{r.title}</span>
									</button>
								);
							})}
						</div>
					</LiteCtx.Provider>
				)}

				{armed && (
					<div
						className={`wwu-pos ${mobile ? "dock" : ""} ${phase >= 2 ? "open" : ""}`}
						style={{ width: pw * 2, height: ph, ...(mobile ? {} : { left: `calc(50% + ${n2(bx)}px)`, top: "58%" }) }}
						aria-hidden={phase < 1}
					>
						<div className={`wwu-rise ${phase >= 1 ? "up" : ""}`}>
							<div className="wwu-aura" />
							{/* a closed book shows only its cover (right half): slide it to the middle until it opens */}
							<div className="wwu-slide" style={{ transform: `translateX(${phase < 2 ? -pw / 2 : 0}px)` }}>
								<div className="wwu-float">
									<div className="wwu-tilt">
										<Book pw={pw} ph={ph} pages={pages} lite={lite} onFlip={onFlip} onState={onState} setRef={setBookRef} />
									</div>
								</div>
							</div>
							<div className="wwu-shadow" />
						</div>
					</div>
				)}

				<div className="wwu-progress" aria-hidden="true">
					<div ref={barRef} />
				</div>
				{phase === 0 && <p className="wwu-hint">Scroll to meet the team</p>}
			</div>
		</section>
	);
}

/* ───────── CSS ───────── */

const CSS = `
.wwu{position:relative;background:#02040c;color:#e8f0ff;-webkit-tap-highlight-color:transparent}
.wwu *{box-sizing:border-box}
.wwu-sticky{contain:layout paint;position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at 50% 45%,#0a1534 0%,#040815 55%,#02040c 100%)}
.wwu-m .wwu-sticky{flex-direction:column;gap:8px;padding-top:calc(78px + env(safe-area-inset-top,0px));padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))}

/* animations run only while the section is near the screen, and pause while scrolling */
.wwu:not(.live) .wwu-star,.wwu:not(.live) .wwu-now,.wwu:not(.live) .wwu-hint,
.wwu:not(.live) .wwu-float,.wwu:not(.live) .wwu-starfx,.wwu:not(.live) .wwu-ring,
.wwu:not(.live) .wwu-headg,.wwu:not(.live) .wwu-hand,.wwu:not(.live) .wwu-eyes,
.wwu-scrolling .wwu-star,.wwu-scrolling .wwu-float,.wwu-scrolling .wwu-starfx,.wwu-scrolling .wwu-ring,
.wwu-scrolling .wwu-headg,.wwu-scrolling .wwu-hand,.wwu-scrolling .wwu-eyes{animation-play-state:paused!important}

.wwu-stars{position:absolute;inset:0;pointer-events:none;contain:strict}
.wwu-stars-s{position:absolute;inset:0;display:block}
.wwu-star{position:absolute;border-radius:50%;background:#cfe0ff;opacity:var(--o);animation:wwuTw 5s ease-in-out infinite}
@keyframes wwuTw{0%,100%{opacity:var(--o)}50%{opacity:.12}}

.wwu-head{position:absolute;left:4vw;top:6vh;z-index:6}
.wwu-m .wwu-head{left:0;right:0;top:calc(14px + env(safe-area-inset-top,0px));width:auto;text-align:center;display:flex;flex-direction:column;align-items:center}
.wwu-head h2{margin:10px 0 0;font-size:clamp(22px,2.4vw,38px);line-height:1.08;font-weight:800;letter-spacing:-.02em;color:#f2f6ff}
.wwu-m .wwu-head h2{margin-top:4px;font-size:clamp(17px,5.2vw,22px)}
.wwu-head h2 span{display:block;background:linear-gradient(180deg,#e8f0ff,#7a8aa8);-webkit-background-clip:text;background-clip:text;color:transparent}
.wwu-m .wwu-head h2 span{display:inline}
.wwu-now{margin:12px 0 0;font-size:clamp(13px,1vw,16px);color:#8fb0ee;min-height:1.4em;animation:wwuNow .5s ease both}
.wwu-m .wwu-now{margin-top:6px;font-size:13px}
@keyframes wwuNow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* the scene slides right and shrinks when the book starts (compositor-only) */
.wwu-scene{position:relative;flex:none;transform-origin:50% 50%;transition:transform 1.1s cubic-bezier(.65,.02,.2,1);will-change:transform}
.wwu-svg{width:100%;height:100%;display:block;overflow:visible}

/* highlight on the svg box (opacity + scale): no svg repaint */
.wwu-psvg{position:absolute;left:0;top:0;pointer-events:none;opacity:.7;transition:opacity .6s ease,transform .6s ease}
.wwu-psvg.all{opacity:.92}
.wwu-psvg.hot{opacity:1;transform:scale(1.07);will-change:transform}
.wwu-halo{opacity:0;transition:opacity .6s ease;transform-box:fill-box;transform-origin:center}
.wwu-person.on .wwu-halo{opacity:1}

/* only the active person moves */
.wwu-headg,.wwu-hand{transform-box:fill-box;transform-origin:center}
.wwu-person.on .wwu-headg{animation:wwuNod 3.4s ease-in-out infinite}
@keyframes wwuNod{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg) translateY(.8px)}}
.wwu-person.on .wwu-hand.l{animation:wwuType .44s ease-in-out infinite}
.wwu-person.on .wwu-hand.r{animation:wwuType .44s ease-in-out .22s infinite}
@keyframes wwuType{0%,100%{transform:translateY(0)}50%{transform:translateY(2.4px)}}
.wwu-glow{opacity:.35;transition:opacity .6s ease}
.wwu-person.on .wwu-glow{opacity:1}

/* name pills */
.wwu-lab{position:absolute;z-index:4;display:flex;align-items:center;gap:.6em;padding:.4em .95em .4em .4em;border-radius:999px;
  border:1px solid rgba(80,140,255,.3);background:rgba(6,14,38,.82);
  color:#9fb4dc;font:inherit;font-size:clamp(11px,.95vw,15px);white-space:nowrap;cursor:pointer;transition:color .5s,border-color .5s,background .5s,box-shadow .5s}
.wwu-lab b{display:grid;place-items:center;width:1.9em;height:1.9em;border-radius:50%;font-size:.8em;font-weight:700;background:rgba(47,107,255,.16);color:#7fb0ff;transition:background .5s,color .5s}
.wwu-lab:hover{border-color:#4f8bff}
.wwu-lab:focus-visible{outline:2px solid #7fb0ff;outline-offset:3px}
.wwu-lab.on{color:#fff;border-color:#4f8bff;background:rgba(30,80,220,.45);box-shadow:0 0 22px rgba(47,107,255,.55),inset 0 0 12px rgba(47,107,255,.3)}
.wwu-lab.on b{background:#2f6bff;color:#fff}
.wwu-m .wwu-lab{padding:.2em}
.wwu-m .wwu-lab span{display:none}
.wwu-m .wwu-lab b{width:26px;height:26px;font-size:12px}
.wwu-m .wwu-lab::after{content:"";position:absolute;inset:-9px}

/* book */
.wwu-pos{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;pointer-events:none}
.wwu-pos.open .wwu-flip{pointer-events:auto}
.wwu-pos.dock{position:relative;left:auto;top:auto;transform:none;flex:none}
.wwu-rise{position:relative;width:100%;height:100%;opacity:0;transform:translateY(70px) scale(.55);transition:opacity .9s ease,transform 1.1s cubic-bezier(.2,.9,.25,1)}
.wwu-rise.up{opacity:1;transform:none;transition-delay:.45s}
.wwu-slide{width:100%;height:100%;transition:transform .9s cubic-bezier(.45,.05,.2,1);will-change:transform}
.wwu-aura{position:absolute;left:-12%;right:-12%;top:-18%;bottom:-18%;background:radial-gradient(ellipse at center,rgba(47,107,255,.34),rgba(47,107,255,0) 68%)}
.wwu-float{position:relative;width:100%;height:100%;animation:wwuBob 5.5s ease-in-out infinite;will-change:transform}
@keyframes wwuBob{0%,100%{transform:translateY(-7px)}50%{transform:translateY(8px)}}
.wwu-tilt{width:100%;height:100%;transform:perspective(1500px) rotateX(13deg)}
.wwu-shadow{position:absolute;left:6%;right:6%;bottom:-19%;height:14%;background:radial-gradient(ellipse at center,rgba(0,0,0,.65),rgba(0,0,0,0) 70%)}
/* vertical swipe scrolls the page, horizontal swipe flips */
.wwu-flip{margin:0 auto;touch-action:pan-y}

/* pages: same look as the cover */
.wwu-page{overflow:hidden;--ink:#e6eeff;--ink2:#9fb4dc;--acc:#9cc4ff;--neon:#2f6bff;--silver:#cfd8ea;font-family:inherit}
.wwu-flip .wwu-page{position:absolute}

.wwu-page.l{color:var(--ink);border:1px solid rgba(80,140,255,.45);
  background:
    radial-gradient(1px 1px at 18% 22%,#cfe0ff,transparent),radial-gradient(1px 1px at 72% 14%,#cfe0ff,transparent),
    radial-gradient(1.2px 1.2px at 40% 78%,#cfe0ff,transparent),radial-gradient(1px 1px at 86% 66%,#cfe0ff,transparent),
    radial-gradient(1px 1px at 8% 60%,#cfe0ff,transparent),radial-gradient(1px 1px at 58% 44%,#cfe0ff,transparent),
    radial-gradient(ellipse at 30% 15%,rgba(47,107,255,.38),transparent 60%),
    radial-gradient(ellipse at 50% 50%,#0b1a4a 0%,#050d2a 60%,#02050f 100%)}
.wwu-page.r{color:var(--ink);border:1px solid rgba(80,140,255,.45);
  background:
    radial-gradient(1px 1px at 26% 18%,#cfe0ff,transparent),radial-gradient(1px 1px at 80% 30%,#cfe0ff,transparent),
    radial-gradient(1.2px 1.2px at 64% 82%,#cfe0ff,transparent),radial-gradient(1px 1px at 12% 70%,#cfe0ff,transparent),
    radial-gradient(ellipse at 70% 10%,rgba(47,107,255,.32),transparent 55%),
    linear-gradient(200deg,#10265f 0%,#081437 55%,#050d2a 100%)}

.wwu-page.l::after,.wwu-page.r::after{content:"";position:absolute;top:0;bottom:0;width:16%;pointer-events:none;z-index:2}
.wwu-page.l::after{right:0;background:linear-gradient(to left,rgba(0,0,0,.6),transparent)}
.wwu-page.r::after{left:0;background:linear-gradient(to right,rgba(0,0,0,.55),transparent)}

.wwu-pc{position:relative;margin:.7em;height:calc(100% - 1.4em);padding:1.2em 1.25em 1.1em;display:flex;flex-direction:column;gap:.5em;line-height:1.45;
  border:1px solid rgba(47,107,255,.7);border-radius:.2em;box-shadow:0 0 12px rgba(47,107,255,.35),inset 0 0 14px rgba(47,107,255,.12)}
.wwu-pc::before,.wwu-pc::after{content:"";position:absolute;width:1.5em;height:1.5em;pointer-events:none;border:0 solid var(--silver)}
.wwu-pc::before{top:-.45em;left:-.45em;border-width:2px 0 0 2px}
.wwu-pc::after{bottom:-.45em;right:-.45em;border-width:0 2px 2px 0}
.wwu-pc > :not(.wwu-shot){flex:none}

.wwu-pc .k{margin:0;font-size:.8em;letter-spacing:.3em;text-transform:uppercase;color:var(--acc)}
.wwu-pc h3{margin:.1em 0 .2em;font-size:1.75em;line-height:1.1;font-weight:800;
  background:linear-gradient(180deg,#fff 0%,#b9c4d8 55%,#d9e2f2 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.wwu-page.l .wwu-pc h3{padding-right:1.9em}
.wwu-pc h3.ch{font-size:1.5em;background:linear-gradient(180deg,#9cc4ff,#1f55ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.wwu-pc h4{margin:.35em 0 0;font-size:1.25em;line-height:1.15;font-weight:800;color:#fff}
.wwu-pc .lbl{margin:.2em 0 0;font-size:.85em;letter-spacing:.18em;text-transform:uppercase;color:var(--acc)}
.wwu-pc .sub{margin:0;font-size:.9em;color:var(--acc)}
.wwu-pc .tx{margin:0;font-size:.98em;color:var(--ink2)}

.wwu-pc .orn{position:relative;height:1px;margin:.35em 0;background:linear-gradient(90deg,transparent,var(--neon),transparent);box-shadow:0 0 8px rgba(47,107,255,.8)}
.wwu-pc .orn i{position:absolute;left:50%;top:50%;width:.5em;height:.5em;background:var(--acc);box-shadow:0 0 8px #4f8bff;transform:translate(-50%,-50%) rotate(45deg)}

.wwu-pc ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.55em;font-size:.95em;color:var(--ink2)}
.wwu-pc li{display:flex;align-items:center;gap:.7em;margin:0}
.wwu-pc li .n{flex:none;display:grid;place-items:center;width:2.1em;height:2.1em;border-radius:50%;
  border:1.5px solid #4f8bff;background:rgba(47,107,255,.2);box-shadow:0 0 10px rgba(47,107,255,.55),inset 0 0 0 .2em rgba(47,107,255,.15);color:#fff;font-weight:700;font-size:.9em}

.wwu-pc .tags{display:flex;flex-wrap:wrap;gap:.4em;margin-top:auto}
.wwu-pc .tags span{padding:.2em .75em;border-radius:999px;border:1px solid #4f8bff;font-size:.8em;color:var(--acc);background:rgba(47,107,255,.15)}
.wwu-pc .pn{margin:.3em 0 0;text-align:center;font-size:.8em;color:var(--ink2)}

.wwu-badge{position:absolute;top:.9em;right:.9em;width:3em;height:3em;border-radius:50%;display:grid;place-items:center;
  border:1.5px solid #4f8bff;background:radial-gradient(circle at 50% 40%,#1d4fe0,#08133a 75%);box-shadow:0 0 14px rgba(47,107,255,.7)}
.wwu-badge::before{content:"";position:absolute;inset:-.35em;border-radius:50%;border:1px dashed rgba(156,196,255,.55)}
.wwu-badge span{font-size:1.25em;font-weight:800;color:#fff}

.wwu-ribbon{position:absolute;top:-1px;right:12%;width:1.7em;height:3.8em;z-index:3;background:linear-gradient(#4f8bff,#1f55ff);box-shadow:0 0 12px rgba(47,107,255,.7);clip-path:polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)}
.wwu-curl{position:absolute;right:0;bottom:0;width:2.8em;height:2.8em;z-index:3;background:linear-gradient(135deg,transparent 50%,#02050f 50%,#1d3a8a);box-shadow:-3px -3px 8px rgba(47,107,255,.3)}

/* screenshot: the whole image is always visible */
.wwu-shot{flex:1 1 auto;min-height:6em;display:flex;flex-direction:column;border-radius:.3em;overflow:hidden;border:1.5px solid #4f8bff;background:#050d2a;
  box-shadow:0 0 14px rgba(47,107,255,.6),0 6px 14px rgba(0,0,0,.5);transform:perspective(700px) rotateY(-7deg);transform-origin:left center}
.wwu-shot .bar{flex:none;display:flex;gap:.3em;padding:.4em .6em;background:#0a1740}
.wwu-shot .bar i{width:.5em;height:.5em;border-radius:50%;background:#4f8bff}
.wwu-shot .view{flex:1 1 0;min-height:0;position:relative;overflow:hidden;background:#050d2a}
.wwu-shot img{position:absolute;inset:0;width:100%;height:100%;display:block}
.wwu-shot img.bg{object-fit:cover;filter:blur(10px) brightness(.55);transform:scale(1.2)}
.wwu-shot img.fg{object-fit:contain;object-position:center}
.wwu-shot .ph{position:absolute;inset:0;display:grid;place-items:center;padding:.6em;text-align:center;font-weight:800;font-size:.95em;color:#cfe0ff;background:linear-gradient(135deg,#0b1a4a,#02050f)}

.wwu-cover{border:0;background:#02040c;border-radius:3px 8px 8px 3px;box-shadow:inset 0 0 0 1px rgba(80,140,255,.45)}
.wwu-bkart{position:absolute;inset:0;width:100%;height:100%;display:block}
.wwu-cta{pointer-events:auto;position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:3;white-space:nowrap;
  padding:.5em 1.3em;border-radius:999px;border:1.5px solid #7fb0ff;background:rgba(6,14,40,.7);color:#fff;text-decoration:none;font-weight:700;font-size:1em;box-shadow:0 0 18px rgba(80,140,255,.6)}

.wwu-progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(80,140,255,.12);z-index:7}
.wwu-progress div{height:100%;transform-origin:left;transform:scaleX(0);will-change:transform;background:linear-gradient(90deg,#2f6bff,#9cc4ff)}
.wwu-hint{position:absolute;bottom:calc(4vh + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;margin:0;font-size:14px;color:#8fb0ee;z-index:6;animation:wwuNow .8s ease both}

.wwu-starfx,.wwu-ring{transform-box:fill-box;transform-origin:center}
.wwu-starfx{animation:wwuStarPulse 3.6s ease-in-out infinite}
@keyframes wwuStarPulse{0%,100%{transform:scale(1);opacity:.88}50%{transform:scale(1.06);opacity:1}}
.wwu-ring{animation:wwuSpin 40s linear infinite}
@keyframes wwuSpin{to{transform:rotate(360deg)}}

/* phones + weak devices: no 3D tilt, no blurred backdrop, no svg blur on the covers */
.wwu-m .wwu-tilt,.wwu-lite .wwu-tilt{transform:none}
.wwu-m .wwu-shot,.wwu-lite .wwu-shot{transform:none;box-shadow:0 0 8px rgba(47,107,255,.5)}
.wwu-m .wwu-shot img.bg,.wwu-lite .wwu-shot img.bg{display:none}
.wwu-m .wwu-bkart [filter],.wwu-lite .wwu-bkart [filter]{filter:none!important}

/* weak devices: no ambient motion, no glows, flat backgrounds, no text-clip gradients */
.wwu-lite .wwu-star,.wwu-lite .wwu-float,.wwu-lite .wwu-starfx,.wwu-lite .wwu-ring,
.wwu-lite .wwu-person .wwu-headg,.wwu-lite .wwu-person .wwu-hand,.wwu-lite .wwu-person .wwu-eyes{animation:none!important}
.wwu-lite .wwu-halo,.wwu-lite .wwu-glow,.wwu-lite .wwu-psvg{transition:none}
.wwu-lite .wwu-psvg.hot,.wwu-lite .wwu-float{will-change:auto}
.wwu-lite .wwu-aura{display:none}
.wwu-lite .wwu-page.l{background:linear-gradient(160deg,#0b1a4a,#050d2a 60%,#02050f)}
.wwu-lite .wwu-page.r{background:linear-gradient(200deg,#10265f,#081437 55%,#050d2a)}
.wwu-lite .wwu-pc{box-shadow:none}
.wwu-lite .wwu-pc h3{background:none;-webkit-text-fill-color:currentColor;color:#e6eeff}
.wwu-lite .wwu-pc h3.ch{color:#9cc4ff}
.wwu-lite .wwu-badge,.wwu-lite .wwu-ribbon,.wwu-lite .wwu-curl,.wwu-lite .wwu-pc li .n,.wwu-lite .wwu-pc .orn,.wwu-lite .wwu-cta,.wwu-lite .wwu-lab.on{box-shadow:none}
.wwu-lite .wwu-head h2 span{background:none;-webkit-text-fill-color:currentColor;color:#aebbd6}

@media (prefers-reduced-motion:reduce){
  .wwu-star,.wwu-float,.wwu-person.on .wwu-headg,.wwu-person.on .wwu-hand,.wwu-starfx,.wwu-ring{animation:none}
  .wwu-rise,.wwu-scene,.wwu-slide,.wwu-psvg{transition:none}
}
`;