/* ═══════════════════════════════════════════════════════════════════════════
   WUMMI — ZOMBIE PINBALL PROTOCOL
   Entwickler: BANDOS7 · Made in Germany · Version 1.1.1
   Single-file HTML5 / Three.js game. All visuals and audio are procedural.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ───────────────────────────── DOM & UTIL ───────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const glCanvas = $('#gl');
const menuScreen = $('#menuScreen');
const gameScreen = $('#gameScreen');
const menuStage = $('#menuStage');
const gameStage = $('#gameStage');
const modalLayer = $('#modalLayer');
const modalCard = $('#modalCard');
const scoreVal = $('#scoreVal');
const sectorVal = $('#sectorVal');
const sectorName = $('#sectorName');
const ballPips = $('#ballPips');
const comboPill = $('#comboPill');
const objectiveEl = $('#objective');
const powerChips = $('#powerChips');
const eventLine = $('#eventLine');
const k9Pct = $('#k9Pct');
const k9Meter = $('#k9Meter');
const k9Fill = $('#k9Fill');
const launchBtn = $('#launchBtn');
const leftBtn = $('#leftBtn');
const rightBtn = $('#rightBtn');
const controlHint = $('#controlHint');
const bestScoreEl = $('#bestScore');
const difficultyReadout = $('#difficultyReadout');
let state = 'menu';
let activeStage = menuStage;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
};
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Math.floor(n).toLocaleString('de-DE');
const padScore = n => fmt(n).padStart(7, '0');
const nowMs = () => performance.now();
const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buzz(ms = 10) {
  if (settings.haptics && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (_) {}
  }
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.r = clamp(c.r + amt, 0, 1); c.g = clamp(c.g + amt, 0, 1); c.b = clamp(c.b + amt, 0, 1);
  return c;
}

/* ───────────────────────────── SETTINGS ───────────────────────────── */
const STORE_KEYS = { rank: 'wummi_rank_111', settings: 'wummi_settings_111' };
const DEFAULT_SETTINGS = { sound: true, haptics: true, difficulty: 'veteran', name: 'WUMMI' };
let settings = { ...DEFAULT_SETTINGS };
try {
  const raw = localStorage.getItem(STORE_KEYS.settings);
  if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
} catch (_) {}
function saveSettings() {
  try { localStorage.setItem(STORE_KEYS.settings, JSON.stringify(settings)); } catch (_) {}
}

const SEED_RANKING = [
  { name: 'K9-ALPHA', score: 218450, difficulty: 'nightmare', stage: 11, date: '2026-10-31' },
  { name: 'HUND-07', score: 176300, difficulty: 'veteran', stage: 10, date: '2026-10-29' },
  { name: 'SANI-SEC', score: 142800, difficulty: 'veteran', stage: 8, date: '2026-10-27' },
  { name: 'BUNKER9', score: 98500, difficulty: 'recruit', stage: 7, date: '2026-10-24' },
  { name: 'FELDJAEGER', score: 74200, difficulty: 'veteran', stage: 6, date: '2026-10-22' },
  { name: 'WUMMI', score: 38100, difficulty: 'recruit', stage: 4, date: '2026-10-20' }
];
function loadRanking() {
  try {
    const raw = localStorage.getItem(STORE_KEYS.rank);
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) return arr;
  } catch (_) {}
  return SEED_RANKING.slice();
}
let ranking = loadRanking().sort((a, b) => b.score - a.score).slice(0, 20);
function persistRanking() {
  ranking.sort((a, b) => b.score - a.score);
  ranking = ranking.slice(0, 20);
  try { localStorage.setItem(STORE_KEYS.rank, JSON.stringify(ranking)); } catch (_) {}
  updateBestScore();
}
function updateBestScore() {
  const best = ranking.reduce((m, r) => Math.max(m, r.score), 0);
  bestScoreEl.textContent = padScore(best);
}

/* ───────────────────────────── AUDIO ───────────────────────────── */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.noiseBuffer = null;
    this.mode = 'menu';
    this.nextNote = 0;
    this.noteStep = 0;
    this.ready = false;
    this.lastBark = 0;
    this.muted = !settings.sound;
  }
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.17;
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.86;
      this.sfx.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + Math.random() * 0.5);
      this.ready = true;
      this.buildAmbience();
      this.setMode(this.mode);
      this.ctx.resume().catch(() => {});
    } catch (_) {}
  }
  setMode(mode) {
    this.mode = mode;
    this.noteStep = 0;
    this.nextNote = this.ctx ? this.ctx.currentTime + 0.35 : 0;
  }
  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.72, this.ctx.currentTime + 0.12);
    }
  }
  buildAmbience() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const low = ctx.createOscillator(), low2 = ctx.createOscillator();
    const g = ctx.createGain();
    low.type = 'sine'; low.frequency.value = 49;
    low2.type = 'triangle'; low2.frequency.value = 63;
    g.gain.value = 0.12;
    low.connect(g); low2.connect(g); g.connect(this.music);
    low.start(); low2.start();
    const n = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = this.noiseBuffer; n.loop = true;
    filt.type = 'lowpass'; filt.frequency.value = 430; filt.Q.value = 0.6;
    ng.gain.value = 0.04;
    n.connect(filt); filt.connect(ng); ng.connect(this.music);
    n.start();
    // Slow mechanical breathing of the bunker.
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.055; lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain); lfoGain.connect(ng.gain); lfo.start();
  }
  tone(freq, dur = 0.12, type = 'sine', vol = 0.3, slide = 0, destination = this.sfx) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.018, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(destination || this.sfx);
    o.start(t); o.stop(t + dur + 0.03);
  }
  noise(dur = 0.2, cutoff = 1200, vol = 0.3, type = 'lowpass', destination = this.sfx) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noiseBuffer;
    f.type = type; f.frequency.value = cutoff; f.Q.value = 1.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(destination);
    n.start(t); n.stop(t + dur + 0.02);
  }
  update(now) {
    if (!this.ready || this.ctx.state !== 'running' || this.muted) return;
    const ct = this.ctx.currentTime;
    if (ct > this.nextNote) {
      const isMenu = this.mode === 'menu';
      const steps = isMenu ? [0, 2, 5, 7, 9, 11, 5, 2] : [0, 3, 7, 10, 5, 8, 12, 9];
      const root = isMenu ? 82.4 : 98;
      const semis = steps[this.noteStep % steps.length];
      const freq = root * Math.pow(2, semis / 12);
      const dur = isMenu ? 1.1 : 0.55;
      this.tone(freq, dur, this.noteStep % 3 === 0 ? 'triangle' : 'sine', isMenu ? 0.055 : 0.075, 0, this.music);
      if (!isMenu && this.noteStep % 4 === 1) this.tone(freq * 2.02, 0.14, 'square', 0.018, 0, this.music);
      if (!isMenu && this.noteStep % 8 === 4) this.noise(0.24, 700, 0.035, 'bandpass', this.music);
      this.nextNote = ct + (isMenu ? 1.05 : 0.47);
      this.noteStep++;
    }
  }
  click() { this.tone(740, 0.07, 'square', 0.14, -160); }
  ui() { this.tone(960, 0.06, 'triangle', 0.11, 90); }
  flipper() {
    this.noise(0.055, 2800, 0.24, 'highpass');
    this.tone(92, 0.085, 'square', 0.22, -26);
  }
  launch() {
    this.noise(0.34, 1800, 0.42, 'bandpass');
    this.tone(120, 0.32, 'triangle', 0.24, 620);
  }
  bumper() {
    this.tone(530, 0.16, 'triangle', 0.17, -240);
    this.tone(1240, 0.07, 'square', 0.07, -300);
    this.noise(0.08, 1800, 0.1, 'bandpass');
  }
  pod() {
    this.noise(0.18, 620, 0.36, 'lowpass');
    this.tone(180, 0.2, 'sawtooth', 0.12, -70);
  }
  explode() {
    this.noise(0.5, 550, 0.62, 'lowpass');
    this.tone(64, 0.45, 'sawtooth', 0.28, -20);
    this.tone(320, 0.24, 'triangle', 0.14, -250);
  }
  relay() {
    this.tone(1800, 0.1, 'square', 0.11, 500);
    this.tone(2400, 0.18, 'sine', 0.13, 900);
    this.noise(0.06, 3600, 0.12, 'highpass');
  }
  zombie() {
    this.noise(0.34, 390, 0.22, 'bandpass');
    this.tone(96, 0.32, 'sawtooth', 0.08, 38);
  }
  bark() {
    if (!this.ready || nowMs() - this.lastBark < 650) return;
    this.lastBark = nowMs();
    this.noise(0.075, 1300, 0.22, 'bandpass');
    this.tone(340, 0.13, 'sawtooth', 0.18, 220);
    this.noise(0.09, 880, 0.2, 'bandpass');
    this.tone(260, 0.12, 'square', 0.1, -90);
  }
  powerup() {
    [0, 4, 7, 12].forEach((s, i) => setTimeout(() => this.tone(330 * Math.pow(2, s / 12), 0.16, 'triangle', 0.2, 40), i * 65));
  }
  shield() {
    this.tone(740, 0.3, 'sine', 0.18, 240);
    this.tone(1560, 0.25, 'triangle', 0.08, -360);
  }
  drain() {
    this.tone(280, 0.55, 'sawtooth', 0.16, -240);
    this.tone(95, 0.45, 'triangle', 0.15, -40);
    this.noise(0.4, 500, 0.18, 'lowpass');
  }
  multiball() {
    [0, 3, 6, 9, 12].forEach((s, i) => setTimeout(() => this.tone(280 * Math.pow(2, s / 12), 0.22, 'triangle', 0.16, 20), i * 55));
  }
  clear() {
    [0, 4, 7, 12, 16, 19].forEach((s, i) => setTimeout(() => this.tone(260 * Math.pow(2, s / 12), 0.35, 'triangle', 0.2, 2), i * 95));
    this.noise(0.6, 600, 0.24, 'lowpass');
  }
  gameover() {
    [0, -2, -5, -9].forEach((s, i) => setTimeout(() => this.tone(150 * Math.pow(2, s / 12), 0.5, 'sawtooth', 0.17, -18), i * 210));
    this.noise(1.2, 300, 0.18, 'lowpass');
  }
  k9() {
    this.bark();
    this.tone(160, 0.4, 'sawtooth', 0.24, 500);
    [0, 5, 10, 15, 20].forEach((s, i) => setTimeout(() => this.tone(240 * Math.pow(2, s / 12), 0.3, 'square', 0.13, 10), i * 80));
  }
}
const audio = new SoundEngine();

/* ───────────────────────────── RENDERER ───────────────────────────── */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x030607, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} catch (err) {
  console.error(err);
  modalLayer.classList.remove('hidden');
  modalCard.innerHTML = '<div class="modal-kicker">SYSTEMFEHLER</div><h2 class="modal-title">KEIN 3D</h2><p class="modal-sub">Dein Browser konnte WebGL nicht starten. Bitte öffne das Spiel in einem aktuellen Browser mit aktivierter Hardwarebeschleunigung.</p>';
  throw err;
}

const pixelRatioMax = matchMedia('(pointer: coarse)').matches ? 1.65 : 2;
function resizeRenderer() {
  const w = activeStage.clientWidth || app.clientWidth || 390;
  const h = activeStage.clientHeight || app.clientHeight || 693;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioMax));
  renderer.setSize(w, h, false);
  if (menuCamera) { menuCamera.aspect = w / h; menuCamera.updateProjectionMatrix(); }
  if (gameCamera) { gameCamera.aspect = w / h; gameCamera.updateProjectionMatrix(); fitGameCamera(); }
}
function applyUiScale() {
  const size = clamp(app.clientWidth / 39, 8, 14.5);
  // rem-based layout must follow the same 9:16 scale as the app, not the 16px root default.
  document.documentElement.style.fontSize = size + 'px';
  app.style.fontSize = size + 'px';
  document.documentElement.style.setProperty('--ui-scale', String(size / 10));
}
const resizeObserver = new ResizeObserver(() => {
  applyUiScale();
  resizeRenderer();
});
resizeObserver.observe(app);

/* ───────────────────────────── GLOBAL VISUAL CACHE ───────────────────────────── */
const TEX = {};
function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 1, 64, 64, 63);
    g.addColorStop(0, inner);
    g.addColorStop(0.22, inner);
    g.addColorStop(0.62, 'rgba(255,255,255,.14)');
    g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  });
}
TEX.glow = radialTexture();
TEX.spark = canvasTexture(64, 64, (ctx) => {
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,180,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
});
TEX.softCircle = radialTexture('rgba(255,255,255,.9)', 'rgba(255,255,255,0)');

function glowSprite(color, scale = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: true
  }));
  s.scale.set(scale, scale, 1);
  return s;
}

function makeHazardTexture(color1 = '#d7b429', color2 = '#11140d') {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = color2; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(0, 0);
    for (let x = -h; x < w + h; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, h); ctx.lineTo(x + h / 2, 0); ctx.lineTo(x + h / 2 + 22, 0); ctx.lineTo(x + 22, h);
      ctx.closePath(); ctx.fillStyle = color1; ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = .14;
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = i % 2 ? '#000' : '#fff';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  });
}

