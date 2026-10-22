import fs from 'node:fs';

const target='web/games/archer/main.js';
let source=fs.readFileSync(target,'utf8');

const a=source.indexOf('function makeFighter(side){');
const b=source.indexOf('\nconst fighters=',a);
if(a<0||b<0) throw new Error('Critic patch could not locate fighter-builder boundaries.');
const fighterBuilder=String.raw`function makeFighter(side,femaleOverride=null){
 const male=femaleOverride===null?side===0:!femaleOverride;
 const g=new THREE.Group(),skin=(male?M.skin:M.skinF).clone(),body=(male?M.blue:M.red).clone(),hair=(male?M.hair:M.hairF).clone(),accent=M.gold.clone();
 const maskMat=M.dark.clone(),pants=M.dark.clone(),leather=M.leather.clone();
 const skinBright=skin.clone();skinBright.color.offsetHSL(0,.02,.06);
 const orb=(mat,pos,scale,seg=20)=>part(g,new THREE.SphereGeometry(1,seg,Math.max(10,Math.round(seg*.72))),mat,pos,scale);
 // The silhouette is deliberately adult and readable: broad, athletic shoulders for Raven/Titan;
 // a narrow waist, sculpted corset and fuller hips for Vexa/Sable.
 if(male){
   orb(pants,[-.23,.93,0],[.22,.47,.24]);orb(pants,[.23,.93,0],[.22,.47,.24]);
   limb(g,[-.23,1.13,0],[-.25,.47,.04],.19,pants);limb(g,[.23,1.13,0],[.25,.47,.04],.19,pants);
   orb(leather,[-.26,.33,.07],[.25,.19,.34]);orb(leather,[.26,.33,.07],[.25,.19,.34]);
   orb(body,[0,1.98,0],[.37,.48,.28]);
   orb(body,[0,2.38,0],[.61,.48,.36]);
   orb(body,[-.26,2.48,.21],[.34,.23,.18]);orb(body,[.26,2.48,.21],[.34,.23,.18]);
   // Visible deltoids and biceps instead of stick-like arms.
   orb(skin,[-.61,2.42,0],[.27,.29,.27]);orb(skin,[.61,2.42,0],[.27,.29,.27]);
   limb(g,[-.59,2.39,0],[-.78,1.94,.03],.2,skin);limb(g,[.59,2.39,0],[.78,1.94,.03],.2,skin);
   orb(skin,[-.8,1.88,.04],[.15,.22,.17]);orb(skin,[.8,1.88,.04],[.15,.22,.17]);
   limb(g,[-.78,1.9,.03],[-.94,1.45,.15],.13,skin);limb(g,[.78,1.9,.03],[.94,1.45,.15],.13,skin);
 }else{
   limb(g,[-.22,1.5,0],[-.25,.52,.02],.15,skin);limb(g,[.22,1.5,0],[.25,.52,.02],.15,skin);
   orb(leather,[-.28,.34,.07],[.23,.18,.31]);orb(leather,[.28,.34,.07],[.23,.18,.31]);
   orb(body,[0,1.49,0],[.49,.34,.33]); // hips
   orb(body,[0,1.91,0],[.285,.43,.255]); // defined waist
   orb(body,[0,2.32,0],[.475,.47,.32]); // tailored bodice
   orb(body,[-.205,2.42,.205],[.285,.245,.205]);orb(body,[.205,2.42,.205],[.285,.245,.205]);
   orb(body,[0,2.62,-.005],[.34,.18,.27]);
   orb(skin,[-.48,2.43,0],[.16,.19,.18]);orb(skin,[.48,2.43,0],[.16,.19,.18]);
   limb(g,[-.49,2.42,0],[-.66,1.96,.03],.13,skin);limb(g,[.49,2.42,0],[.66,1.96,.03],.13,skin);
   limb(g,[-.66,1.96,.03],[-.82,1.52,.15],.105,skin);limb(g,[.66,1.96,.03],[.82,1.52,.15],.105,skin);
 }
 // Belts, armor seams, shoulder guards and wrist wraps make equipment legible at gameplay scale.
 const belt=part(g,new THREE.TorusGeometry(male?.36:.405,.055,7,26),accent,[0,male?1.68:1.65,.01],[1,1,.8]);belt.rotation.x=Math.PI/2;
 part(g,new THREE.BoxGeometry(.18,.13,.07),accent,[0,1.66,.31]);
 for(const x of[-1,1]){
   orb(accent,[x*(male?.59:.46),2.5,-.015],[male?.22:.17,.18,.25]);
   orb(leather,[x*(male?.88:.78),1.64,.05],[.15,.105,.16]);
   orb(accent,[x*(male?.9:.78),1.64,.17],[.15,.095,.045]);
 }
 if(male){
   // Small pectoral and abdominal definition in the tunic's sculpted plates.
   for(const y of[2.14,1.98])for(const x of[-.13,.13])orb(accent,[x,y,.269],[.095,.065,.028],14);
 }else{
   // Gold piping and a clean center panel sell a tailored fantasy-duelist costume.
   part(g,new THREE.BoxGeometry(.055,.5,.035),accent,[0,2.15,.294]);
   part(g,new THREE.TorusGeometry(.1,.025,6,18),accent,[0,2.43,.409]);
 }
 const face=orb(skin,[0,3.02,.005],[male?.365:.345,male?.445:.455,.31],24);
 orb(skinBright,[0,2.83,.16],[male?.27:.26,.2,.19],20);
 const eyeMat=new THREE.MeshStandardMaterial({color:0xf7f3e9,roughness:.32});
 const pupil=new THREE.MeshStandardMaterial({color:male?0x202432:0x3a1927,roughness:.24});
 for(const x of[-.132,.132]){
   orb(leather,[x,3.065,.275],[.094,.055,.036],16);
   orb(eyeMat,[x,3.065,.299],[.071,.039,.027],16);
   orb(pupil,[x+(male?.01:0),3.063,.32],[.031,.034,.016],12);
   const brow=part(g,new THREE.BoxGeometry(.13,.035,.035),hair,[x,3.155,.28]);brow.rotation.z=x<0?-.12:.12;
 }
 orb(skin,[0,2.97,.31],[.055,.085,.05],14);
 let mouth,headAccessory=null;
 if(male){
   mouth=part(g,new THREE.SphereGeometry(1,16,10),maskMat,[0,2.79,.29],[.255,.105,.07]);
   part(g,new THREE.BoxGeometry(.48,.055,.045),leather,[0,2.73,.32]);
   // Short swept-back ninja hair/hood.
   orb(hair,[0,3.36,-.04],[.405,.28,.36],22);
   orb(hair,[-.29,3.19,.015],[.14,.3,.26],18);orb(hair,[.29,3.19,.015],[.14,.3,.26],18);
 }else{
   mouth=orb(new THREE.MeshStandardMaterial({color:0xa91f42,roughness:.32}),[0,2.795,.31],[.115,.033,.025],16);
   // Red, glossy shoulder-length hair with separated front locks frames the face clearly.
   orb(hair,[0,3.36,-.045],[.445,.34,.36],24);
   orb(hair,[-.365,2.87,.105],[.145,.54,.20],20);orb(hair,[.365,2.87,.105],[.145,.54,.20],20);
   orb(hair,[-.18,3.26,.20],[.20,.23,.16],18);orb(hair,[.16,3.28,.20],[.20,.22,.16],18);
   limb(g,[-.28,3.08,-.2],[-.4,2.35,-.16],.12,hair);limb(g,[.28,3.08,-.2],[.4,2.35,-.16],.12,hair);
   headAccessory=part(g,new THREE.TorusGeometry(.355,.035,7,32),accent,[0,3.25,-.025],[1,1,.9]);
   headAccessory.rotation.x=.08;
 }
 const cape=part(g,new THREE.PlaneGeometry(.95,1.62,4,7),new THREE.MeshStandardMaterial({color:male?0x152c42:0x5b203b,roughness:.82,side:THREE.DoubleSide}),[0,1.72,-.37]);
 // Bow hand is always on the opponent-facing side, regardless of the selected character's gender.
 const launcher=new THREE.Object3D();launcher.position.set(side===0?1.03:-1.03,2.43,.38);g.add(launcher);
 const bow=makeBow();bow.position.copy(launcher.position);g.add(bow);g.position.z=.65;scene.add(g);
 return{side,male,root:g,bow,launcher,cape,baseY:0,baseX:0,hp:100,hitUntil:0,phase:rnd()*6.28,dir:side===0?1:-1,damage:0,hits:0,bodyMaterial:body,hairMaterial:hair,accentMaterial:accent,mask:male?mouth:null,lip:male?null:mouth,headAccessory};
}`;
source=source.slice(0,a)+fighterBuilder+source.slice(b);

