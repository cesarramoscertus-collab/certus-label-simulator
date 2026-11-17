// Optional hand-off to Articulate Storyline (web object) or any host page.
// Storyline: create project variables  LabelSimComplete (True/False)  and  LabelSimDecision (Text).
// Web objects published from Storyline run same-origin, so GetPlayer() is reachable via window.parent.
// Every call is guarded: when hosted elsewhere (Rise embed, plain file), nothing breaks.

export function reportCompletion(state: { flags: string[]; evidence: { id: string }[]; path: string[] }) {
  const decision = state.flags.includes('outcome:confirm') ? 'confirm-before-choosing' : 'incomplete';
  const payload = {
    type: 'certus-label-sim:complete',
    decision,
    evidenceCount: state.evidence.length,
    reconsidered: state.flags.includes('reconsidered') || state.flags.includes('reconsider'),
  };
  try {
    const w = window.parent as any;
    const player = w && w !== window && typeof w.GetPlayer === 'function' ? w.GetPlayer() : null;
    if (player) {
      player.SetVar('LabelSimComplete', true);
      player.SetVar('LabelSimDecision', decision);
    }
  } catch { /* cross-origin or not in Storyline */ }
  try {
    if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
  } catch { /* ignore */ }
}

/**
 * Optional iframe height negotiation. Rise 360 does NOT resize embeds on its own, so this only
 * helps hosts that listen (a custom wrapper page, some LMS players). The layout never depends on it:
 * whatever height the iframe has, the app fits inside it.
 * Message: { type: 'certus-label-sim:height', height } — the preferred height for the current width.
 */
export function startHostSizing() {
  if (window.parent === window) return () => {};
  const post = () => {
    const w = window.innerWidth;
    const preferred = w < 720 ? Math.round(Math.min(860, Math.max(640, w * 2.05))) : Math.round(Math.min(900, Math.max(560, w * 0.62)));
    try { window.parent.postMessage({ type: 'certus-label-sim:height', height: preferred }, '*'); } catch { /* ignore */ }
  };
  post();
  window.addEventListener('resize', post);
  return () => window.removeEventListener('resize', post);
}