function makeMetalTexture(base = '#151b18', line = '#637068') {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const a = Math.random() * .15;
      ctx.fillStyle = `rgba(${180 + Math.random() * 50},${200 + Math.random() * 40},${180 + Math.random() * 40},${a})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2.2, Math.random() * 1.4);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,150,110,.12)'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.moveTo(0, Math.random() * h); ctx.lineTo(w, Math.random() * h); ctx.stroke(); }
  });
}
TEX.metal = makeMetalTexture();

/* ───────────────────────────── CHARACTER MODELS ───────────────────────────── */
function makeDogPatchTexture() {
  return canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#232a20'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9bff31'; ctx.lineWidth = 3; ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#d9ff9e'; ctx.font = '900 30px Arial Black, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('K9', w / 2, h / 2 - 1);
  });
}
TEX.dogPatch = makeDogPatchTexture();

function createDachshund(opts = {}) {
  const scale = opts.scale || 1;
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  const fur = new THREE.MeshStandardMaterial({ color: 0x744526, roughness: 0.78, metalness: 0.03, emissive: 0x190905, emissiveIntensity: 0.24 });
  const furDark = new THREE.MeshStandardMaterial({ color: 0x3f2514, roughness: 0.84, metalness: 0.02, emissive: 0x090301, emissiveIntensity: 0.2 });
  const muzzle = new THREE.MeshStandardMaterial({ color: 0xa67648, roughness: 0.7, metalness: 0.02, emissive: 0x1b0d06, emissiveIntensity: 0.16 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x191f19, roughness: 0.52, metalness: 0.28, emissive: 0x050705, emissiveIntensity: 0.25 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x2b332b, roughness: 0.36, metalness: 0.48, emissive: 0x050805, emissiveIntensity: 0.35 });
  const acidMat = new THREE.MeshStandardMaterial({ color: 0x8ee72c, emissive: 0x7bff16, emissiveIntensity: 1.25, roughness: 0.35, metalness: 0.25 });
  const cyanMat = new THREE.MeshStandardMaterial({ color: 0x5fe6ff, emissive: 0x28baff, emissiveIntensity: 1.02, roughness: 0.3, metalness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0909, roughness: 0.55, metalness: 0.22 });
  const white = new THREE.MeshBasicMaterial({ color: 0xf5f1db });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.2, metalness: 0.05, emissive: 0x9f5a00, emissiveIntensity: 0.6 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xbe526b, roughness: 0.72 });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);

  const body = new THREE.Group();
  root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.78, 5, 14), fur);
  torso.rotation.z = Math.PI / 2;
  torso.position.y = 0.72;
  body.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), fur);
  chest.scale.set(0.84, 1.18, 0.95); chest.position.set(0.55, 0.76, 0);
  body.add(chest);
  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), fur);
  rump.scale.set(0.92, 1.1, 0.96); rump.position.set(-0.56, 0.74, 0);
  body.add(rump);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), muzzle);
  belly.scale.set(1.7, 0.55, 0.9); belly.position.set(0.02, 0.48, 0);
  body.add(belly);

  // Fur tufts for a hand-modelled silhouette.
  for (let i = 0; i < 6; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1 + i * 0.006, 5), fur);
    tuft.position.set(0.37 - i * 0.22, 1.01, (i % 2 ? 0.22 : -0.22));
    tuft.rotation.z = (i % 2 ? -0.45 : 0.45); tuft.rotation.x = (i % 2 ? 0.55 : -0.55);
    body.add(tuft);
  }

  // Tactical harness: a snug rounded shell instead of a boxy crate.
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.345, 0.52, 5, 18), vestMat);
  vest.rotation.z = Math.PI / 2;
  vest.position.set(-0.02, 0.78, 0);
  vest.scale.set(1, 0.94, 1.03);
  body.add(vest);
  const vestStrapF = new THREE.Mesh(new THREE.TorusGeometry(0.352, 0.028, 6, 22), armorMat);
  vestStrapF.rotation.y = Math.PI / 2; vestStrapF.position.set(0.42, 0.78, 0); vestStrapF.scale.set(1, 0.94, 1.03);
  body.add(vestStrapF);
  const vestStrapR = vestStrapF.clone(); vestStrapR.position.x = -0.42; body.add(vestStrapR);
  const vestSideL = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.3, 0.1), armorMat);
  vestSideL.position.set(0, 0.66, 0.34);
  body.add(vestSideL);
  const vestSideR = vestSideL.clone(); vestSideR.position.z = -0.34; body.add(vestSideR);
  const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), acidMat);
  buckle.rotation.x = Math.PI / 2; buckle.position.set(0.24, 0.78, 0.4); body.add(buckle);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: TEX.dogPatch, transparent: true }));
  plate.position.set(-0.08, 0.7, 0.398); body.add(plate);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.42), black);
  pack.position.set(-0.36, 0.97, 0); body.add(pack);
  const packLight = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.06, 0.02), acidMat);
  packLight.position.set(-0.36, 1.0, 0.215); body.add(packLight);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.62, 6), armorMat);
  antenna.position.set(-0.48, 1.3, -0.08); antenna.rotation.z = -0.16; body.add(antenna);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), acidMat);
  antennaTip.position.set(-0.53, 1.61, -0.08); body.add(antennaTip);

  // Neck & head rig.
  const neck = new THREE.Group();
  neck.position.set(0.78, 0.93, 0);
  body.add(neck);
  const head = new THREE.Group();
  head.position.set(0.19, 0.1, 0);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 16), fur);
  skull.scale.set(1.03, 0.97, 0.9);
  head.add(skull);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), furDark);
  crown.scale.set(0.95, 0.6, 0.88); crown.position.set(-0.03, 0.21, 0); head.add(crown);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), muzzle);
  snout.scale.set(1.7, 0.82, 0.9); snout.position.set(0.36, -0.07, 0); head.add(snout);
  const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 9), fur);
  bridge.scale.set(1.35, 0.65, 0.85); bridge.position.set(0.27, 0.07, 0); head.add(bridge);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), black);
  nose.scale.set(1.12, 0.76, 1.0); nose.position.set(0.63, -0.065, 0); head.add(nose);
  const noseHL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), new THREE.MeshBasicMaterial({ color: 0x73736b }));
  noseHL.position.set(0.68, -0.002, 0.035); head.add(noseHL);

  const jaw = new THREE.Group();
  jaw.position.set(0.35, -0.18, 0);
  head.add(jaw);
  const jawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 8), muzzle);
  jawMesh.scale.set(1.46, 0.5, 0.9); jawMesh.position.set(0.08, -0.05, 0);
  jaw.add(jawMesh);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), tongueMat);
  tongue.scale.set(1.55, 0.38, 0.9); tongue.position.set(0.16, -0.1, 0); tongue.visible = false;
  jaw.add(tongue);
  for (let i = 0; i < 2; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.05, 5), white);
    tooth.position.set(0.23 + i * 0.1, 0.02, 0.06 - i * 0.1); tooth.rotation.z = Math.PI; jaw.add(tooth);
  }

  // Eyes: amber irises, dark pupils and catchlights.
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.15, 0.105, side * 0.205);
    eye.rotation.y = side * -0.12;
    const whiteMesh = new THREE.Mesh(new THREE.SphereGeometry(0.077, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd7c590, roughness: .4, emissive: 0x705420, emissiveIntensity: .18 }));
    whiteMesh.scale.set(0.9, 1.03, 0.72);
    eye.add(whiteMesh);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.049, 12, 10), eyeMat);
    iris.scale.set(1, 1.06, 0.58); iris.position.set(0.045, 0, side * 0.02);
    eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), black);
    pupil.position.set(0.078, 0, side * 0.025); pupil.scale.set(0.6, 1.1, 0.55);
    eye.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(0.088, 0.026, side * 0.035);
    eye.add(glint);
    head.add(eye);
    eyes.push(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.032, 0.07), furDark);
    brow.position.set(0.14, 0.2, side * 0.19); brow.rotation.z = side * 0.22; brow.rotation.y = side * -0.08;
    head.add(brow);
  }
  // A scar across the left brow; this dog has seen things.
  const scar = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x6f4d3e }));
  scar.position.set(0.07, 0.15, 0.23); scar.rotation.z = 0.55; scar.rotation.x = -0.22; head.add(scar);

  // Floppy ears with inner ear.
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(-0.06, 0.22, side * 0.275);
    pivot.rotation.z = side * 0.15;
    pivot.rotation.x = side * 0.08;
    head.add(pivot);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), furDark);
    ear.scale.set(0.36, 1.45, 0.72); ear.position.set(0.02, -0.22, 0);
    pivot.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8b4b3a, roughness: .75 }));
    inner.scale.set(0.16, 1.25, 0.6); inner.position.set(0.045, -0.24, side * 0.045);
    pivot.add(inner);
    ears.push(pivot);
  }

  // Collar with a tiny glowing tag.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.055, 8, 20), black);
  collar.rotation.y = Math.PI / 2; collar.position.set(0.7, 0.99, 0); neck.add(collar);
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 10), acidMat);
  tag.rotation.x = Math.PI / 2; tag.position.set(0.72, 0.66, 0.2); neck.add(tag);

  // Four short but proud dachshund legs.
  const legs = [];
  for (const [x, z, front] of [[0.48, 0.23, true], [0.48, -0.23, true], [-0.45, 0.23, false], [-0.45, -0.23, false]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.6, z);
    body.add(hip);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 4, 8), fur);
    upper.position.y = -0.2; upper.scale.z = 0.92;
    hip.add(upper);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), furDark);
    paw.scale.set(1.3, 0.58, 1.05); paw.position.set(front ? 0.06 : -0.02, -0.43, 0);
    hip.add(paw);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.2), armorMat);
    boot.position.set(front ? 0.07 : -0.02, -0.47, 0); hip.add(boot);
    legs.push(hip);
  }

  // Layered tail, animated segment by segment.
  const tailBase = new THREE.Group();
  tailBase.position.set(-0.81, 0.83, 0); tailBase.rotation.z = 0.36;
  body.add(tailBase);
  const tailSegments = [];
  let tailParent = tailBase;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group();
    seg.position.x = i === 0 ? 0 : -0.17;
    seg.position.y = 0.015;
    tailParent.add(seg);
    const bit = new THREE.Mesh(new THREE.CapsuleGeometry(0.055 - i * 0.004, 0.12, 3, 6), fur);
    bit.rotation.z = Math.PI / 2;
    bit.position.x = -0.075;
    seg.add(bit);
    const tipMat = i === 4 ? furDark : fur;
    bit.material = tipMat;
    tailSegments.push(seg);
    tailParent = seg;
  }
  const tailGlow = glowSprite(0x9fff4e, 0.16, 0.36);
  tailGlow.position.set(-0.2, 0, 0); tailSegments[4].add(tailGlow);

  // Headset and tiny visual receiver.
  const earpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 8), armorMat);
  earpiece.rotation.z = Math.PI / 2; earpiece.position.set(-0.04, 0.12, 0.3); head.add(earpiece);
  const earpieceLight = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), cyanMat);
  earpieceLight.position.set(-0.09, 0.12, 0.34); head.add(earpieceLight);

  const st = {
    t: 0, nextBlink: 2.4, blinkAt: -10, nextBark: 6.5, barkAt: -10,
    look: 0, targetLook: 0, excited: 0, alive: true
  };
  root.userData = { dog: st, head, jaw, tongue, eyes, ears, legs, tailSegments, body, antennaTip, tailGlow, nose };
  root.userData.update = (dt, t, opts2 = {}) => {
    st.t = t;
    const excited = opts2.excited || st.excited;
    const sniff = clamp(opts2.sniff || 0, 0, 1);
    const alert = opts2.alert != null ? opts2.alert : (excited > 0.25 ? 1 : 0);
    const gait = opts2.gait ? 1 : 0;
    const breathe = Math.sin(t * 2.05 + 0.4) * 0.012;
    body.position.y = breathe + (gait ? Math.abs(Math.sin(t * 9.5)) * 0.032 : 0);
    torso.scale.y = 1 + Math.sin(t * 2.05) * 0.018;
    chest.scale.y = 1.18 + Math.sin(t * 2.05 + .5) * 0.016;
    st.look = lerp(st.look, st.targetLook, 1 - Math.exp(-dt * 4));
    head.rotation.y = Math.sin(t * .7 + .3) * .10 + st.look * .42 + (alert ? Math.sin(t * 12) * .035 : 0) + (sniff ? Math.sin(t * 9) * .05 : 0);
    head.rotation.z = Math.sin(t * 1.2 + .5) * .035 - alert * .05;
    head.rotation.x = Math.sin(t * .8 + .2) * .025 + sniff * .34 + (gait ? Math.sin(t * 18) * .012 : 0);
    head.position.y = .1 - sniff * .055;
    neck.rotation.z = Math.sin(t * 1.7 + .4) * .018 + (opts2.neckUp || 0);
    neck.rotation.x = sniff * .12;
    ears[0].rotation.x = .08 + Math.sin(t * 2.1 + 1.2) * .08 + (alert ? .28 : 0);
    ears[1].rotation.x = .08 + Math.sin(t * 1.9 + 2.4) * .08 + (alert ? .28 : 0);
    ears[0].rotation.z = .15 + Math.sin(t * 2.3) * .05;
    ears[1].rotation.z = -.15 + Math.sin(t * 2.1 + 1) * .05;
    tailSegments.forEach((s, i) => {
      const amp = .12 + i * .045 + (excited > .5 ? .16 : 0) + (gait ? .06 : 0);
      s.rotation.y = Math.sin(t * (6.2 + excited * 4 + gait * 1.2) - i * .55) * amp;
      s.rotation.z = Math.sin(t * 2.4 - i * .3) * .035 + .02;
    });
    tailBase.rotation.z = .36 + Math.sin(t * 2.0) * .06 + (excited > .4 ? .08 : 0);
    // Paws: relaxed weight shift, walking gait, occasional impatient tapping.
    legs.forEach((leg, i) => {
      const front = i < 2;
      const tap = Math.max(0, Math.sin(t * 6.3 + i * 2.1) - 0.78) * (front ? 0.28 : 0.1);
      const gaitSwing = gait ? Math.sin(t * 9.5 + ((i === 0 || i === 3) ? 0 : Math.PI)) * .38 : 0;
      leg.rotation.z = (front ? 0.04 : -0.04) + Math.sin(t * 2 + i) * 0.018 + (excited > .4 ? Math.sin(t * 11 + i * 1.4) * 0.09 : 0) - tap;
      leg.rotation.x = Math.sin(t * 2.1 + i * 1.6) * 0.022 + gaitSwing;
      leg.position.y = 0.6 + (gait ? Math.max(0, Math.sin(t * 9.5 + ((i === 1 || i === 2) ? 0 : Math.PI))) * .045 : 0);
    });
    // Blink.
    if (t > st.nextBlink) {
      st.blinkAt = t;
      st.nextBlink = t + rand(2.8, 6.8);
    }
    const b = t - st.blinkAt;
    const blink = b > 0 && b < .18 ? Math.max(.08, Math.abs(Math.cos((b / .18) * Math.PI))) : 1;
    eyes.forEach(e => { e.scale.y = blink; e.rotation.x = 0; });
    // Bark head-twitch and mouth. Only menu calls audio for distance-friendly barks.
    if (t > st.nextBark) {
      st.barkAt = t; st.nextBark = t + rand(6.5, 12);
      if (opts2.audioBark) audio.bark();
    }
    const bk = t - st.barkAt;
    if (bk > 0 && bk < .55) {
      const open = Math.sin(Math.min(1, bk / .2) * Math.PI) * .28;
      jaw.rotation.z = -open;
      jaw.position.y = -.18 - open * .07;
      tongue.visible = true;
      tongue.position.y = -.12 - open * .08;
      head.rotation.z += Math.sin(bk * 42) * .035;
      if (bk < .1) st.excited = Math.max(st.excited, .5);
    } else {
      jaw.rotation.z = lerp(jaw.rotation.z, 0, 1 - Math.exp(-dt * 8));
      jaw.position.y = lerp(jaw.position.y, -.18, 1 - Math.exp(-dt * 8));
      tongue.visible = false;
    }
    st.excited = Math.max(0, st.excited - dt * .55);
    antennaTip.scale.setScalar(1 + Math.sin(t * 5.2) * .18);
    nose.scale.set(1.12 + sniff * Math.sin(t * 16) * .05, .76, 1);
    nose.position.x = .63 + sniff * Math.sin(t * 16) * .008;
    tailGlow.material.opacity = .22 + Math.sin(t * 5) * .12;
    root.position.y = opts2.baseY != null ? opts2.baseY + breathe : root.position.y;
  };
  return root;
}

function createZombie(opts = {}) {
  const scale = opts.scale || 1;
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin || 0x69745b, roughness: .9, metalness: .01, emissive: 0x0c0e08, emissiveIntensity: .32 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x252720, roughness: .95, metalness: .02, emissive: 0x030302, emissiveIntensity: .2 });
  const cloth = new THREE.MeshStandardMaterial({ color: opts.cloth || 0x39352e, roughness: .92, metalness: .02 });
  const bone = new THREE.MeshStandardMaterial({ color: 0x9b9c82, roughness: .8, metalness: .02 });
  const eye = new THREE.MeshBasicMaterial({ color: opts.eyes || 0xff3b2e });
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.54, 4, 8), coat);
  torso.position.y = 0.85; body.add(torso);
  const rib = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), skin);
  rib.scale.set(1.02,.9,.7); rib.position.set(.03,.82,.16); body.add(rib);
  const head = new THREE.Group(); head.position.set(.02, 1.28, 0); body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), skin);
  skull.scale.set(.93,1.05,.84); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.2,.08,.16), skin);
  jaw.position.set(.05,.04,-.14); jaw.rotation.z = .08; head.add(jaw);
  for (const s of [-1,1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.037,8,6), eye);
    e.position.set(.13,.045,s*.085); head.add(e);
    const glow = glowSprite(opts.eyes || 0xff3b2e, .2, .55); glow.position.copy(e.position); head.add(glow);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.1,.024,.06), bone);
    brow.position.set(.13,.115,s*.08); brow.rotation.z = s*.17; head.add(brow);
  }
  const arms = [];
  for (const s of [-1,1]) {
    const arm = new THREE.Group(); arm.position.set(0, 1.05, s*.24); body.add(arm);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(.065,.34,4,7), coat);
    upper.position.y=-.18; upper.rotation.z=s*.13; arm.add(upper);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(.058,.3,4,7), skin);
    fore.position.set(.04,-.5,0); fore.rotation.z = .22; arm.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.075,8,6), skin);
    hand.scale.set(1.1,.62,.85); hand.position.set(.09,-.7,0); arm.add(hand);
    arms.push(arm);
  }
  const legs = [];
  for (const s of [-1,1]) {
    const leg = new THREE.Group(); leg.position.set(0, .58, s*.13); body.add(leg);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.075,.32,4,7), cloth);
    thigh.position.y=-.2; leg.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(.055,.26,4,7), skin); shin.position.set(.02,-.48,0); leg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.14,.06,.2), bone); foot.position.set(.08,-.63,0); leg.add(foot);
    legs.push(leg);
  }
  const tear = new THREE.Mesh(new THREE.ConeGeometry(.08,.25,4), coat);
  tear.position.set(.02,.66,.2); tear.rotation.x=.16; body.add(tear);
  root.userData = { body, head, jaw, arms, legs, phase: rand(0, TAU), speed: .6 + Math.random() * .5 };
  return root;
}

function createGuard(opts = {}) {
  const root = new THREE.Group();
  root.scale.setScalar(opts.scale || 1);
  const armor = new THREE.MeshStandardMaterial({ color: 0x1d2728, roughness: .42, metalness: .52, emissive: 0x030607, emissiveIntensity: .25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x090d0e, roughness: .7, metalness: .2 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x51dfff, emissive: 0x28c9ff, emissiveIntensity: 1.2, roughness: .25 });
  const rifleMat = new THREE.MeshStandardMaterial({ color: 0x111615, roughness: .35, metalness: .7 });
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.23,.5,5,8), armor); torso.position.y=.88; body.add(torso);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.3), dark); vest.position.y=.92; body.add(vest);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.38,.11,.25), new THREE.MeshStandardMaterial({color:0x3a3020,roughness:.9})); belt.position.y=.64; body.add(belt);
  const head = new THREE.Group(); head.position.y=1.35; body.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.22,12,9), armor); helmet.scale.set(1,1.08,1.02); head.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.28,.09,.04), cyan); visor.position.set(.07,.0,.18); head.add(visor);
  const visorGlow = glowSprite(0x54e5ff,.36,.45); visorGlow.position.set(.1,.02,.25); head.add(visorGlow);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.16,8,6), armor); shoulder.scale.set(1,.7,.9); shoulder.position.set(0,1.05,.24); body.add(shoulder);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.07,.32,4,6), dark); arm.position.set(.16,.84,.26); arm.rotation.z=-.75; body.add(arm);
  const arm2 = new THREE.Mesh(new THREE.CapsuleGeometry(.07,.32,4,6), dark); arm2.position.set(.17,.84,-.21); arm2.rotation.z=-.55; body.add(arm2);
  const rifle = new THREE.Group(); rifle.position.set(.38,.76,.08); rifle.rotation.z=-.08; body.add(rifle);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.72,8), rifleMat); barrel.rotation.z=Math.PI/2; rifle.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(.22,.08,.12), dark); stock.position.x=-.29; rifle.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(.08,.18,.1), dark); mag.position.set(.05,-.09,0); mag.rotation.z=.15; rifle.add(mag);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.13,8), cyan); torch.rotation.z=Math.PI/2; torch.position.set(.2,.04,.08); rifle.add(torch);
  const legs = [];
  for (const s of [-1,1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.08,.45,4,7), dark); leg.position.set(0,.3,s*.12); leg.rotation.z=s*.02; body.add(leg);
    legs.push(leg);
  }
  root.userData = { head, visorGlow, body, legs };
  return root;
}

/* ───────────────────────────── MENU SCENE ───────────────────────────── */
let menuScene, menuCamera, menuDog, menuActors = [], menuSmoke = [], menuAsh, menuBeacon, menuSpotlights = [];
let menuFlash = 0;
const menuDogPose = { x: 0.04, rot: -0.52 };

function makeSmokeTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 38; i++) {
      const x = rand(40, w - 40), y = rand(40, h - 40), r = rand(18, 68);
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(190,205,190,${rand(.025,.09)})`);
      g.addColorStop(.55, `rgba(130,145,130,${rand(.018,.05)})`);
      g.addColorStop(1, 'rgba(80,95,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  });
}
TEX.smoke = makeSmokeTexture();

function makeMenuFloorTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#0b110f'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = rand(30, 90);
      ctx.fillStyle = `rgba(${v},${v + 16},${v + 4},${rand(.03,.14)})`;
      ctx.fillRect(rand(0,w), rand(0,h), rand(1,3), rand(1,2));
    }
    ctx.strokeStyle = 'rgba(110,140,108,.13)'; ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 128) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
    for (let i = 0; i < 30; i++) { const y = rand(0,h); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y + rand(-50,50)); ctx.stroke(); }
    // Oil stains and reflected warning colours.
    for (let i = 0; i < 17; i++) {
      const x=rand(0,w), y=rand(0,h), r=rand(22,120);
      const g=ctx.createRadialGradient(x,y,2,x,y,r);
      g.addColorStop(0,'rgba(0,0,0,.38)'); g.addColorStop(.6,'rgba(20,25,18,.16)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,r*rand(.4,1),r*rand(.2,.55),rand(0,TAU),0,TAU); ctx.fill();
    }
    ctx.save(); ctx.translate(w/2,h*0.66); ctx.rotate(-.28); ctx.font='900 92px Impact, Arial Black'; ctx.fillStyle='rgba(150,180,142,.045)'; ctx.fillText('KEEP  OUT',-390,0); ctx.restore();
    ctx.save(); ctx.translate(w*.16,h*.18); ctx.font='900 44px Arial'; ctx.fillStyle='rgba(160,190,150,.07)'; ctx.fillText('BANDOS7 // BUNKER 07', 0, 0); ctx.restore();
  });
}

function makePlatformTopTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#101612'; ctx.fillRect(0, 0, w, h);
    const cx=w/2, cy=h/2;
    const g=ctx.createRadialGradient(cx,cy,30,cx,cy,230);
    g.addColorStop(0,'#26302a'); g.addColorStop(.65,'#141a16'); g.addColorStop(1,'#080b09');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,245,0,TAU); ctx.fill();
    ctx.save(); ctx.translate(cx,cy);
    for (let r=190;r<238;r+=18) {
      for (let a=0;a<TAU;a+=.22) {
        ctx.beginPath(); ctx.arc(0,0,r,a,a+.11); ctx.arc(0,0,r+9,a+.11,a,true); ctx.closePath();
        ctx.fillStyle = (Math.floor(a*3)%2) ? 'rgba(175,200,40,.35)' : 'rgba(20,26,11,.6)'; ctx.fill();
      }
    }
    ctx.strokeStyle='rgba(160,255,50,.34)'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,177,0,TAU); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,120,0,TAU); ctx.stroke();
    ctx.rotate(-.12);
    ctx.font='900 112px Impact, Arial Black'; ctx.fillStyle='rgba(225,235,208,.42)'; ctx.textAlign='center'; ctx.fillText('K9',0,28);
    ctx.font='700 22px Arial'; ctx.fillStyle='rgba(166,255,50,.35)'; ctx.fillText('DACHSHUND DIVISION',0,74);
    ctx.restore();
    for (let i=0;i<32;i++) { ctx.fillStyle=`rgba(0,0,0,${rand(.02,.12)})`; ctx.beginPath(); ctx.arc(rand(0,w),rand(0,h),rand(2,20),0,TAU); ctx.fill(); }
  });
}

function makeBunkerWallTexture() {
  return canvasTexture(1024, 512, (ctx,w,h) => {
    ctx.fillStyle='#0b1110'; ctx.fillRect(0,0,w,h);
    for (let x=0;x<w;x+=128) {
      for (let y=0;y<h;y+=128) {
        ctx.fillStyle = (x+y)%256===0 ? '#0e1513' : '#0c1210'; ctx.fillRect(x+3,y+3,122,122);
        ctx.strokeStyle='rgba(120,145,120,.08)'; ctx.strokeRect(x+3,y+3,122,122);
      }
    }
    for (let i=0;i<5000;i++) { const v=rand(60,150); ctx.fillStyle=`rgba(${v},${v+12},${v},${rand(.015,.08)})`; ctx.fillRect(rand(0,w),rand(0,h),rand(1,3),rand(1,2)); }
    ctx.save(); ctx.globalAlpha=.22; ctx.font='900 190px Impact, Arial Black'; ctx.fillStyle='#354b37'; ctx.fillText('K9',760,190); ctx.font='900 31px Arial'; ctx.fillStyle='#7dff38'; ctx.fillText('RESTRICTED AREA', 730, 240); ctx.restore();
    ctx.fillStyle='rgba(255,179,43,.20)'; ctx.fillRect(0,h-48,w,5); ctx.fillRect(0,h-27,w,5);
    ctx.fillStyle='rgba(190,20,32,.22)'; ctx.fillRect(0,22,w,3);
    ctx.save(); ctx.translate(440,340); ctx.rotate(-.16); ctx.font='900 44px Arial'; ctx.fillStyle='rgba(110,135,110,.14)'; ctx.fillText('NO EXIT // BLEIBEN SIE RUHIG',0,0); ctx.restore();
  });
}

