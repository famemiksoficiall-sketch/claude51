import * as THREE from 'three';
import { LABEL_MM, LID_MAP_R } from './canTextures.js';

/**
 * Procedural 355 mL aluminium beverage can, modelled from a millimetre profile.
 * 1 world unit = 50 mm; the can is centred on its origin (y ∈ [-1.22, 1.22]).
 */
export const MM = 1 / 50;
export const CAN_H = 122.15;
const Y0 = CAN_H / 2;
export const toWorldY = (yMM) => (yMM - Y0) * MM;

// ── Profiles (radius, height) in mm ──────────────────────────────────────
// Concave bottom dome → standing ring → bottom taper (bare aluminium)
export const PROFILE_BOTTOM = [
  [0, 10.6], [4, 10.5], [8, 10.1], [12, 9.35], [15.5, 8.4], [18.5, 7.2], [20.8, 5.9], [22.4, 4.5],
  [23.3, 3.0], [23.8, 1.6], [24.2, 0.6], [24.8, 0.08], [25.5, 0.0], [26.1, 0.2], [26.6, 0.7],
  [27.4, 1.8], [28.6, 3.6], [30.0, 5.7], [31.3, 7.8], [32.3, 9.6], [32.85, 11.0], [33.0, 12.0],
];

// Printed wall: straight body → tapered shoulder → neck.
export const PROFILE_PRINT = (() => {
  const p = [];
  for (let y = 12; y <= 99; y += 3) p.push([33.0, y]);
  p.push([33.0, 100], [32.93, 101], [32.75, 102], [32.45, 103.2], [32.0, 104.4], [31.45, 105.6], [30.8, 106.9],
    [30.1, 108.2], [29.35, 109.6], [28.6, 111.0], [28.0, 112.2], [27.5, 113.2], [27.15, 114.0]);
  return p;
})();

// Neck → rolled rim (double seam) → chuck wall → countersink → lid panel edge.
export const PROFILE_TOP = [
  [27.15, 114.0], [26.95, 114.8], [26.9, 115.6], [27.0, 116.5], [27.3, 117.5], [27.7, 118.5], [28.0, 119.5],
  [28.12, 120.4], [28.05, 121.2], [27.75, 121.8], [27.3, 122.1], [26.8, 122.15], [26.35, 121.95],
  [26.05, 121.4], [25.95, 120.4], [25.92, 119.2], [25.85, 117.8], [25.7, 116.4], [25.45, 115.3],
  [25.1, 114.75], [24.7, 114.7], [24.45, 115.1], [24.3, 115.8], [24.15, 116.25],
];

// Lid panel with a stiffening bead (planar UVs are applied afterwards).
export const PROFILE_LID = [
  [24.15, 116.25], [23.4, 116.35], [22.4, 116.3], [21.6, 116.05], [20.9, 115.98], [20.2, 116.15],
  [19.0, 116.4], [15.0, 116.55], [10.0, 116.62], [5.0, 116.66], [0, 116.68],
];

/**
 * Custom lathe: analytic smooth normals from the profile, seam placed at the back
 * (u = 0.5 faces +Z), and optional arc-length V for undistorted label mapping.
 */
