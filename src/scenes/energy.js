import * as THREE from 'three';
import { WORLD } from '../config.js';
import { rng } from '../product/canTextures.js';
import { createBackdropMaterial } from './studio.js';

/**
 * Scene 5 — controlled energy. One stylised cola ribbon arcs around the can
 * (behind the label, in front only above/below it), with a handful of droplets
 * that hang in the air while the scroll holds — no fluid simulation, no particle burst.
 */
export class Energy {
  constructor({ quality }) {
    this.group = new THREE.Group();
    this.group.name = 'env-energy';
    const E = WORLD.energy;
    this.E = E;

    this.backMat = createBackdropMaterial({ base: '#010616', glow: '#1747c4', glowPos: [0.5, 0.5], glowSize: [0.28, 0.34], beams: 1 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(34, 20), this.backMat);
    back.position.set(E.x, E.y, -8);
    this.group.add(back);

    // Ribbon rig follows the can's position (not its spin).
    this.rig = new THREE.Group();
    this.rig.rotation.z = THREE.MathUtils.degToRad(14);
    this.group.add(this.rig);

    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        const th = Math.PI + (t - 0.5) * 2.3 * Math.PI;
        const y = -1.85 + 3.75 * t;
        const r = 1.12 + 0.22 * Math.sin(Math.PI * t);
        return new THREE.Vector3(Math.sin(th) * r, y, Math.cos(th) * r);
      }),
      false,
      'centripetal',
    );
    this.curve = curve;
    this.uniforms = { uHead: { value: 0 }, uTail: { value: 0 }, uTime: { value: 0 } };
    this.ribbon = new THREE.Mesh(this._ribbonGeometry(curve, 260, 14), this._liquidMaterial(quality, true));
    this.ribbon.name = 'liquid-ribbon';
    this.ribbon.frustumCulled = false;
    this.ribbon.castShadow = false;
    this.rig.add(this.ribbon);

    // Droplets: few, deliberate.
    const rand = rng(55);
    const n = 22;
    this.drops = [];
    const dropMat = this._liquidMaterial(quality, false);
    this.dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), dropMat, n);
    this.dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dropMesh.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      const t = 0.08 + rand() * 0.84;
      const p = curve.getPointAt(t);
      const out = new THREE.Vector3(p.x, 0, p.z).normalize();
      out.y = (rand() - 0.3) * 0.8;
      out.normalize();
      this.drops.push({ t, p, out, dist: 0.12 + rand() * 0.6, size: 0.018 + Math.pow(rand(), 2) * 0.05, wob: rand() * 6 });
    }
    this.rig.add(this.dropMesh);
    this._m = new THREE.Matrix4();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  _ribbonGeometry(curve, segs, radial) {
    const frames = curve.computeFrenetFrames(segs, false);
    const pos = [];
    const nor = [];
    const center = [];
    const tAttr = [];
    const idx = [];
    const P = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, P);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      const taper = Math.pow(Math.sin(Math.PI * t), 0.55);
      const width = 0.2 * taper * (0.85 + 0.15 * Math.sin(t * 19));
      const thick = 0.05 * taper + 0.004;
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const cx = Math.cos(a);
        const sy = Math.sin(a);
        // Flattened, slightly lens-shaped section.
        const nx = N.x * sy * thick + B.x * cx * width;
        const ny = N.y * sy * thick + B.y * cx * width;
        const nz = N.z * sy * thick + B.z * cx * width;
        pos.push(P.x + nx, P.y + ny, P.z + nz);
        const nn = new THREE.Vector3(N.x * sy / thick + B.x * cx / width, N.y * sy / thick + B.y * cx / width, N.z * sy / thick + B.z * cx / width).normalize();
        nor.push(nn.x, nn.y, nn.z);
        center.push(P.x, P.y, P.z);
        tAttr.push(t);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j;
        const b = (i + 1) * (radial + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('aCenter', new THREE.Float32BufferAttribute(center, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(tAttr, 1));
    g.setIndex(idx);
    return g;
  }

  _liquidMaterial(quality, ribbon) {
    const mat = quality.transmission
      ? new THREE.MeshPhysicalMaterial({
        name: 'cola', color: '#ffc08a', roughness: 0.05, metalness: 0, transmission: 1, thickness: 0.12, ior: 1.34,
        attenuationColor: new THREE.Color('#8a2c08'), attenuationDistance: 0.32, clearcoat: 1, clearcoatRoughness: 0.05,
        specularIntensity: 1, side: THREE.DoubleSide,
      })
      : new THREE.MeshPhysicalMaterial({
        name: 'cola', color: '#3a1205', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
        sheen: 1, sheenColor: new THREE.Color('#d0621f'), sheenRoughness: 0.35, side: THREE.DoubleSide,
      });
    const amber = (shader) => {
      // Thin-edge amber glow: light scattering through the rim of the liquid.
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float colaEdge = pow( 1.0 - abs( dot( normal, normalize( vViewPosition ) ) ), 2.5 );
        totalEmissiveRadiance += vec3( 0.9, 0.32, 0.06 ) * colaEdge * 0.55;`);
    };
    if (!ribbon) {
      mat.onBeforeCompile = amber;
      mat.customProgramCacheKey = () => 'cola-drop-v1';
      return mat;
    }
    const U = this.uniforms;
    mat.onBeforeCompile = (shader) => {
      amber(shader);
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 aCenter; attribute float aT;
          uniform float uHead; uniform float uTail; uniform float uTime;
          varying float vT;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vT = aT;
          // Taper the head and tail so the stream reads as poured, not cut.
          float headK = smoothstep( uHead, uHead - 0.08, aT );
          float tailK = smoothstep( uTail, uTail + 0.08, aT );
          float k = headK * tailK;
          vec3 off = position - aCenter;
          float wave = sin( aT * 22.0 - uTime * 2.2 ) * 0.012 + sin( aT * 9.0 + uTime * 1.3 ) * 0.01;
          transformed = aCenter + off * k + normal * wave * k;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uHead; uniform float uTail; varying float vT;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if ( vT > uHead || vT < uTail ) discard;`);
    };
    mat.customProgramCacheKey = () => 'cola-ribbon-v1';
    return mat;
  }

  update(state, ctx) {
    this.group.visible = state.s > 3.75 && state.s < 5.2;
    if (!this.group.visible) return;
    const w = state.env.energy;
    this.backMat.uniforms.uIntensity.value = 0.3 + 0.7 * w;
    this.backMat.uniforms.uOpacity.value = w;
    const L = state.liquid;
    const head = THREE.MathUtils.clamp(L, 0, 1);
    const tail = THREE.MathUtils.clamp(L - 1, 0, 1);
    this.uniforms.uHead.value = head * 1.02;
    this.uniforms.uTail.value = tail * 1.02;
    this.uniforms.uTime.value = ctx.reducedMotion ? 0 : ctx.time;
    this.ribbon.visible = head - tail > 0.005;
    this.rig.position.copy(ctx.canPos);

    // Droplets: scroll-phase driven so they hang when the visitor pauses.
    const phase = THREE.MathUtils.clamp((L - 0.55) / 0.7, 0, 1);
    const vis = THREE.MathUtils.smoothstep(L, 0.5, 0.75) * (1 - THREE.MathUtils.smoothstep(L, 1.3, 1.65));
    this.dropMesh.visible = vis > 0.01;
    if (!this.dropMesh.visible) return;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      const appear = d.t < head ? 1 : 0;
      const dist = d.dist * (0.25 + phase);
      this._v.copy(d.p).addScaledVector(d.out, dist);
      this._v.y += Math.sin(ctx.time * 0.8 + d.wob) * 0.01;
      const s = d.size * vis * appear;
      this._s.set(s, s * 1.15, s);
      this._m.compose(this._v, this._q, this._s);
      this.dropMesh.setMatrixAt(i, this._m);
    }
    this.dropMesh.instanceMatrix.needsUpdate = true;
  }
}
