"use client";

import React, { useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

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

// Props interface for the component
interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  images: string[];
  className?: string;
}

// Reusable Button component styled like in the image
const ActionButton = ({ children }: { children: React.ReactNode }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="mt-8 px-8 py-3 rounded-full bg-red-500 text-white font-semibold shadow-lg transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
  >
    {children}
  </motion.button>
);

// The main hero component
export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  images,
  className,
}) => {
  // Animation variants for the text content
  const FADE_IN_ANIMATION_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
  };

  // Duplicate images for a seamless loop
  const duplicatedImages = [...images, ...images];

  return (
    <section
      className={cn(
        "relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-center px-4",
        className
      )}
    >
      <SpaceBackdrop />

      <div className="z-10 flex flex-col items-center">
        {/* Tagline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-4 inline-block rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm"
        >
          {tagline}
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground"
        >
          {typeof title === "string" ? (
            title.split(" ").map((word, i) => (
              <motion.span
                key={i}
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))
          ) : (
            title
          )}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-xl text-lg text-muted-foreground"
        >
          {description}
        </motion.p>

        {/* Call to Action Button */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.6 }}
        >
          <ActionButton>{ctaText}</ActionButton>
        </motion.div>
      </div>

      {/* Animated Image Marquee */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 md:h-2/5 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
        <motion.div
          className="flex gap-4"
          animate={{
            x: ["-100%", "0%"],
            transition: {
              ease: "linear",
              duration: 40,
              repeat: Infinity,
            },
          }}
        >
          {duplicatedImages.map((src, index) => (
            <div
              key={index}
              className="relative aspect-[3/4] h-48 md:h-64 flex-shrink-0"
              style={{
                rotate: `${index % 2 === 0 ? -2 : 5}deg`,
              }}
            >
              <img
                src={src}
                alt={`Showcase image ${index + 1}`}
                className="w-full h-full object-cover rounded-2xl shadow-md"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// --- Demo ---
const DEMO_IMAGES = [
  "https://cdn.21st.dev/assets/mirror/9c/9c0892e59c262cc1da34c88d977221da3f36aaef35ede7924d66b80c219be979.jpg",
  "https://cdn.21st.dev/assets/mirror/cb/cb5e5ebf2a894b2cd0e47b41b1fc76a3021ca1e2d2164e68aedca123cd33144f.jpg",
  "https://cdn.21st.dev/assets/mirror/98/989f6e3fb1763ee781695ca8471c7b5c34ee8162b73cb966a692df7183434dd6.jpg",
  "https://cdn.21st.dev/assets/mirror/d4/d42e2bf7d2616d0f8b7133f77efbc40bfbd042fbe5dd5e2ae3bb0b0cd5bf0b00.jpg",
  "https://cdn.21st.dev/assets/mirror/34/34ec840fc286ece83ac48705cb38c8b7bfae31022d3869530edad1e1b1305933.jpg",
  "https://cdn.21st.dev/assets/mirror/3a/3ad7469aaf0ee239cd4a79d5cbd089e88ee36def81eff12b76288139985a8bea.jpg",
  "https://cdn.21st.dev/assets/mirror/82/82d335fc097e30d74dc1b664327e735c0c2c01f807575623c72e2379f3bb3ae6.jpg",
  "https://cdn.21st.dev/assets/mirror/d5/d55bd9d62a8a40170fdb1bab434888bb28c9f11cf7d20bd6dcbe3befe8077abe.jpg",
  "https://cdn.21st.dev/assets/mirror/9c/9c0892e59c262cc1da34c88d977221da3f36aaef35ede7924d66b80c219be979.jpg",
  "https://cdn.21st.dev/assets/mirror/cb/cb5e5ebf2a894b2cd0e47b41b1fc76a3021ca1e2d2164e68aedca123cd33144f.jpg",
  "https://cdn.21st.dev/assets/mirror/98/989f6e3fb1763ee781695ca8471c7b5c34ee8162b73cb966a692df7183434dd6.jpg",
  "https://cdn.21st.dev/assets/mirror/d4/d42e2bf7d2616d0f8b7133f77efbc40bfbd042fbe5dd5e2ae3bb0b0cd5bf0b00.jpg",
  "https://cdn.21st.dev/assets/mirror/34/34ec840fc286ece83ac48705cb38c8b7bfae31022d3869530edad1e1b1305933.jpg",
  "https://cdn.21st.dev/assets/mirror/3a/3ad7469aaf0ee239cd4a79d5cbd089e88ee36def81eff12b76288139985a8bea.jpg",
  "https://cdn.21st.dev/assets/mirror/82/82d335fc097e30d74dc1b664327e735c0c2c01f807575623c72e2379f3bb3ae6.jpg",
  "https://cdn.21st.dev/assets/mirror/d5/d55bd9d62a8a40170fdb1bab434888bb28c9f11cf7d20bd6dcbe3befe8077abe.jpg",
];

const AnimatedHeroDemo = () => {
  return (
    <AnimatedMarqueeHero
      tagline="Join over 100,000 happy creators"
      title={
        <>
          Engage Audiences
          <br />
          with Stunning Videos
        </>
      }
      description="Boost Your Brand with High-Impact Short Videos from our expert content creators. Our team is ready to propel your business forward."
      ctaText="Get Started"
      images={DEMO_IMAGES}
    />
  );
};

export default AnimatedHeroDemo;