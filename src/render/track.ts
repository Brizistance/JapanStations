// Builds the running line between stations: tunnels, the open cut, the viaduct,
// rails and sleepers, tunnel lighting. All swept along the line geometry.

import * as THREE from 'three';
import type { LineSim } from '../sim';
import { stationById } from '../data/network';
import { trainStateAt } from '../sim/timetable';
import { BED } from '../stations/kit';
import { XOVER_FAR, XOVER_NEAR, type LineGeom, type Track } from '../sim/geometry';
import { atOwnPlatform, deckAt, halfWidth, isSiding, modelled, onHostTrack, sampleChainages, structureAt, trackRange, type Deck, type Structure } from '../world/structure';
import { meshesToGeometry } from './geometry';
import { getMaterial } from './materials';
import { stretchesOf, stretchRange } from './stretches';
import type { MeshPart } from '../world/builder';

interface Sample {
  s: number;
  x: number;
  z: number;
  y: number;
  tx: number;
  tz: number;
  /** Lighting at this chainage: daylight (0…1) and how shaded the station-type light is. */
  sky: number;
  shade: number;
}
type Profile = [number, number][]; // (lateral, height above rail)

class Sweep {
  pos: number[] = [];
  uv: number[] = [];
  env: number[] = [];
  quad(a: Sample, b: Sample, p0: [number, number], p1: [number, number], q0: [number, number], q1: [number, number], v0: number, v1: number) {
    const P = (m: Sample, p: [number, number]) => [m.x - m.tz * p[0], m.y + p[1], m.z + m.tx * p[0]];
    const A = P(a, p0), B = P(a, p1), C = P(b, q1), D = P(b, q0);
    this.pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    this.uv.push(a.s, v0, a.s, v1, b.s, v1, a.s, v0, b.s, v1, b.s, v0);
    this.env.push(a.sky, a.shade, a.sky, a.shade, b.sky, b.shade, a.sky, a.shade, b.sky, b.shade, b.sky, b.shade);
  }
  /** Sweep a profile between two samples. The profile may differ at each end (same point count). */
  span(a: Sample, b: Sample, pa: Profile, pb: Profile, closed: boolean) {
    let v = 0;
    const n = pa.length;
    for (let j = 0; j < (closed ? n : n - 1); j++) {
      const k = (j + 1) % n;
      const len = Math.hypot(pa[k][0] - pa[j][0], pa[k][1] - pa[j][1]);
      this.quad(a, b, pa[j], pa[k], pb[j], pb[k], v, v + len);
      v += len;
    }
  }
  /** Flat wall across the track at one sample. */
  cap(m: Sample, z0: number, z1: number, y0: number, y1: number) {
    const P = (lat: number, h: number) => [m.x - m.tz * lat, m.y + h, m.z + m.tx * lat];
    const A = P(z0, y0), B = P(z1, y0), C = P(z1, y1), D = P(z0, y1);
    this.pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    this.uv.push(z0, y0, z1, y0, z1, y1, z0, y0, z1, y1, z0, y1);
    for (let i = 0; i < 6; i++) this.env.push(m.sky, m.shade);
  }
  mesh(mat: string): THREE.Mesh | null {
    if (this.pos.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aEnv', new THREE.Float32BufferAttribute(this.env, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, getMaterial(mat));
    m.matrixAutoUpdate = false;
    m.receiveShadow = true;
    m.castShadow = mat === 'viaduct' || mat === BRICK;
    return m;
  }
}

/** A main line's trackbed: brick arches, and an earth embankment with slopes of BANK_K to 1. */
const BRICK = 'brick:#8a4b3a', BANK = 'grass', BALLAST = 'trackside:#5a554e', BANK_K = 1.25, BANK_SHOULDER = 0.9;
const TUNNEL_H = 4.65;
/** Clear height of an old cut-and-cover box tunnel above the rails. */
const OLD_H = 4.1;
/** Contact wire height above the rail on a line on overhead wire: low enough to pass under the old box tunnel's roof (car roof 3.56 m). */
export const WIRE_H = 3.92;

/**
 * Stretches drawn as an old-era box tunnel with its trackside kit (docs/between-stations.md).
 * So far the whole Yanagisuji Line (1933), and the Nagisa Line's stretch modelled in stretches.ts.
 */
function oldStretch(geom: LineGeom): [number, number] | null {
  if (geom.def.id === 'Y') return [-Infinity, Infinity];
  const st = geom.def.id === 'N' ? stretchesOf(geom)[0] : undefined;
  if (!st) return null;
  const r = stretchRange(geom, st);
  return [r.s0, r.s1];
}

/** A small self-lit plate with a few lines of text (a trackside sign), w × h metres. */
function plate(lines: string[], bg: string, fg: string, w: number, h: number, glow = 0.9): THREE.Mesh {
  if (typeof document === 'undefined') return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: bg })); // tests
  const cv = document.createElement('canvas');
  cv.width = Math.max(64, Math.round(w * 220));
  cv.height = Math.max(64, Math.round(h * 220));
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = Math.min((cv.height / lines.length) * 0.72, (cv.width / Math.max(...lines.map((l) => l.length))) * 1.5);
  ctx.font = `700 ${px}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, cv.width / 2, (cv.height * (i + 0.5)) / lines.length, cv.width * 0.94));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(glow, glow, glow), side: THREE.DoubleSide }));
  m.matrixAutoUpdate = false;
  return m;
}
/** Length of track drawn as one mesh per material. */
const CHUNK = 400;

function profiles(geom: LineGeom, type: Structure, siding: boolean, m: Sample, old = false, deck: Deck = 'concrete'): { p: Profile; closed: boolean }[] {
  const L = geom.def.trackOffset, W = halfWidth(geom);
  if (type === 'viaduct' && deck === 'brick') {
    // Parapets and a solid brick body down to the street (the arches are dressed on afterwards).
    return [{ p: [[-W - 0.5, 1.1], [-W - 0.3, 1.1], [-W - 0.3, -BED], [W + 0.3, -BED], [W + 0.3, 1.1], [W + 0.5, 1.1], [W + 0.5, -m.y], [-W - 0.5, -m.y]], closed: true }];
  }
  if (type === 'viaduct' && deck === 'bank') {
    const foot = W + BANK_SHOULDER + BANK_K * Math.max(0, m.y - BED);
    return [{ p: [[-foot, -m.y + 0.02], [-W - BANK_SHOULDER, -BED], [W + BANK_SHOULDER, -BED], [foot, -m.y + 0.02]], closed: false }];
  }
  if (type === 'tunnel' && old && !siding) {
    // One box round both tracks (the columns between them are added with the kit).
    const d = geom.lateral('down', m.s), u = geom.lateral('up', m.s), lo = Math.min(d, u) - 2.3, hi = Math.max(d, u) + 2.3;
    return [{ p: [[lo, -BED], [hi, -BED], [hi, OLD_H], [lo, OLD_H]], closed: true }];
  }
  const rect = (c: number, w: number, dy = 0): Profile => [[c - w, dy - BED], [c + w, dy - BED], [c + w, dy + TUNNEL_H], [c - w, dy + TUNNEL_H]];
  if (type === 'tunnel') {
    // Twin tubes, each following its own track (they converge and stack at a stacked station).
    if (geom.def.platformType === 'island' && !siding) return (['down', 'up'] as const).map((t) => ({ p: rect(geom.lateral(t, m.s), 2.2, geom.dy(t, m.s)), closed: true }));
    return [{ p: rect(0, W), closed: true }];
  }
  if (type === 'cut') {
    const top = 1.0 - m.y, ground = -m.y;
    return [{ p: [[-W - 0.4, ground], [-W - 0.4, top], [-W, top], [-W, -BED], [W, -BED], [W, top], [W + 0.4, top], [W + 0.4, ground]], closed: false }];
  }
  const bottom = m.y - 1.2 < 0.3 ? -m.y - 0.3 : -1.2;
  return [{
    p: [[-W - 0.5, 1.1], [-W - 0.3, 1.1], [-W - 0.3, -BED], [W + 0.3, -BED], [W + 0.3, 1.1], [W + 0.5, 1.1], [W + 0.5, bottom], [-W - 0.5, bottom]],
    closed: true,
  }];
}

export function buildTrack(sim: LineSim): THREE.Group {
  const { geom } = sim;
  const group = new THREE.Group();
  const old = oldStretch(geom);
  const inOld = (s: number) => !!old && s > old[0] && s < old[1];
  const ss = sampleChainages(geom);
  const samples: Sample[] = ss.map((s) => {
    const p = geom.path.pointAt(s);
    const y = geom.railY(s);
    const type = structureAt(geom, s);
    // Same depth test as structureAt, so an elevated station counts as open air.
    const sky = type === 'tunnel' || (type === 'station' && y < -5.4) ? 0 : 1;
    return { s, x: p.x, z: p.z, y, tx: p.tx, tz: p.tz, sky, shade: type === 'tunnel' ? 0.9 : sky ? 0 : 0.3 };
  });
  // Tunnel lamps every 12 m: each one lifts the shade around it, so the walls show pools of light.
  const lit = new Set<Sample>();
  let lampAt = 0;
  for (const m of samples) {
    if (structureAt(geom, m.s + 2) !== 'tunnel' || m.s < lampAt) continue;
    // An old tunnel's lamps are further apart: pools of light with dark between.
    lampAt = m.s + (old && m.s > old[0] && m.s < old[1] ? 18 : 12);
    lit.add(m);
    // (An old tunnel's bulbs are bare and close to the walls: a brighter pool, and dark between.)
    m.shade = old && m.s > old[0] && m.s < old[1] ? 0.12 : 0.5;
  }
  const L = geom.def.trackOffset, W = halfWidth(geom);
  // Spans where this line runs on another line's track: that line draws them.
  const hosted = samples.slice(0, -1).map((m, i) => onHostTrack(geom, (m.s + samples[i + 1].s) / 2));
  // The line is drawn in chunks of CHUNK m, so the camera's frustum culls what is behind you and
  // far-off track costs nothing. A chunk deep inside a tunnel (it and both its neighbours have no
  // open-air sample) is tagged 'deep': it cannot be seen from the street (WorldView.cull).
  const chunkOf = (m: Sample) => Math.floor(m.s / CHUNK);
  const openChunks = new Set(samples.filter((m) => m.sky > 0).map(chunkOf));
  const sweeps = new Map<string, { sw: Sweep; mat: string; chunk: number }>();
  const sweep = (mat: string, m: Sample): Sweep => {
    const chunk = chunkOf(m), k = `${mat}:${chunk}`;
    let e = sweeps.get(k);
    if (!e) sweeps.set(k, (e = { sw: new Sweep(), mat, chunk }));
    return e.sw;
  };
  const yS = -BED + 0.012, G = 0.7175;
  const piers: MeshPart[] = [];
  const lights: THREE.Matrix4[] = [];
  const warm: THREE.Matrix4[] = [], bulb = new THREE.Vector3(0.2, 0.2, 0.2);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(0.5, 0.14, 0.08), v = new THREE.Vector3();
  let nextPier = 0;
  // Streets under the viaduct on a modelled stretch (stretches.ts): a girder span over each, clear of the round piers.
  const bridges = stretchesOf(geom).flatMap((st) => {
    const r = stretchRange(geom, st);
    return st.roads.map((rd) => ({ s: r.sFrom + r.dir * rd.at, span: rd.half * 2 + 7 }));
  });

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    const mid = (a.s + b.s) / 2;
    const type = structureAt(geom, mid);
    if (type === 'station' || hosted[i] || modelled(geom, mid)) continue;
    const siding = isSiding(geom, mid);
    const isOld = type === 'tunnel' && inOld(mid) && !siding;
    const deck = type === 'viaduct' ? deckAt(geom, mid) : 'concrete';
    const pa = profiles(geom, type, siding, a, isOld, deck), pb = profiles(geom, type, siding, b, isOld, deck);
    const target = sweep(type === 'tunnel' ? 'tunnel' : deck === 'brick' ? BRICK : deck === 'bank' ? BANK : 'viaduct', a);
    pa.forEach((p, k) => target.span(a, b, p.p, pb[k].p, p.closed));

    if (isOld && lit.has(a)) {
      // A warm bulb over each track.
      for (const t of ['down', 'up'] as const) {
        v.set(a.x - a.tz * geom.lateral(t, a.s), a.y + OLD_H - 0.3, a.z + a.tx * geom.lateral(t, a.s));
        warm.push(new THREE.Matrix4().compose(v, q.identity(), bulb));
      }
    } else if (type === 'tunnel' && lit.has(a)) {
      const twin = geom.def.platformType === 'island' && !siding;
      const lats: [number, number][] = twin
        ? [[geom.lateral('down', a.s) - 2.15, geom.dy('down', a.s)], [geom.lateral('up', a.s) + 2.15, geom.dy('up', a.s)]]
        : [[-W + 0.05, 0], [W - 0.05, 0]];
      for (const [lat, dy] of lats) {
        q.setFromAxisAngle(up, Math.atan2(-a.tz, a.tx));
        v.set(a.x - a.tz * lat, a.y + dy + 2.7, a.z + a.tx * lat);
        lights.push(new THREE.Matrix4().compose(v, q, sc));
      }
    }
    if (type === 'viaduct' && deck === 'concrete' && a.y - 1.2 >= 1.5 && a.s >= nextPier && !bridges.some((r) => Math.abs(a.s - r.s) < r.span / 2 + 4)) {
      nextPier = a.s + 24;
      const h = a.y - 1.2;
      piers.push({ mat: 'concrete', shape: 'cyl', pos: [a.x, h / 2, a.z], size: [2.4, h, 2.4] });
    }
  }
  // End caps so the sidings do not open onto the void.
  const [r0, r1] = trackRange(geom);
  for (const end of geom.def.built ? [] : [samples[0], samples[samples.length - 1]]) {
    const type = structureAt(geom, end.s === r0 ? r0 + 1 : r1 - 1);
    if (type === 'tunnel') sweep('tunnel', end).cap(end, -W - 0.5, W + 0.5, -1, TUNNEL_H + 0.5);
    else sweep('viaduct', end).cap(end, -W - 0.5, W + 0.5, -BED, 1.1);
  }

  // Rails and sleepers for both running tracks and the two crossovers.
  const tracks: { track: Track; s0: number; s1: number }[] = [
    { track: 'down', s0: r0, s1: r1 },
    { track: 'up', s0: r0, s1: r1 },
    // (A main line runs on past its end stops: no turnback crossovers.)
    ...(geom.def.beyond ? [] : [
      { track: 'xoverEnd' as Track, s0: geom.lastS + XOVER_NEAR - 4, s1: geom.lastS + XOVER_FAR + 4 },
      { track: 'xoverStart' as Track, s0: geom.firstS - XOVER_FAR - 4, s1: geom.firstS - XOVER_NEAR + 4 },
    ]),
  ];
  for (const t of tracks) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], b = samples[i + 1];
      if (a.s < t.s0 || b.s > t.s1 || hosted[i] || modelled(geom, (a.s + b.s) / 2)) continue;
      const ca = geom.lateral(t.track, a.s), cb = geom.lateral(t.track, b.s);
      const da = geom.dy(t.track, a.s), db = geom.dy(t.track, b.s);
      sweep('sleeper', a).quad(a, b, [ca - 1.25, yS + da], [ca + 1.25, yS + da], [cb - 1.25, yS + db], [cb + 1.25, yS + db], 0, 2.6);
      for (const g of [-G, G]) {
        const ra: Profile = [[ca + g - 0.035, yS + da], [ca + g - 0.035, da], [ca + g + 0.035, da], [ca + g + 0.035, yS + da]];
        const rb: Profile = [[cb + g - 0.035, yS + db], [cb + g - 0.035, db], [cb + g + 0.035, db], [cb + g + 0.035, yS + db]];
        sweep('rail', a).span(a, b, ra, rb, false);
      }
    }
  }

  // ── Helpers for the kit along the line ──
  const index = new Map(samples.map((m, i) => [m, i]));
  const next = (m: Sample) => samples[index.get(m)! + 1];
  const nearest = (s: number) => {
    let lo = 0, hi = samples.length - 1;
    while (hi - lo > 1) {
      const md = (lo + hi) >> 1;
      if (samples[md].s <= s) lo = md;
      else hi = md;
    }
    return s - samples[lo].s < samples[hi].s - s ? samples[lo] : samples[hi];
  };
  /** A sample at any chainage, lit like the nearest real one. */
  const at = (s: number): Sample => {
    const m = nearest(s), p = geom.path.pointAt(s);
    return { ...m, s, x: p.x, z: p.z, y: geom.railY(s), tx: p.tx, tz: p.tz };
  };
  const strip = (mat: string, a: Sample, f: (m: Sample) => Profile, closed = true) => sweep(mat, a).span(a, next(a), f(a), f(next(a)), closed);
  const rect = (l0: number, l1: number, y0: number, y1: number): Profile => [[l0, y0], [l1, y0], [l1, y1], [l0, y1]];
  /** A box `len` long standing at a sample, between two laterals and two heights. */
  const boxAt = (mat: string, m: Sample, len: number, l0: number, l1: number, y0: number, y1: number) => {
    const e: Sample = { ...m, s: m.s + len, x: m.x + m.tx * len, z: m.z + m.tz * len };
    const sw = sweep(mat, m);
    sw.span(m, e, rect(l0, l1, y0, y1), rect(l0, l1, y0, y1), true);
    sw.cap(m, l0, l1, y0, y1);
    sw.cap(e, l0, l1, y0, y1);
  };
  /** Laterals l0 < l1 measured outward on side `sg` (−1 or 1), as a low-to-high pair. */
  const out = (sg: number, l0: number, l1: number): [number, number] => (sg < 0 ? [-l1, -l0] : [l0, l1]);
  /** A self-lit plate standing at chainage s, facing along the line (`face` ±1) or across it (0, towards `inward`). */
  const place = (mesh: THREE.Mesh, s: number, lat: number, y: number, face: 1 | -1 | 0, inward = 1) => {
    const m = at(s);
    const yaw = face === 0 ? Math.atan2(-m.tz * inward, m.tx * inward) + Math.PI / 2 : Math.atan2(-face * m.tx, -face * m.tz);
    mesh.matrix.compose(new THREE.Vector3(m.x - m.tz * lat, m.y + y, m.z + m.tx * lat), new THREE.Quaternion().setFromAxisAngle(up, yaw), new THREE.Vector3(1, 1, 1));
    group.add(mesh);
  };

  // ── The old-era kit on its stretch: power rail, walkway, cables, columns, niches, a crossover, signs, signals ──
  // (Signs, posts and signals carry on into the open air where an old stretch comes out of its tunnel.)
  const signals: { s: number; track: 'down' | 'up'; lens: THREE.Mesh[] }[] = [];
  if (old) {
    const midOf = (i: number) => (samples[i].s + samples[i + 1].s) / 2;
    const span = samples.filter((_, i) => i < samples.length - 1 && !hosted[i] && inOld(midOf(i)) && structureAt(geom, midOf(i)) !== 'station' && !isSiding(geom, midOf(i)));
    // One run between two stations at a time.
    const segs: Sample[][] = [];
    for (const m of span) {
      const last = segs[segs.length - 1];
      if (last && index.get(m) === index.get(last[last.length - 1])! + 1) last.push(m);
      else segs.push([m]);
    }
    const side = (m: Sample) => {
      const d = geom.lateral('down', m.s), u = geom.lateral('up', m.s);
      return { d, u, lo: Math.min(d, u) - 2.3, hi: Math.max(d, u) + 2.3, sd: d < u ? -1 : 1 };
    };
    const tunnelAt = (s: number) => structureAt(geom, s) === 'tunnel';
    const third = (geom.def.power ?? 'third') === 'third';
    const sK = geom.stopS[geom.def.stops.indexOf('kita-odori')], sT = geom.stopS[geom.def.stops.indexOf('tsumugibashi')];
    for (const seg of segs) {
    const t0 = seg[0].s, t1 = next(seg[seg.length - 1]).s;
    if (t1 - t0 < 30) continue;
    // The crossover by Kita-Ōdōri, on the Yanagisuji Line's stretch towards Tsumugibashi: scenery only, no train uses it. The columns stop for its length.
    const hasX = geom.def.id === 'Y' && (t0 + t1) / 2 > Math.min(sK, sT) && (t0 + t1) / 2 < Math.max(sK, sT) && t1 - t0 > 120;
    const x0 = !hasX ? Infinity : sK < sT ? t0 + 14 : t1 - 54, x1 = hasX ? x0 + 40 : -Infinity;
    for (const a of seg) {
      const b = next(a), sa = side(a);
      // Third rail on the outer side of each track, under its cover board, on insulators (a line on overhead wire has none).
      if (third) {
        for (const [t, o] of [['down', sa.sd], ['up', -sa.sd]] as const) {
          const c = (m: Sample) => geom.lateral(t, m.s) + o * 1.18;
          strip('rail', a, (m) => rect(c(m) - 0.04, c(m) + 0.04, 0.02, 0.14));
          strip('trackside:#2b2e33', a, (m) => rect(c(m) - 0.1, c(m) + 0.1, 0.2, 0.235));
        }
      }
      if (!tunnelAt((a.s + b.s) / 2)) continue;
      // Walkway ledge along the up side, cables in three runs along the down side, soot under the roof.
      strip('tunnel', a, (m) => { const q2 = side(m); return rect(q2.hi - 0.75, q2.hi - 0.01, -BED, 0.4); });
      for (const y of [2.15, 2.4, 2.65]) strip('trackside:#17181b', a, (m) => { const q2 = side(m); return rect(q2.lo + 0.03, q2.lo + 0.09, y, y + 0.07); });
      for (const w of ['lo', 'hi'] as const) {
        const sgn = w === 'lo' ? 1 : -1;
        sweep('trackside:#2b2926', a).quad(a, b, [sa[w] + sgn * 0.012, OLD_H - 1.0], [sa[w] + sgn * 0.012, OLD_H], [side(b)[w] + sgn * 0.012, OLD_H - 1.0], [side(b)[w] + sgn * 0.012, OLD_H], 0, 1);
      }
    }
    // Things at intervals along the tunnel.
    for (let s = t0 + 2; s < t1 - 2; s += 5) {
      if (!tunnelAt(s) || !tunnelAt(s + 1.2)) continue;
      const m = at(s), q2 = side(m), mid2 = (q2.d + q2.u) / 2;
      // A column between the tracks every 5 m, where they are far enough apart and no crossover runs.
      if (Math.abs(q2.u - q2.d) >= 3.5 && (s < x0 - 2 || s > x1 + 2)) {
        boxAt('tunnel', m, 0.5, mid2 - 0.19, mid2 + 0.19, -BED, OLD_H);
        boxAt('tunnel', m, 0.5, mid2 - 0.3, mid2 + 0.3, OLD_H - 0.35, OLD_H);
      }
      // Cable brackets on the down-side wall.
      boxAt('trackside:#3a3d41', m, 0.05, q2.lo, q2.lo + 0.14, 2.1, 2.75);
      const k = Math.round((s - t0) / 5);
      // A refuge niche every 30 m (a dark recess in the walkway wall), a relay box every 45 m.
      if (k % 6 === 3) boxAt('trackside:#0f0f10', m, 1.2, q2.hi - 0.03, q2.hi - 0.005, 0.4, 2.3);
      if (k % 9 === 5) {
        boxAt('trackside:#8a8f94', m, 0.6, q2.lo, q2.lo + 0.28, 0.9, 1.7);
        boxAt('trackside:#2b2e33', m, 0.05, q2.lo + 0.28, q2.lo + 0.3, 1.2, 1.4);
      }
    }
    // The crossover's two diagonals.
    for (const [from, to] of [['down', 'up'], ['up', 'down']] as const) {
      for (let s = x0; s < x1 - 0.01; s += 4) {
        const a = at(s), b = at(s + 4);
        const lat = (m: Sample) => { const f = (m.s - x0) / (x1 - x0); return geom.lateral(from, m.s) * (1 - f) + geom.lateral(to, m.s) * f; };
        const ca = lat(a), cb = lat(b);
        sweep('sleeper', a).quad(a, b, [ca - 1.25, yS + 0.002], [ca + 1.25, yS + 0.002], [cb - 1.25, yS + 0.002], [cb + 1.25, yS + 0.002], 0, 2.6);
        for (const g of [-G, G]) sweep('rail', a).span(a, b, rect(ca + g - 0.035, ca + g + 0.035, yS, 0), rect(cb + g - 0.035, cb + g + 0.035, yS, 0), false);
      }
    }
    // Signs: self-lit plates. `face` 1 looks back along the line (seen by a train running up the chainage), -1 the other way, 0 faces the track.
    // The stations at either end of this run (a run beyond a terminus has only one).
    const stops = geom.def.stops.map((id, i) => ({ s: geom.stopS[i], ja: stationById(id).nameJa }));
    const before = stops.filter((q2) => q2.s <= t0 + 1).sort((p, c) => c.s - p.s)[0], after = stops.filter((q2) => q2.s >= t1 - 1).sort((p, c) => p.s - c.s)[0];
    const put = (mesh: THREE.Mesh, s: number, lat: number, y: number, face: 1 | -1 | 0, inward = 1) => {
      if (s < t0 + 3 || s > t1 - 3) return;
      place(mesh, s, lat, y, face, inward);
    };
    for (let s = t0 + 20; s < t1 - 10; s += 60) {
      const q2 = side(at(s));
      // Green exit sign on the walkway wall: the distance to the station each way (in the tunnel only).
      const lines = [before ? `← ${before.ja} ${Math.round(s - before.s)}m` : '', '非常口 EXIT', after ? `${after.ja} ${Math.round(after.s - s)}m →` : ''].filter((l) => l);
      if (tunnelAt(s)) put(plate(lines, '#0f7a3d', '#ffffff', 1.3, 0.62), s, q2.hi - 0.04, 1.75, 0, -1);
      // Distance post on the cable side.
      put(plate([`${(s / 1000).toFixed(1)}`, 'km'], '#f1f0ea', '#1b1e22', 0.3, 0.36, 0.6), s + 8, q2.lo + 0.32, 1.1, 0, 1);
    }
    for (const track of ['down', 'up'] as const) {
      // Signals and boards stand at the tunnel's edge on the track's own side, clear of the cars (1.4 m half-width).
      const dir = track === 'down' ? 1 : -1, wall = (m: Sample) => { const q2 = side(m); return (track === 'down') === (q2.d < q2.u) ? q2.lo + 0.42 : q2.hi - 0.42; };
      // The speed board after leaving a station, and three countdown boards before the next one.
      const start = dir > 0 ? t0 + 30 : t1 - 30, end = dir > 0 ? t1 : t0;
      put(plate(['65'], '#f2c200', '#1b1e22', 0.5, 0.5, 0.75), start, wall(at(start)), 2.0, dir as 1 | -1);
      [3, 2, 1].forEach((n) => put(plate(['／'.repeat(n)], '#f1f0ea', '#1b1e22', 0.45, 0.7, 0.7), end - dir * n * 60, wall(at(end - dir * n * 60)), 1.9, dir as 1 | -1));
      // Signals about every 150 m: a dark head with three lenses, lit by where the trains are.
      for (let s = start + dir * 40; dir > 0 ? s < end - 60 : s > end + 60; s += dir * 150) {
        if (s < t0 + 3 || s > t1 - 3) continue;
        const m = at(s), lat = wall(m);
        boxAt('trackside:#17181b', m, 0.16, lat - 0.17, lat + 0.17, 2.2, 3.15);
        boxAt('trackside:#3a3d41', m, 0.08, lat - 0.04, lat + 0.04, tunnelAt(s) ? 0.4 : -BED, 2.2);
        const lens = ['#ff2a1a', '#ffb400', '#19e08a'].map((c, i) => {
          const d = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
          d.matrixAutoUpdate = false;
          d.userData.on = new THREE.Color(c).multiplyScalar(2.2);
          d.userData.off = new THREE.Color(c).multiplyScalar(0.08);
          const p = at(s - dir * 0.02);
          d.matrix.compose(new THREE.Vector3(p.x - p.tz * lat, p.y + 2.95 - i * 0.28, p.z + p.tx * lat), new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(-dir * p.tx, -dir * p.tz)), new THREE.Vector3(1, 1, 1));
          group.add(d);
          return d;
        });
        signals.push({ s, track, lens });
      }
    }
    }
    // Red behind a train, yellow next, green beyond: read from where this line's trains really are.
    group.userData.tick = (time: number) => {
      const trains = Array.from({ length: sim.tt.trainCount }, (_, k) => trainStateAt(sim.tt, k, time));
      for (const sg of signals) {
        const dir = sg.track === 'down' ? 1 : -1;
        let ahead = Infinity;
        for (const t of trains) {
          if (t.track !== sg.track) continue;
          const d = (t.s - sg.s) * dir;
          if (d > -20 && d < ahead) ahead = d;
        }
        const state = ahead < 170 ? 0 : ahead < 340 ? 1 : 2;
        sg.lens.forEach((l, i) => (l.material as THREE.MeshBasicMaterial).color.copy(i === state ? l.userData.on : l.userData.off));
      }
    };
  }

  // ── Overhead wire (a line with power 'overhead'), wherever it has track of its own: a rigid conductor
  // bar under tunnel and station roofs; in the open a contact wire under a messenger, hung from a
  // steel gantry across both tracks every 50 m. Contact wire at WIRE_H throughout (the pantographs do not move).
  if (geom.def.power === 'overhead') {
    const STEEL = 'trackside:#8f969c', COPPER = 'trackside:#7d5a3c';
    let hangAt = -Infinity, gantryAt = -Infinity;
    for (let i = 0; i < samples.length - 1; i++) {
      if (hosted[i]) continue;
      const a = samples[i], mid = (a.s + samples[i + 1].s) / 2, type = structureAt(geom, mid);
      if (modelled(geom, mid)) continue;
      const open = type === 'cut' || type === 'viaduct';
      const roof = type === 'tunnel' ? (inOld(mid) && !isSiding(geom, mid) ? OLD_H : TUNNEL_H) : WIRE_H + 0.7;
      for (const t of ['down', 'up'] as const) {
        const c = (m: Sample) => geom.lateral(t, m.s), dy = (m: Sample) => geom.dy(t, m.s);
        strip(COPPER, a, (m) => rect(c(m) - 0.012, c(m) + 0.012, dy(m) + WIRE_H, dy(m) + WIRE_H + 0.03));
        if (open) strip(COPPER, a, (m) => rect(c(m) - 0.012, c(m) + 0.012, dy(m) + WIRE_H + 1.1, dy(m) + WIRE_H + 1.13));
        else strip(STEEL, a, (m) => rect(c(m) - 0.05, c(m) + 0.05, dy(m) + WIRE_H + 0.03, dy(m) + WIRE_H + 0.13));
      }
      // Droppers between messenger and contact wire in the open, the bar's hangers under a roof.
      if (a.s >= hangAt) {
        hangAt = a.s + (open ? 6 : 5);
        for (const t of ['down', 'up'] as const) {
          const c = geom.lateral(t, a.s), dy = geom.dy(t, a.s);
          if (open) boxAt(COPPER, a, 0.02, c - 0.006, c + 0.006, dy + WIRE_H + 0.03, dy + WIRE_H + 1.1);
          else boxAt(STEEL, a, 0.06, c - 0.03, c + 0.03, dy + WIRE_H + 0.13, roof);
        }
      }
      // (Along a station's own platforms its canopy frames carry the wire.)
      if (open && a.s >= gantryAt && !atOwnPlatform(geom, a.s)) {
        gantryAt = a.s + 50;
        // On the viaduct the masts stand in the parapet; in a cutting, just inside its walls.
        const lat = type === 'viaduct' ? W + 0.38 : W - 0.3, top = WIRE_H + 1.65;
        for (const sg of [-1, 1]) boxAt(STEEL, a, 0.3, sg * lat - 0.15, sg * lat + 0.15, -BED, top);
        boxAt(STEEL, a, 0.25, -lat, lat, top - 0.35, top);
        for (const t of ['down', 'up'] as const) {
          const c = geom.lateral(t, a.s);
          boxAt(STEEL, a, 0.08, c - 0.04, c + 0.04, WIRE_H + 1.13, top - 0.35);
        }
      }
    }
  }

  // ── A main line's trackbed (deckAt): ballast; on the brick viaduct stone copings, a pier and a blind arch
  // to each 8 m bay and an end wall where the embankment takes over; along the embankment a cable trough
  // and a fence at the foot of each slope ──
  if (geom.def.type === 'jr') {
    const STONE = 'trackside:#b9b3a6', ARCH = 'trackside:#2a2422', FENCE = 'trackside:#465a4c', TROUGH = 'trackside:#a9a69d';
    let bayAt = -Infinity, postAt = -Infinity, was: Deck | null = null;
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], mid = (a.s + samples[i + 1].s) / 2;
      if (structureAt(geom, mid) !== 'viaduct' || modelled(geom, mid)) { was = null; continue; }
      const deck = deckAt(geom, mid);
      if (deck === 'brick') {
        strip(BALLAST, a, () => rect(-W - 0.3, W + 0.3, -BED, -BED + 0.006));
        for (const sg of [-1, 1]) {
          strip(STONE, a, () => rect(...out(sg, W + 0.22, W + 0.58), 1.1, 1.24));
          strip(STONE, a, () => rect(...out(sg, W + 0.5, W + 0.6), -0.85, -0.4));
        }
        if (a.s >= bayAt && a.y > 4) {
          bayAt = a.s + 8;
          for (const sg of [-1, 1]) {
            boxAt(BRICK, a, 1.0, ...out(sg, W + 0.5, W + 0.7), -a.y, -0.85);
            boxAt(ARCH, at(a.s + 1.6), 5.8, ...out(sg, W + 0.5, W + 0.53), -a.y, -2.6);
            boxAt(STONE, at(a.s + 1.4), 6.2, ...out(sg, W + 0.5, W + 0.56), -2.6, -2.35);
            // The arch's haunches, stepped in brick at the recess's top corners.
            for (const [u, len, drop] of [[1.6, 0.5, 1.5], [2.1, 0.6, 0.8], [2.7, 0.7, 0.35], [6.9, 0.5, 1.5], [6.2, 0.6, 0.8], [5.4, 0.7, 0.35]]) {
              boxAt(BRICK, at(a.s + u), len, ...out(sg, W + 0.5, W + 0.55), -2.6 - drop, -2.6);
            }
          }
        }
      } else {
        const foot = (m: Sample) => W + BANK_SHOULDER + BANK_K * Math.max(0, m.y - BED);
        strip(BALLAST, a, () => rect(-W - BANK_SHOULDER + 0.1, W + BANK_SHOULDER - 0.1, -BED, -BED + 0.006));
        for (const sg of [-1, 1]) {
          strip(TROUGH, a, () => rect(...out(sg, W + 0.2, W + 0.6), -BED, -BED + 0.25));
          for (const h of [0.8, 1.5]) strip(FENCE, a, (m) => rect(...out(sg, foot(m) + 0.6, foot(m) + 0.66), -m.y + h - 0.05, -m.y + h));
        }
        if (a.s >= postAt) {
          postAt = a.s + 2.5;
          for (const sg of [-1, 1]) boxAt(FENCE, a, 0.06, ...out(sg, foot(a) + 0.59, foot(a) + 0.67), -a.y, -a.y + 1.55);
        }
        // The viaduct's end wall, where the embankment begins.
        if (was === 'brick') sweep(BRICK, a).cap(a, -W - 0.5, W + 0.5, -a.y, 1.1);
      }
      was = deck;
    }
  }

  // ── A modelled stretch (stretches.ts): the portal, the cutting's troughs and fences, the viaduct's
  // noise walls, and a through-girder span over each street under the viaduct ──
  for (const st of stretchesOf(geom)) {
    const { s0, s1 } = stretchRange(geom, st);
    const CONC = 'viaduct', TROUGH = 'trackside:#a9a69d', FENCE = 'trackside:#465a4c', NOISE = 'trackside:#cdc9bf', GIRDER = 'trackside:#56788c';
    let fenceAt = -Infinity;
    for (let i = 0; i < samples.length - 2; i++) {
      const a = samples[i], b = samples[i + 1], mid = (a.s + b.s) / 2;
      if (mid < s0 || mid > s1 || hosted[i]) continue;
      const type = structureAt(geom, mid);
      if (type === 'tunnel') {
        // The portal, where the tunnel gives way to the cutting: a head wall over the opening up to
        // just above the street, pilasters either side, a coping along the top.
        if (structureAt(geom, (b.s + samples[i + 2].s) / 2) !== 'cut') continue;
        const top = -b.y + 1.3, back = at(b.s - 1.2);
        boxAt(CONC, back, 1.2, -W - 1.6, W + 1.6, OLD_H, top);
        for (const sg of [-1, 1]) boxAt(CONC, back, 1.4, ...out(sg, W - 0.05, W + 1.6), -BED, top);
        boxAt(CONC, at(b.s - 1.5), 1.8, -W - 1.9, W + 1.9, top, top + 0.3);
        // The line's name and the year it was built, cast in a plate over the opening.
        const plaque = plate(st.plaque, '#5a5c58', '#e9e6dc', 1.3, 0.62, 0.55);
        place(plaque, b.s + 0.02, 0, OLD_H + Math.min(1.2, (top - OLD_H) / 2), -1);
        continue;
      }
      if (type !== 'cut' && type !== 'viaduct') continue;
      // Cable troughs along both sides.
      for (const sg of [-1, 1]) strip(TROUGH, a, () => rect(...out(sg, W - 0.95, W - 0.45), -BED, -BED + 0.3));
      if (type === 'cut') {
        // A fence along the top of each retaining wall: two rails, a post every 2.5 m.
        for (const sg of [-1, 1]) for (const h of [0.9, 1.7]) strip(FENCE, a, (m) => rect(...out(sg, W + 0.18, W + 0.24), 1.0 - m.y + h - 0.05, 1.0 - m.y + h));
        if (a.s >= fenceAt) {
          fenceAt = a.s + 2.5;
          for (const sg of [-1, 1]) boxAt(FENCE, a, 0.06, ...out(sg, W + 0.17, W + 0.25), 1.0 - a.y, 1.0 - a.y + 1.75);
        }
      } else {
        // Noise walls on the parapets, kept just under the cars' window sills so the city shows.
        for (const sg of [-1, 1]) strip(NOISE, a, () => rect(...out(sg, W + 0.3, W + 0.45), 1.1, 1.85));
      }
    }
    // Through-girder spans: a painted plate girder either side of the deck, standing above it, with
    // stiffeners, on a concrete pier at each end; the clearance board on the street faces.
    for (const br of bridges.filter((r) => r.s > s0 && r.s < s1)) {
      const sA = br.s - br.span / 2, m = at(sA);
      for (const sg of [-1, 1]) {
        boxAt(GIRDER, m, br.span, ...out(sg, W + 0.5, W + 0.75), -1.6, 1.7);
        for (let u = 0.6; u < br.span; u += 1.6) boxAt(GIRDER, at(sA + u), 0.12, ...out(sg, W + 0.75, W + 0.9), -1.5, 1.6);
        const clear = Math.floor((geom.railY(br.s) - 1.6) * 10) / 10;
        // On the girder's outer face, facing the street (out from the line).
        const board = plate(['高さ制限', `${clear.toFixed(1)}m`], '#1f3f7a', '#ffffff', 1.1, 0.6, 0.8), c = at(br.s), lat = sg * (W + 0.93);
        board.matrix.compose(new THREE.Vector3(c.x - c.tz * lat, c.y - 1.0, c.z + c.tx * lat), new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(-c.tz * sg, c.tx * sg)), new THREE.Vector3(1, 1, 1));
        group.add(board);
      }
      for (const e of [sA - 1.3, sA + br.span]) {
        const p = at(e);
        boxAt(CONC, p, 1.3, -W - 0.9, W + 0.9, -p.y - 0.03, -1.2);
      }
    }
  }

  for (const { sw, mat, chunk } of sweeps.values()) {
    const m = sw.mesh(mat);
    if (!m) continue;
    m.userData.layer = [chunk - 1, chunk, chunk + 1].some((c) => openChunks.has(c)) ? 'surface' : 'deep';
    group.add(m);
  }
  const pg = meshesToGeometry(piers, { kind: 'sky' });
  if (pg) {
    const pm = new THREE.Mesh(pg, getMaterial('concrete'));
    pm.castShadow = pm.receiveShadow = true;
    group.add(pm);
  }
  // (Tunnel lamps stay one instanced mesh: they are small, and only ever seen underground.)
  if (lights.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6eeff').multiplyScalar(2.6) }), lights.length);
    lights.forEach((m, i) => im.setMatrixAt(i, m));
    im.frustumCulled = false;
    group.add(im);
  }
  if (warm.length) {
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(2.4) }), warm.length);
    warm.forEach((m, i) => im.setMatrixAt(i, m));
    im.frustumCulled = false;
    group.add(im);
  }
  return group;
}
