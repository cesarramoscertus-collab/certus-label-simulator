import { useEffect, useRef } from 'react';
import { SimCanvas } from './three/Scene';
import { useSim } from './store';
import { ChatPanel, ChatTab } from './ui/ChatPanel';
import { WorkOrderPanel } from './ui/WorkOrder';
import { Journal, EvidenceToast } from './ui/Journal';
import { TopBar, TrayBar, InspectHud, RestartConfirm } from './ui/Hud';
import { LabelView } from './ui/LabelView';
import { startHostSizing } from './lms';
import { Intro } from './ui/Intro';
import { Debrief } from './ui/Debrief';

/** Two light-touch supervisor nudges, only if the learner stalls. */
function useNudges() {
  const fired = useRef<Set<string>>(new Set());
  useEffect(() => {
    const id = setInterval(() => {
      const s = useSim.getState();
      if (s.mode === 'intro' || s.mode === 'debrief' || s.typing || s.completedAt) return;
      const t = (performance.now() - s.startedAt) / 1000;
      const ev = new Set(s.evidence.map((e) => e.id));
      if (t > 120 && !s.flags.includes('woOpened') && !fired.current.has('wo') && s.node === 'hub') {
        fired.current.add('wo');
        s.alexSays(['Work order’s on the tablet if you need it.']);
      }
      if (t > 260 && ev.size >= 5 && !s.flags.includes('decisionAsked') && !s.flags.includes('thinkAsked') && !fired.current.has('ready') && s.node === 'hub') {
        fired.current.add('ready');
        s.alexSays(['Whenever you’re ready, tell me what you’re thinking.']);
      }
    }, 3000);
    const unsub = useSim.subscribe((s, p) => { if (s.startedAt !== p.startedAt) fired.current.clear(); });
    return () => { clearInterval(id); unsub(); };
  }, []);
}

export default function App() {
  const mode = useSim((s) => s.mode);
  const held = useSim((s) => s.held);
  const chatOpen = useSim((s) => s.chatOpen);
  const labelOpen = useSim((s) => !!s.labelView);
  useNudges();
  useEffect(() => startHostSizing(), []);
  const live = mode === 'truck' || mode === 'inspect';
  return (
    <div className={`app mode-${mode} ${held ? 'is-holding' : ''} ${chatOpen ? 'chat-open' : 'chat-collapsed'} ${labelOpen ? 'label-open' : ''} ${live ? 'is-live' : ''}`}>
      {live && <TopBar />}
      <div className="stage">
        <SimCanvas />
        <div className="vignette" aria-hidden />
        {live && <TrayBar />}
        {live && <InspectHud />}
        {live && <EvidenceToast />}
        {live && <Journal />}
        {live && <LabelView />}
        <WorkOrderPanel />
        <Intro />
        <Debrief />
        {live && <ChatTab />}
      </div>
      {live && <ChatPanel />}
      <RestartConfirm />
    </div>
  );
}
