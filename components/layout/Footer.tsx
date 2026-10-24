'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import './Footer.css';

/*
  Background image API
  1) Prop:  <Footer backgroundImage="/images/footer-bg.jpg" backgroundOptions={{ overlay: 0.5 }} />
  2) Ref:   footerRef.current?.setBackground('/images/footer-bg.jpg')
            footerRef.current?.setBackground(fileFromInput, { position: 'center bottom' })
            footerRef.current?.clearBackground()
*/
export type FooterBgOptions = {
  overlay?: number; // 0–1, extra darkening over the image
  position?: string; // CSS background-position
  size?: string; // CSS background-size
};

export type FooterHandle = {
  setBackground: (src: string | File | null, opts?: FooterBgOptions) => void;
  clearBackground: () => void;
};

type FooterProps = {
  backgroundImage?: string;
  backgroundOptions?: FooterBgOptions;
  logoSrc?: string;
  email?: string;
};

type BgState = { url: string; overlay?: number; position?: string; size?: string } | null;

/* ------------------------------ icons ------------------------------ */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Ico = ({ children }: { children: ReactNode }) => (
  <svg className="ico" viewBox="0 0 24 24" {...stroke}>
    {children}
  </svg>
);

const Chevron = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 5 7 7-7 7" />
  </svg>
);

const exploreLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'Home', href: '/', icon: <Ico><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z" /></Ico> },
  { label: 'About', href: '/about', icon: <Ico><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Ico> },
  { label: 'Our Work', href: '/work', icon: <Ico><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12Z" /></Ico> },
  { label: 'Offers', href: '/offers', icon: <Ico><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.3" /></Ico> },
  { label: 'Contact Us', href: '/contact', icon: <Ico><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 7 8.5-7" /></Ico> },
];

const serviceLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'Web Development', href: '/services#web-development', icon: <Ico><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 5l-4 14" /></Ico> },
  { label: 'Website Redesign', href: '/services#website-redesign', icon: <Ico><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4M8 10l2.5 2.5L16 8" /></Ico> },
  { label: 'Website Maintenance', href: '/services#website-maintenance', icon: <Ico><circle cx="12" cy="12" r="3" /><path d="M12 2.5l1.6 2.6 3-.6.9 2.9 2.9.9-.6 3 2.6 1.6-2.6 1.6.6 3-2.9.9-.9 2.9-3-.6L12 21.5l-1.6-2.6-3 .6-.9-2.9-2.9-.9.6-3L2.5 12l2.6-1.6-.6-3 2.9-.9.9-2.9 3 .6L12 2.5Z" /></Ico> },
  { label: 'SEO', href: '/services#seo', icon: <Ico><path d="M3 21h18M6 21v-6M11 21v-9M16 21v-5M4 12l5-4 4 3 7-6M16 5h4v4" /></Ico> },
  {
    label: 'Google Ads',
    href: '/services#google-ads',
    icon: (
      <svg className="ico" viewBox="0 0 24 24" fill="none">
        <path d="M9.2 3.6a2.2 2.2 0 0 1 3.8 0l7.8 13.5a2.2 2.2 0 1 1-3.8 2.2L9.2 5.8a2.2 2.2 0 0 1 0-2.2Z" fill="#2f8bff" />
        <path d="M2.4 15.8a2.2 2.2 0 1 1 3.8 2.2 2.2 2.2 0 0 1-3.8-2.2Z" fill="#2f8bff" />
        <path d="M9.2 3.6 2.7 14.9l3.8 2.2L13 5.8a2.2 2.2 0 0 0-3.8-2.2Z" fill="#1f6bff" />
      </svg>
    ),
  },
  {
    label: 'Meta Ads',
    href: '/services#meta-ads',
    icon: (
      <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="#2f8bff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12c-1.6-2.8-3.2-5.6-5.4-5.6C4.5 6.4 3 9 3 12s1.5 5.6 3.6 5.6c2.2 0 3.8-2.8 5.4-5.6s3.2-5.6 5.4-5.6c2.1 0 3.6 2.6 3.6 5.6s-1.5 5.6-3.6 5.6c-2.2 0-3.8-2.8-5.4-5.6Z" />
      </svg>
    ),
  },
];

const socials: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'LinkedIn', href: '#', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11.5H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.86 2.66 4.86 6.1v5.85h-4v-5.19c0-1.24-.02-2.83-1.73-2.83-1.73 0-2 1.35-2 2.74v5.28h-4V9.75Z" /></svg> },
  { label: 'Instagram', href: '#', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" /></svg> },
  { label: 'GitHub', href: '#', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg> },
  { label: 'Facebook', href: '#', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.87.3-1.6 1.6-1.6h1.5V4.3C16.3 4.26 15.4 4.2 14.4 4.2c-2.4 0-4 1.45-4 4.1v2.2H8v3h2.4V21h3.1Z" /></svg> },
];

/* ---------------------------- component ---------------------------- */
const Footer = forwardRef<FooterHandle, FooterProps>(function Footer(
  {
    backgroundImage,
    backgroundOptions,
    logoSrc = '/assets/shivaytech-logo.png',
    email = 'hello.shivaytech@gmail.com',
  },
  ref,
) {
  const [bg, setBg] = useState<BgState>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [year, setYear] = useState(2026);
  useEffect(() => setYear(new Date().getFullYear()), []);
  const objectUrl = useRef<string | null>(null);

  const revoke = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  };

  const clearBackground = useCallback(() => {
    setBg(null);
    revoke();
  }, []);

  const setBackground = useCallback(
    (src: string | File | null, opts: FooterBgOptions = {}) => {
      if (!src) return clearBackground();
      let url: string;
      if (typeof src === 'string') {
        url = src;
      } else {
        revoke();
        url = objectUrl.current = URL.createObjectURL(src);
      }
      const probe = new Image();
      probe.onload = () => setBg({ url, ...opts });
      probe.onerror = () => console.warn('[Footer] Background image failed to load:', url);
      probe.src = url;
    },
    [clearBackground],
  );

  useImperativeHandle(ref, () => ({ setBackground, clearBackground }), [setBackground, clearBackground]);

  const { overlay, position, size } = backgroundOptions ?? {};
  useEffect(() => {
    if (backgroundImage) setBackground(backgroundImage, { overlay, position, size });
    else if (backgroundImage === '') clearBackground();
  }, [backgroundImage, overlay, position, size, setBackground, clearBackground]);

  useEffect(() => revoke, []);

  const style = bg
    ? ({
        '--sf-bg-image': `url("${bg.url.replace(/"/g, '%22')}")`,
        ...(bg.position && { '--sf-bg-position': bg.position }),
        ...(bg.size && { '--sf-bg-size': bg.size }),
        ...(bg.overlay !== undefined && { '--sf-overlay': bg.overlay }),
      } as CSSProperties)
    : undefined;

  return (
    <footer className={`sf${bg ? ' has-bg' : ''}`} style={style}>
      <div className="sf-bg-img" />
      <div className="sf-shade" />

      <div className="sf-main">
        {/* Brand */}
        <div className="sf-col">
          {logoFailed ? (
            <div className="sf-logo-fallback">SHIVAYTECH</div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sf-logo" src={logoSrc} alt="ShivayTech Technology Solutions" onError={() => setLogoFailed(true)} />
          )}
          <p className="sf-tagline">Digital experiences. Built to perform.</p>
          <p className="sf-desc">
            We help businesses grow with high-performance websites, smart digital marketing, and reliable ongoing support.
          </p>
          <div className="sf-social">
            {socials.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Explore */}
        <nav className="sf-col" aria-label="Explore">
          <h4 className="sf-head">EXPLORE</h4>
          <ul className="sf-links">
            {exploreLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>
                  {l.icon}
                  <span className="lbl">{l.label}</span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services */}
        <nav className="sf-col sf-services" aria-label="Services">
          <h4 className="sf-head">SERVICES</h4>
          <ul className="sf-links">
            {serviceLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>
                  {l.icon}
                  <span className="lbl">{l.label}</span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA */}
        <div className="sf-col sf-cta">
          <h3>
            Have a <span>project</span>
            <br />
            in mind?
          </h3>
          <span className="bar" />
          <p>Let’s build something that moves your business forward.</p>
          <Link className="sf-btn" href="/contact">
            Get a Quote
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </Link>
          <a className="sf-mail" href={`mailto:${email}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3.5 6.5 8.5 7 8.5-7" />
            </svg>
            {email}
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sf-bottom">
        <p>© {year} ShivayTech. All rights reserved.</p>
        <div className="sf-right">
          <nav className="sf-legal" aria-label="Legal">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/payment-policy">Payment Policy</Link>
          </nav>
          <button type="button" className="sf-up" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
});

export default Footer;