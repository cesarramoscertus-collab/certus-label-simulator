import { create } from 'zustand';
import { EVIDENCE, type EvidenceId } from './content/evidence';
import { choicesFor, choose, proactive, OPENING, type NodeId, type DCtx } from './dialogue/engine';
import { findSection } from './content/labelCopy';
import { sfx } from './audio/ambient';
import { reportCompletion } from './lms';

export type Mode = 'intro' | 'truck' | 'inspect' | 'debrief';
export type ProductId = 'A' | 'B';

export interface Msg { id: number; from: 'alex' | 'me'; text: string; t: number }
export interface Found { id: EvidenceId; t: number }

interface State {
  mode: Mode;
  held: ProductId | null;
  evidence: Found[];
  toast: { id: EvidenceId; nonce: number } | null;
  /** Flat, zoomable label view (stage 2). sectionId = the section the learner chose to examine. */
  labelView: { product: ProductId; sectionId: string | null; origin: { x: number; y: number } | null; nonce: number } | null;
  /** Every label section the learner has actually opened/examined, in order. */
  examined: { product: ProductId; sectionId: string; t: number }[];
  confirmRestart: boolean;
  focus: { product: ProductId; sectionId: string; nonce: number } | null;
  woOpen: boolean;
  journalOpen: boolean;
  chatOpen: boolean;
  muted: boolean;
  node: NodeId;
  flags: string[];
  messages: Msg[];
  typing: boolean;
  unread: number;
  startedAt: number;
  completedAt: number | null;
  path: string[]; // learner's chat choices, for the debrief
  inspected: { A: number; B: number }; // seconds held

  begin: () => void;
  restart: () => void;
  pickUp: (p: ProductId, focusSection?: string) => void;
  putDown: () => void;
  discover: (id: EvidenceId) => void;
  openLabel: (p: ProductId, sectionId: string | null, origin?: { x: number; y: number } | null) => void;
  closeLabel: () => void;
  examine: (p: ProductId, sectionId: string) => void;
  setConfirmRestart: (v: boolean) => void;
  maybeProactive: () => void;
  setWO: (open: boolean) => void;
  setJournal: (open: boolean) => void;
  setChat: (open: boolean) => void;
  toggleMute: () => void;
  say: (choiceId: string) => void;
  alexSays: (lines: string[], after?: () => void) => void;
  addInspectTime: (p: ProductId, dt: number) => void;
  showDebrief: () => void;
}

let gen = 0; // invalidates pending timers on restart
let msgId = 1;

const initial = () => ({
  mode: 'intro' as Mode,
  held: null,
  evidence: [] as Found[],
  toast: null,
  labelView: null,
  examined: [] as State['examined'],
  confirmRestart: false,
  focus: null,
  woOpen: false,
  journalOpen: false,
  chatOpen: true,
  node: 'hub' as NodeId,
  flags: [] as string[],
  messages: [] as Msg[],
  typing: false,
  unread: 0,
  startedAt: 0,
  completedAt: null,
  path: [] as string[],
  inspected: { A: 0, B: 0 },
});

