import * as THREE from '../../lib/three.module.js';

export function buildArcher(scene, opts = {}) {
  const female = opts.female || false;
  const group = new THREE.Group();

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: female ? 0xffccaa : 0xe8b88a, roughness: 0.6, metalness: 0.0 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: female ? 0xcc3366 : 0x2244aa, roughness: 0.7, metalness: 0.1 });
  const armorMat = new THREE.MeshStandardMaterial({ color: female ? 0xffd700 : 0x888888, roughness: 0.3, metalness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: female ? 0x8b4513 : 0x332211, roughness: 0.8, metalness: 0.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.0 });
  const irisMat = new THREE.MeshStandardMaterial({ color: female ? 0x4488cc : 0x336633, roughness: 0.2, metalness: 0.0 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xcc6666, roughness: 0.5, metalness: 0.0 });
  const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6, metalness: 0.0 });

  // Body proportions (female = Jessica Rabbit style)
  const bodyW = female ? 0.35 : 0.4;
  const bodyH = female ? 1.4 : 1.5;
  const waistW = female ? 0.22 : 0.35;
  const hipW = female ? 0.4 : 0.38;
  const legLen = female ? 1.1 : 0.95;
  const shoulderW = female ? 0.5 : 0.55;

  // Torso (upper)
  const upperTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(shoulderW * 0.5, waistW * 0.5, bodyH * 0.5, 16),
    bodyMat
  );
  upperTorso.position.y = bodyH * 0.75 + legLen;
  upperTorso.castShadow = true;
  group.add(upperTorso);

  // Torso (lower/hips)
  const lowerTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(waistW * 0.5, hipW * 0.5, bodyH * 0.25, 16),
    bodyMat
  );
  lowerTorso.position.y = bodyH * 0.5 + legLen;
  lowerTorso.castShadow = true;
  group.add(lowerTorso);

  // Chest (female)
  if (female) {
    const chestGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const chestL = new THREE.Mesh(chestGeo, bodyMat);
    chestL.position.set(-0.12, bodyH * 0.85 + legLen, 0.15);
    chestL.scale.set(1, 0.8, 0.9);
    chestL.castShadow = true;
    group.add(chestL);
    const chestR = new THREE.Mesh(chestGeo, bodyMat);
    chestR.position.set(0.12, bodyH * 0.85 + legLen, 0.15);
    chestR.scale.set(1, 0.8, 0.9);
    chestR.castShadow = true;
    group.add(chestR);
  }

  // Head
  const headGeo = new THREE.SphereGeometry(female ? 0.32 : 0.34, 20, 20);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = bodyH + legLen + 0.15;
  head.castShadow = true;
  group.add(head);

  // Face details
  const eyeSize = female ? 0.07 : 0.06;
  // Left eye
  const scleraL = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 1.3, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
  scleraL.position.set(-0.1, bodyH + legLen + 0.2, 0.28);
  group.add(scleraL);
  const irisL = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.8, 12, 12), irisMat);
  irisL.position.set(-0.1, bodyH + legLen + 0.2, 0.32);
  group.add(irisL);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.4, 8, 8), eyeMat);
  pupilL.position.set(-0.1, bodyH + legLen + 0.2, 0.34);
  group.add(pupilL);
  // Right eye
  const scleraR = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 1.3, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
  scleraR.position.set(0.1, bodyH + legLen + 0.2, 0.28);
  group.add(scleraR);
  const irisR = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.8, 12, 12), irisMat);
  irisR.position.set(0.1, bodyH + legLen + 0.2, 0.32);
  group.add(irisR);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.4, 8, 8), eyeMat);
  pupilR.position.set(0.1, bodyH + legLen + 0.2, 0.34);
  group.add(pupilR);

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
  const browMat = new THREE.MeshStandardMaterial({ color: female ? 0x6b3a1f : 0x221100, roughness: 0.9 });
  const browL = new THREE.Mesh(browGeo, browMat);
  browL.position.set(-0.1, bodyH + legLen + 0.35, 0.25);
  browL.rotation.z = female ? 0.1 : -0.05;
  group.add(browL);
  const browR = new THREE.Mesh(browGeo, browMat);
  browR.position.set(0.1, bodyH + legLen + 0.35, 0.25);
  browR.rotation.z = female ? -0.1 : 0.05;
  group.add(browR);

  // Nose
  const noseGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, bodyH + legLen + 0.12, 0.32);
  nose.rotation.x = Math.PI / 2;
  group.add(nose);

  // Lips
  const lipGeo = new THREE.BoxGeometry(female ? 0.14 : 0.1, 0.03, 0.03);
  const lip = new THREE.Mesh(lipGeo, lipMat);
  lip.position.set(0, bodyH + legLen - 0.02, 0.3);
  group.add(lip);

  // Hair (strand-based)
  const hairGroup = new THREE.Group();
  const numStrands = female ? 24 : 16;
  for (let i = 0; i < numStrands; i++) {
    const angle = (i / numStrands) * Math.PI * 2;
    const strandLen = female ? 0.6 + Math.random() * 0.3 : 0.3 + Math.random() * 0.2;
    const strandGeo = new THREE.CylinderGeometry(0.02, 0.01, strandLen, 6);
    const strand = new THREE.Mesh(strandGeo, hairMat);
    strand.position.set(
      Math.cos(angle) * 0.25,
      bodyH + legLen + 0.4 + strandLen * 0.3,
      Math.sin(angle) * 0.25
    );
    strand.rotation.x = Math.sin(angle) * 0.3;
    strand.rotation.z = -Math.cos(angle) * 0.3;
    strand.castShadow = true;
    hairGroup.add(strand);
  }
  // Top hair cap
  const capGeo = new THREE.SphereGeometry(0.33, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, hairMat);
  cap.position.y = bodyH + legLen + 0.4;
  cap.castShadow = true;
  hairGroup.add(cap);
  group.add(hairGroup);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.9, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: bodyMat.color, roughness: 0.7 });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-shoulderW * 0.6, bodyH * 0.6 + legLen, 0);
  armL.rotation.z = 0.4;
  armL.castShadow = true;
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(shoulderW * 0.6, bodyH * 0.6 + legLen, 0);
  armR.rotation.z = -0.4;
  armR.castShadow = true;
  group.add(armR);

  // Hands
  const handGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const handMat = new THREE.MeshStandardMaterial({ color: skinMat.color, roughness: 0.6 });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-shoulderW * 0.6 - 0.3, bodyH * 0.3 + legLen, 0);
  group.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(shoulderW * 0.6 + 0.3, bodyH * 0.3 + legLen, 0);
  group.add(handR);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.1, legLen, 10);
  const legMat = new THREE.MeshStandardMaterial({ color: female ? 0x222244 : 0x333333, roughness: 0.8 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.18, legLen * 0.5, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.18, legLen * 0.5, 0);
  legR.castShadow = true;
  group.add(legR);

  // Feet
  const footGeo = new THREE.BoxGeometry(0.15, 0.08, 0.25);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const footL = new THREE.Mesh(footGeo, footMat);
  footL.position.set(-0.18, 0.04, 0.05);
  group.add(footL);
  const footR = new THREE.Mesh(footGeo, footMat);
  footR.position.set(0.18, 0.04, 0.05);
  group.add(footR);

  // Bow
  const bowGroup = new THREE.Group();
  const bowCurve = new THREE.TorusGeometry(0.5, 0.03, 8, 16, Math.PI);
  const bow = new THREE.Mesh(bowCurve, bowMat);
  bow.rotation.z = Math.PI / 2;
  bowGroup.add(bow);
  // Bow string
  const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.0, 4);
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
  const string = new THREE.Mesh(stringGeo, stringMat);
  string.position.y = 0;
  bowGroup.add(string);
  bowGroup.position.set(0.7, bodyH * 0.5 + legLen, 0);
  group.add(bowGroup);

  // Quiver (on back)
  const quiverGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);
  const quiverMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
  const quiver = new THREE.Mesh(quiverGeo, quiverMat);
  quiver.position.set(0, bodyH * 0.6 + legLen, -0.25);
  quiver.rotation.x = 0.3;
  group.add(quiver);

  // Store references for animation
  group.userData = {
    female,
    parts: { head, upperTorso, lowerTorso, armL, armR, legL, legR, bowGroup, hairGroup },
    anim: { time: 0, state: 'idle' }
  };

  scene.add(group);
  return group;
}
