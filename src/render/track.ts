// Builds the running line between stations: tunnels, the open cut, the viaduct,
// rails and sleepers, tunnel lighting. All swept along the line geometry.

import * as THREE from 'three';
import type { LineSim } from '../sim';
import { stationById } from '../data/network';
import { trainStateAt } from '../sim/timetable';
import { BED } from '../stations/kit';
import { XOVER_FAR, XOVER_NEAR, type LineGeom, type Track } from '../sim/geometry';
import { halfWidth, isSiding, onHostTrack, sampleChainages, structureAt, trackRange, type Structure } from '../world/structure';
import { meshesToGeometry } from './geometry';
import { getMaterial } from './materials';
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
    m.castShadow = mat === 'viaduct';
    return m;
  }
}

const TUNNEL_H = 4.65;
/** Clear height of an old cut-and-cover box tunnel above the rails. */
const OLD_H = 4.1;

/**
 * Stretches drawn as an old-era box tunnel with its trackside kit (docs/between-stations.md).
 * So far the whole Yanagisuji Line (1933); the first sample was its stretch between Kita-Ōdōri and Tsumugibashi.
 */
function oldStretch(geom: LineGeom): [number, number] | null {
  return geom.def.id === 'Y' ? [-Infinity, Infinity] : null;
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

function profiles(geom: LineGeom, type: Structure, siding: boolean, m: Sample, old = false): { p: Profile; closed: boolean }[] {
  const L = geom.def.trackOffset, W = halfWidth(geom);
  if (type === 'tunnel' && old && geom.def.platformType === 'island' && !siding) {
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

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    const mid = (a.s + b.s) / 2;
    const type = structureAt(geom, mid);
    if (type === 'station' || hosted[i]) continue;
    const siding = isSiding(geom, mid);
    const isOld = type === 'tunnel' && inOld(mid) && geom.def.platformType === 'island' && !siding;
    const pa = profiles(geom, type, siding, a, isOld), pb = profiles(geom, type, siding, b, isOld);
    const target = sweep(type === 'tunnel' ? 'tunnel' : 'viaduct', a);
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
    if (type === 'viaduct' && a.y - 1.2 >= 1.5 && a.s >= nextPier) {
      nextPier = a.s + 24;
      const h = a.y - 1.2;
      piers.push({ mat: 'concrete', shape: 'cyl', pos: [a.x, h / 2, a.z], size: [2.4, h, 2.4] });
    }
  }
  // End caps so the sidings do not open onto the void.
  const [r0, r1] = trackRange(geom);
  for (const end of [samples[0], samples[samples.length - 1]]) {
    const type = structureAt(geom, end.s === r0 ? r0 + 1 : r1 - 1);
    if (type === 'tunnel') sweep('tunnel', end).cap(end, -W - 0.5, W + 0.5, -1, TUNNEL_H + 0.5);
    else sweep('viaduct', end).cap(end, -W - 0.5, W + 0.5, -BED, 1.1);
  }

  // Rails and sleepers for both running tracks and the two crossovers.
  const tracks: { track: Track; s0: number; s1: number }[] = [
    { track: 'down', s0: r0, s1: r1 },
    { track: 'up', s0: r0, s1: r1 },
    { track: 'xoverEnd', s0: geom.lastS + XOVER_NEAR - 4, s1: geom.lastS + XOVER_FAR + 4 },
    { track: 'xoverStart', s0: geom.firstS - XOVER_FAR - 4, s1: geom.firstS - XOVER_NEAR + 4 },
  ];
  for (const t of tracks) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], b = samples[i + 1];
      if (a.s < t.s0 || b.s > t.s1 || hosted[i]) continue;
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

  // ── The old-era kit on its stretch: third rails, walkway, cables, columns, niches, a crossover, signs, signals ──
  const signals: { s: number; track: 'down' | 'up'; lens: THREE.Mesh[] }[] = [];
  if (old) {
    const span = samples.filter((m, i) => i < samples.length - 1 && !hosted[i] && inOld((m.s + samples[i + 1].s) / 2) && structureAt(geom, (m.s + samples[i + 1].s) / 2) === 'tunnel' && !isSiding(geom, (m.s + samples[i + 1].s) / 2));
    // One run of tunnel between two stations at a time.
    const segs: Sample[][] = [];
    for (const m of span) {
      const last = segs[segs.length - 1];
      if (last && samples.indexOf(m) === samples.indexOf(last[last.length - 1]) + 1) last.push(m);
      else segs.push([m]);
    }
    const next = (m: Sample) => samples[samples.indexOf(m) + 1];
    const side = (m: Sample) => {
      const d = geom.lateral('down', m.s), u = geom.lateral('up', m.s);
      return { d, u, lo: Math.min(d, u) - 2.3, hi: Math.max(d, u) + 2.3, sd: d < u ? -1 : 1 };
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
    const at = (s: number): Sample => {
      const m = span.reduce((p, c) => (Math.abs(c.s - s) < Math.abs(p.s - s) ? c : p), span[0]);
      const p = geom.path.pointAt(s);
      return { ...m, s, x: p.x, z: p.z, y: geom.railY(s), tx: p.tx, tz: p.tz };
    };
    const sK = geom.stopS[geom.def.stops.indexOf('kita-odori')], sT = geom.stopS[geom.def.stops.indexOf('tsumugibashi')];
    for (const seg of segs) {
    const t0 = seg[0].s, t1 = seg[seg.length - 1].s;
    if (t1 - t0 < 30) continue;
    // The crossover by Kita-Ōdōri, on the stretch towards Tsumugibashi: scenery only, no train uses it. The columns stop for its length.
    const hasX = (t0 + t1) / 2 > Math.min(sK, sT) && (t0 + t1) / 2 < Math.max(sK, sT) && t1 - t0 > 120;
    const x0 = !hasX ? Infinity : sK < sT ? t0 + 14 : t1 - 54, x1 = hasX ? x0 + 40 : -Infinity;
    for (const a of seg) {
      const b = next(a), sa = side(a);
      // Third rail on the outer side of each track, under its cover board, on insulators.
      for (const [t, o] of [['down', sa.sd], ['up', -sa.sd]] as const) {
        const c = (m: Sample) => geom.lateral(t, m.s) + o * 1.18;
        strip('rail', a, (m) => rect(c(m) - 0.04, c(m) + 0.04, 0.02, 0.14));
        strip('trackside:#2b2e33', a, (m) => rect(c(m) - 0.1, c(m) + 0.1, 0.2, 0.235));
      }
      // Walkway ledge along the up side, cables in three runs along the down side, soot under the roof.
      strip('tunnel', a, (m) => { const q2 = side(m); return rect(q2.hi - 0.75, q2.hi - 0.01, -BED, 0.4); });
      for (const y of [2.15, 2.4, 2.65]) strip('trackside:#17181b', a, (m) => { const q2 = side(m); return rect(q2.lo + 0.03, q2.lo + 0.09, y, y + 0.07); });
      for (const w of ['lo', 'hi'] as const) {
        const sgn = w === 'lo' ? 1 : -1;
        sweep('trackside:#2b2926', a).quad(a, b, [sa[w] + sgn * 0.012, OLD_H - 1.0], [sa[w] + sgn * 0.012, OLD_H], [side(b)[w] + sgn * 0.012, OLD_H - 1.0], [side(b)[w] + sgn * 0.012, OLD_H], 0, 1);
      }
    }
    // Things at intervals along the stretch.
    for (let s = t0 + 2; s < t1 - 2; s += 5) {
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
      const m = at(s);
      const yaw = face === 0 ? Math.atan2(-m.tz * inward, m.tx * inward) + Math.PI / 2 : Math.atan2(-face * m.tx, -face * m.tz);
      mesh.matrix.compose(new THREE.Vector3(m.x - m.tz * lat, m.y + y, m.z + m.tx * lat), new THREE.Quaternion().setFromAxisAngle(up, yaw), new THREE.Vector3(1, 1, 1));
      group.add(mesh);
    };
    for (let s = t0 + 20; s < t1 - 10; s += 60) {
      const q2 = side(at(s));
      // Green exit sign on the walkway wall: the distance to the station each way.
      const lines = [before ? `← ${before.ja} ${Math.round(s - before.s)}m` : '', '非常口 EXIT', after ? `${after.ja} ${Math.round(after.s - s)}m →` : ''].filter((l) => l);
      put(plate(lines, '#0f7a3d', '#ffffff', 1.3, 0.62), s, q2.hi - 0.04, 1.75, 0, -1);
      // Distance post on the cable side.
      put(plate([`${(s / 1000).toFixed(1)}`, 'km'], '#f1f0ea', '#1b1e22', 0.3, 0.36, 0.6), s + 8, q2.lo + 0.32, 1.1, 0, 1);
    }
    for (const track of ['down', 'up'] as const) {
      const dir = track === 'down' ? 1 : -1, wall = (m: Sample) => { const q2 = side(m); return (track === 'down') === (q2.d < q2.u) ? q2.lo + 0.42 : q2.hi - 1.1; };
      // The speed board after leaving a station, and three countdown boards before the next one.
      const start = dir > 0 ? t0 + 30 : t1 - 30, end = dir > 0 ? t1 : t0;
      put(plate(['65'], '#f2c200', '#1b1e22', 0.5, 0.5, 0.75), start, wall(at(start)), 2.0, dir as 1 | -1);
      [3, 2, 1].forEach((n) => put(plate(['／'.repeat(n)], '#f1f0ea', '#1b1e22', 0.45, 0.7, 0.7), end - dir * n * 60, wall(at(end - dir * n * 60)), 1.9, dir as 1 | -1));
      // Signals about every 150 m: a dark head on the wall with three lenses, lit by where the trains are.
      for (let s = start + dir * 40; dir > 0 ? s < end - 60 : s > end + 60; s += dir * 150) {
        if (s < t0 + 3 || s > t1 - 3) continue;
        const m = at(s), lat = wall(m);
        boxAt('trackside:#17181b', m, 0.16, lat - 0.17, lat + 0.17, 2.2, 3.15);
        boxAt('trackside:#3a3d41', m, 0.08, lat - 0.04, lat + 0.04, 0.4, 2.2);
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
