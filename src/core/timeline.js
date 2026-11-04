import * as THREE from 'three';
import { KEYFRAMES, LIGHT_PRESETS, ATMOSPHERES, REDUCED_MOTION } from '../config.js';

/**
 * Monotone cubic (Fritsch–Carlson) interpolation over non-uniform times.
 * Smooth (C1), never overshoots, and holds are perfectly still.
 */
class MonotoneTrack {
  constructor(times, values) {
    this.t = times;
    this.v = values;
    const n = times.length;
    const d = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) d[i] = (values[i + 1] - values[i]) / (times[i + 1] - times[i]);
    const m = new Array(n);
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * (times[i + 1] - times[i]) + (times[i] - times[i - 1]);
        const w2 = (times[i + 1] - times[i]) + 2 * (times[i] - times[i - 1]);
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    // Endpoints settle (zero velocity) so the film starts & ends at rest.
    m[0] = 0;
    m[n - 1] = 0;
    this.m = m;
  }

  at(x, seg) {
    const { t, v, m } = this;
    const i = seg.i;
    if (seg.clamp === -1) return v[0];
    if (seg.clamp === 1) return v[v.length - 1];
    const h = t[i + 1] - t[i];
    const u = seg.u;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * h * m[i + 1];
  }
}

const LIGHT_NAMES = ['key', 'rimL', 'rimR', 'top', 'accent'];
const CHANNELS_SCALAR = ['studio', 'factory', 'cold', 'energy', 'final', 'wet', 'ice', 'mist', 'liquid', 'dof', 'envRot'];

/** Resolve inheritance so every key carries every channel. */
function resolveKeys(keys) {
  const out = [];
  let prev = null;
  for (const k of keys) {
    const r = prev ? structuredClone(prev) : {};
    r.s = k.s;
    if (k.can) r.can = { ...(r.can || {}), ...k.can };
    if (k.cam) r.cam = { ...(r.cam || {}), ...k.cam };
    for (const key of ['frame', 'frameMobile', 'light', 'atmo', ...CHANNELS_SCALAR]) {
      if (k[key] !== undefined) r[key] = k[key];
    }
    out.push(r);
    prev = r;
  }
  return out;
}

const hexToLinear = (hex) => new THREE.Color(hex);

/**
 * The unified timeline: maps scene time `s` to the complete state of the film
 * (can, camera, lighting, atmosphere, environment weights and effects).
 * Allocation-free per frame: evaluate() writes into a reusable state object.
 */
