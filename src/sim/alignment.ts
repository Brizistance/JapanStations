// Horizontal track alignment: a polyline whose corners are filleted with circular arcs.
// Pure TS, no rendering.

export interface PathPoint {
  x: number;
  z: number;
  /** Unit tangent. */
  tx: number;
  tz: number;
}

export class Alignment {
  readonly xs: number[] = [];
  readonly zs: number[] = [];
  readonly cum: number[] = [];
  readonly length: number;

  constructor(vertices: [number, number][], radius: number) {
    const push = (x: number, z: number) => {
      const n = this.xs.length;
      if (n > 0 && Math.hypot(x - this.xs[n - 1], z - this.zs[n - 1]) < 1e-6) return;
      this.xs.push(x);
      this.zs.push(z);
    };
    push(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length - 1; i++) {
      const [px, pz] = vertices[i - 1];
      const [vx, vz] = vertices[i];
      const [nx, nz] = vertices[i + 1];
      const l1 = Math.hypot(vx - px, vz - pz);
      const l2 = Math.hypot(nx - vx, nz - vz);
      const d1x = (vx - px) / l1, d1z = (vz - pz) / l1;
      const d2x = (nx - vx) / l2, d2z = (nz - vz) / l2;
      const dot = Math.min(1, Math.max(-1, d1x * d2x + d1z * d2z));
      const theta = Math.acos(dot);
      if (theta < 1e-4) {
        push(vx, vz);
        continue;
      }
      const t = radius * Math.tan(theta / 2);
      const sgn = Math.sign(d1x * d2z - d1z * d2x);
      const ax = vx - d1x * t, az = vz - d1z * t;
      const nxr = -d1z * sgn, nzr = d1x * sgn;
      const cx = ax + nxr * radius, cz = az + nzr * radius;
      const steps = Math.max(2, Math.ceil(theta / (Math.PI / 180)));
      const ox = -nxr * radius, oz = -nzr * radius;
      for (let k = 0; k <= steps; k++) {
        const a = (sgn * theta * k) / steps;
        const c = Math.cos(a), s = Math.sin(a);
        push(cx + ox * c - oz * s, cz + ox * s + oz * c);
      }
    }
    const last = vertices[vertices.length - 1];
    push(last[0], last[1]);
    let acc = 0;
    this.cum.push(0);
    for (let i = 1; i < this.xs.length; i++) {
      acc += Math.hypot(this.xs[i] - this.xs[i - 1], this.zs[i] - this.zs[i - 1]);
      this.cum.push(acc);
    }
    this.length = acc;
  }

  private segIndex(s: number): number {
    const n = this.cum.length;
    if (s <= 0) return 0;
    if (s >= this.length) return n - 2;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** Point and tangent at distance `s`. Extrapolates straight beyond either end. */
  pointAt(s: number): PathPoint {
    const i = this.segIndex(s);
    const len = this.cum[i + 1] - this.cum[i];
    const tx = (this.xs[i + 1] - this.xs[i]) / len;
    const tz = (this.zs[i + 1] - this.zs[i]) / len;
    const d = s - this.cum[i];
    return { x: this.xs[i] + tx * d, z: this.zs[i] + tz * d, tx, tz };
  }

  /** Closest point on the path to (x, z). */
  project(x: number, z: number): { s: number; dist: number } {
    let best = Infinity, bestS = 0;
    for (let i = 0; i < this.xs.length - 1; i++) {
      const ax = this.xs[i], az = this.zs[i];
      const bx = this.xs[i + 1], bz = this.zs[i + 1];
      const len = this.cum[i + 1] - this.cum[i];
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      const t = Math.min(len, Math.max(0, (x - ax) * ux + (z - az) * uz));
      const d = Math.hypot(ax + ux * t - x, az + uz * t - z);
      if (d < best) {
        best = d;
        bestS = this.cum[i] + t;
      }
    }
    return { s: bestS, dist: best };
  }
}
