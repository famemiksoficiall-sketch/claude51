import * as THREE from 'three';
import { BRAND } from '../config.js';

/**
 * Procedural product textures, generated once at load time on the CPU.
 *
 *   label colour map      up to 4096 × 2048 (sRGB)
 *   roughness/metal map   same size, glTF channel packing (G = roughness, B = metalness)
 *   body normal map       2048 × 1024 (ironing striations, restrained scratches, dents)
 *   lid height/rough map  1024 × 1024 (scored opening, beads, rivet)
 *   condensation map      1024 × 1024 (bead normals, appearance threshold, coverage)
 *
 * The label is laid out in physical millimetres so typography is never stretched:
 * printed band = 207.3 mm (circumference, Ø 66 mm) × 103.2 mm (arc length of the
 * printed wall incl. shoulder) — an aspect of ≈ 2.01 : 1 matched by a 2 : 1 texture.
 */

export const LABEL_MM = { w: 207.35, h: 103.2 };

// Small deterministic PRNG so every load produces the same can.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const FONT = '"Archivo Variable", "Archivo", "Arial Black", Arial, sans-serif';

/* ───────────────────────────── Pepsi globe ───────────────────────────── */

/** Globe drawn in a unit space (radius 1) — red crown, white wave, blue base. */
function globePaths(ctx, cx, cy, R) {
  const P = (x, y) => [cx + x * R, cy + y * R];
  // Upper boundary of the white wave (and lower edge of the red crown).
  const top = (x) => -0.2 + 0.2 * Math.sin(x * 1.55 + 0.25) - 0.06 * x;
  // Lower boundary of the white wave.
  const bot = (x) => 0.24 + 0.17 * Math.sin(x * 1.5 + 1.15) - 0.04 * x;
  return { P, top, bot };
}