function makeBeamCone(radius, height, color, opacity) {
  const geo = new THREE.ConeGeometry(radius, height, 20, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = height / 2;
  return m;
}

function buildMenuScene() {
  menuScene = new THREE.Scene();
  menuScene.background = new THREE.Color(0x030607);
  menuScene.environment = TEX.env;
  menuScene.fog = new THREE.FogExp2(0x050807, 0.028);
  menuCamera = new THREE.PerspectiveCamera(47, 0.46, 0.1, 80);
  menuCamera.position.set(0, 2.3, 8.1);
  menuCamera.lookAt(0, 1.0, 0);

  const hemi = new THREE.HemisphereLight(0x3e5b3e, 0x030403, 0.95);
  menuScene.add(hemi);
  const key = new THREE.DirectionalLight(0xd9ffd6, 2.25);
  key.position.set(-3, 8, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 6; key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.001;
  menuScene.add(key);
  const rim = new THREE.PointLight(0x8fff32, 8, 9, 1.8);
  rim.position.set(3.2, 2.4, 1.8); menuScene.add(rim);
  const red = new THREE.PointLight(0xff2f3d, 11, 12, 1.8);
  red.position.set(-4.6, 3.2, -4.4); menuScene.add(red);
  const cool = new THREE.PointLight(0x48dfff, 6, 9, 1.8);
  cool.position.set(4, 2, -3); menuScene.add(cool);

  const floorTex = makeMenuFloorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 32), new THREE.MeshStandardMaterial({ map: floorTex, color: 0x95a897, roughness: .34, metalness: .65 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true;
  menuScene.add(floor);

  // Reflective puddle patches.
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.5, 4.5), rand(.6, 2.2)), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x32533a : 0x43302b, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; p.position.set(rand(-6, 6), .008, rand(-4, 5)); menuScene.add(p);
  }

  const wallTex = makeBunkerWallTexture();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(28, 12), new THREE.MeshStandardMaterial({ map: wallTex, color: 0x9fb19d, roughness: .86, metalness: .1 }));
  wall.position.set(0, 4.8, -8.7); menuScene.add(wall);
  for (let x = -12; x <= 12; x += 3) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(.18, 11, .32), new THREE.MeshStandardMaterial({ color: 0x111916, roughness: .55, metalness: .55 }));
    rib.position.set(x, 4.5, -8.4); menuScene.add(rib);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.3, .35), new THREE.MeshStandardMaterial({ color: 0x16201b, roughness: .5, metalness: .46 }));
  door.position.set(1.5, 2.2, -8.3); menuScene.add(door);
  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.24, 4.1, .4), new THREE.MeshStandardMaterial({ color: 0x0d1411, roughness: .4, metalness: .6 }));
    bar.position.set(.25 + i * .48, 2.2, -8.05); menuScene.add(bar);
  }
  const doorLamp = glowSprite(0xff2c3c, 2.2, .7); doorLamp.position.set(1.5, 4.7, -7.8); menuScene.add(doorLamp);

  // Hazard-barred side corridors.
  for (const s of [-1, 1]) {
    const barrier = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, .24, .4), new THREE.MeshStandardMaterial({ color: 0x252a21, roughness: .6, metalness: .35 }));
    barrier.add(base);
    for (let i = 0; i < 3; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.9, .07, .42), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd6ad25 : 0x141813, roughness: .6, metalness: .2 }));
      strip.position.y = .18 + i * .25; barrier.add(strip);
    }
    barrier.position.set(s * 5.1, .45, -3.8); barrier.rotation.y = s * .18; menuScene.add(barrier);
  }

  // Raised K9 platform.
  const platformTop = makePlatformTopTexture();
  const platformSide = new THREE.MeshStandardMaterial({ color: 0x1a2019, roughness: .5, metalness: .55 });
  const platformMat = [platformSide, new THREE.MeshStandardMaterial({ map: platformTop, color: 0x9bb39f, roughness: .38, metalness: .52 }), platformSide];
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.24, 2.44, .26, 48), platformMat);
  platform.position.set(0, .13, .1); platform.receiveShadow = true; platform.castShadow = true; menuScene.add(platform);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.17, .045, 7, 64), new THREE.MeshBasicMaterial({ color: 0x96ff3c }));
  ring.rotation.x = Math.PI / 2; ring.position.set(0, .28, .1); menuScene.add(ring);
  const platformGlow = glowSprite(0x8dff32, 4.8, .12); platformGlow.position.set(0, .25, .1); menuScene.add(platformGlow);
  for (let i = 0; i < 8; i++) {
    const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.08,.22), 0), new THREE.MeshStandardMaterial({ color: 0x1f2620, roughness: .9, metalness: .1 }));
    const a = rand(0, TAU), r = rand(2.6, 4.6);
    debris.position.set(Math.cos(a) * r, rand(.03,.1), Math.sin(a) * r - .2);
    debris.rotation.set(rand(0,3), rand(0,3), rand(0,3)); menuScene.add(debris);
  }

  // The hero.
  menuDog = createDachshund({ scale: .94 });
  menuDog.position.set(.04, .3, .18);
  menuDog.rotation.y = -.58;
  menuDog.castShadow = true;
  menuScene.add(menuDog);
  menuDog.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // Squad in the fog. Real 3D silhouettes, not a drawn backdrop.
  const zombieSpecs = [
    [-4.4, -4.3, .95, -0.3], [-3.0, -5.2, 1.1, 0.2], [3.4, -4.5, .9, 0.25],
    [4.6, -5.5, 1.08, -0.4], [-1.1, -6.1, .8, 0.12], [1.7, -5.9, 1.0, -0.2]
  ];
  zombieSpecs.forEach(([x, z, sc, rot], i) => {
    const zed = createZombie({ scale: sc, skin: i % 2 ? 0x5f6d55 : 0x74805e, cloth: i % 2 ? 0x30322b : 0x25271f });
    zed.position.set(x, .05, z); zed.rotation.y = rot;
    menuScene.add(zed);
    zed.userData.baseX = x; zed.userData.baseZ = z; zed.userData.walkSpeed = .35 + i * .07; zed.userData.walkDir = i % 2 ? 1 : -1;
    menuActors.push(zed);
  });
  const g1 = createGuard({ scale: 1.12 }); g1.position.set(-5.5, .05, -1.2); g1.rotation.y = 1.5; menuScene.add(g1);
  const g2 = createGuard({ scale: 1.0 }); g2.position.set(5.3, .05, -1.7); g2.rotation.y = -1.6; menuScene.add(g2);
  menuActors.push(g1, g2);
  // Security drone crosses the upper dark.
  const drone = createDrone(0.72);
  drone.position.set(3.9, 3.25, -1.5); drone.rotation.y = .3; menuScene.add(drone);
  menuActors.push(drone);

  // Volumetric light shafts.
  for (let i = 0; i < 3; i++) {
    const c = makeBeamCone(1.9, 8, i === 1 ? 0x4cff5a : 0xd7ffab, .022 + i * .003);
    c.position.set(-3.2 + i * 3.3, 8, -3.2 - i * 1.2); c.rotation.z = i === 1 ? .1 : -.12; c.rotation.x = .1;
    menuScene.add(c); menuSpotlights.push(c);
    const source = glowSprite(i === 1 ? 0x8fff3c : 0xffffff, .65, .7); source.position.set(c.position.x, 8, c.position.z); menuScene.add(source);
  }

  // Drifting toxic smoke.
  for (let i = 0; i < 9; i++) {
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.smoke, color: i % 3 === 0 ? 0x4b5d48 : 0x778477, transparent: true, opacity: rand(.08, .2), depthWrite: false }));
    sm.scale.set(rand(3, 8), rand(2, 4.5), 1);
    sm.position.set(rand(-7, 7), rand(.5, 4.5), rand(-6.5, 3));
    sm.userData = { baseX: sm.position.x, baseY: sm.position.y, phase: rand(0, TAU), speed: rand(.05,.13) };
    menuScene.add(sm); menuSmoke.push(sm);
  }

  // Ash.
  const ashCount = 260;
  const ashPos = new Float32Array(ashCount * 3);
  for (let i = 0; i < ashCount; i++) {
    ashPos[i*3] = rand(-6.5, 6.5); ashPos[i*3+1] = rand(0, 8); ashPos[i*3+2] = rand(-9, 5);
  }
  const ashGeo = new THREE.BufferGeometry(); ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
  menuAsh = new THREE.Points(ashGeo, new THREE.PointsMaterial({ map: TEX.spark, color: 0xc8bb94, size: .055, transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  menuScene.add(menuAsh);

  // Emergency beacon.
  menuBeacon = new THREE.Group();
  const beaconBody = new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.38,12), new THREE.MeshStandardMaterial({ color: 0x2d1717, metalness: .4, roughness: .4 }));
  const beaconLamp = new THREE.Mesh(new THREE.SphereGeometry(.16,12,8), new THREE.MeshBasicMaterial({ color: 0xff1f2d }));
  beaconLamp.position.y = .25; menuBeacon.add(beaconBody, beaconLamp);
  const beaconGlow = glowSprite(0xff2836, 1.9, .8); beaconGlow.position.y = .25; menuBeacon.add(beaconGlow);
  menuBeacon.position.set(-5.4, 5.4, -7.5); menuScene.add(menuBeacon);

  // A couple of hanging wires to break up the architecture.
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6 + i * 4.5, 7.2, -2.5),
      new THREE.Vector3(-5 + i * 4.5, 5.7, -2.6),
      new THREE.Vector3(-4.7 + i * 4.5, 4.2, -2.3)
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .016, 4, false), new THREE.MeshBasicMaterial({ color: 0x1b211c }));
    menuScene.add(tube);
  }

  menuDog.traverse(o => { if (o.isMesh) o.castShadow = true; });
  menuActors.forEach(a => a.traverse?.(o => { if (o.isMesh) o.castShadow = true; }));
}

function updateMenuScene(dt, t) {
  const sway = Math.sin(t * .17);
  menuCamera.position.x = Math.sin(t * .16) * .24;
  menuCamera.position.y = 2.28 + Math.sin(t * .23) * .055;
  menuCamera.position.z = 8.0 + Math.sin(t * .19) * .13;
  menuCamera.lookAt(0, 1.02 + Math.sin(t * .2) * .03, 0);
  // Hold a cinematic little push-in during the first seconds.
  const intro = Math.min(1, t / 6);
  menuCamera.fov = 47 - intro * 1.4;
  menuCamera.updateProjectionMatrix();
  // Dog choreography: guard stance, listening, sniffing, the occasional bark.
  const dogCycle = (t + 6) % 22;
  const dogSniffing = dogCycle > 13 && dogCycle < 16.5 ? 1 : 0;
  const dogAlert = (dogCycle > 6 && dogCycle < 9.2) || (dogCycle > 19 && dogCycle < 20.2) ? 1 : 0;
  menuDogPose.x = lerp(menuDogPose.x, 0.04, 1 - Math.exp(-dt * 2));
  menuDogPose.rot = lerpAngle(menuDogPose.rot, -0.52, 1 - Math.exp(-dt * 2.5));
  menuDog.position.x = menuDogPose.x + Math.sin(t * .6) * .025;
  menuDog.userData.targetLook = menuPointerX || (Math.sin(t * .23) * .12);
  menuDog.userData.update(dt, t, {
    baseY: .3,
    audioBark: !document.hidden && t > 8,
    gait: 0,
    sniff: dogSniffing,
    alert: dogAlert
  });
  menuDog.rotation.y = menuDogPose.rot + Math.sin(t * .35) * .045;
  menuActors.forEach((a, i) => {
    if (a.userData && a.userData.arms) {
      const z = a;
      const u = z.userData;
      const tt = t * u.walkSpeed + u.phase;
      z.position.x = u.baseX + Math.sin(tt) * .62;
      z.position.z = u.baseZ + Math.sin(tt * .37) * .16;
      z.rotation.y = (z.userData.walkDir || 1) * .14 + Math.sin(tt * .9) * .05;
      z.rotation.z = Math.sin(tt * 1.8) * .025;
      u.body.position.y = Math.abs(Math.sin(tt * 1.8)) * .025;
      u.head.rotation.z = Math.sin(tt * .9) * .09;
      u.arms[0].rotation.x = Math.sin(tt * 1.2) * .12;
      u.arms[1].rotation.x = -Math.sin(tt * 1.2) * .12;
      u.legs[0].rotation.x = Math.sin(tt * 2) * .12;
      u.legs[1].rotation.x = -Math.sin(tt * 2) * .12;
      u.jaw.rotation.z = .10 + Math.sin(tt * 3.2) * .1;
    } else if (a.userData && a.userData.visorGlow) {
      a.userData.visorGlow.material.opacity = .28 + Math.sin(t * 2.4 + i) * .12;
      a.userData.head.rotation.y = Math.sin(t * .33 + i * 3) * .16;
      a.userData.body.position.y = Math.sin(t * 1.7 + i) * .008;
    } else if (a.isGroup) {
      a.rotation.y += dt * .08;
      a.position.y = 3.25 + Math.sin(t * 1.3) * .08;
      a.traverse(c => { if (c.userData && c.userData.rotor) c.rotation.y += dt * 18; });
    }
  });
  menuSmoke.forEach((s, i) => {
    const u = s.userData;
    s.position.x = u.baseX + Math.sin(t * u.speed + u.phase) * .7;
    s.position.y = u.baseY + Math.sin(t * u.speed * 1.7 + u.phase) * .16;
    s.material.opacity = .055 + (Math.sin(t * u.speed * 2.1 + u.phase) * .5 + .5) * .12;
  });
  if (menuAsh) {
    const p = menuAsh.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      p[i+1] -= dt * (.18 + (i % 7) * .02);
      p[i] += Math.sin(t * .6 + i) * .0008;
      if (p[i+1] < 0) { p[i+1] = 8; p[i] = rand(-6.5, 6.5); p[i+2] = rand(-9, 5); }
    }
    menuAsh.geometry.attributes.position.needsUpdate = true;
  }
  menuSpotlights.forEach((c, i) => { c.material.opacity = .018 + (Math.sin(t * 1.1 + i * 2) * .5 + .5) * .014; });
  if (menuBeacon) {
    menuBeacon.children[2].material.opacity = .5 + Math.sin(t * 3.2) * .28;
    menuBeacon.rotation.y = t * .55;
  }
}

function createDrone(scale = 1) {
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2424, roughness: .35, metalness: .65, emissive: 0x040808, emissiveIntensity: .25 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x49dfff, emissive: 0x23c8ff, emissiveIntensity: 1.3, roughness: .3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.3,.36,.18,10), bodyMat); root.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), cyan); eye.position.set(.22,.03,.2); root.add(eye);
  const glow = glowSprite(0x51e1ff, .55, .55); glow.position.copy(eye.position); root.add(glow);
  for (let i=0;i<4;i++) {
    const arm = new THREE.Group(); arm.rotation.y = i * Math.PI/2 + Math.PI/4;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.48,5), bodyMat); rod.rotation.z=Math.PI/2; rod.position.x=.26; arm.add(rod);
    const rotor = new THREE.Group(); rotor.position.x=.5; rotor.userData = { rotor: true };
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.16,14), new THREE.MeshBasicMaterial({ color:0x6adfff, transparent:true, opacity:.16, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false }));
    disc.rotation.x = -Math.PI/2; rotor.add(disc); arm.add(rotor);
    root.add(arm);
  }
  return root;
}

/* ───────────────────────────── GAME WORLD ───────────────────────────── */
let gameScene, gameCamera, gameTarget, gameCameraBase, tableGroup, dynamicGroup, ballsLayer, effectsGroup;
let gameDog, gameDogGlow, gameFlippers = [], gameDrones = [], gameBeacons = [];
const GAME_DOG_YAW = Math.PI + 0.45; // three-quarter view toward the player: readable dachshund face
const GAME_DOG_HOME = { x: 0, y: .18, z: 6.86 };
let particles, ashGame;
let cameraShake = 0;
let sectorSign;
const GAME_CONST = { ballR: .225, launchX: 3.19, launchZ: 4.98, drainZ: 5.98, maxSpeed: 24 };
const walls = [];
const staticWallDefs = [
  [-3.72, -7.05, 3.72, -7.05, .58, 0],
  [-3.72, -7.05, -3.72, 5.15, .58, 0],
  [3.72, -7.05, 3.72, 6.0, .58, 0],
  [2.68, 5.6, 2.68, -4.2, .55, 0],
  [2.68, 5.6, 3.72, 5.6, .55, 0],
  [2.2, -6.0, 3.72, -5.2, .48, 0],
  [-3.62, 2.35, -2.52, 3.72, .72, 6.2],
  [1.48, 3.72, 2.58, 2.35, .72, 6.2],
  [-3.72, 3.95, -3.1, 4.38, .58, 0]
];

function makeEnvTexture() {
  const tex = canvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#020403'); g.addColorStop(.45, '#111b16'); g.addColorStop(.68, '#242b1b'); g.addColorStop(1, '#020302');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(140,255,52,.5)'; ctx.fillRect(70, 116, 90, 10);
    ctx.fillStyle = 'rgba(255,255,230,.42)'; ctx.fillRect(235, 94, 46, 6);
    ctx.fillStyle = 'rgba(255,50,70,.42)'; ctx.fillRect(360, 126, 69, 8);
    ctx.fillStyle = 'rgba(70,220,255,.32)'; ctx.fillRect(18, 142, 44, 6);
    ctx.fillStyle = 'rgba(5,8,6,.7)'; ctx.fillRect(0, 0, w, 54);
  });
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}
TEX.env = makeEnvTexture();

function makePlayfieldTexture() {
  return canvasTexture(900, 1600, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#26352b'); bg.addColorStop(.5, '#1c2a20'); bg.addColorStop(1, '#14231a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .2; ctx.strokeStyle = '#a8c4a2'; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // Small quiet containment stencil, kept out of the main play area.
    ctx.save(); ctx.translate(w*.5, h*.18); ctx.globalAlpha = .055; ctx.strokeStyle='#a4ff2c'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,0,72,0,TAU); ctx.stroke();
    for (let i=0;i<3;i++) { ctx.beginPath(); ctx.arc(0,0,56,i*TAU/3,i*TAU/3+.7); ctx.stroke(); }
    ctx.restore();
    // Warning chevrons at lower edge.
    ctx.save(); ctx.translate(0,h-260); for (let x=-80;x<w+80;x+=78){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+38,0); ctx.lineTo(x+76,56); ctx.lineTo(x+38,56); ctx.closePath(); ctx.fillStyle='rgba(190,150,24,.13)'; ctx.fill(); } ctx.restore();
    // Lane markings.
    ctx.strokeStyle='rgba(163,255,54,.20)'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(w*.18, h*.82); ctx.lineTo(w*.36, h*.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w*.82, h*.82); ctx.lineTo(w*.64, h*.2); ctx.stroke();
    ctx.strokeStyle='rgba(255,60,80,.12)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(w*.23, h*.23); ctx.lineTo(w*.36, h*.46); ctx.lineTo(w*.31, h*.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w*.77, h*.23); ctx.lineTo(w*.64, h*.46); ctx.lineTo(w*.69, h*.62); ctx.stroke();
    // Stencils.
    ctx.save(); ctx.translate(60, 112); ctx.rotate(-Math.PI/2); ctx.font='900 38px Arial'; ctx.fillStyle='rgba(213,231,204,.13)'; ctx.fillText('K9 CONTAINMENT GRID // BANDOS7', 0, 0); ctx.restore();
    ctx.font='900 76px Impact, Arial Black'; ctx.fillStyle='rgba(215,235,204,.075)';
    ctx.textAlign='center'; ctx.fillText('WUMMI', w*.52, h*.845);
    ctx.font='700 22px Arial'; ctx.fillStyle='rgba(166,255,50,.13)';
    ctx.fillText('DACHSHUND DIVISION // AREA 07', w*.52, h*.875);
    // Scratches & contamination.
    for (let i = 0; i < 55; i++) {
      ctx.strokeStyle = `rgba(${rand(100,190)},${rand(120,200)},${rand(95,150)},${rand(.02,.12)})`;
      ctx.lineWidth = rand(.5,2.2); ctx.beginPath(); const x=rand(0,w), y=rand(0,h); ctx.moveTo(x,y); ctx.lineTo(x+rand(-80,80), y+rand(-80,80)); ctx.stroke();
    }
    for (let i = 0; i < 13; i++) {
      const x=rand(40,w-40), y=rand(60,h-60), r=rand(10,55);
      const g=ctx.createRadialGradient(x,y,1,x,y,r); g.addColorStop(0,'rgba(27,52,25,.20)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
    }
    ctx.font='900 28px Arial'; ctx.fillStyle='rgba(255,60,80,.2)'; ctx.fillText('ACHTUNG // KONTAMINIERT', 95, h*.19);
    ctx.strokeStyle='rgba(255,179,43,.18)'; ctx.lineWidth=8; ctx.strokeRect(20,20,w-40,h-40);
  });
}

