import * as THREE from 'three';
import { WORLD } from '../config.js';

/** Shared backdrop shader: dark gradient with a soft, controllable glow. */
export function createBackdropMaterial({ base = '#020611', glow = '#0d2a6e', glowPos = [0.5, 0.48], glowSize = [0.5, 0.4], beams = 0 } = {}) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    fog: false,
    uniforms: {
      uBase: { value: new THREE.Color(base) },
      uGlow: { value: new THREE.Color(glow) },
      uGlowPos: { value: new THREE.Vector2(...glowPos) },
      uGlowSize: { value: new THREE.Vector2(...glowSize) },
      uIntensity: { value: 1 },
      uOpacity: { value: 1 },
      uBeams: { value: beams },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uGlow;
      uniform vec2 uGlowPos;
      uniform vec2 uGlowSize;
      uniform float uIntensity;
      uniform float uOpacity;
      uniform float uBeams;
      uniform float uTime;
      varying vec2 vUv;
      float hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
      void main() {
        vec2 d = ( vUv - uGlowPos ) / uGlowSize;
        float g = exp( -dot( d, d ) * 1.6 );
        vec3 c = uBase + uGlow * g * uIntensity;
        if ( uBeams > 0.0 ) {
          // Two soft diagonal light shafts.
          float b1 = exp( -pow( ( vUv.x - 0.35 ) - ( vUv.y - 0.5 ) * 0.55, 2.0 ) * 140.0 );
          float b2 = exp( -pow( ( vUv.x - 0.66 ) - ( vUv.y - 0.5 ) * 0.55, 2.0 ) * 380.0 );
          c += uGlow * ( b1 * 0.55 + b2 * 0.35 ) * uBeams * smoothstep( 0.0, 0.7, vUv.y ) * uIntensity;
        }
        // Dither to avoid banding in deep gradients.
        c += ( hash( gl_FragCoord.xy ) - 0.5 ) / 255.0;
        gl_FragColor = vec4( c, uOpacity );
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Scene 1 & 2 — dark blue product studio. The can floats in negative space,
 * a curved backdrop carries a faint blue halo that blooms up with the reveal.
 */
export class Studio {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'env-studio';
    const x = WORLD.studioX;

    this.backdropMat = createBackdropMaterial({ base: '#010409', glow: '#06205c', glowPos: [0.5, 0.5], glowSize: [0.26, 0.32] });
    const backdrop = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 22, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), this.backdropMat);
    backdrop.material.side = THREE.BackSide;
    backdrop.position.set(x, 1, 4);
    this.group.add(backdrop);

    // Distant glossy studio floor far beneath the floating can.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 64),
      new THREE.MeshStandardMaterial({ color: '#03070f', roughness: 0.32, metalness: 0.0, transparent: true }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, -3.4, 0);
    floor.receiveShadow = true;
    this.floor = floor;
    this.group.add(floor);
  }

  update(state, ctx) {
    this.group.visible = state.s < 2.4;
    if (!this.group.visible) return;
    this.backdropMat.uniforms.uIntensity.value = 0.2 + 0.8 * ctx.reveal;
    this.backdropMat.uniforms.uOpacity.value = state.env.studio;
    this.floor.material.opacity = state.env.studio;
  }
}
