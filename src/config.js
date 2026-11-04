/**
 * Central art-direction & choreography configuration.
 *
 * Every major animation parameter lives here so the film can be re-cut
 * without touching engine code.
 *
 * Timeline unit: `s` (scene time). Section i of the page spans s ∈ [i, i+1).
 * Section 0 = Reveal, 1 = Detail, 2 = Factory, 3 = Cold, 4 = Energy, 5 = Final.
 * The journey ends at s = 5 when the final section reaches the top of the viewport.
 *
 * Interpolation: every scalar/vector channel is evaluated with a monotone cubic
 * (Fritsch–Carlson) spline across keyframe times — smooth acceleration/deceleration,
 * no overshoot, and identical results scrolling forward, backwards or very quickly.
 * Repeating a value on two consecutive keys creates a "hold" (a stable pose).
 *
 * Units: 1 world unit = 50 mm. The can is 2.44 units tall (122 mm), centred on its origin.
 */

export const WORLD = {
  canHalfHeight: 1.22,
  // Environment anchors along the world-space route (x axis).
  studioX: 0,
  factory: { startX: 8.5, endX: 31, gateX: 19.5, beltTopY: -1.222 },
  coldX: 38,
  energy: { x: 44, y: 1.0 },
  finalX: 52,
  floorY: -1.222,
};

/** Section heights in viewport heights (desktop). Total journey ≈ 7.5 vh. */
export const SECTIONS = [
  // copy: s-window in which the section's copy is shown; anchor: s used by navigation.
  { id: 'reveal', label: 'Reveal', vh: 110, copy: [-1, 0.62], anchor: 0 },
  { id: 'detail', label: 'Detail', vh: 150, copy: [1.0, 1.84], anchor: 1.12 },
  { id: 'factory', label: 'Factory', vh: 160, copy: [2.4, 2.94], anchor: 2.62 },
  { id: 'cold', label: 'Cold', vh: 130, copy: [3.3, 3.9], anchor: 3.6 },
  { id: 'energy', label: 'Energy', vh: 130, copy: [4.2, 4.72], anchor: 4.52 },
  { id: 'final', label: 'Final', vh: 100, copy: [4.84, 99], anchor: 5 },
];

/**
 * Lighting presets. Light rig follows the can's position (not its rotation).
 * Positions are offsets from the can in world units. Intensities in candela (spot)
 * — physically based with decay 2.
 */
