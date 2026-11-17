// Minimal typesetting kit for drawing high-resolution, real-text label artwork on canvases.
// Every section is drawn as live text (no baked raster images) and its rectangle is recorded,
// so clicks and gaze on the 3D label can be mapped back to the exact section.

import type { EvidenceId } from './evidence';

export const NAVY = '#032C45';
export const TEAL = '#6FCBCF';
export const TEAL_DEEP = '#1F7F86'; // teal dark enough to read as text on white
export const INK = '#18232c';
export const MUTED = '#4a5863';
export const FONT = 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif';
export const FONT_NARROW = '"Arial Narrow", "Roboto Condensed", "Segoe UI", Arial, sans-serif';

export interface LabelSection {
  id: string;
  face: number;
  x: number; y: number; w: number; h: number;
  panel: string;
  title: string;
  text: string;
  evidence?: EvidenceId;
}

export interface LabelFace {
  base: HTMLCanvasElement;    // pristine artwork
  display: HTMLCanvasElement; // artwork + highlight overlay (what the texture samples)
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

type Seg = { t: string; bold: boolean; italic?: boolean };

/** Parse "**bold** normal *italic*" into segments. */
export function parseRich(s: string): Seg[] {
  const out: Seg[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), bold: false });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ t: tok.slice(2, -2), bold: true });
    else out.push({ t: tok.slice(1, -1), bold: false, italic: true });
    last = m.index + tok.length;
  }
  if (last < s.length) out.push({ t: s.slice(last), bold: false });
  return out;
}

export function plain(s: string) {
  return s.replace(/\*\*/g, '').replace(/\*/g, '');
}

function fontFor(seg: { bold: boolean; italic?: boolean }, size: number, family = FONT, forceBold = false) {
  return `${seg.italic ? 'italic ' : ''}${seg.bold || forceBold ? '700' : '400'} ${size}px ${family}`;
}

export class Writer {
  ctx: CanvasRenderingContext2D;
  x: number; y: number; w: number;
  face: number;
  panel: string;
  sections: LabelSection[];
  private open: { id: string; y: number; title: string; text: string[]; evidence?: EvidenceId; x: number; w: number } | null = null;

  constructor(ctx: CanvasRenderingContext2D, face: number, panel: string, x: number, y: number, w: number, sections: LabelSection[]) {
    this.ctx = ctx; this.face = face; this.panel = panel; this.x = x; this.y = y; this.w = w; this.sections = sections;
  }

  begin(id: string, title: string, evidence?: EvidenceId) {
    this.open = { id, y: this.y, title, text: [], evidence, x: this.x, w: this.w };
  }
  end(pad = 10) {
    if (!this.open) return;
    const o = this.open;
    this.sections.push({
      id: o.id, face: this.face, panel: this.panel, title: o.title, text: o.text.join('\n'), evidence: o.evidence,
      x: o.x - pad, y: o.y - pad, w: o.w + pad * 2, h: this.y - o.y + pad * 2,
    });
    this.open = null;
  }
  private log(s: string) { this.open?.text.push(plain(s)); }

  gap(n: number) { this.y += n; }

