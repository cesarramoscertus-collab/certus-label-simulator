// Procedural ambience (no audio files): distant traffic rumble, light breeze, occasional birds,
// plus small interface sounds. Everything is synthesized with Web Audio so the build has no assets to load.

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let birdTimer: number | null = null;
let carTimer: number | null = null;
let muted = false;

function noiseBuffer(ctx: AudioContext, seconds: number, brown = false) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

export function startAmbient() {
  if (ac) { ac.resume(); return; }
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return;
  ac = new Ctor();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ac.destination);

  // traffic / city rumble
  const rumble = ac.createBufferSource();
  rumble.buffer = noiseBuffer(ac, 6, true);
  rumble.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const rg = ac.createGain(); rg.gain.value = 0.16;
  rumble.connect(lp).connect(rg).connect(master);
  rumble.start();

  // breeze: band-passed white noise with slow swell
  const wind = ac.createBufferSource();
  wind.buffer = noiseBuffer(ac, 5);
  wind.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
  const wg = ac.createGain(); wg.gain.value = 0.018;
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ac.createGain(); lfoG.gain.value = 0.012;
  lfo.connect(lfoG).connect(wg.gain);
  wind.connect(bp).connect(wg).connect(master);
  wind.start(); lfo.start();

  const scheduleBird = () => {
    birdTimer = window.setTimeout(() => { chirp(); scheduleBird(); }, 5000 + Math.random() * 11000);
  };
  const scheduleCar = () => {
    carTimer = window.setTimeout(() => { carPass(); scheduleCar(); }, 14000 + Math.random() * 20000);
  };
  scheduleBird();
  scheduleCar();
}

function chirp() {
  if (!ac || !master) return;
  const n = 2 + Math.floor(Math.random() * 3);
  const base = 2600 + Math.random() * 1400;
  for (let i = 0; i < n; i++) {
    const t = ac.currentTime + i * 0.13;
    const o = ac.createOscillator(); o.type = 'sine';
    const g = ac.createGain();
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    const pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8;
    o.connect(g).connect(pan).connect(master);
    o.start(t); o.stop(t + 0.12);
  }
}

function carPass() {
  if (!ac || !master) return;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 5, true);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  const g = ac.createGain();
  const pan = ac.createStereoPanner();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 2.2);
  g.gain.linearRampToValueAtTime(0, t + 4.8);
  pan.pan.setValueAtTime(-0.9, t);
  pan.pan.linearRampToValueAtTime(0.9, t + 4.8);
  src.connect(lp).connect(g).connect(pan).connect(master);
  src.start(t); src.stop(t + 5);
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ac) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.15);
}

export function stopAmbient() {
  if (birdTimer) clearTimeout(birdTimer);
  if (carTimer) clearTimeout(carTimer);
  ac?.close(); ac = null; master = null;
}

type Sfx = 'pickup' | 'putdown' | 'note' | 'message' | 'send' | 'tablet';

export function sfx(kind: Sfx) {
  if (!ac || !master || muted) return;
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(master);
  if (kind === 'pickup' || kind === 'putdown') {
    // soft plastic "tock"
    const src = ac.createBufferSource(); src.buffer = noiseBuffer(ac, 0.12);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'pickup' ? 1400 : 700; bp.Q.value = 2.5;
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(bp).connect(g); src.start(t);
    return;
  }
  const o = ac.createOscillator(); o.type = 'sine';
  const notes: Record<string, [number, number, number]> = {
    note: [880, 1320, 0.035], message: [660, 990, 0.03], send: [520, 600, 0.02], tablet: [740, 740, 0.02],
  };
  const [f0, f1, vol] = notes[kind];
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); o.start(t); o.stop(t + 0.25);
}
