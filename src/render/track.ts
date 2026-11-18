// Builds the running line between stations: tunnels, the open cut, the viaduct,
// rails and sleepers, tunnel lighting. All swept along the line geometry.

import * as THREE from 'three';
import type { LineSim } from '../sim';
import { BED } from '../stations/kit';
import { XOVER_FAR, XOVER_NEAR, type LineGeom, type Track } from '../sim/geometry';
import { halfWidth, isSiding, sampleChainages, structureAt, trackRange, type Structure } from '../world/structure';
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

function profiles(geom: LineGeom, type: Structure, siding: boolean, m: Sample): { p: Profile; closed: boolean }[] {
  const L = geom.def.trackOffset, W = halfWidth(geom);
  const rect = (c: number, w: number): Profile => [[c - w, -BED], [c + w, -BED], [c + w, TUNNEL_H], [c - w, TUNNEL_H]];
  if (type === 'tunnel') {
    if (geom.def.platformType === 'island' && !siding) return [{ p: rect(-L, 2.2), closed: true }, { p: rect(L, 2.2), closed: true }];
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
    lampAt = m.s + 12;
    lit.add(m);
    m.shade = 0.5;
  }
  const L = geom.def.trackOffset, W = halfWidth(geom);
  const tunnel = new Sweep(), open = new Sweep(), sleepers = new Sweep(), rails = new Sweep();
  const piers: MeshPart[] = [];
  const lights: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(0.5, 0.14, 0.08), v = new THREE.Vector3();
  let nextPier = 0;

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    const mid = (a.s + b.s) / 2;
    const type = structureAt(geom, mid);
    if (type === 'station') continue;
    const siding = isSiding(geom, mid);
    const pa = profiles(geom, type, siding, a), pb = profiles(geom, type, siding, b);
    const target = type === 'tunnel' ? tunnel : open;
    pa.forEach((p, k) => target.span(a, b, p.p, pb[k].p, p.closed));

    if (type === 'tunnel' && lit.has(a)) {
      const twin = geom.def.platformType === 'island' && !siding;
      const lats = twin ? [-L - 2.15, L + 2.15] : [-W + 0.05, W - 0.05];
      for (const lat of lats) {
        q.setFromAxisAngle(up, Math.atan2(-a.tz, a.tx));
        v.set(a.x - a.tz * lat, a.y + 2.7, a.z + a.tx * lat);
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
    if (type === 'tunnel') tunnel.cap(end, -W - 0.5, W + 0.5, -1, TUNNEL_H + 0.5);
    else open.cap(end, -W - 0.5, W + 0.5, -BED, 1.1);
  }

  // Rails and sleepers for both running tracks and the two crossovers.
  const tracks: { track: Track; s0: number; s1: number }[] = [
    { track: 'down', s0: r0, s1: r1 },
    { track: 'up', s0: r0, s1: r1 },
    { track: 'xoverEnd', s0: geom.lastS + XOVER_NEAR - 4, s1: geom.lastS + XOVER_FAR + 4 },
    { track: 'xoverStart', s0: geom.firstS - XOVER_FAR - 4, s1: geom.firstS - XOVER_NEAR + 4 },
  ];
  const yS = -BED + 0.012, G = 0.7175;
  for (const t of tracks) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], b = samples[i + 1];
      if (a.s < t.s0 || b.s > t.s1) continue;
      const ca = geom.lateral(t.track, a.s), cb = geom.lateral(t.track, b.s);
      sleepers.quad(a, b, [ca - 1.25, yS], [ca + 1.25, yS], [cb - 1.25, yS], [cb + 1.25, yS], 0, 2.6);
      for (const g of [-G, G]) {
        const ra: Profile = [[ca + g - 0.035, yS], [ca + g - 0.035, 0], [ca + g + 0.035, 0], [ca + g + 0.035, yS]];
        const rb: Profile = [[cb + g - 0.035, yS], [cb + g - 0.035, 0], [cb + g + 0.035, 0], [cb + g + 0.035, yS]];
        rails.span(a, b, ra, rb, false);
      }
    }
  }

  for (const [sw, mat] of [[tunnel, 'tunnel'], [open, 'viaduct'], [sleepers, 'sleeper'], [rails, 'rail']] as const) {
    const m = sw.mesh(mat);
    if (m) group.add(m);
  }
  const pg = meshesToGeometry(piers, { kind: 'sky' });
  if (pg) {
    const pm = new THREE.Mesh(pg, getMaterial('concrete'));
    pm.castShadow = pm.receiveShadow = true;
    group.add(pm);
  }
  if (lights.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6eeff').multiplyScalar(2.6) }), lights.length);
    lights.forEach((m, i) => im.setMatrixAt(i, m));
    im.frustumCulled = false;
    group.add(im);
  }
  return group;
}
