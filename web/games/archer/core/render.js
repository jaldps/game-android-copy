// Renderer, scene, lights, environment and the colour-grade output pass.
// Maps configure the look through applyLighting(def.lighting) — never by touching these objects directly.
import * as THREE from 'three';

export const R = { renderer: null, scene: null, camera: null, sun: null, hemi: null, fill: null, quality: 'high', pr: 1, grade: null };

export function initRender(canvas, quality) {
  R.quality = quality;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  R.pr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.25 : 2);
  renderer.setPixelRatio(R.pr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  R.renderer = renderer;

  const scene = new THREE.Scene(); R.scene = scene;
  scene.fog = new THREE.Fog(0xbfe0ee, 60, 260);
  R.camera = new THREE.PerspectiveCamera(26, window.innerWidth / window.innerHeight, 1, 900);

  R.hemi = new THREE.HemisphereLight(0xcfe6ff, 0xb0906a, 1.0); scene.add(R.hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 3.2);
  sun.castShadow = true;
  const sm = quality === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
  scene.add(sun, sun.target); R.sun = sun;
  R.sunDir = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();
  // cool rim/fill from behind-right so silhouettes pop against the sky
  R.fill = new THREE.DirectionalLight(0x9fd0ff, 0.9); R.fill.position.set(30, 20, -30); scene.add(R.fill);

  // gradient environment for glossy bits (metal, eyes, ice)
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = d.y;
      vec3 top = vec3(0.35,0.6,0.95), hor = vec3(1.0,0.93,0.84), gnd = vec3(0.5,0.45,0.38);
      vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor, gnd, pow(-h, 0.4));
      c += vec3(1.0,0.85,0.6) * pow(max(dot(d, normalize(vec3(-0.45,0.7,0.55))), 0.0), 48.0) * 5.0;
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.5;
  pm.dispose();
  setupGrade(quality !== 'low');
  setupInset();
  return R;
}

/** Map lighting contract: { sun, sunIntensity, sunDir:[x,y,z], hemiSky, hemiGround, hemiIntensity, fill, fillIntensity,
 *  fog, fogNear, fogFar, exposure, saturation, contrast, warmth:[r,g,b], envIntensity } (all optional). */
export function applyLighting(L = {}) {
  const s = R.scene;
  R.sun.color.set(L.sun ?? 0xffe0b0); R.sun.intensity = L.sunIntensity ?? 3.2;
  if (L.sunDir) R.sunDir.set(L.sunDir[0], L.sunDir[1], L.sunDir[2]).normalize(); else R.sunDir.set(-0.45, 0.8, 0.55).normalize();
  R.hemi.color.set(L.hemiSky ?? 0xcfe6ff); R.hemi.groundColor.set(L.hemiGround ?? 0xb0906a); R.hemi.intensity = L.hemiIntensity ?? 1.0;
  R.fill.color.set(L.fill ?? 0x9fd0ff); R.fill.intensity = L.fillIntensity ?? 0.9;
  s.fog.color.set(L.fog ?? 0xbfe0ee); s.fog.near = L.fogNear ?? 70; s.fog.far = L.fogFar ?? 280;
  s.environmentIntensity = L.envIntensity ?? 0.5;
  R.renderer.toneMappingExposure = L.exposure ?? 1.0;
  if (R.grade) {
    const u = R.grade.mat.uniforms;
    u.uSat.value = L.saturation ?? 1.18; u.uCon.value = L.contrast ?? 1.06;
    const w = L.warmth ?? [1.03, 1.0, 0.96]; u.uWarm.value.set(w[0], w[1], w[2]);
  }
}

/** Keep the shadow frustum tight around what the camera sees. */
export function followShadows(cx, cy, halfW) {
  const sun = R.sun, ext = Math.min(70, halfW + 6);
  sun.target.position.set(cx, cy, 0);
  sun.position.set(cx + R.sunDir.x * 70, cy + R.sunDir.y * 70, R.sunDir.z * 70);
  const sc = sun.shadow.camera;
  if (Math.abs(sc.right - ext) > 1.5) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.updateProjectionMatrix(); }
}

export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  if (R.grade) { const sz = R.renderer.getDrawingBufferSize(new THREE.Vector2()); R.grade.rt.setSize(sz.x, sz.y); }
}

