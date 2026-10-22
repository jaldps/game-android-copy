import fs from 'node:fs';

const mainPath = 'web/games/archer/main.js';
const cssPath = 'web/games/archer/style.css';
let main = fs.readFileSync(mainPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

// High-end art pass: richer silhouettes, equipment language, arena dressing,
// readable VFX, and a stronger cinematic presentation without external assets.
const inject = String.raw`
function aaaMaterial(color, metalness=.0, roughness=.5, emissive=null, intensity=0){
  const m=new THREE.MeshStandardMaterial({color,metalness,roughness});
  if(emissive!==null){m.emissive.setHex(emissive);m.emissiveIntensity=intensity}
  return m;
}
function aaaFighterFinish(f){
  const g=f.root, male=f.male;
  const armor=aaaMaterial(male?0x1a2f45:0x5a1839,.72,.25,male?0x07121e:0x250817,.18);
  const trim=aaaMaterial(male?0x78d9df:0xffc06b,.78,.22,male?0x123f47:0x4d1c18,.34);
  const leather=aaaMaterial(0x171522,.12,.72);
  const metal=aaaMaterial(0x263247,.86,.2);
  const skin=male?M.skin.clone():M.skinF.clone();
  const p=(geo,mat,pos,scale=[1,1,1])=>part(g,geo,mat,pos,scale);
  // Sculpted boots and articulated shin guards.
  for(const x of[-1,1]){
    p(new THREE.SphereGeometry(.16,14,10),leather,[x*(male?.25:.24),.19,.09],[1.25,.72,1.5]);
    p(new THREE.BoxGeometry(.13,.48,.17),metal,[x*(male?.25:.24),.62,.03],[1,1,.85]);
    p(new THREE.BoxGeometry(.09,.28,.055),trim,[x*(male?.25:.24),.70,.145]);
  }
  // Shoulder armor, forearm wraps and knuckle guards.
  for(const x of[-1,1]){
    p(new THREE.SphereGeometry(.22,16,10),armor,[x*(male?.59:.47),2.46,.01],[1.35,.72,1.05]);
    p(new THREE.TorusGeometry(male?.14:.11,.025,7,20),trim,[x*(male?.86:.75),1.64,.17],[1,1,.72]);
    p(new THREE.BoxGeometry(.12,.055,.08),trim,[x*(male?.94:.82),1.45,.18],[1.15,1,.8]);
  }
  // A layered collar makes the silhouette read as authored rather than primitive.
  p(new THREE.TorusGeometry(male?.34:.29,.045,8,32),armor,[0,male?2.72:2.66,.02],[1,1,.72]);
  p(new THREE.TorusGeometry(male?.28:.23,.018,6,28),trim,[0,male?2.74:2.68,.18],[1,1,.55]);
  // Facial planes and a tiny catchlight give the characters a deliberate focal point.
  p(new THREE.SphereGeometry(.028,10,8),aaaMaterial(0xffffff,.0,.12,0xffffff,.35),[-(male?.132:.112),3.065,.337],[1,.65,.3]);
  p(new THREE.SphereGeometry(.028,10,8),aaaMaterial(0xffffff,.0,.12,0xffffff,.35),[(male?.132:.112),3.065,.337],[1,.65,.3]);
  // Quiver with individual arrow shafts.
  const qmat=aaaMaterial(0x3b2020,.15,.72), shaft=aaaMaterial(0xd6bd82,.45,.3), fletch=aaaMaterial(male?0x56cbd5:0xff7c91,.2,.42,male?0x12353b:0x481421,.15);
  p(new THREE.CylinderGeometry(.105,.13,.68,12),qmat,[0,1.83,-.30],[1,1,1]);
  for(let i=0;i<5;i++){
    const a=(i-2)*.035;
    p(new THREE.CylinderGeometry(.012,.012,.54,7),shaft,[a,2.15,-.29],[1,1,1]);
    p(new THREE.ConeGeometry(.027,.09,7),trim,[a,2.44,-.29]);
    p(new THREE.BoxGeometry(.06,.09,.012),fletch,[a,1.94,-.29],[1,1,1]);
  }
  // A small clan sigil is visible in silhouette and doubles as a color anchor.
  const sig= p(new THREE.OctahedronGeometry(.095,1),trim,[0,2.18,.36],[.7,1.15,.32]);
  sig.rotation.z=.25;
  g.userData.aaa={armor,trim,leather,metal,skin,sig};
}
function aaaArenaFinish(){
  const accent=arena.theme==='frost'?0x86efff:arena.theme==='ember'?0xff9368:arena.theme==='rift'?0xc9a6ff:arena.theme==='temple'?0xd8c0ff:0x7be8e1;
  const warm=arena.theme==='frost'?0xc7f4ff:arena.theme==='ember'?0xffc17c:0xffd29c;
  const glow=aaaMaterial(accent,.25,.22,accent,1.15), warmMat=aaaMaterial(warm,.12,.3,warm,.45);
  // Hero platform rims: thin luminous geometry replaces the flat cut-out look.
  for(const d of[arena.L,arena.R]){
    const rim=part(decor,new THREE.BoxGeometry(d.w+.18,.055,4.62),glow,[d.x,d.y+.73,2.25],[1,1,1]);
    rim.material.transparent=true;rim.material.opacity=.72;
    part(decor,new THREE.BoxGeometry(d.w-.25,.028,4.30),warmMat,[d.x,d.y+.77,2.25]);
    for(const x of[-1,1]){
      part(decor,new THREE.CylinderGeometry(.075,.09,.32,10),metal,[d.x+x*(d.w*.39),d.y+.91,.45]);
      part(decor,new THREE.SphereGeometry(.08,12,8),glow,[d.x+x*(d.w*.39),d.y+1.08,.45]);
    }
  }
  // Distant skyline: layered towers, bridges and beacon lights create depth behind the duel.
  const back=aaaMaterial(0x111a31,.08,.94), mid=aaaMaterial(0x202b45,.2,.8), window=aaaMaterial(warm,.15,.32,warm,.8);
  for(let i=0;i<18;i++){
    const x=-18+i*2.05+(rnd()-.5)*.5, h=1.2+rnd()*4.0, z=-8.9-rnd()*1.8;
    part(decor,new THREE.BoxGeometry(.7+rnd()*.7,h,.45),i%3?back:mid,[x,-3.25+h/2,z]);
    if(i%2===0) for(let w=0;w<2;w++) part(decor,new THREE.BoxGeometry(.045,.09,.018),window,[x-.16+w*.32,-3.05+h*.55,z+.24]);
  }
  for(const x of[-10,-5,0,5,10]){
    const beam=part(decor,new THREE.CylinderGeometry(.018,.018,4.8,8),glow,[x,-.25,-7.2]);
    beam.material.transparent=true;beam.material.opacity=.12;
    const beacon=part(decor,new THREE.SphereGeometry(.08,12,8),glow,[x,2.18,-7.2]);
    beacon.userData.floatBase=2.18;beacon.userData.floatPhase=rnd()*6.28;beacon.userData.floatAmp=.06;
  }
  // Rune stones and directional chevrons make the arena feel like a place, not a backdrop.
  for(const side of[-1,1]){
    for(let i=0;i<3;i++){
      const x=side*(3.5+i*1.15);
      const stone=part(decor,new THREE.OctahedronGeometry(.18,1),glow,[x,.82,-.65],[.7,1.35,.42]);
      stone.rotation.z=side*.18+i*.13;
      part(decor,new THREE.TorusGeometry(.22,.012,6,24),glow,[x,.64,-.66],[1,.55,.5]).rotation.x=Math.PI/2;
    }
  }
  // Cinematic horizon glow, intentionally subtle so gameplay readability wins.
  const horizon=part(decor,new THREE.PlaneGeometry(36,4),warmMat,[0,.0,-12],[1,1,1]);
  horizon.material.transparent=true;horizon.material.opacity=.10;horizon.renderOrder=-2;
}
`;

if(!main.includes('function aaaFighterFinish')){
  main=main.replace('const fighters=[makeFighter(0),makeFighter(1)];',inject+'\nconst fighters=[makeFighter(0),makeFighter(1)];\naaaFighterFinish(fighters[0]); aaaFighterFinish(fighters[1]);');
}
if(!main.includes('aaaArenaFinish();')) main=main.replace('buildArena();place();reset();applyLoadout();','buildArena();aaaArenaFinish();place();reset();applyLoadout();');

const aaaCss=String.raw`
/* BOWBRAWL AAA PRESENTATION PASS */
:root{--lux:#f7d7a2;--cyan:#74eee1;--deep:#070d1c;--glass:rgba(9,16,31,.78)}
body{background:#070d1c;letter-spacing:.005em}
#gameRoot::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 50% 42%,transparent 34%,rgba(4,8,20,.20) 68%,rgba(3,7,17,.58) 100%);mix-blend-mode:multiply}
.topbar{filter:drop-shadow(0 12px 24px rgba(0,0,0,.28))}
.brand-copy strong{font-size:19px;text-shadow:0 0 24px rgba(255,195,122,.18),0 2px 2px #050913}
.icon-button{border-color:rgba(255,255,255,.24);background:linear-gradient(145deg,rgba(48,61,88,.96),rgba(9,15,29,.9));box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 10px 26px rgba(0,0,0,.28)}
.fighter-card{border-color:rgba(235,241,255,.24);background:linear-gradient(120deg,rgba(9,17,34,.90),rgba(19,29,51,.72));box-shadow:0 18px 42px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.09),inset 0 -1px 0 rgba(0,0,0,.28)}
.fighter-emblem{box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 18px rgba(0,0,0,.25)}
.health-track{height:6px}
.turn-banner{box-shadow:0 8px 30px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.08)}
.control-dock{background:linear-gradient(110deg,rgba(7,14,28,.96),rgba(18,28,49,.92) 52%,rgba(9,16,30,.96));border-color:rgba(240,245,255,.22);box-shadow:0 22px 60px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.09)}
.control-dock::after{content:"";position:absolute;inset:1px;border-radius:15px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(116,238,225,.08),transparent 48%,rgba(255,200,125,.07),transparent);opacity:.8}
.fire-button{transform:translateZ(0);box-shadow:0 14px 34px rgba(255,137,76,.22),inset 0 1px 0 rgba(255,255,255,.22)!important;border-color:rgba(255,216,161,.48)!important}
.fire-button:not(:disabled):hover{transform:translateY(-2px);filter:saturate(1.08);box-shadow:0 18px 40px rgba(255,137,76,.30),inset 0 1px 0 rgba(255,255,255,.24)!important}
.arrow-option{border-color:rgba(226,237,255,.15)!important;background:linear-gradient(145deg,rgba(39,51,75,.82),rgba(12,19,34,.88))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.arrow-option.selected{border-color:rgba(116,238,225,.72)!important;box-shadow:0 0 24px rgba(116,238,225,.12),inset 0 0 0 1px rgba(116,238,225,.18)!important}
input[type=range]{filter:drop-shadow(0 4px 8px rgba(0,0,0,.24))}
.menu-overlay{background:radial-gradient(ellipse at 50% 38%,rgba(44,47,78,.16),rgba(5,10,22,.78) 72%),linear-gradient(180deg,rgba(5,10,22,.32),rgba(5,10,22,.88))}
.menu-backdrop{opacity:.95!important;filter:saturate(1.12) contrast(1.04)}
.menu-content{filter:drop-shadow(0 24px 60px rgba(0,0,0,.34))}
.menu-content h1{font-size:clamp(58px,9vw,104px)!important;letter-spacing:.035em!important;text-shadow:0 4px 0 rgba(5,8,18,.72),0 0 42px rgba(255,188,112,.18)!important}
.hero-card{border-color:rgba(237,244,255,.22)!important;background:linear-gradient(145deg,rgba(24,35,57,.78),rgba(7,14,28,.82))!important;box-shadow:0 18px 45px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.08)!important}
.hero-token{box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 18px rgba(0,0,0,.25)}
.primary-button{border-color:rgba(255,218,163,.50)!important;box-shadow:0 18px 42px rgba(0,0,0,.30),0 0 30px rgba(255,164,91,.10),inset 0 1px 0 rgba(255,255,255,.20)!important}
.modal-card{border-color:rgba(235,242,255,.24)!important;box-shadow:0 30px 100px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.10)!important}
.bottom-meta{opacity:.82;filter:drop-shadow(0 2px 5px rgba(0,0,0,.5))}
@media(max-width:900px){.control-dock{gap:8px;padding:9px 10px}.fighter-card{padding:7px 9px}.fighter-emblem{width:34px;height:34px;flex-basis:34px}.brand-copy small{font-size:7px}.bottom-meta{display:none}}
`;
if(!css.includes('BOWBRAWL AAA PRESENTATION PASS')) css += '\n'+aaaCss+'\n';
fs.writeFileSync(mainPath,main);
fs.writeFileSync(cssPath,css);
console.log('Bowbrawl AAA visual pass applied.');
