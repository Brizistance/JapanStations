// Owns every three.js object in the world and keeps them in step with the sim.
// Imperative on purpose: the scene has thousands of parts that change every frame,
// so it lives outside React and is mounted once via <primitive>.

import * as THREE from 'three';
import { lineById } from '../data/network';
import { NET } from '../sim';
import { STATION_WORLDS, gateOpen, type StationWorld } from '../stations';
import { PF_H } from '../stations/kit';
import { carBuild, carKind, trains, type TrainRuntime } from '../trains/system';
import { CAR_HALF, CAR_HALF_W } from '../trains/car';
import { carModel, loadCarModel } from './car-model';
import type { BoxPart, GatePart } from '../world/builder';
import { halfWidth, sampleChainages, structureAt } from '../world/structure';
import { DEFAULT_PLOT, rng } from '../world/builder';
import { boxesToGeometry, groupBy, type EnvMode } from './geometry';
import { withEnvMod } from './lit';
import { getMaterial } from './materials';
import { GateSet, makeSigns, staticGroup } from './part-view';
import { disposeCache, redrawLive, type SignCache, type SignSet } from './sign-set';
import type { SignContent } from '../signs/content';
import { buildTrack } from './track';

const STATION_IN = 520, STATION_OUT = 680, TRAIN_RANGE = 750;
/** Within this distance of a station, its departure boards animate smoothly. */
const FAST_RANGE = 120;
/** A station with a bigger plot is mounted from correspondingly further away. */
const BASE_RADIUS = Math.hypot(DEFAULT_PLOT.x, DEFAULT_PLOT.z) + 5;

interface StationView {
  group: THREE.Group;
  cache: SignCache;
  gates: GateSet[];
  dispose: () => void;
}

const STATION_ENV: EnvMode = { kind: 'station' };
const SKY_ENV: EnvMode = { kind: 'sky' };
/** Faces looking into this box are the saloon: always lit by the car's own lights. */
const CAR_ENV: EnvMode = { kind: 'car', min: [-CAR_HALF + 0.02, PF_H - 0.2, -CAR_HALF_W + 0.02], max: [CAR_HALF - 0.02, 3.4, CAR_HALF_W - 0.02] };

function mountStation(w: StationWorld): StationView {
  const group = new THREE.Group();
  group.position.set(w.frame.x, w.frame.y, w.frame.z);
  group.rotation.y = w.frame.yaw;
  const st = staticGroup(w.build, STATION_ENV);
  group.add(st.group);
  const cache: SignCache = new Map();
  group.add(makeSigns(w.build, cache).group);
  // Screen doors, one set per line so each carries its line colour. Full-height
  // screens (gates marked `window`) are mostly glass; waist-high gates have a small pane.
  const byLine = new Map<string, GatePart[]>();
  for (const g of w.build.gates) byLine.set(g.line!, [...(byLine.get(g.line!) ?? []), g]);
  const gates = [...byLine].map(([line, list]) => new GateSet(list, [
    { mat: 'glassDark', rect: list[0].window ? [0.12, 0.14, 0.9, 0.93] : [0.14, 0.5, 0.86, 0.9], proud: 0.004 },
    { mat: `paint:${lineById(line).color}`, rect: list[0].window ? [0, 0.96, 1, 1] : [0, 0.93, 1, 1], proud: 0.006 },
    { mat: 'metal:#b9bdc2', rect: [0, 0, 0.05, list[0].window ? 0.96 : 0.93], proud: 0.003 },
  ]));
  for (const g of gates) group.add(...g.meshes);
  group.updateMatrixWorld(true);
  return {
    group, cache, gates,
    dispose: () => {
      st.dispose();
      disposeCache(cache);
      for (const g of gates) g.dispose();
    },
  };
}

interface TrainView {
  group: THREE.Group;
  cars: THREE.Group[];
  gates: GateSet[];
  signs: SignSet[];
  cache: SignCache;
  lamps: { low: THREE.Mesh[]; high: THREE.Mesh[] };
  /** Per car: (sky, shade) added to the exterior's lighting as it moves between tunnel, station and open air. */
  env: { value: THREE.Vector2 }[];
}

