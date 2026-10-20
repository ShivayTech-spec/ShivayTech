"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const DEFAULT_LOGO = "/images/nav.png" // emblem + SHIVAYTECH wordmark + "Technology Solutions"

const LINKS = [
  { label: "Home", href: "/", icon: "home" },
  { label: "About", href: "/about", icon: "user" },
  { label: "Our Work", href: "/our-work", icon: "folder" },
  { label: "Offers", href: "/offers", icon: "tag" },
  { label: "Contact Us", href: "/contact", icon: "mail" },
] as const

const CTA = { label: "Get a Quote", href: "/contact" }

type IconName = (typeof LINKS)[number]["icon"]

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
      )
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      )
    case "folder":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      )
    case "tag":
      return (
        <svg {...common}>
          <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      )
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
  }
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b7bff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

export default function Navbar({ logo = DEFAULT_LOGO }: { logo?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href))

  return (
    <>
      <style>{`
        .sn-bar {
          position: fixed; top: 22px; left: 50%; transform: translateX(-50%);
          width: calc(100% - 96px); max-width: 1400px; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 40px; border-radius: 16px;
          
          /* The core neon blue outer border */
          border: 2px solid rgba(0, 110, 255, 0.9);
          
          /* Darker transparent background to let the starry bg show through */
          background: rgba(2, 4, 12, 0.75);
          
          /* Backdrop blur for the glassmorphism effect */
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
          
          /* Multiple box-shadows for outer glow and inner neon reflections */
          box-shadow: 
            0 0 25px rgba(0, 110, 255, 0.5),         /* Outer glow */
            0 0 60px rgba(0, 110, 255, 0.15),        /* Wide ambient glow */
            inset 0 0 30px rgba(0, 110, 255, 0.25),  /* Inner glow near borders */
            inset 0 2px 8px rgba(0, 110, 255, 0.4);  /* Bright inner top edge */
        }
        
        .sn-logo { display: flex; align-items: center; margin-left: 10px; }
        .sn-logo img { height: 52px; width: auto; display: block; object-fit: contain; }
        
        .sn-links { display: flex; align-items: center; gap: 8px; margin-left: 20px; }
        
        .sn-link {
          display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 999px;
          color: #d1e0ff; font-size: 16px; font-weight: 500; text-decoration: none;
          border: 2px solid transparent; transition: all 0.3s ease; white-space: nowrap;
        }
        
        /* Hover: same glowing pill look as the Home button */
        .sn-link:hover { 
          color: #fff; 
          background: rgba(0, 80, 200, 0.2); 
          border-color: rgba(30, 120, 255, 0.95); 
          box-shadow: 
            0 0 6px rgba(30, 120, 255, 0.8),
            0 0 18px rgba(0, 110, 255, 0.6),
            0 0 38px rgba(0, 90, 255, 0.3),
            inset 0 0 14px rgba(0, 120, 255, 0.45);
        }
        .sn-link svg { transition: filter 0.3s ease, color 0.3s ease; }
        .sn-link:hover svg {
          color: #3d9bff;
          filter: drop-shadow(0 0 4px rgba(61, 155, 255, 0.95)) drop-shadow(0 0 10px rgba(0, 110, 255, 0.8));
        }
        
        /* Active state perfectly matches the glowing "Home" button */
        .sn-link.sn-active {
          color: #fff; font-weight: 600; background: rgba(0, 80, 200, 0.2);
          border: 2px solid rgba(0, 140, 255, 0.8);
          box-shadow: 
            0 0 15px rgba(0, 140, 255, 0.5), 
            inset 0 0 15px rgba(0, 140, 255, 0.3);
        }
        
        .sn-cta {
          display: flex; align-items: center; gap: 10px; padding: 14px 32px; border-radius: 999px;
          color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; white-space: nowrap;
          border: 2px solid rgba(0, 140, 255, 0.9); 
          background: transparent;
          box-shadow: 
            0 0 15px rgba(0, 140, 255, 0.4), 
            inset 0 0 15px rgba(0, 140, 255, 0.2);
          transition: all 0.3s ease;
          margin-right: 10px;
        }
        
        .sn-cta:hover { 
          background: rgba(0, 110, 255, 0.2); 
          box-shadow: 
            0 0 25px rgba(0, 160, 255, 0.6), 
            inset 0 0 20px rgba(0, 160, 255, 0.4); 
        }
        
        .sn-burger {
          display: none; align-items: center; justify-content: center; width: 44px; height: 44px;
          border-radius: 12px; cursor: pointer; color: #fff; background: rgba(0, 110, 255, 0.15);
          border: 1px solid rgba(0, 140, 255, 0.5);
        }
        
        .sn-menu {
          position: absolute; top: calc(100% + 15px); left: 0; right: 0; display: flex; flex-direction: column;
          gap: 8px; padding: 20px; border-radius: 16px; 
          border: 2px solid rgba(0, 110, 255, 0.8);
          background: rgba(2, 4, 12, 0.95); 
          box-shadow: 0 0 30px rgba(0, 110, 255, 0.3);
          -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        }
        
        .sn-menu .sn-cta { justify-content: center; margin-top: 10px; margin-right: 0; }
        
        @media (max-width: 1080px) {
          .sn-bar { width: calc(100% - 40px); padding: 10px 20px; top: 15px; }
          .sn-bar > .sn-links, .sn-bar > .sn-cta { display: none; }
          .sn-burger { display: flex; }
          .sn-logo img { height: 40px; }
          .sn-logo { margin-left: 0; }
        }
      `}</style>

      <nav className="sn-bar" aria-label="Main navigation">
        <Link href="/" className="sn-logo" aria-label="ShivayTech home">
          <img src={logo} alt="ShivayTech Technology Solutions" />
        </Link>

        <div className="sn-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`sn-link${isActive(l.href) ? " sn-active" : ""}`}>
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
        </div>

        <Link href={CTA.href} className="sn-cta">
          {CTA.label}
          <Arrow />
        </Link>

        <button
          className="sn-burger"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        {open && (
          <div className="sn-menu">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`sn-link${isActive(l.href) ? " sn-active" : ""}`}
              >
                <Icon name={l.icon} />
                {l.label}
              </Link>
            ))}
            <Link href={CTA.href} onClick={() => setOpen(false)} className="sn-cta">
              {CTA.label}
              <Arrow />
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}