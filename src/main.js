import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/inter';
import './styles/main.css';

import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

import { SECTIONS, QUALITY, INTRO, SCROLL, BRAND, LIGHT_PRESETS } from './config.js';
import { Timeline } from './core/timeline.js';
import { Loader } from './ui/loader.js';
import { Ambience } from './ui/audio.js';
import {
  createLabelTextures, createBodyNormal, createLidTextures, createDropletTexture, loadLabelOverride, nextFrame,
} from './product/canTextures.js';
import { HeroCan } from './product/HeroCan.js';
import { createEnvironmentMap } from './scenes/environmentMap.js';
import { Studio } from './scenes/studio.js';
import { Factory } from './scenes/factory.js';
import { ColdChamber } from './scenes/cold.js';
import { Energy } from './scenes/energy.js';
import { FinalStudio, ContactShadow } from './scenes/finalStudio.js';
import { Post } from './fx/post.js';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const html = document.documentElement;
const RIG_LIGHTS = ['key', 'rimL', 'rimR', 'top', 'accent'];
// When nothing is being driven (no scroll, intro done, pointer at rest) only slow secondary
// motion remains, so the loop drops to this rate to save GPU time and battery.
const IDLE_FPS = 30;
const IDLE_AFTER = 1.2; // seconds without scroll/pointer/intro activity
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const smoothstep = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ───────────────────────── Capability & quality ───────────────────────── */

function supportsWebGL2() {
  if (params.get('webgl') === '0') return false; // manual fallback preview
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function pickQuality() {
  const q = params.get('quality');
  if (q && QUALITY[q]) return q;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (coarse && small) return 'low';
  if (mem <= 4 || cores <= 4 || coarse) return 'medium';
  return 'high';
}

/* ───────────────────────── Page structure ───────────────────────── */

const sectionEls = SECTIONS.map((s) => document.getElementById(s.id));
sectionEls.forEach((el, i) => el.style.setProperty('--scene-vh', SECTIONS[i].vh));
const copyEls = sectionEls.map((el) => el.querySelector('.copy'));
const navLinks = [...document.querySelectorAll('[data-nav]')];
const scrollCue = document.querySelector('.scroll-cue');
const noticeEl = document.getElementById('notice');

let tops = [];
function measure() {
  tops = sectionEls.map((el) => el.offsetTop);
}
/** Scroll position → scene time s. Section i spans [i, i+1); journey ends at s = 5. */
function scrollToS(y) {
  const last = tops.length - 1;
  if (y >= tops[last]) return last;
  for (let i = 0; i < last; i++) {
    if (y < tops[i + 1]) return i + Math.max(0, (y - tops[i]) / (tops[i + 1] - tops[i]));
  }
  return last;
}
function sToScroll(s) {
  const last = tops.length - 1;
  if (s >= last) return tops[last];
  const i = Math.max(0, Math.floor(s));
  return tops[i] + (s - i) * (tops[i + 1] - tops[i]);
}

function notice(msg, ms = 5000) {
  noticeEl.textContent = msg;
  noticeEl.hidden = false;
  clearTimeout(notice._t);
  if (ms) notice._t = setTimeout(() => { noticeEl.hidden = true; }, ms);
}

/* ───────────────────────── Motion preference ───────────────────────── */

const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches || params.get('motion') === 'reduced';
const motionToggle = document.getElementById('motion-toggle');
function applyMotionClass() {
  html.classList.toggle('reduced-motion', reducedMotion);
  motionToggle.setAttribute('aria-pressed', String(reducedMotion));
  motionToggle.textContent = reducedMotion ? 'Full motion' : 'Reduce motion';
}
applyMotionClass();

/* ───────────────────────── Shared UI (works with or without WebGL) ───────────────────────── */

const menuBtn = document.querySelector('.nav__menu');
const menuList = document.getElementById('scene-list');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  menuList.classList.toggle('is-open', open);
});
function closeMenu() {
  menuBtn.setAttribute('aria-expanded', 'false');
  menuList.classList.remove('is-open');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

const ambience = new Ambience();
const soundBtn = document.getElementById('sound-toggle');
soundBtn.addEventListener('click', async () => {
  const on = await ambience.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('.nav__sound-label').textContent = on ? 'Sound on' : 'Sound off';
  soundBtn.setAttribute('aria-label', on ? 'Turn ambient sound off' : 'Turn ambient sound on');
});
soundBtn.setAttribute('aria-label', 'Turn ambient sound on');

/** Experience hooks set once WebGL is running. */
const experience = { goTo: null, explore: null };

function scrollToSection(index) {
  closeMenu();
  if (experience.goTo) return experience.goTo(index);
  sectionEls[index].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  focusHeading(index);
}
function focusHeading(index) {
  const h = sectionEls[index].querySelector('h1, h2');
  if (!h) return;
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
  history.replaceState(null, '', `#${SECTIONS[index].id}`);
}
navLinks.forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  scrollToSection(Number(a.dataset.nav));
}));
document.getElementById('explore').addEventListener('click', () => {
  if (experience.explore) experience.explore();
  else scrollToSection(0);
});

