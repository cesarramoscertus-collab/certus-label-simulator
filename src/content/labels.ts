// Draws the 3D label textures from the shared copy in labelCopy.ts.
// Section rectangles are recorded in *logical* label pixels so taps on the 3D model map back to
// the exact section, independent of the texture resolution chosen for the device.

import {
  NAVY, TEAL, TEAL_DEEP, INK, MUTED, FONT,
  Writer, makeCanvas, barcode, roundRect, drawAnt, drawRoach,
  type LabelSection,
} from './labelKit';
import { A_PANELS, B_PANELS, DISCLAIMER, SIZE_PX, type Block, type PanelCopy, type Size } from './labelCopy';

export interface ProductLabel {
  faces: HTMLCanvasElement[];
  dims: [number, number][]; // logical size of each face
  sections: LabelSection[];
}

function trainingStrip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = NAVY; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = TEAL; ctx.fillRect(x, y, w, 5);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(h * 0.42)}px ${FONT}`;
  ctx.textBaseline = 'middle';
  const text = DISCLAIMER.replace(/ · /g, '  ·  ');
  const tw = ctx.measureText(text + '      ').width;
  for (let px = x + 20; px < x + w; px += tw) ctx.fillText(text, px, y + h / 2 + 3);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

const COLOR = { navy: NAVY, ink: INK, teal: TEAL_DEEP };

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, max: number, width: number) {
  let size = max;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > width && size > 10) { size -= 2; ctx.font = `${weight} ${size}px ${FONT}`; }
  return size;
}

function drawBlock(w: Writer, b: Block, unit: number, onHero: boolean) {
  const { ctx } = w;
  const px = (s: Size = 'body') => Math.round(SIZE_PX[s] * unit);
  switch (b.k) {
    case 'gap': w.gap(b.n * unit); break;
    case 'band':
      w.band(b.text, px(b.size ?? 'band'), b.tone === 'teal' ? TEAL : NAVY, b.tone === 'teal' ? NAVY : '#fff');
      break;
    case 'h': {
      let color = COLOR[b.color ?? 'navy'];
      if (onHero) color = b.color === 'teal' ? TEAL : '#fff';
      // long headings wrap like paragraphs
      ctx.font = `700 ${px(b.size ?? 'h')}px ${FONT}`;
      if (ctx.measureText(b.text).width > w.w) {
        w.para(`**${b.text}**`, px(b.size ?? 'h'), color, { align: b.align, lineH: Math.round(px(b.size ?? 'h') * 1.12) });
        if (b.rule) { ctx.fillStyle = TEAL; ctx.fillRect(w.x, w.y - 6, w.w, 5 * unit); w.gap(14 * unit); }
      } else {
        w.heading(b.text, px(b.size ?? 'h'), color, { align: b.align, rule: b.rule, tracking: b.tracking ? 3 * unit : undefined });
      }
      break;
    }
    case 'p':
      w.para(b.italic ? `*${b.text}*` : b.text, px(b.size), onHero ? '#fff' : b.muted ? MUTED : INK, { bold: b.bold, align: b.align });
      break;
    case 'ul': w.bullets(b.items, px(b.size)); break;
    case 'rows': {
      const y0 = w.y;
      w.gap(18 * unit);
      const inner = new Writer(ctx, w.face, w.panel, w.x + 26 * unit, w.y, w.w - 52 * unit, []);
      for (const [l, r, bold] of b.rows) inner.leaderRow(l, r, px('body') + 2 * unit, !!bold);
      inner.para(b.note, px('xs'), MUTED);
      w.y = inner.y + 6 * unit;
      ctx.strokeStyle = NAVY; ctx.lineWidth = 5 * unit;
      roundRect(ctx, w.x, y0, w.w, w.y - y0, 10 * unit); ctx.stroke();
      w.y += 24 * unit;
      break;
    }
    case 'barcode':
      barcode(ctx, w.x, w.y + 10, Math.min(420 * unit, w.w), 150 * unit, b.caption.length * 7, b.caption);
      w.y += 220 * unit;
      break;
    case 'brand':
      if (b.product === 'A') {
        ctx.fillStyle = NAVY; ctx.font = `800 132px ${FONT}`;
        ctx.fillText('Perimeter', w.x - 4, w.y + 112);
        w.y += 132;
        ctx.fillText('Guard', w.x - 4, w.y + 112);
        const gw = ctx.measureText('Guard').width;
        ctx.fillStyle = TEAL; roundRect(ctx, w.x + gw + 22, w.y + 14, 168, 110, 12); ctx.fill();
        ctx.fillStyle = NAVY; ctx.font = `800 88px ${FONT}`;
        ctx.fillText('SC', w.x + gw + 46, w.y + 102);
        w.y += 150;
      } else {
        const size = fitFont(ctx, 'InteriorGuard', 800, 200, w.w);
        ctx.fillStyle = '#fff'; ctx.fillText('InteriorGuard', w.x - 4, w.y + size * 0.86);
        w.y += size * 1.12;
        const bh = size * 0.68;
        ctx.fillStyle = TEAL; roundRect(ctx, w.x, w.y, bh * 2.3, bh, 14); ctx.fill();
        ctx.fillStyle = NAVY; ctx.font = `800 ${Math.round(bh * 0.76)}px ${FONT}`; ctx.fillText('GEL', w.x + bh * 0.36, w.y + bh * 0.78);
        ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(bh * 0.36)}px ${FONT}`;
        ctx.fillText('INSECTICIDE GEL BAIT', w.x + bh * 2.55, w.y + bh * 0.46);
        ctx.font = `400 ${Math.round(bh * 0.3)}px ${FONT}`;
        ctx.fillText('Crack & crevice formulation', w.x + bh * 2.55, w.y + bh * 0.86);
        w.y += bh + 40;
      }
      break;
    case 'tube': {
      const L = w.w * 0.7; const H = L * 0.1;
      ctx.save(); ctx.translate(w.x + w.w * 0.15, w.y + 40);
      ctx.fillStyle = '#e9f1f4'; roundRect(ctx, 0, 0, L, H, H / 2); ctx.fill();
      ctx.fillStyle = TEAL; roundRect(ctx, L * 0.17, H * 0.08, L * 0.64, H * 0.84, 16); ctx.fill();
      ctx.fillStyle = NAVY; ctx.fillRect(L, H * 0.32, L * 0.18, H * 0.36); ctx.fillRect(-L * 0.15, H * 0.25, L * 0.15, H * 0.5); ctx.fillRect(-L * 0.19, 0, L * 0.05, H);
      ctx.fillStyle = NAVY; ctx.font = `700 ${Math.round(H * 0.42)}px ${FONT}`; ctx.fillText('InteriorGuard Gel', L * 0.22, H * 0.64);
      ctx.restore();
      w.y += H + 120;
      break;
    }
    case 'pests': {
      const h = b.product === 'A' ? 230 : 300 * unit / 1.25;
      ctx.fillStyle = '#eef7f8'; roundRect(ctx, w.x, w.y, w.w, h, 16); ctx.fill();
      if (b.product === 'A') {
        ctx.strokeStyle = TEAL_DEEP; ctx.lineWidth = 10; ctx.setLineDash([22, 14]);
        ctx.strokeRect(w.x + 40, w.y + 42, 250, 150); ctx.setLineDash([]);
        ctx.fillStyle = NAVY; ctx.fillRect(w.x + 78, w.y + 76, 174, 84);
        ctx.fillStyle = '#fff'; ctx.fillRect(w.x + 150, w.y + 116, 30, 44);
        drawAnt(ctx, w.x + 380, w.y + 82, 90, NAVY);
        drawAnt(ctx, w.x + 520, w.y + 150, 70, NAVY);
        ctx.fillStyle = NAVY; ctx.font = `700 40px ${FONT}`;
        b.lines.forEach((l, i) => ctx.fillText(l, w.x + 600, w.y + 96 + i * 46));
      } else {
        drawAnt(ctx, w.x + h * 0.6, w.y + h / 2, h * 0.62, NAVY);
        drawRoach(ctx, w.x + h * 1.8, w.y + h / 2, h * 0.68, NAVY);
        const fs = fitFont(ctx, b.lines[1], 700, h * 0.24, w.w - h * 2.6);
        ctx.fillStyle = NAVY;
        b.lines.forEach((l, i) => ctx.fillText(l, w.x + h * 2.6, w.y + h * 0.44 + i * fs * 1.2));
      }
      w.y += h + 22;
      break;
    }
  }
}