function addRailVisual(ax, az, bx, bz, opts = {}) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), angle = -Math.atan2(dz, dx);
  const group = new THREE.Group();
  const h = opts.height || .3;
  const mat = new THREE.MeshStandardMaterial({ color: opts.color || 0x252d27, roughness: .4, metalness: .65, emissive: 0x070b07, emissiveIntensity: .2 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len + .08, h, opts.width || .18), mat);
  rail.position.y = h / 2 + .04; rail.castShadow = true; rail.receiveShadow = true; group.add(rail);
  if (opts.strip !== false) {
    const stripColor = opts.stripColor || 0x8fff37;
    const stripMat = new THREE.MeshStandardMaterial({ color: stripColor, emissive: stripColor, emissiveIntensity: 1.3, roughness: .3 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len + .02, .035, .07), stripMat);
    strip.position.set(0, h + .055, opts.width ? .08 : 0); group.add(strip);
    if (opts.glow !== false) {
      const g = glowSprite(stripColor, Math.min(2.5, len * .5), .12); g.position.set(0, h + .06, 0); group.add(g);
    }
  }
  group.position.set((ax + bx) / 2, 0, (az + bz) / 2);
  group.rotation.y = angle;
  return group;
}

function buildGameScene() {
  gameScene = new THREE.Scene();
  gameScene.background = new THREE.Color(0x030607);
  gameScene.fog = new THREE.FogExp2(0x040807, 0.017);
  gameScene.environment = TEX.env;
  gameCamera = new THREE.PerspectiveCamera(41, 0.64, 0.1, 70);
  gameTarget = new THREE.Vector3(0, .15, .25);
  gameCameraBase = new THREE.Vector3(0, 18, 10);
  gameCamera.position.copy(gameCameraBase); gameCamera.lookAt(gameTarget);

  const hemi = new THREE.HemisphereLight(0x496b51, 0x020303, 2.15); gameScene.add(hemi);
  const key = new THREE.DirectionalLight(0xe0ffc9, 3.05);
  key.position.set(-6, 15, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
  key.shadow.bias = -.0005; gameScene.add(key);
  const under = new THREE.PointLight(0x6eff34, 18, 18, 1.7); under.position.set(-4.4, 2.4, 2.3); gameScene.add(under);
  const red = new THREE.PointLight(0xff2538, 12, 14, 1.8); red.position.set(4.3, 1.8, -4.3); gameScene.add(red);
  const cyan = new THREE.PointLight(0x2acbff, 8, 12, 1.8); cyan.position.set(4.4, 2.2, 4); gameScene.add(cyan);
  stageLight = new THREE.PointLight(0x9dff32, 6.5, 12, 1.8); stageLight.position.set(0, 3.2, .8); gameScene.add(stageLight);
  const fill = new THREE.PointLight(0xc9f0c7, 14, 24, 1.4); fill.position.set(0, 7.5, -1.2); gameScene.add(fill);
  const dogLight = new THREE.PointLight(0xffd7a0, 12, 4.8, 1.35); dogLight.position.set(0, 1.7, 7.05); gameScene.add(dogLight);

  // Bunker floor around the table.
  const floorTex = makeMenuFloorTexture(); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2.4,2.4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 34), new THREE.MeshStandardMaterial({ map: floorTex, color: 0x6d7c70, roughness: .4, metalness: .55 }));
  floor.rotation.x = -Math.PI/2; floor.position.y = -1.08; floor.receiveShadow = true; gameScene.add(floor);
  // Faint circular service markings.
  const ringFloor = new THREE.Mesh(new THREE.RingGeometry(8.2, 8.35, 64), new THREE.MeshBasicMaterial({ color: 0x5b7d51, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }));
  ringFloor.rotation.x = -Math.PI/2; ringFloor.position.y = -1.06; gameScene.add(ringFloor);

  tableGroup = new THREE.Group(); gameScene.add(tableGroup);
  const lowerMat = new THREE.MeshStandardMaterial({ color: 0x111713, roughness: .38, metalness: .72 });
  const lower = new THREE.Mesh(new THREE.BoxGeometry(8.2, .58, 15.7), lowerMat);
  lower.position.set(0, -.34, -.45); lower.castShadow = true; lower.receiveShadow = true; tableGroup.add(lower);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(8.05, .28, 1.25), new THREE.MeshStandardMaterial({ color: 0x1c241d, roughness: .46, metalness: .5 }));
  apron.position.set(0, -.03, 6.5); tableGroup.add(apron);
  const pfTex = makePlayfieldTexture();
  const playfield = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 13.1), new THREE.MeshStandardMaterial({ map: pfTex, color: 0xb9c9b3, roughness: .46, metalness: .4, emissive: 0x2c3b2c, emissiveMap: pfTex, emissiveIntensity: .3 }));
  playfield.rotation.x = -Math.PI/2; playfield.position.set(0, .005, -.5); playfield.receiveShadow = true; tableGroup.add(playfield);
  // Glossy protective layer sheen.
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(7.18, 13.08), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .035, roughness: .16, metalness: .1, depthWrite: false }));
  sheen.rotation.x = -Math.PI/2; sheen.position.set(0, .02, -.5); tableGroup.add(sheen);

  // Physical-looking rails, matched to the collision segments.
  for (const wdef of staticWallDefs) {
    walls.push({ ax: wdef[0], az: wdef[1], bx: wdef[2], bz: wdef[3], rest: wdef[4], kick: wdef[5] });
    const wallGroup = addRailVisual(wdef[0], wdef[1], wdef[2], wdef[3], { color: wdef[5] ? 0x342b16 : 0x252e27, width: .16, stripColor: wdef[5] ? 0xffa62a : 0x8bff35 });
    tableGroup.add(wallGroup);
  }
  // Lower apron return rails.
  tableGroup.add(addRailVisual(-3.72, 5.15, -1.55, 5.98, { color: 0x242b24, stripColor: 0x869a1e, height: .23, glow: false }));
  tableGroup.add(addRailVisual(1.53, 5.98, 2.68, 5.6, { color: 0x242b24, stripColor: 0x869a1e, height: .23, glow: false }));
  // Slingshot faces.
  for (const s of [-1, 1]) {
    const wx = s < 0 ? -3.07 : 2.05;
    const fx = s < 0 ? -3.0 : 1.98;
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.55, .2, .26), new THREE.MeshStandardMaterial({ color: 0x5f4a15, roughness: .6, metalness: .28, emissive: 0x3e2a04, emissiveIntensity: .3 }));
    wedge.position.set(wx, .23, 3.06); wedge.rotation.y = s * -.56; tableGroup.add(wedge);
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.4, .04, .08), new THREE.MeshBasicMaterial({ color: 0xffb42b }));
    face.position.set(fx, .34, 3.08); face.rotation.y = s * -.56; tableGroup.add(face);
  }

  // Launch lane neon.
  const laneGlow = new THREE.Mesh(new THREE.BoxGeometry(.06, .025, 11.2), new THREE.MeshBasicMaterial({ color: 0x64dfff }));
  laneGlow.position.set(2.74, .05, -.1); tableGroup.add(laneGlow);

  // Faint shot-direction chevrons printed into the playfield.
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xa6ff32, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide });
  for (const [ax, az, rot, sc] of [[-1.25, 1.3, .16, 1], [1.25, 1.3, -.16, 1], [-1.25, .35, .16, .78], [1.25, .35, -.16, .78]]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.19, .48, 3), arrowMat);
    arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = rot;
    arrow.position.set(ax, .035, az); arrow.scale.setScalar(sc);
    tableGroup.add(arrow);
  }
  // Emergency beacons on the back corners.
  for (const s of [-1, 1]) {
    const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .18, 10), new THREE.MeshStandardMaterial({ color: 0x221414, roughness: .5, metalness: .55 }));
    beaconBase.position.set(s * 3.62, .4, -7.02); tableGroup.add(beaconBase);
    const beaconLamp = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2c38 }));
    beaconLamp.position.set(s * 3.62, .56, -7.02); beaconLamp.userData.beacon = 1; tableGroup.add(beaconLamp);
    const beaconGlow = glowSprite(0xff2a36, 1.35, .55); beaconGlow.position.copy(beaconLamp.position); beaconGlow.userData.beaconGlow = 1; tableGroup.add(beaconGlow);
    gameBeacons.push({ lamp: beaconLamp, glow: beaconGlow, phase: s > 0 ? 0 : Math.PI });
  }

  // Side lamps.
  for (let i = 0; i < 9; i++) {
    const z = -6.4 + i * 1.42;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xff3b45 : 0x9aff32 }));
    lamp.position.set(-3.67, .38, z); tableGroup.add(lamp);
    const lamp2 = lamp.clone(); lamp2.position.x = 3.67; tableGroup.add(lamp2);
  }

  // Backboard with real signage.
  const backTex = canvasTexture(768, 300, (ctx,w,h) => {
    ctx.fillStyle='#070b09'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(166,255,50,.08)'; ctx.fillRect(0,0,w,4);
    ctx.font='900 74px Impact, Arial Black'; ctx.fillStyle='#dce3cc'; ctx.fillText('WUMMI', 38, 104);
    ctx.font='900 26px Arial'; ctx.fillStyle='#a6ff32'; ctx.fillText('ZOMBIE PINBALL PROTOCOL', 40, 143);
    ctx.font='700 17px Arial'; ctx.fillStyle='rgba(200,220,190,.5)'; ctx.fillText('K9 / CONTAINMENT UNIT 07', 40, 235);
    ctx.strokeStyle='rgba(255,179,43,.4)'; ctx.lineWidth=3; ctx.strokeRect(25,25,w-50,h-100);
    for (let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(w-105+i*34, 73, 10, 0, TAU); ctx.fillStyle = ['#ff364f','#ffb32b','#9dff32'][i]; ctx.fill(); }
    ctx.fillStyle='rgba(166,255,50,.14)'; for(let x=0;x<w;x+=48){ctx.fillRect(x,h-48,24,12);}
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(7.65, 2.65, .28), new THREE.MeshStandardMaterial({ color: 0x171e18, roughness: .5, metalness: .5 }));
  back.position.set(0, 1.25, -7.32); tableGroup.add(back);
  const backFace = new THREE.Mesh(new THREE.PlaneGeometry(7.35, 2.42), new THREE.MeshBasicMaterial({ map: backTex }));
  backFace.position.set(0, 1.25, -7.16); tableGroup.add(backFace);
  const backStrip = new THREE.Mesh(new THREE.BoxGeometry(7.4, .05, .05), new THREE.MeshBasicMaterial({ color: 0x9dff32 }));
  backStrip.position.set(0, 2.6, -7.1); tableGroup.add(backStrip);
  sectorSign = makeTextSprite('SEKTOR 01', 0xffc24c, 'rgba(13,9,2,.94)', 760, 92, 48);
  sectorSign.position.set(0, 2.95, -7.15); sectorSign.scale.set(4.7,.58,.01); tableGroup.add(sectorSign);
  sectorSign.userData.baseScale = 4.7;
  gameScene.userData.sectorSign = sectorSign;

  // Flipper rigs.
  gameFlippers = [makeFlipper(-1), makeFlipper(1)];
  gameFlippers.forEach(f => tableGroup.add(f.group));

  // Apron dachshund: a detailed companion who reacts to the carnage.
  const kennel = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(.92,.98,.18,28), new THREE.MeshStandardMaterial({ color: 0x1e261f, roughness: .4, metalness: .55 }));
  pad.position.set(GAME_DOG_HOME.x,.08,GAME_DOG_HOME.z); pad.receiveShadow = true; kennel.add(pad);
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(.88,.035,6,32), new THREE.MeshBasicMaterial({ color: 0x9dff32 })); padRing.rotation.x=Math.PI/2; padRing.position.set(GAME_DOG_HOME.x,.19,GAME_DOG_HOME.z); kennel.add(padRing);
  const k9signTex = canvasTexture(128,64,(ctx,w,h)=>{ctx.fillStyle='#090d08';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b9e93b';ctx.strokeRect(4,4,w-8,h-8);ctx.font='900 30px Arial Black, Arial';ctx.fillStyle='#d8ff91';ctx.textAlign='center';ctx.fillText('K9',w/2,h/2+10);});
  const k9sign = new THREE.Mesh(new THREE.PlaneGeometry(.58,.29), new THREE.MeshBasicMaterial({ map:k9signTex }));
  k9sign.position.set(-1.7,.43,6.98); k9sign.rotation.y = 0; tableGroup.add(k9sign);
  gameDog = createDachshund({ scale: .95 });
  gameDog.position.set(GAME_DOG_HOME.x,GAME_DOG_HOME.y,GAME_DOG_HOME.z); gameDog.rotation.y = GAME_DOG_YAW;
  gameDog.traverse(o => { if(o.isMesh) o.castShadow = true; });
  kennel.add(gameDog);
  const dogGlow = glowSprite(0x8fff32, 1.9, .12); dogGlow.position.set(GAME_DOG_HOME.x,.38,GAME_DOG_HOME.z); kennel.add(dogGlow);
  tableGroup.add(kennel);
  gameDogGlow = dogGlow;

  // Balls and effect layers.
  ballsLayer = new THREE.Group(); gameScene.add(ballsLayer);
  dynamicGroup = new THREE.Group(); tableGroup.add(dynamicGroup);
  effectsGroup = new THREE.Group(); gameScene.add(effectsGroup);

  // Static support drones above the flanks.
  for (const s of [-1,1]) {
    const d = createDrone(.6);
    d.position.set(s*4.35, 2.5, -1.8 + s*.8);
    d.rotation.y = s*.4;
    tableGroup.add(d); gameDrones.push(d);
  }

  // Floating particles over the table.
  particles = createParticleSystem(gameScene, 460);
  const ashCount = 150; const ap = new Float32Array(ashCount*3);
  for(let i=0;i<ashCount;i++){ap[i*3]=rand(-5,5);ap[i*3+1]=rand(0,5);ap[i*3+2]=rand(-6,7);}
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(ap,3));
  ashGame = new THREE.Points(ag, new THREE.PointsMaterial({map:TEX.spark,color:0xb8c4a9,size:.035,transparent:true,opacity:.27,depthWrite:false,blending:THREE.AdditiveBlending}));
  gameScene.add(ashGame);
  fitGameCamera();
}

function makeFlipper(side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 2.12, .25, 4.48);
  const len = 1.9;
  const metal = new THREE.MeshStandardMaterial({ color: 0xacb2a4, roughness: .25, metalness: .82, emissive: 0x0b1109, emissiveIntensity: .2 });
  const neon = new THREE.MeshStandardMaterial({ color: side < 0 ? 0x9dff32 : 0xffb433, emissive: side < 0 ? 0x85ff1a : 0xff9414, emissiveIntensity: 1.4, roughness: .3 });
  const paddle = new THREE.Mesh(new THREE.CapsuleGeometry(.17, len - .34, 5, 10), metal);
  paddle.rotation.z = Math.PI / 2; paddle.position.x = len / 2 - .02; paddle.castShadow = true; pivot.add(paddle);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(len - .5, .035, .075), neon);
  stripe.position.set(len / 2, .095, 0.08); pivot.add(stripe);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(len - .62, .06, .03), neon);
  edge.position.set(len / 2, -.12, -.11); pivot.add(edge);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,.22,16), new THREE.MeshStandardMaterial({ color: 0x202823, metalness: .65, roughness: .35 }));
  hub.position.y = -.03; pivot.add(hub);
  const hubGlow = glowSprite(side < 0 ? 0x8fff32 : 0xffa730, .6, .22); hubGlow.position.set(0,.1,0); pivot.add(hubGlow);
  const group = new THREE.Group(); group.add(pivot);
  const f = {
    side, group, pivot, len,
    pivotX: side * 2.12, pivotZ: 4.48,
    restAngle: side < 0 ? .44 : Math.PI - .44,
    activeAngle: side < 0 ? -.88 : Math.PI + .88,
    angle: side < 0 ? .44 : Math.PI - .44,
    target: side < 0 ? .44 : Math.PI - .44,
    pressed: false, omega: 0, hitCooldown: 0, glow: hubGlow
  };
  pivot.rotation.y = -f.angle;
  return f;
}

function setFlipperAngle(f, angle) {
  f.angle = angle;
  f.pivot.rotation.y = -angle;
}

function fitGameCamera() {
  if (!gameCamera || !gameTarget) return;
  const dir = new THREE.Vector3(0, 1, .54).normalize();
  const points = [
    new THREE.Vector3(-4.35, 0, -7.4), new THREE.Vector3(4.35, 0, -7.4),
    new THREE.Vector3(-4.35, 0, 6.2), new THREE.Vector3(4.35, 0, 6.2),
    new THREE.Vector3(-1.45, .4, 7.95), new THREE.Vector3(1.45, .4, 7.95),
    new THREE.Vector3(0, 1.6, 7.9), new THREE.Vector3(0, .2, 8.0),
    new THREE.Vector3(0, 3.0, -7.35), new THREE.Vector3(-4.0, 1.0, -7.35), new THREE.Vector3(4.0, 1.0, -7.35)
  ];
  let lo = 4, hi = 46;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    gameCamera.position.copy(gameTarget).addScaledVector(dir, mid);
    gameCamera.lookAt(gameTarget);
    gameCamera.updateMatrixWorld();
    gameCamera.updateProjectionMatrix();
    let inside = true;
    for (const p of points) {
      const v = p.clone().project(gameCamera);
      if (Math.abs(v.x) > .94 || Math.abs(v.y) > .94 || v.z > 1) { inside = false; break; }
    }
    if (inside) hi = mid; else lo = mid;
  }
  gameCameraBase.copy(gameTarget).addScaledVector(dir, hi);
  gameCamera.position.copy(gameCameraBase);
  gameCamera.lookAt(gameTarget);
  gameCamera.updateMatrixWorld();
}