const ap=source.indexOf('function applyLoadout(){');
const ae=source.indexOf('\nensureArmory();',ap);
if(ap<0||ae<0) throw new Error('Critic patch could not locate loadout function.');
const apply=String.raw`function applyLoadout(){
 const c=state.selected.character,desiredMale=c==='raven'||c==='titan';
 if(fighters[0].male!==desiredMale){
   scene.remove(fighters[0].root);
   fighters[0]=makeFighter(0,!desiredMale);
   fighters[0].root.position.set(arena.L.x,arena.L.y+.62,.7);
   fighters[0].baseY=arena.L.y+.62;fighters[0].baseX=arena.L.x;
 }
 const f=fighters[0],outfit=state.selected.outfit;
 const bodyColors={ronin:desiredMale?0x25465e:0x932a49,neon:0x116e70,royal:0x694483,arctic:0x527fa1};
 const capeColors={ronin:desiredMale?0x152c42:0x592039,neon:0x123c47,royal:0x33234f,arctic:0x263e62};
 const trimColors={ronin:0xe6b76e,neon:0x68f0d3,royal:0xf2c66e,arctic:0x93e9f5};
 f.root.scale.set(c==='titan'?1.08:c==='sable'?.99:1,c==='titan'?1.06:1,1);
 f.bodyMaterial.color.set(bodyColors[outfit]||bodyColors.ronin);
 f.cape.material.color.set(capeColors[outfit]||capeColors.ronin);
 f.accentMaterial.color.set(trimColors[outfit]||trimColors.ronin);
 f.hairMaterial.color.set(c==='vexa'?0xb52b43:c==='sable'?0x171426:c==='titan'?0x68442c:0x121827);
 if(f.mask)f.mask.visible=c==='raven';if(f.lip)f.lip.visible=true;
 if(f.headAccessory)f.headAccessory.visible=c==='sable'||c==='vexa';
 if(f.bow.children[0])f.bow.children[0].material=state.selected.bow==='sunfang'?M.gold:state.selected.bow==='moonpiercer'?M.frost:M.dark;
 updateHUD()
}`;
source=source.slice(0,ap)+apply+source.slice(ae);

