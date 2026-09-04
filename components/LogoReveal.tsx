"use client";

import { useEffect, useState } from "react";

/**
 * The Welcome Tomorrow lockup, revealed once.
 *
 * Deliberate choices, so this is not re-litigated later:
 *
 * - ONCE PER VISITOR. The reveal is remembered in localStorage. From the second
 *   visit the logo is simply there, finished, with no animation at all. A logo
 *   that performs on every page load stops being charming by the third click.
 * - ~1.6 SECONDS, not the 8 of the brand film. Eight seconds is right for a
 *   title sequence and wrong for a website, where it reads as a wait.
 * - THE OFFICIAL FILE, animated as one piece. The logo is not redrawn here -
 *   it is the same SVG the footer uses, so it can never drift from the brand.
 *   Animating the leaves sprouting individually would need the SVG's internal
 *   paths; if the source file is ever added to the project, that becomes easy.
 * - TRANSFORMS AND OPACITY ONLY, which the phone's GPU handles. No layout
 *   shift, no JavaScript animation loop, nothing to jank on a cheap Android.
 * - RESPECTS "REDUCE MOTION". Anyone with that setting on sees the finished
 *   logo immediately.
 */

const LOGO = "https://welcometomorrow.io/wp-content/uploads/2025/07/WT-logo-white.svg";
const SEEN_KEY = "wt-logo-revealed";

export default function LogoReveal({ className = "" }: { className?: string }) {
  // Start "already seen" so the server-rendered markup and the first client
  // paint agree; the effect below turns the animation on only when it is due.
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode or blocked storage: treat as seen rather than replaying
      // the animation on every single page view.
      seen = true;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!seen && !reduced) {
      setAnimate(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* nothing to do - it just plays again next time */
      }
    }
  }, []);

  return (
    <div className={`wt-reveal ${animate ? "is-animating" : ""} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="Welcome Tomorrow" className="wt-reveal-mark" />

      <style jsx>{`
        .wt-reveal {
          display: inline-block;
          line-height: 0;
        }
        .wt-reveal-mark {
          height: 3.25rem;
          width: auto;
        }
        @media (min-width: 768px) {
          .wt-reveal-mark {
            height: 4.5rem;
          }
        }

        /* Nothing below runs unless the reveal is actually due. */
        .wt-reveal.is-animating .wt-reveal-mark {
          animation: wt-rise 1100ms cubic-bezier(0.16, 0.84, 0.3, 1) both;
          /* The wipe travels left to right as the mark settles. */
          -webkit-mask-image: linear-gradient(
            100deg,
            #000 40%,
            rgba(0, 0, 0, 0.25) 55%,
            transparent 70%
          );
          mask-image: linear-gradient(
            100deg,
            #000 40%,
            rgba(0, 0, 0, 0.25) 55%,
            transparent 70%
          );
          -webkit-mask-size: 320% 100%;
          mask-size: 320% 100%;
          animation-name: wt-rise, wt-wipe;
          animation-duration: 1100ms, 1500ms;
          animation-delay: 0ms, 120ms;
          animation-timing-function: cubic-bezier(0.16, 0.84, 0.3, 1), ease-out;
          animation-fill-mode: both, forwards;
        }

        @keyframes wt-rise {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes wt-wipe {
          from {
            -webkit-mask-position: 130% 0;
            mask-position: 130% 0;
          }
          to {
            -webkit-mask-position: -60% 0;
            mask-position: -60% 0;
          }
        }

        /* Belt and braces - the effect already checks this, but a stylesheet
           rule also covers anyone whose setting changes mid-session. */
        @media (prefers-reduced-motion: reduce) {
          .wt-reveal.is-animating .wt-reveal-mark {
            animation: none;
            -webkit-mask-image: none;
            mask-image: none;
          }
        }
      `}</style>
    </div>
  );
}
