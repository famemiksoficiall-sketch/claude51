import * as THREE from 'three';
import {
  MM, toWorldY, buildLathe, planarLidUV, buildTabGeometry,
  PROFILE_BOTTOM, PROFILE_PRINT, PROFILE_TOP, PROFILE_LID,
} from './canGeometry.js';
import { rng } from './canTextures.js';

/**
 * THE hero can. Constructed exactly once; its identity persists for the whole film.
 *
 * Hierarchy
 *   root    (world position — driven by the timeline)
 *   └ pivot (orientation + secondary motion)
 *      ├ body  (printed wall)        painted aluminium + varnish + condensation shader
 *      ├ shell (bottom / neck / rim) bare spun aluminium
 *      ├ lid   (panel)               lid alloy with scored opening (bump)
 *      ├ tab + rivet                 stamped aluminium
 *      └ droplets (InstancedMesh)    larger water beads that adhere to the wall
 */
export class HeroCan {
  constructor({ textures, quality, envMap = null }) {
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.name = 'hero-can';
    this.root.userData.isHeroCan = true;
    this.pivot = new THREE.Group();
    this.root.add(this.pivot);

    const seg = quality.radialSegments;
    this.uniforms = {
      uWet: { value: 0 },
      uDropMap: { value: textures.droplets },
      uDropRepeat: { value: new THREE.Vector2(5, 2.5) },
      uTime: { value: 0 },
    };

    // ── Materials ────────────────────────────────────────────────────
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      name: 'painted-aluminium',
      map: textures.label,
      roughnessMap: textures.orm,
      metalnessMap: textures.orm,
      roughness: 1,
      metalness: 1,
      normalMap: textures.bodyNormal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      clearcoat: 0.55,
      clearcoatRoughness: 0.14,
      envMap,
    });
    this._injectCondensation(this.bodyMaterial);

    this.bareMaterial = new THREE.MeshPhysicalMaterial({
      name: 'bare-aluminium',
      color: '#c4cad3',
      metalness: 1,
      roughness: 0.3,
      normalMap: textures.bodyNormal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      envMap,
    });
    this.lidMaterial = new THREE.MeshPhysicalMaterial({
      name: 'lid-alloy',
      color: '#a9b0ba',
      metalness: 1,
      roughness: 0.36,
      bumpMap: textures.lidBump,
      bumpScale: 3.2,
      envMap,
    });
    this.tabMaterial = new THREE.MeshPhysicalMaterial({
      name: 'tab-alloy',
      color: '#c3c9d2',
      metalness: 1,
      roughness: 0.2,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      envMap,
    });

    // ── Geometry ─────────────────────────────────────────────────────
    const body = new THREE.Mesh(buildLathe(PROFILE_PRINT, seg, { arcV: true }), this.bodyMaterial);
    body.name = 'can-body';
    const bottom = new THREE.Mesh(buildLathe(PROFILE_BOTTOM, seg), this.bareMaterial);
    bottom.name = 'can-bottom';
    const top = new THREE.Mesh(buildLathe(PROFILE_TOP, seg), this.bareMaterial);
    top.name = 'can-rim';
    const lid = new THREE.Mesh(planarLidUV(buildLathe(PROFILE_LID, Math.max(64, seg / 2))), this.lidMaterial);
    lid.name = 'can-lid';

    const tab = new THREE.Mesh(buildTabGeometry(), this.tabMaterial);
    tab.name = 'can-tab';
    tab.position.set(0, toWorldY(116.68) + 0.2 * MM, 0);
    tab.rotation.x = THREE.MathUtils.degToRad(-2.2); // ring end rests very slightly lifted
    const rivet = new THREE.Mesh(
      buildLathe([[2.0, 116.9], [1.85, 117.3], [1.5, 117.62], [0.9, 117.82], [0, 117.88]], 32),
      this.lidMaterial,
    );
    rivet.name = 'can-rivet';

    for (const m of [body, bottom, top, lid, tab, rivet]) {
      m.castShadow = true;
      m.receiveShadow = false;
      this.pivot.add(m);
    }
    this.meshes = { body, bottom, top, lid, tab, rivet };

    this._buildDroplets(quality.droplets, quality.transmission, envMap);
  }

  /** Shader-level moisture: fine mist film + progressively appearing beads. */
  _injectCondensation(material) {
    const U = this.uniforms;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uWet: U.uWet, uDropMap: U.uDropMap, uDropRepeat: U.uDropRepeat });
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uWet;
          uniform sampler2D uDropMap;
          uniform vec2 uDropRepeat;`,
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
          vec4 dropS = texture2D( uDropMap, vNormalMapUv * uDropRepeat );
          float dropVis = smoothstep( dropS.b - 0.08, dropS.b + 0.02, uWet );
          float dropM = dropS.a * dropVis;
          float dropBead = smoothstep( 0.04, 0.4, dropM );
          // Damp film between beads: slightly hazier, less metallic sheen.
          float film = uWet * 0.6;
          roughnessFactor = mix( roughnessFactor, min( 1.0, roughnessFactor + 0.16 ), film );
          metalnessFactor = mix( metalnessFactor, metalnessFactor * 0.8, film );
          diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * 0.9 + vec3( 0.03, 0.045, 0.06 ), film );
          // Water beads: glassy, dielectric.
          roughnessFactor = mix( roughnessFactor, 0.03, dropBead );
          metalnessFactor = mix( metalnessFactor, metalnessFactor * 0.35, dropBead );
          diffuseColor.rgb *= mix( 1.0, 0.72, dropBead );`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          vec3 dropN = vec3( dropS.rg * 2.0 - 1.0, 0.0 );
          dropN.z = sqrt( max( 0.0, 1.0 - dot( dropN.xy, dropN.xy ) ) );
          normal = normalize( mix( normal, normalize( tbn * dropN ), smoothstep( 0.02, 0.3, dropM ) ) );`,
        );
    };
    material.customProgramCacheKey = () => 'can-condensation-v1';
  }

  /** Larger beads as one instanced draw (shared geometry + material). */
  _buildDroplets(count, transmission, envMap) {
    const geo = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.rotateX(Math.PI / 2); // dome faces +Z
    const mat = transmission
      ? new THREE.MeshPhysicalMaterial({
        name: 'water-bead', color: '#f4f9ff', metalness: 0, roughness: 0.07, transmission: 1, thickness: 0.05,
        ior: 1.33, envMap, envMapIntensity: 1.4, specularIntensity: 1,
      })
      : new THREE.MeshPhysicalMaterial({
        name: 'water-bead', color: '#dfeaf8', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.42,
        ior: 1.33, clearcoat: 1, envMap, envMapIntensity: 1.6, depthWrite: false,
      });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.name = 'can-droplets';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const rand = rng(1234);
    this.drops = [];
    const R = 33 * MM;
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const y = toWorldY(16 + rand() * 82);
      const size = (0.45 + Math.pow(rand(), 2.4) * 1.6) * MM;
      this.drops.push({
        theta, y, size,
        thr: 0.25 + rand() * 0.7,
        slide: rand() < 0.07 ? 0.02 + rand() * 0.03 : 0,
        phase: rand(),
        R,
      });
    }
    this.dropletMesh = mesh;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._z = new THREE.Vector3(0, 0, 1);
    this._n = new THREE.Vector3();
    this._lastWet = -1;
    this.pivot.add(mesh);
    this._updateDroplets(0, 0, true);
  }

  _updateDroplets(wet, time, force = false) {
    const sliding = wet > 0.6;
    if (!force && !sliding && Math.abs(wet - this._lastWet) < 0.002) return;
    this._lastWet = wet;
    const mesh = this.dropletMesh;
    mesh.visible = wet > 0.02;
    if (!mesh.visible && !force) return;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      const vis = THREE.MathUtils.smoothstep(wet, d.thr - 0.12, d.thr + 0.04);
      let y = d.y;
      let fade = 1;
      if (d.slide && sliding) {
        const f = (time * d.slide + d.phase) % 1;
        y = d.y - f * 0.55;
        fade = Math.sin(Math.PI * f);
        if (y < toWorldY(15)) fade = 0;
      }
      const sz = d.size * vis * fade;
      this._n.set(Math.sin(d.theta), 0, Math.cos(d.theta));
      this._p.set(this._n.x * d.R, y, this._n.z * d.R);
      this._q.setFromUnitVectors(this._z, this._n);
      this._s.set(sz, sz * (d.slide ? 1.6 : 1.18), sz * 0.55);
      this._m.compose(this._p, this._q, this._s);
      mesh.setMatrixAt(i, this._m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  setWetness(wet, time) {
    this.uniforms.uWet.value = wet;
    this._updateDroplets(wet, time);
  }

  /** Every material this object owns (for envMap updates and pre-compilation). */
  get materials() {
    return [this.bodyMaterial, this.bareMaterial, this.lidMaterial, this.tabMaterial, this.dropletMesh.material];
  }

  setEnvMap(envMap) {
    for (const m of this.materials) {
      m.envMap = envMap;
      m.needsUpdate = true;
    }
  }
}