export function buildLathe(profile, segments, { arcV = false, vRange = [0, 1] } = {}) {
  const n = profile.length;
  const pts = profile.map(([r, y]) => new THREE.Vector2(r * MM, toWorldY(y)));
  // Per-point 2D normals (average of adjacent segment normals).
  const nr = new Float32Array(n);
  const ny = new Float32Array(n);
  const segN = [];
  for (let j = 0; j < n - 1; j++) {
    const dx = pts[j + 1].x - pts[j].x;
    const dy = pts[j + 1].y - pts[j].y;
    const l = Math.hypot(dx, dy) || 1;
    segN.push([dy / l, -dx / l]);
  }
  for (let j = 0; j < n; j++) {
    const a = segN[Math.max(0, j - 1)];
    const b = segN[Math.min(n - 2, j)];
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    const l = Math.hypot(x, y) || 1;
    nr[j] = x / l;
    ny[j] = y / l;
  }
  // V coordinates.
  const vs = new Float32Array(n);
  if (arcV) {
    let acc = 0;
    const len = [0];
    for (let j = 1; j < n; j++) {
      acc += pts[j].distanceTo(pts[j - 1]);
      len.push(acc);
    }
    for (let j = 0; j < n; j++) vs[j] = vRange[0] + (len[j] / acc) * (vRange[1] - vRange[0]);
  } else for (let j = 0; j < n; j++) vs[j] = j / (n - 1);

  const cols = segments + 1;
  const pos = new Float32Array(cols * n * 3);
  const nor = new Float32Array(cols * n * 3);
  const uv = new Float32Array(cols * n * 2);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const phi = Math.PI + u * Math.PI * 2;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    for (let j = 0; j < n; j++) {
      const k = i * n + j;
      const r = pts[j].x;
      pos[k * 3] = s * r;
      pos[k * 3 + 1] = pts[j].y;
      pos[k * 3 + 2] = c * r;
      nor[k * 3] = s * nr[j];
      nor[k * 3 + 1] = ny[j];
      nor[k * 3 + 2] = c * nr[j];
      uv[k * 2] = u;
      uv[k * 2 + 1] = vs[j];
    }
  }
  const index = [];
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = (i + 1) * n + j;
      const c = (i + 1) * n + j + 1;
      const d = i * n + j + 1;
      index.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/** Re-map UVs to a planar top-down projection for the lid bump map. */
export function planarLidUV(geometry) {
  const p = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const R = LID_MAP_R * MM;
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, 0.5 + p.getX(i) / (2 * R), 0.5 - p.getZ(i) / (2 * R));
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Pull tab: extruded outline with finger hole, softly bevelled. Dimensions in mm. */
export function buildTabGeometry() {
  const s = new THREE.Shape();
  // Outline in shape space: y → world −z after rotation; nose at y = −6 (front, over the opening).
  s.moveTo(-3.6, -6.4);
  s.bezierCurveTo(-1.5, -7.3, 1.5, -7.3, 3.6, -6.4);
  s.bezierCurveTo(5.6, -5.4, 6.4, -2.0, 6.4, 1.5);
  s.lineTo(6.4, 9.2);
  s.bezierCurveTo(6.4, 13.2, 4.0, 14.6, 0, 14.6);
  s.bezierCurveTo(-4.0, 14.6, -6.4, 13.2, -6.4, 9.2);
  s.lineTo(-6.4, 1.5);
  s.bezierCurveTo(-6.4, -2.0, -5.6, -5.4, -3.6, -6.4);
  // Finger hole.
  const hole = new THREE.Path();
  hole.moveTo(-4.0, 6.0);
  hole.lineTo(4.0, 6.0);
  hole.bezierCurveTo(4.6, 6.0, 4.7, 6.6, 4.7, 7.6);
  hole.lineTo(4.7, 9.6);
  hole.bezierCurveTo(4.7, 12.0, 2.6, 12.9, 0, 12.9);
  hole.bezierCurveTo(-2.6, 12.9, -4.7, 12.0, -4.7, 9.6);
  hole.lineTo(-4.7, 7.6);
  hole.bezierCurveTo(-4.7, 6.6, -4.6, 6.0, -4.0, 6.0);
  s.holes.push(hole);
  // Hinge slot around the rivet (U-shaped cut).
  const slot = new THREE.Path();
  slot.moveTo(-3.4, -2.6);
  slot.bezierCurveTo(-3.4, -4.6, 3.4, -4.6, 3.4, -2.6);
  slot.lineTo(3.4, 2.6);
  slot.lineTo(2.8, 2.6);
  slot.lineTo(2.8, -2.4);
  slot.bezierCurveTo(2.8, -3.9, -2.8, -3.9, -2.8, -2.4);
  slot.lineTo(-2.8, 2.6);
  slot.lineTo(-3.4, 2.6);
  slot.closePath();
  s.holes.push(slot);

  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.32, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.22, bevelSegments: 3, curveSegments: 18,
  });
  g.rotateX(-Math.PI / 2);
  g.scale(MM, MM, MM);
  g.computeVertexNormals();
  return g;
}

export function buildRivetGeometry() {
  const pts = [[0, 0.95], [0.8, 0.9], [1.4, 0.7], [1.75, 0.38], [1.9, 0.0]].map(([r, y]) => new THREE.Vector2(r * MM, y * MM));
  return new THREE.LatheGeometry(pts, 32);
}

export { LABEL_MM };