export class Timeline {
  constructor({ reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.keys = resolveKeys(KEYFRAMES);
    if (reducedMotion) {
      this.keys.forEach((k, i) => {
        k.can.yaw = REDUCED_MOTION.yaw[i] ?? k.can.yaw;
        k.can.tilt = k.can.tilt.map((a) => a * REDUCED_MOTION.tilt);
        k.can.float *= 0.3;
        k.dof *= REDUCED_MOTION.dofScale;
      });
    }
    const times = this.keys.map((k) => k.s);
    this.times = times;
    this.start = times[0];
    this.end = times[times.length - 1];
    const track = (fn) => new MonotoneTrack(times, this.keys.map(fn));

    this.tracks = {
      px: track((k) => k.can.pos[0]),
      py: track((k) => k.can.pos[1]),
      pz: track((k) => k.can.pos[2]),
      tiltX: track((k) => k.can.tilt[0]),
      tiltZ: track((k) => k.can.tilt[1]),
      yaw: track((k) => k.can.yaw),
      float: track((k) => k.can.float),
      az: track((k) => k.cam.az),
      el: track((k) => k.cam.el),
      dist: track((k) => k.cam.dist),
      lx: track((k) => k.cam.look[0]),
      ly: track((k) => k.cam.look[1]),
      lz: track((k) => k.cam.look[2]),
      fov: track((k) => k.cam.fov),
      fx: track((k) => k.frame[0]),
      fy: track((k) => k.frame[1]),
      fmx: track((k) => k.frameMobile[0]),
      fmy: track((k) => k.frameMobile[1]),
    };
    for (const c of CHANNELS_SCALAR) this.tracks[c] = track((k) => k[c]);

    // Preset blending: pre-resolve colours to linear THREE.Color once.
    this.lightKeys = this.keys.map((k) => LIGHT_PRESETS[k.light]);
    this.atmoKeys = this.keys.map((k) => ATMOSPHERES[k.atmo]);
    this._lightColors = new Map();
    for (const p of Object.values(LIGHT_PRESETS)) {
      for (const name of ['key', 'rimL', 'rimR', 'top', 'accent']) this._lightColors.set(p[name], hexToLinear(p[name].color));
      this._lightColors.set(p.hemi, { sky: hexToLinear(p.hemi.sky), ground: hexToLinear(p.hemi.ground) });
    }
    this._atmoColors = new Map(Object.values(ATMOSPHERES).map((a) => [a, hexToLinear(a.bg)]));

    // Reusable state.
    const light = () => ({ pos: new THREE.Vector3(), color: new THREE.Color(), intensity: 0 });
    this.state = {
      s: 0,
      can: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), yaw: 0, tiltX: 0, tiltZ: 0, float: 0 },
      cam: { az: 0, el: 0, dist: 5, look: new THREE.Vector3(), fov: 30, frame: new THREE.Vector2(), frameMobile: new THREE.Vector2() },
      lights: { key: light(), rimL: light(), rimR: light(), top: light(), accent: light() },
      hemi: { sky: new THREE.Color(), ground: new THREE.Color(), intensity: 0 },
      envIntensity: 1,
      exposure: 1,
      bg: new THREE.Color(),
      fog: 0.04,
      bloom: 0.2,
      env: { studio: 0, factory: 0, cold: 0, energy: 0, final: 0 },
      wet: 0, ice: 0, mist: 0, liquid: 0, dof: 0, envRot: 0,
    };
    this._seg = { i: 0, u: 0, clamp: 0 };
    this._qa = new THREE.Quaternion();
    this._qb = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._axisY = new THREE.Vector3(0, 1, 0);
    this._sNow = 0;
    this._g = (name) => this.tracks[name].at(this._sNow, this._seg);
  }

  _segment(s) {
    const t = this.times;
    const seg = this._seg;
    if (s <= t[0]) { seg.clamp = -1; seg.i = 0; seg.u = 0; return seg; }
    if (s >= t[t.length - 1]) { seg.clamp = 1; seg.i = t.length - 2; seg.u = 1; return seg; }
    let i = 0;
    while (i < t.length - 2 && s >= t[i + 1]) i++;
    seg.clamp = 0;
    seg.i = i;
    seg.u = (s - t[i]) / (t[i + 1] - t[i]);
    return seg;
  }

  evaluate(s) {
    const st = this.state;
    const seg = this._segment(s);
    const g = this._g;
    this._sNow = s;
    st.s = s;

    st.can.pos.set(g('px'), g('py'), g('pz'));
    st.can.tiltX = g('tiltX');
    st.can.tiltZ = g('tiltZ');
    st.can.yaw = g('yaw');
    st.can.float = Math.max(0, g('float'));
    // Orientation assembled as quaternions: attitude (tilt) ⊗ spin about the can axis.
    this._e.set(THREE.MathUtils.degToRad(st.can.tiltX), 0, THREE.MathUtils.degToRad(st.can.tiltZ), 'XZY');
    this._qa.setFromEuler(this._e);
    this._qb.setFromAxisAngle(this._axisY, THREE.MathUtils.degToRad(st.can.yaw));
    st.can.quat.copy(this._qa).multiply(this._qb);

    st.cam.az = g('az');
    st.cam.el = g('el');
    st.cam.dist = g('dist');
    st.cam.look.set(g('lx'), g('ly'), g('lz'));
    st.cam.fov = g('fov');
    st.cam.frame.set(g('fx'), g('fy'));
    st.cam.frameMobile.set(g('fmx'), g('fmy'));

    for (const c of CHANNELS_SCALAR) {
      const v = g(c);
      if (c in st.env) st.env[c] = THREE.MathUtils.clamp(v, 0, 1);
      else st[c] = v;
    }

    // Preset blends use a smoothstep across each segment.
    const i = seg.i;
    const u = seg.clamp === -1 ? 0 : seg.clamp === 1 ? 1 : seg.u;
    const w = u * u * (3 - 2 * u);
    const A = this.lightKeys[i];
    const B = this.lightKeys[Math.min(i + 1, this.lightKeys.length - 1)];
    for (const name of LIGHT_NAMES) {
      const L = st.lights[name];
      const a = A[name];
      const b = B[name];
      L.pos.set(a.pos[0] + (b.pos[0] - a.pos[0]) * w, a.pos[1] + (b.pos[1] - a.pos[1]) * w, a.pos[2] + (b.pos[2] - a.pos[2]) * w);
      L.color.copy(this._lightColors.get(a)).lerp(this._lightColors.get(b), w);
      L.intensity = a.intensity + (b.intensity - a.intensity) * w;
    }
    const ha = this._lightColors.get(A.hemi);
    const hb = this._lightColors.get(B.hemi);
    st.hemi.sky.copy(ha.sky).lerp(hb.sky, w);
    st.hemi.ground.copy(ha.ground).lerp(hb.ground, w);
    st.hemi.intensity = A.hemi.intensity + (B.hemi.intensity - A.hemi.intensity) * w;
    st.envIntensity = A.envIntensity + (B.envIntensity - A.envIntensity) * w;
    st.exposure = A.exposure + (B.exposure - A.exposure) * w;

    const aa = this.atmoKeys[i];
    const ab = this.atmoKeys[Math.min(i + 1, this.atmoKeys.length - 1)];
    st.bg.copy(this._atmoColors.get(aa)).lerp(this._atmoColors.get(ab), w);
    st.fog = aa.fog + (ab.fog - aa.fog) * w;
    st.bloom = aa.bloom + (ab.bloom - aa.bloom) * w;
    return st;
  }
}