export const useSim = create<State>((set, get) => ({
  ...initial(),
  muted: false,

  begin: () => {
    set({ mode: 'truck', startedAt: performance.now() });
    const g = gen;
    setTimeout(() => { if (g === gen) get().alexSays(OPENING); }, 1900);
  },

  restart: () => {
    gen++;
    set({ ...initial(), mode: 'truck', startedAt: performance.now(), chatOpen: get().chatOpen });
    const g = gen;
    setTimeout(() => { if (g === gen) get().alexSays(OPENING); }, 1200);
  },

  pickUp: (p, focusSection) => {
    sfx('pickup');
    set({ held: p, mode: 'inspect', labelView: null, woOpen: false, focus: focusSection ? { product: p, sectionId: focusSection, nonce: Math.random() } : null });
    // phones: give the product the screen; the conversation stays one tap away in the peek bar
    if (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 719px)').matches) set({ chatOpen: false });
    get().discover(p === 'A' ? 'A_name' : 'B_name');
  },

  putDown: () => {
    if (!get().held) return;
    sfx('putdown');
    set({ held: null, mode: 'truck', labelView: null, focus: null });
  },

  discover: (id) => {
    if (get().evidence.some((e) => e.id === id)) return;
    set((s) => ({ evidence: [...s.evidence, { id, t: performance.now() - s.startedAt }], toast: { id, nonce: Math.random() } }));
    if (EVIDENCE[id].source !== 'AX') sfx('note');
    setTimeout(() => get().maybeProactive(), 900);
  },

  openLabel: (p, sectionId, origin = null) => {
    set({ labelView: { product: p, sectionId, origin, nonce: Math.random() } });
    if (sectionId) get().examine(p, sectionId);
  },
  closeLabel: () => set({ labelView: null }),
  examine: (p, sectionId) => {
    set((s) => ({ examined: [...s.examined, { product: p, sectionId, t: performance.now() - s.startedAt }] }));
    const ev = findSection(p, sectionId)?.section.evidence;
    if (ev) get().discover(ev);
  },
  setConfirmRestart: (v) => set({ confirmRestart: v }),

  maybeProactive: () => {
    const s = get();
    if (s.typing || s.node !== 'hub' || s.completedAt || s.mode === 'intro' || s.mode === 'debrief') return;
    const r = proactive({ ev: new Set(s.evidence.map((e) => e.id)), flags: new Set(s.flags) });
    if (!r) return;
    set({ node: r.node, flags: Array.from(new Set([...s.flags, ...(r.flags ?? [])])), typing: true });
    get().alexSays(r.alex);
  },

  setWO: (open) => {
    set({ woOpen: open });
    if (open) {
      set((s) => ({ flags: s.flags.includes('woOpened') ? s.flags : [...s.flags, 'woOpened'] }));
      sfx('tablet');
    }
  },
  setJournal: (open) => set({ journalOpen: open }),
  setChat: (open) => set({ chatOpen: open, unread: open ? 0 : get().unread }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),

  alexSays: (lines, after) => {
    const g = gen;
    const step = (i: number) => {
      if (g !== gen) return;
      if (i >= lines.length) { set({ typing: false }); after?.(); return; }
      set({ typing: true });
      const delay = Math.min(2100, 650 + lines[i].length * 17);
      setTimeout(() => {
        if (g !== gen) return;
        set((s) => ({
          messages: [...s.messages, { id: msgId++, from: 'alex', text: lines[i], t: performance.now() }],
          unread: s.chatOpen ? 0 : s.unread + 1,
        }));
        sfx('message');
        setTimeout(() => step(i + 1), 380);
      }, delay);
    };
    step(0);
  },

  say: (choiceId) => {
    const s = get();
    if (s.typing) return;
    const ctx: DCtx = { ev: new Set(s.evidence.map((e) => e.id)), flags: new Set(s.flags) };
    const r = choose(s.node, choiceId, ctx);
    const flags = Array.from(new Set([...s.flags, ...(r.flags ?? [])]));
    set({
      messages: [...s.messages, { id: msgId++, from: 'me', text: r.playerText, t: performance.now() }],
      flags,
      node: r.node,
      path: [...s.path, r.playerText],
      typing: true,
    });
    sfx('send');
    r.evidence?.forEach((e) => get().discover(e));
    const g = gen;
    setTimeout(() => {
      if (g !== gen) return;
      get().alexSays(r.alex, () => {
        setTimeout(() => get().maybeProactive(), 1200);
        if (r.action === 'openWorkOrder') get().setWO(true);
        if (r.action === 'complete') {
          set({ completedAt: performance.now() });
          reportCompletion(get());
        }
      });
    }, 350);
  },

  addInspectTime: (p, dt) => set((s) => ({ inspected: { ...s.inspected, [p]: s.inspected[p] + dt } })),

  showDebrief: () => set({ mode: 'debrief', held: null, woOpen: false, journalOpen: false, labelView: null }),
}));

export function currentChoices() {
  const s = useSim.getState();
  return choicesFor(s.node, { ev: new Set(s.evidence.map((e) => e.id)), flags: new Set(s.flags) });
}

export function hasFlag(flag: string) {
  return useSim.getState().flags.includes(flag);
}
