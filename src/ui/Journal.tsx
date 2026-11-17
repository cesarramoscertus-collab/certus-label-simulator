import { useEffect, useState } from 'react';
import { useSim } from '../store';
import { EVIDENCE, SOURCE_LABEL, type EvidenceId, type EvidenceSource } from '../content/evidence';
import { registry } from '../three/inspect';

const ORDER: EvidenceSource[] = ['A', 'B', 'WO', 'AX'];

function revisit(id: EvidenceId) {
  const s = useSim.getState();
  const def = EVIDENCE[id];
  if (def.source === 'WO') { s.putDown(); s.setWO(true); s.setJournal(false); return; }
  if (def.source === 'AX') { s.setChat(true); s.setJournal(false); return; }
  const product = def.source as 'A' | 'B';
  const h = registry[product];
  const section = h?.sections.find((x) => x.evidence === id && !x.id.includes('front_')) ?? h?.sections.find((x) => x.evidence === id);
  s.setJournal(false);
  // revisit = pick the product up, turn it to that section, and reopen the readable label there
  if (s.held === product) { s.openLabel(product, section?.id ?? null, null); return; }
  if (s.held) s.putDown();
  setTimeout(() => {
    useSim.getState().pickUp(product, section?.id);
    setTimeout(() => useSim.getState().openLabel(product, section?.id ?? null, null), 1400);
  }, s.held ? 600 : 0);
}

export function Journal() {
  const open = useSim((s) => s.journalOpen);
  const evidence = useSim((s) => s.evidence);
  const setJournal = useSim((s) => s.setJournal);
  if (!open) return null;
  const groups = ORDER.map((src) => ({ src, items: evidence.filter((e) => EVIDENCE[e.id].source === src) }));
  return (
    <aside className="journal" aria-label="Field notes">
      <header className="journal__head">
        <div>
          <small>Field notes</small>
          <h2>What you’ve found</h2>
        </div>
        <button className="icon-btn" onClick={() => setJournal(false)} aria-label="Close field notes">✕</button>
      </header>
      <p className="journal__lede">Notes are added as you read labels, the work order, and what Alex tells you. Select a note to go back to it.</p>
      <div className="journal__body">
        {groups.map((g) => (
          <section key={g.src}>
            <h3>{SOURCE_LABEL[g.src]}</h3>
            {g.items.length === 0 ? <p className="journal__empty">Nothing noted yet.</p> : (
              <ul>
                {g.items.map((e) => {
                  const d = EVIDENCE[e.id];
                  return (
                    <li key={e.id}>
                      <button onClick={() => revisit(e.id)}>
                        <span className="journal__where">{d.where}</span>
                        <span className="journal__note">{d.note}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}

export function EvidenceToast() {
  const toast = useSim((s) => s.toast);
  const [shown, setShown] = useState<typeof toast>(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const t = setTimeout(() => setShown(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  if (!shown) return null;
  const d = EVIDENCE[shown.id];
  if (d.source === 'AX') return null;
  return (
    <div className="toast" key={shown.nonce} role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M5 4h11l3 3v13H5z M8 10h8 M8 14h8 M8 18h5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
      <span>Noted · {d.where}</span>
    </div>
  );
}