/* ───────────────────────────── VISUAL EFFECT HELPERS ───────────────────────────── */
function makeTextSprite(text, colorHex = 0xffffff, bg = 'rgba(0,0,0,0)', w = 512, h = 128, fontSize = 64) {
  const cssColor = '#' + new THREE.Color(colorHex).getHexString();
  const tex = canvasTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    if (bg && bg !== 'rgba(0,0,0,0)') { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.font = `900 ${fontSize}px Impact, Arial Black, Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = cssColor; ctx.shadowBlur = 18;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(text, w / 2, h / 2 + 2);
    ctx.fillStyle = cssColor; ctx.fillText(text, w / 2, h / 2);
    ctx.shadowBlur = 0;
  });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(w / 400, h / 400, 1);
  return s;
}

function makePowerIconTexture(type, colorHex, glyph) {
  const css = '#' + new THREE.Color(colorHex).getHexString();
  return canvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath(); ctx.arc(64, 64, 50, 0, TAU);
    ctx.fillStyle = 'rgba(2,7,5,.9)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = css; ctx.stroke();
    ctx.shadowColor = css; ctx.shadowBlur = 18;
    ctx.fillStyle = css; ctx.font = '900 44px Arial Black, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, 64, 66);
  });
}

function createParticleSystem(scene, count = 400) {
  const positions = new Float32Array(count * 3).fill(-100);
  const colors = new Float32Array(count * 3);
  const data = [];
  for (let i = 0; i < count; i++) data.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    map: TEX.spark, vertexColors: true, size: .16, transparent: true, opacity: .9,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;
  points.userData.spawn = (x, y, z, color, n = 6, speed = 2.2) => {
    const c = new THREE.Color(color);
    for (let j = 0; j < n; j++) {
      const i = cursor++ % count;
      positions[i*3] = x + rand(-.08,.08);
      positions[i*3+1] = y + rand(-.05,.05);
      positions[i*3+2] = z + rand(-.08,.08);
      const a = rand(0, TAU), r = rand(.1, 1) * speed;
      data[i].vx = Math.cos(a) * r; data[i].vz = Math.sin(a) * r;
      data[i].vy = rand(.4, 2.3) * speed * .55;
      data[i].life = data[i].max = rand(.18, .62);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
  points.userData.update = (dt) => {
    let dirtyPos = false, dirtyCol = false;
    for (let i = 0; i < count; i++) {
      const p = data[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { positions[i*3+1] = -100; colors[i*3] = colors[i*3+1] = colors[i*3+2] = 0; dirtyPos = dirtyCol = true; continue; }
      positions[i*3] += p.vx * dt;
      positions[i*3+1] += p.vy * dt;
      positions[i*3+2] += p.vz * dt;
      p.vy -= 4.2 * dt;
      p.vx *= Math.exp(-1.4 * dt); p.vz *= Math.exp(-1.4 * dt);
      const l = p.life / p.max;
      colors[i*3] *= .965; colors[i*3+1] *= .965; colors[i*3+2] *= .965;
      if (l < .2) { colors[i*3] += .02; }
      dirtyPos = dirtyCol = true;
    }
    if (dirtyPos) geo.attributes.position.needsUpdate = true;
    if (dirtyCol) geo.attributes.color.needsUpdate = true;
  };
  return points;
}

const effects = [];
function addFloatingText(text, x, z, color = 0x9dff32, size = .58) {
  const s = makeTextSprite(text, color, 'rgba(0,0,0,0)', 320, 96, 58);
  s.position.set(x, .95, z);
  s.scale.set(size * 1.2, size * .36, 1);
  effectsGroup.add(s);
  effects.push({ kind: 'text', obj: s, life: .95, max: .95, baseY: .95 });
}
function addBurst(x, z, color = 0xffb32b, n = 10, speed = 3, y = .35) {
  if (particles) particles.userData.spawn(x, y, z, color, n, speed);
}
function addShockwave(x, z, color = 0x9dff32, maxScale = 5.8) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1.05, 48), mat);
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, .12, z);
  effectsGroup.add(ring);
  effects.push({ kind: 'ring', obj: ring, life: .7, max: .7, maxScale });
}
function addBeam(ax, ay, az, bx, by, bz, color = 0x58e2ff, life = .35) {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
  const dir = b.clone().sub(a), len = dir.length();
  const geo = new THREE.CylinderGeometry(.018, .03, len, 6);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  effectsGroup.add(mesh);
  effects.push({ kind: 'beam', obj: mesh, life, max: life });
  const g1 = glowSprite(color, .7, .8); g1.position.copy(b); effectsGroup.add(g1); effects.push({ kind: 'glow', obj: g1, life, max: life });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.life -= dt;
    const p = Math.max(0, e.life / e.max);
    if (e.kind === 'text') {
      e.obj.position.y = e.baseY + (1 - p) * .75;
      e.obj.material.opacity = Math.min(1, p * 2.6);
    } else if (e.kind === 'ring') {
      const s = .7 + (1 - p) * e.maxScale;
      e.obj.scale.set(s, s, s);
      e.obj.material.opacity = p * .55;
    } else if (e.kind === 'beam') {
      e.obj.material.opacity = p;
      e.obj.scale.x = e.obj.scale.z = .4 + p * .6;
    } else if (e.kind === 'glow') {
      e.obj.material.opacity = p * .8;
      e.obj.scale.setScalar(.2 + (1 - p) * 1.5);
    }
    if (e.life <= 0) {
      effectsGroup.remove(e.obj);
      if (e.obj.material) {
        if (e.obj.material.map && e.kind === 'text') e.obj.material.map.dispose();
        e.obj.material.dispose();
      }
      if (e.obj.geometry) e.obj.geometry.dispose();
      effects.splice(i, 1);
    }
  }
}

/* ───────────────────────────── GAME OBJECTS ───────────────────────────── */
const POWER_DEFS = {
  multiball: { name: 'RUDEL', short: 'RDL', icon: '3×', color: 0xffdd6b, duration: 0 },
  shield: { name: 'SCHILD', short: 'SHD', icon: '⛨', color: 0x58e2ff, duration: 0 },
  overdrive: { name: 'OVERDRIVE', short: 'OVR', icon: '×2', color: 0xff8b2e, duration: 10 },
  slow: { name: 'ZEITLUPE', short: 'SLO', icon: '❄', color: 0x7ce5ff, duration: 8 },
  flame: { name: 'BRANDKUGEL', short: 'FIR', icon: '🔥', color: 0xff5c3a, duration: 12 },
  magnet: { name: 'MAGNET', short: 'MAG', icon: '⌁', color: 0xad7bff, duration: 10 },
  emp: { name: 'EMP', short: 'EMP', icon: 'EMP', color: 0x8bf7ff, duration: 0 }
};

function makeBumper(x, z, radius, accent) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.12, radius * 1.28, .2, 20), new THREE.MeshStandardMaterial({ color: 0x18211b, roughness: .42, metalness: .4 }));
  base.position.y = .1; base.castShadow = true; group.add(base);
  const ringMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.0, roughness: .3, metalness: .3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * .88, .075, 8, 28), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = .33; group.add(ring);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius * .72, 16, 10, 0, TAU, 0, Math.PI * .55), new THREE.MeshStandardMaterial({ color: 0x27302a, roughness: .2, metalness: .72 }));
  dome.scale.y = .55; dome.position.y = .25; group.add(dome);
  // A little infected head in the middle of each bumper.
  const skull = new THREE.Mesh(new THREE.SphereGeometry(radius * .35, 10, 8), new THREE.MeshStandardMaterial({ color: 0x6b765a, roughness: .8, emissive: 0x10150b, emissiveIntensity: .4 }));
  skull.scale.set(1, .95, .85); skull.position.y = .49; group.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(radius * .38, .07, radius * .28), new THREE.MeshStandardMaterial({ color: 0x777f61, roughness: .8 })); jaw.position.set(radius * .06, .34, radius * .15); group.add(jaw);
  for (const s of [-1,1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.025,7,6), new THREE.MeshBasicMaterial({ color: 0xff2d37 }));
    eye.position.set(radius * .13, .54, s * radius * .1); group.add(eye);
  }
  const glow = glowSprite(accent, radius * 3.2, .35); glow.position.y = .35; group.add(glow);
  return { group, ring, glow, radius, x, z, lastHit: -10, flash: 0, accent };
}

function makePod(x, z, radius, hp, accent) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.4, .15, 18), new THREE.MeshStandardMaterial({ color: 0x1d211a, metalness: .5, roughness: .45 })); base.position.y = .08; group.add(base);
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.03, .035, 6, 26), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = .17; group.add(ring);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x3d5b32, emissive: 0x3e7a1c, emissiveIntensity: .6, roughness: .2, metalness: .1, transparent: true, opacity: .74, transmission: .18, thickness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), bodyMat); body.scale.set(1, 1.18, 1); body.position.y = radius + .2; body.castShadow = true; group.add(body);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * .45, 0), new THREE.MeshStandardMaterial({ color: 0x86ff38, emissive: 0x55ff17, emissiveIntensity: 1.5, roughness: .2 })); core.position.y = radius + .2; group.add(core);
  const glow = glowSprite(accent, radius * 4.2, .46); glow.position.y = radius + .2; group.add(glow);
  for (let i=0;i<3;i++) {
    const claw = new THREE.Mesh(new THREE.ConeGeometry(radius*.14, radius*.5, 5), new THREE.MeshStandardMaterial({ color: 0x412e25, roughness: .7 }));
    const a = i * TAU/3 + .4; claw.position.set(Math.cos(a)*radius*.82, radius*.94, Math.sin(a)*radius*.82); claw.rotation.z = Math.PI/2; claw.rotation.y = -a; group.add(claw);
  }
  return { group, ring, body, core, glow, radius, x, z, hp, maxHp: hp, lastHit: -10, alive: true, flash: 0, accent };
}

function makeRelay(x, z, accent) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.26,.34,.14,14), new THREE.MeshStandardMaterial({ color: 0x1a2325, metalness: .6, roughness: .4 })); base.position.y = .07; group.add(base);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.055,.085,.48,8), new THREE.MeshStandardMaterial({ color: 0x2a3435, metalness: .72, roughness: .3 })); mast.position.y = .34; group.add(mast);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.32,.028,6,24), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.2, roughness: .2 })); ring.rotation.x = Math.PI/2; ring.position.y = .52; group.add(ring);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.5, roughness: .2 })); eye.position.y = .64; group.add(eye);
  const glow = glowSprite(accent, 1.2, .38); glow.position.y = .58; group.add(glow);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(.2,.07,.1,12,1,true), new THREE.MeshStandardMaterial({ color: 0x394344, metalness: .6, roughness: .3, side: THREE.DoubleSide })); dish.position.y = .48; dish.rotation.z=.3; group.add(dish);
  return { group, ring, eye, glow, x, z, radius: .38, hits: 0, maxHits: 3, activated: false, lastHit: -10, flash: 0, accent };
}

function makePickup(type, x, z) {
  const def = POWER_DEFS[type];
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const mat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.1, roughness: .25, metalness: .45 });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.26, 0), mat); crystal.position.y = .57; crystal.castShadow = true; group.add(crystal);
  const iconTex = makePowerIconTexture(type, def.color, def.icon);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, transparent: true, depthWrite: false })); icon.scale.set(.55,.55,1); icon.position.y = .62; group.add(icon);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.34,.025,6,22), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending })); ring.rotation.x = Math.PI/2; ring.position.y = .22; group.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.25,.42,.42,16,1,true), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: .11, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); beam.position.y = .35; group.add(beam);
  const glow = glowSprite(def.color, 1.7, .46); glow.position.y = .55; group.add(glow);
  return { group, crystal, ring, icon, glow, type, x, z, radius: .36, bornAt: 0, spin: rand(0,TAU), collected: false };
}

function makeGameZombie(x, z, speedScale = 1) {
  const zed = createZombie({ scale: rand(.82,1.05), skin: 0x67745a, cloth: 0x30312a });
  zed.position.set(x, .04, z);
  zed.rotation.y = rand(-.5,.5);
  zed.traverse(o => { if(o.isMesh) o.castShadow = true; });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.34, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false }));
  shadow.rotation.x = -Math.PI/2; shadow.position.y = .015; shadow.position.z = 0; zed.add(shadow);
  const u = zed.userData;
  return { group: zed, x, z, baseX: x, baseZ: z, radius: .35, hp: 2, maxHp: 2, lastHit: -10, phase: rand(0,TAU), speed: .65 * speedScale, alive: true, flash: 0, walkDir: Math.random() < .5 ? -1 : 1, born: nowMs()/1000 };
}

/* ───────────────────────────── RUN / STAGE GENERATION ───────────────────────────── */
const DIFFICULTIES = {
  recruit: { key:'recruit', name:'REKRUT', balls:5, gravity:4.25, zombies:2, speed:.82, score:1, podHp:2, color:0x9dff32 },
  veteran: { key:'veteran', name:'VETERAN', balls:3, gravity:5.15, zombies:3, speed:1, score:1.5, podHp:3, color:0xffb32b },
  nightmare: { key:'nightmare', name:'ALBTRAUM', balls:2, gravity:5.9, zombies:4, speed:1.28, score:2.5, podHp:4, color:0xff364f }
};
const SECTOR_NAMES = ['BLUTWEG','NEON-KLINIK','KANAL 13','SCHROTTWERK','TOTER WINKEL','BUNKER 9','KEROSEN-KIEW','DÄMMERUNG','ASCHENFELD','WUMMI-PASSAGE','LETZTE KAMMER','SECHSTER BEZIRK','STAHLGARTEN','K9-DEPOT','EISENHUND'];
const PALETTES = [0x9dff32, 0xffb32b, 0x58e2ff, 0xff5c3a, 0xad7bff, 0x7cff91];
let run = null;
let stage = null;
let balls = [];
let simTime = 0;
let stageLight = null;
let lastHud = {};

function makeLayout(stageNo, diff) {
  const rng = mulberry32((run.seed + stageNo * 9973) >>> 0);
  const placed = [];
  const bumpers = [], pods = [], relays = [];
  const accent = PALETTES[(stageNo - 1) % PALETTES.length];
  const name = SECTOR_NAMES[(stageNo - 1) % SECTOR_NAMES.length];

  function fits(x, z, r) {
    if (Math.abs(x) > 2.68 || z > 2.35 || z < -5.85) return false;
    if (x > 2.18) return false;
    for (const p of placed) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < r + p.r + .48) return false;
    }
    return true;
  }
  function choose(r, zMin, zMax, xMin, xMax) {
    for (let i = 0; i < 90; i++) {
      const x = xMin + rng() * (xMax - xMin);
      const z = zMin + rng() * (zMax - zMin);
      if (fits(x, z, r)) { placed.push({ x, z, r }); return { x, z }; }
    }
    return null;
  }

  const bumperCount = 3 + (stageNo >= 3 ? 1 : 0);
  for (let i = 0; i < bumperCount; i++) {
    let pos = choose(.58, -5.3, 1.0, -2.55, 2.1);
    if (!pos) pos = [[-1.85,-3.9],[1.4,-2.7],[-1.0,-.8],[1.8,-4.6]][i % 4];
    bumpers.push(makeBumper(pos.x, pos.z, .58, accent));
  }
  const podCount = 3 + (stageNo >= 6 ? 1 : 0);
  for (let i = 0; i < podCount; i++) {
    let pos = choose(.5, -5.5, 1.65, -2.55, 1.9);
    if (!pos) pos = [[-.7,-5.15],[2.0,-3.8],[-2.3,-1.5],[1.2,.9]][i % 4];
    pods.push(makePod(pos.x, pos.z, .5, diff.podHp, 0x9dff32));
  }
  const relayCount = 2 + (stageNo >= 4 ? 1 : 0);
  for (let i = 0; i < relayCount; i++) {
    let pos = choose(.38, -4.8, 2.1, -2.7, 2.05);
    if (!pos) pos = [[-2.6,-2.8],[2.15,-1.0],[-1.1,1.4]][i % 3];
    relays.push(makeRelay(pos.x, pos.z, 0x58e2ff));
  }

  const zombieCount = Math.min(7, diff.zombies + (stageNo >= 5 ? 1 : 0));
  const zombies = [];
  for (let i = 0; i < zombieCount; i++) {
    let x = -2.55 + rng() * 4.8, z = -5.4 + rng() * 6.2;
    if (Math.abs(x) > 2.35) x = Math.sign(x) * 2.35;
    zombies.push(makeGameZombie(x, z, diff.speed));
  }
  return { bumpers, pods, relays, zombies, name, accent, seed: Math.floor(rng() * 99999), podCount };
}

function buildStage() {
  if (!run) return;
  // Clear the previous sector.
  while (dynamicGroup.children.length) {
    const c = dynamicGroup.children.pop();
    dynamicGroup.remove(c);
    c.traverse?.(o => { if (o.material && o.material.map && o.userData.disposeMap) o.material.map.dispose(); });
  }
  if (particles) {
    // reset particles visually
  }
  const layout = makeLayout(run.stage, run.diff);
  stage = {
    ...layout, pickups: [], slingCooldown: -5, podCount: layout.pods.length, clearedPods: 0, armed: true
  };
  layout.bumpers.forEach(b => dynamicGroup.add(b.group));
  layout.pods.forEach(p => dynamicGroup.add(p.group));
  layout.relays.forEach(r => dynamicGroup.add(r.group));
  layout.zombies.forEach(z => dynamicGroup.add(z.group));
  // Fade the existing static props to the new sector accent.
  if (stageLight) { stageLight.color.setHex(layout.accent); stageLight.intensity = 10; }
  // Signage above the table.
  const signSprite = gameScene.userData.sectorSign;
  if (signSprite) {
    if (signSprite.material.map) signSprite.material.map.dispose();
    const tex = makeTextSprite(`SEKTOR ${String(run.stage).padStart(2,'0')} // ${layout.name}`, 0xffc24c, 'rgba(10,8,3,.94)', 760, 92, 48);
    signSprite.material.map = tex.material.map; signSprite.material.needsUpdate = true;
    tex.material.dispose();
  }
  sectorVal.textContent = `SEKTOR ${String(run.stage).padStart(2, '0')}`;
  sectorName.textContent = layout.name;
  objectiveEl.innerHTML = `ZERSTÖRE <b>${layout.pods.length} BRUTKAPSELN</b>`;
  run.podTotal = layout.pods.length;
  run.podDone = 0;
  updateHUD(true);
}

function clearBalls() {
  balls.forEach(b => {
    b.mesh.removeFromParent();
    b.trail.forEach(t => { t.removeFromParent(); t.material?.dispose(); });
    if (b.mesh) {
      b.mesh.traverse(o => { if (o.isMesh && o.material) o.material.dispose?.(); });
    }
  });
  balls = [];
}

function createBall(x, z, held = false) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf4ffe9, metalness: .92, roughness: .1, emissive: 0x3c641c, emissiveIntensity: .55 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(GAME_CONST.ballR, 22, 16), mat);
  group.add(sphere);
  const glow = glowSprite(0xb6ff55, .95, .4); glow.position.z = 0; group.add(glow);
  const halo = glowSprite(0xd9ff9c, 1.55, .11); group.add(halo);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(.3, .43, 26),
    new THREE.MeshBasicMaterial({ color: 0xa6ff32, transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  marker.rotation.x = -Math.PI / 2; marker.position.y = -.215; group.add(marker);
  const light = new THREE.PointLight(0xa6ff32, 1.35, 3.1, 2); light.position.y = .12; group.add(light);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.32, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .42, depthWrite: false }));
  shadow.rotation.x = -Math.PI/2; shadow.position.y = -.223; group.add(shadow);
  group.position.set(x, GAME_CONST.ballR + .02, z);
  ballsLayer.add(group);
  const trail = [];
  for (let i = 0; i < 11; i++) {
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0x9dff32, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    sm.scale.set(.38 - i*.012, .38 - i*.012, 1);
    sm.position.set(x, .3, z);
    ballsLayer.add(sm); trail.push(sm);
  }
  const ball = {
    x, z, vx: 0, vz: 0, held, active: true, mesh: group, sphere, glow, halo, marker, light, shadow, trail,
    spin: new THREE.Vector3(rand(-1,1), rand(-1,1), rand(-1,1)),
    stuckTime: 0, lastTrail: 1, launchReady: held
  };
  balls.push(ball);
  return ball;
}

function loadBall() {
  clearBalls();
  createBall(GAME_CONST.launchX, GAME_CONST.launchZ, true);
  run.launched = false;
  updateHUD(true);
}

function launchBall() {
  const held = balls.find(b => b.held);
  if (!held || !run || state !== 'game') return;
  held.held = false; held.launchReady = false;
  held.vx = rand(-.35, .35); held.vz = -18.9;
  held.x = GAME_CONST.launchX; held.z = GAME_CONST.launchZ;
  run.launched = true;
  addBurst(held.x, held.z, 0x8fff32, 8, 2.4);
  audio.launch(); buzz(16);
  cameraShake = Math.max(cameraShake, .12);
  updateHUD(true);
}