// Head/tail lamps sit in the housings modelled on the cab front, turned to follow its curve.
const lampGeo = new THREE.BoxGeometry(0.06, 0.1, 0.32);
const LAMP = { x: 9.213, y: 1.72, z: 0.93, turn: 0.205 };
const white = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff7d6').multiplyScalar(3) });
const red = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a1a').multiplyScalar(2) });

function destDir(t: TrainRuntime): 'down' | 'up' | 'none' {
  const p = t.state.phase;
  if (p.kind === 'run') return p.inService ? p.dir : 'none';
  return p.role === 'reverse' || p.role === 'arrival' ? 'none' : p.dir;
}

function mountTrain(t: TrainRuntime): TrainView {
  const group = new THREE.Group();
  const cache: SignCache = new Map();
  const line = t.sim.geom.def;
  const n = line.service.cars;
  const view: TrainView = { group, cars: [], gates: [], signs: [], cache, lamps: { low: [], high: [] }, env: [] };
  const resolve = (c: SignContent): SignContent =>
    c.k === 'lcd' ? { ...c, train: t.index } : c.k === 'dest' ? { ...c, dir: destDir(t) } : c;
  for (let c = 0; c < n; c++) {
    const kind = carKind(c, n);
    const { build } = carBuild(line.id, kind);
    const g = new THREE.Group();
    g.rotation.order = 'YZX';
    // Each car gets its own copies of the materials so its lighting can follow it.
    const env = { value: new THREE.Vector2(0, 0) };
    const own = new Map<THREE.Material, THREE.Material>();
    const mine = (m: THREE.Material) => {
      let c = own.get(m);
      if (!c) own.set(m, (c = withEnvMod(m, env)));
      return c;
    };
    // The Blender model if it has loaded; the collision boxes drawn as they are if not.
    const body = carModel(line.color, kind) ?? staticGroup(build, CAR_ENV, `car:${line.id}:${kind}`).group;
    body.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.material = mine(mesh.material as THREE.Material);
    });
    g.add(body);
    view.env.push(env);
    const signs = makeSigns(build, cache, resolve);
    g.add(signs.group);
    const gates = new GateSet(build.gates, [{ mat: 'glassDark', rect: [0.2, 0.42, 0.86, 0.9], proud: 0.005 }], mine);
    g.add(...gates.meshes);
    if (kind !== 'mid') {
      const s = kind === 'cabLow' ? -1 : 1;
      for (const z of [-LAMP.z, LAMP.z]) {
        const m = new THREE.Mesh(lampGeo, white);
        m.position.set(s * LAMP.x, LAMP.y, z);
        m.rotation.y = -s * Math.sign(z) * LAMP.turn;
        g.add(m);
        (kind === 'cabLow' ? view.lamps.low : view.lamps.high).push(m);
      }
    }
    group.add(g);
    view.cars.push(g);
    view.gates.push(gates);
    view.signs.push(signs);
  }
  return view;
}

