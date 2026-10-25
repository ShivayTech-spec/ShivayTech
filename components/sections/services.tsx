"use client";
import { cn } from "@/lib/utils";
import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  motion,
  animate,
  MotionConfig,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

// Space background that fills only its parent section (the parent must be position: relative).
// Stars are drawn ONCE onto 3 small canvases (no animation loop). The twinkle is a CSS opacity
// fade on each canvas with a different duration/delay, so it runs on the GPU compositor
// and costs almost nothing on the main thread.
type Star = { x: number; y: number; r: number; a: number; color: string };

const TWINKLE_LAYERS = 3;

const TWINKLE_CSS = `
  @keyframes sb-twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  .sb-layer { will-change: opacity; animation: sb-twinkle 4s ease-in-out infinite; }
  .sb-layer-0 { animation-duration: 3s; animation-delay: 0s; }
  .sb-layer-1 { animation-duration: 4.5s; animation-delay: -1.5s; }
  .sb-layer-2 { animation-duration: 6s; animation-delay: -3s; }
  @media (prefers-reduced-motion: reduce) {
    .sb-layer { animation: none; opacity: 0.8; will-change: auto; }
  }
`;

const SpaceBackdrop = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvases = canvasRefs.current.filter(Boolean) as HTMLCanvasElement[];
    if (!wrap || canvases.length !== TWINKLE_LAYERS) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // star positions are stored as 0..1 so a resize redraws the same sky
    const stars: Star[] = Array.from({ length: 180 }, () => {
      const light = Math.random() < 0.18;
      const hue = light ? 220 : 216 + Math.random() * 22;
      const sat = light ? 25 : 95;
      const lum = light ? 85 + Math.random() * 10 : 50 + Math.random() * 25;
      return {
        x: Math.random(),
        y: Math.random(),
        r: 0.8 + Math.random() * 1.4,
        a: 0.45 + Math.random() * 0.45,
        color: `hsl(${hue} ${sat}% ${lum}%)`,
      };
    });

    let raf = 0;
    const draw = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;

      // fewer stars on small screens / small sections
      const count = Math.min(stars.length, Math.round((w * h) / (w < 768 ? 12000 : 9000)));

      canvases.forEach((canvas, layer) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // each canvas draws its own third of the stars
        for (let i = layer; i < count; i += TWINKLE_LAYERS) {
          const s = stars[i];
          const x = s.x * w;
          const y = s.y * h;
          ctx.fillStyle = s.color;
          // faint halo instead of shadowBlur (much cheaper)
          ctx.globalAlpha = s.a * 0.18;
          ctx.beginPath();
          ctx.arc(x, y, s.r * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = s.a;
          ctx.beginPath();
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% 42%, #0a1a5c 0%, #050b2a 40%, #02040f 70%, #000000 100%)",
      }}
    >
      <style>{TWINKLE_CSS}</style>

      {Array.from({ length: TWINKLE_LAYERS }, (_, i) => (
        <canvas
          key={i}
          ref={(el) => {
            canvasRefs.current[i] = el;
          }}
          className={`sb-layer sb-layer-${i}`}
          style={{ position: "absolute", inset: 0 }}
        />
      ))}
    </div>
  );
};

/* ---------------- Small hooks ---------------- */

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/* ---------------- Draggable card ---------------- */

type Bounds = { left: number; right: number; top: number; bottom: number };

