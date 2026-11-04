import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { WORLD } from '../config.js';
import { createBackdropMaterial } from './studio.js';
import { createRadialTexture } from '../product/canTextures.js';

/**
 * Scene 6 — luminous blue packshot studio: seamless curved cyclorama, a reflective
 * floor (true planar reflection on capable devices, glossy floor otherwise) and a
 * grounded shadow under the can.
 */
export class FinalStudio {
  constructor({ quality }) {
    this.group = new THREE.Group();
    this.group.name = 'env-final';
    const X = WORLD.finalX;
    this.X = X;
    const floorY = WORLD.floorY - 0.003;

    // Cyclorama: wall → cove → floor in one seamless sweep with a luminous gradient.
    this.cycMat = createBackdropMaterial({ base: '#041340', glow: '#2f6bff', glowPos: [0.5, 0.2], glowSize: [0.34, 0.42] });
    this.cycMat.side = THREE.DoubleSide;
    const wall = new THREE.Mesh(this._cycGeometry(), this.cycMat);
    wall.position.set(X, floorY - 0.012, 0);
    // Transparent layers draw in a fixed order (backdrop → floor → props), independent of camera angle.
    wall.renderOrder = -10;
    this.group.add(wall);

    // Optional true planar reflection, under a glossy coat whose opacity grows towards
    // the viewer — the far floor melts into the cove, the near floor grounds the can.
    this.reflector = null;
    if (quality.reflector) {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      this.reflector = new Reflector(new THREE.PlaneGeometry(40, 16.5), {
        textureWidth: Math.round(window.innerWidth * dpr * 0.5),
        textureHeight: Math.round(window.innerHeight * dpr * 0.5),
        color: 0x7d8aa6,
        clipBias: 0.003,
      });
      this.reflector.rotation.x = -Math.PI / 2;
      this.reflector.position.set(X, floorY - 0.006, 4.75);
      this.group.add(this.reflector);
    }
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    const g2 = c.getContext('2d');
    const grad = g2.createLinearGradient(0, 0, 0, 256);
    // top of texture = back of floor (towards the cove)
    grad.addColorStop(0, 'rgb(0,0,0)');
    grad.addColorStop(0.18, 'rgb(40,40,40)');
    grad.addColorStop(0.42, 'rgb(150,150,150)');
    grad.addColorStop(1, 'rgb(235,235,235)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 8, 256);
    const alpha = new THREE.CanvasTexture(c);
    alpha.colorSpace = THREE.NoColorSpace;
    this.floorMat = new THREE.MeshStandardMaterial({
      color: '#071a52',
      roughness: 0.32,
      metalness: 0.0,
      transparent: true,
      alphaMap: alpha,
      depthWrite: false,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 16.5), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(X, floorY, 4.75);
    floor.receiveShadow = true;
    floor.renderOrder = -5;
    this.group.add(floor);
  }

  _cycGeometry() {
    // Profile in (z, y): back wall → cove (r = 3) → floor lip; swept along x.
    const prof = [];
    const R = 3;
    for (let i = 0; i <= 6; i++) prof.push([-6.5, 14 - i * (11 / 6)]);
    for (let i = 1; i <= 16; i++) {
      const a = (i / 16) * (Math.PI / 2);
      prof.push([-6.5 + R - Math.cos(a) * R, R - Math.sin(a) * R]);
    }
    for (let i = 1; i <= 6; i++) prof.push([-3.5 + i * 2.6, 0]);
    const W = 40;
    const cols = 24;
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= cols; i++) {
      const x = -W / 2 + (i / cols) * W;
      prof.forEach(([z, y], j) => {
        pos.push(x, y, z);
        // v: 1 at the top of the wall, 0 where the cove meets the floor, negative on the floor.
        uv.push(i / cols, (y + Math.min(0, -(z + 3.5) * 0.6)) / 14);
      });
    }
    const n = prof.length;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < n - 1; j++) {
        const a = i * n + j;
        const b = (i + 1) * n + j;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  update(state, ctx) {
    const w = state.env.final;
    this.group.visible = state.s > 4.3 && w > 0.001;
    if (!this.group.visible) return;
    this.cycMat.uniforms.uIntensity.value = 0.3 + 0.7 * w;
    this.cycMat.uniforms.uOpacity.value = w;
    if (this.reflector) this.reflector.visible = w > 0.6;
    this.floorMat.opacity = w;
  }

  setSize(w, h, dpr) {
    if (this.reflector) this.reflector.getRenderTarget().setSize(Math.round(w * dpr * 0.5), Math.round(h * dpr * 0.5));
  }
}

/**
 * One soft contact shadow that follows the hero can onto whatever surface is
 * beneath it (conveyor, ice plinth, final floor) and fades with height.
 */
export class ContactShadow {
  constructor() {
    const tex = createRadialTexture(256, [[0, 'rgba(0,0,0,0.85)'], [0.45, 'rgba(0,0,0,0.42)'], [1, 'rgba(0,0,0,0)']]);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false, toneMapped: false }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 1;
    this.mesh.name = 'contact-shadow';
  }

  groundAt(x) {
    const F = WORLD.factory;
    if (x > F.startX - 0.4 && x < F.endX + 0.4) return F.beltTopY;
    if (Math.abs(x - WORLD.coldX) < 3) return WORLD.floorY;
    if (Math.abs(x - WORLD.finalX) < 6) return WORLD.floorY;
    return -3.4;
  }

  update(canPos) {
    const g = this.groundAt(canPos.x);
    const bottom = canPos.y - 1.222;
    const h = Math.max(0, bottom - g);
    const k = Math.max(0, 1 - h / 1.4);
    this.mesh.position.set(canPos.x, g + 0.004, canPos.z);
    const s = 1.75 + h * 0.9;
    this.mesh.scale.set(s, s, 1);
    this.mesh.material.opacity = 0.75 * k * k;
    this.mesh.visible = k > 0.01;
  }
}
