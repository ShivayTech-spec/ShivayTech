"use client";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

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

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div
                  className="p-10 rounded-3xl border shadow-lg shadow-primary/10 max-w-xs w-full"
                  key={i}
                >
                  <div>{text}</div>
                  <div className="flex items-center gap-2 mt-5">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="flex flex-col">
                      <div className="font-medium tracking-tight leading-5">
                        {name}
                      </div>
                      <div className="leading-5 opacity-60 tracking-tight">
                        {role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

const testimonials: Testimonial[] = [
  {
    text: "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.",
    image: "https://cdn.21st.dev/assets/mirror/7c/7c408d5bb79392ba04b0b8a6294b4eee47a16ec377d3dae0c3108e918864bfad.jpg",
    name: "Briana Patton",
    role: "Operations Manager",
  },
  {
    text: "Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.",
    image: "https://cdn.21st.dev/assets/mirror/71/716cfb40836039a4e9e34d89320b6398ba7871ea7882e32b7397029586f6dda7.jpg",
    name: "Bilal Ahmed",
    role: "IT Manager",
  },
  {
    text: "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.",
    image: "https://cdn.21st.dev/assets/mirror/7a/7ae9db9990bb424cc1cf68b6af248e7b88e7add27109a6d951eb5b4f881eda98.jpg",
    name: "Saman Malik",
    role: "Customer Support Lead",
  },
  {
    text: "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.",
    image: "https://cdn.21st.dev/assets/mirror/d1/d1db668ef30403e132bab1de4720f1c9159e8ba03dc0f3d65d5bf95f3985b80a.jpg",
    name: "Omar Raza",
    role: "CEO",
  },
  {
    text: "Its robust features and quick support have transformed our workflow, making us significantly more efficient.",
    image: "https://cdn.21st.dev/assets/mirror/9e/9ef716cb49c8a7e58c27a65358d91e806a1d4c8579a128772a5d9d09d62cb113.jpg",
    name: "Zainab Hussain",
    role: "Project Manager",
  },
  {
    text: "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.",
    image: "https://cdn.21st.dev/assets/mirror/7f/7f2f1b6a4c09f5092437fe960232360d1e2dcf7a198c8580f3c5478c7b2d9386.jpg",
    name: "Aliza Khan",
    role: "Business Analyst",
  },
  {
    text: "Our business functions improved with a user-friendly design and positive customer feedback.",
    image: "https://cdn.21st.dev/assets/mirror/f2/f25b1b7a6a351c0f748d81bf4fcaf8c5a2f8ed036563c2693d4c1ca3718d9d5d.jpg",
    name: "Farhan Siddiqui",
    role: "Marketing Director",
  },
  {
    text: "They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.",
    image: "https://cdn.21st.dev/assets/mirror/41/417105f5784df0a25c3486becfe5c967d448e3c98b3c0231ef4ea0c59d27cb4b.jpg",
    name: "Sana Sheikh",
    role: "Sales Manager",
  },
  {
    text: "Using this ERP, our online presence and conversions significantly improved, boosting business performance.",
    image: "https://cdn.21st.dev/assets/mirror/62/6252a3b6790cbb48919cb8ea756a4e1ce829f3271a141731226871b3c3df9d6d.jpg",
    name: "Hassan Ali",
    role: "E-commerce Manager",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const Testimonials = () => {
  return (
    <section className="relative overflow-hidden py-20">
      <SpaceBackdrop />
      <div className="container relative z-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border py-1 px-4 rounded-lg">Testimonials</div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5">
            What our users say
          </h2>
          <p className="text-center mt-5 opacity-75">
            See what our customers have to say about us.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;