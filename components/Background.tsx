// Brand canvas, rebuilt from the Welcome Tomorrow Figma
// (WT-Website Client-facing, node 1544:3599) rather than from guesswork.
//
// What the design actually does at the top of a page:
//   1. a black page,
//   2. a 715px-tall vertical gradient from brand yellow #FFD952 down to black
//      at 80% opacity  (Figma node 1544:3602, "Rectangle 212", 1440x741 at
//      y=-26),
//   3. the warped wiremesh drawn over it (node 1544:3603, "Group 878").
//
// This band SCROLLS AWAY with the page, exactly as it does in the design - it
// is anchored to the top of the document, not fixed to the viewport. A fixed
// gradient would follow the reader down a long marketplace listing and sit
// under the footer, which the design never does.
//
// The mesh is DRAWN by the browser rather than downloaded: a square grid
// pushed out of shape by an SVG turbulence filter, about 700 bytes of markup.
// No image request, sharp on every screen, nothing to load on a slow
// connection. A bitmap of the same texture came to 97 KB and was locked to one
// resolution.
//
// Tuning notes, so this is not guesswork if it ever needs adjusting:
//   baseFrequency  lower = broader, lazier waves. 0.0011 matches the brand film.
//   numOctaves     1 keeps the curves smooth; 2+ adds high-frequency wobble that
//                  visibly breaks thin strokes into dashes.
//   scale          how far the grid is pushed. ~190 gives the brand's swirl.
//   pattern width  52px squares at 1x.

/** Height of the hero band, from the Figma: 741px tall starting at y=-26. */
const BAND_H = 715;

export function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden"
      style={{ height: BAND_H }}
    >
      {/* Yellow-to-black gradient. Figma: linear 180deg #FFD952 -> #000000,
          layer opacity 80%. */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #FFD952 0%, #000000 100%)",
          opacity: 0.8,
        }}
      />

      {/* Warped wiremesh over the gradient, fading out before the band ends so
          the page content below starts on clean black. */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 95%)",
        }}
      >
        <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="wt-mesh" width="52" height="52" patternUnits="userSpaceOnUse">
              <path d="M52 0H0V52" fill="none" stroke="#000000" strokeWidth="1.6" />
            </pattern>
            <filter
              id="wt-warp"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.0011"
                numOctaves={1}
                seed={12}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={190}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
          {/* Oversized so the displacement never drags an edge into view. */}
          <g filter="url(#wt-warp)" opacity="0.28">
            <rect x="-400" y="-400" width="3000" height="2400" fill="url(#wt-mesh)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
