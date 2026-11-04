import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { WORLD } from '../config.js';
import { rng, createMistTexture, createRadialTexture } from '../product/canTextures.js';
import { createBackdropMaterial } from './studio.js';

/**
 * Scene 4 — chilled chamber. Ice rises into an arrangement around the hero,
 * sparse mist drifts low (never across the label), frost motes fall slowly.
 */
export class ColdChamber {
  constructor({ quality }) {
    this.group = new THREE.Group();
    this.group.name = 'env-cold';
    const X = WORLD.coldX;
    this.X = X;
    const rand = rng(404);
    const slabTop = WORLD.floorY - 0.002;

    // Back wall with a cold glow and vertical LED strips.
    this.wallMat = createBackdropMaterial({ base: '#020a1a', glow: '#1a4fa8', glowPos: [0.5, 0.45], glowSize: [0.3, 0.45] });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), this.wallMat);
    wall.position.set(X, 2, -6.5);
    // Transparent layers draw in a fixed order (backdrop → floor → props), independent of camera angle.
    wall.renderOrder = -10;
    this.group.add(wall);
    this.stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe1ff').multiplyScalar(2.6) });
    const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 7, 0.06), this.stripMat, 8);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) {
      const x = X - 9 + i * (18 / 7);
      if (Math.abs(x - X) < 1.5) m.makeTranslation(x, 7.5, -6.3);
      else m.makeTranslation(x, 1.8, -6.3);
      strips.setMatrixAt(i, m);
    }
    this.strips = strips;
    this.group.add(strips);

    // Floor + low plinth.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 18),
      new THREE.MeshStandardMaterial({ color: '#06132b', roughness: 0.22, metalness: 0.2, transparent: true }),
    );
    this.floor = floor;
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(X, slabTop - 0.36, -1);
    floor.receiveShadow = true;
    floor.renderOrder = -5;
    this.group.add(floor);
    const slab = new THREE.Mesh(
      new RoundedBoxGeometry(6.2, 0.36, 3.6, 3, 0.04),
      new THREE.MeshStandardMaterial({ color: '#0b1a33', roughness: 0.18, metalness: 0.35 }),
    );
    slab.position.set(X, slabTop - 0.18, 0);
    slab.receiveShadow = true;
    this.group.add(slab);

    // Ice: one instanced draw. Physically transmissive on capable devices.
    const iceMat = quality.transmission
      ? new THREE.MeshPhysicalMaterial({
        name: 'ice', color: '#ffffff', roughness: 0.22, metalness: 0, transmission: 0.92, thickness: 0.5, ior: 1.31,
        attenuationColor: new THREE.Color('#d6ecff'), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: 0.08,
        emissive: new THREE.Color('#5d86bd'), emissiveIntensity: 0.35,
      })
      : new THREE.MeshPhysicalMaterial({
        name: 'ice', color: '#cfe6ff', roughness: 0.18, metalness: 0, transparent: true, opacity: 0.62, clearcoat: 1,
        emissive: new THREE.Color('#1c3a66'), emissiveIntensity: 0.5,
        depthWrite: false,
      });
    const n = quality.iceCount;
    this.ice = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.16), iceMat, n);
    this.ice.name = 'ice';
    this.ice.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ice.castShadow = false;
    this.cubes = [];
    for (let i = 0; i < n; i++) {
      // Rings around the can; front cubes kept low so they never cover the label.
      const ring = i < n * 0.55 ? 0 : 1;
      const ang = rand() * Math.PI * 2;
      const r = ring === 0 ? 1.0 + rand() * 0.35 : 1.45 + rand() * (Math.cos(ang) > 0.3 ? 0.25 : 1.1);
      const s = 0.2 + rand() * 0.15;
      const front = Math.cos(ang) > 0.3;
      const stack = !front && rand() < 0.35 ? 1 : 0;
      this.cubes.push({
        pos: new THREE.Vector3(Math.sin(ang) * r, slabTop + s * 0.45 + stack * s * 0.75, Math.cos(ang) * r),
        rot: new THREE.Euler(rand() * 0.8, rand() * Math.PI, rand() * 0.8),
        scale: new THREE.Vector3(s, s * (0.85 + rand() * 0.25), s * (0.9 + rand() * 0.2)),
        delay: rand() * 0.55,
      });
    }
    this.ice.position.x = X; // instances are local to the chamber centre
    this.group.add(this.ice);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._lastIce = -1;

    // Low mist banks (camera-facing sprites), kept behind/below the label.
    const mistTex = createMistTexture(256);
    this.mist = [];
    for (let i = 0; i < quality.mistCount; i++) {
      const mat = new THREE.SpriteMaterial({ map: mistTex, color: '#cfe6ff', transparent: true, depthWrite: false, opacity: 0, fog: false });
      const sp = new THREE.Sprite(mat);
      const sc = 2.5 + rand() * 3;
      sp.scale.set(sc * 1.8, sc * 0.7, 1);
      const behind = i % 3 !== 0;
      sp.userData = {
        base: new THREE.Vector3(X + (rand() - 0.5) * 7, slabTop + 0.1 + rand() * (behind ? 1.2 : 0.25), behind ? -1.2 - rand() * 2 : 0.9 + rand() * 1.2),
        speed: 0.05 + rand() * 0.08,
        phase: rand() * 10,
        alpha: behind ? 0.2 : 0.12,
      };
      sp.renderOrder = 2;
      this.group.add(sp);
      this.mist.push(sp);
    }

    // Frost motes.
    // Positions are static seeds; the fall is computed on the GPU (no per-frame buffer upload).
    const count = quality.frost;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 10;
      pos[i * 3 + 1] = rand() * 6;
      pos[i * 3 + 2] = (rand() - 0.5) * 6 - 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.frostMat = new THREE.PointsMaterial({
      size: 0.03, map: createRadialTexture(64, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
      color: '#d8ecff', transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending,
    });
    this.frostTime = { value: 0 };
    this.frostMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.frostTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float seed = float( gl_VertexID );
          transformed.y = mod( position.y - uTime * 0.12, 6.0 );
          transformed.x += sin( uTime * 0.3 + seed ) * 0.1;`);
    };
    this.frostMat.customProgramCacheKey = () => 'frost-gpu-v1';
    this.frost = new THREE.Points(geo, this.frostMat);
    this.frost.frustumCulled = false;
    this.frost.position.set(X, slabTop - 0.2, 0);
    this.group.add(this.frost);
    this.slabTop = slabTop;
    this._frostClock = 0;
  }

  _updateIce(w) {
    if (Math.abs(w - this._lastIce) < 0.002) return;
    this._lastIce = w;
    this.ice.visible = w > 0.01;
    for (let i = 0; i < this.cubes.length; i++) {
      const c = this.cubes[i];
      const k = THREE.MathUtils.smoothstep(w, c.delay, c.delay + 0.45);
      // Settles from slightly above with a small rotation — no bouncing.
      this._p.copy(c.pos);
      this._p.y += (1 - k) * 0.5;
      this._q.setFromEuler(c.rot);
      this._s.copy(c.scale).multiplyScalar(0.001 + k * 0.999);
      this._m.compose(this._p, this._q, this._s);
      this.ice.setMatrixAt(i, this._m);
    }
    this.ice.instanceMatrix.needsUpdate = true;
  }

  update(state, ctx) {
    this.group.visible = state.s > 2.85 && state.s < 4.45;
    if (!this.group.visible) return;
    const w = state.env.cold;
    const t = ctx.time;
    this._updateIce(state.ice);
    this.wallMat.uniforms.uIntensity.value = 0.35 + 0.65 * w;
    this.wallMat.uniforms.uOpacity.value = w;
    this.floor.material.opacity = w;
    this.strips.visible = w > 0.02;
    this.stripMat.color.setRGB(1.9, 2.3, 2.6).multiplyScalar(0.25 + 0.75 * w);

    const mistAmt = state.mist * (ctx.reducedMotion ? 0.6 : 1);
    for (const sp of this.mist) {
      const u = sp.userData;
      sp.visible = mistAmt > 0.01;
      if (!sp.visible) continue;
      sp.position.set(u.base.x + Math.sin(t * u.speed + u.phase) * 0.8, u.base.y + Math.sin(t * u.speed * 1.7 + u.phase) * 0.06, u.base.z);
      sp.material.opacity = u.alpha * mistAmt;
    }
    const fa = Math.min(1, w * 1.2) * (state.mist > 0 ? 1 : 0.4);
    this.frost.visible = fa > 0.01;
    if (this.frost.visible) {
      this.frostMat.opacity = 0.7 * fa;
      if (!ctx.reducedMotion) this.frostTime.value = t;
    }
  }
}
