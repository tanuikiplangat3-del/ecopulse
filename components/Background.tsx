// Brand canvas: black with a green edge glow and a warped grid, behind everything.
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-wt-black">
      {/* Green edge glow */}
      <div
        className="absolute -left-48 -top-48 h-[70vh] w-[70vh] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(10,168,101,0.35), transparent)" }}
      />
      <div
        className="absolute -right-40 top-1/2 h-[55vh] w-[55vh] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(10,168,101,0.12), transparent)" }}
      />
      {/* Warped grid */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: "radial-gradient(120% 90% at 20% 10%, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 20% 10%, black, transparent 80%)",
        }}
      >
        <div style={{ perspective: "800px" }} className="h-full w-full">
          <svg className="h-full w-full" style={{ transform: "rotateX(6deg)" }}>
            <defs>
              <pattern id="wt-grid" width="64" height="64" patternUnits="userSpaceOnUse">
                <path d="M64 0 L0 0 0 64" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wt-grid)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
