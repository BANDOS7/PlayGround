  // ---------- Spielfeld-Rendering ----------
  function buildPlayBg(g){
    const bg=g.createLinearGradient(0,50,0,H);
    bg.addColorStop(0,'#0a1109');
    bg.addColorStop(0.45,'#0c150b');
    bg.addColorStop(1,'#040703');
    g.fillStyle=bg;g.fillRect(0,0,W,H);

    // dezentes Raster
    g.strokeStyle='rgba(140,190,100,0.035)';g.lineWidth=1;
    for(let x=22;x<W-10;x+=28){
      g.beginPath();g.moveTo(x,56);g.lineTo(x,H-40);g.stroke();
    }
    for(let y=60;y<H-20;y+=28){
      g.beginPath();g.moveTo(16,y);g.lineTo(W-16,y);g.stroke();
    }
    // Seitliche Gefahrenstreifen
    for(const side of [0,1]){
      const x=side?W-16:0;
      g.save();
      g.beginPath();g.rect(x,58,16,540);g.clip();
      for(let i=-20;i<600;i+=16){
        g.fillStyle=(Math.floor(i/16)%2===0)?'rgba(130,160,55,0.16)':'rgba(10,14,8,0.5)';
        g.beginPath();
        g.moveTo(x+i,60);g.lineTo(x+i+8,60);g.lineTo(x+i+24,598);g.lineTo(x+i+16,598);
        g.closePath();g.fill();
      }
      g.restore();
    }
    // Stencil-Schrift
    g.save();
    g.fillStyle='rgba(150,200,110,0.05)';
    g.font='900 34px "Arial Black",sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    g.fillText('SEKTOR 7',W/2,150);
    g.font='700 8px "Courier New",monospace';
    g.fillStyle='rgba(150,200,110,0.08)';
    spaced(g,'PROTOKOLL 1.1.1 // DÜSTERMODUS',W/2,177,1.4,'center');
    g.restore();
    // Biohazard
    g.save();
    g.translate(W/2,392);
    g.globalAlpha=0.045;
    g.strokeStyle='#b8e06a';g.lineWidth=2.5;
    g.beginPath();g.arc(0,0,46,0,TAU);g.stroke();
    for(let i=0;i<3;i++){
      const a=i*TAU/3-Math.PI/2;
      g.beginPath();g.arc(Math.cos(a)*23,Math.sin(a)*23,15,0,TAU);g.stroke();
    }
    g.restore();

    // Blut, Kratzspuren und Graffiti
    g.save();
    g.fillStyle='rgba(80,6,8,0.20)';
    g.beginPath();g.ellipse(78,H-92,48,9,-0.12,0,TAU);g.fill();
    g.beginPath();g.ellipse(96,H-88,20,5,0.2,0,TAU);g.fill();
    g.fillStyle='rgba(80,6,8,0.14)';
    g.beginPath();g.ellipse(300,H-100,40,7,0.1,0,TAU);g.fill();
    g.strokeStyle='rgba(150,20,18,0.18)';g.lineWidth=2;g.lineCap='round';
    for(let i=0;i<4;i++){
      g.beginPath();g.moveTo(24,190+i*11);g.quadraticCurveTo(42,168+i*11,52,144+i*11);g.stroke();
    }
    g.fillStyle='rgba(110,10,14,0.13)';
    g.beginPath();g.ellipse(330,250,5,7,0.2,0,TAU);g.fill();
    for(let i=0;i<4;i++){
      g.beginPath();g.ellipse(322+i*4.6,240,1.6,4,0.1+i*0.06,0,TAU);g.fill();
    }
    g.translate(58,470);g.rotate(-Math.PI/2);
    g.fillStyle='rgba(160,24,20,0.13)';
    g.font='900 17px "Arial Black",sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    spaced(g,'SIE KOMMEN',0,0,2.4,'center');
    g.restore();
    // Blut tropft von oben
    g.fillStyle='rgba(120,8,12,0.30)';
    for(const d of [[112,22],[206,13],[281,34]]){
      g.fillRect(d[0],58,1.6,d[1]);
      g.beginPath();g.arc(d[0]+0.8,58+d[1],2,0,TAU);g.fill();
    }

    // Boden / Drain
    const dg=g.createLinearGradient(0,H-110,0,H);
    dg.addColorStop(0,'rgba(120,20,10,0)');
    dg.addColorStop(0.65,'rgba(120,20,10,0.10)');
    dg.addColorStop(1,'rgba(160,25,12,0.22)');
    g.fillStyle=dg;g.fillRect(0,H-110,W,110);
    // Drain-Rinne
    g.fillStyle='#050302';
    g.beginPath();g.ellipse(W/2,H-8,72,16,0,0,TAU);g.fill();
    g.strokeStyle='rgba(220,60,40,0.28)';g.lineWidth=2;
    g.beginPath();g.ellipse(W/2,H-8,72,16,0,0,TAU);g.stroke();
    g.fillStyle='rgba(220,60,40,0.10)';
    g.beginPath();g.ellipse(W/2,H-8,52,9,0,0,TAU);g.fill();
    // Greifende Hände aus dem Abgrund
    g.save();
    g.globalAlpha=0.18;
    g.fillStyle='#8fa864';
    for(const sgn of [-1,1]){
      g.save();
      g.translate(W/2+sgn*52,H-4);
      g.rotate(-sgn*0.28);
      g.fillRect(-4.5,-26,9,30);
      g.beginPath();g.ellipse(0,-28,9.5,11,0,0,TAU);g.fill();
      for(let i=-2;i<=2;i++){
        g.save();
        g.translate(i*4.2,-36);
        g.rotate(i*0.13);
        g.fillRect(-1.5,0,3,16-i*1.2);
        g.restore();
      }
      g.restore();
    }
    g.restore();

    // Vignette
    const vg=g.createRadialGradient(W/2,H/2,150,W/2,H/2,430);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(0.72,'rgba(0,0,0,0.28)');
    vg.addColorStop(1,'rgba(0,0,0,0.78)');
    g.fillStyle=vg;g.fillRect(0,0,W,H);
  }

  function drawWalls(){
    ctx.save();
    ctx.lineCap='round';
    for(const w of WALLS){
      ctx.strokeStyle='#131b10';ctx.lineWidth=10;
      ctx.beginPath();ctx.moveTo(w[0],w[1]);ctx.lineTo(w[2],w[3]);ctx.stroke();
      ctx.strokeStyle='rgba(120,170,90,0.30)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(w[0],w[1]);ctx.lineTo(w[2],w[3]);ctx.stroke();
      // Gefahrenmarkierung
      ctx.strokeStyle='rgba(180,220,90,0.10)';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(w[0],w[1]);ctx.lineTo(w[2],w[3]);ctx.stroke();
    }
    // Nieten an den Seiten
    ctx.fillStyle='rgba(150,190,120,0.18)';
    for(let y=110;y<590;y+=46){
      ctx.beginPath();ctx.arc(19,y,1.8,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(W-19,y,1.8,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  function drawHUD(){
    const now=performance.now();
    ctx.save();
    const bg=ctx.createLinearGradient(0,0,0,50);
    bg.addColorStop(0,'rgba(7,12,7,0.98)');
    bg.addColorStop(1,'rgba(4,8,4,0.96)');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,50);
    ctx.strokeStyle='rgba(150,210,110,0.35)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,50);ctx.lineTo(W,50);ctx.stroke();
    // Ecken
    ctx.strokeStyle='rgba(157,255,58,0.55)';
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,14);ctx.moveTo(W,0);ctx.lineTo(W,14);ctx.stroke();

    // Punkte
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillStyle='rgba(140,170,120,0.65)';
    ctx.font='700 7px "Courier New",monospace';
    spaced(ctx,'OPFER',14,15,1.2,'left');
    ctx.fillStyle='#eaffd8';
    ctx.font='900 17px "Courier New",monospace';
    ctx.fillText(fmt(G.score),14,34);

    // Welle
    ctx.textAlign='center';
    ctx.fillStyle='rgba(140,170,120,0.65)';
    ctx.font='700 7px "Courier New",monospace';
    spaced(ctx,'WELLE',187,15,1.4,'center');
    ctx.fillStyle='#9dff3a';
    ctx.font='900 17px "Courier New",monospace';
    ctx.fillText(String(G.wave).padStart(2,'0'),187,34);

    // Leben
    ctx.textAlign='right';
    ctx.fillStyle='rgba(140,170,120,0.65)';
    ctx.font='700 7px "Courier New",monospace';
    spaced(ctx,'LEBEN',312,15,1.2,'right');
    const n=Math.min(G.lives,6);
    for(let i=0;i<n;i++){
      const x=312-i*13, y=29;
      ctx.fillStyle='#9dff3a';
      roundRect(ctx,x-9,y-4,9,8,2);ctx.fill();
      ctx.fillRect(x-9,y-4,2,3);
      ctx.fillRect(x-4,y-4,2,3);
      ctx.fillStyle='rgba(6,10,6,0.9)';
      ctx.fillRect(x-6,y-1,2,2);
    }
    if(G.lives>6){
      ctx.fillStyle='#9dff3a';ctx.font='700 8px "Courier New",monospace';
      ctx.fillText('+'+(G.lives-6),312+10,33);
    }

    // Mute
    drawMuteButton();

    // Wellenfortschritt
    const p=clamp((G.score-(G.wave-1)*2200)/2200,0,1);
    ctx.fillStyle='rgba(157,255,58,0.12)';
    ctx.fillRect(0,48,W,2);
    ctx.fillStyle='rgba(157,255,58,0.75)';
    ctx.fillRect(0,48,W*p,2);

    // Combo
    if(G.combo>1){
      ctx.fillStyle='rgba(157,255,58,0.9)';
      ctx.font='900 10px "Courier New",monospace';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText('COMBO ×'+(1+G.combo*0.1).toFixed(1),14,64);
    }
    // Toast
    if(G.toast && now<G.toastUntil){
      ctx.globalAlpha=clamp((G.toastUntil-now)/300,0,1);
      ctx.fillStyle='rgba(10,20,8,0.92)';
      cutRect(ctx,W/2-70,56,140,20,4);ctx.fill();
      ctx.strokeStyle='rgba(157,255,58,0.6)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#dfffc0';
      ctx.font='800 8px "Courier New",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      spaced(ctx,'MUTATION: '+G.toast,W/2,66,1,'center');
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }

  function drawBanner(){
    if(!G.banner) return;
    const now=performance.now();
    const remain=G.bannerUntil-now;
    if(remain<=0) return;
    const a=clamp(remain/400,0,1);
    ctx.save();
    ctx.globalAlpha=a;
    ctx.fillStyle='rgba(3,7,3,0.72)';
    ctx.fillRect(0,62,W,60);
    ctx.strokeStyle='rgba(157,255,58,0.35)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,62);ctx.lineTo(W,62);ctx.moveTo(0,122);ctx.lineTo(W,122);ctx.stroke();
    // Streifen
    for(let i=0;i<W;i+=18){
      ctx.fillStyle=i%36===0?'rgba(157,255,58,0.12)':'transparent';
      ctx.fillRect(i,62,9,3);
      ctx.fillRect(i,119,9,3);
    }
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#9dff3a';
    ctx.font='900 24px system-ui,sans-serif';
    spaced(ctx,G.banner,W/2,88,2.4,'center');
    ctx.fillStyle='rgba(190,215,170,0.75)';
    ctx.font='700 8px "Courier New",monospace';
    spaced(ctx,G.bannerSub,W/2,110,1.6,'center');
    ctx.restore();
  }
