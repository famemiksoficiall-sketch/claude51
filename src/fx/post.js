import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.32 }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uAmount; uniform float uAspect; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
      float v = smoothstep(0.95, 0.25, length(d) * 0.9);
      c.rgb *= mix(1.0 - uAmount, 1.0, v);
      gl_FragColor = c;
    }`,
};

/**
 * Restrained post: MSAA HDR target → (macro-only) depth of field → subtle bloom
 * → gentle vignette → tone mapping + sRGB output.
 */
export class Post {
  constructor(renderer, scene, camera, quality, size) {
    this.renderer = renderer;
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const rt = new THREE.WebGLRenderTarget(size.w * size.dpr, size.h * size.dpr, {
      type: THREE.HalfFloatType,
      samples: isWebGL2 ? quality.msaa : 0,
    });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(size.dpr);
    this.composer.setSize(size.w, size.h);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bokeh = null;
    if (quality.dof) {
      this.bokeh = new BokehPass(scene, camera, { focus: 2.5, aperture: 0.0, maxblur: 0.006 });
      this.bokeh.enabled = false;
      this.composer.addPass(this.bokeh);
    }
    this.bloom = null;
    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.22, 0.5, 1.35);
      this.composer.addPass(this.bloom);
    }
    this.vignette = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignette);
    this.composer.addPass(new OutputPass());
  }

  setSize(w, h, dpr) {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.vignette.uniforms.uAspect.value = w / h;
  }

  update(state, focusDistance) {
    if (this.bloom) this.bloom.strength = state.bloom;
    if (this.bokeh) {
      const a = state.dof;
      this.bokeh.enabled = a > 0.02;
      this.bokeh.uniforms.focus.value = focusDistance;
      this.bokeh.uniforms.aperture.value = 0.0028 * a;
      this.bokeh.uniforms.maxblur.value = 0.0065 * a;
    }
  }

  render(dt) {
    this.composer.render(dt);
  }
}
