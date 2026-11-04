import * as THREE from 'three';

/**
 * Procedural studio HDR environment for reflections, pre-filtered with PMREM.
 * Tall strip boxes give aluminium the classic vertical product highlights;
 * a broad overhead softbox and a cool back panel complete the rig.
 */
export function createEnvironmentMap(renderer) {
  const scene = new THREE.Scene();

  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize( position );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 top = vec3( 0.05, 0.09, 0.22 );
        vec3 horizon = vec3( 0.03, 0.05, 0.12 );
        vec3 floorC = vec3( 0.006, 0.008, 0.016 );
        vec3 c = h > 0.0 ? mix( horizon, top, smoothstep( 0.0, 0.8, h ) ) : mix( horizon, floorC, smoothstep( 0.0, 0.35, -h ) );
        gl_FragColor = vec4( c, 1.0 );
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), domeMat));

  const panel = (w, h, color, intensity, pos, lookAt = new THREE.Vector3()) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.copy(pos);
    m.lookAt(lookAt);
    scene.add(m);
    return m;
  };

  // Key strip (front-left) and kicker strips.
  panel(3, 30, '#ffffff', 9, new THREE.Vector3(-16, 2, 14));
  panel(2.2, 30, '#e8f0ff', 7, new THREE.Vector3(17, 1, 9));
  panel(1.4, 30, '#cfe0ff', 6, new THREE.Vector3(-14, 0, -16));
  panel(1.4, 30, '#ffffff', 7, new THREE.Vector3(15, 0, -15));
  // Overhead softbox.
  panel(22, 14, '#ffffff', 1.5, new THREE.Vector3(0, 24, 2), new THREE.Vector3(0, 0, 0));
  // Cool fill and a faint warm floor bounce.
  panel(26, 10, '#3a6dff', 0.9, new THREE.Vector3(0, 4, -30));
  panel(34, 14, '#7080a0', 0.6, new THREE.Vector3(0, -22, 0), new THREE.Vector3(0, 0, 0));
  // A small, restrained red accent card for colour in reflections.
  panel(4, 6, '#ff2438', 1.2, new THREE.Vector3(24, -6, 18));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.015);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  return rt;
}
