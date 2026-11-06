  // ---------- Menü-UI ----------
  const BTN = {
    start:{x:42, y:252, w:291, h:46},
    rank: {x:42, y:310, w:140, h:34},
    diff: {x:193,y:310, w:140, h:34},
    mute: {x:W-48,y:13, w:34, h:26},
    back: {x:97, y:566, w:181, h:40},
    again:{x:88, y:448, w:199, h:42},
    toMenu:{x:88,y:500, w:199, h:36}
  };
  const inRect=(r,x,y)=> x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;

  function buildTitle(g){
    const txt='WUMMI';
    g.textAlign='center';g.textBaseline='middle';
    g.font='900 82px "Arial Black","Arial",sans-serif';
    for(let i=10;i>=1;i--){
      g.fillStyle='#0a1109';
      g.fillText(txt,W/2,52+i*0.95);
    }
    const grad=g.createLinearGradient(0,6,0,104);
    grad.addColorStop(0,'#f6faf1');
    grad.addColorStop(0.18,'#d4e1ce');
    grad.addColorStop(0.43,'#8fa287');
    grad.addColorStop(0.5,'#6f8267');
    grad.addColorStop(0.56,'#b6c6ae');
    grad.addColorStop(0.78,'#e9f2e2');
    grad.addColorStop(1,'#75876d');
    g.fillStyle=grad;
    g.fillText(txt,W/2,52);
    g.strokeStyle='rgba(170,255,95,0.35)';
    g.lineWidth=2;
    g.strokeText(txt,W/2,52);
    g.save();
    g.globalCompositeOperation='source-atop';
    for(let i=0;i<16;i++){
      g.strokeStyle='rgba(18,28,16,'+rand(0.12,0.36).toFixed(2)+')';
      g.lineWidth=rand(0.5,1.6);
      const y=rand(8,100);
      g.beginPath();g.moveTo(rand(25,150),y);g.lineTo(rand(230,352),y+rand(-4,4));g.stroke();
    }
    // Glanzkante
    const hl=g.createLinearGradient(0,10,0,50);
    hl.addColorStop(0,'rgba(255,255,255,0.55)');
    hl.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=hl;
    g.font='900 82px "Arial Black","Arial",sans-serif';
    g.fillText(txt,W/2,52);
    g.restore();
  }

  function drawButton(r,label,primary,small){
    ctx.save();
    cutRect(ctx,r.x,r.y,r.w,r.h,9);
    const bg=ctx.createLinearGradient(0,r.y,0,r.y+r.h);
    if(primary){
      bg.addColorStop(0,'rgba(54,78,38,0.95)');
      bg.addColorStop(1,'rgba(20,32,16,0.95)');
    }else{
      bg.addColorStop(0,'rgba(22,32,20,0.92)');
      bg.addColorStop(1,'rgba(10,16,10,0.92)');
    }
    ctx.fillStyle=bg;ctx.fill();
    ctx.strokeStyle=primary?'rgba(170,255,95,0.85)':'rgba(130,170,100,0.45)';
    ctx.lineWidth=primary?1.8:1.1;
    ctx.stroke();
    // Akzent links
    ctx.fillStyle=primary?'#9dff3a':'#5d7a48';
    ctx.fillRect(r.x+1,r.y+8,3,r.h-16);
    // Ecken
    ctx.strokeStyle=primary?'rgba(220,255,190,0.8)':'rgba(160,200,130,0.4)';
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(r.x+2,r.y+7);ctx.lineTo(r.x+2,r.y+2);ctx.lineTo(r.x+9,r.y+2);
    ctx.moveTo(r.x+r.w-9,r.y+2);ctx.lineTo(r.x+r.w-2,r.y+2);ctx.lineTo(r.x+r.w-2,r.y+7);
    ctx.stroke();
    ctx.fillStyle=primary?'#eaffd8':'#b4c8a4';
    ctx.font=(primary?'800 14px':'700 10.5px')+' system-ui,sans-serif';
    ctx.textBaseline='middle';
    spaced(ctx,label,r.x+r.w/2,r.y+r.h/2+(primary?1:0),primary?2.6:1.7,'center');
    if(primary){
      ctx.fillStyle='#9dff3a';
      ctx.beginPath();
      ctx.moveTo(r.x+r.w-28,r.y+r.h/2);
      ctx.lineTo(r.x+r.w-38,r.y+r.h/2-6);
      ctx.lineTo(r.x+r.w-38,r.y+r.h/2+6);
      ctx.closePath();ctx.fill();
    }
    if(small){
      ctx.fillStyle='rgba(160,200,130,0.5)';
      ctx.font='700 7px "Courier New",monospace';
      ctx.textAlign='right';ctx.textBaseline='top';
      ctx.fillText(small,r.x+r.w-8,r.y+4);
    }
    ctx.restore();
  }

  function drawProtocol(){
    const pulse=0.5+0.5*Math.sin(G.t*3);
    ctx.save();
    ctx.fillStyle=`rgba(255,52,40,${0.45+0.5*pulse})`;
    ctx.beginPath();ctx.arc(17,24,3,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255,90,70,'+(0.12+0.1*pulse)+')';
    ctx.beginPath();ctx.arc(17,24,8,0,TAU);ctx.fill();
    ctx.fillStyle='#7fa060';
    ctx.font='700 8.5px "Courier New",monospace';
    ctx.textBaseline='middle';ctx.textAlign='left';
    spaced(ctx,'PROTOKOLL 1.1.1  //  DÜSTERMODUS',27,24,1.2,'left');
    ctx.restore();
  }

  function drawStatusBar(){
    const y=596,h=30;
    ctx.save();
    ctx.fillStyle='rgba(6,10,6,0.94)';
    ctx.fillRect(0,y,W,h);
    ctx.strokeStyle='rgba(140,200,100,0.35)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,y+h);ctx.lineTo(W,y+h);ctx.stroke();
    // Warnstreifen
    for(const bx of [0,W-34]){
      ctx.save();
      ctx.beginPath();ctx.rect(bx,y+4,34,h-8);ctx.clip();
      for(let i=-20;i<60;i+=10){
        ctx.fillStyle=i%20===0?'#8fae3a':'#151b0d';
        ctx.beginPath();
        ctx.moveTo(bx+i,y);ctx.lineTo(bx+i+5,y);ctx.lineTo(bx+i+15,y+h);ctx.lineTo(bx+i+10,y+h);
        ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle='#728a5a';
    ctx.font='700 7.5px "Courier New",monospace';
    ctx.textBaseline='middle';ctx.textAlign='left';
    spaced(ctx,'EINSATZSTUFE',44,y+h/2,1.4,'left');
    ctx.fillStyle='#d7ecc4';
    ctx.font='800 11px system-ui,sans-serif';
    ctx.textAlign='right';ctx.textBaseline='middle';
    spaced(ctx,cfg().name,W-44,y+h/2,2,'right');
    // Segmentanzeige
    ctx.fillStyle='rgba(157,255,58,0.65)';
    for(let i=0;i<5;i++){
      if(Math.sin(G.t*3+i)>-0.3) ctx.fillRect(W/2-18+i*8,y+h/2-1.5,5,3);
    }
    ctx.restore();
  }

  function drawCredits(){
    ctx.save();
    ctx.fillStyle='rgba(120,145,100,0.55)';
    ctx.font='700 7px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    spaced(ctx,'ENTWICKLER: BANDOS7  //  MADE IN DEUTSCHLAND',W/2,647,1.3,'center');
    ctx.restore();
  }

  function drawMuteButton(){
    const r=BTN.mute;
    ctx.save();
    ctx.fillStyle='rgba(14,22,13,0.8)';
    cutRect(ctx,r.x,r.y,r.w,r.h,6);ctx.fill();
    ctx.strokeStyle='rgba(140,180,110,0.4)';ctx.lineWidth=1;ctx.stroke();
    ctx.strokeStyle=G.muted?'#7a8a6a':'#b9d8a0';
    ctx.fillStyle=G.muted?'#7a8a6a':'#b9d8a0';
    ctx.lineWidth=1.6;
    const cx=r.x+12,cy=r.y+r.h/2;
    ctx.beginPath();
    ctx.moveTo(cx-4,cy-3);ctx.lineTo(cx-1,cy-3);ctx.lineTo(cx+3,cy-7);ctx.lineTo(cx+3,cy+7);ctx.lineTo(cx-1,cy+3);ctx.lineTo(cx-4,cy+3);ctx.closePath();ctx.fill();
    if(G.muted){
      ctx.beginPath();ctx.moveTo(cx+7,cy-4);ctx.lineTo(cx+13,cy+4);ctx.moveTo(cx+13,cy-4);ctx.lineTo(cx+7,cy+4);ctx.stroke();
    }else{
      ctx.beginPath();ctx.arc(cx+4,cy,5,-0.8,0.8);ctx.stroke();
      ctx.beginPath();ctx.arc(cx+4,cy,8,-0.8,0.8);ctx.stroke();
    }
    ctx.fillStyle='rgba(160,190,140,0.55)';
    ctx.font='700 6px "Courier New",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(G.muted?'AUS':'TON',r.x+r.w/2,r.y+r.h-4);
    ctx.restore();
  }

  function drawBark(){
    if(performance.now()>=G.barkUntil) return;
    const remain=(G.barkUntil-performance.now())/900;
    ctx.save();
    ctx.globalAlpha=clamp(remain*2,0,1);
    const x=W/2+64, y=474;
    ctx.fillStyle='rgba(10,16,8,0.9)';
    cutRect(ctx,x-26,y-13,54,25,6);ctx.fill();
    ctx.strokeStyle='rgba(170,255,95,0.7)';ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x-6,y+11);ctx.lineTo(x-14,y+20);ctx.lineTo(x+3,y+11);ctx.closePath();
    ctx.fillStyle='rgba(10,16,8,0.9)';ctx.fill();
    ctx.fillStyle='#d9ffb8';
    ctx.font='900 12px system-ui,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    spaced(ctx,'WUFF!',x,y,1.5,'center');
    ctx.restore();
  }

  function drawMenu(){
    drawMenuBackground();
    // Titel
    const bob=Math.sin(G.t*1.1)*2;
    if(titleCache) ctx.drawImage(titleCache,0,56+bob,W,118);
    // Blutstropfen am Titel
    ctx.save();
    for(const d of [[86,14,2.0],[128,28,2.6],[188,9,1.7],[240,32,2.6],[296,20,2.2],[330,12,1.8]]){
      const x=d[0],len=d[1],w=d[2],y=158;
      ctx.fillStyle='rgba(112,8,10,0.66)';
      ctx.beginPath();
      ctx.moveTo(x-w/2,y);
      ctx.lineTo(x+w/2,y);
      ctx.lineTo(x+w*0.7,y+len);
      ctx.arc(x,y+len+w*0.8,w*0.9,0,Math.PI);
      ctx.lineTo(x-w*0.7,y+len);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(220,80,70,0.35)';
      ctx.fillRect(x-w*0.18,y+2,w*0.35,Math.max(2,len*0.5));
    }
    ctx.restore();
    // Untertitel
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle='rgba(157,255,58,0.10)';
    ctx.font='900 22px system-ui,sans-serif';
    spaced(ctx,'ZOMBIE PINBALL',W/2,203,5.4,'center');
    ctx.fillStyle='#9dff3a';
    ctx.font='900 22px system-ui,sans-serif';
    spaced(ctx,'ZOMBIE PINBALL',W/2,201,5.4,'center');
    ctx.fillStyle='rgba(185,205,170,0.72)';
    ctx.font='700 9.5px "Courier New",monospace';
    spaced(ctx,'EIN DACKEL. EIN FLIPPER.',W/2,222,1.8,'center');
    spaced(ctx,'NULL GNADE.',W/2,238,1.8,'center');
    ctx.restore();

    drawButton(BTN.start,'EINSATZ STARTEN',true,false);
    drawButton(BTN.rank,'TOTENLISTE',false,false);
    drawButton(BTN.diff,'EINSATZSTUFE',false,false);

    drawProtocol();
    drawMuteButton();
    drawStatusBar();
    drawCredits();
    drawBark();
  }
