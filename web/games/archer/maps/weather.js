// GPU-animated ambient particles that wrap around the camera (zero CPU per frame). Owner: Maps specialist.
// createWeather({ kind: 'snow'|'motes'|'petals'|'embers', count }) -> { mesh, update(dt, t, cam) }
import * as THREE from 'three';
import { makeRng } from '../core/util.js';

const KINDS = {
  snow: { color: 0xffffff, size: 0.16, fall: [0.6, -2.2], wobble: 0.6, alpha: 0.9, additive: false },
  motes: { color: 0xfff2b0, size: 0.1, fall: [0.4, 0.25], wobble: 0.8, alpha: 0.75, additive: true },
  petals: { color: 0xffa8c8, size: 0.13, fall: [1.2, -0.8], wobble: 1.0, alpha: 0.9, additive: false },
  embers: { color: 0xffa040, size: 0.1, fall: [0.4, 1.4], wobble: 0.7, alpha: 0.9, additive: true },
};

export function createWeather({ kind = 'snow', count = 500, seed = 1, box = [70, 40, 30] } = {}) {
  const K = KINDS[kind] ?? KINDS.snow, rng = makeRng(seed);
  const pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = rng() * box[0]; pos[i * 3 + 1] = rng() * box[1]; pos[i * 3 + 2] = (rng() - 0.5) * box[2] + 2; ph[i] = rng() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: K.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector2() }, uBox: { value: new THREE.Vector3(...box) }, uFall: { value: new THREE.Vector2(...K.fall) },
      uSize: { value: K.size }, uColor: { value: new THREE.Color(K.color) }, uAlpha: { value: K.alpha }, uWob: { value: K.wobble }, uScale: { value: 400 }, uWind: { value: 0 } },
    vertexShader: `attribute float aPh; uniform float uTime, uSize, uWob, uScale, uWind; uniform vec2 uCam, uFall; uniform vec3 uBox; varying float vA;
      void main(){
        vec3 p = position;
        p.xy += (uFall + vec2(uWind * 0.6, 0.0)) * uTime + vec2(sin(uTime * 0.9 + aPh) * uWob, cos(uTime * 0.7 + aPh * 1.3) * uWob * 0.4);
        vec2 o = uCam - uBox.xy * 0.5;
        p.xy = o + mod(p.xy - o, uBox.xy);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * uScale / -mv.z, 1.0, 24.0);
        vA = 0.6 + 0.4 * sin(aPh * 7.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * uAlpha * vA; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Points(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 9;
  return {
    mesh,
    update(dt, t, cam, wind = 0) { const u = mat.uniforms; u.uTime.value = t; u.uCam.value.set(cam.x, cam.y); u.uWind.value = wind; u.uScale.value = window.innerHeight * Math.min(2, window.devicePixelRatio || 1) * 2.17; },
  };
}