/* ───────────────────────────── SCORE / POWERS ───────────────────────────── */
function addK9(amount) {
  if (!run) return;
  run.k9 = clamp(run.k9 + amount, 0, 100);
  if (run.k9 >= 100 && run.k9Fx <= 0 && run.k9Ready <= 0) {
    run.k9Ready = .55;
    showEvent('K9-WUT BEREIT');
  }
}
function addScore(base, x, z, color = 0xa6ff32, label = null) {
  if (!run) return 0;
  run.combo++;
  run.comboTimer = 4.1;
  run.multiplier = clamp(1 + Math.floor(run.combo / 4), 1, 8);
  run.stats.maxCombo = Math.max(run.stats.maxCombo, run.combo);
  const mult = run.powers.overdrive ? 2 : 1;
  const value = Math.round(base * run.diff.score * run.multiplier * mult);
  run.score += value;
  run.stats.hits++;
  if (x != null && simTime - (run.lastPop || -9) > .16) {
    run.lastPop = simTime;
    addFloatingText(`${value >= 1000 ? fmt(value) : value}`, x, z, color, .48);
  }
  return value;
}
function addPower(type) {
  if (!run) return;
  const def = POWER_DEFS[type];
  run.stats.powerups++;
  if (type === 'multiball') {
    const source = balls.find(b => !b.held && b.active) || balls[0];
    const cx = source ? source.x : 0, cz = source ? source.z : 0;
    for (let i = 0; i < 2; i++) {
      if (balls.length >= 4) break;
      const nb = createBall(cx + rand(-.3,.3), cz + rand(-.25,.25), false);
      nb.vx = rand(-3.4,3.4); nb.vz = rand(-1.2, 2.2);
    }
    audio.multiball(); addShockwave(cx, cz, 0xffdd6b, 4.2); cameraShake = Math.max(cameraShake,.32);
    showEvent('RUDELMODUS // MULTIBALL');
  } else if (type === 'emp') {
    stage.zombies.forEach(z => { if (z.alive) killZombie(z, true); });
    stage.pods.forEach(p => { if (p.alive) damagePod(p, 2, true); });
    stage.relays.forEach(r => { r.flash = 1; });
    addShockwave(0, 0, 0x8bf7ff, 8.5); cameraShake = Math.max(cameraShake,.5); audio.relay(); audio.explode();
    showEvent('EMP // HORDE NEUTRALISIERT');
  } else if (type === 'shield') {
    run.powers.shield = 1; run.shieldUntil = Infinity;
    showEvent('SCHILD // EIN DRAIN GESICHERT');
  } else {
    run.powers[type] = Math.max(run.powers[type] || 0, def.duration);
    showEvent(`${def.name} // ${def.duration > 0 ? def.duration + ' SEK.' : 'AKTIV'}`);
  }
  if (balls[0]) addBurst(balls[0].x, balls[0].z, def.color, 14, 3.1, .45);
  audio.powerup();
  updateHUD(true);
}

function collectPickup(pk) {
  if (pk.collected) return;
  pk.collected = true;
  pk.group.visible = false;
  addPower(pk.type);
  addFloatingText(POWER_DEFS[pk.type].name, pk.x, pk.z, POWER_DEFS[pk.type].color, .44);
  stage.pickups = stage.pickups.filter(p => p !== pk);
}

function damagePod(pod, amount = 1, silent = false) {
  if (!pod.alive || !run) return;
  pod.hp -= amount;
  pod.flash = 1;
  if (pod.hp > 0) {
    if (!silent) {
      addScore(700, pod.x, pod.z, 0xa6ff32);
      addBurst(pod.x, pod.z, 0x9dff32, 7, 2.1);
      addK9(3); audio.pod(); buzz(6);
      cameraShake = Math.max(cameraShake, .1);
      pod.body.scale.setScalar(.78 + .22 * (pod.hp / pod.maxHp));
    }
    return;
  }
  pod.alive = false;
  pod.group.visible = false;
  run.podDone++;
  run.stats.pods++;
  addScore(3200, pod.x, pod.z, 0xffd45c);
  addBurst(pod.x, pod.z, 0x9dff32, 28, 4.6, .5);
  addBurst(pod.x, pod.z, 0xffb32b, 14, 3.3, .5);
  addShockwave(pod.x, pod.z, 0x9dff32, 3.8);
  audio.explode(); buzz(25); cameraShake = Math.max(cameraShake, .55);
  if (gameDog) gameDog.userData.excited = 1;
  // Intel drops: at least one power-up per sector, then random.
  const shouldDrop = run.podDone === 1 || run.podDone === 2 || Math.random() < .72;
  if (shouldDrop) {
    const kinds = ['multiball','shield','overdrive','slow','flame','magnet','emp'];
    const type = run.podDone === 1 ? pick(['shield','multiball','overdrive']) : pick(kinds);
    const pk = makePickup(type, pod.x, pod.z);
    pk.bornAt = simTime;
    dynamicGroup.add(pk.group);
    stage.pickups.push(pk);
  }
  if (stage.pods.every(p => !p.alive)) beginStageClear();
  updateHUD(true);
}

function killZombie(z, silent = false) {
  if (!z.alive) return;
  z.alive = false;
  z.group.visible = false;
  addScore(1100, z.x, z.z, 0xff6b54);
  run.stats.zombies++;
  addBurst(z.x, z.z, 0xff6b54, 15, 3, .45);
  addBurst(z.x, z.z, 0x9dff32, 8, 2.2, .45);
  addK9(6);
  if (!silent) { audio.zombie(); buzz(10); }
  cameraShake = Math.max(cameraShake, .18);
}

function beginStageClear() {
  if (!run || run.stageClearTimer > 0) return;
  run.stageClearTimer = 2.15;
  const bonus = Math.round((4000 + run.stage * 1600) * run.diff.score);
  run.score += bonus;
  run.stats.maxCombo = Math.max(run.stats.maxCombo, run.combo);
  audio.clear();
  addShockwave(0, 0, 0xffc24c, 8.8);
  addFloatingText(`+${fmt(bonus)}`, 0, 1.2, 0xffc24c, .95);
  showEvent(`SEKTOR GESICHERT // +${fmt(bonus)}`);
  if (gameDog) gameDog.userData.excited = 1.5;
  cameraShake = Math.max(cameraShake, .35);
  run.podDone = run.podTotal;
}

function clearStageThenNext() {
  if (!run) return;
  clearBalls();
  run.stage++;
  run.stageClearTimer = 0;
  run.combo = 0; run.multiplier = 1; run.comboTimer = 0;
  if (run.stage % 3 === 0) {
    run.ballsLeft = Math.min(5, run.ballsLeft + 1);
    showEvent('BONUS-BALL // VERSTÄRKUNG');
  }
  buildStage();
  loadBall();
  audio.setMode('game');
  cameraShake = Math.max(cameraShake, .18);
}

/* ───────────────────────────── PHYSICS ───────────────────────────── */
function speedCap(ball) {
  const sp = Math.hypot(ball.vx, ball.vz);
  if (sp > GAME_CONST.maxSpeed) {
    ball.vx *= GAME_CONST.maxSpeed / sp; ball.vz *= GAME_CONST.maxSpeed / sp;
  }
}
function hitSegment(ball, w) {
  const abx = w.bx - w.ax, abz = w.bz - w.az;
  const len2 = abx * abx + abz * abz;
  let t = ((ball.x - w.ax) * abx + (ball.z - w.az) * abz) / len2;
  t = clamp(t, 0, 1);
  const cx = w.ax + abx * t, cz = w.az + abz * t;
  let dx = ball.x - cx, dz = ball.z - cz;
  let d = Math.hypot(dx, dz);
  if (d < GAME_CONST.ballR + .08) {
    if (d < 1e-4) { dx = 0; dz = -1; d = 1; }
    const nx = dx / d, nz = dz / d;
    ball.x = cx + nx * (GAME_CONST.ballR + .09);
    ball.z = cz + nz * (GAME_CONST.ballR + .09);
    const vn = ball.vx * nx + ball.vz * nz;
    if (vn < 0) {
      const e = w.rest;
      ball.vx -= (1 + e) * vn * nx;
      ball.vz -= (1 + e) * vn * nz;
      if (w.kick && simTime - (stage.slingCooldown || -10) > .22) {
        stage.slingCooldown = simTime;
        ball.vx += nx * w.kick; ball.vz += nz * w.kick;
        addBurst(ball.x, ball.z, 0xffb32b, 8, 2.4);
        audio.bumper();
        addScore(350, ball.x, ball.z, 0xffb32b);
        addK9(1);
        cameraShake = Math.max(cameraShake, .13);
      }
    }
    speedCap(ball);
  }
}
function hitCircle(ball, obj, cb) {
  const dx = ball.x - obj.x, dz = ball.z - obj.z;
  const d = Math.hypot(dx, dz);
  const min = GAME_CONST.ballR + obj.radius;
  if (d < min) {
    let nx = dx / d, nz = dz / d;
    if (d < 1e-4) { nx = 1; nz = 0; }
    ball.x = obj.x + nx * min; ball.z = obj.z + nz * min;
    const vn = ball.vx * nx + ball.vz * nz;
    if (vn < 0) {
      ball.vx -= 2.15 * vn * nx;
      ball.vz -= 2.15 * vn * nz;
      speedCap(ball);
      cb(nx, nz);
    }
  }
}
function hitFlipper(ball, f) {
  const cos = Math.cos(f.angle), sin = Math.sin(f.angle);
  const ex = f.pivotX + cos * f.len, ez = f.pivotZ + sin * f.len;
  const dx = ex - f.pivotX, dz = ez - f.pivotZ;
  const l2 = dx*dx + dz*dz;
  let t = ((ball.x - f.pivotX)*dx + (ball.z - f.pivotZ)*dz) / l2;
  t = clamp(t, .15, 1);
  const cx = f.pivotX + dx*t, cz = f.pivotZ + dz*t;
  let nx0 = ball.x - cx, nz0 = ball.z - cz;
  let dist = Math.hypot(nx0, nz0);
  const pad = GAME_CONST.ballR + .19;
  if (dist < pad) {
    if (dist < 1e-4) { nx0 = 0; nz0 = -1; dist = 1; }
    const nx = nx0 / dist, nz = nz0 / dist;
    ball.x = cx + nx * pad; ball.z = cz + nz * pad;
    const rx = cx - f.pivotX, rz = cz - f.pivotZ;
    const svx = -f.omega * rz, svz = f.omega * rx;
    const rvx = ball.vx - svx, rvz = ball.vz - svz;
    const vn = rvx * nx + rvz * nz;
    if (vn < 0) {
      const restitution = f.pressed ? 1.22 : .78;
      ball.vx -= (1 + restitution) * vn * nx;
      ball.vz -= (1 + restitution) * vn * nz;
      if (f.pressed) {
        const boost = Math.min(6.2, Math.abs(f.omega) * .22);
        ball.vx += nx * boost; ball.vz += nz * boost;
        f.glow.material.opacity = .7;
        addBurst(cx, cz, f.side < 0 ? 0x9dff32 : 0xffb32b, 4, 2.2);
        cameraShake = Math.max(cameraShake, .08);
      }
      speedCap(ball);
    }
  }
}
function ballBallCollision(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx,dz);
  const min = GAME_CONST.ballR*2 + .02;
  if (d < min && d > .0001) {
    const nx = dx/d, nz=dz/d;
    const overlap = min - d;
    a.x -= nx*overlap*.5; a.z -= nz*overlap*.5; b.x += nx*overlap*.5; b.z += nz*overlap*.5;
    const rvx = b.vx-a.vx, rvz = b.vz-a.vz;
    const vn = rvx*nx + rvz*nz;
    if (vn < 0) {
      a.vx += vn*nx*.95; a.vz += vn*nz*.95;
      b.vx -= vn*nx*.95; b.vz -= vn*nz*.95;
    }
  }
}
function flipperStep(dt) {
  gameFlippers.forEach(f => {
    const target = f.pressed ? f.activeAngle : f.restAngle;
    const speed = f.pressed ? 18 : 9.5;
    const diff = target - f.angle;
    const maxStep = speed * dt;
    const old = f.angle;
    if (Math.abs(diff) <= maxStep) f.angle = target;
    else f.angle += Math.sign(diff) * maxStep;
    f.omega = (f.angle - old) / Math.max(dt, .0001);
    f.hitCooldown = Math.max(0, f.hitCooldown - dt);
    setFlipperAngle(f, f.angle);
    f.glow.material.opacity = lerp(f.glow.material.opacity, .2, Math.min(1, dt * 8));
  });
}

function physicsStep(dt) {
  flipperStep(dt);
  // Attraction field from the magnet power-up.
  if (run && run.powers.magnet > 0 && stage) {
    const targets = [...stage.bumpers, ...stage.pods.filter(p=>p.alive)];
    balls.forEach(b => {
      if (b.held) return;
      let best = null, bd = 5.1;
      targets.forEach(t => { const d = Math.hypot(t.x-b.x,t.z-b.z); if (d < bd) { bd = d; best = t; } });
      if (best) {
        const a = .075 / Math.max(1, bd);
        b.vx += (best.x - b.x) * a * 120 * dt;
        b.vz += (best.z - b.z) * a * 120 * dt;
      }
    });
  }
  for (const b of balls) {
    if (!b.active || b.held) continue;
    b.vz += run.diff.gravity * dt;
    b.vx *= Math.exp(-.045 * dt); b.vz *= Math.exp(-.045 * dt);
    b.x += b.vx * dt; b.z += b.vz * dt;
    const speed = Math.hypot(b.vx,b.vz);
    b.stuckTime = speed < .4 ? b.stuckTime + dt : 0;
    if (b.stuckTime > 3.2 && b.z > 1.8) { b.vz -= 3; b.vx += rand(-1,1); b.stuckTime = 0; }
    if (b.stuckTime > 5) { b.vz -= 5; b.vx += rand(-2,2); b.stuckTime = 0; }
    // Walls.
    for (const w of walls) hitSegment(b, w);
    // Bumpers.
    for (const bump of stage.bumpers) {
      hitCircle(b, bump, (nx, nz) => {
        if (simTime - bump.lastHit < .12) return;
        bump.lastHit = simTime; bump.flash = 1;
        const pts = addScore(450, bump.x, bump.z, run.powers.overdrive ? 0xff8b2e : bump.accent);
        addBurst(bump.x + nx*.4, bump.z + nz*.4, bump.accent, 9, 2.8, .55);
        audio.bumper(); buzz(8); cameraShake = Math.max(cameraShake, .16);
        addK9(2);
        b.vx += nx * .8; b.vz += nz * .8;
      });
    }
    // Infected pods.
    for (const pod of stage.pods) {
      if (!pod.alive) continue;
      hitCircle(b, pod, (nx,nz) => {
        if (simTime - pod.lastHit < .14) return;
        pod.lastHit = simTime;
        damagePod(pod, run.powers.flame ? 2 : 1);
        addBurst(pod.x, pod.z, 0x9dff32, 5, 2, .5);
      });
    }
    // Security uplinks.
    for (const relay of stage.relays) {
      hitCircle(b, relay, (nx,nz) => {
        if (simTime - relay.lastHit < .5 || relay.activated) return;
        relay.lastHit = simTime; relay.hits++; relay.flash = 1;
        addScore(600, relay.x, relay.z, 0x58e2ff);
        addBurst(relay.x, relay.z, 0x58e2ff, 7, 2.4, .4);
        audio.relay(); buzz(7);
        if (relay.hits >= relay.maxHits) triggerSecurity(relay);
        updateHUD(true);
      });
    }
    // Roaming infected.
    for (const zed of stage.zombies) {
      if (!zed.alive) continue;
      hitCircle(b, zed, (nx,nz) => {
        if (simTime - zed.lastHit < .25) return;
        zed.lastHit = simTime; zed.flash = 1;
        const lethal = run.powers.flame;
        zed.hp -= lethal ? 9 : 1;
        addScore(400, zed.x, zed.z, 0xff6b54);
        addBurst(zed.x, zed.z, 0xff6b54, 6, 2.4, .4);
        audio.zombie();
        if (zed.hp <= 0) killZombie(zed);
        else { zed.group.visible = true; }
        updateHUD(true);
      });
    }
    // Loot.
    for (const pk of [...(stage.pickups || [])]) {
      if (pk.collected) continue;
      const d = Math.hypot(b.x - pk.x, b.z - pk.z);
      if (d < GAME_CONST.ballR + pk.radius) collectPickup(pk);
    }
    // Flippers.
    for (const f of gameFlippers) hitFlipper(b, f);
    // Other balls.
    for (const other of balls) if (other !== b && other.active && !other.held) ballBallCollision(b, other);
    // Drain.
    if (b.z > GAME_CONST.drainZ) {
      b.active = false;
      drainBall(b);
    }
    if (b.x < -4.3 || b.x > 4.3) { b.x = clamp(b.x, -4.3,4.3); b.vx *= -.7; }
    if (b.z < -7.4) { b.z = -7.4; b.vz *= -.6; }
  }
  // Cleanup inactive.
  balls = balls.filter(b => b.active);
}

function triggerSecurity(relay) {
  relay.activated = true;
  relay.eye.material.color.setHex(0x9dff32);
  relay.eye.material.emissive.setHex(0x44ff23);
  addScore(2400, relay.x, relay.z, 0x58e2ff);
  addK9(8);
  showEvent('SICHERHEITSTEAM // STRIKE FREIGEGEBEN');
  audio.relay(); audio.explode(); buzz(18); cameraShake = Math.max(cameraShake, .25);
  addShockwave(relay.x, relay.z, 0x58e2ff, 4);
  const target = stage.zombies.find(z => z.alive) || stage.pods.find(p => p.alive);
  if (target) {
    const drone = gameDrones[0];
    const dx = drone ? drone.position.x : -4.2, dy = drone ? drone.position.y : 2.4, dz = drone ? drone.position.z : -1;
    addBeam(dx, dy, dz, target.x, .3, target.z, 0x58e2ff, .42);
    if (stage.zombies.includes(target) && target.alive) killZombie(target, true);
    else if (target.alive) damagePod(target, 2);
    addBurst(target.x, target.z, 0x58e2ff, 18, 3.8, .5);
  }
  if (gameDog) gameDog.userData.excited = 1;
  updateHUD(true);
}

function drainBall(ball) {
  if (!run) return;
  // Remove visual immediately.
  ball.mesh.visible = false;
  ball.trail.forEach(t => t.visible = false);
  addBurst(ball.x, GAME_CONST.drainZ, 0xff364f, 12, 2.5, .3);
  run.combo = 0; run.multiplier = 1; run.comboTimer = 0;
  // Shield save.
  if (run.powers.shield) {
    run.powers.shield = 0;
    run.shieldUntil = 0;
    const nb = createBall(0, 3.85, false);
    nb.vx = rand(-2.1, 2.1); nb.vz = rand(-6.2, -4.3);
    addShockwave(0, 4.0, 0x58e2ff, 5.3);
    addFloatingText('SCHILD AKTIV', 0, 4.2, 0x58e2ff, .55);
    audio.shield(); showEvent('SCHILD HAT DEN DRAIN GESTOPPT');
    updateHUD(true);
    return;
  }
  // If other balls are still alive, only that ball is lost.
  const remaining = balls.filter(b => b.active && b !== ball);
  if (remaining.length) {
    audio.drain();
    showEvent('BALL VERLOREN // RUDEL HÄLT');
    updateHUD(true);
    return;
  }
  audio.drain();
  run.ballsLeft--;
  run.stats.ballsLost++;
  updateHUD(true);
  if (run.ballsLeft > 0) {
    setTimeout(() => {
      if (state === 'game' && run && run.ballsLeft > 0 && balls.length === 0) loadBall();
    }, 420);
    showEvent(`BALL ${run.ballsLeft} // K9 BEREIT`);
  } else {
    setTimeout(() => { if (state === 'game') finishRun(); }, 750);
    showEvent('ALLE BÄLLE VERLOREN');
  }
}