function setupGrade(on) {
  if (!on) { R.grade = null; return; }
  const sz = R.renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(sz.x, sz.y, { type: THREE.HalfFloatType, samples: 4 });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uSat: { value: 1.18 }, uCon: { value: 1.06 }, uWarm: { value: new THREE.Vector3(1.03, 1, 0.96) }, uVig: { value: 0.22 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon, uVig; uniform vec3 uWarm; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat);
        c = max(vec3(0.0), (c - 0.18) * uCon + 0.18);
        c *= uWarm;
        vec2 q = vUv - 0.5; c *= 1.0 - uVig * dot(q, q) * 1.6;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  R.grade = { rt, mat, scene, cam };
}

// ------------------------------------------------------------------ picture-in-picture inset
// A small live view of a far-away target (e.g. the enemy archer while you aim). Rendered into its own target every
// other frame (amortised cost), then composited over the graded frame in one draw. The HUD draws the frame + label.
const INSET_PITCH = 7 * Math.PI / 180;
/** CSS-pixel rectangle of the inset for a side (+1 = right, -1 = left). Shared with the HUD. */
export function insetRect(side, out) {
  const W = window.innerWidth, H = window.innerHeight;
  out.w = Math.round(Math.min(210, Math.max(136, W * 0.19))); out.h = Math.round(out.w * 0.58);
  out.y = Math.round(Math.min(68, H * 0.16)); out.x = side > 0 ? W - out.w - 12 : 12;
  return out;
}
function setupInset() {
  const cam = new THREE.PerspectiveCamera(26, 16 / 9, 1, 900);
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  const g = R.grade?.mat.uniforms;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uSat: g ? g.uSat : { value: 1.18 }, uCon: g ? g.uCon : { value: 1.06 }, uWarm: g ? g.uWarm : { value: new THREE.Vector3(1.03, 1, 0.96) }, uAspect: { value: 1.7 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon, uAspect; uniform vec3 uWarm; varying vec2 vUv;
      void main(){
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0); vec2 b = vec2(uAspect * 0.5, 0.5) - 0.09;
        float dd = length(max(abs(q) - b, 0.0)) - 0.09; if (dd > 0.0) discard;
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat); c = max(vec3(0.0), (c - 0.18) * uCon + 0.18); c *= uWarm;
        vec2 v = vUv - 0.5; c *= 1.0 - 0.5 * dot(v, v);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  const scene = new THREE.Scene(), ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  R.inset = { on: false, x: 0, y: 0, h: 7, side: 1, cam, rt, mat, scene, ocam, frame: 0, ready: false, rect: { x: 0, y: 0, w: 0, h: 0 }, tv: new THREE.Vector3() };
}
function renderInset(r) {
  const I = R.inset, rc = insetRect(I.side, I.rect);
  const pw = Math.round(rc.w * R.pr), ph = Math.round(rc.h * R.pr);
  if (I.rt.width !== pw || I.rt.height !== ph) I.rt.setSize(pw, ph);
  const c = I.cam; c.aspect = rc.w / rc.h;
  const d = I.h / (2 * Math.tan(c.fov * Math.PI / 360));
  c.position.set(I.x, I.y + Math.sin(INSET_PITCH) * d, Math.cos(INSET_PITCH) * d); I.tv.set(I.x, I.y, 0); c.lookAt(I.tv);
  c.near = Math.max(1, d * 0.3); c.far = d + 700; c.updateProjectionMatrix();
  const au = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;   // reuse the main pass's shadow map
  r.setRenderTarget(I.rt); r.render(R.scene, c);
  r.shadowMap.autoUpdate = au;
  I.ready = true;
}
function compositeInset(r) {
  const I = R.inset, rc = I.rect;
  I.mat.uniforms.uAspect.value = rc.w / rc.h;
  const ac = r.autoClear; r.autoClear = false;
  r.setViewport(rc.x, window.innerHeight - rc.y - rc.h, rc.w, rc.h);
  r.render(I.scene, I.ocam);
  r.setViewport(0, 0, window.innerWidth, window.innerHeight);
  r.autoClear = ac;
}

export function renderFrame() {
  const r = R.renderer, I = R.inset;
  if (!R.grade) { r.setRenderTarget(null); r.render(R.scene, R.camera); }
  else {
    r.setRenderTarget(R.grade.rt); r.render(R.scene, R.camera);
    r.setRenderTarget(null); r.render(R.grade.scene, R.grade.cam);
  }
  if (!I.on) { I.ready = false; return; }
  // after the main pass, so the shadow map it just rendered is valid for the inset's (non-updating) shadow lookup
  if (!I.ready || (++I.frame & 1)) { renderInset(r); r.setRenderTarget(null); }
  compositeInset(r);
}
