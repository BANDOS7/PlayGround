  // ---------- WUMMI (Dackel) ----------
  function drawWummi(cx,cy,s,t,opt){
    opt=opt||{};
    const running=!!opt.running;
    const menu=!!opt.menu;
    const bark=!!opt.bark;
    const look=clamp(opt.look||0,-1,1);
    const facing=(opt.facing||1)>=0?1:-1;
    const bob=running?Math.abs(Math.sin(t*10))*2:Math.sin(t*1.8)*0.7;
    const hop=bark?Math.abs(Math.sin(performance.now()/110))*5:0;
    const blink=menu && (Math.sin(t*1.3+2.2)>0.995);

    ctx.save();
    ctx.translate(cx,cy-bob-hop);
    // Schatten
    ctx.save();
    ctx.globalAlpha=0.35;
    ctx.fillStyle='#000';
    ctx.beginPath();ctx.ellipse(0,38*s,52*s,7*s,0,0,TAU);ctx.fill();
    ctx.restore();

    ctx.scale(facing*s,s);

    // Schwanz
    const wag=Math.sin(t*(running?13:2.3))*(running?0.55:0.4);
    ctx.strokeStyle='#5c3a1e';ctx.lineWidth=8;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-52,-5);
    ctx.quadraticCurveTo(-74,-16-wag*8,-88,-2-wag*16);
    ctx.stroke();
    ctx.strokeStyle='#7a4f28';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(-52,-5);
    ctx.quadraticCurveTo(-74,-16-wag*8,-88,-2-wag*16);
    ctx.stroke();
    ctx.fillStyle='#3a2210';
    ctx.beginPath();ctx.arc(-89,-2-wag*16,3.4,0,TAU);ctx.fill();

    // Hinterbeine
    drawLeg(-42, running?Math.sin(t*10):0, '#4a2d15', -0.15);
    drawLeg(-25, running?Math.sin(t*10+Math.PI):0, '#5e3a1c', 0.1);

    // Körper
    const body=ctx.createLinearGradient(0,-18,0,20);
    body.addColorStop(0,'#b07c43');
    body.addColorStop(0.45,'#8e5d2d');
    body.addColorStop(1,'#5f3a18');
    ctx.fillStyle=body;
    roundRect(ctx,-58,-17,112,35,17);ctx.fill();
    // Bauch
    ctx.fillStyle='rgba(214,175,124,0.28)';
    roundRect(ctx,-50,3,96,13,7);ctx.fill();
    // Fellstriche
    ctx.strokeStyle='rgba(60,34,14,0.35)';ctx.lineWidth=1;
    for(let i=0;i<5;i++){
      ctx.beginPath();
      ctx.moveTo(-40+i*18,-12+((i%2)*3));
      ctx.quadraticCurveTo(-34+i*18,-6,-40+i*18,2);
      ctx.stroke();
    }

    // Vorderbeine
    drawLeg(24, running?Math.sin(t*10+Math.PI):0, '#6e451f', 0.1);
    drawLeg(41, running?Math.sin(t*10):0, '#7a4f28', -0.15);

    // Taktikweste
    const vest=ctx.createLinearGradient(0,-18,0,16);
    vest.addColorStop(0,'#2c3327');
    vest.addColorStop(0.5,'#191f16');
    vest.addColorStop(1,'#0e120c');
    ctx.fillStyle=vest;
    ctx.beginPath();
    ctx.moveTo(-46,-16);
    ctx.lineTo(32,-16);
    ctx.quadraticCurveTo(38,-9,38,2);
    ctx.quadraticCurveTo(38,12,30,14);
    ctx.lineTo(-44,15);
    ctx.quadraticCurveTo(-50,9,-50,0);
    ctx.quadraticCurveTo(-50,-9,-46,-16);
    ctx.closePath();ctx.fill();
    // Riemen
    ctx.strokeStyle='#3c4634';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-44,-15);ctx.lineTo(-40,14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(28,-15);ctx.lineTo(31,14);ctx.stroke();
    // Taschen
    ctx.fillStyle='#232b1e';
    roundRect(ctx,-32,0,17,13,3);ctx.fill();
    roundRect(ctx,2,1,15,11,3);ctx.fill();
    ctx.strokeStyle='#4a563e';ctx.lineWidth=1;
    roundRect(ctx,-32,0,17,13,3);ctx.stroke();
    roundRect(ctx,2,1,15,11,3);ctx.stroke();
    // Oranges Einsatzgerät
    const pulse=0.72+0.28*Math.sin(t*3.2);
    ctx.save();
    ctx.translate(18,-4);
    ctx.shadowColor='rgba(255,140,30,'+(0.8*pulse)+')';
    ctx.shadowBlur=10;
    ctx.fillStyle='#ff8a1e';
    ctx.beginPath();ctx.arc(0,0,5.4,0,TAU);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,230,170,'+pulse+')';
    ctx.beginPath();ctx.arc(-1.5,-1.5,2.2,0,TAU);ctx.fill();
    ctx.strokeStyle='#4a3010';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(0,0,6.8,0,TAU);ctx.stroke();
    ctx.restore();
    // LED
    if(Math.sin(t*4)>0){
      ctx.fillStyle='#9dff3a';
      ctx.beginPath();ctx.arc(-38,-8,1.8,0,TAU);ctx.fill();
    }
    // Antenne
    ctx.strokeStyle='#3a4232';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(30,-15);ctx.lineTo(36,-33);ctx.stroke();
    if(Math.sin(t*3+1)>0.4){
      ctx.fillStyle='#ff3020';
      ctx.beginPath();ctx.arc(36,-34,2,0,TAU);ctx.fill();
    }
    // Westen-Schrift
    ctx.font='700 4px "Courier New",monospace';
    ctx.fillStyle='rgba(160,220,110,0.7)';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('WUMMI',-23,6.5);

    // Halsband
    ctx.strokeStyle='#7d1414';ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(44,-2,13,-1.2,1.2);ctx.stroke();

    // Kopf
    ctx.save();
    ctx.translate(58+look*2,-14);
    ctx.rotate(-look*0.03);
    // Ohr
    const earSwing=Math.sin(t*1.4)*0.06;
    ctx.save();
    ctx.rotate(-0.25+earSwing);
    ctx.fillStyle='#5c3a1e';
    ctx.beginPath();
    ctx.moveTo(-8,-14);
    ctx.quadraticCurveTo(-18,-4,-12,14);
    ctx.quadraticCurveTo(-4,18,0,8);
    ctx.quadraticCurveTo(4,-2,-8,-14);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(140,90,50,0.4)';
    ctx.beginPath();ctx.ellipse(-7,2,4,9,0.1,0,TAU);ctx.fill();
    ctx.restore();
    // Kopfkugel
    const headG=ctx.createRadialGradient(-4,-6,2,0,0,24);
    headG.addColorStop(0,'#b98349');
    headG.addColorStop(1,'#7a4c22');
    ctx.fillStyle=headG;
    ctx.beginPath();ctx.arc(0,0,19,0,TAU);ctx.fill();
    // Schnauze
    ctx.fillStyle='#c99a62';
    ctx.beginPath();ctx.ellipse(17,5,16,9.5,0.12,0,TAU);ctx.fill();
    // Nase
    ctx.fillStyle='#12100c';
    ctx.beginPath();ctx.ellipse(30,3,4,3.4,0.2,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.beginPath();ctx.arc(29,2,1.1,0,TAU);ctx.fill();
    // Mund
    ctx.strokeStyle='#3a2010';ctx.lineWidth=1.5;
    if(bark){
      ctx.fillStyle='#2a0d0d';
      ctx.beginPath();ctx.ellipse(21,10,6,4.5,0.15,0,TAU);ctx.fill();
      ctx.fillStyle='#d9506a';
      ctx.beginPath();ctx.ellipse(21,12,3.4,2.6,0.1,0,TAU);ctx.fill();
    } else {
      ctx.beginPath();ctx.moveTo(16,9);ctx.quadraticCurveTo(22,12,27,8);ctx.stroke();
    }
    // Auge
    if(blink){
      ctx.strokeStyle='#1a1008';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(2,-6);ctx.lineTo(10,-6);ctx.stroke();
    } else {
      ctx.fillStyle='#fff6e6';
      ctx.beginPath();ctx.ellipse(6,-6,4.4,4.8,0,0,TAU);ctx.fill();
      ctx.fillStyle='#ff9a2e';
      ctx.beginPath();ctx.arc(6+look*1.6,-5.6,3.1,0,TAU);ctx.fill();
      ctx.fillStyle='#1a0e06';
      ctx.beginPath();ctx.arc(6+look*2.2,-5.6,1.5,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath();ctx.arc(4.8,-7.2,1,0,TAU);ctx.fill();
    }
    // Augenbraue
    ctx.strokeStyle='#4a2c12';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(1,-12);ctx.quadraticCurveTo(7,-14,12,-11);ctx.stroke();
    // Fellstriche Kopf
    ctx.strokeStyle='rgba(90,55,25,0.4)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(-11,-4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-12,-8);ctx.lineTo(-14,0);ctx.stroke();
    ctx.restore();

    // Narbe auf der Schnauze
    ctx.strokeStyle='rgba(80,40,20,0.55)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(58,-6);ctx.lineTo(67,2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(61,-9);ctx.lineTo(64,-4);ctx.stroke();
    // Dog Tag am Halsband
    ctx.strokeStyle='rgba(190,200,180,0.65)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(47,6);ctx.lineTo(50,17);ctx.stroke();
    ctx.fillStyle='#b8c2a8';
    roundRect(ctx,45.5,16,9,11,2);ctx.fill();
    ctx.fillStyle='#3a4a2e';
    ctx.font='700 4px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('W7',50,21.5);
    // grünes Rim-Light
    ctx.strokeStyle='rgba(170,255,110,0.22)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-46,-17);ctx.quadraticCurveTo(0,-22,38,-13);ctx.stroke();

    ctx.restore();
  }
  function drawLeg(x,swing,color,tilt){
    ctx.save();
    ctx.translate(x,11);
    ctx.rotate(swing*0.6+(tilt||0));
    ctx.fillStyle=color;
    roundRect(ctx,-4,0,8,23,4);ctx.fill();
    ctx.fillStyle='#2e1a0c';
    roundRect(ctx,-5.5,20,11,6,3);ctx.fill();
    ctx.restore();
  }

  // ---------- Zombie im Tank ----------
  function drawTankZombie(cx,cy,r,seed){
    const t=G.t;
    const variant=Math.floor(seed*5)%2;
    ctx.save();
    ctx.translate(cx,cy);
    const twitch=Math.sin(t*2.6+seed*3)>0.984?0.09*Math.sin(t*28):0;
    ctx.rotate(Math.sin(t*0.4+seed*2)*0.05+twitch);
    ctx.globalAlpha=0.97;
    // Blutwolke im Wasser
    ctx.fillStyle='rgba(120,8,16,0.11)';
    ctx.beginPath();ctx.ellipse(r*0.25,r*0.4,r*1.2,r*0.55,0.25,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(120,8,16,0.07)';
    ctx.beginPath();ctx.ellipse(-r*0.5,r*1.0,r*0.5,r*0.25,-0.3,0,TAU);ctx.fill();
    // Beine (schlaff, leicht baumelnd)
    ctx.lineCap='round';
    const kick=Math.sin(t*1.5+seed*4)*2;
    ctx.strokeStyle='#1f2917';ctx.lineWidth=r*0.24;
    ctx.beginPath();ctx.moveTo(-r*0.28,r*0.68);ctx.quadraticCurveTo(-r*0.55,r*1.25,-r*0.42+kick,r*1.78);ctx.stroke();
    ctx.strokeStyle='#27331c';
    ctx.beginPath();ctx.moveTo(r*0.28,r*0.68);ctx.quadraticCurveTo(r*0.5,r*1.3,r*0.38-kick,r*1.82);ctx.stroke();
    // Stiefel
    ctx.fillStyle='#0c110a';
    ctx.beginPath();ctx.ellipse(-r*0.42+kick,r*1.84,r*0.17,r*0.1,0.25,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(r*0.38-kick,r*1.88,r*0.17,r*0.1,-0.15,0,TAU);ctx.fill();
    // Torso
    const suit=ctx.createLinearGradient(0,-r*0.8,0,r*0.85);
    suit.addColorStop(0,'#4f5f35');suit.addColorStop(0.5,'#31401f');suit.addColorStop(1,'#18200f');
    ctx.fillStyle=suit;
    ctx.beginPath();
    ctx.moveTo(-r*0.5,-r*0.5);
    ctx.quadraticCurveTo(-r*0.68,r*0.05,-r*0.5,r*0.72);
    ctx.lineTo(0,r*0.84);
    ctx.lineTo(r*0.5,r*0.72);
    ctx.quadraticCurveTo(r*0.68,r*0.05,r*0.5,-r*0.5);
    ctx.quadraticCurveTo(0,-r*0.76,-r*0.5,-r*0.5);
    ctx.closePath();ctx.fill();
    // Riss
    ctx.fillStyle='rgba(80,10,14,0.9)';
    ctx.beginPath();
    ctx.moveTo(-r*0.36,-r*0.14);
    ctx.lineTo(-r*0.06,r*0.05);
    ctx.lineTo(-r*0.18,r*0.42);
    ctx.lineTo(-r*0.44,r*0.08);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(205,180,145,0.4)';ctx.lineWidth=1;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-r*0.22,r*0.04,r*(0.06+i*0.05),-1.2,0.7);ctx.stroke();}
    // Arme nach oben zum Glas
    const sway=Math.sin(t*1.2+seed*3)*0.6;
    ctx.strokeStyle='#3f4d2a';ctx.lineWidth=r*0.23;
    ctx.beginPath();ctx.moveTo(-r*0.48,-r*0.36);
    ctx.quadraticCurveTo(-r*0.95,-r*0.55,-r*1.22,-r*0.95+sway);ctx.stroke();
    ctx.strokeStyle='#4a5932';
    ctx.beginPath();ctx.moveTo(r*0.48,-r*0.36);
    ctx.quadraticCurveTo(r*0.95,-r*0.55,r*1.2,-r*0.95-sway);ctx.stroke();
    // Hände am Glas
    ctx.fillStyle='#1a2311';
    ctx.beginPath();ctx.arc(-r*1.24,-r*0.98+sway,r*0.16,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(r*1.22,-r*0.98-sway,r*0.16,0,TAU);ctx.fill();
    // Finger
    ctx.strokeStyle='rgba(195,205,175,0.55)';ctx.lineWidth=1;
    for(let i=-1;i<=1;i++){
      ctx.beginPath();ctx.moveTo(-r*1.24+i*2.8,-r*1.08+sway);ctx.lineTo(-r*1.3+i*2.8,-r*1.24+sway);ctx.stroke();
      ctx.beginPath();ctx.moveTo(r*1.22+i*2.8,-r*1.08-sway);ctx.lineTo(r*1.28+i*2.8,-r*1.24-sway);ctx.stroke();
    }
    // Kopf / Kapuze
    const hood=ctx.createRadialGradient(-r*0.1,-r*1.0,1,0,-r*0.92,r*0.5);
    hood.addColorStop(0,'#5a6a3e');
    hood.addColorStop(1,'#2d3a1f');
    ctx.fillStyle=hood;
    ctx.beginPath();ctx.arc(0,-r*0.92,r*0.47,0,TAU);ctx.fill();
    // Gasmaske
    ctx.fillStyle='#0a1007';
    ctx.beginPath();ctx.arc(-r*0.17,-r*0.97,r*0.14,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(r*0.17,-r*0.97,r*0.14,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(160,205,130,0.32)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(-r*0.17,-r*0.97,r*0.14,0,TAU);ctx.stroke();
    ctx.beginPath();ctx.arc(r*0.17,-r*0.97,r*0.14,0,TAU);ctx.stroke();
    // Ein Auge glüht
    ctx.fillStyle='#d8ff9a';ctx.shadowColor='#a8ff60';ctx.shadowBlur=9;
    ctx.beginPath();ctx.arc(-r*0.17,-r*0.97,r*0.06,0,TAU);ctx.fill();
    ctx.shadowBlur=0;
    if(variant===0){
      ctx.fillStyle='rgba(216,255,160,0.55)';
      ctx.beginPath();ctx.arc(r*0.17,-r*0.97,r*0.045,0,TAU);ctx.fill();
    } else {
      ctx.strokeStyle='rgba(210,235,185,0.4)';ctx.lineWidth=0.9;
      ctx.beginPath();
      ctx.moveTo(r*0.07,-r*1.08);ctx.lineTo(r*0.17,-r*0.97);ctx.lineTo(r*0.09,-r*0.85);
      ctx.stroke();
    }
    // Filter
    ctx.fillStyle='#131a0e';
    roundRect(ctx,-r*0.12,-r*0.79,r*0.24,r*0.17,r*0.06);ctx.fill();
    // Maul / Zähne
    ctx.fillStyle='rgba(32,4,6,0.9)';
    ctx.beginPath();ctx.ellipse(0,-r*0.68,r*0.15,r*0.08,0,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(215,205,175,0.8)';
    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.moveTo(-r*0.11+i*r*0.065,-r*0.73);
      ctx.lineTo(-r*0.085+i*r*0.065,-r*0.65);
      ctx.lineTo(-r*0.06+i*r*0.065,-r*0.73);
      ctx.closePath();ctx.fill();
    }
    // Blut am Hals
    ctx.fillStyle='rgba(115,8,14,0.7)';
    ctx.fillRect(-r*0.02,-r*0.6,r*0.06,r*0.5);
    ctx.beginPath();ctx.arc(r*0.01,-r*0.1,r*0.06,0,TAU);ctx.fill();
    // grünes Gegenlicht
    ctx.strokeStyle='rgba(170,230,110,0.18)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,-r*0.92,r*0.5,-2.6,0.4);ctx.stroke();
    // Blutblasen
    ctx.fillStyle='rgba(180,30,30,0.35)';
    for(let i=0;i<3;i++){
      const bp=(t*0.2+i*0.33+seed)%1;
      ctx.beginPath();ctx.arc(r*0.2+Math.sin(t+i)*4,-r*0.2-bp*r*1.6,1.2+i*0.4,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  function drawTank(x,y,w,h,seed){
    const t=G.t;
    ctx.save();
    // Glow
    const gg=ctx.createRadialGradient(x+w/2,y+h/2,6,x+w/2,y+h/2,w*1.15);
    gg.addColorStop(0,'rgba(130,210,80,0.16)');
    gg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gg;ctx.fillRect(x-18,y-18,w+36,h+36);
    // Rahmen
    ctx.fillStyle='#111a0e';
    roundRect(ctx,x-5,y-5,w+10,h+10,12);ctx.fill();
    // Glas
    const lg=ctx.createLinearGradient(x,0,x+w,0);
    lg.addColorStop(0,'#0a120a');
    lg.addColorStop(0.5,'#142110');
    lg.addColorStop(1,'#081008');
    ctx.fillStyle=lg;
    roundRect(ctx,x,y,w,h,9);ctx.fill();
    // Flüssigkeit + Inhalt
    ctx.save();
    roundRect(ctx,x,y,w,h,9);ctx.clip();
    const liq=ctx.createLinearGradient(0,y,0,y+h);
    liq.addColorStop(0,'rgba(100,180,60,0.05)');
    liq.addColorStop(0.55,'rgba(110,190,70,0.13)');
    liq.addColorStop(1,'rgba(130,220,90,0.25)');
    ctx.fillStyle=liq;
    ctx.fillRect(x,y+h*0.18,w,h*0.82);
    const bob=Math.sin(t*0.8+seed*3)*3;
    drawTankZombie(x+w/2, y+h*0.56+bob, w*0.34, seed);
    // Blasen
    for(let i=0;i<6;i++){
      const ph=(t*0.25+i*0.37+seed*0.21)%1;
      const by=y+h-ph*h;
      const bx=x+w*0.2+((i*29+seed*17)%Math.max(1,w*0.6));
      ctx.strokeStyle='rgba(190,255,150,'+(0.22*(1-ph))+')';
      ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(bx,by,1.4+ (i%3)*0.8,0,TAU);ctx.stroke();
    }
    // Blutiger Handabdruck am Glas
    ctx.save();
    ctx.globalAlpha=0.13;
    ctx.fillStyle='#7a1414';
    ctx.beginPath();ctx.ellipse(x+w*0.62,y+h*0.42,6.5,8.5,0.25,0,TAU);ctx.fill();
    for(let f=0;f<4;f++){
      ctx.beginPath();
      ctx.ellipse(x+w*0.62-8+f*5.2,y+h*0.42-9.5,2.1,5.2,-0.15+f*0.08,0,TAU);
      ctx.fill();
    }
    ctx.restore();
    // Glasreflexion
    ctx.globalAlpha=0.10;
    ctx.fillStyle='#dfffd0';
    ctx.beginPath();
    ctx.moveTo(x+8,y+12);ctx.lineTo(x+w*0.35,y+6);ctx.lineTo(x+w*0.2,y+h-8);ctx.lineTo(x+6,y+h-16);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    ctx.restore();
    // Rahmen vorn
    ctx.strokeStyle='#2c3a24';ctx.lineWidth=3.5;
    roundRect(ctx,x,y,w,h,9);ctx.stroke();
    ctx.strokeStyle='rgba(150,210,110,0.18)';ctx.lineWidth=1;
    roundRect(ctx,x+2.5,y+2.5,w-5,h-5,7);ctx.stroke();
    // Etikett
    ctx.fillStyle='rgba(10,16,8,0.9)';
    ctx.fillRect(x+w/2-19,y+h-22,38,12);
    ctx.strokeStyle='rgba(160,220,110,0.35)';ctx.lineWidth=1;
    ctx.strokeRect(x+w/2-19,y+h-22,38,12);
    ctx.fillStyle='#9dcf6a';
    ctx.font='700 7px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(seed===0?'BIO-07':'BIO-13',x+w/2,y+h-16);
    ctx.restore();
  }
