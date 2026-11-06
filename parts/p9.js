  // ---------- Zeichnen / Ablauf ----------
  function drawGameWorld(){
    if(playBgCache) ctx.drawImage(playBgCache,0,0,W,H);
    drawPlayfieldFx();
    drawWalls();
    drawDecals();
    ctx.save();
    if(G.shake>0){
      ctx.translate(rand(-G.shake,G.shake)*0.55, rand(-G.shake,G.shake)*0.55);
    }
    for(const pu of powerups) drawPowerup(pu);
    for(const k of KICKERS) drawKicker(k);
    for(const bm of bumpers) drawBumper(bm);
    for(const z of zombies) drawZombie(z);
    drawFlipper(flips.L);
    drawFlipper(flips.R);
    for(const b of balls){ if(!b.dead) drawBall(b); }
    drawParticles();
    drawPops();
    ctx.restore();
  }

  function drawGame(){
    drawGameWorld();
    drawDamageFx();
    drawHUD();
    drawBanner();
    if(G.slow && G.slow<1){
      ctx.save();
      ctx.fillStyle='rgba(60,200,255,0.035)';
      ctx.fillRect(0,50,W,H-50);
      ctx.restore();
    }
  }

  function draw(){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,W,H);
    switch(G.state){
      case 'menu': drawMenu(); break;
      case 'play': drawGame(); break;
      case 'gameover':
        drawGameWorld();
        drawHUD();
        drawGameOver();
        break;
      case 'difficulty': drawDifficulty(); break;
      case 'ranking': drawRanking(); break;
      default: drawMenu();
    }
  }

  function update(step){
    G.t += step/1000;
    if(G.state==='play') updateGame(step);
    if(G.shake>0 && G.state!=='play') G.shake=Math.max(0,G.shake-step*0.02);
  }

  // ---------- Eingabe-Routing ----------
  const roles=new Map();
  function clearInput(){
    roles.clear();
    flips.L.hold=false; flips.R.hold=false;
    G.charging=false;
  }
  function handleDown(x,y,id){
    // Ton
    if((G.state==='menu'||G.state==='play'||G.state==='gameover') && inRect(BTN.mute,x,y)){
      toggleMute(); SFX.click(); return;
    }
    if(G.state==='menu'){
      if(inRect(BTN.start,x,y)){ SFX.click(); startGame(); return; }
      if(inRect(BTN.rank,x,y)){ SFX.click(); G.state='ranking'; return; }
      if(inRect(BTN.diff,x,y)){ SFX.click(); G.state='difficulty'; return; }
      if(x>52&&x<323&&y>450&&y<600){
        G.barkUntil=performance.now()+900;
        SFX.bark();
        return;
      }
      return;
    }
    if(G.state==='difficulty'){
      for(const c of DIFF_CARDS){
        if(inRect(c,x,y)){
          G.diff=c.key;
          store.set(DIFF_KEY,G.diff);
          SFX.click();
          return;
        }
      }
      if(inRect(BTN.back,x,y)){ SFX.click(); G.state='menu'; return; }
      return;
    }
    if(G.state==='ranking'){
      if(inRect(BTN.back,x,y)){ SFX.click(); G.state='menu'; return; }
      return;
    }
    if(G.state==='gameover'){
      if(inRect(BTN.again,x,y)){ SFX.click(); clearInput(); startGame(); return; }
      if(inRect(BTN.toMenu,x,y)){ SFX.click(); clearInput(); G.state='menu'; return; }
      return;
    }
    if(G.state==='play'){
      if(G.serving && y>H*0.5){
        G.charging=true;
        G.charge=0;
        G.chargeStart=performance.now();
        roles.set(id,'charge');
        return;
      }
      if(!G.serving){
        const side=x<W/2?'L':'R';
        roles.set(id,side);
        flips[side].hold=true;
        flips[side].minUntil=performance.now()+95;
        SFX.flipper();
      }
    }
  }

  function handleUp(x,y,id){
    const role=roles.get(id);
    if(!role) return;
    roles.delete(id);
    if(role==='charge'){
      if(G.serving){
        launchBall(0.35+0.65*clamp(G.charge,0,1));
      }
      G.charging=false;
      return;
    }
    if(role==='L'||role==='R'){
      let still=false;
      for(const r of roles.values()) if(r===role) still=true;
      if(!still) flips[role].hold=false;
    }
  }

  // ---------- Init ----------
  function initAssets(){
    titleCache=makeCache(W,118,buildTitle);
    menuBgCache=makeCache(W,H,buildMenuBg);
    playBgCache=makeCache(W,H,buildPlayBg);
    initDust();
    G.best=loadScores().length?loadScores()[0].score:0;
  }

  let last=performance.now(), acc=0;
  function frame(now){
    let delta=Math.min(now-last,100);
    last=now;
    acc+=delta;
    let steps=0;
    while(acc>=16.6667 && steps<3){
      update(16.6667);
      acc-=16.6667;
      steps++;
    }
    if(steps===3) acc=0;
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{
    last=performance.now(); acc=0;
  });

  // ---------- Debug / Test-Hooks ----------
  window.WUMMI={
    start:()=>startGame(),
    menu:()=>{ G.state='menu'; },
    ranking:()=>{ G.state='ranking'; },
    difficulty:()=>{ G.state='difficulty'; },
    launch:(p)=>{ launchBall(p==null?1:p); },
    gameover:()=>endGame(),
    state:()=>({
      state:G.state, score:G.score, wave:G.wave, lives:G.lives, diff:G.diff,
      serving:G.serving, charging:G.charging, charge:+G.charge.toFixed(2),
      flipL:flips.L.hold, flipR:flips.R.hold, flipperActiveL:flips.L.active, flipperActiveR:flips.R.active,
      balls:balls.map(b=>({x:+b.x.toFixed(1),y:+b.y.toFixed(1),vx:+b.vx.toFixed(2),vy:+b.vy.toFixed(2),serving:b.serving,stuck:+(b.stuck||0).toFixed(0)})),
      zombies:zombies.length, bumpers:bumpers.length, powerups:powerups.length,
      bumperList:bumpers.map(b=>({x:Math.round(b.x),y:Math.round(b.y)})), zombieList:zombies.map(z=>({x:Math.round(z.x),y:Math.round(z.y),r:z.r}))
    })
  };

  initAssets();
  requestAnimationFrame(frame);
})();
