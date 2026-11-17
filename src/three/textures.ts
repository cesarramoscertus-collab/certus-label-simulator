// Procedurally generated surface textures (no image downloads): asphalt, concrete, diamond plate,
// rubber mat, and CERTUS truck graphics.
import * as THREE from 'three';
import { makeCanvas, rng, NAVY, TEAL, FONT } from '../content/labelKit';

const cache = new Map<string, THREE.Texture>();

function tex(key: string, make: () => HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  if (cache.has(key)) return cache.get(key)!;
  const t = new THREE.CanvasTexture(make());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(...opts.repeat);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

function speckle(ctx: CanvasRenderingContext2D, n: number, size: number, colors: string[], seed: number, W: number, H: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size * (0.4 + r());
    ctx.fillRect(r() * W, r() * H, s, s);
  }
}

export function asphalt() {
  return tex('asphalt', () => {
    const c = makeCanvas(1024, 1024); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#4a4c4f'; ctx.fillRect(0, 0, 1024, 1024);
    speckle(ctx, 60000, 2.2, ['#3c3e41', '#56585b', '#5f6164', '#424448', '#6b6a66'], 3, 1024, 1024);
    // patch stains
    const r = rng(9);
    for (let i = 0; i < 14; i++) {
      const g = ctx.createRadialGradient(r() * 1024, r() * 1024, 0, 0, 0, 0);
      void g;
      ctx.fillStyle = `rgba(30,30,32,${0.05 + r() * 0.07})`;
      ctx.beginPath(); ctx.ellipse(r() * 1024, r() * 1024, 40 + r() * 140, 30 + r() * 90, r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    return c;
  }, { repeat: [14, 14] });
}

export function asphaltBump() {
  return tex('asphaltBump', () => {
    const c = makeCanvas(512, 512); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
    speckle(ctx, 30000, 2, ['#5a5a5a', '#a0a0a0', '#707070', '#b8b8b8'], 5, 512, 512);
    return c;
  }, { repeat: [28, 28], srgb: false });
}

export function concrete() {
  return tex('concrete', () => {
    const c = makeCanvas(1024, 1024); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c9c4ba'; ctx.fillRect(0, 0, 1024, 1024);
    speckle(ctx, 40000, 2, ['#bfb9ae', '#d2cdc4', '#b5afa4', '#ccc6bc'], 7, 1024, 1024);
    // tilt-up panel joints
    ctx.fillStyle = '#9d978d';
    for (let x = 0; x <= 1024; x += 256) ctx.fillRect(x - 2, 0, 4, 1024);
    // reveal lines
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 300, 1024, 10);
    return c;
  }, { repeat: [4, 1] });
}

export function diamondPlate() {
  return tex('diamond', () => {
    const c = makeCanvas(512, 512); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#7d7d7d'; ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      for (let x = 0; x < 512; x += 32) {
        const ox = (y / 32) % 2 ? 16 : 0;
        ctx.save();
        ctx.translate(x + ox + 8, y + 16);
        ctx.rotate(((x + y) / 32) % 2 ? 0.75 : -0.75);
        const g = ctx.createLinearGradient(-10, 0, 10, 0);
        g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.5, '#e8e8e8'); g.addColorStop(1, '#5a5a5a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    return c;
  }, { repeat: [5, 8], srgb: false });
}

export function rubberMat() {
  return tex('mat', () => {
    const c = makeCanvas(512, 512); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#1b1d1f'; ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = '#121314'; ctx.fillRect(x, 0, 6, 512);
      ctx.fillStyle = '#25282a'; ctx.fillRect(x + 6, 0, 2, 512);
    }
    speckle(ctx, 4000, 1.5, ['#2a2d30', '#17191b'], 13, 512, 512);
    return c;
  }, { repeat: [3, 2] });
}

export function matBump() {
  return tex('matBump', () => {
    const c = makeCanvas(256, 256); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) { ctx.fillStyle = '#404040'; ctx.fillRect(x, 0, 3, 256); }
    return c;
  }, { repeat: [6, 4], srgb: false });
}

export function truckDecal() {
  return tex('decal', () => {
    const c = makeCanvas(2048, 1024); const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 2048, 1024);
    // swoosh band
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.moveTo(0, 640); ctx.bezierCurveTo(700, 520, 1300, 780, 2048, 600); ctx.lineTo(2048, 1024); ctx.lineTo(0, 1024); ctx.fill();
    ctx.fillStyle = TEAL;
    ctx.beginPath(); ctx.moveTo(0, 600); ctx.bezierCurveTo(700, 480, 1300, 740, 2048, 560); ctx.lineTo(2048, 600); ctx.bezierCurveTo(1300, 780, 700, 520, 0, 640); ctx.fill();
    // wordmark
    ctx.fillStyle = NAVY;
    ctx.font = `800 300px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('CERTUS', 1024, 420);
    ctx.fillStyle = TEAL;
    ctx.fillRect(724, 455, 600, 14);
    ctx.fillStyle = NAVY;
    ctx.font = `600 72px ${FONT}`;
    ctx.fillText('PEST CONTROL', 1024, 545);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 64px ${FONT}`;
    ctx.fillText('Elite Technician Fleet · Unit 27', 1024, 900);
    return c;
  });
}

export function shelfBinLabel(text: string) {
  return tex('bin:' + text, () => {
    const c = makeCanvas(512, 128); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f3f5f6'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = NAVY; ctx.font = `700 54px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(text, 256, 84);
    return c;
  });
}

export function facilitySign() {
  return tex('facilitySign', () => {
    const c = makeCanvas(2048, 384); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2f3740'; ctx.fillRect(0, 0, 2048, 384);
    ctx.fillStyle = '#e9edf0'; ctx.font = `700 170px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('LAKEVIEW COMMERCE CENTER', 1024, 250);
    return c;
  });
}

export function windowTex() {
  return tex('window', () => {
    const c = makeCanvas(256, 256); const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#7f9cb0'); g.addColorStop(0.5, '#3d5566'); g.addColorStop(1, '#25333d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(110, 0); ctx.lineTo(0, 140); ctx.lineTo(0, 40); ctx.fill();
    return c;
  });
}
