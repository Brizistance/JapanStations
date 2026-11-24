// Kon'yahama's shore (2026-11-24): Hama-dōri runs north–south along the old sea wall west of the AR
// Main Line, and Tsumugi-dōri and Hanada-dōri end at it in T junctions. Kon'yahama's world builds and
// walks it (konyahama-street.ts); Aizomechō's street carries the traffic, which is only taken from
// the street stations (aizomecho-street.ts). Both read the shore from here.
//
// In Aizomechō's frame: +x east, +z south, the origin at Aizomechō's middle (Tsumugi-dōri × Akane-suji).

export const SHORE = {
  /** Hama-dōri: its carriageway's centre line and half width, and the pavement on its east side. */
  c: -231,
  half: 3.25,
  pave: 1.75,
  /** The promenade along the sea wall (west of the carriageway), and the wall's thickness. */
  prom: 3.5,
  wall: 2,
  /** How far out the beach can be walked, and where the water begins. */
  beach: -256,
  water: -258,
  /** The inlet's far quay (2026-11-24): the bay is a 45 m channel here, the 問屋街 shore beyond it. */
  far: -303,
  /** How far north and south the shore is drawn (it is walked only beside the station). */
  z0: -330,
  z1: 230,
};

/** Hama-dōri's kerbs and the sea wall's two faces, in x. */
export const SHORE_X = {
  kerbE: SHORE.c + SHORE.half,
  blockW: SHORE.c + SHORE.half + SHORE.pave,
  kerbW: SHORE.c - SHORE.half,
  wallE: SHORE.c - SHORE.half - SHORE.prom,
  wallW: SHORE.c - SHORE.half - SHORE.prom - SHORE.wall,
};
