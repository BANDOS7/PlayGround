  // ============================================================
  //  WUMMI — ZOMBIE PINBALL
  //  Entwickler: BANDOS7 · Made in Deutschland
  // ============================================================

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = 375, H = 667;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

  const TAU = Math.PI * 2;
  const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
  const lerp = (a,b,t)=> a+(b-a)*t;
  const rand = (a,b)=> a + Math.random()*(b-a);
  const randi = (a,b)=> Math.floor(rand(a,b+1));
  const dist = (x1,y1,x2,y2)=> Math.hypot(x2-x1,y2-y1);
  const fmt = n => Math.round(n).toLocaleString('de-DE');

  function roundRect(g,x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    g.beginPath();
    g.moveTo(x+r,y);
    g.arcTo(x+w,y,x+w,y+h,r);
    g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);
    g.arcTo(x,y,x+w,y,r);
    g.closePath();
  }
  function cutRect(g,x,y,w,h,c){
    g.beginPath();
    g.moveTo(x+c,y);
    g.lineTo(x+w-c,y);
    g.lineTo(x+w,y+c);
    g.lineTo(x+w,y+h-c);
    g.lineTo(x+w-c,y+h);
    g.lineTo(x+c,y+h);
    g.lineTo(x,y+h-c);
    g.lineTo(x,y+c);
    g.closePath();
  }
  function makeCache(w,h,drawFn){
    const sc = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w*sc); c.height = Math.ceil(h*sc);
    const g = c.getContext('2d');
    g.scale(sc,sc);
    drawFn(g);
    return c;
  }
  function spaced(g,text,x,y,sp,align){
    const chars = [...text];
    let total = 0;
    for(const ch of chars) total += g.measureText(ch).width;
    total += sp * Math.max(0, chars.length-1);
    let cx = align==='center' ? x-total/2 : align==='right' ? x-total : x;
    g.textAlign = 'left';
    for(const ch of chars){
      g.fillText(ch,cx,y);
      cx += g.measureText(ch).width + sp;
    }
    return total;
  }

  // ---------- Speicher ----------
  const store = {
    get(k,d){ try{ const v = localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
    set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  };
  const SCORE_KEY = 'wummi.scores.v1';
  const DIFF_KEY  = 'wummi.diff.v1';
  const MUTE_KEY  = 'wummi.muted.v1';

  const DIFFS = {
    rek:     { key:'rek',     name:'REKRUT',  lives:5, ballR:10,  gravity:0.23, zSpeed:0.55, bumperCount:5, zombieCount:3, flipperPower:11,   mult:1.0, desc:'LEICHTE HORDE · GROSSE KUGEL' },
    agent:   { key:'agent',   name:'AGENT',   lives:3, ballR:8.5, gravity:0.26, zSpeed:0.80, bumperCount:7, zombieCount:4, flipperPower:12.5, mult:1.5, desc:'AUSGEWOGEN · STANDARD-PROTOKOLL' },
    veteran: { key:'veteran', name:'VETERAN', lives:2, ballR:7,   gravity:0.30, zSpeed:1.10, bumperCount:9, zombieCount:6, flipperPower:14,   mult:2.0, desc:'SCHNELLE HORDE · 2× PUNKTE' }
  };
  const G = {
    state:'menu', diff:store.get(DIFF_KEY,'agent'), t:0,
    score:0, wave:1, lives:3, best:0, rank:0,
    serving:true, charging:false, charge:0, chargeStart:0, serveAt:0,
    muted:store.get(MUTE_KEY,false),
    shake:0, slowUntil:0, combo:0, comboT:0,
    look:0, barkUntil:0, toast:'', toastUntil:0,
    banner:'', bannerSub:'', bannerUntil:0,
    respawnAt:0, glitch:0, saveUntil:0, damageFlash:0
  };
  if(!DIFFS[G.diff]) G.diff='agent';
  const cfg = ()=> DIFFS[G.diff];

  // ---------- Audio ----------
  let AC = null, master = null, ambientGain = null, NOISE = null;
  function ensureAudio(){
    if(AC){ if(AC.state==='suspended') AC.resume(); return; }
    try{
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if(!Ctor) return;
      AC = new Ctor();
      master = AC.createGain();
      master.gain.value = G.muted ? 0 : 0.85;
      master.connect(AC.destination);
      startAmbient();
    }catch(e){ AC = null; }
  }
  function noiseBuf(){
    if(NOISE) return NOISE;
    const len = AC.sampleRate * 2;
    NOISE = AC.createBuffer(1, len, AC.sampleRate);
    const d = NOISE.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    return NOISE;
  }
  function burst(dur,vol,freq,type){
    if(!AC) return;
    const t = AC.currentTime;
    const src = AC.createBufferSource();
    src.buffer = noiseBuf();
    src.loop = true;
    const f = AC.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = freq || 700;
    f.Q.value = 1;
    const g = AC.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t+dur);
  }
  function beep(freq,dur,type,vol,slide){
    if(!AC) return;
    const t = AC.currentTime;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,slide), t+dur);
    g.gain.setValueAtTime(vol||0.12,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t+dur);
  }
  function startAmbient(){
    if(!AC) return;
    const g = AC.createGain(); g.gain.value = 0.05; g.connect(master);
    const lp = AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=120;
    const o1 = AC.createOscillator(); o1.type='sine'; o1.frequency.value=47;
    const o2 = AC.createOscillator(); o2.type='sawtooth'; o2.frequency.value=54.5;
    o1.connect(lp); o2.connect(lp); lp.connect(g);
    o1.start(); o2.start();
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.06;
    const lg = AC.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    const src = AC.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    const bp = AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=260; bp.Q.value=0.5;
    const wg = AC.createGain(); wg.gain.value=0.018;
    src.connect(bp); bp.connect(wg); wg.connect(master); src.start();
    ambientGain = g;
  }
  const SFX = {
    click(){ beep(420,0.06,'square',0.10,300); },
    launch(){ burst(0.28,0.20,1200,'lowpass'); beep(90,0.32,'sawtooth',0.12,320); },
    bump(){ beep(660,0.07,'square',0.10,440); burst(0.08,0.10,1600,'highpass'); },
    hit(){ burst(0.09,0.14,600,'lowpass'); beep(150,0.07,'sawtooth',0.08,90); },
    kill(){ burst(0.35,0.20,500,'lowpass'); beep(70,0.28,'sawtooth',0.13,35); },
    pickup(){ beep(620,0.09,'sine',0.13); setTimeout(()=>beep(880,0.10,'sine',0.13),80); setTimeout(()=>beep(1240,0.16,'sine',0.12),160); },
    drain(){ beep(300,0.45,'sawtooth',0.11,55); burst(0.5,0.10,300,'lowpass'); },
    wave(){ beep(440,0.16,'square',0.11); setTimeout(()=>beep(330,0.16,'square',0.11),150); setTimeout(()=>beep(550,0.32,'square',0.12),300); },
    over(){ beep(160,0.9,'sawtooth',0.14,40); setTimeout(()=>beep(90,1.4,'sine',0.12,30),200); },
    bark(){ beep(240,0.08,'square',0.14,160); setTimeout(()=>beep(190,0.12,'square',0.12,110),90); },
    flipper(){ beep(220,0.035,'square',0.05,180); }
  };
  function toggleMute(){
    G.muted = !G.muted;
    store.set(MUTE_KEY,G.muted);
    if(master) master.gain.value = G.muted ? 0 : 0.85;
  }
