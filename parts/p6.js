  // ---------- Spielzustand / Physik ----------
  let balls=[], bumpers=[], zombies=[], powerups=[], parts=[], pops=[], decals=[];
  const WALLS=[
    [16,92,16,596],
    [359,92,359,596],
    [16,92,70,58],
    [70,58,305,58],
    [305,58,359,92],
    [16,536,86,602],
    [359,536,289,602]
  ];
  const flips={
    L:{px:96, py:604, len:78, rest:0.30, up:-0.45, angle:0.30, hold:false, minUntil:0, active:false},
    R:{px:279,py:604, len:78, rest:Math.PI-0.30, up:Math.PI+0.45, angle:Math.PI-0.30, hold:false, minUntil:0, active:false}
  };
  // Slingshots / Kickrampen über den Flippern
  const KICKERS=[
    {x:112,y:502,r:14,side:1,flash:0,cool:0},
    {x:263,y:502,r:14,side:-1,flash:0,cool:0}
  ];

  function loadScores(){
    const l=store.get(SCORE_KEY,[]);
    if(!Array.isArray(l)) return [];
    return l.filter(e=>e&&typeof e.score==='number').sort((a,b)=>b.score-a.score).slice(0,8);
  }
  function saveScore(){
    const entry={score:G.score,wave:G.wave,diff:G.diff,date:new Date().toLocaleDateString('de-DE')};
    let list=loadScores();
    list.push(entry);
    list.sort((a,b)=>b.score-a.score);
    const rank=list.findIndex(e=>e===entry)+1;
    list=list.slice(0,8);
    store.set(SCORE_KEY,list);
    G.rank=(rank<=8)?rank:0;
    G.best=list.length?list[0].score:entry.score;
  }

  function startGame(){
    ensureAudio();
    G.state='play';
    G.score=0; G.wave=1; G.lives=cfg().lives; G.combo=0; G.comboT=0;
    G.slowUntil=0; G.shake=0; G.rank=0; G.saveUntil=0;
    G.best=loadScores().length?loadScores()[0].score:0;
    balls=[];bumpers=[];zombies=[];powerups=[];parts=[];pops=[];decals=[];
    setupWave();
    spawnBall();
    G.banner='WELLE 1'; G.bannerSub='EINSATZ BEGINNT'; G.bannerUntil=performance.now()+1900;
    SFX.wave();
  }

  function setupWave(){
    bumpers=[]; zombies=[]; powerups=[];
    const c=cfg();
    const layouts=[
      [[187,170],[123,246],[251,246],[107,334],[267,334],[187,300],[188,403]],
      [[187,160],[120,222],[254,222],[96,306],[278,306],[187,356],[145,404],[229,404]],
      [[95,176],[280,176],[95,292],[280,292],[187,222],[187,370],[130,332],[244,332]]
    ];
    const layout=layouts[randi(0,layouts.length-1)];
    const bc=Math.min(11,c.bumperCount+Math.floor(G.wave/2));
    for(let i=0;i<bc;i++){
      const base=layout[i%layout.length];
      const x=clamp(base[0]+rand(-13,13),52,W-52);
      const y=clamp(base[1]+rand(-13,13),130,420);
      if(Math.abs(x-W/2)<58 && y>300) continue;
      if(bumpers.every(bm=>dist(bm.x,bm.y,x,y)>46)){
        bumpers.push({x,y,r:19,flash:0,cool:0,phase:rand(0,TAU),id:i});
      }
    }
    const zc=Math.min(15,c.zombieCount+Math.floor(G.wave*1.2));
    for(let i=0;i<zc;i++) spawnZombie(c);
  }

  function spawnZombie(c){
    c=c||cfg();
    for(let tr=0;tr<40;tr++){
      const x=rand(56,W-56), y=rand(128,455);
      if(dist(x,y,W/2,H-104)<130) continue;
      if(Math.abs(x-W/2)<72 && y>310) continue;
      if(bumpers.some(b=>dist(b.x,b.y,x,y)<44)) continue;
      if(zombies.some(z=>dist(z.x,z.y,x,y)<48)) continue;
      const brute=Math.random()<0.12+G.wave*0.02;
      zombies.push({
        x,y,
        vx:rand(-1,1)*c.zSpeed*(brute?0.6:1),
        vy:rand(-1,1)*c.zSpeed*(brute?0.6:1),
        r:brute?24:17,
        hp:brute?Math.ceil(2+G.wave/2):Math.ceil(1+G.wave/4),
        phase:rand(0,TAU),
        seed:rand(0,TAU),
        cool:0,
        brute,
        mutant:Math.random()<0.18,
        hurt:0
      });
      return;
    }
  }

  function spawnBall(){
    const c=cfg();
    balls=[{
      x:W/2, y:H-104, vx:0, vy:0, r:c.ballR, baseR:c.ballR,
      serving:true, phase:rand(0,TAU), facing:1, trail:[],
      stuck:0, nudge:0, flipCool:0, bomb:false, bigUntil:0, look:0
    }];
    G.serving=true; G.charging=false; G.charge=0; G.serveAt=performance.now();
    G.respawnAt=0;
  }

  function launchBall(power){
    const b=balls.find(bb=>bb.serving);
    if(!b) return;
    const p=clamp(power==null?1:power,0.1,1);
    b.vy=-(10+7.5*p);
    b.vx=(Math.random()<0.5?-1:1)*rand(3.4,4.8);
    b.serving=false;
    G.saveUntil=performance.now()+5200;
    G.serving=false; G.charging=false; G.charge=0;
    SFX.launch();
    for(let i=0;i<14;i++){
      parts.push({x:b.x+rand(-7,7),y:b.y+8,vx:rand(-3,3),vy:rand(0,4),life:rand(280,600),max:600,size:rand(2,5),color:'rgba(200,230,190,0.5)',kind:'steam'});
    }
    if(navigator.vibrate) navigator.vibrate(20);
  }

  function capSpeed(b){
    const sp=Math.hypot(b.vx,b.vy), max=15;
    if(sp>max){ b.vx=b.vx/sp*max; b.vy=b.vy/sp*max; }
  }

  function segCircle(ax,ay,bx,by,cx,cy,r){
    const dx=bx-ax,dy=by-ay;
    const l2=dx*dx+dy*dy;
    let t=l2?((cx-ax)*dx+(cy-ay)*dy)/l2:0;
    t=clamp(t,0,1);
    const nx0=ax+dx*t, ny0=ay+dy*t;
    let nx=cx-nx0, ny=cy-ny0;
    const d=Math.hypot(nx,ny);
    if(d<r){
      if(d<0.0001){ nx=0; ny=-1; } else { nx/=d; ny/=d; }
      return {hit:true,nx,ny,pen:r-d};
    }
    return {hit:false};
  }

  function collideWalls(b){
    for(const w of WALLS){
      const c=segCircle(w[0],w[1],w[2],w[3],b.x,b.y,b.r);
      if(c.hit){
        b.x+=c.nx*(c.pen+0.5); b.y+=c.ny*(c.pen+0.5);
        const vn=b.vx*c.nx+b.vy*c.ny;
        if(vn<0){ b.vx-=1.55*vn*c.nx; b.vy-=1.55*vn*c.ny; }
        capSpeed(b);
      }
    }
  }

  function collideFlipper(b,f,now){
    const tx=f.px+Math.cos(f.angle)*f.len;
    const ty=f.py+Math.sin(f.angle)*f.len;
    const c=segCircle(f.px,f.py,tx,ty,b.x,b.y,b.r+2);
    if(!c.hit) return;
    b.x+=c.nx*(c.pen+0.5); b.y+=c.ny*(c.pen+0.5);
    const vn=b.vx*c.nx+b.vy*c.ny;
    if(vn<0){ b.vx-=1.5*vn*c.nx; b.vy-=1.5*vn*c.ny; }
    if(f.active && now>(b.flipCool||0)){
      b.vx += c.nx*3.2 + (f.px<W/2?2.2:-2.2);
      b.vy += c.ny*3.2 - 4.8;
      b.flipCool=now+120;
      SFX.hit();
      for(let i=0;i<5;i++) parts.push({x:b.x,y:b.y,vx:rand(-3,3),vy:rand(-4,2),life:260,max:260,size:rand(1,2.4),color:'rgba(180,255,120,0.8)',kind:'spark'});
    }
    capSpeed(b);
  }

  function hitBumper(b,bm,now){
    const d=dist(b.x,b.y,bm.x,bm.y)||1;
    const nx=(b.x-bm.x)/d, ny=(b.y-bm.y)/d;
    b.x=bm.x+nx*(b.r+bm.r+0.6);
    b.y=bm.y+ny*(b.r+bm.r+0.6);
    const vn=b.vx*nx+b.vy*ny;
    if(vn<0){ b.vx-=1.30*vn*nx; b.vy-=1.30*vn*ny; }
    b.vx+=nx*3.0; b.vy+=ny*3.0;
    capSpeed(b);
    if(now>bm.cool){
      bm.cool=now+150;
      bm.flash=1;
      addScore(45);
      SFX.bump();
      if(navigator.vibrate) navigator.vibrate(8);
      for(let i=0;i<9;i++) parts.push({x:bm.x+rand(-8,8),y:bm.y+rand(-8,8),vx:rand(-4,4),vy:rand(-4,4),life:rand(220,500),max:500,size:rand(1,2.8),color:i%2?'rgba(200,255,140,0.9)':'rgba(255,180,80,0.8)',kind:'spark'});
    }
  }

  function killZombie(z){
    z.dead=true;
    G.combo=Math.min(G.combo+1,10);
    G.comboT=performance.now()+2600;
    addScore(120*(1+G.combo*0.1));
    SFX.kill();
    if(navigator.vibrate) navigator.vibrate([12,30,20]);
    G.shake=Math.max(G.shake,7);
    for(let i=0;i<20;i++) parts.push({x:z.x,y:z.y,vx:rand(-5,5),vy:rand(-5,5),life:rand(350,850),max:850,size:rand(1.5,4.5),color:i%3===0?'#c8ff8a':(i%3===1?'#6fae3a':'#a3141f'),kind:'goo'});
    decals.push({x:z.x,y:z.y,r:rand(8,16),color:'rgba(70,110,30,0.22)',life:900});
    if(Math.random()<0.30) dropPowerup(z.x,z.y);
    pops.push({x:z.x,y:z.y-12,text:'+'+fmt(Math.round(120*(1+G.combo*0.1)*cfg().mult)),life:800,max:800,color:'#cfff9a'});
  }

  function hitZombie(b,z,now){
    if(z.cool>now || z.dead) return;
    z.cool=now+160;
    const d=dist(b.x,b.y,z.x,z.y)||1;
    const nx=(b.x-z.x)/d, ny=(b.y-z.y)/d;
    b.x=z.x+nx*(b.r+z.r+0.5);
    b.y=z.y+ny*(b.r+z.r+0.5);
    const vn=b.vx*nx+b.vy*ny;
    if(vn<0){ b.vx-=1.45*vn*nx; b.vy-=1.45*vn*ny; }
    b.vx+=nx*1.6; b.vy+=ny*1.6;
    capSpeed(b);
    z.hp--;
    z.hurt=1;
    addScore(22);
    SFX.hit();
    for(let i=0;i<7;i++) parts.push({x:z.x,y:z.y,vx:rand(-4,4),vy:rand(-4,4),life:rand(220,520),max:520,size:rand(1,3),color:i%2?'#9dff5a':'#a3141f',kind:'goo'});
    if(b.bomb){
      b.bomb=false;
      explode(b.x,b.y);
    } else if(z.hp<=0){
      killZombie(z);
    }
  }

  function explode(x,y){
    SFX.kill(); G.shake=Math.max(G.shake,16);
    if(navigator.vibrate) navigator.vibrate([25,40,30]);
    for(let i=0;i<34;i++) parts.push({x,y,vx:rand(-8,8),vy:rand(-8,8),life:rand(320,900),max:900,size:rand(2,5),color:i%3===0?'#ffca6a':(i%3===1?'#ff5a3a':'#9dff5a'),kind:'goo'});
    decals.push({x,y,r:26,color:'rgba(140,40,20,0.22)',life:900});
    for(const z of zombies){
      if(z.dead) continue;
      if(dist(x,y,z.x,z.y)<86){
        z.hp=0; killZombie(z);
      }
    }
    pops.push({x,y:y-20,text:'BOOM!',life:900,max:900,color:'#ffb36a'});
  }

  function dropPowerup(x,y){
    const pool=[
      {k:'M',name:'MULTIBALL',color:'#9dff3a'},
      {k:'S',name:'ZEITLUPE',color:'#4fd8ff'},
      {k:'B',name:'BOMBE',color:'#ff5a46'},
      {k:'P',name:'PANZER',color:'#ffd34a'},
      {k:'L',name:'MEDKIT',color:'#ff7bd5'}
    ];
    const t=pool[randi(0,pool.length-1)];
    powerups.push({x,y,vy:-1.4,vx:rand(-0.8,0.8),r:10,type:t.k,name:t.name,color:t.color,life:11000,phase:rand(0,TAU)});
  }

  function collectPowerup(b,pu,now){
    pu.dead=true;
    SFX.pickup();
    addScore(150);
    G.toast=pu.name; G.toastUntil=now+1600;
    pops.push({x:pu.x,y:pu.y-8,text:pu.name,life:900,max:900,color:pu.color});
    if(pu.type==='M'){
      const extra=[];
      for(let i=0;i<2;i++){
        extra.push({x:b.x+rand(-10,10),y:b.y+rand(-10,10),vx:rand(-6,6),vy:rand(-8,-4),r:b.baseR,baseR:b.baseR,serving:false,phase:rand(0,TAU),facing:1,trail:[],stuck:0,nudge:0,flipCool:0,bomb:false,bigUntil:0});
      }
      balls.push(...extra);
    } else if(pu.type==='S'){
      G.slowUntil=now+7000;
    } else if(pu.type==='B'){
      b.bomb=true;
    } else if(pu.type==='P'){
      b.bigUntil=now+7500;
    } else if(pu.type==='L'){
      G.lives++;
    }
  }

  function addScore(raw){
    G.score += Math.round(raw*cfg().mult);
    const next=G.wave*2200;
    if(G.state==='play' && G.score>=next){
      G.wave++;
      G.score+=200;
      G.banner='WELLE '+G.wave;
      G.bannerSub='GEFAHRENSTUFE ERHÖHT';
      G.bannerUntil=performance.now()+1900;
      G.shake=Math.max(G.shake,9);
      SFX.wave();
      setupWave();
    }
  }

  function drainBall(b){
    b.dead=true;
    balls=balls.filter(bb=>bb!==b);
    SFX.drain();
    G.shake=Math.max(G.shake,10);
    const now=performance.now();
    if(balls.length===0 && G.lives>0 && now<G.saveUntil){
      G.saveUntil=0;
      G.banner='BALL GERETTET';
      G.bannerSub='SICHERUNGSSYSTEM AKTIV';
      G.bannerUntil=now+1400;
      G.respawnAt=now+700;
      return;
    }
    if(balls.length===0){
      G.combo=0;
      G.lives--;
      G.damageFlash=1;
      if(G.lives<=0){
        endGame();
      } else {
        G.respawnAt=performance.now()+900;
        G.banner='LEBEN VERLOREN';
        G.bannerSub='NEUER EINSATZ';
        G.bannerUntil=performance.now()+1400;
      }
    }
  }

  function endGame(){
    if(G.state==='gameover') return;
    G.state='gameover';
    G.serving=false;
    saveScore();
    SFX.over();
    if(navigator.vibrate) navigator.vibrate([60,60,120]);
  }

  function updateGame(step){
    const now=performance.now();
    const sf=now<G.slowUntil?0.45:1;
    G.slow=sf;
    // Flipper
    for(const k of ['L','R']){
      const f=flips[k];
      f.active=f.hold||now<f.minUntil;
      f.angle=lerp(f.angle,f.active?f.up:f.rest,0.33);
    }
    // Bälle
    for(const b of balls){
      if(b.dead) continue;
      b.facing=b.vx<-0.35?-1:(b.vx>0.35?1:b.facing||1);
      b.phase+=step/1000*(b.serving?1.2:6);
      if(b.serving){
        if(G.charging){ G.charge=clamp((now-G.chargeStart)/700,0,1); }
        b.x=W/2; b.y=H-104-Math.min(G.charge,1)*4;
        b.vx=0; b.vy=0;
        // Sicherheits-Autostart: nie in der Startposition gefangen
        if(!G.charging && now-G.serveAt>7000){ launchBall(0.85); }
        if(G.charging && now-G.chargeStart>3600){ launchBall(1); }
        continue;
      }
      b.r = (b.bigUntil>now) ? b.baseR*1.6 : b.baseR;
      b.vy+=cfg().gravity*sf;
      b.vx*=0.996; b.vy*=0.996;
      b.x+=b.vx*sf; b.y+=b.vy*sf;
      capSpeed(b);
      collideWalls(b);
      // Harte obere Begrenzung (verhindert Tunneln bei hoher Geschwindigkeit)
      const topY = b.x<70
        ? lerp(92,58,clamp((b.x-16)/54,0,1))
        : (b.x>305 ? lerp(58,92,clamp((b.x-305)/54,0,1)) : 58);
      if(b.y < topY+b.r){
        b.y = topY+b.r;
        if(b.vy<0) b.vy=-b.vy*0.6;
      }
      collideFlipper(b,flips.L,now);
      collideFlipper(b,flips.R,now);
      for(const bm of bumpers){
        if(dist(b.x,b.y,bm.x,bm.y)<b.r+bm.r) hitBumper(b,bm,now);
      }
      for(const k of KICKERS){
        const dd=dist(b.x,b.y,k.x,k.y);
        if(dd<b.r+k.r){
          const nx=(b.x-k.x)/(dd||1), ny=(b.y-k.y)/(dd||1);
          b.x=k.x+nx*(b.r+k.r+0.6);
          b.y=k.y+ny*(b.r+k.r+0.6);
          b.vx=nx*4.6+k.side*2.0;
          b.vy=-8.2+Math.min(0,ny*2.2);
          capSpeed(b);
          if(now>k.cool){
            k.cool=now+130;
            k.flash=1;
            G.shake=Math.max(G.shake,5);
            addScore(35);
            SFX.bump();
            if(navigator.vibrate) navigator.vibrate(9);
            for(let i=0;i<9;i++) parts.push({x:k.x+rand(-8,8),y:k.y+rand(-6,8),vx:rand(-4,4),vy:rand(-6,1),life:rand(240,520),max:520,size:rand(1,2.6),color:i%2?'#d8ff9a':'#ff8a3a',kind:'spark'});
          }
        }
      }
      for(const z of zombies){
        if(!z.dead && dist(b.x,b.y,z.x,z.y)<b.r+z.r) hitZombie(b,z,now);
      }
      for(const pu of powerups){
        if(!pu.dead && dist(b.x,b.y,pu.x,pu.y)<b.r+pu.r+3) collectPowerup(b,pu,now);
      }
      // Anti-Feststeck-System
      const sp=Math.hypot(b.vx,b.vy);
      if(sf>=1 && sp<0.55){
        b.stuck+=step;
        if(b.stuck>1000){
          b.stuck=0;
          b.nudge=(b.nudge||0)+1;
          if(b.nudge>3){
            b.x=W/2; b.y=H*0.46; b.vx=rand(-3,3); b.vy=-6; b.nudge=0;
            pops.push({x:b.x,y:b.y-18,text:'NEUSTART',life:700,max:700,color:'#9dff3a'});
          } else {
            b.vx=rand(-5,5); b.vy=-rand(5,8);
          }
          for(let i=0;i<8;i++) parts.push({x:b.x,y:b.y,vx:rand(-4,4),vy:rand(-4,1),life:300,max:300,size:rand(1,2.5),color:'#cfff9a',kind:'spark'});
        }
      } else {
        b.stuck=0;
        if(sp>1.5) b.nudge=0;
      }
      // Trail
      b.trail.push({x:b.x,y:b.y});
      if(b.trail.length>8) b.trail.shift();
      // Rand-Sicherung
      if(b.y<H-70){
        if(b.x<20+b.r) b.x=20+b.r;
        if(b.x>W-20-b.r) b.x=W-20-b.r;
      }
      // Drain
      if(b.y>H+30){ drainBall(b); }
    }
    // Kugel-Kollision
    for(let i=0;i<balls.length;i++){
      for(let j=i+1;j<balls.length;j++){
        const a=balls[i],c=balls[j];
        if(a.dead||c.dead) continue;
        const d=dist(a.x,a.y,c.x,c.y);
        if(d<a.r+c.r && d>0.001){
          const nx=(a.x-c.x)/d,ny=(a.y-c.y)/d,pen=(a.r+c.r-d)/2;
          a.x+=nx*pen; a.y+=ny*pen; c.x-=nx*pen; c.y-=ny*pen;
          const vn=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;
          if(vn<0){ a.vx-=vn*nx; a.vy-=vn*ny; c.vx+=vn*nx; c.vy+=vn*ny; }
        }
      }
    }
    // Zombies
    for(const z of zombies){
      if(z.dead) continue;
      z.phase+=step/1000*2;
      z.x+=z.vx*sf; z.y+=z.vy*sf;
      if(z.x<50||z.x>W-50) z.vx*=-1;
      if(z.y<122||z.y>468) z.vy*=-1;
      z.hurt=Math.max(0,z.hurt-step/220);
      if(Math.random()<0.004){ z.vx=rand(-1,1)*cfg().zSpeed*(z.brute?0.6:1); z.vy=rand(-1,1)*cfg().zSpeed*(z.brute?0.6:1); }
    }
    // Powerups
    for(const pu of powerups){
      if(pu.dead) continue;
      pu.phase+=step/1000*2;
      pu.vy+=0.035*sf;
      pu.x+=pu.vx*sf; pu.y+=pu.vy*sf;
      pu.life-=step;
      if(pu.y>H-120 || pu.life<=0) pu.dead=true;
    }
    powerups=powerups.filter(p=>!p.dead);
    zombies=zombies.filter(z=>!z.dead);
    bumpers=bumpers.filter(()=>true);
    // Partikel
    for(const p of parts){
      p.x+=p.vx*sf; p.y+=p.vy*sf;
      p.vy+= (p.kind==='goo'?0.10:0.03)*sf;
      p.vx*=0.985; p.vy*=0.985;
      p.life-=step;
    }
    parts=parts.filter(p=>p.life>0);
    if(parts.length>320) parts=parts.slice(parts.length-320);
    for(const p of pops){ p.y-=0.5*sf; p.life-=step; }
    pops=pops.filter(p=>p.life>0);
    for(const d of decals){ d.life-=step; }
    decals=decals.filter(d=>d.life>0);
    // Bumper- und Kicker-Blitz
    for(const bm of bumpers){ bm.flash=Math.max(0,bm.flash-0.055); }
    for(const k of KICKERS){ k.flash=Math.max(0,k.flash-step/220); }
    // Timer
    if(G.comboT>0 && now>G.comboT){ G.combo=0; G.comboT=0; }
    if(G.shake>0) G.shake=Math.max(0,G.shake-step*0.02);
    if(G.damageFlash>0) G.damageFlash=Math.max(0,G.damageFlash-step/450);
    if(G.toastUntil<now) G.toast='';
    if(G.bannerUntil<now) G.banner='';
    // Respawn
    if(G.respawnAt && now>=G.respawnAt){ spawnBall(); }
  }
