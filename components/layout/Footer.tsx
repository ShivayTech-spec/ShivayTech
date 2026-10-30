'use client';

import {
  forwardRef,
  memo,
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
import { Manrope, Allura, Space_Grotesk } from 'next/font/google';

const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const head = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap' });
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

const CSS = `.sk-edge{filter:drop-shadow(0 0 5px rgba(47,139,255,.9))}
.sk-moon{filter:drop-shadow(0 0 8px rgba(190,220,255,.8))}
.sk-win{animation:skWin 5s ease-in-out infinite}
@keyframes skWin{0%,100%{opacity:.3}50%{opacity:1}}
.sk-blink{animation:skBlink 1.6s steps(1) infinite}
@keyframes skBlink{0%,60%{opacity:1}61%,100%{opacity:.1}}
.sk-star{animation:skTw 3s ease-in-out infinite}
@keyframes skTw{0%,100%{opacity:.2}50%{opacity:1}}
.sk-spin{transform-box:fill-box;transform-origin:center;animation:skSpinI 1.6s linear infinite}
.sk-ring{transform-origin:720px 112px;animation:skSpinI 46s linear infinite}
.sk-drive{animation:skDrive 16s ease-in-out infinite alternate}
@keyframes skDrive{from{translate:-40px 0}to{translate:40px 0}}
.sk-float{animation:skFl 6s ease-in-out infinite}
@keyframes skFl{0%,100%{translate:0 0}50%{translate:0 -8px}}
.sk-ufo{animation:skUfo 44s linear 4s infinite}
@keyframes skUfo{from{translate:-140px 0}to{translate:1580px 0}}
.sk-steam{transform-box:fill-box;transform-origin:center;animation:skSteam 4.5s ease-out infinite}
@keyframes skSteam{0%{translate:0 0;scale:.5;opacity:0}15%{opacity:.5}100%{translate:-6px -46px;scale:2.2;opacity:0}}
.sk-wave{transform-box:fill-box;transform-origin:left center;animation:skWaveF 1.6s ease-in-out infinite alternate}
@keyframes skWaveF{from{transform:skewY(-5deg) scaleX(1)}to{transform:skewY(5deg) scaleX(.93)}}
.sk-arm{transform-box:fill-box;transform-origin:50% 100%;animation:skArm 1s ease-in-out infinite alternate}
@keyframes skArm{from{rotate:-25deg}to{rotate:25deg}}
.sk-glow{animation:skGlowC 3s ease-in-out infinite}
@keyframes skGlowC{0%,100%{filter:drop-shadow(0 0 2px rgba(56,214,255,.4))}50%{filter:drop-shadow(0 0 9px rgba(56,214,255,1))}}
.sk-neon{animation:skNeon 4s infinite}
@keyframes skNeon{0%,18%,22%,60%,100%{opacity:1}20%,62%{opacity:.25}}


@property --sx-a{syntax:'<angle>';inherits:false;initial-value:0deg}
:where(.sx) a{color:inherit;text-decoration:none}
:where(.sx) ul{list-style:none;margin:0;padding:0}
:where(.sx) :is(h2,h3,h4,p){margin:0}
.sx{--blue:#2f8bff;--cyan:#6cc6ff;--line:rgba(120,170,255,.22);position:relative;isolation:isolate;overflow:hidden;color:#e8f1ff;background:#02040c;line-height:1.5;-webkit-font-smoothing:antialiased}
.sx *,.sx *::before,.sx *::after{box-sizing:border-box}
.sx .ico{width:20px;height:20px;flex:none}
.sx .arr{width:18px;height:18px;flex:none}
.sx-bgimg{position:absolute;inset:0;z-index:0;background-image:var(--sf-bg-image,none);background-position:var(--sf-bg-position,center);background-size:var(--sf-bg-size,cover);background-repeat:no-repeat;opacity:0;transition:opacity .8s}
.sx.has-bg .sx-bgimg{opacity:1}
.sx-shade{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,rgba(2,4,12,.5),rgba(2,4,12,.25) 35%,rgba(2,4,12,.72)),rgba(2,4,12,var(--sf-overlay,0))}
.sx-sky{position:relative;z-index:2;height:clamp(170px,19vw,330px);pointer-events:none}
.sx-sky svg{display:block;width:100%;height:100%;-webkit-mask-image:linear-gradient(#000 80%,transparent);mask-image:linear-gradient(#000 80%,transparent)}
.sx-l1{translate:calc((var(--sx-p,.5) - .5) * -60px) 0}
.sx-l2{translate:calc((var(--sx-p,.5) - .5) * -26px) 0}
.sx-wrap{position:relative;z-index:2;width:min(1240px,calc(100% - 48px));margin-inline:auto}

/* brand + hero */
.sx-brand{display:flex;padding-top:4px}
.sx-logo{height:48px;width:auto}
.sx-logo-fb{font-weight:800;letter-spacing:.22em;font-size:20px}
.sx-hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.85fr);gap:48px;align-items:center;padding:36px 0 64px}
.sx-eyebrow{display:flex;align-items:center;gap:14px;font-size:12.5px;letter-spacing:.42em;color:var(--cyan);font-weight:600}
.sx-eyebrow i{height:1px;width:72px;background:linear-gradient(90deg,var(--cyan),transparent)}
.sx-title{margin:14px 0 18px!important;font-size:clamp(46px,7.2vw,108px);line-height:.98;font-weight:700;letter-spacing:-.03em}
.sx-title .ln{display:block;padding-bottom:.06em}
.sx-title .l1{background:linear-gradient(180deg,#fff,#b9c7e6 55%,#7f8fb4);-webkit-background-clip:text;background-clip:text;color:transparent}
.sx-title .l2{background:linear-gradient(100deg,#5aa8ff 0%,#a8dbff 25%,#2f8bff 50%,#a8dbff 75%,#5aa8ff 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sxShine 6s linear infinite}
.sx-lead{max-width:540px;color:#a9c0e6;font-size:17px}
.sx-actions{display:flex;flex-wrap:wrap;align-items:center;gap:24px;margin-top:30px}
.sx-cta{display:inline-flex;align-items:center;gap:12px;padding:16px 30px;border-radius:999px;border:1.5px solid var(--blue);background:rgba(47,139,255,.12);font-weight:600;font-size:16px;color:#fff;box-shadow:0 0 22px rgba(47,139,255,.45),inset 0 0 14px rgba(47,139,255,.2);transition:background .25s,box-shadow .25s,transform .25s}
.sx-cta:hover{background:rgba(47,139,255,.34);box-shadow:0 0 36px rgba(47,139,255,.8),inset 0 0 18px rgba(47,139,255,.35);transform:translateY(-2px)}
.sx-cta .arr{transition:translate .25s}
.sx-cta:hover .arr{translate:6px 0}
.sx-watch{display:inline-flex;align-items:center;gap:14px;background:none;border:0;color:#fff;font:inherit;cursor:pointer;padding:0}
.sx-watch .play{width:56px;height:56px;border-radius:50%;border:1.5px solid var(--blue);display:grid;place-items:center;position:relative;box-shadow:0 0 16px rgba(47,139,255,.4);transition:background .25s}
.sx-watch .play svg{width:18px;height:18px;margin-left:3px}
.sx-watch .play::after{content:"";position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--cyan);animation:sxRipple 2s ease-out infinite}
.sx-watch:hover .play{background:rgba(47,139,255,.3)}
.sx-watch .txt{line-height:1.25;text-align:left;font-weight:500}

/* newsletter card */
.sx-news{position:relative;border-radius:24px;padding:30px;background:rgba(6,14,34,.62);backdrop-filter:blur(16px);box-shadow:0 0 40px rgba(47,139,255,.15)}
.sx-news::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;background:conic-gradient(from var(--sx-a),rgba(47,139,255,.18),#8fd0ff,rgba(47,139,255,.18) 38%,rgba(47,139,255,.18));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:sxBorder 6s linear infinite}
.sx-news-eyebrow{font-size:12px;letter-spacing:.34em;color:var(--blue);font-weight:700}
.sx-news h3{margin:10px 0 10px;font-size:clamp(24px,2.4vw,32px);line-height:1.15;font-weight:700}
.sx-news h3 span{color:var(--cyan)}
.sx-news-copy{color:#a9c0e6;font-size:15px}
.sx-form{display:flex;margin:20px 0 22px;border-radius:14px;overflow:hidden;border:1px solid rgba(120,170,255,.35);background:rgba(10,22,52,.8);transition:border-color .2s,box-shadow .2s}
.sx-form:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px rgba(47,139,255,.25)}
.sx-form input{flex:1;min-width:0;padding:15px 18px;background:transparent;border:0;outline:0;color:#fff;font:inherit;font-size:15px}
.sx-form button{width:64px;border:0;background:linear-gradient(135deg,#2f8bff,#1b5cff);color:#fff;cursor:pointer;display:grid;place-items:center;transition:filter .2s}
.sx-form button:hover{filter:brightness(1.2)}
.sx-form button .arr{width:22px;height:22px;animation:sxNudge 1.2s ease-in-out infinite}
.sx-social{display:flex;flex-wrap:wrap;gap:12px}
.sx-social a{width:48px;height:48px;border-radius:50%;border:1.5px solid rgba(47,139,255,.8);display:grid;place-items:center;background:rgba(47,139,255,.08);box-shadow:0 0 14px rgba(47,139,255,.35);transition:background .2s,box-shadow .2s,scale .2s}
.sx-social a:hover{background:rgba(47,139,255,.35);box-shadow:0 0 24px rgba(47,139,255,.8);scale:1.1}
.sx-social .soc{display:grid}
.sx-social svg{width:20px;height:20px}

/* mission ticker */
.sx-ticker{position:relative;z-index:2;overflow:hidden;border-block:1px solid var(--line);background:rgba(4,10,26,.55);backdrop-filter:blur(6px);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.sx-track{display:flex;width:max-content;animation:sxMarq 46s linear infinite}
.sx-ticker:hover .sx-track{animation-play-state:paused}
.sx-tkg{display:flex}
.sx-tk{display:flex;align-items:center;gap:28px;padding:16px 14px 16px 0;margin-right:14px;font-weight:600;letter-spacing:.16em;font-size:14px;color:#cfe3ff;white-space:nowrap;text-transform:uppercase}
.sx-tk svg{width:15px;height:15px;color:var(--cyan);animation:sxTwinkle 2.4s ease-in-out infinite}

/* link panel */
.sx-panel{display:grid;grid-template-columns:1fr 1.9fr 1.25fr 1.25fr;margin-top:48px;border:1px solid var(--line);border-radius:26px;background:rgba(5,12,30,.6);backdrop-filter:blur(14px);box-shadow:0 0 40px rgba(47,139,255,.12),inset 0 0 30px rgba(47,139,255,.05)}
.sx-col{position:relative;padding:30px 30px 26px;min-width:0}
.sx-col+.sx-col::before{content:"";position:absolute;left:0;top:26px;bottom:26px;width:1px;background:linear-gradient(transparent,var(--line),transparent)}
.sx-head{display:flex;align-items:center;gap:10px;margin-bottom:16px!important;font-size:12.5px;letter-spacing:.34em;color:#dbe8ff;font-weight:700}
.sx-head svg{width:18px;height:18px;color:var(--cyan)}
.sx-link{position:relative;display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(120,170,255,.14);color:#e8f1ff;transition:color .2s,padding-left .25s}
.sx-link::after{content:"";position:absolute;left:0;bottom:-1px;height:1px;width:100%;background:linear-gradient(90deg,var(--cyan),transparent);scale:0 1;transform-origin:left;transition:scale .35s}
.sx-link:hover{color:#fff;padding-left:6px}
.sx-link:hover::after{scale:1 1}
.sx-link .arr{margin-left:auto;color:var(--blue);transition:translate .25s}
.sx-link:hover .arr{translate:5px 0}
.sx-link .sx-star{width:10px;height:10px;color:var(--cyan);display:grid;transition:rotate .5s}
.sx-link .sx-star svg{width:10px;height:10px}
.sx-link:hover .sx-star{rotate:180deg}
.sx-link .sx-ico{display:grid;place-items:center;color:var(--blue)}
.sx-svc{display:grid;grid-template-columns:1fr 1fr;column-gap:34px}
.sx-ct li{display:flex;align-items:center;gap:14px;padding:9px 0}
.sx-ct .sx-ico{width:40px;height:40px;flex:none;border-radius:50%;border:1px solid var(--line);background:rgba(47,139,255,.1);display:grid;place-items:center;color:var(--cyan)}
.sx-ct a,.sx-ct span.t{overflow-wrap:anywhere;font-size:15px}
.sx-ct a:hover{color:#fff;text-decoration:underline}
.sx-tag{display:flex;flex-direction:column;justify-content:center}
.sx-script{font-size:clamp(36px,3.4vw,54px);line-height:1.05;rotate:-5deg;background:linear-gradient(100deg,#6cc6ff,#2f8bff 60%,#a8dbff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(47,139,255,.55));padding:6px 0}
.sx-tag .rule{display:block;width:64px;height:2px;margin:18px 0 12px;background:linear-gradient(90deg,var(--cyan),transparent);transform-origin:left}
.sx-tag-sub{font-size:12px;letter-spacing:.3em;color:#9db6e0}

/* bottom bar */
.sx-bottom{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px 28px;margin-top:34px;padding:24px 0 34px;border-top:1px solid var(--line)}
.sx-copy{color:#a9c0e6;font-size:14px}
.sx-mid{display:flex;align-items:center;gap:16px;font-size:12px;letter-spacing:.26em;color:#9db6e0}
.sx-mid::before,.sx-mid::after{content:"";width:56px;height:1px;background:linear-gradient(90deg,transparent,var(--blue))}
.sx-mid::after{transform:scaleX(-1)}
.sx-right{display:flex;align-items:center;gap:22px}
.sx-legal{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:14px}
.sx-legal a{position:relative;transition:color .2s}
.sx-legal a:hover{color:var(--cyan)}
.sx-up{width:48px;height:48px;flex:none;border-radius:50%;border:1.5px solid var(--blue);background:rgba(47,139,255,.1);display:grid;place-items:center;cursor:pointer;box-shadow:0 0 16px rgba(47,139,255,.4);transition:background .2s,box-shadow .2s}
.sx-up:hover{background:rgba(47,139,255,.3);box-shadow:0 0 26px rgba(47,139,255,.8)}
.sx-rk{width:15px;height:auto;display:block;overflow:visible;transition:translate .25s,opacity .2s}
.sx-up:hover .sx-rk{translate:0 -3px}
.sx-up.is-launching .sx-rk{opacity:0}
.sx-flame{transform-origin:20px 56px;animation:sxFlame .12s ease-in-out infinite alternate}
.sx-fly{position:fixed;z-index:9999;width:30px;pointer-events:none;animation:sxLaunch 1.4s cubic-bezier(.55,0,.85,.45) forwards}
.sx-fly svg{display:block;width:100%;height:auto;overflow:visible}
.sx-fly::after{content:"";position:absolute;left:50%;top:100%;width:10px;height:150px;translate:-50% 0;border-radius:50%;filter:blur(4px);background:linear-gradient(to bottom,rgba(150,200,255,.55),rgba(150,200,255,0))}

/* hover on Get a Quote ignites the rocket on the launch pad */
.sk-fire{opacity:0;transform-box:fill-box;transform-origin:50% 0;transition:opacity .25s}
.sx:has(.sx-cta:hover) .sk-fire{opacity:1;animation:skFlame .1s ease-in-out infinite alternate}
.sx:has(.sx-cta:hover) .sk-rocket{animation:skRumble .09s linear infinite}

/* reveal: each part enters its own way when the footer scrolls in */
.sx.armed:not(.in) .rv{opacity:0}
.sx.in .rv{animation:var(--a,sxUp) .9s var(--d,0s) cubic-bezier(.2,.8,.2,1) both}
.rv-left{--a:sxLeft}.rv-right{--a:sxRight}.rv-up{--a:sxUp}.rv-zoom{--a:sxZoom}.rv-blur{--a:sxBlur}.rv-pop{--a:sxPop}.rv-clip{--a:sxClip}

/* idle loops: one per icon so nothing moves the same way */
.sx.in .i-bounce{animation:sxBounce 2s 2.4s ease-in-out infinite}
.sx.in .i-wob{animation:sxWob 2.7s 2.4s ease-in-out infinite}
.sx.in .i-float{animation:sxFloat 3.1s 2.4s ease-in-out infinite}
.sx.in .i-pulse{animation:sxPulse 2.3s 2.4s ease-in-out infinite}
.sx.in .i-pulse2{animation:sxPulse 3.4s 2.4s ease-in-out infinite}
.sx.in .i-shake{animation:sxShake 3.4s 2.4s ease-in-out infinite}
.sx.in .i-sway{animation:sxSway 2.8s 2.4s ease-in-out infinite}
.sx.in .i-ring{animation:sxRing 3s 2.4s ease-in-out infinite}
.sx.in .i-tick{animation:sxTick 3s 2.4s ease-in-out infinite}
.sx.in .i-spin{animation:sxSpin 7s linear infinite}
.sx.in .i-glow{animation:sxGlow 2.8s 1.8s ease-in-out infinite}

@keyframes sxLeft{from{opacity:0;translate:-44px 0}to{opacity:1;translate:0 0}}
@keyframes sxRight{from{opacity:0;translate:44px 0}to{opacity:1;translate:0 0}}
@keyframes sxUp{from{opacity:0;translate:0 36px}to{opacity:1;translate:0 0}}
@keyframes sxZoom{from{opacity:0;scale:.78}to{opacity:1;scale:1}}
@keyframes sxBlur{from{opacity:0;filter:blur(16px);translate:0 30px}to{opacity:1;filter:blur(0);translate:0 0}}
@keyframes sxPop{0%{opacity:0;scale:.3}60%{opacity:1;scale:1.12}100%{opacity:1;scale:1}}
@keyframes sxClip{from{opacity:1;clip-path:inset(-30px 100% -30px -30px)}to{opacity:1;clip-path:inset(-30px -30px -30px -30px)}}
@keyframes sxBounce{0%,100%{translate:0 0}50%{translate:0 -5px}}
@keyframes sxWob{0%,100%{rotate:-9deg}50%{rotate:9deg}}
@keyframes sxFloat{0%,100%{translate:0 0}50%{translate:3px -4px}}
@keyframes sxPulse{0%,100%{scale:1}50%{scale:1.15}}
@keyframes sxShake{0%,86%,100%{translate:0 0}89%{translate:-2px 0}92%{translate:2px 0}95%{translate:-2px 0}98%{translate:1px 0}}
@keyframes sxSway{0%,100%{translate:-3px 0}50%{translate:3px 0}}
@keyframes sxRing{0%,70%,100%{rotate:0deg}74%{rotate:-14deg}78%{rotate:14deg}82%{rotate:-12deg}86%{rotate:10deg}90%{rotate:0deg}}
@keyframes sxTick{0%,85%,100%{rotate:0deg}92%{rotate:24deg}}
@keyframes sxSpin{to{rotate:360deg}}
@keyframes skSpinI{to{rotate:360deg}}
@keyframes sxGlow{0%,100%{filter:drop-shadow(0 0 0 rgba(47,139,255,0))}50%{filter:drop-shadow(0 0 12px rgba(47,139,255,.8))}}
@keyframes sxNudge{0%,100%{translate:0 0}50%{translate:4px 0}}
@keyframes sxRipple{from{opacity:.9;scale:1}to{opacity:0;scale:1.9}}
@keyframes sxTwinkle{0%,100%{opacity:.4;scale:.8}50%{opacity:1;scale:1.2}}
@keyframes sxShine{to{background-position:-250% 0}}
@keyframes sxBorder{to{--sx-a:360deg}}
@keyframes sxMarq{to{translate:-50% 0}}
@keyframes sxFlame{from{scale:1 .8}to{scale:1 1.25}}
@keyframes sxLaunch{0%{translate:-50% -50%}12%{translate:-50% calc(-50% + 4px)}100%{translate:-50% calc(-50% - var(--dist))}}
@keyframes skFlame{from{scale:1 .8}to{scale:1.1 1.25}}
@keyframes skRumble{0%{transform:translate(0,0)}25%{transform:translate(.6px,-.5px)}50%{transform:translate(-.6px,.4px)}75%{transform:translate(.5px,.5px)}100%{transform:translate(0,0)}}

@media (max-width:1100px){
  .sx-panel{grid-template-columns:1fr 1fr}
  .sx-col+.sx-col::before{display:none}
  .sx-col:nth-child(n+3){border-top:1px solid var(--line)}
}
@media (max-width:980px){.sx-hero{grid-template-columns:1fr;gap:36px;padding-bottom:40px}}
@media (max-width:640px){
  .sx-panel{grid-template-columns:1fr}
  .sx-col:nth-child(n+2){border-top:1px solid var(--line)}
  .sx-svc{grid-template-columns:1fr}
  .sx-bottom{justify-content:center;text-align:center}
  .sx-mid::before,.sx-mid::after{display:none}
  .sx-right{flex-direction:column}
  .sx-news{padding:24px}
}
@media (prefers-reduced-motion:reduce){.sx *,.sx *::before,.sx *::after{animation:none!important;transition:none!important}}
`;

const Rocket = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 84" aria-hidden="true">
    <defs>
      <linearGradient id="sfBd" x1="0" x2="1">
        <stop offset="0" stopColor="#aab4c4" />
        <stop offset=".45" stopColor="#ffffff" />
        <stop offset="1" stopColor="#8d98aa" />
      </linearGradient>
      <linearGradient id="sfFl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".35" stopColor="#7fd0ff" />
        <stop offset="1" stopColor="#2f8bff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g className="sx-flame"><path d="M14 56Q20 86 26 56Z" fill="url(#sfFl)" /></g>
    <path d="M7 44 1 60l9-4ZM33 44l6 16-9-4Z" fill="#2f8bff" />
    <path d="M20 1C29 13 31 30 29.5 56h-19C9 30 11 13 20 1Z" fill="url(#sfBd)" />
    <rect x="12" y="54" width="16" height="4" rx="1.5" fill="#39414f" />
    <circle cx="20" cy="26" r="5.2" fill="#0b1a33" stroke="#6cc6ff" strokeWidth="1.6" />
    <path d="M10.6 46h18.8" stroke="#2f8bff" strokeWidth="2" />
  </svg>
);

/* Twinkling stars, the ST planet's horizon with city lights, and the odd shooting star */
function SpaceBackdrop() {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = host.current!, canvas = cv.current!, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    type Star = { u: number; v: number; r: number; ph: number; sp: number; c: string; big: boolean };
    type Light = { u: number; d: number; ph: number; s: number; c: string };
    let w = 0, h = 0, cx = 0, cy = 0, R = 0;
    let stars: Star[] = [], lights: Light[] = [];
    let raf = 0, last = 0, clock = 0, nextShoot = 3000;
    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    const tints = ['#ffffff', '#ffe6c8', '#bcd6ff'];

    const build = () => {
      const n = Math.min(220, Math.max(60, Math.round((w * h) / 14000)));
      stars = Array.from({ length: n }, () => ({
        u: Math.random(), v: Math.random() * 0.92, r: 0.5 + Math.random() * 0.9,
        ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 2.2, c: tints[Math.floor(Math.random() * 3)], big: Math.random() < 0.1,
      }));
      lights = [];
      for (let k = 0; k < 16; k++) {
        const cu = Math.random(), cd = Math.random(), count = 14 + Math.floor(Math.random() * 30);
        for (let i = 0; i < count; i++) {
          const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.06;
          lights.push({ u: cu + g(), d: Math.min(1, Math.max(0, cd + g() * 2)), ph: Math.random() * 6.28, s: 1 + Math.random() * 2, c: Math.random() < 0.8 ? '255,200,120' : '190,225,255' });
        }
      }
    };

    const resize = () => {
      const r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return;
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) draw(0);
    };

    const limbAt = (x: number) => { const dx = x - cx, d = R * R - dx * dx; return d > 0 ? cy - Math.sqrt(d) : h + 50; };

    const draw = (dt: number) => {
      clock += dt;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / Math.max(r.height, 1)));
      const ah = Math.min(h * 0.2, 190), topY = h - ah + (1 - p) * ah * 0.6;
      R = ((w / 2) ** 2 + ah * ah) / (2 * ah); cx = w / 2; cy = topY + R;
      ctx.clearRect(0, 0, w, h);

      // stars
      for (const s of stars) {
        const x = s.u * w, y = s.v * h;
        if (y > limbAt(x) - 3) continue;
        ctx.globalAlpha = reduce ? 0.7 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(clock * 0.001 * s.sp + s.ph));
        ctx.fillStyle = s.c;
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
        if (s.big) { ctx.fillRect(x - s.r * 5, y - 0.4, s.r * 10, 0.8); ctx.fillRect(x - 0.4, y - s.r * 5, 0.8, s.r * 10); }
      }
      ctx.globalAlpha = 1;

      // shooting star
      if (!reduce) {
        if (!shoot && clock > nextShoot) {
          const a = 0.35 + Math.random() * 0.25, sp = 900;
          shoot = { x: w * (0.2 + Math.random() * 0.7), y: Math.random() * h * 0.3, vx: -Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0 };
        }
        if (shoot) {
          shoot.life += dt / 1000; shoot.x += (shoot.vx * dt) / 1000; shoot.y += (shoot.vy * dt) / 1000;
          const k = Math.sin(Math.min(1, shoot.life / 0.9) * Math.PI);
          const tx = shoot.x - shoot.vx * 0.16, ty = shoot.y - shoot.vy * 0.16;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
          g.addColorStop(0, `rgba(255,255,255,${k})`); g.addColorStop(1, 'rgba(120,190,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tx, ty); ctx.stroke();
          if (shoot.life > 0.9) { shoot = null; nextShoot = clock + 5000 + Math.random() * 6000; }
        }
      }

      // atmosphere glow
      const ag = ctx.createRadialGradient(cx, cy, R - 4, cx, cy, R + 70);
      ag.addColorStop(0, 'rgba(90,170,255,.55)'); ag.addColorStop(0.25, 'rgba(50,120,255,.22)'); ag.addColorStop(1, 'rgba(20,60,200,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R + 70, 0, 6.283); ctx.fill();

      // planet body
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
      const bg = ctx.createLinearGradient(0, topY, 0, h);
      bg.addColorStop(0, '#0c2149'); bg.addColorStop(0.35, '#050f26'); bg.addColorStop(1, '#02050f');
      ctx.fillStyle = bg; ctx.fillRect(0, topY - 4, w, h - topY + 8);
      const sun = ctx.createRadialGradient(cx, topY, 0, cx, topY, Math.max(w, 400) * 0.4);
      sun.addColorStop(0, 'rgba(70,140,255,.35)'); sun.addColorStop(1, 'rgba(70,140,255,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, topY - 4, w, h - topY + 8);

      // city lights
      for (const l of lights) {
        const x = l.u * w;
        if (x < 0 || x > w) continue;
        const lb = limbAt(x), y = lb + 8 + l.d * Math.max(0, h - lb - 8);
        if (y > h) continue;
        const a = reduce ? 0.7 : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock * 0.0015 * l.s + l.ph));
        ctx.fillStyle = `rgba(${l.c},${a})`; ctx.fillRect(x, y, 1.6, 1.6);
      }
      ctx.restore();

      // bright rim
      const rg = ctx.createLinearGradient(0, 0, w, 0);
      rg.addColorStop(0, 'rgba(170,215,255,0)'); rg.addColorStop(0.5, 'rgba(170,215,255,.95)'); rg.addColorStop(1, 'rgba(170,215,255,0)');
      ctx.strokeStyle = rg; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(90,170,255,.9)'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, t - (last || t)); last = t;
      draw(dt);
    };
    const start = () => { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(el);
    if (reduce) window.addEventListener('scroll', () => draw(0), { passive: true });

    return () => { stop(); ro.disconnect(); io.disconnect(); };
  }, []);

  return (
    <div ref={host} aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

const SIL = '#040a1b';
const GROUND_TOP =
  'M0 196C60 188 110 176 170 178C240 180 300 198 380 196C450 194 500 182 570 184C640 186 690 200 760 198C830 196 870 190 930 190C1000 190 1040 200 1110 196C1180 192 1220 178 1290 176C1350 174 1400 186 1440 184';

function Windows({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out: ReactNode[] = [];
  for (let cy = y + 6; cy < y + h - 4; cy += 7)
    for (let cx = x + 4; cx < x + w - 4; cx += 6) {
      const r = rnd();
      if (r < 0.45) continue;
      out.push(
        <rect key={`${cx}-${cy}`} x={cx} y={cy} width={2.4} height={3} fill={r > 0.92 ? '#9fe3ff' : '#ffd27a'} className="sk-win" style={{ animationDelay: `${(r * 9).toFixed(2)}s` }} />,
      );
    }
  return <>{out}</>;
}

function Crystals({ x, y }: { x: number; y: number }) {
  return (
    <g className="sk-glow" fill="#06202f" stroke="#38d6ff" strokeWidth="1" strokeLinejoin="round">
      <path d={`M${x} ${y}L${x + 8} ${y - 40}L${x + 16} ${y}Z`} />
      <path d={`M${x + 12} ${y}L${x + 24} ${y - 58}L${x + 36} ${y}Z`} />
      <path d={`M${x + 30} ${y}L${x + 38} ${y - 32}L${x + 46} ${y}Z`} />
    </g>
  );
}

function Bulb({ x, y, d }: { x: number; y: number; d: number }) {
  return (
    <g className="sk-glow" style={{ animationDelay: `${d}s` }}>
      <rect x={x - 1} y={y - 32} width="2" height="32" fill={SIL} />
      <circle cx={x} cy={y - 37} r="8" fill="#07262f" stroke="#38ffd0" strokeWidth="1.2" />
      <circle cx={x} cy={y - 37} r="2.6" fill="#38ffd0" />
    </g>
  );
}

function Rover({ x, y, dur, delay }: { x: number; y: number; dur: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="sk-drive" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
        <rect x="0" y="6" width="40" height="9" rx="3" fill={SIL} stroke="#2f8bff" strokeOpacity=".5" />
        <path d="M8 6L12 -3H27L31 6Z" fill={SIL} stroke="#2f8bff" strokeOpacity=".5" />
        <path d="M13 4.5L15 -1H25L27 4.5Z" fill="#7fd6ff" opacity=".65" />
        <rect x="33" y="-9" width="1.6" height="15" fill={SIL} />
        <path d="M28 -11q6-5 12 0Z" fill={SIL} stroke="#2f8bff" strokeOpacity=".5" />
        <circle cx="34" cy="-12" r="1.4" fill="#ffd27a" className="sk-blink" />
        {[7, 20, 33].map((cx) => (
          <g key={cx} className="sk-spin">
            <circle cx={cx} cy="18" r="5.5" fill="#06101f" stroke="#5b86d6" strokeWidth="1.2" />
            <path d={`M${cx - 5} 18H${cx + 5}M${cx} 13V23`} stroke="#5b86d6" strokeWidth="1" />
          </g>
        ))}
      </g>
    </g>
  );
}

const city: [number, number, number][] = [[236, 120, 22], [262, 96, 18], [284, 130, 26], [314, 84, 16], [334, 112, 24], [362, 138, 20]];
const farCity: [number, number, number][] = [[196, 138, 24], [228, 150, 20], [392, 128, 22], [420, 146, 26], [452, 136, 18], [1000, 136, 24], [1030, 124, 20], [1060, 150, 26], [1142, 128, 22], [1170, 146, 24], [1198, 132, 18], [1340, 140, 22], [1372, 126, 20]];
const skyStars: [number, number, number][] = [[40, 30, 1], [90, 70, 0.8], [160, 24, 1.2], [210, 60, 0.9], [270, 28, 1], [380, 40, 1.1], [440, 72, 0.8], [500, 26, 1], [640, 36, 1.2], [690, 70, 0.8], [800, 28, 1], [860, 56, 0.9], [960, 30, 1.1], [1020, 70, 0.8], [1190, 34, 1], [1240, 76, 0.9], [1290, 26, 1.2], [1390, 64, 1], [1420, 30, 0.8], [600, 96, 0.8]];

/* A little space colony along the top edge: dome base, city, launch pad, spinning station wheel, rovers, alien plants, flag + astronaut */
const Skyline = memo(function Skyline() {
  return (
    <div style={{ height: '100%' }} aria-hidden="true">
      <svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="skGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a1a40" />
            <stop offset=".45" stopColor="#050d24" />
            <stop offset="1" stopColor="#030712" />
          </linearGradient>
          <linearGradient id="skDome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123a82" stopOpacity=".85" />
            <stop offset="1" stopColor="#061433" />
          </linearGradient>
          <radialGradient id="skPlanet" cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor="#7fb2ff" />
            <stop offset=".6" stopColor="#2a5fd0" />
            <stop offset="1" stopColor="#0a1c52" />
          </radialGradient>
          <linearGradient id="skFire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".4" stopColor="#7fd6ff" />
            <stop offset="1" stopColor="#2f8bff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="skGlow">
            <stop offset="0" stopColor="#2f8bff" stopOpacity=".42" />
            <stop offset=".6" stopColor="#1f5fe0" stopOpacity=".12" />
            <stop offset="1" stopColor="#1f5fe0" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="720" cy="238" rx="780" ry="170" fill="url(#skGlow)" />
        {skyStars.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" className="sk-star" style={{ animationDelay: `${((i * 0.37) % 3).toFixed(2)}s` }} />
        ))}

        <g className="sx-l1">
        {/* sky: crescent moon, ringed planet, UFO, satellite */}
        <path className="sk-moon" d="M1330 38a20 20 0 1 0 0 40a15 18 0 1 1 0-40Z" fill="#dbeaff" />
        <g className="sk-float" style={{ animationDuration: '9s' }}>
          <g transform="rotate(-18 560 58)">
            <path d="M516 58A44 10 0 0 1 604 58" fill="none" stroke="rgba(160,205,255,.6)" strokeWidth="2.2" />
            <circle cx="560" cy="58" r="22" fill="url(#skPlanet)" />
            <path d="M516 58A44 10 0 0 0 604 58" fill="none" stroke="rgba(190,225,255,.9)" strokeWidth="2.2" />
          </g>
        </g>
        <g className="sk-ufo">
          <g transform="translate(0 96)">
            <path d="M-14 6L-30 40H30L14 6Z" fill="rgba(120,210,255,.12)" className="sk-blink" />
            <ellipse cx="0" cy="-3" rx="9" ry="7" fill="rgba(120,200,255,.5)" />
            <ellipse cx="0" cy="3" rx="19" ry="5.5" fill="#0a1a3f" stroke="#6cc6ff" strokeWidth="1.2" />
            {[-11, 0, 11].map((dx, i) => (
              <circle key={dx} cx={dx} cy="4" r="1.5" fill="#ffd27a" className="sk-win" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '1.4s' }} />
            ))}
          </g>
        </g>
        <g transform="translate(1110 62)">
          <g className="sk-float" style={{ animationDuration: '7s' }}>
            <rect x="-36" y="-4" width="24" height="8" fill="#10296a" stroke="#4f86e8" strokeWidth=".8" />
            <rect x="12" y="-4" width="24" height="8" fill="#10296a" stroke="#4f86e8" strokeWidth=".8" />
            <path d="M-30 -4V4M-24 -4V4M-18 -4V4M18 -4V4M24 -4V4M30 -4V4" stroke="#4f86e8" strokeWidth=".6" />
            <rect x="-12" y="-7" width="24" height="14" rx="4" fill="#0c1c44" stroke="#8fc3ff" strokeWidth="1" />
            <circle cx="0" cy="0" r="3" fill="#6cc6ff" className="sk-glow" />
            <path d="M0 -7V-16" stroke="#8fc3ff" strokeWidth="1" />
            <circle cx="0" cy="-17" r="1.8" fill="#ff5a5a" className="sk-blink" />
          </g>
        </g>

        {/* distant city */}
        <g fill="#0b1d45" opacity=".75">
          {farCity.map(([x, y, w]) => (
            <rect key={x} x={x} y={y} width={w} height={215 - y} />
          ))}
        </g>

        </g>
        <g className="sx-l2">
        {/* dome base with neon sign */}
        <rect x="168" y="176" width="72" height="8" fill={SIL} />
        <path d="M70 186V172A50 50 0 0 1 170 172V186Z" fill="url(#skDome)" stroke="rgba(130,200,255,.55)" strokeWidth="1.2" />
        <path d="M82 172A38 38 0 0 1 158 172" fill="none" stroke="rgba(130,200,255,.25)" />
        <path d="M120 122V172M95 130L100 172M145 130L140 172" stroke="rgba(130,200,255,.3)" />
        <Windows x={84} y={144} w={72} h={26} seed={5} />
        <text x="120" y="112" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="2.5" fill="#6cc6ff" className="sk-neon" fontFamily="Manrope, Arial, sans-serif">
          SHIVAYTECH BASE
        </text>

        {/* city */}
        <g fill={SIL}>
          {city.map(([x, y, w]) => (
            <rect key={x} x={x} y={y} width={w} height={215 - y} />
          ))}
          <path d="M314 84L322 50L330 84Z" />
          <rect x="321" y="38" width="2" height="14" />
          <rect x="270" y="80" width="1.6" height="16" />
        </g>
        {city.map(([x, y, w], i) => (
          <Windows key={x} x={x} y={y} w={w} h={Math.min(70, 194 - y)} seed={11 + i * 7} />
        ))}
        <circle cx="322" cy="37" r="2.6" fill="#ff4d4d" className="sk-blink" />
        <circle cx="271" cy="79" r="2" fill="#38d6ff" className="sk-blink" style={{ animationDelay: '.6s' }} />

        {/* launch tower + rocket + steam */}
        <g fill="none" stroke="#0a1840" strokeWidth="1.6">
          <rect x="900" y="64" width="12" height="150" />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M900 ${70 + i * 14}L912 ${84 + i * 14}M912 ${70 + i * 14}L900 ${84 + i * 14}`} />
          ))}
          <path d="M912 112H930" strokeWidth="3" />
        </g>
        <circle cx="906" cy="61" r="2.6" fill="#ff4d4d" className="sk-blink" />
        <path d="M896 206L1004 206L992 184L908 184Z" fill={SIL} stroke="#2f8bff" strokeOpacity=".4" />
        {/* spinning station wheel */}
        <path d="M711 215L720 112L729 215Z" fill={SIL} />
        <g className="sk-ring">
          <circle cx="720" cy="112" r="52" fill="none" stroke={SIL} strokeWidth="5" />
          <circle cx="720" cy="112" r="52" fill="none" stroke="rgba(120,190,255,.4)" strokeWidth=".8" />
          <path d="M720 60V164M668 112H772M683 75L757 149M757 75L683 149" stroke={SIL} strokeWidth="2" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            const cx = Number((720 + 52 * Math.cos(a)).toFixed(2)), cy = Number((112 + 52 * Math.sin(a)).toFixed(2));
            return (
              <g key={i}>
                <rect x={cx - 5} y={cy - 4} width="10" height="8" rx="2" fill={SIL} stroke="#4f86e8" strokeWidth=".8" />
                <rect x={cx - 2} y={cy - 1.5} width="4" height="3" fill="#ffd27a" className="sk-win" style={{ animationDelay: `${(i * 0.6).toFixed(1)}s` }} />
              </g>
            );
          })}
        </g>
        <circle cx="720" cy="112" r="8" fill={SIL} stroke="#6cc6ff" strokeWidth="1.2" />
        <circle cx="720" cy="112" r="3" fill="#6cc6ff" className="sk-glow" />

        </g>
        {/* lunar ground */}
        <path d={`${GROUND_TOP}V240H0Z`} fill="url(#skGround)" />
        <path d={GROUND_TOP} fill="none" stroke="#3d8bff" strokeWidth="1.6" className="sk-edge" />
        <g fill="none" stroke="rgba(47,139,255,.25)">
          <ellipse cx="300" cy="214" rx="26" ry="4" />
          <ellipse cx="640" cy="218" rx="34" ry="5" />
          <ellipse cx="1000" cy="216" rx="24" ry="4" />
          <ellipse cx="1180" cy="212" rx="20" ry="3.5" />
        </g>

        <g className="sk-rocket">
          <g className="sk-fire">
            <path d="M938 190Q945 238 952 190Z" fill="url(#skFire)" />
            <path d="M941 190Q945 220 949 190Z" fill="#fff" opacity=".9" />
          </g>
        <path d="M945 58C956 76 959 100 958 192H932C931 100 934 76 945 58Z" fill="#07122b" stroke="rgba(130,200,255,.6)" strokeWidth="1.2" />
        <path d="M933 160L919 194L933 188ZM957 160L971 194L957 188Z" fill="#07122b" stroke="rgba(130,200,255,.5)" strokeWidth="1" />
        <circle cx="945" cy="98" r="4.5" fill="#7fd6ff" className="sk-glow" />
        <path d="M932 128H958M932 150H958" stroke="rgba(130,200,255,.35)" />
        </g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={936 + i * 3} cy="186" r="6" fill="#9fb8e8" className="sk-steam" style={{ animationDelay: `${i * 1.5}s` }} />
        ))}

        {/* on the ground: rovers, crystals, alien plants */}
        <Rover x={590} y={162} dur={16} delay={0} />
        <Rover x={1310} y={152} dur={20} delay={3} />
        <Crystals x={474} y={190} />
        <Crystals x={1362} y={182} />
        <Bulb x={415} y={196} d={0} />
        <Bulb x={430} y={197} d={1.1} />
        <Bulb x={1050} y={199} d={0.5} />
        <Bulb x={1070} y={199} d={1.7} />

        {/* flag + astronaut (the same flag-planting story as the ST planet CTA) */}
        <g transform="translate(1240 177)">
          <rect x="0" y="-64" width="1.8" height="64" fill="#a9bcdf" />
          <circle cx=".9" cy="-65" r="2" fill="#e3b04b" />
          <g className="sk-wave">
            <path d="M1.8 -62h32v20h-32z" fill="#1b5cff" />
            <text x="17.8" y="-47.5" fontSize="9" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="Arial, sans-serif">ST</text>
          </g>
          <g transform="translate(-26 0)">
            <rect x="-5" y="-12" width="4" height="12" rx="1.5" fill="#e8eef9" />
            <rect x="1" y="-12" width="4" height="12" rx="1.5" fill="#e8eef9" />
            <rect x="-6.5" y="-26" width="13" height="15" rx="4" fill="#f1f5fc" />
            <circle cx="0" cy="-31" r="6" fill="#f1f5fc" />
            <rect x="-3.8" y="-33.5" width="7.6" height="5" rx="2.5" fill="#1a2f66" />
            <rect className="sk-arm" x="6" y="-25" width="3.4" height="11" rx="1.7" fill="#f1f5fc" />
          </g>
        </g>
      </svg>
    </div>
  );
});

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
const dl = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 1l2.4 8.6L23 12l-8.6 2.4L12 23l-2.4-8.6L1 12l8.6-2.4Z" />
  </svg>
);

const idleLeft = ['i-wob', 'i-pulse', 'i-spin', 'i-bounce'];
const idleRight = ['i-float', 'i-sway', 'i-shake', 'i-pulse2'];
const idleContact = ['i-float', 'i-ring', 'i-bounce', 'i-tick'];
const idleSocial = ['i-bounce', 'i-wob', 'i-float', 'i-pulse', 'i-shake'];
const tickerItems = [...servicesLeft, ...servicesRight].map((s) => s.label);

const Footer = forwardRef<FooterHandle, FooterProps>(function Footer(
  {
    backgroundImage,
    backgroundOptions,
    logoSrc = '/images/nav.png',
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
  const [sent, setSent] = useState(false);
  const [launch, setLaunch] = useState<{ x: number; y: number } | null>(null);
  const [armed, setArmed] = useState(false);
  const [seen, setSeen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const launchTimer = useRef<number | undefined>(undefined);
  const sentTimer = useRef<number | undefined>(undefined);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => setYear(new Date().getFullYear()), []);
  useEffect(() => () => { window.clearTimeout(launchTimer.current); window.clearTimeout(sentTimer.current); }, []);

  // reveal when the footer scrolls into view
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true);
      return;
    }
    setArmed(true);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // parallax for the skyline layers
  useEffect(() => {
    const el = rootRef.current, sky = skyRef.current;
    if (!el || !sky || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const upd = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      sky.style.setProperty('--sx-p', Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))).toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(upd); };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    upd();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);

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
    setSent(true);
    window.clearTimeout(sentTimer.current);
    sentTimer.current = window.setTimeout(() => setSent(false), 3000);
  };

  const toTop = () => {
    const r = upRef.current?.getBoundingClientRect();
    if (r && !launch) {
      setLaunch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      launchTimer.current = window.setTimeout(() => setLaunch(null), 1500);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const contact = [
    { icon: <Ico><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 7 8.5-7" /></Ico>, node: <a href={`mailto:${email}`}>{email}</a> },
    { icon: <Ico><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" /></Ico>, node: <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a> },
    { icon: <Ico><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></Ico>, node: <span className="t">{location}</span> },
    { icon: <Ico><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ico>, node: <span className="t">{hours}</span> },
  ];

  return (
    <footer ref={rootRef} className={`sx ${sans.className}${bg ? ' has-bg' : ''}${armed ? ' armed' : ''}${seen ? ' in' : ''}`} style={style}>
      <style>{CSS}</style>
      <div className="sx-bgimg" />
      <div className="sx-shade" />
      <SpaceBackdrop />

      {/* illustrated space colony along the top edge */}
      <div className="sx-sky" ref={skyRef}>
        <Skyline />
      </div>

      <div className="sx-wrap">
        <div className="sx-brand rv rv-zoom">
          <Link href="/" aria-label="ShivayTech home">
            {logoFailed ? (
              <span className={`sx-logo-fb ${head.className}`}>SHIVAYTECH</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="sx-logo" src={logoSrc} alt="ShivayTech Technology Solutions" onError={() => setLogoFailed(true)} />
            )}
          </Link>
        </div>

        <div className="sx-hero">
          <div>
            <p className={`sx-eyebrow ${head.className} rv rv-left`} style={dl(0.15)}>
              TURNING IDEAS INTO REALITY<i />
            </p>
            <h2 className={`sx-title ${head.className}`}>
              <span className="ln rv rv-blur" style={dl(0.25)}><span className="l1">Let’s Build</span></span>
              <span className="ln rv rv-zoom" style={dl(0.45)}><span className="l2">What’s Next</span></span>
            </h2>
            <p className="sx-lead rv rv-up" style={dl(0.65)}>
              We create high-performance websites and digital marketing solutions that help businesses grow, look professional, and achieve real results.
            </p>
            <div className="sx-actions">
              <span className="rv rv-pop" style={dl(0.8)}>
                <Link className="sx-cta i-glow" href="/contact">
                  Get a Quote
                  <Arrow />
                </Link>
              </span>
              <span className="rv rv-right" style={dl(0.95)}>
                <button type="button" className="sx-watch" onClick={onWatchStory}>
                  <span className="play">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
                  </span>
                  <span className="txt">Watch<br />Our Story</span>
                </button>
              </span>
            </div>
          </div>

          <aside className="sx-news rv rv-right" style={dl(0.4)} aria-label="Newsletter">
            <p className={`sx-news-eyebrow ${head.className} rv rv-left`} style={dl(0.8)}>STAY CONNECTED</p>
            <h3 className={`${head.className} rv rv-clip`} style={dl(0.95)}>
              Get Insights That <span>Grow Your Business</span>
            </h3>
            <p className="sx-news-copy rv rv-up" style={dl(1.2)}>Tips, offers, and updates on web development, SEO, and digital marketing.</p>
            <form className="sx-form rv rv-clip" style={dl(1.3)} onSubmit={submit}>
              <input type="email" required placeholder="Enter your email address" value={mail} onChange={(e) => setMail(e.target.value)} aria-label="Email address" />
              <button type="submit" aria-label={sent ? 'Subscribed' : 'Subscribe'}>
                {sent ? <Ico className="arr"><path d="m5 12.5 4.5 4.5L19 7.5" /></Ico> : <Arrow />}
              </button>
            </form>
            <div className="sx-social">
              {socials.map((s, i) => (
                <span key={s.label} className="rv rv-pop" style={dl(1.5 + i * 0.1)}>
                  <a href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                    <span className={`soc ${idleSocial[i]}`}>{s.icon}</span>
                  </a>
                </span>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* mission ticker */}
      <div className="sx-ticker rv rv-clip" style={dl(0.3)} aria-hidden="true">
        <div className="sx-track">
          {[0, 1].map((k) => (
            <div className="sx-tkg" key={k}>
              {tickerItems.map((t) => (
                <span className={`sx-tk ${head.className}`} key={`${k}-${t}`}>
                  {t}
                  <Star />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="sx-wrap">
        <div className="sx-panel">
          <nav className="sx-col" aria-label="Explore">
            <h4 className={`sx-head ${head.className} rv rv-clip`} style={dl(0.4)}>
              <Ico><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></Ico>EXPLORE
            </h4>
            <ul>
              {exploreLinks.map((l, i) => (
                <li key={l.label} className="rv rv-left" style={dl(0.55 + i * 0.09)}>
                  <Link className="sx-link" href={l.href}>
                    <span className="sx-star"><Star /></span>
                    <span>{l.label}</span>
                    <Arrow />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="sx-col" aria-label="Services">
            <h4 className={`sx-head ${head.className} rv rv-clip`} style={dl(0.5)}>
              <Ico><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></Ico>OUR SERVICES
            </h4>
            <div className="sx-svc">
              {[servicesLeft, servicesRight].map((group, gi) => (
                <ul key={gi}>
                  {group.map((l, i) => (
                    <li key={l.label} className={`rv ${gi ? 'rv-right' : 'rv-up'}`} style={dl(0.65 + i * 0.09 + gi * 0.05)}>
                      <Link className="sx-link" href={l.href}>
                        <span className={`sx-ico ${(gi ? idleRight : idleLeft)[i]}`}>{l.icon}</span>
                        <span>{l.label}</span>
                        <Arrow />
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </nav>

          <div className="sx-col">
            <h4 className={`sx-head ${head.className} rv rv-clip`} style={dl(0.6)}>
              <Ico><path d="M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0" /><circle cx="12" cy="12" r="1.2" /><path d="M12 14v7" /></Ico>CONTACT US
            </h4>
            <ul className="sx-ct">
              {contact.map((c, i) => (
                <li key={i} className="rv rv-zoom" style={dl(0.75 + i * 0.1)}>
                  <span className={`sx-ico ${idleContact[i]}`}>{c.icon}</span>
                  {c.node}
                </li>
              ))}
            </ul>
          </div>

          <div className="sx-col sx-tag">
            <p className={`sx-script ${script.className} rv rv-clip`} style={dl(0.9)}>
              Let’s Create
              <br />
              Something Great
            </p>
            <span className="rule rv rv-zoom" style={dl(1.9)} />
            <p className={`sx-tag-sub ${head.className} rv rv-up`} style={dl(2)}>IDEAS × WEBSITES × GROWTH</p>
          </div>
        </div>

        <div className="sx-bottom">
          <p className="sx-copy rv rv-left" style={dl(1.1)}>© {year} ShivayTech. All rights reserved.</p>
          <p className={`sx-mid ${head.className} rv rv-up`} style={dl(1.25)}>TECHNOLOGY × CREATIVITY × REAL RESULTS</p>
          <div className="sx-right">
            <nav className="sx-legal" aria-label="Legal">
              <Link className="rv rv-up" style={dl(1.4)} href="/privacy-policy">Privacy Policy</Link>
              <Link className="rv rv-up" style={dl(1.5)} href="/terms-and-conditions">Terms &amp; Conditions</Link>
              <Link className="rv rv-up" style={dl(1.6)} href="/sitemap.xml">Sitemap</Link>
            </nav>
            <span className="rv rv-pop" style={dl(1.7)}>
              <button ref={upRef} type="button" className={`sx-up${launch ? ' is-launching' : ''}`} aria-label="Back to top" onClick={toTop}>
                <Rocket className="sx-rk" />
              </button>
            </span>
          </div>
        </div>
      </div>

      {launch && (
        <span className="sx-fly" aria-hidden="true" style={{ left: launch.x, top: launch.y, '--dist': `${launch.y + 180}px` } as CSSProperties}>
          <Rocket />
        </span>
      )}
    </footer>
  );
});

export default Footer;