"use client";
import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  useVelocity,
  useAnimationControls,
} from "motion/react";

// same neon glow as the navbar (outer glow, wide ambient glow, inner glow, bright inner top edge)
const NEON_REST =
  "0 0 25px rgba(0,110,255,0.5), 0 0 60px rgba(0,110,255,0.15), inset 0 0 30px rgba(0,110,255,0.25), inset 0 2px 8px rgba(0,110,255,0.4)";
// stronger version on hover (same 4 layers so it animates smoothly)
const NEON_HOVER =
  "0 0 35px rgba(0,140,255,0.7), 0 0 80px rgba(0,120,255,0.3), inset 0 0 40px rgba(0,140,255,0.4), inset 0 2px 8px rgba(0,140,255,0.6)";

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

export const DraggableCardBody = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const [constraints, setConstraints] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  const velocityX = useVelocity(mouseX);
  const velocityY = useVelocity(mouseY);

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

  const opacity = useSpring(
    useTransform(mouseX, [-300, 0, 300], [0.8, 1, 0.8]),
    springConfig,
  );

  const glareOpacity = useSpring(
    useTransform(mouseX, [-300, 0, 300], [0.2, 0, 0.2]),
    springConfig,
  );

  useEffect(() => {
    const updateConstraints = () => {
      if (typeof window !== "undefined") {
        setConstraints({
          top: -window.innerHeight / 2,
          left: -window.innerWidth / 2,
          right: window.innerWidth / 2,
          bottom: window.innerHeight / 2,
        });
      }
    };

    updateConstraints();
    window.addEventListener("resize", updateConstraints);

    return () => {
      window.removeEventListener("resize", updateConstraints);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { width, height, left, top } =
      cardRef.current?.getBoundingClientRect() ?? {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    mouseX.set(deltaX);
    mouseY.set(deltaY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      drag
      dragConstraints={constraints}
      onDragStart={() => {
        document.body.style.cursor = "grabbing";
      }}
      onDragEnd={(event, info) => {
        document.body.style.cursor = "default";

        controls.start({
          rotateX: 0,
          rotateY: 0,
          transition: {
            type: "spring",
            ...springConfig,
          },
        });
        const currentVelocityX = velocityX.get();
        const currentVelocityY = velocityY.get();

        const velocityMagnitude = Math.sqrt(
          currentVelocityX * currentVelocityX +
            currentVelocityY * currentVelocityY,
        );
        const bounce = Math.min(0.8, velocityMagnitude / 1000);

        animate(info.point.x, info.point.x + currentVelocityX * 0.3, {
          duration: 0.8,
          ease: [0.2, 0, 0, 1],
          bounce,
          type: "spring",
          stiffness: 50,
          damping: 15,
          mass: 0.8,
        });

        animate(info.point.y, info.point.y + currentVelocityY * 0.3, {
          duration: 0.8,
          ease: [0.2, 0, 0, 1],
          bounce,
          type: "spring",
          stiffness: 50,
          damping: 15,
          mass: 0.8,
        });
      }}
      style={{
        rotateX,
        rotateY,
        opacity,
        willChange: "transform",
        border: "2px solid rgba(0,110,255,0.9)",
        boxShadow: NEON_REST,
      }}
      animate={controls}
      whileHover={{ scale: 1.02, boxShadow: NEON_HOVER }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative min-h-96 w-80 overflow-hidden rounded-md bg-neutral-100 p-6 transform-3d dark:bg-neutral-900",
        className,
      )}
    >
      {children}
      <motion.div
        style={{
          opacity: glareOpacity,
        }}
        className="pointer-events-none absolute inset-0 bg-white select-none"
      />
    </motion.div>
  );
};

export const DraggableCardContainer = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className={cn("[perspective:3000px]", className)}>{children}</div>
  );
};

export default function DraggableCardDemo() {
  const items = [
    {
      title: "Tyler Durden",
      image:
        "https://cdn.21st.dev/assets/mirror/5b/5bd047accda6563413c453afc2e6539276979d17ab03681fa8ccd9d28c718329.jpg",
      className: "absolute top-10 left-[20%] rotate-[-5deg]",
    },
    {
      title: "The Narrator",
      image:
        "https://cdn.21st.dev/assets/mirror/f8/f8794d304174ce2e25dc108cfa2e9218bafd42b19f75095cf05c097f83de17d1.jpg",
      className: "absolute top-40 left-[25%] rotate-[-7deg]",
    },
    {
      title: "Iceland",
      image:
        "https://cdn.21st.dev/assets/mirror/b9/b9758631c2f432150c01acd330ff34a3815498008365d0b7d543eae06f572e7a.jpg",
      className: "absolute top-5 left-[40%] rotate-[8deg]",
    },
    {
      title: "Japan",
      image:
        "https://cdn.21st.dev/assets/mirror/7a/7a5853bb64a6358d781cc3ab06ec45fd7be42d583aa9a164b4d457afc3adebff.jpg",
      className: "absolute top-32 left-[55%] rotate-[10deg]",
    },
    {
      title: "Norway",
      image:
        "https://cdn.21st.dev/assets/mirror/7a/7a5ea12125f49c170585725135e2d1f1a816c71a29f149feb0469396ed7cddef.jpg",
      className: "absolute top-20 right-[35%] rotate-[2deg]",
    },
    {
      title: "New Zealand",
      image:
        "https://cdn.21st.dev/assets/mirror/77/773e007a928155eaec093cec79f4cd2adb718b6fb50b5b5469623d8b1492b076.jpg",
      className: "absolute top-24 left-[45%] rotate-[-7deg]",
    },
    {
      title: "Canada",
      image:
        "https://cdn.21st.dev/assets/mirror/2b/2bd4aa1d9cb47e18df5b4a03427b142910fa911259a7ec729227c0f656e27e0c.jpg",
      className: "absolute top-8 left-[30%] rotate-[4deg]",
    },
  ];

  return (
    <DraggableCardContainer className="relative flex min-h-screen w-full items-center justify-center overflow-clip">
      <SpaceBackdrop />
      <p className="absolute top-1/2 mx-auto max-w-sm -translate-y-3/4 text-center text-2xl font-black text-neutral-400 md:text-4xl dark:text-neutral-800">
        If its your first day at Fight Club, you have to fight.
      </p>
      {items.map((item) => (
        <DraggableCardBody key={item.title} className={item.className}>
          <img
            src={item.image}
            alt={item.title}
            className="pointer-events-none relative z-10 h-80 w-80 object-cover"
          />
          <h3 className="mt-4 text-center text-2xl font-bold text-neutral-700 dark:text-neutral-300">
            {item.title}
          </h3>
        </DraggableCardBody>
      ))}
    </DraggableCardContainer>
  );
}