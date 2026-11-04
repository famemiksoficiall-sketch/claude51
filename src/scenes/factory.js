import * as THREE from 'three';
import { WORLD } from '../config.js';
import { rng } from '../product/canTextures.js';

function canvasTexture(w, h, draw, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

/** Instanced box/cylinder helper: one draw call for every repeated element. */
function instanced(geometry, material, transforms, { cast = false, receive = false } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  transforms.forEach((t, i) => {
    e.set(...(t.rot || [0, 0, 0]));
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(...t.pos), q, new THREE.Vector3(...(t.scale || [1, 1, 1])));
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Scene 3 — stylised production hall. The hero can lands on a running conveyor,
 * rides it at matched speed through a lit inspection gate. Repeated structure is
 * instanced; no other cans exist anywhere in the hall.
 */
export class Factory {
  constructor({ quality }) {
    const F = WORLD.factory;
    this.F = F;
    this.group = new THREE.Group();
    this.group.name = 'env-factory';
    const detail = quality.factoryDetail;
    const rand = rng(77);

    // ── Materials (shared) ────────────────────────────────────────────
    const steel = new THREE.MeshStandardMaterial({ name: 'stainless', color: '#aeb5bf', metalness: 1, roughness: 0.34 });
    const steelDark = new THREE.MeshStandardMaterial({ name: 'stainless-dark', color: '#6d7480', metalness: 1, roughness: 0.42 });
    const housing = new THREE.MeshStandardMaterial({ name: 'housing', color: '#141b26', metalness: 0.3, roughness: 0.55 });
    const lamp = new THREE.MeshBasicMaterial({ name: 'lamp', color: new THREE.Color('#fff4e3').multiplyScalar(3.2), toneMapped: true });
    const coldLamp = new THREE.MeshBasicMaterial({ name: 'lamp-cool', color: new THREE.Color('#d8e8ff').multiplyScalar(2.2) });
    this.lampMat = lamp;
    this.coldLampMat = coldLamp;
    const redLed = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3a').multiplyScalar(3) });

    const concrete = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#5b5e63';
      ctx.fillRect(0, 0, w, h);
      const r = rng(9);
      for (let i = 0; i < 3000; i++) {
        const v = 70 + r() * 40;
        ctx.fillStyle = `rgba(${v},${v},${v + 4},0.25)`;
        const s = 1 + r() * 4;
        ctx.fillRect(r() * w, r() * h, s, s);
      }
      ctx.strokeStyle = 'rgba(20,20,22,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, w, h);
    }, { srgb: false, repeat: [10, 4] });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 30),
      new THREE.MeshStandardMaterial({ color: '#2a2e35', roughness: 0.55, roughnessMap: concrete, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((F.startX + F.endX) / 2, -4.6, -4);
    floor.receiveShadow = true;
    this.group.add(floor);

    // ── Main conveyor ─────────────────────────────────────────────────
    const length = F.endX - F.startX;
    const midX = (F.startX + F.endX) / 2;
    this.tileLen = 0.6;
    this.beltTex = canvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1b1d21';
      ctx.fillRect(0, 0, w, h);
      // Modular plastic belt: hinge lines across the travel direction + edge/centre seams.
      ctx.fillStyle = '#272a30';
      for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 6, h);
      ctx.fillStyle = '#0e0f12';
      for (let x = 0; x < w; x += 16) ctx.fillRect(x + 6, 0, 1, h);
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      ctx.fillRect(0, h / 2 - 1, w, 2);
    }, { repeat: [length / 0.6, 1] });
    const beltTop = F.beltTopY;
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.08, 1.9),
      new THREE.MeshStandardMaterial({ name: 'belt', color: '#ffffff', map: this.beltTex, roughness: 0.62, metalness: 0.1 }),
    );
    belt.position.set(midX, beltTop - 0.04, 0);
    belt.receiveShadow = true;
    this.group.add(belt);
    this.beltMap = this.beltTex;

    // Side channels (stainless) and guide rails.
    const chan = new THREE.BoxGeometry(length, 0.36, 0.08);
    for (const z of [-1.0, 1.0]) {
      const c = new THREE.Mesh(chan, steel);
      c.position.set(midX, beltTop - 0.16, z);
      c.receiveShadow = true;
      this.group.add(c);
    }
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, length, 12);
    railGeo.rotateZ(Math.PI / 2);
    const rails = [];
    for (const z of [-1.08, 1.08]) rails.push({ pos: [midX, beltTop + 0.2, z] });
    this.group.add(instanced(railGeo, steel, rails));
    // Rail brackets + belt legs.
    const brackets = [];
    const legs = [];
    for (let x = F.startX + 0.6; x < F.endX; x += 2.2) {
      for (const z of [-1.12, 1.12]) brackets.push({ pos: [x, beltTop + 0.06, z] });
      for (const z of [-0.85, 0.85]) legs.push({ pos: [x, (beltTop - 0.3 - 4.6) / 2, z] });
    }
    this.group.add(instanced(new THREE.BoxGeometry(0.06, 0.34, 0.05), steelDark, brackets));
    const legH = beltTop - 0.3 + 4.6;
    this.group.add(instanced(new THREE.BoxGeometry(0.12, legH, 0.12), steelDark, legs, { cast: false }));
    // Under-belt crossmembers.
    const cross = legs.filter((_, i) => i % 2 === 0).map((l) => ({ pos: [l.pos[0], beltTop - 0.75, 0] }));
    this.group.add(instanced(new THREE.BoxGeometry(0.1, 0.1, 1.9), steelDark, cross));

    // End drums (visible rollers that turn with the belt).
    const drumGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.92, 32);
    drumGeo.rotateX(Math.PI / 2);
    this.drums = [];
    for (const x of [F.startX, F.endX]) {
      const d = new THREE.Mesh(drumGeo, steel);
      d.position.set(x, beltTop - 0.2, 0);
      this.group.add(d);
      this.drums.push(d);
    }

    // ── Inspection gate ───────────────────────────────────────────────
    const gate = new THREE.Group();
    gate.position.set(F.gateX, 0, 0);
    const post = new THREE.BoxGeometry(0.42, 3.6, 0.42);
    for (const z of [-1.55, 1.55]) {
      const p = new THREE.Mesh(post, housing);
      p.position.set(0, beltTop + 1.6, z);
      gate.add(p);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.6), coldLamp);
      panel.position.set(0, beltTop + 1.55, z * 0.86);
      panel.rotation.y = z > 0 ? Math.PI : 0;
      gate.add(panel);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), redLed);
      led.position.set(0.22, beltTop + 3.1, z);
      gate.add(led);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 3.52), housing);
    beam.position.set(0, beltTop + 3.4, 0);
    gate.add(beam);
    const topLamp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.6), coldLamp);
    topLamp.rotation.x = Math.PI / 2;
    topLamp.position.set(0, beltTop + 3.19, 0);
    gate.add(topLamp);
    // Light curtain: an additive sheet that brightens as the can passes.
    this.curtainMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uAmount: { value: 0 }, uScan: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uAmount; uniform float uScan; varying vec2 vUv;
        void main(){
          float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          float line = exp(-pow((vUv.y - uScan) * 22.0, 2.0));
          float haze = 0.05;
          vec3 c = vec3(0.55, 0.75, 1.0) * (line * 0.9 + haze) * edge * uAmount;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.1), this.curtainMat);
    curtain.rotation.y = Math.PI / 2;
    curtain.position.set(0, beltTop + 1.6, 0);
    gate.add(curtain);
    this.gateLight = new THREE.PointLight('#cfe2ff', 0, 6, 2);
    this.gateLight.position.set(0.4, beltTop + 2.4, 0.8);
    gate.add(this.gateLight);
    this.group.add(gate);

    // ── Overhead structure & light bars (the camera passes beneath them) ──
    const trussGeo = new THREE.BoxGeometry(46, 0.25, 0.25);
    this.group.add(instanced(trussGeo, steelDark, [
      { pos: [midX, 5.6, -3] }, { pos: [midX, 5.6, 3] }, { pos: [midX, 6.4, -3] }, { pos: [midX, 6.4, 3] }, { pos: [midX, 5.6, -9] },
    ]));
    const crossBeams = [];
    const lampBars = [];
    for (let x = F.startX - 6; x < F.endX + 6; x += 3.2) {
      crossBeams.push({ pos: [x, 6.0, -3] , scale: [1, 1, 1] });
      lampBars.push({ pos: [x + 1.6, 5.35, 0] });
    }
    this.group.add(instanced(new THREE.BoxGeometry(0.18, 0.9, 13), steelDark, crossBeams));
    this.group.add(instanced(new THREE.BoxGeometry(0.22, 0.06, 3.2), lamp, lampBars));

    // ── Background production line (empty — no other cans) ────────────
    const bgZ = -5.6;
    const bgBelt = new THREE.Mesh(new THREE.BoxGeometry(44, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: '#1a1c20', map: this.beltTex.clone(), roughness: 0.6 }));
    bgBelt.material.map.repeat.set(44 / 0.6, 1);
    this.bgBeltMap = bgBelt.material.map;
    bgBelt.position.set(midX, -1.9, bgZ);
    this.group.add(bgBelt);
    const bgLegs = [];
    for (let x = midX - 21; x < midX + 22; x += 3) for (const z of [bgZ - 0.6, bgZ + 0.6]) bgLegs.push({ pos: [x, -3.25, z] });
    this.group.add(instanced(new THREE.BoxGeometry(0.1, 2.7, 0.1), steelDark, bgLegs));
    this.group.add(instanced(new THREE.BoxGeometry(44, 0.25, 0.06), steel, [{ pos: [midX, -1.82, bgZ - 0.74] }, { pos: [midX, -1.82, bgZ + 0.74] }]));

    // Filler/capper style housings with synchronized pistons.
    this.pistons = [];
    const pistonGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 16);
    const nPress = Math.round(4 * detail);
    for (let i = 0; i < nPress; i++) {
      const x = F.startX + 3 + i * (length - 4) / Math.max(1, nPress - 1);
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.8), housing);
      box.position.set(x, 1.3, bgZ);
      this.group.add(box);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.25), coldLamp);
      win.position.set(x, 1.1, bgZ + 0.91);
      this.group.add(win);
      for (const dx of [-0.5, 0, 0.5]) {
        const p = new THREE.Mesh(pistonGeo, steel);
        p.position.set(x + dx, -0.4, bgZ);
        this.group.add(p);
        this.pistons.push({ mesh: p, phase: i * 0.7 + dx * 2.2 });
      }
    }

    // Flywheels / drive wheels turning in the mid-ground.
    this.wheels = [];
    const wheelGeo = new THREE.TorusGeometry(0.9, 0.08, 10, 48);
    const spokeGeo = new THREE.BoxGeometry(1.8, 0.07, 0.07);
    for (let i = 0; i < Math.round(3 * detail); i++) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(wheelGeo, steel));
      for (let k = 0; k < 3; k++) {
        const s = new THREE.Mesh(spokeGeo, steel);
        s.rotation.z = (k * Math.PI) / 3;
        w.add(s);
      }
      w.position.set(F.startX + 5 + i * 8.5, -2.6, -3.2);
      this.group.add(w);
      this.wheels.push(w);
    }

    // Pipes and process tanks in the deep background.
    const pipeGeo = new THREE.CylinderGeometry(0.14, 0.14, 50, 12);
    pipeGeo.rotateZ(Math.PI / 2);
    const pipes = [];
    for (let k = 0; k < 4; k++) pipes.push({ pos: [midX, 3.4 + k * 0.42, -8.4 - (k % 2) * 0.4] });
    this.group.add(instanced(pipeGeo, steel, pipes));
    const tankGeo = new THREE.CylinderGeometry(2.2, 2.2, 8, 40);
    const capGeo = new THREE.SphereGeometry(2.2, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const tanks = [];
    const caps = [];
    for (let i = 0; i < Math.round(5 * detail); i++) {
      const x = F.startX - 2 + i * 6.5;
      tanks.push({ pos: [x, -0.6, -13.5] });
      caps.push({ pos: [x, 3.4, -13.5], scale: [1, 0.35, 1] });
    }
    this.group.add(instanced(tankGeo, steel, tanks));
    this.group.add(instanced(capGeo, steel, caps));
    // Columns.
    const cols = [];
    for (let x = F.startX - 4; x < F.endX + 6; x += 7) for (const z of [-7.4]) cols.push({ pos: [x, 1, z] });
    this.group.add(instanced(new THREE.BoxGeometry(0.5, 11.5, 0.5), housing, cols));
    // A few steel grating panels and safety rail at the near side (foreground depth cues).
    const fgRail = new THREE.CylinderGeometry(0.03, 0.03, 50, 8);
    fgRail.rotateZ(Math.PI / 2);
    this.group.add(instanced(fgRail, steelDark, [{ pos: [midX, -3.4, 3.6] }, { pos: [midX, -3.9, 3.6] }]));

    // Warm overhead pools of light on the floor (cheap: additive decals).
    this.rand = rand;
    this.gateX = F.gateX;
  }

  update(state, ctx) {
    this.group.visible = state.s > 1.95 && state.s < 3.45;
    if (!this.group.visible) return;
    const w = state.env.factory;
    const canX = ctx.canPos.x;
    const t = ctx.time;

    // Belt surface moves with the can (zero slip once it lands).
    this.beltMap.offset.x = -(canX - this.F.startX) / this.tileLen;
    for (const d of this.drums) d.rotation.z = -(canX - this.F.startX) / 0.2;
    this.bgBeltMap.offset.x = -t * 0.9;

    // Machinery runs continuously.
    for (const p of this.pistons) p.mesh.position.y = -0.4 + 0.22 * Math.max(0, Math.sin(t * 2.4 + p.phase));
    for (let i = 0; i < this.wheels.length; i++) this.wheels[i].rotation.z = -t * (0.6 + i * 0.15);

    // Inspection gate responds when the can is inside.
    const dx = canX - this.gateX;
    const near = Math.exp(-(dx * dx) / 2.2);
    this.curtainMat.uniforms.uAmount.value = (0.25 + 0.75 * near) * w;
    this.curtainMat.uniforms.uScan.value = 0.5 + 0.42 * Math.sin(t * 2.2);
    this.gateLight.intensity = near * 22 * w;
    this.lampMat.color.setRGB(3.2, 3.0, 2.75).multiplyScalar(0.35 + 0.65 * w);
  }
}