function drawPanel(ctx: CanvasRenderingContext2D, panel: PanelCopy, x: number, y: number, width: number, unit: number, sections: LabelSection[]) {
  const w = new Writer(ctx, panel.face, panel.name, x, y, width, sections);
  for (const s of panel.sections) {
    const y0 = w.y;
    w.begin(s.id, s.title, s.evidence);
    for (const b of s.blocks) drawBlock(w, b, unit, !!panel.hero && s.id.endsWith('_front'));
    w.end();
    if (s.box) { ctx.strokeStyle = NAVY; ctx.lineWidth = 6 * unit; ctx.strokeRect(w.x - 14 * unit, y0, w.w + 28 * unit, w.y - y0 + 4); }
    w.gap(10 * unit);
  }
  return w.y;
}

// ───────────────────────── PRODUCT A: one wrap canvas [Left | Front | Right | Back] ─────────────────────────
export const A_LABEL_W = 4096;
export const A_LABEL_H = 1888;
const A_SLOT: Record<string, number> = { A_left_panel: 0, A_front_panel: 1, A_right_panel: 2, A_back_panel: 3 };

/** res < 1 renders a lighter texture for phones (reading happens in the flat view there). */
export function buildPerimeterGuard(res = 1): ProductLabel {
  const canvas = makeCanvas(Math.round(A_LABEL_W * res), Math.round(A_LABEL_H * res));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(res, res);
  const sections: LabelSection[] = [];
  const P = 1024; const M = 74; const BOT = A_LABEL_H - 70;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, A_LABEL_W, A_LABEL_H);
  ctx.fillStyle = 'rgba(3,44,69,0.025)';
  for (let i = 0; i < 9000; i++) ctx.fillRect((i * 7919) % A_LABEL_W, (i * 104729) % A_LABEL_H, 2, 2);
  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, A_LABEL_W, 64);
  ctx.fillStyle = TEAL; ctx.fillRect(0, 64, A_LABEL_W, 10);
  trainingStrip(ctx, 0, BOT, A_LABEL_W, 70);
  ctx.fillStyle = '#e3eaee';
  for (let i = 1; i < 4; i++) ctx.fillRect(i * P - 2, 90, 4, BOT - 110);
  for (const panel of A_PANELS) drawPanel(ctx, panel, A_SLOT[panel.id] * P + M, 120, P - M * 2, 1, sections);
  return { faces: [canvas], dims: [[A_LABEL_W, A_LABEL_H]], sections };
}