export const LIGHT_PRESETS = {
  // Opening: almost black studio, narrow rim lights carve the silhouette.
  reveal: {
    key: { pos: [-3.2, 3.2, 4.2], color: '#f2f5ff', intensity: 0 },
    rimL: { pos: [-3.2, 1.6, -3.4], color: '#bcd2ff', intensity: 95 },
    rimR: { pos: [3.4, 1.2, -3.2], color: '#d9e6ff', intensity: 110 },
    top: { pos: [0.4, 6, 0.6], color: '#ffffff', intensity: 0 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#ff3a4a', intensity: 0 },
    hemi: { sky: '#1a2c5a', ground: '#020409', intensity: 0.05 },
    envIntensity: 0.18,
    exposure: 0.95,
  },
  studio: {
    key: { pos: [-3.4, 3.0, 4.6], color: '#f4f7ff', intensity: 140 },
    rimL: { pos: [-3.0, 1.8, -3.6], color: '#bcd2ff', intensity: 80 },
    rimR: { pos: [3.6, 1.4, -3.0], color: '#e1ebff', intensity: 105 },
    top: { pos: [0.6, 6.2, 1.0], color: '#ffffff', intensity: 14 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#ff3a4a', intensity: 0 },
    hemi: { sky: '#2a4a9a', ground: '#03060d', intensity: 0.22 },
    envIntensity: 0.6,
    exposure: 1.0,
  },
  macro: {
    key: { pos: [-2.6, 3.6, 3.0], color: '#ffffff', intensity: 105 },
    rimL: { pos: [-2.2, 2.6, -2.8], color: '#c6d8ff', intensity: 70 },
    rimR: { pos: [2.8, 2.2, -2.4], color: '#ffffff', intensity: 95 },
    top: { pos: [0.4, 5.0, 0.4], color: '#ffffff', intensity: 22 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#ff3a4a', intensity: 0 },
    hemi: { sky: '#2a4a9a', ground: '#03060d', intensity: 0.2 },
    envIntensity: 0.5,
    exposure: 1.0,
  },
  transit: {
    key: { pos: [-3.0, 3.6, 4.4], color: '#e8eeff', intensity: 90 },
    rimL: { pos: [-3.0, 2.0, -3.4], color: '#9fb6ff', intensity: 60 },
    rimR: { pos: [3.4, 1.6, -3.0], color: '#ffffff', intensity: 70 },
    top: { pos: [0.5, 6.0, 0.8], color: '#fff3e2', intensity: 50 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#ff3a4a', intensity: 0 },
    hemi: { sky: '#30405e', ground: '#05070b', intensity: 0.3 },
    envIntensity: 0.55,
    exposure: 1.0,
  },
  factory: {
    key: { pos: [-2.8, 4.4, 4.2], color: '#fff4e6', intensity: 120 },
    rimL: { pos: [-3.2, 2.4, -3.2], color: '#cfdcff', intensity: 55 },
    rimR: { pos: [3.4, 2.0, -3.0], color: '#ffffff', intensity: 85 },
    top: { pos: [0.0, 6.5, 0.4], color: '#fff1dc', intensity: 45 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#ff3a4a', intensity: 0 },
    hemi: { sky: '#6b7a92', ground: '#0a0b0e', intensity: 0.5 },
    envIntensity: 0.7,
    exposure: 1.0,
  },
  cold: {
    key: { pos: [-3.0, 3.8, 4.0], color: '#e6f1ff', intensity: 115 },
    rimL: { pos: [-3.0, 1.8, -3.0], color: '#7fb4ff', intensity: 130 },
    rimR: { pos: [3.2, 1.6, -2.8], color: '#bfe0ff', intensity: 140 },
    top: { pos: [0.4, 6.0, 0.6], color: '#d6ecff', intensity: 60 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#4aa8ff', intensity: 20 },
    hemi: { sky: '#3a6ab8', ground: '#020814', intensity: 0.35 },
    envIntensity: 0.8,
    exposure: 1.02,
  },
  energy: {
    key: { pos: [-3.6, 2.8, 4.0], color: '#ffffff', intensity: 135 },
    rimL: { pos: [-3.2, 2.2, -3.0], color: '#5f9bff', intensity: 120 },
    rimR: { pos: [3.4, 1.0, -2.8], color: '#ff4d5e', intensity: 70 },
    top: { pos: [0.5, 6.0, 0.8], color: '#ffffff', intensity: 50 },
    accent: { pos: [3.2, -1.6, 2.6], color: '#ff3346', intensity: 35 },
    hemi: { sky: '#2850b0', ground: '#020612', intensity: 0.3 },
    envIntensity: 0.75,
    exposure: 1.02,
  },
  final: {
    key: { pos: [-3.4, 3.4, 4.6], color: '#ffffff', intensity: 150 },
    rimL: { pos: [-3.2, 1.2, -3.2], color: '#cfe0ff', intensity: 75 },
    rimR: { pos: [3.6, 0.9, -3.0], color: '#ffffff', intensity: 90 },
    top: { pos: [0.6, 6.4, 1.2], color: '#ffffff', intensity: 30 },
    accent: { pos: [3.5, -1.2, 2.5], color: '#ff3a4a', intensity: 0 },
    hemi: { sky: '#4a7ae0', ground: '#06102a', intensity: 0.45 },
    envIntensity: 0.85,
    exposure: 1.04,
  },
};

/**
 * Atmosphere presets: background / fog colour and density, bloom strength.
 */
export const ATMOSPHERES = {
  studio: { bg: '#02060f', fog: 0.05, bloom: 0.22 },
  macro: { bg: '#02060f', fog: 0.05, bloom: 0.2 },
  factory: { bg: '#05070b', fog: 0.032, bloom: 0.3 },
  cold: { bg: '#031127', fog: 0.05, bloom: 0.3 },
  energy: { bg: '#020c2a', fog: 0.035, bloom: 0.32 },
  final: { bg: '#061a45', fog: 0.02, bloom: 0.16 },
};

/**
 * Keyframes. Each key may set any channel; missing channels inherit the previous key.
 *
 * can.pos       world position
 * can.tilt      [x°, z°] small tilts (diagonal attitude)
 * can.yaw       rotation about the can's own axis in degrees (unwrapped: values
 *               beyond ±180 produce real spins)
 * can.float     0..1 amplitude of the idle "hover" secondary motion
 * cam.az/el     camera azimuth/elevation (degrees) around the look target
 * cam.dist      camera distance
 * cam.look      look-target offset from the can position
 * cam.fov       vertical field of view
 * frame         [x, y] screen-space composition offset (fraction of half-viewport) desktop
 * frameMobile   same for portrait screens
 * light/atmo    preset names (blended between keys)
 * env weights   studio / factory / cold / energy / final  0..1 (lighting + effects)
 * wet           condensation amount 0..1
 * ice / mist    cold-chamber elements 0..1
 * liquid        liquid ribbon reveal 0..1 (and 1..2 retracts it)
 * dof           depth-of-field strength 0..1 (macro only)
 * envRot        environment-map rotation in degrees — moves reflections across metal
 */
export const KEYFRAMES = [
  // ── Scene 1 · The reveal ─────────────────────────────────────────────
  {
    s: 0.0,
    can: { pos: [0, 0.05, 0], tilt: [-5, -11], yaw: -28, float: 1 },
    cam: { az: 2, el: 4, dist: 6.4, look: [0, 0.02, 0], fov: 30 },
    frame: [0.3, 0.02], frameMobile: [0, 0.2],
    light: 'studio', atmo: 'studio',
    studio: 1, factory: 0, cold: 0, energy: 0, final: 0,
    wet: 0, ice: 0, mist: 0, liquid: 0, dof: 0, envRot: 0,
  },
  {
    s: 0.55,
    can: { pos: [0, 0.08, 0], tilt: [-4, -8], yaw: -22, float: 1 },
    cam: { az: -4, el: 5, dist: 5.6, look: [0, 0.05, 0], fov: 30 },
    frame: [0.28, 0.02], frameMobile: [0, 0.18],
    envRot: 25,
  },
  // ── Scene 2 · Material close-up ──────────────────────────────────────
  {
    s: 1.08,
    can: { pos: [0, 0.1, 0], tilt: [10, -4], yaw: -50, float: 0.4 },
    cam: { az: 18, el: 30, dist: 2.25, look: [0.05, 1.02, 0], fov: 32 },
    frame: [0.22, -0.05], frameMobile: [0, 0.12],
    light: 'macro', atmo: 'macro', dof: 1, envRot: 60,
  },
  {
    s: 1.38,
    can: { pos: [0, 0.1, 0], tilt: [14, 2], yaw: 25, float: 0.3 },
    cam: { az: -14, el: 40, dist: 1.85, look: [0, 1.1, 0.1], fov: 32 },
    frame: [0.2, -0.05], frameMobile: [0, 0.1],
    envRot: 110,
  },
  {
    s: 1.66,
    can: { pos: [0, 0.1, 0], tilt: [2, 0], yaw: 120, float: 0.3 },
    cam: { az: 28, el: 4, dist: 2.35, look: [0, 0.15, 0], fov: 32 },
    frame: [0.22, 0], frameMobile: [0, 0.1],
    envRot: 150,
  },
  {
    s: 1.92,
    can: { pos: [0, 0.1, 0], tilt: [-2, -5], yaw: 340, float: 0.6 },
    cam: { az: 6, el: 5, dist: 4.6, look: [0, 0.05, 0], fov: 30 },
    frame: [0.24, 0], frameMobile: [0, 0.14],
    light: 'studio', atmo: 'studio', dof: 0, envRot: 190,
  },
  // ── Scene 3 · The factory ────────────────────────────────────────────
  {
    s: 2.18,
    can: { pos: [5.2, 1.0, 0], tilt: [0, -9], yaw: 335, float: 0.4 },
    cam: { az: -14, el: 9, dist: 7.2, look: [0.6, -0.1, 0], fov: 32 },
    frame: [0.12, 0], frameMobile: [0, 0.12],
    light: 'transit', atmo: 'factory',
    studio: 0.2, factory: 0.8, envRot: 210,
  },
  {
    s: 2.36,
    can: { pos: [10.6, 0.42, 0], tilt: [0, -3], yaw: 335, float: 0 },
    cam: { az: -22, el: 10, dist: 6.4, look: [0.4, -0.2, 0], fov: 32 },
    frame: [0.1, 0], frameMobile: [0, 0.1],
    light: 'factory', studio: 0, factory: 1,
  },
  {
    s: 2.46,
    can: { pos: [12.6, 0, 0], tilt: [0, 0], yaw: 335 },
    cam: { az: -20, el: 10, dist: 6.0, look: [0.2, -0.25, 0] },
  },
  {
    s: 2.82,
    can: { pos: [22.6, 0, 0], tilt: [0, 0], yaw: 335 },
    cam: { az: 22, el: 8, dist: 5.6, look: [0, -0.15, 0], fov: 32 },
    frame: [0.12, 0], frameMobile: [0, 0.1],
    envRot: 260,
  },
  {
    s: 2.98,
    can: { pos: [27.4, 0, 0], tilt: [0, 0], yaw: 335 },
    cam: { az: 26, el: 9, dist: 6.0, look: [0, -0.1, 0] },
  },
  // ── Scene 4 · Cold transformation ────────────────────────────────────
  {
    s: 3.16,
    can: { pos: [33.0, 0.85, 0], tilt: [0, -6], yaw: 335, float: 0.3 },
    cam: { az: 6, el: 8, dist: 6.4, look: [0, -0.05, 0], fov: 31 },
    frame: [0.2, 0], frameMobile: [0, 0.14],
    light: 'cold', atmo: 'cold',
    factory: 0.2, cold: 0.8, ice: 0.2, wet: 0.08, mist: 0.2, envRot: 290,
  },
  {
    s: 3.36,
    can: { pos: [38, 0.02, 0], tilt: [0, 0], yaw: 338, float: 0 },
    cam: { az: -2, el: 9, dist: 6.6, look: [0, -0.15, 0], fov: 30 },
    frame: [0.3, 0], frameMobile: [0, 0.16],
    factory: 0, cold: 1, ice: 1, wet: 0.45, mist: 0.6,
  },
  {
    s: 3.72,
    can: { pos: [38, 0.02, 0], tilt: [0, 0], yaw: 332 },
    cam: { az: -12, el: 7, dist: 5.7, look: [0, -0.05, 0], fov: 30 },
    frame: [0.3, 0], frameMobile: [0, 0.16],
    wet: 1, mist: 0.75, envRot: 340,
  },
  // ── Scene 5 · Controlled energy ──────────────────────────────────────
  {
    s: 4.06,
    can: { pos: [40.6, 0.75, 0], tilt: [4, -10], yaw: 345, float: 0.2 },
    cam: { az: -6, el: 3, dist: 5.6, look: [0, 0, 0], fov: 31 },
    frame: [0.2, 0], frameMobile: [0, 0.14],
    light: 'energy', atmo: 'energy',
    cold: 0.3, energy: 0.7, ice: 0.3, mist: 0.3, wet: 0.95, liquid: 0.15, envRot: 360,
  },
  {
    s: 4.32,
    can: { pos: [44, 1.0, 0], tilt: [8, 18], yaw: 470, float: 0 },
    cam: { az: -12, el: -3, dist: 5.4, look: [0, 0, 0], fov: 31 },
    frame: [0.2, 0], frameMobile: [0, 0.14],
    cold: 0, energy: 1, ice: 0, mist: 0, liquid: 0.85, envRot: 410,
  },
  // Suspended beat: almost no change across this window.
  {
    s: 4.5,
    can: { pos: [44, 1.08, 0], tilt: [7, 16], yaw: 505 },
    cam: { az: -10, el: -3, dist: 5.3, look: [0, 0.02, 0] },
    liquid: 1, envRot: 420,
  },
  {
    s: 4.64,
    can: { pos: [44.1, 1.1, 0], tilt: [6, 15], yaw: 515 },
    cam: { az: -9, el: -3, dist: 5.3, look: [0, 0.02, 0] },
    liquid: 1.15,
  },
  // ── Scene 6 · Final hero ─────────────────────────────────────────────
  {
    s: 4.86,
    can: { pos: [50.2, 0.35, 0], tilt: [1, 2], yaw: 655, float: 0.1 },
    cam: { az: 2, el: 6, dist: 6.2, look: [0, 0, 0], fov: 30 },
    frame: [0.26, 0], frameMobile: [0, 0.16],
    light: 'final', atmo: 'final',
    energy: 0.2, final: 0.8, liquid: 2, wet: 0.7, envRot: 460,
  },
  {
    s: 5.0,
    can: { pos: [52, 0.0, 0], tilt: [0, 0], yaw: 692, float: 0 },
    cam: { az: 0, el: 7, dist: 6.0, look: [0, 0.02, 0], fov: 30 },
    frame: [0.28, 0.0], frameMobile: [0, 0.17],
    energy: 0, final: 1, liquid: 2, wet: 0.6, envRot: 480,
  },
];

/** Reduced-motion overrides: removes energetic spins & large approaches. */
export const REDUCED_MOTION = {
  // yaw replaced by a gentle, never-spinning value per key index (same length as KEYFRAMES)
  yaw: [-28, -24, -40, 20, 40, -25, -25, -25, -25, -25, -25, -25, -25, -28, -25, -20, -18, -18, -25, -28],
  tilt: 0.4, // tilt scale
  dofScale: 0,
};

/** Intro reveal (time-based, plays once essential assets are ready). */
export const INTRO = {
  duration: 4.6, // seconds
  rimStart: 0.0, // fraction of the intro where rim lights reach full
  rimEnd: 0.35,
  keyStart: 0.3, // main light starts exposing the label
  keyEnd: 0.95,
  camDistanceFrom: 1.45, // multiplier of the key distance at intro start
};

/** Scroll smoothing (seconds). */
export const SCROLL = { smooth: 0.85, smoothReduced: 0.25 };

/** Quality tiers. `auto` picks one from device capabilities. */
export const QUALITY = {
  high: {
    dprCap: 2, labelSize: 4096, normalSize: 2048, shadowMap: 2048, msaa: 4,
    bloom: true, dof: true, reflector: true, transmission: true,
    radialSegments: 160, droplets: 220, iceCount: 46, mistCount: 14, frost: 420,
    factoryDetail: 1, minDpr: 0.85,
  },
  medium: {
    dprCap: 1.5, labelSize: 4096, normalSize: 2048, shadowMap: 2048, msaa: 4,
    bloom: true, dof: true, reflector: false, transmission: true,
    radialSegments: 128, droplets: 160, iceCount: 36, mistCount: 10, frost: 260,
    factoryDetail: 0.8, minDpr: 0.75,
  },
  low: {
    dprCap: 1.5, labelSize: 2048, normalSize: 1024, shadowMap: 1024, msaa: 2,
    bloom: true, dof: false, reflector: false, transmission: false,
    radialSegments: 96, droplets: 90, iceCount: 22, mistCount: 7, frost: 120,
    factoryDetail: 0.55, minDpr: 0.7,
  },
};

/**
 * Brand. If you have licensed, permitted artwork, set `labelOverride` to a URL of a
 * 2:1 label image (e.g. '/assets/brand/label-4096.png'). The procedural label is used otherwise.
 */
export const BRAND = {
  labelOverride: null,
  blue: '#0b3bd8',
  deepBlue: '#04208c',
  navy: '#020b2e',
  red: '#e2122b',
  white: '#ffffff',
  black: '#06070c',
};