  heading(text: string, size = 42, color = NAVY, opts: { align?: CanvasTextAlign; family?: string; rule?: boolean; tracking?: number } = {}) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px ${opts.family ?? FONT}`;
    ctx.textBaseline = 'alphabetic';
    const align = opts.align ?? 'left';
    ctx.textAlign = align;
    const tx = align === 'center' ? this.x + this.w / 2 : align === 'right' ? this.x + this.w : this.x;
    if (opts.tracking && 'letterSpacing' in ctx) (ctx as any).letterSpacing = `${opts.tracking}px`;
    ctx.fillText(text, tx, this.y + size * 0.86);
    if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
    ctx.textAlign = 'left';
    this.y += size * 1.12;
    if (opts.rule) {
      ctx.fillStyle = TEAL;
      ctx.fillRect(this.x, this.y + 2, this.w, 5);
      this.y += 16;
    }
    this.log(text);
  }

  /** Wrapped rich paragraph. Returns lines drawn. */
  para(text: string, size = 34, color = INK, opts: { lineH?: number; align?: 'left' | 'center'; bold?: boolean; family?: string; indent?: number } = {}) {
    const { ctx } = this;
    const lineH = opts.lineH ?? Math.round(size * 1.28);
    const segs = parseRich(text).map((s) => ({ ...s, bold: s.bold || !!opts.bold }));
    // explode into words, keep spaces
    const words: { t: string; bold: boolean; italic?: boolean; w: number }[] = [];
    for (const s of segs) {
      const parts = s.t.split(/(\s+)/).filter((p) => p.length);
      for (const p of parts) {
        ctx.font = fontFor(s, size, opts.family);
        words.push({ t: p, bold: s.bold, italic: s.italic, w: ctx.measureText(p).width });
      }
    }
    const maxW = this.w - (opts.indent ?? 0);
    const lines: typeof words[] = [];
    let line: typeof words = []; let lw = 0;
    for (const wd of words) {
      const isSpace = /^\s+$/.test(wd.t);
      if (isSpace && line.length === 0) continue;
      if (!isSpace && lw + wd.w > maxW && line.length) {
        while (line.length && /^\s+$/.test(line[line.length - 1].t)) { lw -= line[line.length - 1].w; line.pop(); }
        lines.push(line); line = []; lw = 0;
      }
      line.push(wd); lw += wd.w;
    }
    if (line.length) lines.push(line);
    ctx.textBaseline = 'alphabetic';
    for (const ln of lines) {
      const total = ln.reduce((a, b) => a + b.w, 0);
      let cx = this.x + (opts.indent ?? 0);
      if (opts.align === 'center') cx = this.x + (this.w - total) / 2;
      for (const wd of ln) {
        ctx.font = fontFor(wd, size, opts.family);
        ctx.fillStyle = color;
        ctx.fillText(wd.t, cx, this.y + size * 0.86);
        cx += wd.w;
      }
      this.y += lineH;
    }
    this.y += Math.round(size * 0.32);
    this.log(text);
    return lines.length;
  }

  bullets(items: string[], size = 33, color = INK) {
    const { ctx } = this;
    for (const it of items) {
      ctx.fillStyle = TEAL_DEEP;
      ctx.beginPath();
      ctx.arc(this.x + 10, this.y + size * 0.55, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
      const y0 = this.y;
      const saveLog = this.open; this.open = null;
      this.para(it, size, color, { indent: 34, lineH: Math.round(size * 1.24) });
      this.open = saveLog;
      this.y -= Math.round(size * 0.18);
      this.log('• ' + it);
      void y0;
    }
    this.y += 6;
  }

  /** Bar heading: filled band with white text. */
  band(text: string, size = 40, bg = NAVY, fg = '#fff', h = size * 1.6) {
    const { ctx } = this;
    ctx.fillStyle = bg;
    ctx.fillRect(this.x - 14, this.y, this.w + 28, h);
    ctx.fillStyle = fg;
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.x + 6, this.y + h / 2 + 2);
    ctx.textBaseline = 'alphabetic';
    this.y += h + 18;
    this.log(text);
  }

  rule(color = '#c9d3da', thick = 3) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.x, this.y, this.w, thick);
    this.y += thick + 18;
  }

  /** Two-column "name ........ value" row. */
  leaderRow(left: string, right: string, size = 34, bold = false) {
    const { ctx } = this;
    ctx.font = `${bold ? 700 : 400} ${size}px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';
    const lw = ctx.measureText(left).width;
    const rw = ctx.measureText(right).width;
    ctx.fillText(left, this.x, this.y + size * 0.86);
    ctx.fillText(right, this.x + this.w - rw, this.y + size * 0.86);
    ctx.fillStyle = '#8a97a1';
    ctx.font = `400 ${size}px ${FONT}`;
    const dotW = ctx.measureText('.').width + 2;
    for (let px = this.x + lw + 12; px < this.x + this.w - rw - 12; px += dotW) ctx.fillText('.', px, this.y + size * 0.86);
    this.y += Math.round(size * 1.3);
    this.log(`${left} ${right}`);
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Deterministic pseudo-random for barcodes / textures. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, caption: string) {
  const r = rng(seed);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, w, h + 50);
  let px = x + 16;
  ctx.fillStyle = '#111';
  while (px < x + w - 20) {
    const bw = 2 + Math.floor(r() * 4) * 2;
    if (r() > 0.42) ctx.fillRect(px, y + 10, bw, h - 10);
    px += bw + 2;
  }
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(caption, x + w / 2, y + h + 34);
  ctx.textAlign = 'left';
}

export function drawAnt(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
  const e = (x: number, y: number, rx: number, ry: number) => { ctx.beginPath(); ctx.ellipse(x * s, y * s, rx * s, ry * s, 0, 0, Math.PI * 2); ctx.fill(); };
  e(-0.42, 0, 0.13, 0.11); e(-0.15, 0, 0.1, 0.07); e(0.22, 0, 0.24, 0.16);
  for (const sx of [-0.3, -0.15, 0.0]) {
    ctx.beginPath(); ctx.moveTo(sx * s - 0.05 * s, 0); ctx.lineTo(sx * s - 0.15 * s, -0.3 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx * s - 0.05 * s, 0); ctx.lineTo(sx * s - 0.1 * s, 0.3 * s); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-0.52 * s, -0.05 * s); ctx.quadraticCurveTo(-0.68 * s, -0.25 * s, -0.75 * s, -0.12 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.52 * s, 0.05 * s); ctx.quadraticCurveTo(-0.68 * s, 0.25 * s, -0.75 * s, 0.12 * s); ctx.stroke();
  ctx.restore();
}

export function drawRoach(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0.08 * s, 0, 0.42 * s, 0.2 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-0.38 * s, 0, 0.1 * s, 0.13 * s, 0, 0, Math.PI * 2); ctx.fill();
  for (const sx of [-0.2, 0.0, 0.2]) {
    ctx.beginPath(); ctx.moveTo(sx * s, 0); ctx.lineTo((sx + 0.1) * s, -0.36 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx * s, 0); ctx.lineTo((sx + 0.1) * s, 0.36 * s); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-0.46 * s, -0.04 * s); ctx.quadraticCurveTo(-0.8 * s, -0.3 * s, -0.95 * s, -0.42 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.46 * s, 0.04 * s); ctx.quadraticCurveTo(-0.8 * s, 0.3 * s, -0.95 * s, 0.42 * s); ctx.stroke();
  ctx.restore();
}

/** Copy base → display and outline the selected section. */
export function paintFace(face: LabelFace, highlight?: LabelSection | null) {
  const ctx = face.display.getContext('2d')!;
  ctx.clearRect(0, 0, face.display.width, face.display.height);
  ctx.drawImage(face.base, 0, 0);
  if (highlight) {
    ctx.save();
    ctx.fillStyle = 'rgba(111,203,207,0.16)';
    roundRect(ctx, highlight.x, highlight.y, highlight.w, highlight.h, 14);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(31,127,134,0.95)';
    ctx.stroke();
    ctx.restore();
  }
}