export const DraggableCardBody = ({
  className,
  children,
  style,
  constraints,
  flat = false,
  touch = false,
  unit = 1,
  onFront,
}: {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /** how far (px) the card may move from its resting spot: keeps it inside the section */
  constraints?: Bounds;
  /** no tilt / hover-grow (used while the book is open; it can still be dragged) */
  flat?: boolean;
  /** touch screens: only drag sideways so the page can still scroll vertically */
  touch?: boolean;
  /** card size relative to desktop (keeps the tilt feeling the same on small cards) */
  unit?: number;
  /** called when the card is grabbed so the parent can bring it to the front */
  onFront?: () => void;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const springConfig = {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  };

  const rotateX = useSpring(
    useTransform(mouseY, [-300, 300], [25, -25]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-300, 300], [-25, 25]),
    springConfig,
  );

  // flatten the tilt when the book opens
  useEffect(() => {
    if (flat) {
      mouseX.set(0);
      mouseY.set(0);
    }
  }, [flat, mouseX, mouseY]);

  // when the allowed area changes (book opens / closes / window resizes),
  // glide the card back inside it so it can never get stuck outside
  const cl = constraints?.left;
  const cr = constraints?.right;
  const ct = constraints?.top;
  const cb = constraints?.bottom;
  useEffect(() => {
    if (cl === undefined || cr === undefined || ct === undefined || cb === undefined) return;
    const spring = { type: "spring" as const, stiffness: 260, damping: 30 };
    const nx = Math.min(Math.max(x.get(), cl), cr);
    const ny = Math.min(Math.max(y.get(), ct), cb);
    if (nx !== x.get()) animate(x, nx, spring);
    if (ny !== y.get()) animate(y, ny, spring);
  }, [cl, cr, ct, cb, x, y]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (flat) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    // divide by unit so small cards tilt as much as big ones
    mouseX.set((e.clientX - (rect.left + rect.width / 2)) / unit);
    mouseY.set((e.clientY - (rect.top + rect.height / 2)) / unit);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      drag={touch ? "x" : true}
      dragConstraints={constraints}
      dragElastic={0.08}
      dragMomentum
      dragTransition={{ bounceStiffness: 400, bounceDamping: 40 }}
      onPointerDown={onFront}
      onDragStart={() => {
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
      }}
      onDragEnd={() => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        mouseX.set(0);
        mouseY.set(0);
      }}
      style={{
        ...style,
        x,
        y,
        rotateX,
        rotateY,
        willChange: "transform",
      }}
      whileHover={flat || touch ? undefined : { scale: 1.02 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative transform-3d", className)}
    >
      {children}
    </motion.div>
  );
};

export const DraggableCardContainer = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
>(({ className, style, children }, ref) => {
  return (
    <div
      ref={ref}
      style={style}
      className={cn("[perspective:3000px]", className)}
    >
      {children}
    </div>
  );
});
DraggableCardContainer.displayName = "DraggableCardContainer";

/* ---------------- Icons (inline SVG, no extra dependency) ---------------- */

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const CodeIcon = () => (
  <svg {...iconProps}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);
const LayoutIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);
const WrenchIcon = () => (
  <svg {...iconProps}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const SearchIcon = () => (
  <svg {...iconProps}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const TargetIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
const MegaphoneIcon = () => (
  <svg {...iconProps}>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);
const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const DevicesIcon = () => (
  <svg {...iconProps}>
    <rect x="2" y="4" width="14" height="11" rx="2" />
    <rect x="15" y="9" width="7" height="12" rx="1.5" />
    <line x1="6" y1="19" x2="12" y2="19" />
  </svg>
);
const BoltIcon = () => (
  <svg {...iconProps}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ShieldIcon = () => (
  <svg {...iconProps}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
const ChartIcon = () => (
  <svg {...iconProps}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const CheckIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 11 15 16 9" />
  </svg>
);
const HeadsetIcon = () => (
  <svg {...iconProps}>
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z" />
    <path d="M3 19a2 2 0 0 0 2 2h1v-6H3z" />
  </svg>
);

/* ---------------- Types & constants ---------------- */

type Feature = { icon: React.ReactNode; title: string; desc: string };

type Service = {
  title: string;
  desc: string;
  tagline: string; // bottom line on the cover
  script: string; // handwritten line on the left page
  icon: React.ReactNode;
  accent: string; // bright rgb triplet: glow / highlights
  base: string; // deep rgb triplet: leather color of the book
  image?: string; // e.g. "/services/web-development.jpg"
  features: Feature[];
  className: string; // tilt of the card in the pile (kept as literal classes so Tailwind sees them)
};

const PAGE_W = 420;
const PAGE_H = 560;
const THICK = 56; // book thickness (3D)
const CARD_SCALE = 0.72; // size of the closed book inside the card
const OPEN_SCALE_MAX = 0.95; // max size of the open book (shrinks automatically on small sections)
const GOLD = "232,196,118"; // gold foil
const GOLD_TEXT = "#f3dfa8";
const SCRIPT_FONT = "'Segoe Script','Brush Script MT','Snell Roundhand',cursive";
const EASE = [0.45, 0.05, 0.2, 1] as const;

// desktop card size; on smaller screens everything scales down from this
const BASE_CARD_W = 320;
const BASE_CARD_H = 427;
const MIN_UNIT = 0.55;

const hidden = {
  backfaceVisibility: "hidden" as const,
  WebkitBackfaceVisibility: "hidden" as const,
};

// Tiny inline-SVG noise tiles (no image files): used for the matte cover and the paper edges.
// colour = [r,g,b] 0..1, alpha = a * noise + b
const makeNoise = (
  freq: number,
  [r, g, b]: [number, number, number],
  a: number,
  b2: number,
  size = 240,
) => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${a} ${b2}'/>` +
    `</filter><rect width='${size}' height='${size}' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
const LEATHER_DARK = makeNoise(0.7, [0, 0.02, 0.03], 1.6, -0.6);
const LEATHER_LIGHT = makeNoise(0.9, [1, 1, 0.95], 1.4, -0.82, 180);
const EDGE_NOISE = makeNoise(1.1, [0.35, 0.27, 0.14], 1.2, -0.3);

// Layered page edges + page stacks are built from ::before / ::after (no static images).
const BOOK_CSS = `
  .sb-edge {
    background-color: #e6d9b6;
    background-image:
      repeating-linear-gradient(var(--d), rgba(110,85,45,0.26) 0px, rgba(110,85,45,0.26) 0.6px, transparent 0.6px, transparent 1.7px),
      repeating-linear-gradient(var(--d), transparent 0px, transparent 6px, rgba(90,65,30,0.22) 6px, rgba(90,65,30,0.22) 6.9px, transparent 6.9px, transparent 11px);
  }
  /* cover boards at both ends of the page block + soft shading where the pages meet the boards */
  .sb-edge::before {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background:
      linear-gradient(var(--d), var(--board) 0, var(--board) 4px, transparent 4px, transparent calc(100% - 4px), var(--board) calc(100% - 4px)),
      linear-gradient(var(--d), rgba(30,18,4,0.5) 4px, transparent 26%, transparent 74%, rgba(30,18,4,0.5) calc(100% - 4px));
  }
  .sb-edge::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image: ${EDGE_NOISE}; background-size: 240px 240px; opacity: 0.5;
  }
  /* the pages stacked under the open spread: two offset leaves give real thickness */
  .sb-stack::before, .sb-stack::after {
    content: ""; position: absolute; inset: 0; border-radius: 2px; z-index: -1;
  }
  .sb-stack-r::before { transform: translate(6px, 6px); background: #d2c39a; box-shadow: 0 2px 5px rgba(30,18,4,0.5); }
  .sb-stack-r::after  { transform: translate(3px, 3px); background: #e6d9b6; box-shadow: 0 1px 0 rgba(90,65,25,0.4); }
  .sb-stack-l::before { transform: translate(-6px, 6px); background: #d2c39a; box-shadow: 0 2px 5px rgba(30,18,4,0.5); }
  .sb-stack-l::after  { transform: translate(-3px, 3px); background: #e6d9b6; box-shadow: 0 1px 0 rgba(90,65,25,0.4); }
`;

/* ---------------- Book cover (flat face) ---------------- */

const BookCover = ({
  service,
  index,
  hint = false,
}: {
  service: Service;
  index: number;
  hint?: boolean;
}) => {
  const { title, tagline, icon, accent, base, image } = service;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!image && !imgFailed;

  return (
    <div
      className="relative overflow-hidden rounded-r-md rounded-l-sm"
      style={{
        width: PAGE_W,
        height: PAGE_H,
        background: `linear-gradient(150deg, rgba(${accent},0.4), rgb(${base}) 40%, #02040f 120%)`,
        boxShadow: `inset 0 0 0 1px rgba(${GOLD},0.3), inset 0 0 50px rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.07), inset -3px -3px 8px rgba(0,0,0,0.5)`,
      }}
    >
      {/* picture (fills the whole cover) */}
      {showImage ? (
        <img
          src={image}
          alt={title}
          draggable={false}
          onError={() => setImgFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 50% 52%, rgba(${accent},0.45), transparent 62%)`,
          }}
        >
          <div
            className="scale-[7] opacity-25"
            style={{ color: `rgb(${GOLD})` }}
          >
            {icon}
          </div>
        </div>
      )}

      {/* color grade: leather color at top/bottom so text stays readable, picture shows in the middle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(${base},0.97) 0%, rgba(${base},0.8) 20%, rgba(${base},0.08) 44%, rgba(${base},0.05) 62%, rgba(${base},0.85) 88%, rgba(${base},0.98) 100%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{
          background: `linear-gradient(135deg, rgba(${accent},0.6), transparent 60%)`,
        }}
      />

      {/* matte cloth / leather grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `${LEATHER_LIGHT}, ${LEATHER_DARK}`,
          backgroundSize: "180px 180px, 240px 240px",
        }}
      />
      {/* edge wear: the board is slightly darker where hands hold it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.38) 100%)",
        }}
      />

      {/* hinge groove */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-0 w-[26px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.7), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05) 80%, rgba(255,255,255,0.09) 92%, rgba(0,0,0,0.3))",
          borderRight: `1px solid rgba(${GOLD},0.35)`,
        }}
      />

      {/* gold frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[16px] right-[16px] bottom-[16px] left-[40px] border"
        style={{ borderColor: `rgba(${GOLD},0.55)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[21px] right-[21px] bottom-[21px] left-[45px] border"
        style={{ borderColor: `rgba(${GOLD},0.2)` }}
      />
      {[
        "top-[12px] left-[36px] border-t-2 border-l-2",
        "top-[12px] right-[12px] border-t-2 border-r-2",
        "bottom-[12px] left-[36px] border-b-2 border-l-2",
        "bottom-[12px] right-[12px] border-b-2 border-r-2",
      ].map((c) => (
        <span
          key={c}
          aria-hidden
          className={`pointer-events-none absolute h-[18px] w-[18px] ${c}`}
          style={{ borderColor: `rgba(${GOLD},0.95)` }}
        />
      ))}

      {/* text */}
      <div className="absolute top-[34px] right-[34px] bottom-[30px] left-[62px] flex flex-col items-center">
        <span
          className="font-serif text-[18px] tracking-[0.35em]"
          style={{ color: `rgb(${GOLD})`, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="mt-2 flex w-full items-center gap-2">
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, rgba(${GOLD},0.85))` }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ background: `rgb(${GOLD})` }} />
          <span className="h-px flex-1" style={{ background: `linear-gradient(270deg, transparent, rgba(${GOLD},0.85))` }} />
        </div>

        <h3
          className="mt-4 text-center font-serif text-[38px] leading-[1.08] font-semibold"
          style={{
            color: GOLD_TEXT,
            textShadow: `0 2px 10px rgba(0,0,0,0.8), 0 0 24px rgba(${accent},0.55)`,
          }}
        >
          {title}
        </h3>

        <div className="mt-auto flex flex-col items-center">
          <span
            className="text-center text-[11px] tracking-[0.35em] uppercase"
            style={{ color: `rgb(${GOLD})`, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
          >
            {tagline}
          </span>
          {hint && (
            <span className="mt-2 text-[10px] tracking-[0.3em] text-white/60 uppercase">
              Click or tap to open
            </span>
          )}
        </div>
      </div>

      {/* light sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.035) 45%, transparent 70%)",
        }}
      />
    </div>
  );
};

/* ---------------- Left page of the open book (back of the cover) ---------------- */

const LeftPage = ({ service, index }: { service: Service; index: number }) => {
  const { title, desc, script, icon, accent, base, image } = service;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!image && !imgFailed;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-l-md bg-[#040a24]">
      {showImage ? (
        <img
          src={image}
          alt={title}
          draggable={false}
          onError={() => setImgFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 60% 55%, rgba(${accent},0.45), transparent 60%), linear-gradient(160deg, rgb(${base}), #02040f)`,
          }}
        >
          <div className="scale-[6] opacity-30" style={{ color: `rgb(${GOLD})` }}>
            {icon}
          </div>
        </div>
      )}

      {/* overlays */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(${base},0.96) 0%, rgba(${base},0.3) 38%, rgba(${base},0.35) 60%, rgba(${base},0.96) 100%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{ background: `linear-gradient(135deg, rgba(${accent},0.5), transparent 65%)` }}
      />
      {/* soft inner shadow around the page boundary */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.38), inset 0 0 4px rgba(0,0,0,0.5)" }}
      />
      {/* gutter shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 bottom-0 w-20"
        style={{
          background:
            "linear-gradient(270deg, rgba(0,0,0,0.72), rgba(0,0,0,0.26) 40%, transparent)",
        }}
      />
      {/* frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[14px] border"
        style={{ borderColor: `rgba(${GOLD},0.45)` }}
      />
      {[
        "top-[10px] left-[10px] border-t-2 border-l-2",
        "top-[10px] right-[10px] border-t-2 border-r-2",
        "bottom-[10px] left-[10px] border-b-2 border-l-2",
        "bottom-[10px] right-[10px] border-b-2 border-r-2",
      ].map((c) => (
        <span
          key={c}
          aria-hidden
          className={`pointer-events-none absolute h-[16px] w-[16px] ${c}`}
          style={{ borderColor: `rgba(${GOLD},0.95)` }}
        />
      ))}

      <div className="absolute inset-0 flex flex-col p-10">
        <span
          className="font-serif text-[14px] tracking-[0.35em]"
          style={{ color: `rgb(${GOLD})` }}
        >
          {String(index + 1).padStart(2, "0")} / 07
        </span>
        <h3
          className="mt-3 font-serif text-[44px] leading-[1.05] font-semibold"
          style={{ color: GOLD_TEXT, textShadow: `0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(${accent},0.6)` }}
        >
          {title}
        </h3>
        <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-white/85">
          {desc}
        </p>
        <div className="mt-auto flex items-end gap-3">
          <span
            className="text-[30px] leading-none text-white italic"
            style={{ fontFamily: SCRIPT_FONT, textShadow: `0 0 18px rgba(${accent},0.9)` }}
          >
            {script}
          </span>
          <svg width="46" height="18" viewBox="0 0 46 18" fill="none" className="mb-1" style={{ color: `rgb(${GOLD})` }}>
            <path d="M1 12c10-10 24-10 38 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M33 6l7 6-9 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Right page (a real paper page with the details) ---------------- */

const BOOK_FONT =
  "'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const INK = "rgba(38,25,10,0.92)";
const INK_SOFT = "rgba(86,62,28,0.85)";

// "r,g,b" -> darker "r,g,b"
const shade = (rgb: string, k: number) =>
  rgb
    .split(",")
    .map((n) => Math.round(Number(n) * k))
    .join(",");

// paper fibre noise: a tiny inline SVG the browser tiles (no image file needed)
const PAPER_NOISE = (() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
    "<filter id='n' x='0' y='0' width='100%' height='100%'>" +
    "<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0 0.12  0 0 0 0.9 -0.28'/>" +
    "</filter><rect width='240' height='240' filter='url(#n)'/></svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

const Flourish = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("flex items-center gap-2", className)}>
    <span
      className="h-px flex-1"
      style={{ background: "linear-gradient(90deg, transparent, rgba(90,65,25,0.5))" }}
    />
    <span className="h-[5px] w-[5px] rotate-45" style={{ background: "rgba(90,65,25,0.6)" }} />
    <span
      className="h-px flex-1"
      style={{ background: "linear-gradient(270deg, transparent, rgba(90,65,25,0.5))" }}
    />
  </div>
);

const RightPage = ({
  service,
  index,
  open,
  onClose,
}: {
  service: Service;
  index: number;
  open: boolean;
  onClose: () => void;
}) => {
  const { accent, features } = service;
  const dark = shade(accent, 0.55); // ink colour for icons / rings
  const btnTop = shade(accent, 0.74);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-r-[4px]"
      style={{
        backgroundImage: [
          PAPER_NOISE,
          "radial-gradient(ellipse at 72% 18%, rgba(255,251,235,0.7), transparent 58%)",
          "radial-gradient(circle at 16% 84%, rgba(150,105,45,0.18), transparent 30%)",
          "radial-gradient(circle at 86% 62%, rgba(150,105,45,0.12), transparent 22%)",
          "linear-gradient(160deg, #f1e7c9, #ddcb9f)",
        ].join(", "),
        backgroundSize: "240px 240px, auto, auto, auto, auto",
        color: INK,
        fontFamily: BOOK_FONT,
      }}
    >
      {/* faint laid-paper fibres */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(110,80,35,0.05) 0px, rgba(110,80,35,0.05) 1px, transparent 1px, transparent 4px)",
        }}
      />
      {/* aged, slightly darker edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 70px rgba(125,85,30,0.32), inset 0 0 6px rgba(90,60,20,0.3)",
        }}
      />
      {/* gutter: the page curves down into the spine */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-0 w-[150px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(40,25,5,0.62), rgba(60,40,10,0.24) 28px, rgba(0,0,0,0) 72px, rgba(255,252,238,0.2) 112px, rgba(255,252,238,0) 150px)",
        }}
      />
      {/* stacked page edges on the outer sides */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 bottom-0 w-[5px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,250,235,0.55) 0px, rgba(255,250,235,0.55) 1px, rgba(120,92,50,0.55) 1px, rgba(120,92,50,0.55) 2px)",
          boxShadow: "inset 2px 0 3px rgba(60,40,10,0.35)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-[4px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,250,235,0.55) 0px, rgba(255,250,235,0.55) 1px, rgba(120,92,50,0.55) 1px, rgba(120,92,50,0.55) 2px)",
          boxShadow: "inset 0 2px 3px rgba(60,40,10,0.35)",
        }}
      />
      {/* double ink frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[14px] border"
        style={{ borderColor: "rgba(80,55,20,0.38)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[19px] border"
        style={{ borderColor: "rgba(80,55,20,0.16)" }}
      />

      {/* silk bookmark ribbon hanging from the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-[96px]"
        style={{ filter: "drop-shadow(1px 3px 3px rgba(40,25,5,0.4))" }}
      >
        <div
          style={{
            width: 24,
            height: 86,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 83%, 0 100%)",
            background: `linear-gradient(90deg, rgba(0,0,0,0.25), transparent 30%, rgba(255,255,255,0.2) 55%, rgba(0,0,0,0.22)), linear-gradient(180deg, rgb(${shade(accent, 0.85)}), rgb(${shade(accent, 0.58)}))`,
          }}
        />
      </div>

      <motion.div
        className="relative flex h-full flex-col px-10 pt-10 pb-[56px]"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.4, delay: open ? 0.75 : 0 }}
        style={{ textShadow: "0 0 0.5px rgba(38,25,10,0.45)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-8 right-8 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-lg leading-none transition-colors hover:bg-black/10"
          style={{
            borderColor: "rgba(80,55,20,0.45)",
            color: INK,
            background: "rgba(255,248,225,0.35)",
            fontFamily: BOOK_FONT,
          }}
        >
          ×
        </button>

        <span
          className="text-[10px] font-semibold tracking-[0.4em] uppercase"
          style={{ color: INK_SOFT }}
        >
          Chapter {ROMAN[index] ?? index + 1}
        </span>
        <h4
          className="mt-1 text-[30px] leading-none font-normal italic"
          style={{ color: INK }}
        >
          What&apos;s included
        </h4>
        <Flourish className="mt-3 w-[170px]" />

        <div className="mt-3 flex flex-1 flex-col justify-center">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : 10 }}
              transition={{ duration: 0.4, delay: open ? 0.85 + i * 0.1 : 0 }}
            >
              <div className="flex items-center gap-4 py-3">
                {/* ink-stamp style icon */}
                <div
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full"
                  style={{
                    color: `rgb(${dark})`,
                    border: `1.5px solid rgba(${dark},0.7)`,
                    background: `radial-gradient(circle at 35% 30%, rgba(${accent},0.3), rgba(${accent},0.1))`,
                    boxShadow: `inset 0 0 0 3px rgba(255,248,225,0.5), inset 0 0 0 4px rgba(${dark},0.35)`,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div className="text-[16px] leading-tight font-semibold" style={{ color: INK }}>
                    {f.title}
                  </div>
                  <div className="mt-0.5 text-[13px] leading-snug italic" style={{ color: INK_SOFT }}>
                    {f.desc}
                  </div>
                </div>
              </div>
              {i < features.length - 1 && <Flourish className="opacity-70" />}
            </motion.div>
          ))}
        </div>

        <a
          href="#contact"
          onClick={onClose}
          className="relative mt-4 flex items-center justify-center gap-2 rounded-[3px] py-3 text-[13px] font-semibold tracking-[0.28em] uppercase transition-transform hover:scale-[1.02]"
          style={{
            fontFamily: BOOK_FONT,
            color: "#fff6dc",
            textShadow: "0 1px 1px rgba(0,0,0,0.45)",
            background: `linear-gradient(180deg, rgb(${btnTop}), rgb(${shade(accent, 0.5)}))`,
            boxShadow: `0 2px 0 rgba(0,0,0,0.25), 0 8px 16px rgba(${dark},0.35), inset 0 0 0 1px rgba(255,236,190,0.5)`,
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] rounded-[2px] border border-dashed"
            style={{ borderColor: "rgba(255,236,190,0.45)" }}
          />
          Get Started <span>→</span>
        </a>

        <span
          className="absolute right-0 bottom-[24px] left-0 text-center text-[11px] tracking-[0.3em] italic"
          style={{ color: "rgba(90,65,25,0.6)" }}
        >
          — {index * 2 + 2} —
        </span>
      </motion.div>

      {/* turned-up page corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-[38px] w-[38px]"
        style={{ filter: "drop-shadow(-2px -2px 3px rgba(50,30,8,0.4))" }}
      >
        <div
          className="absolute inset-0"
          style={{
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            background:
              "linear-gradient(to bottom right, rgba(70,48,15,0.6), rgb(196,177,131) 55%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
            background: "linear-gradient(135deg, #f6edd3 0%, #dccb9f 85%)",
          }}
        />
      </div>
    </div>
  );
};

/* ---------------- Card: a 3D book that opens in place (desktop / tablet) ---------------- */

const COVER_EASE = [0.55, 0.02, 0.2, 1] as const;

// custom properties read by the .sb-edge pseudo-element CSS
const edgeVars = (dir: string, base: string) =>
  ({ "--d": dir, "--board": `rgb(${base})` }) as React.CSSProperties;

const ServiceCard = ({
  service,
  index,
  unit,
  open,
  onOpen,
  onClose,
  onFit,
}: {
  service: Service;
  index: number;
  unit: number; // card size relative to desktop (0.55 - 1)
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** tells the parent how big the open book is, so dragging can keep it inside the section */
  onFit?: (fit: { scale: number; dx: number; dy: number }) => void;
}) => {
  const { title, accent, base } = service;
  const rootRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // only count it as a click if the pointer barely moved (so dragging never opens the book)
  const down = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [fit, setFit] = useState({ scale: OPEN_SCALE_MAX, dx: 0, dy: 0 });
  const onFitRef = useRef(onFit);
  onFitRef.current = onFit;

  // the info page sits under the cover while closed: keep its links out of the tab order / screen readers
  useEffect(() => {
    pageRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // when opening, work out how big the open book can be and how far to nudge it so it stays inside the section
  useEffect(() => {
    if (!open) return;
    const card = rootRef.current?.parentElement;
    const area = card?.offsetParent as HTMLElement | null | undefined;
    if (!card || !area) return;
    const a = area.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const cx = c.left + c.width / 2 - a.left;
    const cy = c.top + c.height / 2 - a.top;
    const margin = 16;
    const scale = Math.max(
      0.3,
      Math.min(
        OPEN_SCALE_MAX,
        (a.width - margin * 2) / (PAGE_W * 2),
        (a.height - margin * 2) / PAGE_H,
      ),
    );
    const hw = PAGE_W * scale;
    const hh = (PAGE_H * scale) / 2;
    const clamp = (v: number, min: number, max: number) =>
      Math.min(Math.max(v, min), Math.max(min, max));
    const next = {
      scale,
      dx: clamp(cx, hw + margin, a.width - hw - margin) - cx,
      dy: clamp(cy, hh + margin, a.height - hh - margin) - cy,
    };
    setFit(next);
    onFitRef.current?.(next);
  }, [open]);

  // timings: the cover swings slowly at first, speeds up, then settles; closing is a touch quicker
  const dur = open ? 1.2 : 0.95;
  const delay = open ? 0.08 : 0;
  const half = dur * 0.5;
  const faceT = { duration: 0.35, delay: open ? 0 : 0.6 };
  const faceFade = { opacity: open ? 0 : 1 };
  const t = { duration: open ? 0.95 : 0.8, ease: EASE };

  return (
    <div
      ref={rootRef}
      role={open ? undefined : "button"}
      tabIndex={open ? -1 : 0}
      aria-label={open ? undefined : `Open ${title}`}
      className={cn(
        "relative h-full w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#e8c476]/80",
        open ? "cursor-grab select-text active:cursor-grabbing" : "cursor-pointer select-none",
      )}
      onKeyDown={(e) => {
        if (!open && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const d = down.current;
        down.current = null;
        if (!open && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) onOpen();
      }}
    >
      {/* anchor at the card centre */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-0 w-0">
        {/* the whole spread (2 pages wide), scaled; grows when open */}
        <motion.div
          className="pointer-events-none"
          initial={false}
          animate={{
            x: open ? fit.dx : 0,
            y: open ? fit.dy : 0,
            scale: open ? fit.scale : CARD_SCALE * unit,
          }}
          transition={t}
          style={{
            width: PAGE_W * 2,
            height: PAGE_H,
            marginLeft: -PAGE_W,
            marginTop: -PAGE_H / 2,
            // restrained: a whisper of the accent + a soft cast shadow (the contact shadow is below)
            filter: `drop-shadow(0 0 14px rgba(${accent},0.1)) drop-shadow(0 8px 10px rgba(0,0,0,0.35))`,
          }}
        >
          {/* ambient occlusion + contact shadow under the book (widens when the book opens) */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute"
            initial={false}
            animate={{ scaleX: open ? 1 : 0.52, opacity: open ? 0.95 : 0.8 }}
            transition={t}
            style={{
              left: PAGE_W * 0.04,
              width: PAGE_W * 1.92,
              top: PAGE_H - 26,
              height: 64,
              background:
                "radial-gradient(ellipse 48% 20% at 50% 40%, rgba(0,0,0,0.7), transparent 100%), radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.38), transparent 100%)",
            }}
          />

          <div className="pointer-events-none" style={{ perspective: 1800, width: "100%", height: "100%" }}>
            {/* book group: closed = turned 3D book on the right half, open = flat spread */}
            <motion.div
              className="pointer-events-none relative h-full w-full"
              initial={false}
              animate={{
                x: open ? 0 : -PAGE_W / 2,
                rotateY: open ? 0 : hovered ? 12 : 26,
                rotateX: open ? 0 : hovered ? -4 : -6,
              }}
              transition={t}
              style={{ transformStyle: "preserve-3d", transformOrigin: "75% 50%" }}
            >
              {/* hardcover boards (they stick out a little past the pages), left half */}
              <motion.div
                aria-hidden
                className="absolute rounded-l-lg"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.6, delay: open ? 0.3 : 0 }}
                style={{
                  z: -THICK / 2,
                  top: -12,
                  left: -14,
                  width: PAGE_W + 14,
                  height: PAGE_H + 24,
                  backgroundImage: `${LEATHER_DARK}, linear-gradient(145deg, rgb(${base}), #050a22 80%)`,
                  backgroundSize: "240px 240px, auto",
                  border: `1px solid rgba(${GOLD},0.4)`,
                  boxShadow: "inset 0 0 22px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.45)",
                }}
              />
              {/* hardcover boards, right half */}
              <motion.div
                aria-hidden
                className="absolute rounded-r-lg"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.6, delay: open ? 0.3 : 0 }}
                style={{
                  z: -THICK / 2,
                  top: -12,
                  left: PAGE_W,
                  width: PAGE_W + 14,
                  height: PAGE_H + 24,
                  backgroundImage: `${LEATHER_DARK}, linear-gradient(215deg, rgb(${base}), #050a22 80%)`,
                  backgroundSize: "240px 240px, auto",
                  border: `1px solid rgba(${GOLD},0.4)`,
                  boxShadow: "inset 0 0 22px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.45)",
                }}
              />

              {/* page stacks under the open spread (layered leaves via ::before / ::after) */}
              <motion.div
                aria-hidden
                className="sb-stack sb-stack-l absolute"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.4, delay: open ? 0.4 : 0 }}
                style={{ z: -2, left: 0, top: 0, width: PAGE_W, height: PAGE_H }}
              />
              <motion.div
                aria-hidden
                className="sb-stack sb-stack-r absolute"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.4, delay: open ? 0.4 : 0 }}
                style={{ z: -2, left: PAGE_W, top: 0, width: PAGE_W, height: PAGE_H }}
              />

              {/* back cover (closed 3D book only) */}
              <motion.div
                className="absolute rounded-md"
                initial={false}
                animate={faceFade}
                transition={faceT}
                style={{
                  z: -THICK / 2,
                  rotateY: 180,
                  left: PAGE_W,
                  top: 0,
                  width: PAGE_W,
                  height: PAGE_H,
                  backgroundImage: `${LEATHER_DARK}, linear-gradient(150deg, rgb(${base}), #02040f)`,
                  backgroundSize: "240px 240px, auto",
                }}
              />

              {/* spine: rounded like a real binding */}
              <motion.div
                className="pointer-events-auto absolute top-0 flex items-center justify-center overflow-hidden"
                initial={false}
                animate={faceFade}
                transition={faceT}
                style={{
                  rotateY: -90,
                  left: PAGE_W - THICK / 2,
                  width: THICK,
                  height: PAGE_H,
                  backgroundImage: `${LEATHER_DARK}, linear-gradient(90deg, rgba(0,0,0,0.65), rgb(${base}) 16%, rgba(${accent},0.22) 42%, rgba(255,255,255,0.05) 50%, rgb(${base}) 66%, rgba(0,0,0,0.7))`,
                  backgroundSize: "240px 240px, auto",
                  boxShadow: "inset 0 0 14px rgba(0,0,0,0.5)",
                }}
              >
                {["7%", "93%"].map((top) => (
                  <span
                    key={top}
                    className="absolute inset-x-0 h-[9px] -translate-y-1/2"
                    style={{
                      top,
                      borderTop: `1px solid rgba(${GOLD},0.7)`,
                      borderBottom: `1px solid rgba(${GOLD},0.7)`,
                      background: `rgba(${GOLD},0.12)`,
                    }}
                  />
                ))}
                {["22%", "78%"].map((top) => (
                  <span
                    key={top}
                    className="absolute inset-x-0 h-[3px] -translate-y-1/2"
                    style={{
                      top,
                      borderTop: `1px solid rgba(${GOLD},0.7)`,
                      borderBottom: `1px solid rgba(${GOLD},0.7)`,
                      background: `rgba(${GOLD},0.12)`,
                    }}
                  />
                ))}
                <span
                  className="font-serif text-[19px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase"
                  style={{
                    writingMode: "vertical-rl",
                    color: GOLD_TEXT,
                    textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                  }}
                >
                  {title}
                </span>
              </motion.div>

              {/* page edges: top + bottom (layered paper, built with pseudo-elements) */}
              {[-THICK / 2, PAGE_H - THICK / 2].map((top) => (
                <motion.div
                  key={top}
                  className="sb-edge absolute"
                  initial={false}
                  animate={faceFade}
                  transition={faceT}
                  style={{
                    ...edgeVars("0deg", base),
                    rotateX: 90,
                    top,
                    left: PAGE_W + 6,
                    width: PAGE_W - 12,
                    height: THICK - 8,
                  }}
                />
              ))}

              {/* page edges: right */}
              <motion.div
                className="sb-edge absolute"
                initial={false}
                animate={faceFade}
                transition={faceT}
                style={{
                  ...edgeVars("90deg", base),
                  rotateY: 90,
                  top: 6,
                  left: PAGE_W * 2 - THICK / 2 + 4,
                  width: THICK - 8,
                  height: PAGE_H - 12,
                }}
              />

              {/* right page (paper) - sits under the cover and is revealed as it swings open */}
              <motion.div
                ref={pageRef}
                className="absolute top-0"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.2, delay: open ? 0 : 0.95 }}
                style={{
                  left: PAGE_W,
                  width: PAGE_W,
                  height: PAGE_H,
                  pointerEvents: open ? "auto" : "none",
                }}
              >
                <RightPage service={service} index={index} open={open} onClose={onClose} />
              </motion.div>

              {/* the fold: both pages curve down into the centre of the spread */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute top-0"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.5, delay: open ? 0.55 : 0 }}
                style={{
                  z: 3,
                  left: PAGE_W - 46,
                  width: 92,
                  height: PAGE_H,
                  background:
                    "linear-gradient(90deg, transparent, rgba(25,14,3,0.22) 38%, rgba(15,8,0,0.42) 50%, rgba(25,14,3,0.22) 62%, transparent)",
                }}
              />

              {/* the cover: front = cover art, back = inside of the cover; swings around the spine */}
              <motion.div
                className="pointer-events-auto absolute top-0"
                initial={false}
                animate={{ rotateY: open ? -180 : 0, z: open ? 2 : THICK / 2 }}
                transition={{ duration: dur, ease: COVER_EASE, delay }}
                style={{
                  left: PAGE_W,
                  width: PAGE_W,
                  height: PAGE_H,
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* front face: tiny z offsets keep the two faces from ever fighting or showing through */}
                <div
                  className="absolute inset-0"
                  style={{ ...hidden, transform: "translateZ(0.5px)" }}
                >
                  <BookCover service={service} index={index} hint />
                  {/* the cover darkens as it turns away from the light */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    initial={false}
                    animate={{ opacity: open ? 0.55 : 0 }}
                    transition={{
                      duration: half,
                      ease: "linear",
                      delay: open ? delay : delay + half,
                    }}
                    style={{ background: "#05080f" }}
                  />
                </div>
                <div
                  className="absolute inset-0"
                  style={{ ...hidden, transform: "rotateY(180deg) translateZ(0.5px)" }}
                >
                  <LeftPage service={service} index={index} />
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    initial={false}
                    animate={{ opacity: open ? 0 : 0.55 }}
                    transition={{
                      duration: half,
                      ease: "linear",
                      delay: open ? delay + half : delay,
                    }}
                    style={{ background: "#05080f" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ---------------- Full-screen sheet (phones, small windows, landscape phones) ---------------- */
// The open book would be unreadably small on a phone, so there the details open as a scrollable sheet.

const ServiceSheet = ({
  service,
  index,
  onClose,
}: {
  service: Service;
  index: number;
  onClose: () => void;
}) => {
  const [vw, setVw] = useState(0);

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock page scroll behind the sheet
    return () => {
      window.removeEventListener("resize", update);
      document.body.style.overflow = prev;
    };
  }, []);

  if (!vw) return null;

  // wide enough: pages side by side like a real book, otherwise stacked
  const sideBySide = vw >= PAGE_W * 2 + 48;
  const w = sideBySide ? PAGE_W * 2 : PAGE_W;
  const h = sideBySide ? PAGE_H : PAGE_H * 2;
  const s = Math.min(1, (vw - 32) / w);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={service.title}
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          style={{ width: w * s, height: h * s }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="grid overflow-hidden rounded-lg shadow-2xl"
            style={{
              width: w,
              height: h,
              transform: `scale(${s})`,
              transformOrigin: "top left",
              gridTemplateColumns: `repeat(${sideBySide ? 2 : 1}, ${PAGE_W}px)`,
              gridAutoRows: `${PAGE_H}px`,
              boxShadow: `0 0 60px rgba(${service.accent},0.4)`,
            }}
          >
            <LeftPage service={service} index={index} />
            <RightPage service={service} index={index} open onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Services + layout ---------------- */

// Put your images in /public/services/ and they show up on the cover and the left page.
// Until the file exists, a placeholder is shown.
const SERVICES: Service[] = [
  {
    title: "Web Development",
    desc: "Custom websites & web applications built to grow your business.",
    tagline: "Build · Develop · Grow",
    script: "Ideas into Reality",
    icon: <CodeIcon />,
    accent: "70,130,255",
    base: "11,31,92",
    image: "/images/sample1.png",
    features: [
      { icon: <CodeIcon />, title: "Custom Development", desc: "Fast, scalable and modern websites built for your goals." },
      { icon: <DevicesIcon />, title: "Responsive Design", desc: "Looks perfect on every device." },
      { icon: <BoltIcon />, title: "Performance Focused", desc: "Optimized for speed and better user experience." },
      { icon: <HeadsetIcon />, title: "Ongoing Support", desc: "We're here even after launch." },
    ],
    className: "rotate-[-5deg]",
  },
  {
    title: "Web Redesign",
    desc: "Fresh, modern makeovers that turn outdated sites into lead machines.",
    tagline: "Modern · Engaging · Convert",
    script: "Old to Outstanding",
    icon: <LayoutIcon />,
    accent: "160,100,255",
    base: "43,18,89",
    image: "/images/sample1.png",
    features: [
      { icon: <LayoutIcon />, title: "Fresh Modern Look", desc: "A new design that matches your brand today." },
      { icon: <DevicesIcon />, title: "Better User Experience", desc: "Cleaner layouts and easier navigation." },
      { icon: <ChartIcon />, title: "Conversion Focused", desc: "Built to turn visitors into enquiries." },
      { icon: <BoltIcon />, title: "Faster & Mobile-Ready", desc: "Quicker load times on every screen." },
    ],
    className: "rotate-[-7deg]",
  },
  {
    title: "Web Maintenance",
    desc: "Updates, backups, security and speed fixes so your site never slows down.",
    tagline: "Secure · Update · Optimize",
    script: "Always Running Smooth",
    icon: <WrenchIcon />,
    accent: "40,185,125",
    base: "10,61,44",
    image: "/images/sample1.png",
    features: [
      { icon: <WrenchIcon />, title: "Regular Updates", desc: "Core, plugins and dependencies kept current." },
      { icon: <ShieldIcon />, title: "Security Monitoring", desc: "Threats caught and fixed before they hurt." },
      { icon: <CheckIcon />, title: "Backups & Recovery", desc: "Restore quickly if anything goes wrong." },
      { icon: <BoltIcon />, title: "Speed Fixes", desc: "Ongoing performance tuning." },
    ],
    className: "rotate-[8deg]",
  },
  {
    title: "SEO Optimization",
    desc: "Rank higher on Google and bring in steady organic traffic.",
    tagline: "Rank · Traffic · Visibility",
    script: "Be Found First",
    icon: <SearchIcon />,
    accent: "245,170,50",
    base: "74,43,6",
    image: "/images/sample1.png",
    features: [
      { icon: <SearchIcon />, title: "On-Page SEO", desc: "Titles, content and structure that rank." },
      { icon: <CodeIcon />, title: "Technical SEO", desc: "Speed, indexing and clean site structure." },
      { icon: <LayoutIcon />, title: "Content Strategy", desc: "Pages built around what people search for." },
      { icon: <ChartIcon />, title: "Reports & Tracking", desc: "Clear monthly progress you can see." },
    ],
    className: "rotate-[10deg]",
  },
  {
    title: "Google Ads",
    desc: "High-intent search campaigns that get you calls and enquiries.",
    tagline: "Target · Clicks · Results",
    script: "Right People, Right Time",
    icon: <TargetIcon />,
    accent: "235,70,80",
    base: "77,15,26",
    image: "/images/sample1.png",
    features: [
      { icon: <TargetIcon />, title: "Search Campaigns", desc: "Show up when customers are ready to buy." },
      { icon: <MegaphoneIcon />, title: "Display & Remarketing", desc: "Bring past visitors back to your site." },
      { icon: <ChartIcon />, title: "Conversion Tracking", desc: "Know exactly what each click delivers." },
      { icon: <BoltIcon />, title: "Budget Optimization", desc: "More results from every rupee spent." },
    ],
    className: "rotate-[2deg]",
  },
  {
    title: "Meta Ads",
    desc: "Facebook and Instagram campaigns that reach the right audience.",
    tagline: "Reach · Engage · Convert",
    script: "Stop the Scroll",
    icon: <MegaphoneIcon />,
    accent: "225,85,155",
    base: "74,16,56",
    image: "/images/sample1.png",
    features: [
      { icon: <MegaphoneIcon />, title: "Facebook & Instagram", desc: "Campaigns across both platforms." },
      { icon: <TargetIcon />, title: "Audience Targeting", desc: "Reach people who actually match your customer." },
      { icon: <LayoutIcon />, title: "Creative Design", desc: "Scroll-stopping visuals and ad copy." },
      { icon: <ChartIcon />, title: "Lead Generation", desc: "Enquiries delivered straight to you." },
    ],
    className: "rotate-[-7deg]",
  },
  {
    title: "Google Business Profile",
    desc: "Dominate local search and Maps with an optimized listing.",
    tagline: "Local · Maps · Reviews",
    script: "Win Your Neighbourhood",
    icon: <PinIcon />,
    accent: "30,200,210",
    base: "8,64,74",
    image: "/images/sample1.png",
    features: [
      { icon: <PinIcon />, title: "Profile Optimization", desc: "A complete, search-ready business listing." },
      { icon: <SearchIcon />, title: "Local SEO", desc: "Rank in the map pack near you." },
      { icon: <CheckIcon />, title: "Review Management", desc: "Collect and reply to reviews that build trust." },
      { icon: <ChartIcon />, title: "Posts & Insights", desc: "Regular updates and performance reports." },
    ],
    className: "rotate-[4deg]",
  },
];

// Where each card rests in the pile, as a fraction (0..1) of the free room inside the section.
// Same loose pile as the original desktop layout, but it now scales with the section size.
const SPOTS = [
  { x: 0.257, y: 0.452 },
  { x: 0.321, y: 0.576 },
  { x: 0.514, y: 0.432 },
  { x: 0.707, y: 0.543 },
  { x: 0.55, y: 0.493 },
  { x: 0.579, y: 0.51 },
  { x: 0.386, y: 0.444 },
];

function computeLayout(W: number) {
  // card size: full size from 1280px up, shrinking smoothly down to MIN_UNIT on phones
  const unit = Math.min(1, Math.max(MIN_UNIT, W / 1280));
  const cardW = BASE_CARD_W * unit;
  const cardH = BASE_CARD_H * unit;
  const height = Math.round(cardH * 3.28); // 1400px on desktop, same proportion everywhere
  const freeX = Math.max(0, W - cardW);
  const freeY = Math.max(0, height - cardH);
  const narrow = W < 768;

  const spots = SPOTS.map((s) => {
    let { x, y } = s;
    if (narrow) {
      // phones: spread the pile out so every book is visible and easy to grab
      x = 0.04 + ((x - 0.257) / (0.707 - 0.257)) * 0.92;
      y = 0.5 + (y - 0.5) * 3;
    }
    const left = x * freeX;
    const top = y * freeY;
    return {
      left,
      top,
      // how far the card may travel from where it rests: never outside the section
      constraints: {
        left: -left,
        right: freeX - left,
        top: -top,
        bottom: freeY - top,
      },
    };
  });

  return { unit, cardW, cardH, height, spots };
}

/* ---------------- Demo ---------------- */

export default function DraggableCardDemo() {
  const [active, setActive] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>(() => SERVICES.map((_, i) => i));
  const [openFit, setOpenFit] = useState<{ scale: number; dx: number; dy: number } | null>(null);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // phones / small windows / landscape phones open the details as a sheet instead of an in-place book
  const compact = useMediaQuery("(max-width: 819px), (max-height: 619px)");
  // touch screens only drag sideways so the page can still be scrolled with a finger
  const touch = useMediaQuery("(pointer: coarse)");
  const reduceMotion = useReducedMotion();

  // measure the section width (before first paint, then on every resize)
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.round(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => (width ? computeLayout(width) : null), [width]);

  // Esc closes the open book
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // grabbed card goes on top of the pile
  const bringToFront = (i: number) =>
    setOrder((o) => (o[o.length - 1] === i ? o : [...o.filter((n) => n !== i), i]));

  return (
    <MotionConfig reducedMotion="user">
      <DraggableCardContainer
        ref={wrapRef}
        className="relative flex w-full items-center justify-center overflow-clip"
        style={{ height: layout ? layout.height : 1400 }}
      >
        <SpaceBackdrop />
        <style>{BOOK_CSS}</style>

        {/* section heading + how-to line (sits behind the books so they can be dragged over it) */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-0 px-6 pt-10 text-center md:pt-14">
          <h2
            className="font-serif text-[32px] leading-tight font-semibold tracking-wide md:text-5xl"
            style={{
              color: GOLD_TEXT,
              textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 0 28px rgba(232,196,118,0.25)",
            }}
          >
            ShivayTech Services
          </h2>
          <div aria-hidden className="mx-auto mt-3 flex w-40 items-center gap-2 md:w-56">
            <span
              className="h-px flex-1"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${GOLD},0.85))` }}
            />
            <span className="h-1.5 w-1.5 rotate-45" style={{ background: `rgb(${GOLD})` }} />
            <span
              className="h-px flex-1"
              style={{ background: `linear-gradient(270deg, transparent, rgba(${GOLD},0.85))` }}
            />
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70 md:text-base">
            {touch
              ? "Swipe a book sideways to move it, then tap it to open and see what\u2019s included."
              : "Drag the books around to explore, then click one to open it and see what\u2019s included."}
          </p>
        </header>
        <p className="absolute top-1/2 mx-auto max-w-sm -translate-y-3/4 px-6 text-center text-2xl font-black text-neutral-400 md:text-4xl dark:text-neutral-800">
          What we do best.
        </p>

        {layout &&
          SERVICES.map((item, i) => {
            const spot = layout.spots[i];
            const bookOpen = active === i && !compact;

            // closed: the card stays inside the section.
            // open: the whole open book stays inside the section while you drag it.
            let constraints: Bounds = spot.constraints;
            if (bookOpen && openFit) {
              const margin = 16;
              const hw = PAGE_W * openFit.scale;
              const hh = (PAGE_H * openFit.scale) / 2;
              const cx = spot.left + layout.cardW / 2;
              const cy = spot.top + layout.cardH / 2;
              constraints = {
                left: Math.min(0, margin + hw - cx - openFit.dx),
                right: Math.max(0, width - margin - hw - cx - openFit.dx),
                top: Math.min(0, margin + hh - cy - openFit.dy),
                bottom: Math.max(0, layout.height - margin - hh - cy - openFit.dy),
              };
            }

            return (
              <DraggableCardBody
                key={item.title}
                unit={layout.unit}
                touch={touch}
                flat={bookOpen || !!reduceMotion}
                constraints={constraints}
                onFront={() => bringToFront(i)}
                style={{
                  left: spot.left,
                  top: spot.top,
                  width: layout.cardW,
                  height: layout.cardH,
                  zIndex: bookOpen ? 100 : order.indexOf(i) + 1,
                }}
                className={cn(
                  "absolute",
                  item.className,
                  "transition-[rotate] duration-500 motion-reduce:transition-none",
                  bookOpen && "rotate-0!",
                )}
              >
                <ServiceCard
                  service={item}
                  index={i}
                  unit={layout.unit}
                  open={bookOpen}
                  onOpen={() => {
                    bringToFront(i);
                    setOpenFit(null);
                    setActive(i);
                  }}
                  onClose={() => {
                    setActive(null);
                    setOpenFit(null);
                  }}
                  onFit={setOpenFit}
                />
              </DraggableCardBody>
            );
          })}
      </DraggableCardContainer>

      {active !== null && compact && (
        <ServiceSheet
          service={SERVICES[active]}
          index={active}
          onClose={() => setActive(null)}
        />
      )}
    </MotionConfig>
  );
}