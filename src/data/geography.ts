// Kawaminato's water (2026-11-24): the bay, the landfills, the Mio-gawa and the canals, in world metres
// (x east, z south: a station's `position.y` is its z). The route map draws it, and the 3D ground beyond
// the stations is to follow it; geography.test.ts keeps it clear of every station plot except where a
// station already has its own sea or canal.
//
// The old coastline runs down Kon'yahama's sea wall (x ≈ 812, the water's edge below it). West of it lie
// the landfills, with the 45 m inlet between the port landfill and the old shore. The Mio-gawa comes down
// the valley south of the Nagisa Line and out between the river-mouth landfill and the port. The canals
// join the stations' own: Tsumugi-bori, Hyōtan-bori, Tōmyō-bori, Minami-bori, the Sakura-gawa and its
// branches. In the south-east the sea comes in as Asanagi-wan, open to the east past the map.

export type Pt = [number, number];

export interface Named { ja: string; en: string }

/** A channel: water along a line of points, `width` metres across. */
export interface Channel extends Named { kind: 'river' | 'canal'; width: number; pts: Pt[] }

/** Land: the mainland (its west and south shore) and the landfills. Everything else is sea. */
export const LAND: { name: Named; pts: Pt[] }[] = [
  {
    name: { ja: '本土', en: 'Mainland' },
    pts: [
      [150, -6000], [12000, -6000], [12000, 3720], [1912, 3720], [1912, 3800], [1816, 3800], [1816, 3400], [1500, 3200],
      [1100, 2600], [900, 1900], [812, 1100], [812, -500],
      // The river mouth's north side is the river-mouth landfill, joined to the old shore (Shiomi, Nishi-Yūnagi, Yūnagihama).
      [812, -612], [-120, -612], [-120, -575], [-400, -575], [-400, -612], [-1280, -612], [-1280, -960],
      [600, -960], [700, -1200], [640, -1500], [420, -2200], [150, -3460],
    ],
  },
  {
    // The port and the bay new town: Minato Center, Umibe-Shiyakusho-mae, Kawaminato-kō, Shinshio.
    name: { ja: '港埋立地', en: 'Port landfill' },
    pts: [[-1430, -492], [767, -492], [767, 52], [-230, 52], [-230, 140], [-530, 140], [-530, 52], [-1430, 52]],
  },
  {
    name: { ja: '南港埋立地', en: 'South bay landfill' },
    pts: [[-520, 1120], [690, 1120], [690, 1452], [-120, 1452], [-120, 1505], [-400, 1505], [-400, 1452], [-520, 1452]],
  },
  { name: { ja: '新鴎島', en: 'Shin-Kamome island' }, pts: [[-1250, 1130], [-690, 1130], [-690, 1452], [-1250, 1452]] },
];

/** Water inside the land: docks, basins and the inner bay. */
export const BASINS: { name: Named; pts: Pt[] }[] = [
  { name: { ja: '新汐船溜', en: 'Shinshio dock' }, pts: [[-500, -348], [-200, -348], [-200, -160], [-500, -160]] },
  {
    // Uminomori and Shirasunahama on its north shore (their sea begins 52 m south of them), Asanagi between on a point.
    name: { ja: '朝凪湾', en: 'Asanagi-wan' },
    pts: [[4560, 2207], [5620, 2207], [5620, 2255], [5906, 2255], [5906, 2207], [11900, 2207], [11900, 2850], [5300, 2850], [5250, 2700], [4560, 2700]],
  },
];

export const CHANNELS: Channel[] = [
  {
    ja: '澪川', en: 'Mio-gawa', kind: 'river', width: 80,
    pts: [[7800, -3050], [6700, -2900], [6520, -2400], [5733, -1301], [5098, -1005], [4464, -709], [3829, -413], [3100, -420], [2300, -445], [1870, -462], [1650, -470], [1100, -528], [780, -552]],
  },
  { ja: '紬堀', en: 'Tsumugi-bori', kind: 'canal', width: 14, pts: [[1962, -440], [1962, 712]] },
  { ja: '瓢箪堀', en: 'Hyōtan-bori', kind: 'canal', width: 14, pts: [[790, 692], [1250, 692], [1300, 712], [2832, 712]] },
  { ja: '灯明堀', en: 'Tōmyō-bori', kind: 'canal', width: 14, pts: [[2832, 712], [3085, 594], [4291, 31]] },
  { ja: '桜川', en: 'Sakura-gawa', kind: 'canal', width: 14, pts: [[4291, 31], [4291, 2404], [4600, 2450]] },
  { ja: '蛍川', en: 'Hotaru-gawa', kind: 'canal', width: 14, pts: [[6000, 720], [5600, 940], [4291, 940]] },
  { ja: '南堀', en: 'Minami-bori', kind: 'canal', width: 14, pts: [[960, 2210], [2700, 2210], [2700, 3740]] },
  { ja: '南桜堀', en: 'Minami-Sakura-bori', kind: 'canal', width: 14, pts: [[4291, 2404], [3994, 2543], [2700, 3148]] },
];

/** Water levels: the sea and the docks, and the river and canals behind their gates (the stations' own canals lie at −2.8). */
export const SEA_Y = -1.2, CHANNEL_Y = -2.8;

/** Shores that are a beach, not a wall: no embankment is built along them (Kon'yahama draws its own). */
export const BEACHES: Pt[][] = [[[805, -335], [836, -335], [836, 235], [805, 235]]];

/**
 * Views kept open (2026-11-24): no backdrop building stands in them, and a riverside walk runs along any
 * channel inside one. The AR line's Mio-gawa bridge seen from the banks and from the train; the corridor
 * from Kon'yahama's platforms north to the bridge; Yanagi-suji's line south from Kawaminato Station to the river.
 */
export const VISTAS: { name: Named; pts: Pt[] }[] = [
  { name: { ja: '澪川橋梁 両岸', en: 'Mio-gawa Bridge banks' }, pts: [[715, -632], [1055, -612], [1055, -452], [715, -472]] },
  { name: { ja: '紺屋浜から橋梁へ', en: "Kon'yahama to the bridge" }, pts: [[825, -500], [945, -500], [945, -290], [825, -290]] },
  { name: { ja: '柳筋 川への眺め', en: 'Yanagi-suji to the river' }, pts: [[1840, -520], [1900, -520], [1900, -150], [1840, -150]] },
];

export function inPoly(pts: Pt[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polyline. */
export function distToLine(pts: Pt[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

/** Open sea or a dock (not a channel cut through the land). */
export function isSea(x: number, z: number): boolean {
  return BASINS.some((b) => inPoly(b.pts, x, z)) || !LAND.some((l) => inPoly(l.pts, x, z));
}

/** Is this world point water? */
export function isWater(x: number, z: number): boolean {
  if (CHANNELS.some((c) => distToLine(c.pts, x, z) < c.width / 2)) return true;
  if (BASINS.some((b) => inPoly(b.pts, x, z))) return true;
  return !LAND.some((l) => inPoly(l.pts, x, z));
}
