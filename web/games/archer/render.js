import * as THREE from '../../lib/three.module.js';

export function createRenderer(canvas){
  const r = new THREE.WebGLRenderer({canvas, antialias:true});
  r.setSize(window.innerWidth, window.innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.2;
  return r;
}

export function createScene(){
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x87ceeb);
  s.fog = new THREE.Fog(0x87ceeb, 80, 250);
  const amb = new THREE.AmbientLight(0xffffff, 0.5);
  s.add(amb);
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3f8f4a, 0.4);
  s.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff8e7, 1.4);
  sun.position.set(60,80,40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 300;
  s.add(sun);
  return s;
}

export function createCamera(){
  const c = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 500);
  c.position.set(0, 25, 60);
  c.lookAt(0, 5, 0);
  return c;
}

export function handleResize(camera, renderer){
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
}
