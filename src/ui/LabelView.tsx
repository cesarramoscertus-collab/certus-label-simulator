// Stage 2: flat, high-resolution label examination.
// The whole label is real HTML/SVG text, so it re-lays out crisply at every zoom level
// (zoom changes the font size, not a bitmap scale). Panels sit side by side like the label
// unwrapped from the container. Nothing is highlighted until the learner taps a section.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSim, type ProductId } from '../store';
import { PANELS, SIZE_PX, type Block, type PanelCopy, type SectionCopy, type Size } from '../content/labelCopy';
import { parseRich } from '../content/labelKit';

const NAME: Record<ProductId, string> = { A: 'PerimeterGuard SC', B: 'InteriorGuard Gel' };
const PANEL_EM = 22; // panel width in em; at zoom 1 body text is 16px
const MIN_Z = 0.7;
const MAX_Z = 4;
const em = (s: Size = 'body') => `${Math.max(SIZE_PX[s], 28) / 32}em`;

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.t}</strong> : seg.italic ? <em key={i}>{seg.t}</em> : <span key={i}>{seg.t}</span>,
      )}
    </>
  );
}

function Ant({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#032C45" stroke="#032C45" strokeWidth="0.05" strokeLinecap="round">
      <ellipse cx="-0.42" cy="0" rx="0.13" ry="0.11" /><ellipse cx="-0.15" cy="0" rx="0.1" ry="0.07" /><ellipse cx="0.22" cy="0" rx="0.24" ry="0.16" />
      <path d="M-0.35 0 L-0.45 -0.3 M-0.35 0 L-0.4 0.3 M-0.2 0 L-0.3 -0.3 M-0.2 0 L-0.25 0.3 M-0.05 0 L-0.15 -0.3 M-0.05 0 L-0.1 0.3 M-0.52 -0.05 Q-0.68 -0.25 -0.75 -0.12 M-0.52 0.05 Q-0.68 0.25 -0.75 0.12" fill="none" />
    </g>
  );
}

function Roach({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#032C45" stroke="#032C45" strokeWidth="0.04" strokeLinecap="round">
      <ellipse cx="0.08" cy="0" rx="0.42" ry="0.2" /><ellipse cx="-0.38" cy="0" rx="0.1" ry="0.13" />
      <path d="M-0.2 0 L-0.1 -0.36 M-0.2 0 L-0.1 0.36 M0 0 L0.1 -0.36 M0 0 L0.1 0.36 M0.2 0 L0.3 -0.36 M0.2 0 L0.3 0.36 M-0.46 -0.04 Q-0.8 -0.3 -0.95 -0.42 M-0.46 0.04 Q-0.8 0.3 -0.95 0.42" fill="none" />
    </g>
  );
}