// Keep hit recoil bounded around a saved anchor rather than accumulating position every animation frame.
source=source.replace(
 'function place(){fighters[0].root.position.set(arena.L.x,arena.L.y+.62,.7);fighters[1].root.position.set(arena.R.x,arena.R.y+.62,.7);fighters[0].baseY=arena.L.y+.62;fighters[1].baseY=arena.R.y+.62}',
 'function place(){fighters[0].root.position.set(arena.L.x,arena.L.y+.62,.7);fighters[1].root.position.set(arena.R.x,arena.R.y+.62,.7);fighters[0].baseX=arena.L.x;fighters[1].baseX=arena.R.x;fighters[0].baseY=arena.L.y+.62;fighters[1].baseY=arena.R.y+.62}'
);
source=source.replace(
 'if(hit){f.root.rotation.z=(f.side?-1:1)*.14*(1-(f.hitUntil-state.time)/.65);f.root.position.x+=(f.side?.018:-.018)}else f.root.rotation.z=Math.sin(state.time*1.3+f.phase)*.006;',
 'if(hit){const recoil=Math.sin(Math.PI*clamp((f.hitUntil-state.time)/.65,0,1));f.root.rotation.z=(f.side?-1:1)*.19*recoil;f.root.position.x=f.baseX+(f.side?-.13:.13)*recoil;f.root.position.y=f.baseY+Math.sin(state.time*1.8+f.phase)*.025+.09*recoil}else{f.root.position.x=f.baseX;f.root.rotation.z=Math.sin(state.time*1.3+f.phase)*.006;}'
);
// Arrow FX should read by projectile type instead of using a generic gold streak.
source=source.replace(
 "state.shots++;state.turn='flight';trailLine.visible=true;trailLine.geometry.setFromPoints([pos]);",
 "state.shots++;state.turn='flight';trailLine.material.color.set(type==='ember'?0xff623c:type==='frost'?0x6beaff:type==='storm'?0x9fffb8:0xffdca2);trailLine.visible=true;trailLine.geometry.setFromPoints([pos]);"
);
// Snapshot is a testable contract for the critic as well as an accessible gameplay debug surface.
source=source.replace(
 "function snapshot(){return{screen:state.screen,turn:state.turn,round:state.round,arena:arena.name,wind:state.wind,angle:state.angle,power:state.power,playerHp:fighters[0].hp,enemyHp:fighters[1].hp,shots:state.shots,points:state.points,loadout:state.selected}}",
 "function snapshot(){return{screen:state.screen,turn:state.turn,round:state.round,arena:arena.name,wind:state.wind,distance:Math.round(Math.abs(fighters[1].root.position.x-fighters[0].root.position.x)*100)/100,angle:state.angle,power:state.power,playerHp:fighters[0].hp,enemyHp:fighters[1].hp,shots:state.shots,projectileActive:!!state.projectile,points:state.points,loadout:state.selected,playerCharacter:fighters[0].male?'male':'female',playerHits:fighters[0].hits,enemyHits:fighters[1].hits,totalDamage:state.totalDamage}}"
);
source=source.replace('getSnapshot:snapshot,buildTag:', 'getSnapshot:snapshot,aimSolution:()=>solve(fighters[0],fighters[1]),buildTag:');
source=source.replace("else if(state.turn==='enemy'){state.aiWait-=dt;if(state.aiWait<=0)launch(1)}", "else if(state.turn==='enemy'){state.aiWait-=dt;if(state.aiWait<=0)launch(1)}else if(state.autoPilot)launch(0);");
if(!source.includes('distance:Math.round(Math.abs(fighters[1].root.position.x-fighters[0].root.position.x)*100)/100')) throw new Error('Critic snapshot patch did not apply');
if(!source.includes('aimSolution:()=>solve(fighters[0],fighters[1])')) throw new Error('Critic aim-solution patch did not apply');

 // Cinematic art-direction pass: distinct skies, stronger landmark silhouettes, and inward-facing archers.
 source=source.replace('const bow=makeBow();bow.position.copy(launcher.position);g.add(bow);g.position.z=.65;scene.add(g);', 'const bow=makeBow();bow.position.copy(launcher.position);g.add(bow);g.rotation.y=side===0?.38:-.38;g.position.z=.65;scene.add(g);');
 source=source.replace('mouth=part(g,new THREE.SphereGeometry(1,16,10),maskMat,[0,2.79,.29],[.255,.105,.07]);\n   part(g,new THREE.BoxGeometry(.48,.055,.045),leather,[0,2.73,.32]);',
 'mouth=part(g,new THREE.BoxGeometry(.43,.155,.065),maskMat,[0,2.82,.305]);\n   part(g,new THREE.BoxGeometry(.45,.026,.045),leather,[0,2.765,.342]);\n   part(g,new THREE.BoxGeometry(.20,.018,.018),M.rock2,[0,2.81,.35]);');
 const arenaStart=source.indexOf('function buildArena(){');
 const arenaStop=source.indexOf('function makeBow(){',arenaStart);
 if(arenaStart<0||arenaStop<0) throw new Error('Cinematic pass could not locate buildArena.');
 let arenaFn=source.slice(arenaStart,arenaStop);
 const close=arenaFn.lastIndexOf('}');
 if(close<0) throw new Error('Cinematic pass could not locate arena function end.');
 const cinematic = [
 'const art={',
 ' citadel:{top:0x14294c,mid:0x5a4b73,low:0xffc49c,fog:0x655c79,accent:0x76e1ef,light:0xffd8a9},',
 ' bridge:{top:0x172a45,mid:0x76525b,low:0xffc58b,fog:0x705966,accent:0xffc171,light:0xffd5a2},',
 ' frost:{top:0x112c4b,mid:0x4c829b,low:0xd9f6ff,fog:0x557b93,accent:0x7beaff,light:0xc8eeff},',
 ' rift:{top:0x141333,mid:0x4c3c78,low:0xf08fc5,fog:0x514263,accent:0xc49bff,light:0xffc5f5},',
 ' ember:{top:0x2d1930,mid:0x8d414d,low:0xffc078,fog:0x70515d,accent:0xff875e,light:0xffc38a},',
 ' temple:{top:0x151d42,mid:0x60549a,low:0xf1c18b,fog:0x5d567e,accent:0xd2b5ff,light:0xffdca4}',
 '}[arena.theme];',
 'sky.material.uniforms.a.value.setHex(art.top);sky.material.uniforms.b.value.setHex(art.mid);sky.material.uniforms.c.value.setHex(art.low);scene.fog.color.setHex(art.fog);rim.color.setHex(art.accent);sun.color.setHex(art.light);',
 'const aura=new THREE.MeshStandardMaterial({color:art.accent,emissive:art.accent,emissiveIntensity:1.45,metalness:.36,roughness:.24});',
 'const warmAura=new THREE.MeshStandardMaterial({color:art.low,emissive:art.low,emissiveIntensity:.95,metalness:.18,roughness:.3});',
 'const halo=part(decor,new THREE.TorusGeometry(1.82,.055,10,64),aura,[0,3.35,-6.7],[1.22,1.42,.55]);halo.rotation.z=arena.theme===\'rift\'?.13:-.08;',
 'const haloInner=part(decor,new THREE.TorusGeometry(1.48,.018,6,56),warmAura,[0,3.35,-6.63],[1.22,1.42,.55]);haloInner.rotation.z=-halo.rotation.z*.6;',
 'part(decor,new THREE.SphereGeometry(.72,32,24),warmAura,[0,5.72,-9.1],[1,1,.18]);',
 'const solarRing=part(decor,new THREE.TorusGeometry(1.02,.022,7,48),aura,[0,5.72,-9.25],[1,1,.3]);solarRing.rotation.z=.18;',
 'const mountainMats=[new THREE.MeshStandardMaterial({color:colors[arena.theme],roughness:1}),new THREE.MeshStandardMaterial({color:art.fog,roughness:1}),new THREE.MeshStandardMaterial({color:art.top,roughness:1})];',
 'for(let i=0;i<17;i++){const x=-18+i*2.25+(rnd()-.5)*.65,h=2.1+rnd()*4.8,depth=-9.8-rnd()*2.5;const mountain=part(decor,new THREE.ConeGeometry(.85+rnd()*.8,h,5),mountainMats[i%3],[x,-2.1+h*.43,depth],[1,1,.36]);mountain.rotation.y=rnd()*Math.PI;if(i%4===0)part(decor,new THREE.ConeGeometry(.13,.65,5),warmAura,[x,-2.1+h*.43+h*.34,depth+.08],[1,1,.3]);}',
 'for(const side of[-1,1]){const x=side*3.15,z=-5.35;part(decor,new THREE.CylinderGeometry(.105,.22,2.7,8),M.metal,[x,1.6,z]);part(decor,new THREE.CylinderGeometry(.16,.11,.18,8),warmAura,[x,2.93,z]);const crystal=part(decor,new THREE.OctahedronGeometry(.31,1),aura,[side*4.0,3.08,-5.7],[.76,1.35,.72]);crystal.rotation.z=side*.25;const ring=part(decor,new THREE.TorusGeometry(.42,.025,6,32),aura,[side*3.85,2.68,-5.65],[1,.7,.45]);ring.rotation.z=side*.24;}',
 'for(let i=0;i<34;i++){const mote=part(decor,new THREE.SphereGeometry(.025+rnd()*.026,6,5),i%3===0?warmAura:aura,[(rnd()-.5)*25,-.5+rnd()*6,-4-rnd()*5]);mote.material=mote.material.clone();mote.material.transparent=true;mote.material.opacity=.32+rnd()*.48;}'
 ].join('');
 arenaFn=arenaFn.slice(0,close)+cinematic+arenaFn.slice(close);
 source=source.slice(0,arenaStart)+arenaFn+source.slice(arenaStop);
 source=source.replace('const aspect=innerWidth/Math.max(1,innerHeight),h=11.3;camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);',
 'const aspect=innerWidth/Math.max(1,innerHeight),h=innerHeight<430?12.2:11.3;camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();camera.position.y=innerHeight<430?7.6:7;camera.lookAt(0,innerHeight<430?2.45:2,0);renderer.setSize(innerWidth,innerHeight);');
 if(!source.includes('const art={')||!source.includes('g.rotation.y=side===0?.38:-.38')) throw new Error('Cinematic art-direction modifications did not apply.');


 // Turn-based artillery clarity: show the actual wind-adjusted arrow arc while the player aims.
 source=source.replace('scene.add(trailLine);const fx=[];',
 'scene.add(trailLine);const aimGuide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x6bf1df,dashSize:.17,gapSize:.10,transparent:true,opacity:.88,depthTest:false,depthWrite:false}));aimGuide.visible=false;aimGuide.renderOrder=12;scene.add(aimGuide);const fx=[];');
 const aimFunction = "function updateAimPreview(){const visible=state.screen==='play'&&state.turn==='player'&&!state.projectile&&!state.autoPilot;aimGuide.visible=visible;if(!visible)return;const start=new THREE.Vector3();fighters[0].launcher.getWorldPosition(start);const angle=state.angle*Math.PI/180,v=speed(state.power),wind=state.selected.arrow==='storm'?state.wind*.2:state.wind,pts=[];for(let i=0;i<75;i++){const t=i*.045,x=start.x+v*Math.cos(angle)*t+wind*.07*t*t,y=start.y+v*Math.sin(angle)*t-4.8*t*t;pts.push(new THREE.Vector3(x,y,1.12));if(i>2&&x>fighters[1].root.position.x+1.15)break;const floor=terrainHeight(x);if(floor>-50&&y<floor+.1)break;if(y< -3.8)break;}const old=aimGuide.geometry;aimGuide.geometry=new THREE.BufferGeometry().setFromPoints(pts);aimGuide.computeLineDistances();old.dispose();aimGuide.material.color.setHex(state.selected.arrow==='ember'?0xff9862:state.selected.arrow==='frost'?0x71edff:state.selected.arrow==='storm'?0x9effb0:0x6bf1df);}";
 if(!source.includes('function updateHUD(){')) throw new Error('Aim-preview patch could not find HUD function');
 source=source.replace('function updateHUD(){',aimFunction+'\nfunction updateHUD(){');
 source=source.replace("if(l)l.textContent=state.selected.character.toUpperCase()+' · '+state.selected.bow.toUpperCase()}",
 "if(l)l.textContent=state.selected.character.toUpperCase()+' · '+state.selected.bow.toUpperCase();updateAimPreview()}");
 source=source.replace("projectileActive:!!state.projectile,points:state.points",
 "projectileActive:!!state.projectile,aimPreviewVisible:!!aimGuide.visible,aimPoints:aimGuide.geometry.attributes.position?.count||0,points:state.points");
 source=source.replace("ui.powerVal.textContent=state.power+'%';fighters[0].bow.rotation.z=state.angle*Math.PI/180}","ui.powerVal.textContent=state.power+'%';fighters[0].bow.rotation.z=state.angle*Math.PI/180;updateAimPreview()}");
 source=source.replace("function setArrow(t){state.selected.arrow=t;state.selectedArrow=t;ui.arrows.forEach(b=>b.classList.toggle('selected',b.dataset.arrow===t));save()}","function setArrow(t){state.selected.arrow=t;state.selectedArrow=t;ui.arrows.forEach(b=>b.classList.toggle('selected',b.dataset.arrow===t));save();updateAimPreview()}");
 if(!source.includes('function updateAimPreview()')||!source.includes('aimPreviewVisible:!!aimGuide.visible')) throw new Error('Aim-preview patch did not apply');

fs.writeFileSync(target,source,'utf8');
console.log('critic polish applied:',target,source.length,'bytes');