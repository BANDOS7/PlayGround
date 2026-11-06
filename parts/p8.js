  // ---------- Spielfeld-Objekte ----------
  function drawPlayfieldFx(){
    const t=G.t;
    // Scanner
    const y=60+((t*54)%(H-170));
    const sg=ctx.createLinearGradient(0,y-24,0,y+24);
    sg.addColorStop(0,'rgba(150,255,100,0)');
    sg.addColorStop(0.5,'rgba(150,255,100,0.035)');
    sg.addColorStop(1,'rgba(150,255,100,0)');
    ctx.fillStyle=sg;ctx.fillRect(16,y-24,W-32,48);
    // Warnleuchten
    for(let i=0;i<4;i++){
      const on=Math.sin(t*2.2+i*1.7)>0.55;
      ctx.fillStyle=on?'rgba(255,60,40,0.5)':'rgba(90,30,25,0.25)';
      ctx.beginPath();ctx.arc(i%2?W-25:25,120+i*118,2.2,0,TAU);ctx.fill();
    }
    // Atmosphärischer Nebel unten
    const fg=ctx.createRadialGradient(W/2,H-60,10,W/2,H-60,180);
    fg.addColorStop(0,'rgba(110,160,90,0.045)');
    fg.addColorStop(1,'rgba(110,160,90,0)');
    ctx.fillStyle=fg;
    ctx.beginPath();ctx.ellipse(W/2,H-60,190,90,0,0,TAU);ctx.fill();
  }

  function drawDecals(){
    for(const d of decals){
      const a=Math.min(1,d.life/300)*0.8;
      ctx.save();
      ctx.globalAlpha=a;
      ctx.fillStyle=d.color;
      ctx.beginPath();
      ctx.ellipse(d.x,d.y,d.r,d.r*0.62,Math.sin(d.x)*2,0,TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(d.x+d.r*0.6,d.y+d.r*0.2,d.r*0.22,0,TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBumper(bm){
    const t=G.t;
    const pulse=0.5+0.5*Math.sin(t*2.2+bm.phase);
    ctx.save();
    ctx.translate(bm.x,bm.y);
    const gl=ctx.createRadialGradient(0,0,4,0,0,bm.r*2.4);
    gl.addColorStop(0,`rgba(120,220,70,${0.10+0.10*pulse+bm.flash*0.25})`);
    gl.addColorStop(1,'rgba(120,220,70,0)');
    ctx.fillStyle=gl;
    ctx.beginPath();ctx.arc(0,0,bm.r*2.4,0,TAU);ctx.fill();
    // Basis
    const base=ctx.createRadialGradient(-5,-6,2,0,0,bm.r);
    base.addColorStop(0,'#33402a');
    base.addColorStop(0.7,'#1a2214');
    base.addColorStop(1,'#0b1008');
    ctx.fillStyle=base;
    ctx.beginPath();ctx.arc(0,0,bm.r,0,TAU);ctx.fill();
    // Gefahrenring
    ctx.save();
    ctx.rotate(t*0.35+bm.phase);
    for(let i=0;i<8;i++){
      ctx.strokeStyle=bm.flash>0.1?'#d8ff9a':'rgba(150,210,95,0.55)';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(0,0,bm.r-4,i*TAU/8,i*TAU/8+0.22);
      ctx.stroke();
    }
    ctx.restore();
    // Linse
    const lens=ctx.createRadialGradient(-2,-2,1,0,0,8);
    lens.addColorStop(0,bm.flash>0.1?'#ffffff':'#b6ff70');
    lens.addColorStop(0.5,bm.flash>0.1?'#aaff60':'#5fae32');
    lens.addColorStop(1,'#1c3410');
    ctx.fillStyle=lens;
    ctx.beginPath();ctx.arc(0,0,7.5,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(20,30,12,0.9)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(0,0,8.5,0,TAU);ctx.stroke();
    // SEC
    ctx.fillStyle='rgba(220,255,190,0.85)';
    ctx.font='700 5px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('SEC-'+(bm.id+1<10?'0':'')+(bm.id+1),0,bm.r-4);
    // Antenne
    ctx.strokeStyle='rgba(150,190,120,0.6)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(bm.r*0.55,-bm.r*0.6);ctx.lineTo(bm.r*0.8,-bm.r*1.15);ctx.stroke();
    ctx.fillStyle=pulse>0.5?'#ff4a32':'#521a12';
    ctx.beginPath();ctx.arc(bm.r*0.8,-bm.r*1.15,1.8,0,TAU);ctx.fill();
    // Schlagblitz
    if(bm.flash>0.1){
      ctx.strokeStyle=`rgba(220,255,170,${bm.flash*0.8})`;
      ctx.lineWidth=1.4;
      for(let i=0;i<5;i++){
        const a=rand(0,TAU),r1=bm.r+2,r2=bm.r+rand(5,14);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);
        ctx.lineTo(Math.cos(a+0.15)*r2,Math.sin(a+0.15)*r2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawZombie(z){
    const t=G.t;
    const r=z.r;
    const variant=Math.floor((z.seed||0)*7)%3;
    const bob=Math.sin(z.phase)*1.4;
    const lunge=z.brute?Math.sin(t*2+z.phase)*2.6:Math.sin(t*1.4+z.phase)*1.6;
    const eye=z.mutant?'#ff5a3a':'#d8ffa0';
    ctx.save();
    ctx.translate(z.x+lunge,z.y+bob);
    // Aura bei Mutanten
    if(z.mutant){
      const ag=ctx.createRadialGradient(0,0,2,0,0,r*2.2);
      ag.addColorStop(0,'rgba(200,30,20,0.15)');
      ag.addColorStop(1,'rgba(200,30,20,0)');
      ctx.fillStyle=ag;
      ctx.beginPath();ctx.arc(0,0,r*2.2,0,TAU);ctx.fill();
    }
    // Schatten
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.beginPath();ctx.ellipse(0,r*1.36,r*0.95,4.5,0,0,TAU);ctx.fill();
    // Beine
    const step=Math.sin(z.phase*2);
    ctx.lineCap='round';
    ctx.strokeStyle=z.mutant?'#331c12':'#2f3a22';ctx.lineWidth=r*0.27;
    ctx.beginPath();ctx.moveTo(-r*0.26,r*0.6);ctx.quadraticCurveTo(-r*0.42,r*1.0,-r*0.34+step*2,r*1.32);ctx.stroke();
    ctx.strokeStyle=z.mutant?'#28150e':'#26301b';
    ctx.beginPath();ctx.moveTo(r*0.26,r*0.6);ctx.quadraticCurveTo(r*0.42,r*1.02,r*0.34-step*2,r*1.34);ctx.stroke();
    // Stiefel
    ctx.fillStyle='#10140c';
    ctx.beginPath();ctx.ellipse(-r*0.36+step*2,r*1.38,r*0.19,r*0.1,0.15,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(r*0.36-step*2,r*1.4,r*0.19,r*0.1,-0.1,0,TAU);ctx.fill();
    // Torso
    const suit=ctx.createLinearGradient(0,-r*0.8,0,r*0.8);
    if(z.mutant){
      suit.addColorStop(0,'#5b3323');suit.addColorStop(0.55,'#391f16');suit.addColorStop(1,'#1d0e09');
    } else {
      suit.addColorStop(0,'#5b6a3c');suit.addColorStop(0.55,'#354225');suit.addColorStop(1,'#171e10');
    }
    ctx.fillStyle=suit;
    ctx.beginPath();
    ctx.moveTo(-r*0.5,-r*0.55);
    ctx.quadraticCurveTo(-r*0.68,-r*0.05,-r*0.52,r*0.52);
    ctx.lineTo(-r*0.24,r*0.68);
    ctx.lineTo(0,r*0.58);
    ctx.lineTo(r*0.26,r*0.68);
    ctx.lineTo(r*0.52,r*0.52);
    ctx.quadraticCurveTo(r*0.68,-r*0.05,r*0.5,-r*0.55);
    ctx.quadraticCurveTo(0,-r*0.8,-r*0.5,-r*0.55);
    ctx.closePath();ctx.fill();
    // Schulterpolster
    ctx.fillStyle=z.mutant?'#3a2015':'#2b3520';
    ctx.beginPath();ctx.ellipse(-r*0.5,-r*0.5,r*0.18,r*0.13,-0.4,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(r*0.5,-r*0.5,r*0.18,r*0.13,0.4,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(180,215,145,0.14)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-r*0.4,-r*0.62);ctx.quadraticCurveTo(0,-r*0.76,r*0.4,-r*0.62);ctx.stroke();
    // Reißverschluss
    ctx.strokeStyle='rgba(170,200,140,0.20)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,-r*0.62);ctx.lineTo(0,r*0.6);ctx.stroke();
    // aufgerissene Stelle
    ctx.fillStyle='rgba(74,10,12,0.92)';
    ctx.beginPath();
    ctx.moveTo(-r*0.38,-r*0.18);
    ctx.lineTo(-r*0.08,r*0.0);
    ctx.lineTo(-r*0.2,r*0.36);
    ctx.lineTo(-r*0.48,r*0.06);
    ctx.closePath();ctx.fill();
    // Rippen / Fleisch
    ctx.strokeStyle='rgba(205,175,140,0.45)';ctx.lineWidth=1;
    for(let i=0;i<3;i++){
      ctx.beginPath();ctx.arc(-r*0.24,r*0.02,r*(0.06+i*0.05),-1.2,0.7);ctx.stroke();
    }
    // Blutspritzer
    ctx.fillStyle='rgba(90,6,12,0.6)';
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.ellipse(r*(-0.38+i*0.34),r*(0.3+((i*7)%3)*0.1),r*0.08,r*0.12,i*0.7,0,TAU);
      ctx.fill();
    }
    // Arme (ausgestreckt)
    const arm=Math.sin(z.phase)*0.5;
    ctx.strokeStyle=z.mutant?'#4a281b':'#46552d';ctx.lineWidth=r*0.25;
    ctx.beginPath();ctx.moveTo(-r*0.48,-r*0.42);
    ctx.quadraticCurveTo(-r*0.85,-r*0.3,-r*0.98,-r*0.42+arm*2);
    ctx.stroke();
    ctx.strokeStyle=z.mutant?'#57301f':'#526236';
    ctx.beginPath();ctx.moveTo(r*0.48,-r*0.42);
    ctx.quadraticCurveTo(r*0.85,-r*0.3,r*0.98,-r*0.42-arm*2);
    ctx.stroke();
    // Handschuhe
    ctx.fillStyle='#1b2412';
    ctx.beginPath();ctx.arc(-r*1.0,-r*0.42+arm*2,r*0.16,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(r*1.0,-r*0.42-arm*2,r*0.16,0,TAU);ctx.fill();
    // Finger / Klauen
    ctx.strokeStyle='rgba(200,205,175,0.55)';ctx.lineWidth=1;
    for(let i=-1;i<=1;i++){
      ctx.beginPath();ctx.moveTo(-r*1.05+i*2.4,-r*0.42+arm*2);ctx.lineTo(-r*1.14+i*2.4,-r*0.55+arm*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(r*1.05+i*2.4,-r*0.42-arm*2);ctx.lineTo(r*1.14+i*2.4,-r*0.55-arm*2);ctx.stroke();
    }
    // Kopf / Kapuze
    const hood=ctx.createRadialGradient(-r*0.15,-r*1.02,1,0,-r*0.95,r*0.5);
    hood.addColorStop(0,z.mutant?'#5c3824':'#5d6d40');
    hood.addColorStop(1,z.mutant?'#321b12':'#334022');
    ctx.fillStyle=hood;
    ctx.beginPath();ctx.arc(0,-r*0.95,r*0.46,0,TAU);ctx.fill();
    // Kapuzenrand
    ctx.strokeStyle='rgba(18,24,12,0.8)';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.arc(0,-r*0.95,r*0.42,-2.7,0.5);ctx.stroke();
    // Gasmaske
    if(variant<2){
      // linke Linse
      ctx.fillStyle='#0a1007';
      ctx.beginPath();ctx.arc(-r*0.17,-r*1.0,r*0.135,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(150,190,120,0.30)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(-r*0.17,-r*1.0,r*0.135,0,TAU);ctx.stroke();
      // rechtes Glas (Sprungsriss oder erloschen)
      ctx.fillStyle='#0a1007';
      ctx.beginPath();ctx.arc(r*0.17,-r*1.0,r*0.135,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(150,190,120,0.22)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(r*0.17,-r*1.0,r*0.135,0,TAU);ctx.stroke();
      // glühendes Auge
      ctx.fillStyle=eye;ctx.shadowColor=eye;ctx.shadowBlur=7;
      ctx.beginPath();ctx.arc(-r*0.17,-r*1.0,r*0.055,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
      if(variant===0){
        ctx.fillStyle='rgba(216,255,160,0.5)';
        ctx.beginPath();ctx.arc(r*0.17,-r*1.0,r*0.04,0,TAU);ctx.fill();
      } else {
        // Sprung im rechten Glas
        ctx.strokeStyle='rgba(200,230,170,0.35)';ctx.lineWidth=0.8;
        ctx.beginPath();
        ctx.moveTo(r*0.08,-r*1.12);ctx.lineTo(r*0.17,-r*1.0);ctx.lineTo(r*0.1,-r*0.88);
        ctx.stroke();
      }
      // Filter
      ctx.fillStyle='#141b0e';
      roundRect(ctx,-r*0.12,-r*0.82,r*0.24,r*0.17,r*0.06);ctx.fill();
      ctx.strokeStyle='rgba(150,180,120,0.25)';ctx.lineWidth=1;
      roundRect(ctx,-r*0.12,-r*0.82,r*0.24,r*0.17,r*0.06);ctx.stroke();
      // Blut aus dem Filter
      ctx.fillStyle='rgba(105,8,14,0.7)';
      ctx.beginPath();ctx.ellipse(r*0.02,-r*0.66,r*0.035,r*0.09,0.15,0,TAU);ctx.fill();
    } else {
      // Maske abgerissen: freiliegender Schädel
      ctx.fillStyle='rgba(22,28,14,0.85)';
      ctx.beginPath();ctx.ellipse(0,-r*1.0,r*0.33,r*0.3,0,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(190,180,150,0.55)';
      ctx.beginPath();ctx.ellipse(0,-r*0.92,r*0.24,r*0.2,0,0,TAU);ctx.fill();
      // Augen
      ctx.fillStyle=eye;ctx.shadowColor=eye;ctx.shadowBlur=7;
      ctx.beginPath();ctx.arc(-r*0.11,-r*1.02,r*0.07,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(r*0.11,-r*1.02,r*0.07,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
      // blutiges Maul
      ctx.fillStyle='rgba(34,4,6,0.95)';
      ctx.beginPath();ctx.ellipse(0,-r*0.82,r*0.16,r*0.12,0,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(215,205,175,0.9)';
      for(let i=0;i<4;i++){
        ctx.beginPath();
        ctx.moveTo(-r*0.12+i*r*0.07,-r*0.9);
        ctx.lineTo(-r*0.09+i*r*0.07,-r*0.8);
        ctx.lineTo(-r*0.06+i*r*0.07,-r*0.9);
        ctx.closePath();ctx.fill();
      }
      // Blut
      ctx.strokeStyle='rgba(130,10,18,0.8)';ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(0,-r*0.73);ctx.quadraticCurveTo(r*0.05,-r*0.3,r*0.02,r*0.1);ctx.stroke();
    }
    // Blut am Anzug / Hals
    ctx.fillStyle='rgba(105,8,14,0.65)';
    ctx.beginPath();ctx.ellipse(-r*0.2,-r*0.5,r*0.06,r*0.18,0.2,0,TAU);ctx.fill();
    // Verletzungsblitz
    if(z.hurt>0){
      ctx.globalAlpha=z.hurt*0.5;
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(0,0,r*0.95,0,TAU);ctx.fill();
      ctx.globalAlpha=1;
    }
    // Brute-Markierung
    if(z.brute){
      ctx.fillStyle='rgba(255,80,50,0.85)';
      ctx.font='700 5px "Courier New",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('BRUTE',0,-r*1.55);
    }
    ctx.restore();
  }

  function drawKicker(k){
    const t=G.t;
    ctx.save();
    ctx.translate(k.x,k.y);
    ctx.rotate(k.side>0?-0.18:0.18);
    // Glow
    const gl=ctx.createRadialGradient(0,0,2,0,0,34);
    gl.addColorStop(0,`rgba(255,80,50,${0.10+k.flash*0.32})`);
    gl.addColorStop(1,'rgba(255,80,50,0)');
    ctx.fillStyle=gl;
    ctx.beginPath();ctx.arc(0,0,34,0,TAU);ctx.fill();
    // Rampe
    ctx.beginPath();ctx.moveTo(-15,12);ctx.lineTo(15,12);ctx.lineTo(0,-13);ctx.closePath();
    const wg=ctx.createLinearGradient(0,-13,0,12);
    wg.addColorStop(0,k.flash>0.1?'#ffd9a0':'#5a6b42');
    wg.addColorStop(1,'#171f12');
    ctx.fillStyle=wg;ctx.fill();
    ctx.strokeStyle=k.flash>0.1?'#ffe9b0':'rgba(170,220,120,0.6)';ctx.lineWidth=1.4;ctx.stroke();
    // Gefahrenstreifen
    ctx.save();
    ctx.beginPath();ctx.moveTo(-14,12);ctx.lineTo(14,12);ctx.lineTo(10,5);ctx.lineTo(-10,5);ctx.closePath();ctx.clip();
    for(let i=-20;i<20;i+=6){
      ctx.fillStyle=i%12===0?'#c9a227':'#1a1f12';
      ctx.fillRect(i,5,3,8);
    }
    ctx.restore();
    // Leuchtauge
    const pulse=0.5+0.5*Math.sin(t*3.4+k.side);
    ctx.fillStyle=k.flash>0.1?'#fff':`rgba(255,74,50,${0.5+0.5*pulse})`;
    ctx.beginPath();ctx.arc(0,-2,2.4,0,TAU);ctx.fill();
    // Beschriftung
    ctx.fillStyle='rgba(210,235,190,0.55)';
    ctx.font='700 5px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('KICK',0,9);
    // Funken
    if(k.flash>0.1){
      ctx.strokeStyle=`rgba(255,230,170,${k.flash*0.8})`;
      ctx.lineWidth=1.2;
      for(let i=0;i<4;i++){
        const a=rand(0,TAU);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*15,Math.sin(a)*15);
        ctx.lineTo(Math.cos(a+0.12)*(15+rand(4,12)),Math.sin(a+0.12)*(15+rand(4,12)));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPowerup(pu){
    const t=G.t;
    const bob=Math.sin(t*2.5+pu.phase)*3;
    ctx.save();
    ctx.translate(pu.x,pu.y+bob);
    const gl=ctx.createRadialGradient(0,0,2,0,0,22);
    gl.addColorStop(0,pu.color);
    gl.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=0.22;
    ctx.fillStyle=gl;
    ctx.beginPath();ctx.arc(0,0,22,0,TAU);ctx.fill();
    ctx.globalAlpha=1;
    // Ring
    ctx.save();
    ctx.rotate(t*1.2+pu.phase);
    ctx.strokeStyle=pu.color;
    ctx.globalAlpha=0.65;
    ctx.lineWidth=1.2;
    for(let i=0;i<4;i++){
      ctx.beginPath();ctx.arc(0,0,14,i*TAU/4,i*TAU/4+0.6);ctx.stroke();
    }
    ctx.restore();
    // Kanister
    ctx.fillStyle='#0c130b';
    roundRect(ctx,-6,-14,12,28,4);ctx.fill();
    ctx.strokeStyle=pu.color;ctx.lineWidth=1.6;
    roundRect(ctx,-6,-14,12,28,4);ctx.stroke();
    // Deckel
    ctx.fillStyle=pu.color;
    ctx.fillRect(-4,-16,8,3);
    // Leuchten
    for(let i=0;i<2;i++){
      ctx.fillStyle=Math.sin(t*4+i*2+pu.phase)>0?pu.color:'rgba(80,100,70,0.4)';
      ctx.beginPath();ctx.arc(0,-6+i*12,2,0,TAU);ctx.fill();
    }
    // Buchstabe
    ctx.fillStyle='#fff';
    ctx.font='900 7px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(pu.type,0,1);
    ctx.restore();
  }

  function drawFlipper(f){
    ctx.save();
    ctx.translate(f.px,f.py);
    ctx.rotate(f.angle);
    // Glow
    if(f.active){
      ctx.shadowColor='rgba(157,255,58,0.8)';
      ctx.shadowBlur=14;
    }
    // Hebel
    ctx.strokeStyle='#0d120b';ctx.lineWidth=13;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(f.len,0);ctx.stroke();
    ctx.strokeStyle=f.active?'#6f9a3e':'#33422a';ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(f.len,0);ctx.stroke();
    ctx.shadowBlur=0;
    // Grünkante
    ctx.strokeStyle=f.active?'rgba(200,255,140,0.95)':'rgba(140,190,100,0.4)';
    ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(4,-3);ctx.lineTo(f.len-3,-3);ctx.stroke();
    // Warnstreifen
    for(let i=0;i<4;i++){
      ctx.fillStyle=i%2?'rgba(200,220,60,0.5)':'rgba(15,20,10,0.8)';
      ctx.fillRect(16+i*4,-4,2.2,8);
    }
    // Achse
    ctx.fillStyle='#1b2416';
    ctx.beginPath();ctx.arc(0,0,9,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(150,200,110,0.5)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,9,0,TAU);ctx.stroke();
    ctx.fillStyle=f.active?'#9dff3a':'#4a5c3a';
    ctx.beginPath();ctx.arc(0,0,3,0,TAU);ctx.fill();
    // Spitze
    ctx.fillStyle='#1b2416';
    ctx.beginPath();ctx.arc(f.len,0,5.5,0,TAU);ctx.fill();
    ctx.restore();
  }

  function drawDamageFx(){
    const t=G.t;
    if(G.damageFlash>0){
      const a=G.damageFlash*0.30;
      const rg=ctx.createRadialGradient(W/2,H/2,100,W/2,H/2,430);
      rg.addColorStop(0,'rgba(120,0,0,0)');
      rg.addColorStop(1,'rgba(160,0,0,'+a+')');
      ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
    }
    if(G.lives<=1 && G.state==='play'){
      const a=0.05+0.035*Math.sin(t*4.2);
      const rg=ctx.createRadialGradient(W/2,H/2,140,W/2,H/2,430);
      rg.addColorStop(0,'rgba(120,0,0,0)');
      rg.addColorStop(1,'rgba(150,0,0,'+a+')');
      ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
    }
  }

  function drawParticles(){
    for(const p of parts){
      const a=clamp(p.life/p.max,0,1);
      if(p.kind==='spark'){
        ctx.globalAlpha=a;
        ctx.fillStyle=p.color;
        ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
      } else if(p.kind==='steam'){
        ctx.globalAlpha=a*0.6;
        ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1.6-a*0.6),0,TAU);ctx.fill();
      } else {
        ctx.globalAlpha=a*0.9;
        ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }

  function drawPops(){
    for(const p of pops){
      const a=clamp(p.life/p.max,0,1);
      ctx.save();
      ctx.globalAlpha=a;
      ctx.fillStyle=p.color;
      ctx.font='900 9px "Courier New",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(p.text,p.x,p.y);
      ctx.restore();
    }
  }

  function drawBall(b){
    const t=G.t;
    // Schweif
    for(let i=0;i<b.trail.length;i++){
      const p=b.trail[i];
      const a=(i/b.trail.length)*0.20;
      ctx.fillStyle=`rgba(157,255,58,${a})`;
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,b.r*(i/b.trail.length)),0,TAU);ctx.fill();
    }
    // Glow
    const gl=ctx.createRadialGradient(b.x,b.y,2,b.x,b.y,b.r*3.2);
    gl.addColorStop(0,'rgba(180,255,110,0.35)');
    gl.addColorStop(1,'rgba(120,220,70,0)');
    ctx.fillStyle=gl;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r*3.2,0,TAU);ctx.fill();
    if(b.serving){
      // WUMMI auf der Abschussrampe
      drawWummi(b.x,b.y,0.46*(b.r/8.5),t,{running:false,look:0,facing:1});
      // Ladeanzeige
      ctx.save();
      ctx.strokeStyle='rgba(157,255,58,0.25)';
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(b.x,b.y,b.r+14,-Math.PI/2,-Math.PI/2+TAU*G.charge);ctx.stroke();
      ctx.fillStyle='rgba(200,255,160,0.85)';
      ctx.font='700 7px "Courier New",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      spaced(ctx,'HALTEN & LOSLASSEN',b.x,b.y-30,1,'center');
      ctx.strokeStyle='rgba(150,210,110,0.35)';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(b.x,b.y+b.r+9,16,5,0,0,TAU);ctx.stroke();
      ctx.restore();
    } else {
      // Stahlkugel mit WUMMI-Silhouette
      const rg=ctx.createRadialGradient(b.x-b.r*0.35,b.y-b.r*0.4,b.r*0.1,b.x,b.y,b.r);
      rg.addColorStop(0,'#fbfff0');
      rg.addColorStop(0.3,'#d3efa8');
      rg.addColorStop(0.66,'#7ab63f');
      rg.addColorStop(1,'#1d3a12');
      ctx.fillStyle=rg;
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();
      // WUMMI-Silhouette
      ctx.save();
      ctx.translate(b.x,b.y);
      ctx.scale(b.facing<0?-1:1,1);
      ctx.fillStyle='rgba(24,48,14,0.62)';
      roundRect(ctx,-b.r*0.62,-b.r*0.14,b.r*0.82,b.r*0.30,b.r*0.14);ctx.fill();
      ctx.beginPath();ctx.arc(b.r*0.28,-b.r*0.08,b.r*0.20,0,TAU);ctx.fill();
      ctx.beginPath();ctx.ellipse(b.r*0.18,-b.r*0.36,b.r*0.075,b.r*0.15,0.5,0,TAU);ctx.fill();
      ctx.fillRect(-b.r*0.5,b.r*0.1,b.r*0.1,b.r*0.22);
      ctx.fillRect(b.r*0.1,b.r*0.1,b.r*0.1,b.r*0.22);
      ctx.beginPath();
      ctx.moveTo(-b.r*0.6,-b.r*0.08);
      ctx.lineTo(-b.r*0.84,-b.r*0.34);
      ctx.lineTo(-b.r*0.54,0);
      ctx.closePath();ctx.fill();
      ctx.restore();
      // Glanzpunkte
      ctx.fillStyle='rgba(255,255,255,0.85)';
      ctx.beginPath();ctx.arc(b.x-b.r*0.3,b.y-b.r*0.36,b.r*0.2,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.35)';
      ctx.beginPath();ctx.arc(b.x+b.r*0.26,b.y-b.r*0.14,b.r*0.09,0,TAU);ctx.fill();
      // exakter Trefferring
      ctx.strokeStyle=b.bomb?'rgba(255,90,60,0.9)':'rgba(190,255,130,0.65)';
      ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,0,TAU);ctx.stroke();
    }
    if(b.bomb){
      ctx.strokeStyle='rgba(255,80,50,0.45)';
      ctx.beginPath();ctx.arc(b.x,b.y,b.r+8+Math.sin(t*10)*2,0,TAU);ctx.stroke();
    }
  }
