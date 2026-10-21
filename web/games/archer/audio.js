// audio.js - reuse a single AudioContext
let _ctx = null;
function ctx(){ if(!_ctx){ try{ _ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ _ctx=null; } } if(_ctx && _ctx.state==='suspended') try{ _ctx.resume(); }catch(e){} return _ctx; }
export function beep(freq=440,dur=0.1){ const c=ctx(); if(!c) return; try{ const o=c.createOscillator(); const g=c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value=freq; g.gain.value=0.1; o.start(); o.stop(c.currentTime+dur); }catch(e){} }