// ───────────────────────── PRODUCT B: carton faces ─────────────────────────
export const CARTON = { w: 0.15, h: 0.21, d: 0.06 };
const PX_PER_M = 13660;
export const B_DIMS: [number, number][] = ([
  [CARTON.d, CARTON.h], [CARTON.d, CARTON.h], [CARTON.w, CARTON.d], [CARTON.w, CARTON.d], [CARTON.w, CARTON.h], [CARTON.w, CARTON.h],
] as [number, number][]).map(([a, b]) => [Math.round(a * PX_PER_M), Math.round(b * PX_PER_M)]);

/** Per-face layout: S = drawing scale, unit = type scale, M = margin (in scaled units). */
const B_LAYOUT: Record<number, { S: number; unit: number; M: number }> = {
  4: { S: 1.26, unit: 1.3, M: 110 }, 5: { S: 1.28, unit: 1.42, M: 110 }, 0: { S: 1.5, unit: 1.18, M: 60 }, 1: { S: 1.5, unit: 1.18, M: 60 },
};

export function buildInteriorGuard(res = 1): ProductLabel {
  const sections: LabelSection[] = [];
  const faces = B_DIMS.map(([w, h]) => makeCanvas(Math.round(w * res), Math.round(h * res)));

  for (const panel of B_PANELS) {
    const f = panel.face; const { S, unit, M } = B_LAYOUT[f];
    const ctx = faces[f].getContext('2d')!;
    const [LW, LH] = B_DIMS[f];
    ctx.save();
    ctx.scale(res * S, res * S);
    const W = LW / S; const H = LH / S;
    const n0 = sections.length;
    if (!panel.hero) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 40); ctx.fillStyle = TEAL; ctx.fillRect(0, 40, W, 10);
      drawPanel(ctx, panel, M, 110, W - M * 2, unit, sections);
    } else {
      // draw the identity section first on transparency to learn how tall the navy hero must be
      const tmp = new Writer(ctx, f, panel.name, M, 120, W - M * 2, []);
      const heroSection = panel.sections[0];
      ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, H); // provisional; repainted below
      tmp.begin(heroSection.id, heroSection.title, heroSection.evidence);
      for (const b of heroSection.blocks) drawBlock(tmp, b, unit, true);
      const heroEnd = tmp.y + 20;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, heroEnd, W, H - heroEnd);
      ctx.fillStyle = TEAL;
      ctx.beginPath(); ctx.moveTo(0, heroEnd - 70); ctx.bezierCurveTo(W * 0.35, heroEnd - 160, W * 0.7, heroEnd + 60, W, heroEnd - 100); ctx.lineTo(W, heroEnd); ctx.lineTo(0, heroEnd); ctx.fill();
      // record the hero section rect, then lay out the rest beneath it
      sections.push({ id: heroSection.id, face: f, panel: panel.name, title: heroSection.title, text: '', evidence: heroSection.evidence, x: M - 10, y: 110, w: W - M * 2 + 20, h: heroEnd - 110 });
      drawPanel(ctx, { ...panel, sections: panel.sections.slice(1) }, M, heroEnd + 40, W - M * 2, unit, sections);
    }
    trainingStrip(ctx, 0, H - 96, W, 96);
    ctx.restore();
    for (let i = n0; i < sections.length; i++) { const x = sections[i]; x.x *= S; x.y *= S; x.w *= S; x.h *= S; }
  }

  // top / bottom flaps
  {
    const [W, H] = B_DIMS[2]; const ctx = faces[2].getContext('2d')!; ctx.scale(res, res);
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = TEAL; ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = '#fff'; ctx.font = `800 150px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('InteriorGuard GEL', W / 2, H / 2 + 20);
    ctx.font = `400 50px ${FONT}`; ctx.fillStyle = TEAL;
    ctx.fillText('PROFESSIONAL USE ONLY · FICTIONAL TRAINING PRODUCT', W / 2, H / 2 + 110);
    ctx.textAlign = 'left';
  }
  {
    const [W, H] = B_DIMS[3]; const ctx = faces[3].getContext('2d')!; ctx.scale(res, res);
    ctx.fillStyle = '#f2f5f7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = MUTED; ctx.font = `400 56px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('LOT TRN-0426 · FICTIONAL TRAINING PRODUCT · NOT FOR USE', W / 2, H / 2 + 20);
    ctx.textAlign = 'left';
  }
  return { faces, dims: B_DIMS, sections };
}

/** Small wrap label on the loose gel tube resting by the carton (set dressing). */
export function buildTubeLabel() {
  const c = makeCanvas(1024, 256);
  const ctx = c.getContext('2d')!;
  ctx.scale(0.5, 0.5);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2048, 512);
  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, 2048, 70); ctx.fillRect(0, 442, 2048, 70);
  ctx.fillStyle = TEAL; ctx.fillRect(0, 70, 2048, 10);
  ctx.fillStyle = NAVY; ctx.font = `800 120px ${FONT}`;
  ctx.fillText('InteriorGuard', 80, 230);
  ctx.fillStyle = TEAL_DEEP; ctx.fillText('GEL', 900, 230);
  ctx.fillStyle = INK; ctx.font = `400 50px ${FONT}`;
  ctx.fillText('Read the carton label before use · 1.06 oz', 80, 330);
  ctx.fillStyle = '#fff'; ctx.font = `700 34px ${FONT}`;
  ctx.fillText('FICTIONAL TRAINING PRODUCT', 80, 490);
  return c;
}
