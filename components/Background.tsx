// Brand canvas: black with a green warped grid and edge glow, behind everything.
// Mirrors the welcometomorrow.io hero - the grid is brightest across the top
// (behind the header) with green glows at the left/right edges, then fades to
// black so page content stays readable.
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-wt-black">
      {/* Warped perspective grid across the top, fading down */}
      <div
        className="absolute inset-x-0 top-0 h-[85vh]"
        style={{
          maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
        }}
      >
        <div style={{ perspective: "900px" }} className="h-full w-full">
          <svg className="h-full w-full" style={{ transform: "rotateX(10deg) scale(1.1)" }}>
            <defs>
              <pattern id="wt-grid" width="58" height="58" patternUnits="userSpaceOnUse">
                <path d="M58 0 L0 0 0 58" fill="none" stroke="rgba(120,190,140,0.16)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wt-grid)" />
          </svg>
        </div>
      </div>

      {/* Green edge glows (left, right, top) like the hero */}
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
