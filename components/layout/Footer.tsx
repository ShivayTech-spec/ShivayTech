'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { Manrope, Allura } from 'next/font/google';
import './Footer.css';

const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const script = Allura({ subsets: ['latin'], weight: '400', display: 'swap' });

/*
  Background image API
  1) Prop:  <Footer backgroundImage="/images/footer-bg.jpg" backgroundOptions={{ overlay: 0.2 }} />
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
  phone?: string;
  location?: string;
  hours?: string;
  onSubscribe?: (email: string) => void;
  onWatchStory?: () => void;
};

type BgState = { url: string; overlay?: number; position?: string; size?: string } | null;

/* ------------------------------ icons ------------------------------ */
const Ico = ({ children, className = 'ico' }: { children: ReactNode; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Arrow = () => (
  <Ico className="arr">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Ico>
);

const exploreLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Our Work', href: '/work' },
  { label: 'Offers', href: '/offers' },
  { label: 'Contact Us', href: '/contact' },
];

const servicesLeft: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'Web Development', href: '/services#web-development', icon: <Ico><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4M10 8l-2 2 2 2M14 8l2 2-2 2" /></Ico> },
  { label: 'Website Redesign', href: '/services#website-redesign', icon: <Ico><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4M9.5 10l2 2 3-3.5" /></Ico> },
  { label: 'Website Maintenance', href: '/services#website-maintenance', icon: <Ico><circle cx="12" cy="12" r="3" /><path d="M12 2.5l1.6 2.6 3-.6.9 2.9 2.9.9-.6 3 2.6 1.6-2.6 1.6.6 3-2.9.9-.9 2.9-3-.6L12 21.5l-1.6-2.6-3 .6-.9-2.9-2.9-.9.6-3L2.5 12l2.6-1.6-.6-3 2.9-.9.9-2.9 3 .6L12 2.5Z" /></Ico> },
  { label: 'SEO', href: '/services#seo', icon: <Ico><path d="M6 20v-7M12 20V6M18 20V10M3 21h18" /></Ico> },
];

const servicesRight: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: 'Google Ads',
    href: '/services#google-ads',
    icon: (
      <svg className="ico" viewBox="0 0 24 24">
        <text x="12" y="19" textAnchor="middle" fontSize="22" fontWeight="700" fill="#2f8bff" fontFamily="Arial, sans-serif">G</text>
      </svg>
    ),
  },
  {
    label: 'Meta Ads',
    href: '/services#meta-ads',
    icon: (
      <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="#2f8bff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12c-1.6-2.8-3.2-5.6-5.4-5.6C4.5 6.4 3 9 3 12s1.5 5.6 3.6 5.6c2.2 0 3.8-2.8 5.4-5.6s3.2-5.6 5.4-5.6c2.1 0 3.6 2.6 3.6 5.6s-1.5 5.6-3.6 5.6c-2.2 0-3.8-2.8-5.4-5.6Z" />
      </svg>
    ),
  },
  { label: 'Digital Marketing', href: '/services#digital-marketing', icon: <Ico><path d="M4 10v4h3l7 4V6L7 10H4Z" /><path d="M17 9a4 4 0 0 1 0 6" /></Ico> },
  { label: 'Consultation', href: '/services#consultation', icon: <Ico><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /></Ico> },
];