function activateFallback(reason) {
  html.classList.add('no-webgl');
  html.classList.remove('is-loading');
  copyEls.forEach((c) => c.classList.add('is-active'));
  if (reason) notice(reason, 0);
}

/* ───────────────────────── Boot ───────────────────────── */

if (!supportsWebGL2()) {
  measure();
  activateFallback('Your browser can’t display the live 3D experience, so a still version is shown.');
} else {
  boot().catch((err) => {
    console.error(err);
    activateFallback('The 3D experience couldn’t start on this device, so a still version is shown.');
  });
}

async function boot() {
  const qualityName = pickQuality();
  const quality = { ...QUALITY[qualityName] };
  const loader = new Loader(document.getElementById('loader'), [
    ['fonts', 4, 'Setting type'],
    ['label', 22, 'Printing label'],
    ['material', 14, 'Mapping paint & bare metal'],
    ['normal', 14, 'Ironing the aluminium'],
    ['lid', 5, 'Scoring the lid'],
    ['drops', 9, 'Preparing condensation'],
    ['env', 8, 'Rigging studio light'],
    ['model', 6, 'Building the can'],
    ['shaders', 18, 'Compiling materials'],
  ]);

  const canvas = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxTex = renderer.capabilities.maxTextureSize;
  quality.labelSize = Math.min(quality.labelSize, maxTex);
  quality.normalSize = Math.min(quality.normalSize, maxTex);

  const size = { w: canvas.clientWidth || innerWidth, h: canvas.clientHeight || innerHeight, dpr: Math.min(devicePixelRatio || 1, quality.dprCap) };
  renderer.setPixelRatio(size.dpr);
  renderer.setSize(size.w, size.h, false);

  // ── Essential product assets (gate the opening) ───────────────────
  loader.begin('fonts');
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 64px "Archivo Variable"'), document.fonts.load('600 16px "Archivo Variable"'), document.fonts.ready]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* system fallback font is acceptable */ }
  loader.done('fonts');

  loader.begin('label');
  await nextFrame();
  const labelSet = await createLabelTextures(renderer, { size: quality.labelSize });
  if (BRAND.labelOverride) {
    try {
      labelSet.map = await loadLabelOverride(BRAND.labelOverride, renderer);
    } catch (e) {
      console.warn('Label override could not be loaded; using the procedural label.', e);
    }
  }
  loader.done('label');
  loader.done('material');

  loader.begin('normal');
  await nextFrame();
  const bodyNormal = await createBodyNormal(renderer, { size: quality.normalSize });
  loader.done('normal');

  loader.begin('lid');
  await nextFrame();
  const { bump: lidBump } = createLidTextures(renderer, { size: qualityName === 'low' ? 512 : 1024 });
  loader.done('lid');

  loader.begin('drops');
  await nextFrame();
  const droplets = createDropletTexture({ size: qualityName === 'low' ? 512 : 1024 });
  loader.done('drops');

  loader.begin('env');
  await nextFrame();
  const scene = new THREE.Scene();
  let envRT = createEnvironmentMap(renderer);
  scene.environment = envRT.texture;
  scene.background = new THREE.Color('#02060f');
  scene.fog = new THREE.FogExp2('#02060f', 0.05);
  loader.done('env');

  loader.begin('model');
  await nextFrame();
  const camera = new THREE.PerspectiveCamera(30, size.w / size.h, 0.05, 140);
  const can = new HeroCan({
    textures: { label: labelSet.map, orm: labelSet.ormMap, bodyNormal, lidBump, droplets },
    quality,
  });
  scene.add(can.root);

  // Light rig: follows the can's position; intensities/colours blend per scene.
  const rig = {};
  const mkSpot = (angle, penumbra) => {
    const l = new THREE.SpotLight('#ffffff', 0, 30, angle, penumbra, 2);
    scene.add(l, l.target);
    return l;
  };
  rig.key = mkSpot(0.5, 0.75);
  rig.key.castShadow = true;
  rig.key.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  rig.key.shadow.bias = -0.0004;
  rig.key.shadow.normalBias = 0.025;
  rig.key.shadow.camera.near = 1;
  rig.key.shadow.camera.far = 22;
  rig.rimL = mkSpot(0.32, 0.55);
  rig.rimR = mkSpot(0.3, 0.5);
  rig.top = mkSpot(0.62, 0.9);
  rig.accent = new THREE.PointLight('#ff3a4a', 0, 9, 2);
  scene.add(rig.accent);
  const hemi = new THREE.HemisphereLight('#2a4a9a', '#03060d', 0.2);
  scene.add(hemi);

  const studio = new Studio();
  scene.add(studio.group);
  const contact = new ContactShadow();
  scene.add(contact.mesh);
  loader.done('model');

  // ── Post & compile ────────────────────────────────────────────────
  loader.begin('shaders');
  const post = new Post(renderer, scene, camera, quality, size);
  post.setSize(size.w, size.h, size.dpr);
  let timeline = new Timeline({ reducedMotion });

  // Pre-compile what the opening needs, then warm the macro DOF path.
  await renderer.compileAsync(scene, camera);
  loader.progress('shaders', 0.6);
  await nextFrame();

  // Scenery is built progressively after the opening is visible.
  const envs = [studio];
  let finalStudio = null;

  /* ───────────── Frame state ───────────── */
  measure();
  history.scrollRestoration = 'manual';
  const proxy = { s: 0 };
  const initialHash = location.hash.slice(1);
  const hashIndex = SECTIONS.findIndex((s) => s.id === initialHash);
  if (hashIndex > 0) window.scrollTo(0, sToScroll(SECTIONS[hashIndex].anchor));
  else window.scrollTo(0, 0);
  proxy.s = scrollToS(window.scrollY);

  let sTo = gsap.quickTo(proxy, 's', { duration: reducedMotion ? SCROLL.smoothReduced : SCROLL.smooth, ease: 'power3.out' });
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.create({
    trigger: document.getElementById('content'),
    start: 0,
    end: 'max',
    onUpdate: () => sTo(scrollToS(window.scrollY)),
    onRefresh: () => {
      measure();
      sTo(scrollToS(window.scrollY));
    },
  });
  ScrollTrigger.addEventListener('refreshInit', measure);

  const intro = { t: reducedMotion ? 1 : 0 };
  let introTween = null;
  function playIntro(from = 0) {
    if (introTween) introTween.kill();
    intro.t = from;
    if (reducedMotion) {
      introTween = gsap.to(intro, { t: 1, duration: 0.8, ease: 'none' });
      return;
    }
    introTween = gsap.to(intro, { t: 1, duration: INTRO.duration * (1 - from), ease: 'none' });
  }

  // Pointer parallax (subtle, desktop fine pointers only).
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const parallaxAllowed = () => !reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches;
  window.addEventListener('pointermove', (e) => {
    if (!parallaxAllowed() || e.pointerType !== 'mouse') return;
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  const resetPointer = () => { pointer.x = 0; pointer.y = 0; };
  document.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);

  // Reusable temporaries.
  const tmp = {
    target: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
    bobQ: new THREE.Quaternion(),
    bobE: new THREE.Euler(),
    canPos: new THREE.Vector3(),
  };
  const revealPreset = LIGHT_PRESETS.reveal;
  const ctx = { time: 0, camera, canPos: tmp.canPos, reveal: 1, reducedMotion };
  let lastS = proxy.s;
  let activeSection = -1;
  let heroCopyReady = false;
  let cueWasHidden = null;

  function frameState(dt, time) {
    const s = proxy.s;
    const st = timeline.evaluate(s);

    // ── Intro reveal (rim → key) blended out as the visitor scrolls away. ──
    const it = intro.t;
    const inf = 1 - smoothstep(s, 0.12, 0.6);
    const rim = 1 - inf * (1 - smoothstep(it, INTRO.rimStart, INTRO.rimEnd));
    const key = 1 - inf * (1 - smoothstep(it, INTRO.keyStart, INTRO.keyEnd));
    const L = st.lights;
    L.key.intensity *= key;
    L.top.intensity *= key;
    L.rimL.intensity = THREE.MathUtils.lerp(revealPreset.rimL.intensity, L.rimL.intensity, key) * rim;
    L.rimR.intensity = THREE.MathUtils.lerp(revealPreset.rimR.intensity, L.rimR.intensity, key) * rim;
    st.hemi.intensity *= THREE.MathUtils.lerp(0.15, 1, key);
    st.envIntensity = THREE.MathUtils.lerp(revealPreset.envIntensity * rim, st.envIntensity, key);
    ctx.reveal = key;
    const camEase = 1 - Math.pow(1 - smoothstep(it, 0, 1), 3);
    const introDist = reducedMotion ? 1 : 1 + inf * (INTRO.camDistanceFrom - 1) * (1 - camEase);

    // ── Hero can ──
    tmp.canPos.copy(st.can.pos);
    const fl = st.can.float * (reducedMotion ? 0 : 1);
    can.root.position.copy(st.can.pos);
    can.root.position.y += Math.sin(time * 0.9) * 0.028 * fl;
    tmp.bobE.set(Math.sin(time * 0.55) * 0.012 * fl, Math.sin(time * 0.4) * 0.01 * fl, Math.sin(time * 0.7 + 1) * 0.01 * fl);
    tmp.bobQ.setFromEuler(tmp.bobE);
    can.pivot.quaternion.copy(st.can.quat).premultiply(tmp.bobQ);
    can.setWetness(THREE.MathUtils.clamp(st.wet, 0, 1), time);

    // ── Camera ──
    const aspect = size.w / size.h;
    const portrait = aspect < 0.85;
    const distFactor = portrait ? THREE.MathUtils.clamp(1 + (0.85 - aspect) * 1.15, 1, 1.6) : 1;
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 2.5));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 2.5));
    const az = THREE.MathUtils.degToRad(st.cam.az + pointer.sx * 1.6);
    const el = THREE.MathUtils.degToRad(st.cam.el - pointer.sy * 0.9);
    const dist = st.cam.dist * distFactor * introDist;
    tmp.target.copy(st.can.pos).add(st.cam.look);
    tmp.camPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(tmp.target);
    camera.position.copy(tmp.camPos);
    camera.fov = st.cam.fov;
    camera.lookAt(tmp.target);
    const fr = portrait ? st.cam.frameMobile : st.cam.frame;
    camera.setViewOffset(size.w, size.h, (-fr.x * size.w) / 2, (fr.y * size.h) / 2, size.w, size.h);

    // ── Light rig ──
    for (const name of RIG_LIGHTS) {
      const l = rig[name];
      const s2 = L[name];
      l.position.copy(st.can.pos).add(s2.pos);
      l.color.copy(s2.color);
      l.intensity = s2.intensity;
      if (l.target) l.target.position.copy(st.can.pos);
    }
    hemi.color.copy(st.hemi.sky);
    hemi.groundColor.copy(st.hemi.ground);
    hemi.intensity = st.hemi.intensity;

    // ── Atmosphere ──
    scene.environmentIntensity = st.envIntensity;
    scene.environmentRotation.y = THREE.MathUtils.degToRad(st.envRot);
    scene.background.copy(st.bg);
    scene.fog.color.copy(st.bg);
    scene.fog.density = st.fog;
    renderer.toneMappingExposure = st.exposure;

    // ── Environments ──
    ctx.time = time;
    ctx.reducedMotion = reducedMotion;
    for (const e of envs) e.update(st, ctx);
    contact.update(tmp.canPos);
    post.update(st, Math.max(0.3, camera.position.distanceTo(tmp.target) - 0.55));

    // ── DOM sync ──
    const section = Math.min(SECTIONS.length - 1, Math.floor(s + 0.12));
    if (section !== activeSection) {
      activeSection = section;
      navLinks.forEach((a) => {
        if (a.closest('.nav__list, .progress')) a.setAttribute('aria-current', String(Number(a.dataset.nav) === section));
      });
    }
    if (!heroCopyReady && intro.t > 0.55) heroCopyReady = true;
    for (let i = 0; i < copyEls.length; i++) {
      const [a, b] = SECTIONS[i].copy;
      const on = s >= a && s <= b && (i !== 0 || heroCopyReady);
      if (copyEls[i].classList.contains('is-active') !== on) copyEls[i].classList.toggle('is-active', on);
    }
    const cueHidden = s > 0.12 || !heroCopyReady;
    if (cueHidden !== cueWasHidden) {
      cueWasHidden = cueHidden;
      scrollCue.classList.toggle('is-hidden', cueHidden);
    }

    ambience.update((s - lastS) / Math.max(dt, 1e-3));
    lastS = s;
    return st;
  }

  /* ───────────── Resize, adaptive resolution, visibility, context loss ───────────── */
  let dprScale = 1;
  function applySize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    const dpr = Math.max(0.5, Math.min(devicePixelRatio || 1, quality.dprCap) * dprScale);
    if (w === size.w && h === size.h && Math.abs(dpr - size.dpr) < 0.01) return;
    size.w = w;
    size.h = h;
    size.dpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h, dpr);
    if (finalStudio) finalStudio.setSize(w, h, dpr);
  }
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      applySize();
      measure();
    });
  });

  const perf = { acc: 0, n: 0, lastChange: 0 };
  function adapt(dt, time) {
    perf.acc += dt;
    perf.n++;
    if (perf.n < 90) return;
    const avg = perf.acc / perf.n;
    perf.acc = 0;
    perf.n = 0;
    if (time - perf.lastChange < 3) return;
    const minScale = quality.minDpr / Math.min(devicePixelRatio || 1, quality.dprCap);
    if (avg > 1 / 40 && dprScale > minScale) {
      dprScale = Math.max(minScale, dprScale - 0.15);
      perf.lastChange = time;
      applySize();
    } else if (avg < 1 / 58 && dprScale < 1) {
      dprScale = Math.min(1, dprScale + 0.1);
      perf.lastChange = time;
      applySize();
    }
  }

  let running = false;
  let contextLost = false;
  const clock = new THREE.Clock();
  let elapsed = 0;
  const idle = { for: 0, pending: 0, lastS: -1 };
  function loop() {
    const raw = clock.getDelta();
    // Activity: scroll smoothing still moving, intro playing, pointer parallax settling.
    const active = Math.abs(proxy.s - idle.lastS) > 1e-4 || intro.t < 1
      || Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.002;
    idle.lastS = proxy.s;
    idle.for = active ? 0 : idle.for + raw;
    const throttled = idle.for > IDLE_AFTER;
    idle.pending += raw;
    if (throttled && idle.pending < 1 / IDLE_FPS - 0.002) return;
    const dt = Math.min(idle.pending, 1 / 15);
    idle.pending = 0;
    elapsed += dt;
    frameState(dt, elapsed);
    post.render(dt);
    // Only full-rate frames say anything about whether the GPU keeps up.
    if (!throttled) adapt(dt, elapsed);
    if (DEBUG) debugEl.textContent = `s ${proxy.s.toFixed(3)} · ${Math.round(1 / Math.max(dt, 1e-3))} fps · dpr ${size.dpr.toFixed(2)} · calls ${renderer.info.render.calls}`;
  }
  function start() {
    if (running || contextLost) return;
    running = true;
    clock.getDelta();
    renderer.setAnimationLoop(loop);
  }
  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      ambience.suspend();
    } else {
      start();
      ambience.resume();
    }
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextLost = true;
    stop();
    notice('Graphics were interrupted — restoring the scene…', 0);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    envRT = createEnvironmentMap(renderer);
    scene.environment = envRT.texture;
    noticeEl.hidden = true;
    start();
  });

  let debugEl = null;
  if (DEBUG) {
    debugEl = document.createElement('div');
    debugEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;font:12px/1.4 monospace;background:rgba(0,0,0,.6);padding:6px 8px;border-radius:4px';
    document.body.appendChild(debugEl);
  }

  /* ───────────── Navigation hooks ───────────── */
  experience.goTo = (index) => {
    const y = sToScroll(SECTIONS[index].anchor);
    const ds = Math.abs(SECTIONS[index].anchor - proxy.s);
    gsap.to(window, {
      scrollTo: { y, autoKill: true },
      duration: reducedMotion ? 0 : THREE.MathUtils.clamp(ds * 0.7, 0.8, 3),
      ease: 'power2.inOut',
      onComplete: () => focusHeading(index),
    });
  };
  experience.explore = () => {
    const ds = proxy.s;
    gsap.to(window, {
      scrollTo: { y: 0, autoKill: true },
      duration: reducedMotion ? 0 : THREE.MathUtils.clamp(ds * 0.55, 1.2, 3),
      ease: 'power2.inOut',
      onComplete: () => {
        playIntro(0.12);
        focusHeading(0);
      },
    });
  };
  const onMotionChange = (value) => {
    reducedMotion = value;
    applyMotionClass();
    timeline = new Timeline({ reducedMotion });
    sTo = gsap.quickTo(proxy, 's', { duration: reducedMotion ? SCROLL.smoothReduced : SCROLL.smooth, ease: 'power3.out' });
    if (reducedMotion) intro.t = 1;
  };
  motionToggle.addEventListener('click', () => onMotionChange(!reducedMotion));
  motionQuery.addEventListener?.('change', (e) => onMotionChange(e.matches));

  // Warm-up render (incl. DOF and transmission paths) so the first scroll never hitches.
  frameState(0, 0);
  if (post.bokeh) {
    post.bokeh.enabled = true;
    post.render(0);
  }
  post.render(0);
  loader.done('shaders');
  await loader.finish();

  html.classList.remove('is-loading');
  start();
  playIntro(proxy.s < 0.6 ? 0 : 1);

  // ── Progressive scenery (after the opening is on screen) ─────────
  const builders = [
    () => new Factory({ quality }),
    () => new ColdChamber({ quality }),
    () => new Energy({ quality }),
    () => {
      finalStudio = new FinalStudio({ quality });
      return finalStudio;
    },
  ];
  for (const build of builders) {
    await nextFrame();
    const env = build();
    scene.add(env.group);
    try {
      await renderer.compileAsync(env.group, camera, scene);
    } catch { /* compile on first draw instead */ }
    envs.push(env);
  }

  // Test & debugging hook (read-only).
  window.__experience = {
    quality: qualityName,
    get s() { return proxy.s; },
    heroCanCount() {
      let n = 0;
      scene.traverse((o) => { if (o.userData.isHeroCan) n++; });
      return n;
    },
    get ready() { return envs.length === 5; },
    info: () => ({ ...renderer.info.render, programs: renderer.info.programs?.length }),
  };
  if (DEBUG) window.__debug = { scene, can, camera, renderer, rig };
  document.dispatchEvent(new CustomEvent('experience:ready'));
}