function BlockView({ b, hero }: { b: Block; hero: boolean }) {
  switch (b.k) {
    case 'gap': return <div style={{ height: `${b.n / 32}em` }} />;
    case 'band': return <div className={`lb-band ${b.tone === 'teal' ? 'lb-band--teal' : ''}`} style={{ fontSize: em(b.size ?? 'band') }}>{b.text}</div>;
    case 'h': return (
      <div className={`lb-h lb-h--${hero ? (b.color === 'teal' ? 'teal' : 'white') : b.color ?? 'navy'} ${b.rule ? 'lb-h--rule' : ''} ${b.tracking ? 'lb-h--track' : ''}`}
        style={{ fontSize: em(b.size ?? 'h'), textAlign: b.align ?? 'left' }}>{b.text}</div>
    );
    case 'p': return (
      <p className={`lb-p ${b.muted ? 'lb-p--muted' : ''} ${b.bold ? 'lb-p--bold' : ''} ${hero ? 'lb-p--white' : ''}`}
        style={{ fontSize: em(b.size), textAlign: b.align ?? 'left' }}><Rich text={b.text} /></p>
    );
    case 'ul': return <ul className="lb-ul">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case 'rows': return (
      <div className="lb-rows">
        {b.rows.map(([l, r, bold]) => (
          <div key={l} className={`lb-row ${bold ? 'lb-row--b' : ''}`}><span>{l}</span><i aria-hidden /><span>{r}</span></div>
        ))}
        <p className="lb-p lb-p--muted" style={{ fontSize: em('xs'), marginTop: '.4em' }}>{b.note}</p>
      </div>
    );
    case 'brand': return b.product === 'A'
      ? <div className="lb-brandA">Perimeter<br />Guard <b>SC</b></div>
      : <div className="lb-brandB"><div className="lb-brandB__name">InteriorGuard</div><div className="lb-brandB__row"><b>GEL</b><span><strong>INSECTICIDE GEL BAIT</strong><br />Crack &amp; crevice formulation</span></div></div>;
    case 'tube': return (
      <svg className="lb-svg" viewBox="0 0 400 60" role="img" aria-label="Gel bait reagent tube illustration">
        <rect x="40" y="10" width="300" height="40" rx="20" fill="#e9f1f4" /><rect x="90" y="13" width="200" height="34" rx="6" fill="#6FCBCF" />
        <rect x="340" y="22" width="50" height="16" fill="#032C45" /><rect x="10" y="18" width="30" height="24" fill="#032C45" /><rect x="0" y="10" width="10" height="40" fill="#032C45" />
        <text x="190" y="36" textAnchor="middle" fontSize="15" fontWeight="700" fill="#032C45" fontFamily="Arial, sans-serif">InteriorGuard Gel</text>
      </svg>
    );
    case 'pests': return (
      <div className="lb-pests">
        <svg viewBox="0 0 120 60" aria-hidden className="lb-pests__art">
          {b.product === 'A' ? (<>
            <rect x="6" y="12" width="44" height="34" fill="none" stroke="#1F7F86" strokeWidth="2.5" strokeDasharray="5 3" />
            <rect x="14" y="20" width="28" height="18" fill="#032C45" /><rect x="25" y="28" width="6" height="10" fill="#fff" />
            <Ant x={75} y={22} s={22} /><Ant x={100} y={42} s={17} />
          </>) : (<><Ant x={32} y={30} s={34} /><Roach x={90} y={30} s={36} /></>)}
        </svg>
        <strong>{b.lines.join(' ')}</strong>
      </div>
    );
    case 'barcode': {
      const bars: number[] = []; let seed = b.caption.length * 7919;
      for (let i = 0; i < 46; i++) { seed = (seed * 9301 + 49297) % 233280; bars.push(1 + Math.floor((seed / 233280) * 4)); }
      let x = 4;
      return (
        <svg className="lb-svg lb-barcode" viewBox="0 0 240 70" role="img" aria-label={`Barcode ${b.caption}`}>
          {bars.map((w, i) => { const r = <rect key={i} x={x} y={4} width={i % 2 ? 0 : w} height={46} fill="#111" />; x += w + 1.6; return r; })}
          <text x="120" y="66" textAnchor="middle" fontSize="11" fontFamily="Arial, sans-serif">{b.caption}</text>
        </svg>
      );
    }
  }
}

