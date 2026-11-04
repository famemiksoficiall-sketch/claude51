# Pepsi — In Full Focus

A cinematic, scroll-driven WebGL product film for the web. One physically based aluminium can is
created once and travels through the whole page: dark studio → macro detail → production hall →
cold chamber → liquid energy shot → luminous final packshot.

> Concept piece. Pepsi and the Pepsi Globe are trademarks of PepsiCo, Inc. No official brand files
> were supplied, so the label artwork is a procedural approximation drawn at load time. To use
> licensed artwork, see [Brand artwork](#brand-artwork).

## Run it

Requirements: Node.js 18+ (tested with Node 22) and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ at http://localhost:4173
```

`dist/` is a static site, so any static host works (no server code).

### URL options

| Parameter | Effect |
| --- | --- |
| `?quality=high\|medium\|low` | Forces a quality tier. By default the tier is picked from the device. |
| `?motion=reduced` | Forces the reduced-motion version. |
| `?webgl=0` | Shows the no-WebGL fallback (poster + readable content). |
| `?debug` | Overlay showing scene time `s`, fps, pixel ratio and draw calls. |

## What's on the page

| # | Scene | What happens |
| --- | --- | --- |
| 1 | **The reveal** | Time-based intro: rim lights carve the silhouette, then the key light exposes the label while the camera eases in. |
| 2 | **Material** | A single macro camera path over the rim, lid, tab, rivet and scored opening, then the printed wall, with depth of field limited to this scene. The can turns to show each feature and ends with the logo facing you again. |
| 3 | **Factory** | The can moves into a production hall, drops onto the conveyor and stays put on the belt: the belt texture and end drums are driven by the can's own x position. It then passes through an inspection gate whose light curtain responds to it. |
| 4 | **Cold** | Ice settles around the base, condensation builds up in the shader (fine film, then beads), larger instanced droplets appear and a few slide down. Low mist and frost, colder lighting. |
| 5 | **Energy** | A diagonal sweep with a held moment and a slow finish. One cola ribbon (mesh + shader) wraps the can behind the label, with about 20 droplets that hang in place while scrolling pauses. |
| 6 | **Final** | A luminous blue cyclorama, a reflective floor (true planar reflection on high tier) and a contact shadow. The can settles in a three-quarter pose. **Explore the experience** scrolls back and replays the reveal. |

## Architecture

```
index.html                 semantic page: nav, 6 <section>s, footer, loader, fallback poster
src/
  config.js                ★ art direction: keyframes, light/atmosphere presets, quality tiers
  main.js                  boot, renderer, the frame loop, scroll ↔ timeline, UI, resilience
  core/timeline.js         unified timeline: s → complete film state (can, camera, lights, fx)
  product/
    canGeometry.js         millimetre-accurate profiles → custom lathe, tab, rivet
    canTextures.js         procedural label (4K), material map, normal map, lid, condensation
    HeroCan.js             the single hero object + condensation shader + instanced beads
  scenes/
    environmentMap.js      procedural studio HDR (strip boxes) → PMREM
    studio.js factory.js cold.js energy.js finalStudio.js
  fx/post.js               MSAA HDR → DOF (macro only) → bloom → vignette → ACES output
  ui/loader.js audio.js
  styles/main.css
public/  poster.jpg (fallback still, rendered from this scene), favicon.svg
```

### One can, one canvas, one timeline

- **One renderer, one canvas** (`#stage`, fixed behind the content) and one `setAnimationLoop`.
- **One `HeroCan`**, built once in `main.js`. Nothing clones or replaces it. The root carries
  `userData.isHeroCan`, and `window.__experience.heroCanCount()` returns `1`. The factory line,
  ice, liquid and floors are separate set pieces, and no other can exists anywhere in the scene.
- **One timeline** (`core/timeline.js`). The page scroll is mapped to scene time `s`: section *i*
  spans `[i, i+1)` and the journey ends at `s = 5`. GSAP ScrollTrigger reports the scroll and
  `gsap.quickTo` smooths it. Each frame, `Timeline.evaluate(s)` returns the full state of the film.
  Because that state depends only on `s`, forward scrolling, reverse scrolling, fast flicks and
  jumping to a section all stay consistent.
- **Interpolation.** Every channel uses a monotone cubic (Fritsch–Carlson) spline over the keyframe
  times. Motion is smooth, never overshoots and never teleports, and repeating a value on two keys
  makes a still pose. Orientation is built as quaternions (attitude ⊗ spin about the can's axis), so
  real 360° turns are possible, and secondary hover motion is applied as a quaternion on top.
- **Scroll.** Native scrolling is never hijacked. The copy for each section is pinned and appears or
  disappears from `s` ranges set in `SECTIONS[].copy`.

### Adjusting the choreography

All of it lives in `src/config.js`:

- `KEYFRAMES` set the can position, tilt, spin (`yaw`), hover, camera orbit (`az`/`el`/`dist`/`look`/`fov`),
  screen composition (`frame` for desktop, `frameMobile` for portrait), light and atmosphere presets,
  environment weights, `wet`, `ice`, `mist`, `liquid`, `dof` and `envRot`. A key only needs the channels
  that change; the others carry over from the previous key.
- `LIGHT_PRESETS` and `ATMOSPHERES` define the lighting moods, which are blended between keys.
- `SECTIONS` sets section heights (vh), copy windows and the `s` that each nav link jumps to.
- `INTRO`, `SCROLL`, `QUALITY` and `REDUCED_MOTION` tune the intro, scroll smoothing, tiers and the calmer variant.

## Product model & materials

- **Geometry.** Millimetre profiles (Ø 66 mm body, 122 mm tall) are swept with a custom lathe that
  computes analytic normals, puts the seam at the back and uses arc-length V so the label is not
  stretched over the shoulder. The model includes a concave bottom dome and standing ring, a tapered
  bottom, a tapered shoulder and neck, a rolled double-seam rim, the chuck wall and countersink, a
  recessed lid panel with a stiffening bead, an extruded pull tab with a finger hole and hinge slot,
  and a rivet.
- **Materials** are all `MeshPhysicalMaterial`:
  - *Painted aluminium:* a 4096 × 2048 label, a roughness/metalness map in glTF packing (blue ink
    over metal reads metallic, white base coat does not, exposed metal bands are fully metallic), a
    clear varnish coat, and a normal map with ironing striations, about 70 restrained micro-scratches
    and faint dents.
  - *Bare spun aluminium:* brushed normal detail and a slightly rougher finish than the lid.
  - *Lid alloy:* a bump map with the scored opening, panel bead, rivet boss and finger well.
  - *Stamped tab.*
  - *Water* and *ice:* transmissive on capable tiers.
- **Moisture** works at two levels. A shader-level condensation map holds bead normals, coverage and a
  per-bead *appearance threshold*, so the fine film and beads build up gradually. On top of that,
  one instanced draw renders the larger beads.
- **4K means texture detail, not canvas size.** The label and material maps are 4096 px on high and
  medium tiers and 2048 px on low, mip-mapped with anisotropic filtering. Because all artwork is
  generated at load time, nothing is downloaded and no texture compression format is needed. If you
  replace it with bitmap artwork, ship KTX2/Basis variants per tier. The canvas itself is capped by
  device pixel ratio per tier and scaled down adaptively when frames run slow.

## Rendering

- sRGB output, ACES filmic tone mapping, HDR (half-float) MSAA render target.
- A procedural studio environment (strip lights, overhead softbox, cool back panel and a small red
  card) is pre-filtered with PMREM and rotated with the timeline, which moves highlights across the
  metal.
- A light rig follows the can's position: a shadow-casting key, two narrow rims, a top light, an
  accent light and a hemisphere light. All are blended per scene.
- Post-processing: depth of field during the macro scene only, subtle bloom, a gentle vignette and
  tone mapping. No chromatic aberration and no grain.
- Repeated scenery (rails, legs, trusses, light bars, tanks, pipes, columns, ice, droplets) is
  instanced.

## Responsive, performance & resilience

- **Quality tiers.** High, medium and low set the pixel-ratio cap, texture sizes, shadow-map size,
  MSAA, depth of field, planar reflection, transmission, segment counts, particle counts and factory
  detail.
- **Portrait screens** reframe the same can: the camera pulls back and the can is offset upward with
  the copy at the bottom. A scrim keeps text readable regardless of the 3D lighting.
- **Loading order.** The product assets load first and gate the opening. The factory, cold chamber,
  energy set and final studio are then built and pre-compiled one by one in the background.
- **Rendering pauses** when the tab is hidden. Resizing is handled without stretching, and when the
  WebGL context is lost the scene is restored (including the environment map).
- **Allocation-free frame loop.** All temporaries are reused, materials are created once and draw
  calls are bounded.

## Accessibility & fallbacks

- `prefers-reduced-motion` (or the footer **Reduce motion** toggle) removes spins, the camera
  approach, the hover, pointer parallax and DOF, and shortens transitions to stable compositions.
- Semantic headings (one `h1`, then `h2` per scene), a skip link, keyboard-operable nav, menu, sound
  and CTA, visible focus rings, and `aria-current` on the scene indicators. Navigation moves focus to
  the target heading.
- **No WebGL2:** the page switches to a static layout over a poster (`public/poster.jpg`, rendered
  from this scene) with all copy readable.
- **Audio** is optional, synthesised with WebAudio and off by default. It only starts after a click
  on **Sound off/on**.

## Brand artwork

Set `BRAND.labelOverride` in `src/config.js` to a licensed label image in a 2 : 1 ratio, ideally
4096 × 2048, where the horizontal centre is the front of the can. That image then replaces the
procedural colour map. The material map (ink vs. metal) is still generated from the procedural
layout, so adjust `drawLabel()` in `src/product/canTextures.js` if your artwork's layout differs.

## Browser support

Current Chrome, Edge, Safari 16.4+ and Firefox (WebGL2 required for the 3D experience).
