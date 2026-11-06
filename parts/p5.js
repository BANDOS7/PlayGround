  // ---------- Overlays ----------
  const DIFF_KEYS=['rek','agent','veteran'];
  const DIFF_CARDS=DIFF_KEYS.map((k,i)=>({key:k,x:30,y:118+i*112,w:315,h:96}));

  function drawOverlayBase(){
    ctx.save();
    ctx.fillStyle='rgba(2,5,2,0.78)';
    ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(140,200,100,0.14)';
    ctx.lineWidth=1;
    for(let y=0;y<H;y+=44){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }
    ctx.restore();
    drawScanlines();
  }

  function drawScreenTitle(title,sub){
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle='rgba(157,255,58,0.12)';
    ctx.font='900 27px system-ui,sans-serif';
    spaced(ctx,title,W/2,91,3.2,'center');
    ctx.fillStyle='#dff5cf';
    ctx.font='900 27px system-ui,sans-serif';
    spaced(ctx,title,W/2,88,3.2,'center');
    ctx.fillStyle='rgba(150,180,130,0.65)';
    ctx.font='700 8px "Courier New",monospace';
    spaced(ctx,sub,W/2,108,1.8,'center');
    ctx.restore();
  }

  function drawDifficulty(){
    drawMenuBackground();
    drawOverlayBase();
    drawScreenTitle('EINSATZSTUFE','WÄHLE DEIN PROTOKOLL');
    for(const c of DIFF_CARDS){
      const d=DIFFS[c.key];
      const active=G.diff===c.key;
      ctx.save();
      cutRect(ctx,c.x,c.y,c.w,c.h,10);
      ctx.fillStyle=active?'rgba(34,54,24,0.92)':'rgba(10,18,10,0.88)';
      ctx.fill();
      ctx.strokeStyle=active?'rgba(170,255,95,0.95)':'rgba(110,145,90,0.4)';
      ctx.lineWidth=active?2:1;
      ctx.stroke();
      ctx.fillStyle=active?'#9dff3a':'#4b603c';
      ctx.fillRect(c.x+1,c.y+10,4,c.h-20);
      ctx.textAlign='left';ctx.textBaseline='alphabetic';
      ctx.fillStyle=active?'#eaffd8':'#b8cba8';
      ctx.font='900 19px system-ui,sans-serif';
      spaced(ctx,d.name,c.x+20,c.y+32,2.6,'left');
      if(active){
        ctx.fillStyle='rgba(157,255,58,0.18)';
        cutRect(ctx,c.x+c.w-70,c.y+14,52,18,4);ctx.fill();
        ctx.strokeStyle='rgba(157,255,58,0.7)';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='#cfff9a';
        ctx.font='700 8px "Courier New",monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        spaced(ctx,'AKTIV',c.x+c.w-44,c.y+23,1.2,'center');
      }
      ctx.fillStyle='rgba(180,205,160,0.7)';
      ctx.font='700 8.5px "Courier New",monospace';
      spaced(ctx,d.desc,c.x+20,c.y+52,1.1,'left');
      ctx.fillStyle='rgba(140,170,120,0.55)';
      ctx.font='700 8px "Courier New",monospace';
      spaced(ctx,`LEBEN ${d.lives}  ·  KUGEL ${d.ballR}  ·  HORDE ${d.zSpeed.toFixed(2)}×  ·  PUNKTE ${d.mult.toFixed(1)}×`,c.x+20,c.y+74,0.7,'left');
      ctx.restore();
    }
    drawButton(BTN.back,'ZURÜCK',false,false);
    drawCredits();
  }

  function drawRanking(){
    drawMenuBackground();
    drawOverlayBase();
    drawScreenTitle('TOTENLISTE','DIE BESTEN ÜBERLEBENDEN');
    const scores=loadScores();
    ctx.save();
    // Kopfzeile
    ctx.fillStyle='rgba(150,180,130,0.4)';
    ctx.font='700 7px "Courier New",monospace';
    ctx.textBaseline='middle';
    ctx.textAlign='left';ctx.fillText('#',40,140);
    ctx.fillText('EINSATZ',74,140);
    ctx.textAlign='right';ctx.fillText('OPFER',262,140);
    ctx.fillText('WELLE',330,140);
    ctx.strokeStyle='rgba(140,190,100,0.2)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(34,148);ctx.lineTo(341,148);ctx.stroke();
    if(scores.length===0){
      ctx.fillStyle='rgba(170,195,150,0.55)';
      ctx.font='700 10px "Courier New",monospace';
      ctx.textAlign='center';
      spaced(ctx,'NOCH KEINE ÜBERLEBENDEN.',W/2,320,1.6,'center');
      spaced(ctx,'DAS PROTOKOLL WARTET.',W/2,340,1.6,'center');
    }
    scores.slice(0,8).forEach((s,i)=>{
      const y=160+i*40;
      ctx.fillStyle=i%2===0?'rgba(20,32,18,0.55)':'rgba(10,16,10,0.35)';
      cutRect(ctx,30,y-14,315,32,4);ctx.fill();
      ctx.fillStyle='#9dff3a';
      ctx.font='900 13px "Courier New",monospace';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(String(i+1).padStart(2,'0'),40,y+1);
      const dn = DIFFS[s.diff]?DIFFS[s.diff].name:'AGENT';
      ctx.fillStyle='rgba(190,215,170,0.8)';
      ctx.font='700 8px "Courier New",monospace';
      ctx.fillText(dn,74,y+1);
      ctx.fillStyle='rgba(240,255,230,0.95)';
      ctx.font='900 14px system-ui,sans-serif';
      ctx.textAlign='right';
      ctx.fillText(fmt(s.score),262,y+1);
      ctx.fillStyle='rgba(160,190,140,0.7)';
      ctx.font='700 9px "Courier New",monospace';
      ctx.fillText('W'+s.wave,330,y+1);
    });
    ctx.restore();
    drawButton(BTN.back,'ZURÜCK',false,false);
    drawCredits();
  }

  function drawGameOver(){
    drawOverlayBase();
    ctx.save();
    // Panel
    cutRect(ctx,28,150,319,412,14);
    const pg=ctx.createLinearGradient(0,150,0,562);
    pg.addColorStop(0,'rgba(16,10,10,0.97)');
    pg.addColorStop(1,'rgba(7,5,5,0.97)');
    ctx.fillStyle=pg;ctx.fill();
    ctx.strokeStyle='rgba(255,70,50,0.75)';ctx.lineWidth=1.8;ctx.stroke();
    // Gefahrenstreifen oben
    ctx.save();
    cutRect(ctx,28,150,319,412,14);ctx.clip();
    for(let i=-40;i<420;i+=16){
      ctx.fillStyle=i%32===0?'rgba(190,40,30,0.5)':'rgba(20,8,8,0.5)';
      ctx.beginPath();
      ctx.moveTo(i,150);ctx.lineTo(i+8,150);ctx.lineTo(i+24,170);ctx.lineTo(i+16,170);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();
    // Titel
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle='rgba(255,80,60,0.5)';
    ctx.font='700 8px "Courier New",monospace';
    spaced(ctx,'SIGNAL VERLOREN  //  BIO-SEKTOR 7',W/2,194,1.5,'center');
    ctx.fillStyle='#ff5a46';
    ctx.font='900 38px system-ui,sans-serif';
    ctx.shadowColor='rgba(255,40,20,0.5)';ctx.shadowBlur=22;
    spaced(ctx,'GEFALLEN',W/2,242,2.5,'center');
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,90,70,0.35)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(58,262);ctx.lineTo(W-58,262);ctx.stroke();
    // Werte
    const rows=[
      ['OPFER',fmt(G.score)],
      ['WELLE',String(G.wave)],
      ['EINSATZSTUFE',cfg().name],
      ['BESTLEISTUNG',fmt(G.best)]
    ];
    rows.forEach((r,i)=>{
      const y=292+i*29;
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(150,175,135,0.6)';
      ctx.font='700 8px "Courier New",monospace';
      spaced(ctx,r[0],58,y,1.2,'left');
      ctx.textAlign='right';
      ctx.fillStyle=i===0?'#ffd9cf':'#dfeccf';
      ctx.font=(i===0?'900 18px':'700 11px')+' "Courier New",monospace';
      ctx.fillText(r[1],W-58,y);
    });
    // Rang
    if(G.rank>0){
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(157,255,58,0.16)';
      cutRect(ctx,88,408,199,24,5);ctx.fill();
      ctx.fillStyle='#cfff9a';
      ctx.font='800 9px "Courier New",monospace';
      spaced(ctx,`NEUER EINTRAG IN DER TOTENLISTE: #${G.rank}`,W/2,420,1.2,'center');
    } else {
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(150,175,135,0.45)';
      ctx.font='700 8px "Courier New",monospace';
      spaced(ctx,'KEIN EINTRAG. DAS PROTOKOLL VERGISST NICHTS.',W/2,420,1.1,'center');
    }
    ctx.restore();
    drawButton(BTN.again,'NOCHMAL',true,false);
    drawButton(BTN.toMenu,'KOMMANDO',false,false);
    drawCredits();
  }