function SectionView({ product, s, hero, active, seen, onExamine }: { product: ProductId; s: SectionCopy; hero: boolean; active: boolean; seen: boolean; onExamine: (id: string) => void }) {
  return (
    <div
      className={`lsec ${s.box ? 'lsec--box' : ''} ${hero ? 'lsec--hero' : ''} ${active ? 'is-active' : ''} ${seen ? 'is-seen' : ''}`}
      data-sec={s.id}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${s.title}${seen ? ', examined' : ''}. ${product === 'A' ? 'PerimeterGuard SC' : 'InteriorGuard Gel'}`}
      onClick={() => onExamine(s.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExamine(s.id); } }}
    >
      {s.blocks.map((b, i) => <BlockView key={i} b={b} hero={hero} />)}
      {seen && <span className="lsec__tick" aria-hidden>✓</span>}
    </div>
  );
}

function PanelView({ product, panel, active, seen, onExamine }: { product: ProductId; panel: PanelCopy; active: string | null; seen: Set<string>; onExamine: (id: string) => void }) {
  return (
    <section className={`lpanel ${panel.hero ? 'lpanel--hero' : ''}`} aria-label={panel.name} data-panel={panel.id} style={{ width: `${PANEL_EM}em` }}>
      <div className="lpanel__top" />
      <div className="lpanel__body">
        {panel.sections.map((s, i) => (
          <SectionView key={s.id} product={product} s={s} hero={!!panel.hero && i === 0} active={active === s.id} seen={seen.has(s.id)} onExamine={onExamine} />
        ))}
      </div>
      <div className="lpanel__strip">FICTIONAL TRAINING LABEL · NOT A REAL PRODUCT · NOT FOR SALE OR USE</div>
    </section>
  );
}

export function LabelView() {
  const lv = useSim((s) => s.labelView);
  const examined = useSim((s) => s.examined);
  const unread = useSim((s) => s.unread);
  const closeLabel = useSim((s) => s.closeLabel);
  const examine = useSim((s) => s.examine);
  const setChat = useSim((s) => s.setChat);
  const scroller = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(1);
  const [active, setActive] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const pendingAnchor = useRef<{ cx: number; cy: number; ratio: number } | null>(null);
  const zRef = useRef(1);
  zRef.current = z;

  const product = lv?.product;
  const panels = product ? PANELS[product] : [];

  // open: fit one panel to the width, then bring the chosen section into view
  useLayoutEffect(() => {
    if (!lv || !scroller.current) return;
    const w = scroller.current.clientWidth;
    const fit = Math.min(1.35, Math.max(MIN_Z, (w - 28) / (PANEL_EM * 16)));
    setZ(fit);
    setActive(lv.sectionId);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = lv.sectionId ? scroller.current?.querySelector<HTMLElement>(`[data-sec="${lv.sectionId}"]`) : null;
      const sc = scroller.current;
      if (!sc) return;
      if (el) {
        // layout offsets (immune to the opening scale animation), relative to .lv__content
        let left = 0; let top = 0; let n: HTMLElement | null = el;
        while (n && !n.classList.contains('lv__content')) { left += n.offsetLeft; top += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
        sc.scrollTo({ left: left - Math.max(12, (sc.clientWidth - el.offsetWidth) / 2), top: top - 16, behavior: 'instant' as ScrollBehavior });
        el.focus({ preventScroll: true });
      } else {
        sc.scrollTo({ left: 0, top: 0 });
      }
    }));
  }, [lv?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the point under the fingers/cursor fixed while zooming
  const zoomTo = useCallback((nz: number, cx?: number, cy?: number) => {
    const sc = scroller.current; if (!sc) return;
    const cz = zRef.current;
    const next = Math.min(MAX_Z, Math.max(MIN_Z, nz));
    if (Math.abs(next - cz) < 0.001) return;
    const r = sc.getBoundingClientRect();
    pendingAnchor.current = { cx: (cx ?? r.left + r.width / 2) - r.left, cy: (cy ?? r.top + r.height / 2) - r.top, ratio: next / cz };
    zRef.current = next;
    setZ(next);
  }, []);

  useLayoutEffect(() => {
    const a = pendingAnchor.current; const sc = scroller.current;
    if (!a || !sc) return;
    sc.scrollLeft = (sc.scrollLeft + a.cx) * a.ratio - a.cx;
    sc.scrollTop = (sc.scrollTop + a.cy) * a.ratio - a.cy;
    pendingAnchor.current = null;
  }, [z]);

  // pinch (touch), ctrl/⌘ + wheel or trackpad pinch (desktop), drag-to-pan (mouse)
  useEffect(() => {
    const sc = scroller.current; if (!sc || !lv) return;
    let pinch: { d0: number; z0: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = (e: TouchEvent) => { if (e.touches.length === 2) pinch = { d0: dist(e.touches), z0: zRef.current }; };
    const tm = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2; const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomTo(pinch.z0 * (dist(e.touches) / pinch.d0), mx, my);
      }
    };
    const te = (e: TouchEvent) => { if (e.touches.length < 2) pinch = null; };
    const gesture = (e: Event) => e.preventDefault(); // stop Safari page zoom
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain wheel scrolls/pans
      e.preventDefault();
      zoomTo(zRef.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    };
    let drag: { x: number; y: number; l: number; t: number; moved: boolean } | null = null;
    const pd = (e: PointerEvent) => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop, moved: false }; };
    const pm = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) { sc.scrollLeft = drag.l - dx; sc.scrollTop = drag.t - dy; sc.classList.add('is-dragging'); }
    };
    const pu = () => { setTimeout(() => sc.classList.remove('is-dragging'), 0); if (drag?.moved) { const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); }; sc.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => sc.removeEventListener('click', stop, { capture: true }), 50); } drag = null; };
    sc.addEventListener('touchstart', ts, { passive: true });
    sc.addEventListener('touchmove', tm, { passive: false });
    sc.addEventListener('touchend', te);
    sc.addEventListener('gesturestart', gesture as EventListener);
    sc.addEventListener('gesturechange', gesture as EventListener);
    sc.addEventListener('wheel', wheel, { passive: false });
    sc.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeLabel(); }
      if (e.key === '+' || e.key === '=') zoomTo(zRef.current * 1.25);
      if (e.key === '-') zoomTo(zRef.current / 1.25);
    };
    window.addEventListener('keydown', esc, true);
    return () => {
      sc.removeEventListener('touchstart', ts); sc.removeEventListener('touchmove', tm); sc.removeEventListener('touchend', te);
      sc.removeEventListener('gesturestart', gesture as EventListener); sc.removeEventListener('gesturechange', gesture as EventListener);
      sc.removeEventListener('wheel', wheel); sc.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu);
      window.removeEventListener('keydown', esc, true);
    };
  }, [lv, zoomTo, closeLabel]);

  if (!lv || !product) return null;
  const seen = new Set(examined.filter((e) => e.product === product).map((e) => e.sectionId));
  const onExamine = (id: string) => {
    setActive(id);
    examine(product, id);
    const s = panels.flatMap((p) => p.sections).find((x) => x.id === id);
    setAnnounce(`Examining ${s?.title ?? ''}`);
  };
  const jump = (panelId: string) => {
    const sc = scroller.current; const el = sc?.querySelector<HTMLElement>(`[data-panel="${panelId}"]`);
    if (sc && el) sc.scrollTo({ left: el.offsetLeft - 12, top: 0, behavior: 'smooth' });
  };
  const origin = lv.origin;

  return (
    <div className="lv" role="dialog" aria-modal="true" aria-label={`${NAME[product]} label`}
      style={origin ? { transformOrigin: `${origin.x}px ${origin.y}px` } : undefined}>
      <header className="lv__head">
        <button className="lv__back" onClick={closeLabel} aria-label="Back to the 3D product">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
          <span>Back to {product === 'A' ? 'bottle' : 'carton'}</span>
        </button>
        <div className="lv__title"><small>Label</small><strong>{NAME[product]}</strong></div>
        {unread > 0 && (
          <button className="lv__alex" onClick={() => { closeLabel(); setChat(true); }} aria-label={`Alex sent ${unread} new message${unread > 1 ? 's' : ''}`}>
            Alex <b>{unread}</b>
          </button>
        )}
      </header>
      <nav className="lv__panels" aria-label="Label panels">
        {panels.map((p) => <button key={p.id} onClick={() => jump(p.id)}>{p.name.replace(' panel', '')}</button>)}
      </nav>
      <div className="lv__scroll" ref={scroller} tabIndex={-1}>
        <div className="lv__content" style={{ fontSize: `${16 * z}px` }}>
          {panels.map((p) => <PanelView key={p.id} product={product} panel={p} active={active} seen={seen} onExamine={onExamine} />)}
        </div>
      </div>
      <footer className="lv__foot">
        <span className="lv__tip">Tap a section to examine it · pinch or use +/− to zoom</span>
        <div className="lv__zoom" role="group" aria-label="Zoom">
          <button onClick={() => zoomTo(z / 1.3)} aria-label="Zoom out">−</button>
          <output aria-live="polite">{Math.round(z * 100)}%</output>
          <button onClick={() => zoomTo(z * 1.3)} aria-label="Zoom in">+</button>
        </div>
      </footer>
      <div className="sr-only" aria-live="polite">{announce}</div>
    </div>
  );
}
