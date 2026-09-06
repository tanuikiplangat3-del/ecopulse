// Brand canvas, rebuilt from the Welcome Tomorrow Figma
// (WT-Website Client-facing, node 1544:3599).
//
// What the design does at the top of a page:
//   1. a black page,
//   2. a 715px-tall vertical gradient from brand yellow #FFD952 down to black
//      at 80% opacity  (Figma node 1544:3602, "Rectangle 212", 1440x741 at
//      y=-26),
//   3. the wiremesh drawn over it in black (node 1544:3603, "Group 878").
//
// This band SCROLLS AWAY with the page, exactly as in the design - it is
// anchored to the top of the document, not fixed to the viewport. A fixed
// gradient would follow the reader down a long marketplace listing and sit
// under the footer, which the design never does.
//
// ---------------------------------------------------------------------------
// The mesh
// ---------------------------------------------------------------------------
// Earlier versions of this file drew a square tile pattern and pushed it about
// with an SVG turbulence filter. That approach cannot produce this texture, and
// no amount of tuning got it there: a displaced tile stays a regular grid with
// wobble in it, whereas the brand mesh is a surface that flows unevenly in both
// directions at once.
//
// So the grid is now GENERATED. Every intersection is placed by warp() below,
// which offsets it in BOTH x and y using four sine waves whose frequencies do
// not divide into one another. Because they never line up, the pattern never
// visibly repeats - that is what gives the uneven, organic flow - while each
// individual wave stays perfectly smooth.
//
// The sampled points are then written out as cubic Beziers rather than as a
// chain of short straight lines. A polyline of the same shape needs ~65 KB of
// path data and still shows faceting where the segments meet; the Bezier
// version is ~27 KB and is smooth at any zoom, because it is actually curved
// rather than finely chopped.
//
// It is deterministic - no randomness, no seeded RNG - so the mesh is byte for
// byte identical on every render and every machine. It is computed once when
// this module loads, not per request.
//
// Tuning, if it ever needs adjusting:
//   AMPLITUDE  how far each point is pushed. Higher = more movement.
//   FREQUENCY  how many bends fit across the frame. Higher = busier.
//   CELL       spacing of the grid lines before warping.
//   PHASE      slides the whole pattern along; changes which bends land where.

/** Height of the hero band, from the Figma: 741px tall starting at y=-26. */
const BAND_H = 715;

/** The mesh is drawn in this coordinate space and then scaled to fit. 1440 is
 *  the Figma artboard width, so cell sizes match the design at desktop. */
const VIEW_W = 1440;
const VIEW_H = BAND_H;

const CELL = 55;
const AMPLITUDE = 34;
const FREQUENCY = 1.5;
const PHASE = 0.7;
/** Points sampled per line before the curve is fitted. 22 is plenty once the
 *  path is Beziers - raising it makes the file bigger without looking better. */
const SAMPLES = 22;

/** Where the grid intersection at (u, v) actually lands. u and v run 0..1. */
function warp(u: number, v: number): [number, number] {
  const a = Math.sin(u * 6.28 * 1.1 * FREQUENCY + v * 2.3 + PHASE);
  const b = Math.sin(v * 6.28 * 0.85 * FREQUENCY - u * 3.1 + PHASE * 1.7);
  const c = Math.sin((u + v) * 6.28 * 0.62 * FREQUENCY + PHASE * 2.3);
  const d = Math.sin((u - v) * 6.28 * 0.97 * FREQUENCY - PHASE * 1.1);
  return [
    u * VIEW_W + AMPLITUDE * (b * 0.55 + c * 0.3 + d * 0.15),
    v * VIEW_H + AMPLITUDE * (a * 0.55 + c * 0.28 + d * 0.17),
  ];
}

/** Catmull-Rom through the points, emitted as cubic Beziers. */
function curveThrough(points: [number, number][]): string {
  const r = (n: number) => n.toFixed(1);
  let d = `M${r(points[0][0])} ${r(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || points[i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

/** Built once at module load. */
const MESH_PATHS: string[] = (() => {
  const cols = Math.round(VIEW_W / CELL);
  const rows = Math.round(VIEW_H / CELL);
  const out: string[] = [];
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const pts: [number, number][] = [];
    for (let i = 0; i <= SAMPLES; i++) pts.push(warp(i / SAMPLES, v));
    out.push(curveThrough(pts));
  }
  for (let col = 0; col <= cols; col++) {
    const u = col / cols;
    const pts: [number, number][] = [];
    for (let i = 0; i <= SAMPLES; i++) pts.push(warp(u, i / SAMPLES));
    out.push(curveThrough(pts));
  }
  return out;
})();

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

      {/* Mesh over the gradient, fading out before the band ends so page
          content below starts on clean black. */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 96%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 96%)",
        }}
      >
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <g fill="none" stroke="#000000" strokeWidth="1.1" opacity="0.3">
            {MESH_PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
