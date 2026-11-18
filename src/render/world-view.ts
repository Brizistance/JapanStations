// Owns every three.js object in the world and keeps them in step with the sim.
// Imperative on purpose: the scene has thousands of parts that change every frame,
// so it lives outside React and is mounted once via <primitive>.

import * as THREE from 'three';
import { NET } from '../sim';
import { STATION_WORLDS, gateOpen, type StationWorld } from '../stations';
import { PF_H } from '../stations/kit';
import { carBuild, carKind, trains, type TrainRuntime } from '../trains/system';
import { CAR_HALF } from '../trains/car';
import type { BoxPart } from '../world/builder';
import { halfWidth, sampleChainages, structureAt } from '../world/structure';
import { DEFAULT_PLOT, rng } from '../world/builder';
import { boxesToGeometry, groupBy } from './geometry';
import { getMaterial } from './materials';
import { GateSet, makeSigns, staticGroup } from './part-view';
import { disposeCache, redrawLive, type SignCache, type SignSet } from './sign-set';
import type { SignContent } from '../signs/content';
import { buildTrack } from './track';

const STATION_IN = 520, STATION_OUT = 680, TRAIN_RANGE = 750;
/** A station with a bigger plot is mounted from correspondingly further away. */
const BASE_RADIUS = Math.hypot(DEFAULT_PLOT.x, DEFAULT_PLOT.z) + 5;

interface StationView {
  group: THREE.Group;
  cache: SignCache;
  gates: GateSet | null;
  dispose: () => void;
}

function mountStation(w: StationWorld): StationView {
  const group = new THREE.Group();
  group.position.set(w.frame.x, w.frame.y, w.frame.z);
  group.rotation.y = w.frame.yaw;
  const st = staticGroup(w.build);
  group.add(st.group);
  const cache: SignCache = new Map();
  group.add(makeSigns(w.build, cache).group);
  const gates = w.build.gates.length ? new GateSet(w.build.gates, false) : null;
  if (gates) group.add(gates.mesh);
  if (gates?.glass) group.add(gates.glass);
  group.updateMatrixWorld(true);
  return {
    group, cache, gates,
    dispose: () => {
      st.dispose();
      disposeCache(cache);
      gates?.dispose();
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
}

const lampGeo = new THREE.BoxGeometry(0.06, 0.16, 0.3);
const white = new THREE.MeshBasicMaterial({ color: '#fff7d6' });
const red = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });

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
  const view: TrainView = { group, cars: [], gates: [], signs: [], cache, lamps: { low: [], high: [] } };
  const resolve = (c: SignContent): SignContent =>
    c.k === 'lcd' ? { ...c, train: t.index } : c.k === 'dest' ? { ...c, dir: destDir(t) } : c;
  for (let c = 0; c < n; c++) {
    const kind = carKind(c, n);
    const { build } = carBuild(line.id, kind);
    const g = new THREE.Group();
    g.rotation.order = 'YZX';
    g.add(staticGroup(build, `car:${line.id}:${kind}`).group);
    const signs = makeSigns(build, cache, resolve);
    g.add(signs.group);
    const gates = new GateSet(build.gates, true);
    g.add(gates.mesh);
    if (gates.glass) g.add(gates.glass);
    if (kind !== 'mid') {
      const s = kind === 'cabLow' ? -1 : 1;
      for (const z of [-0.95, 0.95]) {
        const m = new THREE.Mesh(lampGeo, white);
        m.position.set(s * (CAR_HALF + 0.02), PF_H + 0.72, z);
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
      return Math.abs(dx * c - dz * s) < w.build.plot.x + m && Math.abs(dx * s + dz * c) < w.build.plot.z + m;
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
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(shape), getMaterial('ground'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  group.add(ground);

  // Blocks of plain buildings near anything you can see from the surface.
  const r = rng(2026);
  const boxes: BoxPart[] = [];
  const mats = ['facade:grid:#cfcabd', 'facade:grid:#b7b1a4', 'facade:apt:#dcd6c9', 'facade:office:#8ea0ae', 'facade:grid:#a9a39a', 'facade:apt:#c9d0d4'];
  const PITCH = 46;
  for (let gx = -400; gx < 4700; gx += PITCH) {
    for (let gz = -2400; gz < 2300; gz += PITCH) {
      const x = gx + (r() - 0.5) * 8, z = gz + (r() - 0.5) * 8;
      const w = 16 + r() * 16, d = 16 + r() * 16;
      const nearStation = STATION_WORLDS.some((s) => Math.hypot(s.frame.x - x, s.frame.z - z) < 480);
      const openDist = openPts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), Infinity);
      if (!nearStation && openDist > 330) continue;
      if (inPlot(x, z, 24) || openDist < 34) continue;
      const centre = Math.hypot(x - 1870, z);
      const tall = Math.max(0, 1 - centre / 1500);
      const h = 9 + r() * 16 + tall * tall * r() * 70;
      boxes.push({ mat: mats[Math.floor(r() * mats.length)], min: [x - w / 2, -0.03, z - d / 2], max: [x + w / 2, h, z + d / 2], solid: false });
    }
  }
  for (const [mat, list] of groupBy(boxes)) {
    const m = new THREE.Mesh(boxesToGeometry(list), getMaterial(mat));
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

  constructor() {
    this.root.add(buildBackdrop());
    for (const sim of NET) this.root.add(buildTrack(sim));
  }

  /** Mount/unmount stations by distance and move the trains. Call after the sim tick. */
  update(dt: number, cam: THREE.Vector3) {
    // Stations: at most one mount per frame to spread the cost.
    let mounted = false;
    for (const w of STATION_WORLDS) {
      const d = Math.hypot(w.frame.x - cam.x, w.frame.z - cam.z) - (w.frame.radius - BASE_RADIUS);
      const v = this.stations.get(w.def.id);
      if (!v && d < STATION_IN && !mounted) {
        const nv = mountStation(w);
        this.stations.set(w.def.id, nv);
        this.root.add(nv.group);
        mounted = true;
      } else if (v && d > STATION_OUT) {
        this.root.remove(v.group);
        v.dispose();
        this.stations.delete(w.def.id);
      } else if (v?.gates) {
        v.gates.update((g) => gateOpen(g.line!, g.stop!, g.track!));
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
      t.cars.forEach((f, c) => {
        const g = v!.cars[c];
        g.position.set(f.x, f.y, f.z);
        g.rotation.set(0, f.yaw, f.pitch);
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