/** Low-detail city beyond the station plots, plus the ground it stands on. */
function buildBackdrop(): THREE.Group {
  const group = new THREE.Group();
  // Plot rectangles in world space.
  const plots = STATION_WORLDS.map((w) => {
    const c = Math.cos(w.frame.yaw), s = Math.sin(w.frame.yaw);
    const corner = (lx: number, lz: number) => new THREE.Vector2(w.frame.x + lx * c + lz * s, -(w.frame.z - lx * s + lz * c));
    const { x: px, z: pz } = w.build.plot;
    return { w, pts: [corner(-px, -pz), corner(px, -pz), corner(px, pz), corner(-px, pz)] };
  });
  const inPlot = (x: number, z: number, m: number) =>
    plots.some(({ w }) => {
      const dx = x - w.frame.x, dz = z - w.frame.z;
      const c = Math.cos(w.frame.yaw), s = Math.sin(w.frame.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < w.build.plot.x + m && Math.abs(lz) < w.build.plot.z + m) return true;
      return (w.build.clear ?? []).some(([x0, z0, x1, z1]) => lx > x0 - m && lx < x1 + m && lz > z0 - m && lz < z1 + m);
    });

  // Open-air track: holes in the ground for the cut, and a keep-clear corridor for buildings.
  const openPts: { x: number; z: number }[] = [];
  const shape = new THREE.Shape([new THREE.Vector2(-3000, 5000), new THREE.Vector2(8000, 5000), new THREE.Vector2(8000, -5000), new THREE.Vector2(-3000, -5000)]);
  for (const p of plots) shape.holes.push(new THREE.Path(p.pts));
  for (const { geom } of NET) {
    const W = halfWidth(geom) + 0.45;
    let left: THREE.Vector2[] = [], right: THREE.Vector2[] = [];
    const flush = () => {
      if (left.length > 1) shape.holes.push(new THREE.Path([...left, ...right.reverse()]));
      left = [];
      right = [];
    };
    for (const s of sampleChainages(geom)) {
      const type = structureAt(geom, s);
      const p = geom.path.pointAt(s);
      if (type === 'cut' || type === 'viaduct') openPts.push({ x: p.x, z: p.z });
      if (type === 'cut' && !inPlot(p.x, p.z, 1)) {
        left.push(new THREE.Vector2(p.x + p.tz * W, -(p.z - p.tx * W)));
        right.push(new THREE.Vector2(p.x - p.tz * W, -(p.z + p.tx * W)));
      } else flush();
    }
    flush();
  }
  const groundGeo = new THREE.ShapeGeometry(shape);
  groundGeo.setAttribute('aEnv', new THREE.BufferAttribute(new Float32Array(groundGeo.getAttribute('position').count * 2).fill(1), 2));
  // Shape UVs are its xy in metres already.
  const ground = new THREE.Mesh(groundGeo, getMaterial('ground'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  group.add(ground);

  // Blocks of plain buildings near anything you can see from the surface.
  const r = rng(2026);
  const boxes: BoxPart[] = [];
  const mats = ['facade:grid:#cfcabd', 'facade:grid:#b7b1a4', 'facade:apt:#dcd6c9', 'facade:office:#8ea0ae', 'facade:grid:#a9a39a', 'facade:apt:#c9d0d4'];
  const PITCH = 46;
  // Open-track points bucketed on a 330 m grid: only the 3×3 cells around a lot can be in range.
  const CELL = 330;
  const buckets = new Map<string, { x: number; z: number }[]>();
  for (const p of openPts) {
    const k = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p);
  }
  const openDistAt = (x: number, z: number) => {
    let m = Infinity;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of buckets.get(`${cx + i},${cz + j}`) ?? []) m = Math.min(m, Math.hypot(p.x - x, p.z - z));
    return m;
  };
  // The grid spans the whole network (bounds from the station frames), plus a margin.
  const fx = STATION_WORLDS.map((s) => s.frame.x), fz = STATION_WORLDS.map((s) => s.frame.z);
  const [x0, x1, z0, z1] = [Math.min(...fx) - 500, Math.max(...fx) + 500, Math.min(...fz) - 500, Math.max(...fz) + 500];
  for (let gx = x0; gx < x1; gx += PITCH) {
    for (let gz = z0; gz < z1; gz += PITCH) {
      const x = gx + (r() - 0.5) * 8, z = gz + (r() - 0.5) * 8;
      const w = 16 + r() * 16, d = 16 + r() * 16;
      const nearStation = STATION_WORLDS.some((s) => Math.hypot(s.frame.x - x, s.frame.z - z) < 480);
      const openDist = openDistAt(x, z);
      if (!nearStation && openDist > 330) continue;
      if (inPlot(x, z, 24) || openDist < 34) continue;
      const centre = Math.hypot(x - 1870, z);
      const tall = Math.max(0, 1 - centre / 1500);
      const h = 9 + r() * 16 + tall * tall * r() * 70;
      boxes.push({ mat: mats[Math.floor(r() * mats.length)], min: [x - w / 2, -0.03, z - d / 2], max: [x + w / 2, h, z + d / 2], solid: false });
    }
  }
  for (const [mat, list] of groupBy(boxes)) {
    const m = new THREE.Mesh(boxesToGeometry(list, SKY_ENV), getMaterial(mat));
    m.matrixAutoUpdate = false;
    group.add(m);
  }
  return group;
}

