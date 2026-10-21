// audio.js
export function beep(freq=440,dur=0.1){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=freq; g.gain.value=0.1; o.start(); o.stop(ctx.currentTime+dur); }catch(e){} }
