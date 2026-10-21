// characters.js - detailed humanoid archers using GB pattern
import * as THREE from '../../lib/three.module.js';
import { GB } from './geom.js';

function matVC(roughness, metalness, env=0.5){
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness, envMapIntensity: env });
}

export function buildArcher(scene, opts={}){
  const g = new THREE.Group();
  const female = !!opts.female;
  const S = female ? 0.92 : 1.0;

  const skinTone = female ? '#f3c9a8' : '#d9a066';
  const hairColor = female ? '#b33a2b' : '#1a1a1a';
  const bodyColor = female ? '#ff4fa3' : '#2f4f8f';
  const pantsColor = female ? '#ff4fa3' : '#222244';
  const armorColor = '#c9a227';
  const leatherColor = '#4a2f1a';
  const bootColor = '#111111';
  const metalColor = '#cfd6e0';
  const lipColor = female ? '#c94a6a' : '#b06a5a';
  const irisColor = female ? '#3a7d44' : '#4a6fa5';

  const skin = new GB();
  const headR = female ? 0.20 : 0.22;
  const headY = 1.72*S;
  skin.sphere(headR, 24, 18, { p:[0,headY,0], c:skinTone, s: female?[1.0,1.05,0.95]:[1.0,1.0,1.0], grad:[0.9,1.1] });
  skin.sphere(0.04, 8, 6, { p:[-headR*0.95, headY, 0], c:skinTone, s:[0.6,1.0,0.4] });
  skin.sphere(0.04, 8, 6, { p:[ headR*0.95, headY, 0], c:skinTone, s:[0.6,1.0,0.4] });
  skin.cyl(0.07, 0.09, 0.12, 10, { p:[0,1.55*S,0], c:skinTone });
  skin.capsule(0.052, 0.28, 2, 8, { p:[-0.30*S, 1.29*S, 0], r:[0,0,0.15], c:skinTone });
  skin.capsule(0.052, 0.28, 2, 8, { p:[ 0.30*S, 1.29*S, 0], r:[0,0,-0.15], c:skinTone });
  skin.sphere(0.07, 10, 8, { p:[-0.36*S, 0.98*S, 0], c:skinTone });
  skin.sphere(0.07, 10, 8, { p:[ 0.36*S, 0.98*S, 0], c:skinTone });
  skin.sphere(0.055, 8, 6, { p:[-0.38*S, 0.90*S, 0.05], c:skinTone });
  skin.sphere(0.055, 8, 6, { p:[ 0.38*S, 0.90*S, 0.05], c:skinTone });
  skin.cyl(0.10,0.09,0.42,10,{p:[-0.12*S,0.64*S,0], r:[0,0,0.05], c:skinTone});
  skin.cyl(0.09,0.075,0.42,10,{p:[-0.13*S,0.22*S,0], r:[0,0,0.02], c:skinTone});
  skin.cyl(0.10,0.09,0.42,10,{p:[ 0.12*S,0.64*S,0], r:[0,0,-0.05], c:skinTone});
  skin.cyl(0.09,0.075,0.42,10,{p:[ 0.13*S,0.22*S,0], r:[0,0,-0.02], c:skinTone});
  const skinMesh = new THREE.Mesh(skin.build(), matVC(0.45,0.0,0.35));
  skinMesh.castShadow = true; skinMesh.receiveShadow = true;
  g.add(skinMesh);

  const eyeY = headY + 0.02*S;
  const eyeZ = headR*0.82;
  const eyeR = 0.055*(female?1.35:1.0);
  const eyeGeo = new GB();
  eyeGeo.sphere(eyeR*1.15, 12, 10, { p:[-0.08*S, eyeY, eyeZ], c:'#ffffff', s:[1.0,0.7,0.6] });
  eyeGeo.sphere(eyeR*1.15, 12, 10, { p:[ 0.08*S, eyeY, eyeZ], c:'#ffffff', s:[1.0,0.7,0.6] });
  g.add(new THREE.Mesh(eyeGeo.build(), matVC(0.2,0.0,0.5)));
  const irisGeo = new GB();
  irisGeo.sphere(eyeR*0.65, 10, 8, { p:[-0.08*S, eyeY, eyeZ+0.02], c:irisColor, s:[1.0,0.9,0.6] });
  irisGeo.sphere(eyeR*0.65, 10, 8, { p:[ 0.08*S, eyeY, eyeZ+0.02], c:irisColor, s:[1.0,0.9,0.6] });
  g.add(new THREE.Mesh(irisGeo.build(), matVC(0.3,0.0,0.5)));
  const pupilGeo = new GB();
  pupilGeo.sphere(eyeR*0.35, 8, 6, { p:[-0.08*S, eyeY, eyeZ+0.035], c:'#111111', s:[1.0,0.9,0.5] });
  pupilGeo.sphere(eyeR*0.35, 8, 6, { p:[ 0.08*S, eyeY, eyeZ+0.035], c:'#111111', s:[1.0,0.9,0.5] });
  g.add(new THREE.Mesh(pupilGeo.build(), matVC(0.2,0.0,0.3)));
  const hlGeo = new GB();
  hlGeo.sphere(eyeR*0.12, 6, 4, { p:[-0.08*S, eyeY+eyeR*0.15, eyeZ+0.045], c:'#ffffff', s:[1,1,0.6] });
  hlGeo.sphere(eyeR*0.12, 6, 4, { p:[ 0.08*S, eyeY+eyeR*0.15, eyeZ+0.045], c:'#ffffff', s:[1,1,0.6] });
  g.add(new THREE.Mesh(hlGeo.build(), matVC(0.1,0.0,0.8)));
  const lidGeo = new GB();
  lidGeo.box(0.13, 0.02, 0.06, {p:[-0.08*S, eyeY+eyeR*0.62, eyeZ+0.005], c:skinTone});
  lidGeo.box(0.13, 0.02, 0.06, {p:[ 0.08*S, eyeY+eyeR*0.62, eyeZ+0.005], c:skinTone});
  g.add(new THREE.Mesh(lidGeo.build(), matVC(0.45,0.0,0.35)));
  // nose bridge
  const bridgeGeo = new GB();
  bridgeGeo.box(0.04, 0.12, 0.03, {p:[0, headY+0.0, eyeZ+0.01], c:skinTone});
  g.add(new THREE.Mesh(bridgeGeo.build(), matVC(0.45,0.0,0.35)));
  const browGeo = new GB();
  browGeo.box(0.09,0.015,0.02,{p:[-0.08*S, eyeY+eyeR*0.9, eyeZ+0.01], c: female?'#1a1a1a':'#2a2a2a'});
  browGeo.box(0.09,0.015,0.02,{p:[ 0.08*S, eyeY+eyeR*0.9, eyeZ+0.01], c: female?'#1a1a1a':'#2a2a2a'});
  g.add(new THREE.Mesh(browGeo.build(), matVC(0.8,0.0,0.2)));
  const noseGeo = new GB();
  noseGeo.cone(0.035,0.12,6,{p:[0,headY-0.02,eyeZ+0.02], r:[Math.PI/2,0,0], c:skinTone, s: female?[0.8,1.0,0.8]:[1.0,1.0,1.0]});
  g.add(new THREE.Mesh(noseGeo.build(), matVC(0.45,0.0,0.35)));
  const lipGeo = new GB();
  const lipScale = female?1.35:1.0;
  lipGeo.box(0.12*lipScale, 0.035*lipScale, 0.04, {p:[0, headY-0.13*S, eyeZ-0.02], c:lipColor});
  lipGeo.box(0.10*lipScale, 0.025*lipScale, 0.035, {p:[0, headY-0.10*S, eyeZ-0.01], c:lipColor});
  lipGeo.box(0.13*lipScale, 0.012*lipScale, 0.03, {p:[0, headY-0.16*S, eyeZ-0.015], c:lipColor});
  g.add(new THREE.Mesh(lipGeo.build(), matVC(0.4,0.0,0.5)));
  if(female){
    const blush = new GB();
    blush.sphere(0.045, 8,6, {p:[-0.13, headY-0.04, eyeZ-0.05], c:'#ff99aa', s:[1.0,0.7,0.5]});
    blush.sphere(0.045, 8,6, {p:[ 0.13, headY-0.04, eyeZ-0.05], c:'#ff99aa', s:[1.0,0.7,0.5]});
    const bm = new THREE.Mesh(blush.build(), new THREE.MeshStandardMaterial({color:0xff99aa, roughness:0.6, transparent:true, opacity:0.35}));
    g.add(bm);
  }

  const body = new GB();
  const hipW = female ? 0.34 : 0.28;
  body.sphere(0.22, 16, 12, { p:[0,0.88*S,0], c:pantsColor, s:[hipW/0.22,0.18/0.22,0.22/0.22], grad:[0.85,1.0] });
  body.cyl(female?0.16:0.20, female?0.20:0.24, 0.18, 12, { p:[0,1.0*S,0], c:pantsColor });
  body.cyl(female?0.22:0.26, female?0.18:0.24, 0.5, 12, { p:[0,1.25*S,0], c:bodyColor, grad:[0.8,1.05] });
  if(female){
    body.sphere(0.17, 16, 12, { p:[-0.12,1.42*S,0.16], c:bodyColor, s:[1.05,0.95,1.0] });
    body.sphere(0.17, 16, 12, { p:[ 0.12,1.42*S,0.16], c:bodyColor, s:[1.05,0.95,1.0] });
  } else {
    body.sphere(0.16, 12, 10, { p:[-0.12,1.4*S,0.12], c:bodyColor, s:[1.1,0.85,0.9] });
    body.sphere(0.16, 12, 10, { p:[ 0.12,1.4*S,0.12], c:bodyColor, s:[1.1,0.85,0.9] });
  }
  body.cyl(female?0.19:0.21, female?0.22:0.21, 0.2, 12, { p:[0,1.06*S,0], c:bodyColor });
  body.cyl(0.21,0.21,0.06,12,{p:[0,0.95*S,0], c:leatherColor});
  const bodyMesh = new THREE.Mesh(body.build(), matVC(female?0.45:0.75, female?0.15:0.0, 0.4));
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
  g.add(bodyMesh);

  if(!female){
    const arm = new GB();
    arm.box(0.42,0.32,0.12,{p:[0,1.32*S,0.16], c:armorColor});
    arm.box(0.12,0.28,0.08,{p:[0,1.32*S,-0.2], c:armorColor});
    g.add(new THREE.Mesh(arm.build(), matVC(0.35,0.8,0.9)));
  }

  const hair = new GB();
  if(female){
    // strand-based: thin cylinders arranged around head
    for(let i=0;i<18;i++){
      const ang = (i/18)*Math.PI*2;
      const r = 0.24;
      hair.cyl(0.012, 0.008, 0.35+Math.random()*0.15, 6, { p:[Math.cos(ang)*r, headY+0.05+Math.random()*0.05, Math.sin(ang)*r-0.05], r:[Math.random()*0.3,0,ang], c:hairColor });
    }
    for(let i=0;i<6;i++){
      hair.cyl(0.01, 0.006, 0.45+Math.random()*0.1, 6, { p:[(i-2.5)*0.06, headY-0.25-i*0.04, -0.18], r:[0.4,0,0], c:hairColor });
    }
    hair.box(0.34,0.06,0.10,{p:[0, headY+0.14, eyeZ-0.02], r:[-0.2,0,0], c:hairColor});
  } else {
    for(let i=0;i<12;i++){
      const ang = (i/12)*Math.PI*2;
      const r = 0.22;
      hair.cyl(0.015, 0.01, 0.22+Math.random()*0.08, 6, { p:[Math.cos(ang)*r, headY+0.06, Math.sin(ang)*r-0.04], r:[Math.random()*0.2,0,ang], c:hairColor });
    }
    hair.box(0.3,0.06,0.26,{p:[0, headY+0.18, 0], c:hairColor});
  }
  g.add(new THREE.Mesh(hair.build(), matVC(0.85,0.0,0.2)));

  const sh = new GB();
  if(!female){
    sh.sphere(0.11,10,8,{p:[-0.30*S, 1.45*S+0.02,0], c:armorColor, s:[1.2,0.7,1.0]});
    sh.sphere(0.11,10,8,{p:[ 0.30*S, 1.45*S+0.02,0], c:armorColor, s:[1.2,0.7,1.0]});
  }
  sh.cyl(0.075,0.075,0.18,10,{p:[-0.34*S, 0.95*S,0], c:leatherColor});
  sh.cyl(0.075,0.075,0.18,10,{p:[ 0.34*S, 0.95*S,0], c:leatherColor});
  g.add(new THREE.Mesh(sh.build(), matVC(!female?0.35:0.7, !female?0.8:0.05, 0.5)));

  const leg = new GB();
  leg.cyl(0.11,0.10,0.42,10,{p:[-0.12*S,0.64*S,0], r:[0,0,0.05], c: female?bodyColor:pantsColor});
  leg.cyl(0.09,0.075,0.42,10,{p:[-0.13*S,0.22*S,0], r:[0,0,0.02], c: female?bodyColor:pantsColor});
  leg.cyl(0.11,0.10,0.42,10,{p:[ 0.12*S,0.64*S,0], r:[0,0,-0.05], c: female?bodyColor:pantsColor});
  leg.cyl(0.09,0.075,0.42,10,{p:[ 0.13*S,0.22*S,0], r:[0,0,-0.02], c: female?bodyColor:pantsColor});
  g.add(new THREE.Mesh(leg.build(), matVC(female?0.45:0.75, female?0.15:0.0, 0.3)));

  const foot = new GB();
  const footY = 0.06;
  if(female){
    foot.box(0.1,0.06,0.22,{p:[-0.13, footY+0.03, 0.05], c:bootColor});
    foot.box(0.1,0.06,0.22,{p:[ 0.13, footY+0.03, 0.05], c:bootColor});
    foot.cyl(0.02,0.015,0.1,6,{p:[-0.13,0.0,0.12], r:[Math.PI/2,0,0], c:metalColor});
    foot.cyl(0.02,0.015,0.1,6,{p:[ 0.13,0.0,0.12], r:[Math.PI/2,0,0], c:metalColor});
  } else {
    foot.box(0.12,0.08,0.24,{p:[-0.13, footY+0.04, 0.04], c:bootColor});
    foot.box(0.12,0.08,0.24,{p:[ 0.13, footY+0.04, 0.04], c:bootColor});
  }
  g.add(new THREE.Mesh(foot.build(), matVC(0.5,0.2,0.3)));

  if(female){
    const out = new GB();
    out.torus(0.18,0.05,8,16,{p:[0,0.86,0.12], r:[Math.PI/2,0,0], c:bodyColor, s:[1.0,1.0,0.6]});
    out.cyl(0.015,0.015,0.6,6,{p:[0,1.45,0], r:[0,0,Math.PI/2], c:bodyColor});
    g.add(new THREE.Mesh(out.build(), matVC(0.45,0.15,0.6)));
  }

  const bow = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 24, Math.PI), new THREE.MeshStandardMaterial({color:0x8b5a2b, roughness:0.6, metalness:0.05}));
  arc.castShadow = true;
  bow.add(arc);
  const strGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0.45,0), new THREE.Vector3(0,-0.45,0)]);
  const str = new THREE.Line(strGeo, new THREE.LineBasicMaterial({color:0xeeeeee}));
  bow.add(str);
  bow.position.set(0.55*S, 1.0*S, 0.25);
  bow.rotation.y = Math.PI/2;
  g.add(bow);

  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.5,8), new THREE.MeshStandardMaterial({color:0x4a2f1a, roughness:0.7, metalness:0.05}));
  quiver.position.set(-0.25*S, 1.05*S, -0.2);
  quiver.rotation.z = 0.2;
  quiver.castShadow = true;
  g.add(quiver);

  g.userData.female = female;
  scene.add(g);
  return g;
}
