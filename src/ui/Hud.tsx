import { useEffect } from 'react';
import { useSim, type ProductId } from '../store';
import { useGaze } from '../three/inspect';
import { resetView, turnHeld, zoomHeld, showBack, readCentre } from '../three/Scene';
import { setMuted } from '../audio/ambient';

const NAME: Record<ProductId, string> = { A: 'PerimeterGuard SC', B: 'InteriorGuard Gel' };

const Icon = {
  wo: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" /></svg>,
  notes: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M6 3h10l3 3v15H6z" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M9 9h7M9 13h7M9 17h4" stroke="currentColor" strokeWidth="1.8" /></svg>,
  soundOn: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>,
  soundOff: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" /></svg>,
  restart: <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" /></svg>,
};

export function TopBar() {
  const evidence = useSim((s) => s.evidence.length);
  const journalOpen = useSim((s) => s.journalOpen);
  const setJournal = useSim((s) => s.setJournal);
  const setWO = useSim((s) => s.setWO);
  const muted = useSim((s) => s.muted);
  const toggleMute = useSim((s) => s.toggleMute);
  const setConfirmRestart = useSim((s) => s.setConfirmRestart);
  const flags = useSim((s) => s.flags);
  const completed = useSim((s) => s.completedAt);
  useEffect(() => setMuted(muted), [muted]);

  const stage = completed ? 3 : flags.includes('decisionAsked') ? 2 : 1;
  const stages = ['Investigate', 'Make the call', 'Debrief'];
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden>
          <svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="7" fill="#6FCBCF" /><path d="M22 11a8 8 0 1 0 0 10" stroke="#032C45" strokeWidth="3.6" fill="none" strokeLinecap="round" /></svg>
        </span>
        <div className="brand__text">
          <strong>CERTUS <em>Elite</em></strong>
          <small>Label Investigation</small>
        </div>
      </div>
      <ol className="stages" aria-label={`Scenario progress: step ${stage} of 3, ${stages[stage - 1]}`}>
        {stages.map((s, i) => (
          <li key={s} className={i + 1 < stage ? 'done' : i + 1 === stage ? 'now' : ''} aria-current={i + 1 === stage ? 'step' : undefined}><span>{s}</span></li>
        ))}
      </ol>
      <div className="tools">
        <button className="tool" onClick={() => setWO(true)} aria-label="Work order">{Icon.wo}<span>Work order</span></button>
        <button className={`tool ${journalOpen ? 'tool--on' : ''}`} onClick={() => setJournal(!journalOpen)} aria-expanded={journalOpen} aria-label={`Field notes, ${evidence} noted`}>
          {Icon.notes}<span>Field notes</span>{evidence > 0 && <b className="count" aria-hidden>{evidence}</b>}
        </button>
        <button className="tool tool--icon" onClick={toggleMute} aria-label={muted ? 'Unmute ambient sound' : 'Mute ambient sound'} aria-pressed={muted}>{muted ? Icon.soundOff : Icon.soundOn}</button>
        <button className="tool tool--icon" onClick={() => setConfirmRestart(true)} aria-label="Restart scenario">{Icon.restart}</button>
      </div>
    </header>
  );
}

/** In-app confirmation (Rise/LMS iframes may block window.confirm). */
export function RestartConfirm() {
  const open = useSim((s) => s.confirmRestart);
  const set = useSim((s) => s.setConfirmRestart);
  const restart = useSim((s) => s.restart);
  if (!open) return null;
  return (
    <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="rc-t">
      <div className="confirm__card">
        <h2 id="rc-t">Start the scenario over?</h2>
        <p>Your field notes and the conversation with Alex will be cleared.</p>
        <div className="confirm__row">
          <button className="btn btn--ghost" onClick={() => set(false)} autoFocus>Keep going</button>
          <button className="btn btn--primary" onClick={() => { set(false); restart(); }}>Restart</button>
        </div>
      </div>
    </div>
  );
}

/** Truck-view affordances: what's on the tray (also the touch/keyboard way in). */
export function TrayBar() {
  const mode = useSim((s) => s.mode);
  const pickUp = useSim((s) => s.pickUp);
  const setWO = useSim((s) => s.setWO);
  if (mode !== 'truck') return null;
  return (
    <div className="traybar" role="toolbar" aria-label="Items on the work tray">
      <span className="traybar__label">On the tray</span>
      <button onClick={() => pickUp('A')}><kbd>1</kbd> PerimeterGuard SC</button>
      <button onClick={() => pickUp('B')}><kbd>2</kbd> InteriorGuard Gel</button>
      <button onClick={() => setWO(true)}>Work order</button>
    </div>
  );
}

export function InspectHud() {
  const held = useSim((s) => s.held);
  const putDown = useSim((s) => s.putDown);
  const pickUp = useSim((s) => s.pickUp);
  const labelOpen = useSim((s) => !!s.labelView);
  const gaze = useGaze((g) => g.title);
  if (!held || labelOpen) return null;
  const other: ProductId = held === 'A' ? 'B' : 'A';
  const swap = () => { putDown(); setTimeout(() => useSim.getState().pickUp(other), 650); };
  void pickUp;

  return (
    <>
      <div className="inspect-title" aria-live="polite">
        <small>Inspecting</small>
        <strong>{NAME[held]}</strong>
      </div>

      <button className={`aim ${gaze ? 'aim--on' : ''}`} onClick={readCentre} aria-label={gaze ? `Read ${gaze}` : 'Read the label'}>
        <span className="aim__ring" aria-hidden />
        <span className="aim__text">{gaze ? <>Tap to read · <b>{gaze}</b></> : 'Turn the product to find a section'}</span>
      </button>

      <div className="controls" role="toolbar" aria-label="Product handling">
        <button onClick={() => turnHeld(-Math.PI / 2)} aria-label="Turn left a quarter turn" className="c-icon">⟲</button>
        <button onClick={() => turnHeld(Math.PI / 2)} aria-label="Turn right a quarter turn" className="c-icon">⟳</button>
        <button onClick={showBack} className="c-desk">Back panel</button>
        <button onClick={() => zoomHeld(0.72)} aria-label="Zoom in" className="c-icon c-desk">＋</button>
        <button onClick={() => zoomHeld(1.38)} aria-label="Zoom out" className="c-icon c-desk">－</button>
        <button onClick={resetView} aria-label="Reset orientation">Reset</button>
        <button onClick={readCentre} className="c-read">Read label</button>
        <button onClick={swap} aria-label={`Switch to ${NAME[other]}`}>Switch</button>
        <button className="controls__primary" onClick={putDown} aria-label="Put it back on the tray">Put back</button>
      </div>
      <p className="hint">
        <span className="hint--mouse">Drag to turn · Scroll to zoom · Click a label section to read it · Double-click to look closely</span>
        <span className="hint--touch">Drag to turn · Pinch to zoom · Tap the label to read</span>
      </p>
    </>
  );
}