/* ───────────────────────────── K9 & GAMEPLAY UPDATE ───────────────────────────── */
function triggerK9() {
  if (!run || run.k9Fx > 0 || run.stageClearTimer > 0) return;
  run.k9 = 0; run.k9Fx = 1.95; run.k9Hit = false;
  audio.k9(); buzz(30); cameraShake = Math.max(cameraShake, .45);
  showEvent('K9-WUT // WUMMI-STURM');
  addShockwave(0, 4.0, 0x9dff32, 7.5);
  if (gameDog) gameDog.userData.excited = 1.5;
  updateHUD(true);
}
function k9Impact() {
  if (!stage) return;
  stage.zombies.forEach(z => { if (z.alive) killZombie(z, true); });
  stage.pods.forEach(p => { if (p.alive) damagePod(p, 2); });
  addScore(5200, 0, 1.6, 0xffd45c);
  addShockwave(0, 1.6, 0xffd45c, 9.5);
  addBurst(0, 1.6, 0x9dff32, 36, 5.2, .5);
  audio.explode();
  cameraShake = Math.max(cameraShake, .75);
}
function updateK9(dt, t) {
  if (!run || !gameDog) return;
  if (run.k9Ready > 0) {
    run.k9Ready -= dt;
    if (run.k9Ready <= 0 && run.stageClearTimer <= 0) triggerK9();
  }
  if (run.k9Fx > 0) {
    run.k9Fx -= dt;
    const total = 1.95, p = clamp(1 - run.k9Fx / total, 0, 1);
    const arc = Math.sin(p * Math.PI);
    const travel = Math.sin(p * Math.PI); // out and back, smooth
    gameDog.position.x = Math.sin(p * Math.PI * 2.1) * 1.35;
    gameDog.position.z = GAME_DOG_HOME.z - travel * 5.25;
    gameDog.position.y = .18 + arc * .65;
    gameDog.rotation.y = GAME_DOG_YAW + Math.sin(p * Math.PI * 2) * .5;
    gameDog.userData.excited = 1.4;
    gameDogGlow.position.set(gameDog.position.x, .45 + gameDog.position.y, gameDog.position.z);
    gameDogGlow.material.opacity = .18 + arc * .35;
    gameDogGlow.scale.setScalar(1.9 + arc * 1.4);
    if (!run.k9Hit && p > .48) { run.k9Hit = true; k9Impact(); }
    if (run.k9Fx <= 0) {
      run.k9Fx = 0;
      gameDog.position.set(GAME_DOG_HOME.x, GAME_DOG_HOME.y, GAME_DOG_HOME.z);
      gameDog.rotation.y = GAME_DOG_YAW;
      gameDogGlow.position.set(GAME_DOG_HOME.x, .38, GAME_DOG_HOME.z);
      gameDogGlow.material.opacity = .12;
      gameDogGlow.scale.setScalar(1.9);
      updateHUD(true);
    }
  }
}
function updatePowerTimers(dt) {
  if (!run) return;
  let changed = false;
  for (const k of Object.keys(run.powers)) {
    if (k === 'shield') continue;
    if (run.powers[k] > 0) {
      run.powers[k] -= dt;
      if (run.powers[k] <= 0) {
        delete run.powers[k];
        showEvent(`${POWER_DEFS[k].name} // ABGEKLUNGEN`);
        changed = true;
      }
    }
  }
  if (changed) updateHUD(true);
}
function updateGameplay(dt) {
  if (!run || !stage) return;
  if (run.comboTimer > 0) {
    run.comboTimer -= dt;
    if (run.comboTimer <= 0) {
      run.combo = 0; run.multiplier = 1;
    }
  }
  run.time += dt;
  // Roaming infected move across the playfield.
  for (const z of stage.zombies) {
    if (!z.alive) continue;
    const tt = simTime * z.speed + z.phase;
    const nx = clamp(z.baseX + Math.sin(tt) * .64, -2.55, 2.28);
    const nz = clamp(z.baseZ + Math.sin(tt * .47 + 1.3) * .28, -5.5, 2.0);
    const vx = nx - z.x;
    z.x = nx; z.z = nz;
    z.group.position.x = nx; z.group.position.z = nz;
    z.group.rotation.y = vx > 0 ? .1 : Math.PI - .1;
    const u = z.group.userData;
    u.body.position.y = Math.abs(Math.sin(tt * 1.7)) * .026;
    u.head.rotation.z = Math.sin(tt * .75) * .1;
    u.arms[0].rotation.x = Math.sin(tt * 1.1) * .11 + .04;
    u.arms[1].rotation.x = -Math.sin(tt * 1.1) * .11 - .03;
    u.legs[0].rotation.x = Math.sin(tt * 1.9) * .11;
    u.legs[1].rotation.x = -Math.sin(tt * 1.9) * .11;
    u.jaw.rotation.z = .08 + Math.sin(tt * 2.7) * .09;
  }
  // Expire loot after 17 seconds.
  stage.pickups = (stage.pickups || []).filter(pk => {
    if (pk.collected) return false;
    if (simTime - pk.bornAt > 17) { pk.group.visible = false; pk.group.removeFromParent(); return false; }
    return true;
  });
}

function updateGameWorldVisuals(dt, t) {
  if (!stage) return;
  // Bumpers.
  stage.bumpers.forEach((b, i) => {
    b.flash = Math.max(0, b.flash - dt * 3.6);
    const pulse = 1 + b.flash * .08;
    b.ring.scale.setScalar(pulse);
    b.ring.rotation.z += dt * (.5 + b.flash * 3);
    b.glow.material.opacity = .28 + b.flash * .55 + Math.sin(t * 2 + i) * .07;
    b.ring.material.emissiveIntensity = .9 + b.flash * 2.3;
    b.group.position.y = Math.sin(t * 1.3 + i) * .005;
  });
  // Pods.
  stage.pods.forEach((p, i) => {
    if (!p.alive) return;
    p.flash = Math.max(0, p.flash - dt * 4);
    p.group.position.y = Math.sin(t * 1.9 + i * 1.4) * .018;
    p.body.rotation.y += dt * .18;
    p.body.scale.x = 1 + Math.sin(t * 2.4 + i) * .018;
    p.core.rotation.y -= dt * .8; p.core.rotation.x += dt * .2;
    p.core.material.emissiveIntensity = 1.3 + p.flash * 2.5 + Math.sin(t * 3 + i) * .25;
    p.ring.rotation.z -= dt * (.4 + p.flash * 3);
    p.ring.material.opacity = .62 + p.flash * .3;
    p.glow.material.opacity = .4 + p.flash * .55;
  });
  // Uplinks.
  stage.relays.forEach((r, i) => {
    r.flash = Math.max(0, r.flash - dt * 4);
    r.ring.rotation.z += dt * (r.activated ? 4.5 : 1.3);
    r.ring.position.y = .5 + Math.sin(t * 2 + i) * .03;
    r.eye.scale.setScalar((r.activated ? 1.25 : 1) + Math.sin(t * 3 + i) * .06);
    r.glow.material.opacity = .3 + r.flash * .6 + (r.activated ? .3 : 0);
  });
  // Loot.
  (stage.pickups || []).forEach(pk => {
    pk.spin += dt * 1.4;
    pk.crystal.rotation.y = pk.spin; pk.crystal.rotation.x = .23 + Math.sin(t * 2 + pk.spin) * .16;
    pk.crystal.position.y = .55 + Math.sin(t * 2.6 + pk.spin) * .09;
    pk.icon.position.y = .61 + Math.sin(t * 2.6 + pk.spin) * .09;
    pk.ring.rotation.z -= dt * 2.2; pk.ring.scale.setScalar(1 + Math.sin(t * 3.4) * .06);
    pk.glow.material.opacity = .3 + Math.sin(t * 3.2 + pk.spin) * .14;
    pk.group.position.y = Math.sin(t * 1.8 + pk.spin) * .01;
  });
  // Drones.
  gameDrones.forEach((d, i) => {
    d.position.y = 2.5 + Math.sin(t * 1.2 + i * 2.1) * .09;
    d.rotation.y += dt * .06;
    d.children.forEach(arm => {
      if (arm.userData && arm.userData.rotor) arm.rotation.y += dt * 22;
      arm.children?.forEach(ch => { if (ch.userData && ch.userData.rotor) ch.rotation.y += dt * 22; });
    });
  });
  // Dachshund on the apron.
  const baseY = run && run.k9Fx > 0 ? gameDog.position.y : .18;
  if (gameDog) {
    const watchBall = balls.find(b => b.active && !b.held) || balls[0] || null;
    gameDog.userData.targetLook = watchBall ? clamp((watchBall.x - GAME_DOG_HOME.x) * .42, -.85, .85) : Math.sin(t * .37) * .18;
    if (watchBall && watchBall.z > 4.6 && !(run && run.k9Fx > 0)) gameDog.userData.excited = Math.max(gameDog.userData.excited, .35);
    gameDog.userData.update(dt, t, { baseY, audioBark: false, neckUp: .58 });
    if (!(run && run.k9Fx > 0)) {
      gameDog.position.x = GAME_DOG_HOME.x; gameDog.position.z = GAME_DOG_HOME.z; gameDog.position.y = GAME_DOG_HOME.y;
      gameDog.rotation.y = GAME_DOG_YAW + Math.sin(t * .4) * .05;
      gameDogGlow.position.set(GAME_DOG_HOME.x,.38,GAME_DOG_HOME.z);
    }
    gameDogGlow.material.opacity = .1 + Math.sin(t * 2.6) * .04 + (run?.k9Fx > 0 ? .2 : 0);
    gameDogGlow.scale.setScalar(1.85 + Math.sin(t * 2.6) * .12);
  }
  // Ball visuals and trails.
  const flame = run && run.powers.flame > 0;
  const ballColor = flame ? 0xff5c2a : 0x9dff32;
  for (const b of balls) {
    b.mesh.position.x = b.x; b.mesh.position.z = b.z;
    b.mesh.position.y = GAME_CONST.ballR + .02;
    b.sphere.rotation.x += b.vz * dt * 1.3;
    b.sphere.rotation.z -= b.vx * dt * 1.3;
    const pulse = 1 + Math.sin(t * 5 + b.x) * .08;
    b.glow.scale.setScalar((flame ? 1.15 : .98) * pulse);
    b.glow.material.color.setHex(ballColor);
    b.halo.scale.setScalar((flame ? 1.85 : 1.55) * (1 + Math.sin(t * 3.2 + b.z) * .05));
    b.halo.material.color.setHex(ballColor);
    b.halo.material.opacity = b.held ? .08 : .1 + Math.sin(t * 3.4) * .025;
    b.marker.visible = !b.held;
    b.marker.material.color.setHex(ballColor);
    b.marker.material.opacity = .28 + Math.sin(t * 6 + b.x) * .12;
    b.marker.scale.setScalar(1 + Math.sin(t * 4.5) * .14);
    b.light.color.setHex(ballColor);
    b.light.intensity = (flame ? 2.2 : 1.35) + Math.sin(t * 5) * .2;
    b.sphere.material.emissive.setHex(flame ? 0x8a2a00 : 0x3c641c);
    const trailAlpha = b.held ? 0 : .27;
    for (let i = b.trail.length - 1; i > 0; i--) {
      b.trail[i].position.copy(b.trail[i-1].position);
      b.trail[i].material.opacity *= .74;
      b.trail[i].material.color.setHex(ballColor);
    }
    b.trail[0].position.set(b.x, GAME_CONST.ballR + .03, b.z);
    b.trail[0].material.opacity = trailAlpha;
    b.trail[0].material.color.setHex(ballColor);
    b.trail.forEach(tr => { tr.visible = !b.held; });
    if (b.held) { b.mesh.position.x = b.x; b.mesh.position.z = b.z; }
  }
  // Ambient dust.
  if (ashGame) {
    const p = ashGame.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      p[i+1] -= dt * (.12 + (i % 5) * .015);
      if (p[i+1] < 0) { p[i+1] = 5; p[i] = rand(-5,5); p[i+2] = rand(-6,7); }
    }
    ashGame.geometry.attributes.position.needsUpdate = true;
  }
  // Sign bob.
  const sign = gameScene.userData.sectorSign;
  if (sign) sign.position.y = 2.95 + Math.sin(t * 1.4) * .025;
  // Rotating hazard beacons.
  gameBeacons.forEach((b, i) => {
    const pulse = .5 + .5 * Math.sin(t * 3.4 + b.phase);
    b.glow.material.opacity = .22 + pulse * .6;
    b.glow.scale.setScalar(1.3 + pulse * .4);
    b.lamp.material.color.setRGB(.55 + pulse * .45, .05, .09);
    b.lamp.scale.setScalar(.9 + pulse * .2);
  });
  if (particles) particles.userData.update(dt);
  updateEffects(dt);
  cameraShake = Math.max(0, cameraShake - dt * 2.6);
}

function updateHUD(force = false) {
  if (!run) return;
  const scoreText = run.score >= 1e6 ? (run.score / 1e6).toFixed(2).replace('.', ',') + 'M' : fmt(run.score);
  if (force || scoreText !== lastHud.score) { scoreVal.textContent = scoreText; lastHud.score = scoreText; }
  sectorVal.textContent = `SEKTOR ${String(run.stage).padStart(2, '0')}`;
  sectorName.textContent = stage ? stage.name : '';
  if (force || run.ballsLeft !== lastHud.balls) {
    ballPips.innerHTML = '';
    for (let i = 0; i < Math.max(run.diff.balls, run.ballsLeft); i++) {
      const p = document.createElement('div'); p.className = 'ball-pip' + (i < run.ballsLeft ? '' : ' empty'); ballPips.appendChild(p);
    }
    lastHud.balls = run.ballsLeft;
  }
  const mult = run.powers.overdrive ? 2 : 1;
  const shownMult = run.multiplier * mult;
  if (force || shownMult !== lastHud.combo) {
    comboPill.innerHTML = `<b>×${shownMult}</b> KETTE`;
    comboPill.classList.toggle('hot', shownMult >= 4);
    lastHud.combo = shownMult;
  }
  let obj = '';
  if (run.stageClearTimer > 0) obj = '<b>SEKTOR GESICHERT</b> // ÜBERGANG';
  else if (run.podDone >= run.podTotal) obj = '<b>BRUTKAPSELN 3/3</b>';
  else obj = `BRUTKAPSELN <b>${run.podDone}/${run.podTotal}</b> // K9 IM EINSATZ`;
  if (force || obj !== lastHud.obj) { objectiveEl.innerHTML = obj; lastHud.obj = obj; }
  const chips = [];
  for (const [k, v] of Object.entries(run.powers)) {
    if (v <= 0) continue;
    const d = POWER_DEFS[k]; if (!d) continue;
    const max = d.duration || 1;
    const p = k === 'shield' ? 1 : clamp(v / max, 0, 1);
    const remaining = k === 'shield' ? 'AKTIV' : Math.ceil(v) + 's';
    chips.push(`<div class="power-chip" style="--chip:#${new THREE.Color(d.color).getHexString()};--p:${p}"><i>${d.icon}</i>${d.short} ${remaining}</div>`);
  }
  const sig = chips.join('');
  if (force || sig !== lastHud.chips) {
    powerChips.innerHTML = chips.slice(0,4).join('');
    lastHud.chips = sig;
  }
  const held = balls.some(b => b.held && b.active);
  const canLaunch = state === 'game' && held && !(run.stageClearTimer > 0);
  const launchState = canLaunch ? 'ready' : (run.launched ? 'playing' : 'wait');
  if (force || launchState !== lastHud.launch) {
    launchBtn.disabled = !canLaunch;
    launchBtn.classList.toggle('ready', canLaunch);
    if (canLaunch) launchBtn.innerHTML = 'ABSCHUSS<small>TIPPEN ZUM STARTEN</small>';
    else if (launchState === 'playing') launchBtn.innerHTML = 'BALL IM SPIEL<small>FLÜGEL LINKS / RECHTS</small>';
    else launchBtn.innerHTML = 'K9 BEREIT<small>MOMENT …</small>';
    lastHud.launch = launchState;
  }
  const k = Math.round(run.k9);
  if (force || k !== lastHud.k9) {
    k9Fill.style.width = k + '%'; k9Pct.textContent = k + '%';
    k9Meter.classList.toggle('full', k >= 100);
    lastHud.k9 = k;
  }
}

/* ───────────────────────────── GAME FLOW ───────────────────────────── */
function startRun() {
  audio.init(); audio.setMode('game');
  closeModal();
  gameScreen.classList.add('active');
  menuScreen.classList.remove('active');
  showStage(gameStage);
  state = 'game';
  const diff = DIFFICULTIES[settings.difficulty] || DIFFICULTIES.veteran;
  run = {
    diff, seed: Math.floor(rand(1, 2147483000)), stage: 1, score: 0,
    ballsLeft: diff.balls, launched: false, combo: 0, multiplier: 1, comboTimer: 0,
    powers: {}, k9: 0, k9Fx: 0, k9Ready: 0, stageClearTimer: 0, shieldUntil: 0, time: 0,
    finished: false,
    stats: { hits: 0, maxCombo: 0, pods: 0, zombies: 0, powerups: 0, ballsLost: 0, maxMult: 1 }
  };
  lastHud = {};
  clearBalls();
  if (gameDog) { gameDog.position.set(GAME_DOG_HOME.x,GAME_DOG_HOME.y,GAME_DOG_HOME.z); gameDog.rotation.y=GAME_DOG_YAW; }
  simTime = 0;
  // Clear transient effects from a previous run.
  effects.length = 0;
  while (effectsGroup && effectsGroup.children.length) effectsGroup.remove(effectsGroup.children[0]);
  buildStage();
  loadBall();
  updateHUD(true);
  showEvent('EINSATZ BEGINNT // K9-WUMMI ONLINE');
  cameraShake = 0;
  resizeRenderer();
}
function finishRun() {
  if (!run || run.finished) return;
  run.finished = true;
  state = 'gameover';
  audio.gameover(); audio.setMode('menu');
  if (gameDog) gameDog.userData.excited = 1.5;
  const entry = {
    id: `${Date.now()}-${Math.floor(Math.random()*9999)}`,
    name: (settings.name || 'WUMMI').slice(0, 10).toUpperCase(),
    score: run.score, difficulty: run.diff.key, stage: run.stage,
    date: new Date().toISOString().slice(0, 10)
  };
  run.entry = entry;
  if (run.score > 0) {
    ranking.push(entry);
    persistRanking();
    run.rank = ranking.findIndex(r => r.id === entry.id);
  } else {
    run.rank = -1;
  }
  run.newRecord = run.rank === 0 && run.score > 0;
  setTimeout(() => { if (state === 'gameover') showGameOverModal(); }, 500);
}
function showStage(s) {
  activeStage = s;
  s.appendChild(glCanvas);
  resizeRenderer();
  if (s === gameStage) fitGameCamera();
}
function goMenu() {
  if (state === 'game' || state === 'paused') { /* quitting does not submit an unfinished run */ }
  closeModal();
  state = 'menu';
  run = null; stage = null;
  clearBalls();
  keys.left = false; keys.right = false;
  gameFlippers.forEach(f => { f.pressed = false; f.angle = f.restAngle; setFlipperAngle(f, f.angle); });
  gameScreen.classList.remove('active');
  menuScreen.classList.add('active');
  showStage(menuStage);
  audio.setMode('menu');
  updateBestScore();
  updateHUD(true);
}

/* ───────────────────────────── UI / MODALS ───────────────────────────── */
let modalCloseHandler = null;
let modalBackdropClose = false;
function openModal(html, opts = {}) {
  modalCard.className = 'modal-card' + (opts.danger ? ' danger' : '');
  modalCard.innerHTML = html;
  modalLayer.classList.remove('hidden');
  modalCloseHandler = opts.close || null;
  modalBackdropClose = !!opts.backdropClose;
  const closeBtn = modalCard.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    audio.ui();
    if (modalCloseHandler) modalCloseHandler(); else closeModal();
  });
}
function closeModal() {
  modalLayer.classList.add('hidden');
  modalCard.innerHTML = '';
  modalCloseHandler = null;
  modalBackdropClose = false;
}
modalLayer.addEventListener('click', (e) => {
  if (e.target === modalLayer && modalBackdropClose) {
    audio.ui();
    if (modalCloseHandler) modalCloseHandler(); else closeModal();
  }
});