const socials: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'LinkedIn', href: '#', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11.5H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.86 2.66 4.86 6.1v5.85h-4v-5.19c0-1.24-.02-2.83-1.73-2.83-1.73 0-2 1.35-2 2.74v5.28h-4V9.75Z" /></svg> },
  { label: 'Instagram', href: '#', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" /></svg> },
  { label: 'GitHub', href: '#', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg> },
  { label: 'Facebook', href: '#', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.87.3-1.6 1.6-1.6h1.5V4.3C16.3 4.26 15.4 4.2 14.4 4.2c-2.4 0-4 1.45-4 4.1v2.2H8v3h2.4V21h3.1Z" /></svg> },
  { label: 'YouTube', href: '#', icon: <svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5.5" width="19" height="13" rx="4" stroke="#fff" strokeWidth={2} /><path d="m10 9 5 3-5 3V9Z" fill="#fff" /></svg> },
];

/* ---------------------------- component ---------------------------- */
const Footer = forwardRef<FooterHandle, FooterProps>(function Footer(
  {
    backgroundImage,
    backgroundOptions,
    logoSrc = '/assets/shivaytech-logo.png',
    email = 'hello.shivaytech@gmail.com',
    phone = '+91 98765 43210',
    location = 'Chandigarh, India',
    hours = 'Mon - Sat: 9:00 AM - 8:00 PM',
    onSubscribe,
    onWatchStory,
  },
  ref,
) {
  const [bg, setBg] = useState<BgState>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [year, setYear] = useState(2026);
  const [mail, setMail] = useState('');
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = mail.trim();
    if (!v) return;
    onSubscribe?.(v);
    setMail('');
  };

  return (
    <footer className={`sf ${sans.className}${bg ? ' has-bg' : ''}`} style={style}>
      <div className="sf-bg-img" />
      <div className="sf-shade" />

      {/* Logo */}
      <div className="sf-brandbar">
        <Link href="/" aria-label="ShivayTech home">
          {logoFailed ? (
            <span className="sf-logo-fallback">SHIVAYTECH</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sf-logo" src={logoSrc} alt="ShivayTech Technology Solutions" onError={() => setLogoFailed(true)} />
          )}
        </Link>
      </div>

      {/* Hero */}
      <div className="sf-hero">
        <div className="sf-pitch">
          <p className="sf-eyebrow">TURNING IDEAS INTO REALITY</p>
          <h2 className="sf-title">
            <span className="l1">Let’s Build</span>
            <span className="l2">What’s Next</span>
          </h2>
          <p className="sf-lead">
            We create high-performance websites and digital marketing solutions that help businesses grow, look professional, and achieve real results.
          </p>
          <div className="sf-actions">
            <Link className="sf-btn" href="/contact">
              Get a Quote
              <Ico className="btn-ico"><path d="M4 12h15M13 6l6 6-6 6" /></Ico>
            </Link>
            <button type="button" className="sf-watch" onClick={onWatchStory}>
              <span className="play">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
              </span>
              <span className="txt">
                Watch
                <br />
                Our Story
              </span>
            </button>
          </div>
        </div>

        <aside className="sf-news" aria-label="Newsletter">
          <p className="sf-news-eyebrow">STAY CONNECTED</p>
          <h3>
            Get Insights That
            <br />
            <span>Grow Your Business</span>
          </h3>
          <p className="sf-news-copy">Tips, offers, and updates on web development, SEO, and digital marketing.</p>
          <form className="sf-form" onSubmit={submit}>
            <input type="email" required placeholder="Enter your email address" value={mail} onChange={(e) => setMail(e.target.value)} aria-label="Email address" />
            <button type="submit" aria-label="Subscribe">
              <Ico className="btn-ico"><path d="M4 12h15M13 6l6 6-6 6" /></Ico>
            </button>
          </form>
          <div className="sf-social">
            {socials.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                {s.icon}
              </a>
            ))}
          </div>
        </aside>
      </div>

      {/* Info panel */}
      <div className="sf-panel">
        <nav className="sf-pcol" aria-label="Explore">
          <h4 className="sf-head">EXPLORE</h4>
          <ul className="sf-list">
            {exploreLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>
                  <span>{l.label}</span>
                  <Arrow />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="sf-pcol" aria-label="Services">
          <h4 className="sf-head">OUR SERVICES</h4>
          <div className="sf-svc">
            {[servicesLeft, servicesRight].map((group, i) => (
              <ul className="sf-list" key={i}>
                {group.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>
                      {l.icon}
                      <span>{l.label}</span>
                      <Arrow />
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </nav>

        <div className="sf-pcol">
          <h4 className="sf-head">CONTACT US</h4>
          <ul className="sf-contact">
            <li>
              <Ico><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 7 8.5-7" /></Ico>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
            <li>
              <Ico><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" /></Ico>
              <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
            </li>
            <li>
              <Ico><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></Ico>
              <span>{location}</span>
            </li>
            <li>
              <Ico><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ico>
              <span>{hours}</span>
            </li>
          </ul>
        </div>

        <div className="sf-pcol sf-tag">
          <p className={`sf-script ${script.className}`}>
            Let’s Create
            <br />
            Something Great
          </p>
          <span className="rule" />
          <p className="sf-tag-sub">IDEAS × WEBSITES × GROWTH</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sf-bottom">
        <p className="sf-copy">© {year} ShivayTech. All rights reserved.</p>
        <p className="sf-mid">TECHNOLOGY × CREATIVITY × REAL RESULTS</p>
        <div className="sf-right">
          <nav className="sf-legal" aria-label="Legal">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
          </nav>
          <button type="button" className="sf-up" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Ico className="up-ico"><path d="M12 20V5M5 12l7-7 7 7" /></Ico>
          </button>
        </div>
      </div>
    </footer>
  );
});

export default Footer;