function drawGlobe(ctx, cx, cy, R, paint, { ring = true, word = true, wordScale = 1 } = {}) {
  const { P, top, bot } = globePaths(ctx, cx, cy, R);
  ctx.save();
  if (ring) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.055, 0, Math.PI * 2);
    ctx.fillStyle = paint.white;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  // Blue base.
  ctx.fillStyle = paint.globeBlue;
  ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  // White wave.
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const x = -1.05 + (2.1 * i) / 64;
    ctx.lineTo(...P(x, top(x)));
  }
  for (let i = 64; i >= 0; i--) {
    const x = -1.05 + (2.1 * i) / 64;
    ctx.lineTo(...P(x, bot(x)));
  }
  ctx.closePath();
  ctx.fillStyle = paint.white;
  ctx.fill();
  // Red crown.
  ctx.beginPath();
  ctx.moveTo(...P(-1.1, -1.1));
  ctx.lineTo(...P(1.1, -1.1));
  for (let i = 64; i >= 0; i--) {
    const x = -1.05 + (2.1 * i) / 64;
    ctx.lineTo(...P(x, top(x)));
  }
  ctx.closePath();
  ctx.fillStyle = paint.red;
  ctx.fill();
  ctx.restore();

  if (word) {
    // Wordmark sits on the white wave.
    ctx.save();
    const size = R * 0.36 * wordScale;
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.fontStretch = 'expanded';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.02}px`;
    ctx.fillStyle = paint.wordmark;
    ctx.fillText('PEPSI', cx, cy + R * 0.035 + size * 0.04);
    ctx.restore();
  }
}

/* ───────────────────────────── Label ───────────────────────────── */

/**
 * Draws the whole label. `paint` maps semantic inks to fill styles so the same
 * artwork can be rendered into the colour map and the material map.
 */
function drawLabel(ctx, W, H, paint, mode) {
  const k = W / LABEL_MM.w; // px per mm
  const mm = (v) => v * k;
  const frontX = W * 0.5;

  // Base coat.
  if (mode === 'color') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#031651');
    g.addColorStop(0.16, BRAND.deepBlue);
    g.addColorStop(0.5, '#0a2fae');
    g.addColorStop(0.86, BRAND.deepBlue);
    g.addColorStop(1, '#021243');
    ctx.fillStyle = g;
  } else ctx.fillStyle = paint.base;
  ctx.fillRect(0, 0, W, H);

  // Tonal energy waves wrapping the body (very low contrast, part of the artwork).
  if (mode === 'color') {
    ctx.save();
    for (let n = 0; n < 3; n++) {
      ctx.beginPath();
      const yo = mm(30 + n * 22);
      for (let x = -10; x <= W + 10; x += 16) {
        const t = x / W;
        ctx.lineTo(x, yo + mm(9) * Math.sin(t * Math.PI * 2 * 2 + n * 1.3) + mm(4) * Math.sin(t * Math.PI * 2 * 5 + n));
      }
      ctx.lineWidth = mm(5.5 - n * 1.4);
      ctx.strokeStyle = `rgba(80, 140, 255, ${0.07 - n * 0.015})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Exposed aluminium at the neck and lower body edge.
  ctx.fillStyle = paint.silver;
  ctx.fillRect(0, 0, W, mm(1.4));
  ctx.fillRect(0, H - mm(2.2), W, mm(2.2));

  // Fine metallic pin-lines framing the printed field.
  ctx.fillStyle = paint.silver;
  ctx.fillRect(0, mm(15.2), W, mm(0.45));
  ctx.fillRect(0, H - mm(8.6), W, mm(0.45));

  // Restrained red accent stripe on the shoulder.
  ctx.fillStyle = paint.red;
  ctx.fillRect(0, mm(12.4), W, mm(1.1));

  // Hero globe + wordmark on the front.
  drawGlobe(ctx, frontX, mm(52), mm(29.5), paint);

  // Vertical wordmark down the right flank (reads bottom-to-top).
  ctx.save();
  ctx.translate(frontX + mm(52), mm(52));
  ctx.rotate(-Math.PI / 2);
  ctx.font = `900 ${mm(15)}px ${FONT}`;
  ctx.fontStretch = 'expanded';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${mm(0.6)}px`;
  ctx.fillStyle = paint.whiteSoft;
  ctx.fillText('PEPSI', 0, 0);
  ctx.restore();

  // Back panel: compact lock-up (wraps across the seam).
  for (const bx of [0, W]) {
    drawGlobe(ctx, bx, mm(36), mm(11.5), paint, { word: false });
    ctx.save();
    ctx.font = `900 ${mm(9.5)}px ${FONT}`;
    ctx.fontStretch = 'expanded';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${mm(0.5)}px`;
    ctx.fillStyle = paint.white;
    ctx.fillText('PEPSI', bx, mm(58));
    ctx.font = `600 ${mm(3)}px ${FONT}`;
    ctx.fontStretch = 'normal';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${mm(0.35)}px`;
    ctx.fillStyle = paint.whiteSoft;
    ctx.fillText('CONCEPT EDITION  ·  SERVE ICE COLD', bx, mm(68));
    ctx.restore();
  }

  // Volume line, front bottom.
  ctx.save();
  ctx.font = `600 ${mm(3.3)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${mm(0.4)}px`;
  ctx.fillStyle = paint.whiteSoft;
  ctx.fillText('12 FL OZ (355 mL)', frontX, H - mm(14));
  ctx.restore();

  // Tiny red tick marks around the lower band (printing registration-style detail).
  ctx.fillStyle = paint.red;
  for (let i = 0; i < 48; i++) {
    const x = (i / 48) * W;
    ctx.fillRect(x, H - mm(6.2), mm(0.45), mm(1.6));
  }
}

const COLOR_PAINT = {
  base: BRAND.deepBlue,
  globeBlue: '#1756ff',
  red: BRAND.red,
  white: BRAND.white,
  whiteSoft: 'rgba(235,242,255,0.92)',
  wordmark: BRAND.black,
  silver: '#c9ced6',
};

// Material paint: R = 1 (unused AO), G = roughness, B = metalness.
const orm = (r, m) => `rgb(255, ${Math.round(r * 255)}, ${Math.round(m * 255)})`;
const ORM_PAINT = {
  base: orm(0.36, 0.72), // translucent blue ink over aluminium → metallic sheen
  globeBlue: orm(0.34, 0.55),
  red: orm(0.36, 0.45),
  white: orm(0.42, 0.06), // opaque white base coat
  whiteSoft: orm(0.42, 0.1),
  wordmark: orm(0.4, 0.15),
  silver: orm(0.22, 1.0), // exposed metal
};

function columnNoise(W, rand, octaves = [[0.5, 1], [0.3, 4], [0.2, 24]]) {
  // Wrapping 1-D value noise along u — the vertical ironing striations.
  const out = new Float32Array(W);
  for (const [amp, cells] of octaves) {
    const n = Math.max(2, Math.round((W / 4096) * 512 * cells / 4) * 4);
    const pts = Array.from({ length: n }, () => rand() * 2 - 1);
    for (let x = 0; x < W; x++) {
      const f = (x / W) * n;
      const i = Math.floor(f);
      const t = f - i;
      const a = pts[i % n];
      const b = pts[(i + 1) % n];
      const s = t * t * (3 - 2 * t);
      out[x] += amp * (a + (b - a) * s);
    }
  }
  // Add per-pixel grain.
  for (let x = 0; x < W; x++) out[x] += (rand() * 2 - 1) * 0.25;
  return out;
}

export async function createLabelTextures(renderer, { size = 4096 } = {}) {
  const W = size;
  const H = size / 2;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const colorCanvas = makeCanvas(W, H);
  drawLabel(colorCanvas.getContext('2d'), W, H, COLOR_PAINT, 'color');
  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;
  map.wrapS = THREE.RepeatWrapping;

  await nextFrame();

  const ormCanvas = makeCanvas(W, H);
  const octx = ormCanvas.getContext('2d', { willReadFrequently: true });
  drawLabel(octx, W, H, ORM_PAINT, 'orm');
  // Fine roughness variation: striations + grain, restrained.
  const img = octx.getImageData(0, 0, W, H);
  const d = img.data;
  const rand = rng(7);
  const col = columnNoise(W, rand);
  for (let y = 0; y < H; y++) {
    const rowMod = 0.04 * Math.sin((y / H) * 37.0);
    let p = y * W * 4;
    for (let x = 0; x < W; x++, p += 4) {
      const v = 1 + col[x] * 0.12 + rowMod + (((x * 73856093) ^ (y * 19349663)) & 255) / 255 * 0.06 - 0.03;
      d[p + 1] = Math.min(255, d[p + 1] * v);
    }
  }
  octx.putImageData(img, 0, 0);
  const ormMap = new THREE.CanvasTexture(ormCanvas);
  ormMap.colorSpace = THREE.NoColorSpace;
  ormMap.anisotropy = maxAniso;
  ormMap.wrapS = THREE.RepeatWrapping;
  return { map, ormMap, canvas: colorCanvas };
}

export async function loadLabelOverride(url, renderer) {
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/* ───────────────────────────── Body normal map ───────────────────────────── */

export async function createBodyNormal(renderer, { size = 2048 } = {}) {
  const W = size;
  const H = size / 2;
  const rand = rng(21);
  const h = new Float32Array(W * H);
  const col = columnNoise(W, rand, [[0.6, 2], [0.4, 10], [0.25, 40]]);
  const rowNoise = columnNoise(H, rand, [[1, 1]]);
  for (let y = 0; y < H; y++) {
    const rm = 0.75 + 0.25 * rowNoise[y];
    for (let x = 0; x < W; x++) h[y * W + x] = col[x] * 0.1 * rm;
  }
  // Very soft dents — tiny manufacturing variation visible only in reflections.
  const k = W / LABEL_MM.w;
  for (let n = 0; n < 7; n++) {
    const cx = rand() * W;
    const cy = H * (0.15 + rand() * 0.7);
    const r = k * (5 + rand() * 9);
    const a = (rand() < 0.5 ? -1 : 1) * (2.2 + rand() * 2.0);
    const r2 = r * r;
    const x0 = Math.floor(cx - r * 2.5);
    const x1 = Math.ceil(cx + r * 2.5);
    for (let y = Math.max(0, Math.floor(cy - r * 2.5)); y < Math.min(H, cy + r * 2.5); y++) {
      for (let xx = x0; xx < x1; xx++) {
        const x = ((xx % W) + W) % W;
        const dx = xx - cx;
        const dy = y - cy;
        h[y * W + x] += a * Math.exp(-(dx * dx + dy * dy) / r2);
      }
    }
  }
  // Restrained micro-scratches.
  for (let n = 0; n < 36; n++) {
    let x = rand() * W;
    let y = rand() * H;
    const len = k * (1 + rand() * 6);
    const ang = (rand() - 0.5) * 1.2 + (rand() < 0.6 ? Math.PI / 2 : 0);
    const depth = -(0.25 + rand() * 0.5);
    const steps = Math.ceil(len);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let i = 0; i < steps; i++) {
      const xi = ((Math.round(x) % W) + W) % W;
      const yi = Math.round(y);
      if (yi >= 0 && yi < H) h[yi * W + xi] += depth * (1 - Math.abs(i / steps - 0.5) * 1.4);
      x += dx;
      y += dy;
    }
  }
  await nextFrame();
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const strength = 2.2 * (size / 2048);
  for (let y = 0; y < H; y++) {
    const ym = Math.max(0, y - 1);
    const yp = Math.min(H - 1, y + 1);
    for (let x = 0; x < W; x++) {
      const xm = (x - 1 + W) % W;
      const xp = (x + 1) % W;
      const gx = (h[y * W + xp] - h[y * W + xm]) * strength;
      const gy = (h[ym * W + x] - h[yp * W + x]) * strength;
      const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      const p = (y * W + x) * 4;
      d[p] = (-gx * inv * 0.5 + 0.5) * 255;
      d[p + 1] = (-gy * inv * 0.5 + 0.5) * 255;
      d[p + 2] = (inv * 0.5 + 0.5) * 255;
      d[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/* ───────────────────────────── Lid ───────────────────────────── */

/**
 * Lid height map (bump) in planar coordinates: canvas centre = can axis,
 * canvas +y = world +z (towards the front). Span = ± LID_MAP_R mm.
 */
export const LID_MAP_R = 28.5;

export function createLidTextures(renderer, { size = 1024 } = {}) {
  const S = size;
  const canvas = makeCanvas(S, S);
  const ctx = canvas.getContext('2d');
  const k = S / (2 * LID_MAP_R);
  const X = (mm) => S / 2 + mm * k;
  const Z = (mm) => S / 2 + mm * k;
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, S, S);

  // Spun circular texture (radial tone rings).
  const rand = rng(3);
  for (let r = 0; r < LID_MAP_R; r += 0.18) {
    const v = 128 + (rand() - 0.5) * 7;
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 0.18 * k;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Reinforcement bead ring.
  ctx.filter = `blur(${0.5 * k}px)`;
  ctx.strokeStyle = 'rgb(175,175,175)';
  ctx.lineWidth = 1.3 * k;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 20.5 * k, 0, Math.PI * 2);
  ctx.stroke();

  // Opening panel — slightly raised, with debossed stiffening bead.
  const panel = new Path2D();
  const p0 = [0, 4.2];
  panel.moveTo(X(p0[0]), Z(p0[1]));
  panel.bezierCurveTo(X(7.5), Z(4.0), X(11.5), Z(10.5), X(10.4), Z(15.5));
  panel.bezierCurveTo(X(9.2), Z(20.0), X(4.0), Z(21.3), X(0), Z(21.3));
  panel.bezierCurveTo(X(-4.0), Z(21.3), X(-9.2), Z(20.0), X(-10.4), Z(15.5));
  panel.bezierCurveTo(X(-11.5), Z(10.5), X(-7.5), Z(4.0), X(p0[0]), Z(p0[1]));
  ctx.filter = `blur(${0.35 * k}px)`;
  ctx.fillStyle = 'rgb(150,150,150)';
  ctx.fill(panel);
  // Score line: a crisp, deep groove.
  ctx.filter = 'none';
  ctx.strokeStyle = 'rgb(40,40,40)';
  ctx.lineWidth = 0.42 * k;
  ctx.stroke(panel);
  ctx.save();
  ctx.translate(X(0), Z(12.6));
  ctx.scale(0.62, 0.6);
  ctx.translate(-X(0), -Z(12.6));
  ctx.filter = `blur(${0.4 * k}px)`;
  ctx.strokeStyle = 'rgb(105,105,105)';
  ctx.lineWidth = 0.9 * k;
  ctx.stroke(panel);
  ctx.restore();

  // Rivet boss.
  ctx.filter = `blur(${0.4 * k}px)`;
  const rg = ctx.createRadialGradient(X(0), Z(0), 0, X(0), Z(0), 3.4 * k);
  rg.addColorStop(0, 'rgb(200,200,200)');
  rg.addColorStop(0.7, 'rgb(170,170,170)');
  rg.addColorStop(1, 'rgb(128,128,128)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(X(0), Z(0), 3.4 * k, 0, Math.PI * 2);
  ctx.fill();
  // Finger well behind the tab ring.
  ctx.fillStyle = 'rgb(108,108,108)';
  ctx.beginPath();
  ctx.ellipse(X(0), Z(-14.5), 6 * k, 3.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';

  const bump = new THREE.CanvasTexture(canvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { bump };
}

/* ───────────────────────────── Condensation ───────────────────────────── */

/**
 * RGBA condensation map, tiling:
 *   R,G  tangent-space normal (x, y) of the water bead
 *   B    appearance threshold — the bead is visible once wetness > B
 *   A    bead coverage / height
 */
export function createDropletTexture({ size = 1024 } = {}) {
  const S = size;
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    data[i * 4] = 128;
    data[i * 4 + 1] = 128;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 0;
  }
  const rand = rng(99);
  const stamp = (cx, cy, rx, ry, thr) => {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = (xx - cx) / rx;
        // Gravity: beads are slightly heavier at the bottom.
        const dyRaw = (yy - cy) / ry;
        const dy = dyRaw > 0 ? dyRaw * 0.88 : dyRaw * 1.08;
        const r2 = dx * dx + dy * dy;
        if (r2 >= 1) continue;
        const hgt = Math.sqrt(1 - r2);
        const x = ((xx % S) + S) % S;
        const y = ((yy % S) + S) % S;
        const p = (y * S + x) * 4;
        const a = Math.min(1, hgt * 1.6);
        if (a * 255 <= data[p + 3]) continue;
        const nx = dx;
        const ny = -dy; // canvas y down → tangent +v up
        const len = Math.sqrt(nx * nx + ny * ny + hgt * hgt) || 1;
        data[p] = (nx / len * 0.5 + 0.5) * 255;
        data[p + 1] = (ny / len * 0.5 + 0.5) * 255;
        data[p + 2] = thr * 255;
        data[p + 3] = a * 255;
      }
    }
  };
  // Fine mist first (appears early), then beads (appear progressively).
  const scale = S / 1024;
  for (let i = 0; i < 9000; i++) {
    const r = (0.9 + rand() * 1.6) * scale;
    stamp(rand() * S, rand() * S, r, r * 1.05, 0.02 + rand() * 0.45);
  }
  for (let i = 0; i < 520; i++) {
    const r = (2.5 + Math.pow(rand(), 2.2) * 11) * scale;
    stamp(rand() * S, rand() * S, r, r * (1.05 + rand() * 0.2), 0.18 + rand() * 0.78);
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/* ───────────────────────────── Utility sprites ───────────────────────────── */

export function createRadialTexture(size = 256, stops = [[0, 'rgba(0,0,0,0.85)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createMistTexture(size = 256) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rand = rng(5);
  for (let i = 0; i < 40; i++) {
    const x = size * (0.2 + rand() * 0.6);
    const y = size * (0.3 + rand() * 0.4);
    const r = size * (0.08 + rand() * 0.22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Yields to the browser so the loader can paint progress between heavy steps. */
export function nextFrame() {
  return new Promise((r) => setTimeout(r, 0));
}