function showEvent(text, color = '#a6ff32') {
  eventLine.textContent = text;
  eventLine.style.color = color;
  eventLine.classList.remove('show');
  void eventLine.offsetWidth;
  eventLine.classList.add('show');
}

function difficultyBadge(key) {
  const d = DIFFICULTIES[key] || DIFFICULTIES.veteran;
  return `<span class="badge" data-d="${key}">${d.name}</span>`;
}
function showRanking(onBack = null) {
  const rows = ranking.slice(0, 10).map((r, i) => `<tr>
    <td class="rank">${String(i+1).padStart(2,'0')}</td>
    <td class="name">${escapeHtml(r.name || 'WUMMI')}<br>${difficultyBadge(r.difficulty)}</td>
    <td class="score">${fmt(r.score)}<br><span style="font-size:.5rem;color:#7f9188;letter-spacing:.08em">SEKTOR ${String(r.stage||1).padStart(2,'0')}</span></td>
  </tr>`).join('');
  const html = `
    <div class="modal-kicker">ÜBERLEBENSNACHRICHT // LOKAL</div>
    <h2 class="modal-title">RANGLISTE</h2>
    <p class="modal-sub">Die zehn härtesten K9-Einsätze auf diesem Gerät. Punkte werden nach jedem Lauf gespeichert.</p>
    ${ranking.length ? `<table class="rank-table"><thead><tr><th>#</th><th>OPERATOR</th><th class="score">PUNKTE</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="rank-empty">NOCH KEINE EINTRÄGE</div>'}
    <div class="ranking-foot">BESTWERT: <strong style="color:#ffb32b">${padScore(ranking.reduce((m,r)=>Math.max(m,r.score),0))}</strong> · RANGLISTE WIRD LOKAL GESPEICHERT</div>
    <div class="modal-actions"><button class="btn-primary" id="rankingClose">ZURÜCK</button></div>
  `;
  openModal(html, {
    close: () => { closeModal(); if (onBack) onBack(); },
    backdropClose: true
  });
  $('#rankingClose').addEventListener('click', () => {
    audio.ui(); closeModal(); if (onBack) onBack();
  });
}
function showBriefing() {
  const html = `
    <div class="modal-kicker">K9-FELDHANDBUCH // 1.1.1</div>
    <h2 class="modal-title">BRIEFING</h2>
    <p class="modal-sub">Du steuerst K9-WUMMI, den letzten taktischen Dackel der Division. Halte die Brutkapseln unter Feuer, hol Verstärkung und überlebe so viele Sektoren wie möglich.</p>
    <div class="brief-list">
      <div class="brief-item"><div class="bi-icon">◀▶</div><div><b>Ein Finger, zwei Flügel</b><p>Tippe links oder rechts auf das Spielfeld, um den jeweiligen Flipper zu schlagen – oder nutze die beiden Flügel-Tasten unten. Halten hält den Flügel oben. Beim Abschuss genügt ein Tipp auf das Feld.</p></div></div>
      <div class="brief-item"><div class="bi-icon">◎</div><div><b>Brutkapseln zerstören</b><p>Jeder Sektor ist gesichert, wenn alle grünen Brutkapseln zerbrochen sind. Triff sie mehrfach, weiche Zombies aus und nutze Slingshots für Tempo.</p></div></div>
      <div class="brief-item"><div class="bi-icon">K9</div><div><b>K9-Wut</b><p>Treffer füllen die Wut-Leiste. Bei 100 % springt WUMMI persönlich auf das Feld und walzt die Horde nieder.</p></div></div>
      <div class="brief-item"><div class="bi-icon">▣</div><div><b>Power-ups</b><p>Zerbrochene Kapseln lassen Beute fallen: RUDEL (Multiball), SCHILD (Drain-Schutz), OVERDRIVE, ZEITLUPE, BRANDKUGEL, MAGNET und EMP.</p></div></div>
      <div class="brief-item"><div class="bi-icon">⌁</div><div><b>Sicherheitsteams</b><p>Triff die cyanfarbenen Funkmasten dreimal. Das Sicherheitsteam feuert einen Drohnen-Strike und räumt die Horde.</p></div></div>
      <div class="brief-item"><div class="bi-icon">☠</div><div><b>Drei Einsatzstufen</b><p>REKRUT ist verzeihend, VETERAN ist der Standard, ALBTRAUM ist schnell und gnadenlos. Höhere Stufen geben deutlich mehr Punkte.</p></div></div>
    </div>
    <div class="modal-actions"><button class="btn-primary" id="briefClose">VERSTANDEN</button></div>
    <div class="ranking-foot">ENTWICKELT VON BANDOS7 · MADE IN GERMANY · VERSION 1.1.1<br>ALLE GRAFIKEN UND SOUNDS WURDEN PROZEDURAL FÜR DIESES SPIEL ERZEUGT.</div>
  `;
  openModal(html, { close: closeModal, backdropClose: true });
  $('#briefClose').addEventListener('click', () => { audio.ui(); closeModal(); });
}
function showPause() {
  if (state !== 'game') return;
  state = 'paused';
  gameFlippers.forEach(f => setFlipperPressed(f.side, false));
  const html = `
    <div class="modal-kicker">EINSATZ ANGEHALTEN</div>
    <h2 class="modal-title">PAUSE</h2>
    <p class="modal-sub">K9-WUMMI hält die Stellung. Der aktuelle Lauf bleibt gespeichert, solange du nicht zum Hauptmenü zurückkehrst.</p>
    <div class="stat-grid">
      <div class="stat"><span>PUNKTE</span><b class="acid">${fmt(run?.score || 0)}</b></div>
      <div class="stat"><span>SEKTOR</span><b>${String(run?.stage || 1).padStart(2, '0')}</b></div>
    </div>
    <div class="modal-actions">
      <button class="btn-primary" id="resumeBtn">WEITERKÄMPFEN</button>
      <button class="btn-ghost" id="pauseSound">SOUND: ${settings.sound ? 'AN' : 'AUS'}</button>
      <div class="two-actions">
        <button class="btn-ghost" id="restartBtn">NEUSTART</button>
        <button class="btn-ghost" id="pauseMenuBtn">HAUPTMENÜ</button>
      </div>
    </div>
  `;
  openModal(html, {
    close: () => resumeGame(),
    backdropClose: true
  });
  $('#resumeBtn').addEventListener('click', resumeGame);
  $('#restartBtn').addEventListener('click', () => { audio.ui(); startRun(); });
  $('#pauseMenuBtn').addEventListener('click', () => { audio.ui(); goMenu(); });
  $('#pauseSound').addEventListener('click', () => {
    toggleSound();
    $('#pauseSound').textContent = 'SOUND: ' + (settings.sound ? 'AN' : 'AUS');
  });
}
function resumeGame() {
  if (state !== 'paused') return;
  closeModal(); state = 'game';
  audio.setMode('game');
}
function showGameOverModal() {
  if (!run) return;
  const pos = run.rank;
  const row = pos === 0 ? 'PLATZ #1' : pos > 0 ? `PLATZ #${pos + 1}` : 'NICHT IN DEN TOP 10';
  const html = `
    <div class="modal-kicker">SIGNALVERLUST // K9 OFFLINE</div>
    <h2 class="modal-title">EINSATZ<br>BEENDET</h2>
    <div class="gameover-score">${fmt(run.score)}</div>
    ${run.newRecord ? '<div class="new-record">NEUER K9-REKORD</div>' : ''}
    <p class="modal-sub">${run.score <= 0 ? 'Kein Punkte-Eintrag. Starte einen neuen Einsatz und zeig der Horde, wer hier das Sagen hat.' : run.newRecord ? 'Der Bunker hat einen neuen Helden. Trage deinen Operator-Namen in die Rangliste ein.' : `Du stehst auf ${row}. Mehr Kapseln, mehr Krawall.`}</p>
    <div class="name-row">
      <input class="name-input" id="rankName" maxlength="10" autocomplete="off" spellcheck="false" placeholder="OPERATOR" value="${escapeHtml((settings.name || 'WUMMI').toUpperCase())}">
      <button class="btn-primary" id="saveName">EINTRAGEN</button>
    </div>
    <div class="stat-grid">
      <div class="stat"><span>SEKTOR</span><b>${String(run.stage).padStart(2, '0')}</b></div>
      <div class="stat"><span>MAX. KETTE</span><b class="acid">×${run.stats.maxCombo}</b></div>
      <div class="stat"><span>KAPSELN</span><b>${run.stats.pods}</b></div>
      <div class="stat"><span>ZOMBIES</span><b>${run.stats.zombies}</b></div>
      <div class="stat"><span>POWER-UPS</span><b>${run.stats.powerups}</b></div>
      <div class="stat"><span>STUFE</span><b style="color:#ffb32b;font-size:.95rem">${run.diff.name}</b></div>
    </div>
    <div class="modal-actions">
      <button class="btn-primary" id="rematchBtn">NOCHMAL EINSATZ</button>
      <div class="two-actions">
        <button class="btn-ghost" id="goRankBtn">RANGLISTE</button>
        <button class="btn-ghost" id="goMenuBtn">HAUPTMENÜ</button>
      </div>
    </div>
    <div class="ranking-foot">ENTWICKELT VON BANDOS7 · MADE IN GERMANY · v1.1.1</div>
  `;
  openModal(html, { danger: true, backdropClose: false });
  const input = $('#rankName');
  const commitName = () => {
    const name = (input.value.trim().toUpperCase() || 'WUMMI').slice(0, 10);
    settings.name = name; saveSettings();
    if (run.entry) { run.entry.name = name; persistRanking(); }
    updateBestScore();
  };
  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9ÄÖÜß _-]/g, '').slice(0, 10);
  });
  $('#saveName').addEventListener('click', () => {
    commitName(); audio.powerup(); showEvent('RANGLISTE AKTUALISIERT');
    $('#saveName').textContent = 'GESPEICHERT';
  });
  $('#rematchBtn').addEventListener('click', () => { commitName(); audio.ui(); startRun(); });
  $('#goRankBtn').addEventListener('click', () => {
    commitName(); audio.ui();
    showRanking(() => { if (state === 'gameover') showGameOverModal(); });
  });
  $('#goMenuBtn').addEventListener('click', () => { commitName(); audio.ui(); goMenu(); });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toggleSound() {
  settings.sound = !settings.sound; saveSettings();
  audio.init(); audio.setMuted(!settings.sound);
  ['#menuSoundBtn','#gameSoundBtn'].forEach(id => {
    const b = $(id); if (b) b.classList.toggle('is-muted', !settings.sound);
  });
  if (settings.sound) { audio.setMode(state === 'game' ? 'game' : 'menu'); audio.ui(); }
}
function applyDifficultyUI() {
  $$('.diff-btn').forEach(b => b.classList.toggle('selected', b.dataset.diff === settings.difficulty));
  const d = DIFFICULTIES[settings.difficulty] || DIFFICULTIES.veteran;
  difficultyReadout.textContent = d.name;
}
function setDifficulty(key) {
  if (!DIFFICULTIES[key]) return;
  settings.difficulty = key; saveSettings(); applyDifficultyUI(); audio.ui();
  if (menuDog) menuDog.userData.excited = 1;
}

/* ───────────────────────────── INPUT ───────────────────────────── */
const keys = { left: false, right: false };
function setFlipperPressed(side, down) {
  const f = gameFlippers[side < 0 ? 0 : 1];
  if (!f) return;
  const changed = f.pressed !== down;
  f.pressed = down;
  if (side < 0) leftBtn.classList.toggle('pressed', down); else rightBtn.classList.toggle('pressed', down);
  if (down && changed && state === 'game' && !(run && run.stageClearTimer > 0)) {
    audio.flipper(); buzz(7);
  }
}
function pressFlipper(side, down) {
  if (state !== 'game') return;
  if (side < 0) keys.left = down; else keys.right = down;
  setFlipperPressed(side, down);
}
function setupButtonHold(btn, side) {
  let pointerId = null;
  const down = (e) => {
    e.preventDefault();
    pointerId = e.pointerId;
    try { btn.setPointerCapture(pointerId); } catch (_) {}
    audio.init();
    pressFlipper(side, true);
  };
  const up = (e) => {
    if (pointerId != null && e.pointerId !== pointerId) return;
    pointerId = null;
    pressFlipper(side, false);
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
setupButtonHold(leftBtn, -1);
setupButtonHold(rightBtn, 1);

// One-finger playfield controls: tap/hold either half of the visible table.
$$('.field-zone').forEach(zone => {
  const side = Number(zone.dataset.side);
  let pointerId = null;
  let flipped = false;
  const down = (e) => {
    if (state !== 'game') return;
    e.preventDefault();
    audio.init();
    pointerId = e.pointerId;
    zone.classList.add('active');
    try { zone.setPointerCapture(pointerId); } catch (_) {}
    const held = run && run.stageClearTimer <= 0 && balls.some(b => b.held && b.active);
    if (held) {
      launchBall();
    } else {
      pressFlipper(side, true);
      flipped = true;
    }
  };
  const up = (e) => {
    if (pointerId != null && e.pointerId !== pointerId) return;
    pointerId = null;
    zone.classList.remove('active');
    if (flipped) pressFlipper(side, false);
    flipped = false;
  };
  zone.addEventListener('pointerdown', down);
  zone.addEventListener('pointerup', up);
  zone.addEventListener('pointercancel', up);
  zone.addEventListener('lostpointercapture', up);
  zone.addEventListener('contextmenu', e => e.preventDefault());
});

launchBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); audio.init();
  if (state === 'game') launchBall();
});
launchBtn.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('pointerdown', () => {
  audio.init();
  if (audio.muted) audio.setMuted(true);
}, { passive: true });

document.addEventListener('keydown', (e) => {
  audio.init();
  if (e.code === 'Escape') {
    if (!modalLayer.classList.contains('hidden')) {
      if (modalCloseHandler) modalCloseHandler();
      return;
    }
    if (state === 'game') showPause();
    else if (state === 'paused') resumeGame();
    return;
  }
  if (state !== 'game') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); pressFlipper(-1, true); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); pressFlipper(1, true); }
  if (e.code === 'Space') { e.preventDefault(); launchBall(); }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') pressFlipper(-1, false);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') pressFlipper(1, false);
});
window.addEventListener('blur', () => { pressFlipper(-1, false); pressFlipper(1, false); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'game') showPause();
});

$('#startBtn').addEventListener('click', () => { audio.init(); audio.ui(); startRun(); });
$$('.diff-btn').forEach(btn => btn.addEventListener('click', () => setDifficulty(btn.dataset.diff)));
$('#rankingBtn').addEventListener('click', () => { audio.ui(); showRanking(); });
$('#briefingBtn').addEventListener('click', () => { audio.ui(); showBriefing(); });
$('#menuBriefBtn').addEventListener('click', () => { audio.ui(); showBriefing(); });
$('#menuSoundBtn').addEventListener('click', toggleSound);
$('#gameSoundBtn').addEventListener('click', toggleSound);
$('#pauseBtn').addEventListener('click', () => { audio.ui(); showPause(); });
$('#startBtn').addEventListener('pointerdown', () => audio.init(), { passive: true });
$('#menuSoundBtn').classList.toggle('is-muted', !settings.sound);
$('#gameSoundBtn').classList.toggle('is-muted', !settings.sound);

// Main-menu pointer look: the dachshund follows the finger.
let menuPointerX = 0;
app.addEventListener('pointermove', (e) => {
  if (state !== 'menu') return;
  const r = app.getBoundingClientRect();
  menuPointerX = clamp(((e.clientX - r.left) / r.width - .5) * 1.3, -.65, .65);
}, { passive: true });

/* ───────────────────────────── FRAME LOOP / INIT ───────────────────────────── */
let lastFrame = performance.now();
let hudClock = 0;
function frame(now) {
  const dt = Math.min(.045, Math.max(.001, (now - lastFrame) / 1000));
  lastFrame = now;
  const t = now / 1000;
  if (state === 'menu') {
    updateMenuScene(dt, t);
    renderer.render(menuScene, menuCamera);
  } else {
    if (state === 'game' && run && stage) updateGame(dt, t);
    else if (state === 'gameover') {
      // Keep the last arena frame alive behind the debrief screen.
      if (stage) updateEffects(dt);
    }
    if (gameCamera) {
      gameCamera.position.copy(gameCameraBase);
      if (cameraShake > 0 && state === 'game') {
        gameCamera.position.x += (Math.random() - .5) * cameraShake * .22;
        gameCamera.position.y += (Math.random() - .5) * cameraShake * .13;
        gameCamera.position.z += (Math.random() - .5) * cameraShake * .18;
      }
      gameCamera.lookAt(gameTarget);
      gameCamera.updateMatrixWorld();
    }
    renderer.render(gameScene, gameCamera);
  }
  audio.update(t);
  requestAnimationFrame(frame);
}

function updateGame(dt, t) {
  if (!run || !stage) return;
  if (run.stageClearTimer > 0) {
    run.stageClearTimer -= dt;
    if (run.stageClearTimer <= 0) clearStageThenNext();
  } else {
    const scale = run.powers.slow > 0 ? .62 : 1;
    const simDt = dt * scale;
    const substeps = 4;
    for (let i = 0; i < substeps; i++) physicsStep(simDt / substeps);
    simTime += simDt;
    updatePowerTimers(dt);
    updateGameplay(dt);
  }
  updateK9(dt, t);
  updateGameWorldVisuals(dt, t);
  hudClock += dt;
  if (hudClock > .1) { updateHUD(); hudClock = 0; }
}

function init() {
  applyUiScale();
  showStage(menuStage);
  buildMenuScene();
  buildGameScene();
  resizeRenderer();
  updateBestScore();
  applyDifficultyUI();
  $('#menuSoundBtn').classList.toggle('is-muted', !settings.sound);
  $('#gameSoundBtn').classList.toggle('is-muted', !settings.sound);
  // A hint on the table if the player has been idle too long, then a quiet bark.
  setTimeout(() => { if (state === 'menu') menuDog.userData.excited = .6; }, 6000);
  requestAnimationFrame(frame);
}

// Public, deliberately small developer/debug surface. Useful for automated QA too.
window.WUMMI = {
  start: () => startRun(),
  menu: () => goMenu(),
  pause: () => showPause(),
  ranking: () => showRanking(),
  difficulty: (key) => { if (DIFFICULTIES[key]) { settings.difficulty = key; saveSettings(); applyDifficultyUI(); } },
  state: () => state,
  version: '1.1.1',
  developer: 'BANDOS7',
  press: (side, down = true) => pressFlipper(side, down),
  launch: () => launchBall(),
  score: () => run ? run.score : 0,
  stage: () => run ? run.stage : 0,
  forceK9: () => triggerK9(),
  power: (type) => addPower(type),
  spawnPickup: (type = 'shield') => {
    if (!run || !stage) return null;
    const b = balls.find(x => !x.held && x.active) || balls[0];
    const pk = makePickup(type, b ? b.x : 0, b ? b.z : 2);
    pk.bornAt = simTime; dynamicGroup.add(pk.group); stage.pickups.push(pk);
    return { x: pk.x, z: pk.z, type };
  },
  drain: () => {
    const b = balls.find(x => x.active && !x.held);
    if (!b) return false;
    b.z = GAME_CONST.drainZ + .02; b.vz = Math.max(2, b.vz);
    return true;
  },
  addScore: (n = 0) => { if (run) { run.score += Math.max(0, Math.round(n)); updateHUD(true); } },
  end: () => finishRun(),
  snapshot: () => run ? {
    state, stage: run.stage, score: run.score, launched: run.launched, podDone: run.podDone,
    podTotal: run.podTotal, stageClearTimer: run.stageClearTimer, k9Fx: run.k9Fx,
    pods: stage ? stage.pods.map(p => ({ hp: p.hp, alive: p.alive })) : [],
    stats: { ...run.stats },
    balls: balls.map(b => ({ x:+b.x.toFixed(2), z:+b.z.toFixed(2), vx:+b.vx.toFixed(2), vz:+b.vz.toFixed(2), held:b.held, active:b.active }))
  } : null
};

init();
})();
