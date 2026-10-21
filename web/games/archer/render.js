// render.js
import * as THREE from '../../lib/three.module.js';
import { EffectComposer } from '../../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../lib/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from '../../lib/addons/postprocessing/SSAOPass.js';
import { OutputPass } from '../../lib/addons/postprocessing/OutputPass.js';

export function createRenderer(canvas){
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  return renderer;
}

export function createScene(){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x9bbcd6, 80, 220);

  // hemisphere
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.6);
  scene.add(hemi);

  // sun
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 250;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  scene.add(sun);
  scene.userData.sun = sun;

  // sky dome
  const skyGeo = new THREE.SphereGeometry(400, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { topColor:{value:new THREE.Color(0x0077ff)}, bottomColor:{value:new THREE.Color(0xffffff)}, offset:{value:40}, exponent:{value:0.6} },
    vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorldPosition=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h=normalize(vWorldPosition).y; float f=pow(max(h,0.0),exponent); gl_FragColor=vec4(mix(bottomColor,topColor,f),1.0); }`
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  return scene;
}

export function createCamera(){
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 500);
  camera.position.set(0, 25, 60);
  camera.lookAt(0, 5, 0);
  return camera;
}

export function createComposer(renderer, scene, camera){
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
  composer.addPass(bloom);
  const ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
  ssao.kernelRadius = 8;
  composer.addPass(ssao);
  composer.addPass(new OutputPass());
  return composer;
}

export function handleResize(camera, renderer, composer){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
