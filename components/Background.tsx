// Brand canvas: black, the Welcome Tomorrow warped wiremesh, and green edge
// glows, behind everything.
//
// The mesh is DRAWN by the browser rather than downloaded. It is a square grid
// pushed out of shape by an SVG turbulence filter, which reproduces the warped
// grid from the Welcome Tomorrow brand animation in about 700 bytes of markup -
// no image request, sharp on every screen from a cheap Android to a 4K monitor,
// and nothing to load on a slow connection. A bitmap of the same texture came
// to 97 KB and was locked to one resolution.
//
// Tuning notes, so this is not guesswork if it ever needs adjusting:
//   baseFrequency  lower = broader, lazier waves. 0.0011 matches the brand film.
//   numOctaves     1 keeps the curves smooth; 2+ adds high-frequency wobble that
//                  visibly breaks thin strokes into dashes.
//   scale          how far the grid is pushed. ~190 gives the brand's swirl.
//   pattern width  52px squares at 1x.
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-wt-black">
      {/* Warped wiremesh, brightest at the top and fading down so page content
          stays readable over it. */}
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
              <path d="M52 0H0V52" fill="none" stroke="#ffffff" strokeWidth="1.6" />
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
          <g filter="url(#wt-warp)" opacity="0.22">
            <rect x="-400" y="-400" width="3000" height="2400" fill="url(#wt-mesh)" />
          </g>
        </svg>
      </div>

      {/* Green edge glows (left, right, centre) like the main site hero */}
      <div
        className="absolute -left-40 -top-24 h-[65vh] w-[45vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(10,168,101,0.30), transparent)" }}
      />
      <div
        className="absolute -right-40 -top-24 h-[65vh] w-[45vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(10,168,101,0.22), transparent)" }}
      />
      <div
        className="absolute left-1/2 top-[55vh] h-[40vh] w-[70vw] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(10,168,101,0.08), transparent)" }}
      />
    </div>
  );
}
