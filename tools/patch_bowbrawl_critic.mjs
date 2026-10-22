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
 return{side,male,root:g,bow,launcher,cape,baseY:0,baseX:0,hp:100,hitUntil:0,phase:rnd()*6.28,dir:side===0?1:-1,damage:0,hits:0,bodyMaterial:body,hairMaterial:hair,accentMaterial:accent,mask:mouth,headAccessory};
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
 if(f.mask)f.mask.visible=c==='raven';
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
if(!source.includes('distance:Math.round(Math.abs(fighters[1].root.position.x-fighters[0].root.position.x)*100)/100')) throw new Error('Critic snapshot patch did not apply');
fs.writeFileSync(target,source,'utf8');
console.log('critic polish applied:',target,source.length,'bytes');