export class WorldView {
  readonly root = new THREE.Group();
  private stations = new Map<string, StationView>();
  private trainViews = new Map<string, TrainView>();
  private liveTimer = 0;
  private fastTimer = 0;

  constructor() {
    this.root.add(buildBackdrop());
    for (const sim of NET) this.root.add(buildTrack(sim));
    // Trains mounted before the model arrived are remounted with it.
    loadCarModel().then(() => this.resetTrains(), (e) => console.warn('train model not loaded, using boxes:', e));
  }

  private resetTrains() {
    for (const v of this.trainViews.values()) {
      this.root.remove(v.group);
      for (const g of v.gates) g.dispose();
      disposeCache(v.cache);
    }
    this.trainViews.clear();
  }

  /** Mount/unmount stations by distance and move the trains. Call after the sim tick. */
  update(dt: number, cam: THREE.Vector3) {
    // Stations: at most one mount per frame to spread the cost.
    let mounted = false;
    // Departure boards in the station around the player redraw at ~15 Hz (scrolling tickers).
    this.fastTimer -= dt;
    const fast = this.fastTimer <= 0;
    if (fast) this.fastTimer = 1 / 15;
    for (const w of STATION_WORLDS) {
      const d = Math.hypot(w.frame.x - cam.x, w.frame.z - cam.z) - (w.frame.radius - BASE_RADIUS);
      const v = this.stations.get(w.def.id);
      if (v && fast && d < FAST_RANGE) redrawLive(v.cache, true);
      if (!v && d < STATION_IN && !mounted) {
        const nv = mountStation(w);
        this.stations.set(w.def.id, nv);
        this.root.add(nv.group);
        mounted = true;
      } else if (v && d > STATION_OUT) {
        this.root.remove(v.group);
        v.dispose();
        this.stations.delete(w.def.id);
      } else if (v) {
        for (const set of v.gates) set.update((g) => gateOpen(g.line!, g.stop!, g.track!));
      }
    }

    // Trains.
    this.liveTimer -= dt;
    const live = this.liveTimer <= 0;
    if (live) this.liveTimer = 0.5;
    for (const t of trains) {
      const mid = t.cars[Math.floor(t.cars.length / 2)];
      const d = Math.hypot(mid.x - cam.x, mid.z - cam.z);
      let v = this.trainViews.get(t.id);
      if (d > TRAIN_RANGE) {
        if (v) v.group.visible = false;
        continue;
      }
      if (!v) {
        v = mountTrain(t);
        this.trainViews.set(t.id, v);
        this.root.add(v.group);
      }
      v.group.visible = true;
      const k = Math.min(1, dt * 5);
      t.cars.forEach((f, c) => {
        const g = v!.cars[c];
        g.position.set(f.x, f.y, f.z);
        g.rotation.set(0, f.yaw, f.pitch);
        // Exterior lighting: daylight in the open, station light at a platform, near-dark in a tunnel.
        const open = f.y > -5.4;
        const atStation = STATION_WORLDS.some((s) => Math.hypot(s.frame.x - f.x, s.frame.z - f.z) < 64);
        const e = v!.env[c].value;
        e.x += ((open ? 1 : 0) - e.x) * k;
        e.y += ((open ? 0 : atStation ? 0.12 : 0.86) - e.y) * k;
        v!.gates[c].update((gate) => (gate.side === t.doorSide ? t.state.doorOpen : 0));
      });
      const lowLeads = t.state.heading < 0;
      for (const m of v.lamps.low) m.material = lowLeads ? white : red;
      for (const m of v.lamps.high) m.material = lowLeads ? red : white;
      if (live) {
        for (const s of v.signs) s.refresh();
        redrawLive(v.cache);
      }
    }
    if (live) for (const v of this.stations.values()) redrawLive(v.cache);
  }

  dispose() {
    for (const v of this.stations.values()) v.dispose();
    for (const v of this.trainViews.values()) disposeCache(v.cache);
  }
}
