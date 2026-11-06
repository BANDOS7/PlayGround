  // ---------- Eingabe ----------
  const pointers = new Map();
  function getPos(e){
    const r = canvas.getBoundingClientRect();
    return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) };
  }
  canvas.addEventListener('pointerdown', e=>{
    if(e.pointerType==='mouse' && e.button!==0) return;
    e.preventDefault();
    ensureAudio();
    const p = getPos(e);
    pointers.set(e.pointerId, p);
    handleDown(p.x,p.y,e.pointerId);
  });
  canvas.addEventListener('pointermove', e=>{
    const p = getPos(e);
    if(pointers.has(e.pointerId)) pointers.set(e.pointerId,p);
    G.look = clamp((p.x-W/2)/120,-1,1);
  });
  function releasePointer(e){
    const p = pointers.get(e.pointerId);
    if(!p) return;
    pointers.delete(e.pointerId);
    handleUp(p.x,p.y,e.pointerId);
  }
  canvas.addEventListener('pointerup', e=>{ e.preventDefault(); releasePointer(e); });
  canvas.addEventListener('pointercancel', e=>{ releasePointer(e); });
  window.addEventListener('pointerup', e=>{ if(pointers.has(e.pointerId)) releasePointer(e); });
  canvas.addEventListener('contextmenu', e=>e.preventDefault());

  // ---------- Menü-Hintergrund (animiertes Containment-Labor) ----------
  let menuBgCache=null, playBgCache=null, titleCache=null, scanPattern=null;
  let menuDust=[];
  function initDust(){
    menuDust=[];
    for(let i=0;i<28;i++){
      menuDust.push({x:rand(0,W),y:rand(60,H-80),s:rand(0.6,2.2),v:rand(2,9),p:rand(0,TAU)});
    }
  }
  function drawDust(){
    ctx.save();
    for(const d of menuDust){
      const y = d.y - ((G.t*d.v)%620);
      const yy = y < 40 ? y+620 : y;
      const a = 0.10 + 0.10*Math.sin(G.t*2+d.p);
      ctx.fillStyle = `rgba(180,220,140,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(d.x + Math.sin(G.t*0.7+d.p)*6, yy, d.s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function buildMenuBg(g){
    const bg = g.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0a120a');
    bg.addColorStop(0.45,'#0c140b');
    bg.addColorStop(1,'#040604');
    g.fillStyle = bg; g.fillRect(0,0,W,H);

    // Rückwand-Paneele
    g.strokeStyle='rgba(120,160,100,0.07)';
    g.lineWidth=1;
    for(let y=70;y<360;y+=56){
      g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke();
    }
    for(let x=0;x<W;x+=75){
      g.beginPath(); g.moveTo(x,60); g.lineTo(x,360); g.stroke();
    }
    // Nieten
    g.fillStyle='rgba(150,190,120,0.10)';
    for(let x=18;x<W;x+=75){
      for(let y=80;y<360;y+=56){
        g.beginPath(); g.arc(x,y,1.6,0,TAU); g.fill();
      }
    }

    // Deckenrohre
    g.strokeStyle='#1a2418'; g.lineWidth=9; g.lineCap='round';
    g.beginPath(); g.moveTo(-10,42); g.lineTo(W+10,42); g.stroke();
    g.strokeStyle='rgba(150,200,120,0.14)'; g.lineWidth=1.5;
    g.beginPath(); g.moveTo(-10,38); g.lineTo(W+10,38); g.stroke();
    for(let x=40;x<W;x+=90){
      g.fillStyle='#233020'; g.fillRect(x,36,10,12);
      g.fillStyle='rgba(160,210,130,0.18)'; g.fillRect(x+2,38,2,8);
    }
    // Seitenkabel
    g.strokeStyle='#162014'; g.lineWidth=6;
    g.beginPath(); g.moveTo(9,60); g.bezierCurveTo(2,180,18,300,8,420); g.stroke();
    g.beginPath(); g.moveTo(W-9,60); g.bezierCurveTo(W-2,180,W-18,300,W-8,420); g.stroke();

    // Kratzspuren
    g.save();
    g.strokeStyle='rgba(120,18,18,0.22)';g.lineWidth=2;g.lineCap='round';
    for(let i=0;i<3;i++){
      g.beginPath();
      g.moveTo(46+i*7,258);
      g.quadraticCurveTo(58+i*7,232,64+i*7,204);
      g.stroke();
    }
    for(let i=0;i<3;i++){
      g.beginPath();
      g.moveTo(W-58-i*7,262);
      g.quadraticCurveTo(W-70-i*7,236,W-76-i*7,208);
      g.stroke();
    }
    g.restore();

    // Warnschild hinten
    g.save();
    g.globalAlpha=0.10;
    g.translate(W/2,330);
    g.strokeStyle='#b8e06a'; g.lineWidth=2;
    g.beginPath(); g.arc(0,0,28,0,TAU); g.stroke();
    for(let i=0;i<3;i++){
      const a=i*TAU/3 - Math.PI/2;
      g.beginPath(); g.arc(Math.cos(a)*14,Math.sin(a)*14,9,0,TAU); g.stroke();
    }
    g.font='700 8px "Courier New",monospace'; g.textAlign='center';
    g.fillStyle='#b8e06a'; g.fillText('BIO-GEFAHR',0,48);
    g.restore();

    // Blutige Handabdrücke an der Rückwand
    g.save();
    g.globalAlpha=0.17;
    for(const hp of [[137,408,-0.35],[241,431,0.4]]){
      g.save();
      g.translate(hp[0],hp[1]);
      g.rotate(hp[2]);
      g.fillStyle='#8a1414';
      g.beginPath();g.ellipse(0,0,6,8,0,0,TAU);g.fill();
      for(let f=0;f<4;f++){
        g.beginPath();g.ellipse(-7.5+f*5,-9-((f===1||f===2)?1.5:0),2,5.5,-0.1+f*0.07,0,TAU);g.fill();
      }
      g.fillStyle='rgba(120,10,10,0.5)';
      g.fillRect(-1,7,2,14);
      g.restore();
    }
    g.restore();

    // Boden mit Perspektive
    g.save();
    const vy=470;
    const fg = g.createLinearGradient(0,vy,0,H);
    fg.addColorStop(0,'rgba(30,46,26,0)');
    fg.addColorStop(1,'rgba(26,40,22,0.55)');
    g.fillStyle=fg; g.fillRect(0,vy,W,H-vy);
    g.strokeStyle='rgba(140,190,100,0.10)'; g.lineWidth=1;
    for(let i=-7;i<=7;i++){
      g.beginPath(); g.moveTo(W/2+i*8,vy); g.lineTo(W/2+i*90,H+40); g.stroke();
    }
    for(let i=1;i<=7;i++){
      const t=i/7, y=vy+Math.pow(t,1.9)*(H-vy);
      g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke();
    }
    g.restore();

    // Vignette
    const vg = g.createRadialGradient(W/2,H/2,120,W/2,H/2,430);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(0.75,'rgba(0,0,0,0.35)');
    vg.addColorStop(1,'rgba(0,0,0,0.85)');
    g.fillStyle=vg; g.fillRect(0,0,W,H);
  }

  function drawBeacon(){
    const t=G.t;
    const bx=W-46, by=94;
    const pulse=0.5+0.5*Math.sin(t*2.1);
    const rg=ctx.createRadialGradient(bx,by,2,bx,by,80);
    rg.addColorStop(0,`rgba(255,50,40,${0.16+0.12*pulse})`);
    rg.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=rg;
    ctx.beginPath(); ctx.arc(bx,by,80,0,TAU); ctx.fill();
    ctx.fillStyle=`rgba(255,70,50,${0.55+0.4*pulse})`;
    ctx.beginPath(); ctx.arc(bx,by,3.4,0,TAU); ctx.fill();
    // rotierender Lichtkegel
    ctx.save();
    ctx.translate(bx,by);
    ctx.rotate(t*0.55);
    ctx.globalAlpha=0.045;
    ctx.fillStyle='#ff3020';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(120,-40); ctx.lineTo(120,24); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawLampFlicker(){
    const t=G.t;
    const base=0.72 + Math.sin(t*9.1)*0.02;
    let a=base;
    if(Math.sin(t*13.7)>0.985 || Math.sin(t*3.3+1.7)>0.997) a*=0.25;
    const x=W/2, y=66;
    const lg=ctx.createRadialGradient(x,y,2,x,y,150);
    lg.addColorStop(0,`rgba(200,255,170,${0.10*a})`);
    lg.addColorStop(1,'rgba(200,255,170,0)');
    ctx.fillStyle=lg;
    ctx.beginPath(); ctx.arc(x,y,150,0,TAU); ctx.fill();
    ctx.fillStyle=`rgba(225,255,195,${0.5*a})`;
    ctx.fillRect(x-46,y-2,92,2);
  }

  function drawFog(){
    ctx.save();
    for(let i=0;i<3;i++){
      const x = (G.t*(7+i*4) + i*170) % (W+240) - 120;
      const y = 350 + i*85 + Math.sin(G.t*0.5+i)*16;
      const rg=ctx.createRadialGradient(x,y,10,x,y,120);
      rg.addColorStop(0,'rgba(120,160,100,0.055)');
      rg.addColorStop(1,'rgba(120,160,100,0)');
      ctx.fillStyle=rg;
      ctx.beginPath(); ctx.ellipse(x,y,130,54,0,0,TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawScanlines(){
    if(!scanPattern){
      const c=document.createElement('canvas'); c.width=2; c.height=3;
      const g=c.getContext('2d');
      g.fillStyle='rgba(0,0,0,0.16)'; g.fillRect(0,0,2,1);
      scanPattern=ctx.createPattern(c,'repeat');
    }
    ctx.save();
    ctx.globalAlpha=0.55;
    ctx.fillStyle=scanPattern;
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  function drawMenuBackground(){
    if(menuBgCache) ctx.drawImage(menuBgCache,0,0,W,H);
    else { ctx.fillStyle='#080d07'; ctx.fillRect(0,0,W,H); }

    drawBeacon();
    drawLampFlicker();
    drawFog();

    // linke & rechte Containment-Röhre
    drawTank(24,352,74,172,0);
    drawTank(277,352,74,172,1);

    // Podest
    const py=584;
    ctx.save();
    const pg=ctx.createRadialGradient(W/2,py,8,W/2,py,140);
    pg.addColorStop(0,'rgba(130,200,90,0.16)');
    pg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=pg;
    ctx.beginPath(); ctx.ellipse(W/2,py,150,34,0,0,TAU); ctx.fill();
    ctx.fillStyle='#101a0e';
    ctx.beginPath(); ctx.ellipse(W/2,py,116,23,0,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(160,220,110,0.40)'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.ellipse(W/2,py,116,23,0,0,TAU); ctx.stroke();
    ctx.setLineDash([5,7]);
    ctx.strokeStyle='rgba(160,220,110,0.22)';
    ctx.beginPath(); ctx.ellipse(W/2,py,98,18,0,0,TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // WUMMI
    if(G.state==='menu' || G.state==='difficulty' || G.state==='ranking'){
      drawWummi(W/2, py-46, 1.18, G.t, { look:G.look, bark: performance.now()<G.barkUntil, menu:true });
    }

    drawDust();
    drawScanlines();
  }
