"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import ReactLenis from "lenis/react"
import { useRef } from "react"

const projects = [
  {
    title: "Project 1",
    src: "https://cdn.21st.dev/assets/mirror/6e/6ee7e225e62a880a4bb73ba9adcb4995e65b1d9c3e05d4facc9bb99c2f73bd97.jpg",
  },
  {
    title: "Project 2",
    src: "https://cdn.21st.dev/assets/mirror/44/4419aecb9623ba4f4412fc979676f380c9e584cb96b0e89c4705b63c597474df.jpg",
  },
  {
    title: "Project 3",
    src: "https://cdn.21st.dev/assets/mirror/12/12f8c3902d4e6935ce10be85aa1a2dcb21a9acb6e162c363c33f92aa2f3f8d34.jpg",
  },
  {
    title: "Project 4",
    src: "https://cdn.21st.dev/assets/mirror/03/031548ce19b4429a024c3c4725e44e5ba5c355bcae331a46db54b6409a91c918.jpg",
  },
  {
    title: "Project 5",
    src: "https://cdn.21st.dev/assets/mirror/f1/f1944c255c497719164cb3c7f073fcf223a94f83677b04ab76c16dbfb6d9f094.jpg",
  },
]

const StickyCard_001 = ({
  i,
  title,
  src,
  progress,
  range,
  targetScale,
}: {
  i: number
  title: string
  src: string
  progress: any
  range: [number, number]
  targetScale: number
}) => {
  const container = useRef<HTMLDivElement>(null)

  const scale = useTransform(progress, range, [1, targetScale])

  return (
    <div ref={container} className="sticky top-0 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        style={{
          scale,
          top: `calc(-5vh + ${i * 15 + 200}px)`,
        }}
        className="rounded-2xl sm:rounded-3xl lg:rounded-4xl relative -top-1/4 flex origin-top flex-col overflow-hidden
                   h-[200px] w-[280px] 
                   sm:h-[240px] sm:w-[360px] 
                   md:h-[280px] md:w-[420px] 
                   lg:h-[300px] lg:w-[500px]"
      >
        <img src={src || "/placeholder.svg"} alt={title} className="h-full w-full object-cover" />
      </motion.div>
    </div>
  )
}

const ImagesScrollingAnimation = () => {
  const container = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  })

  return (
    <ReactLenis root>
      <main
        ref={container}
        className="relative flex w-full flex-col items-center justify-center 
                                     pb-[50vh] pt-[5vh] 
                                     sm:pb-[60vh] sm:pt-[8vh] 
                                     lg:pb-[70vh] lg:pt-[10vh]"
      >
        {projects.map((project, i) => {
          const targetScale = Math.max(0.6, 1 - (projects.length - i - 1) * 0.08)
          return (
            <StickyCard_001
              key={`p_${i}`}
              i={i}
              {...project}
              progress={scrollYProgress}
              range={[i * 0.2, 1]}
              targetScale={targetScale}
            />
          )
        })}
      </main>
    </ReactLenis>
  )
}

export { ImagesScrollingAnimation, StickyCard_001 }

// --- Demo ---
export default function DemoOne() {
  return <ImagesScrollingAnimation />
}