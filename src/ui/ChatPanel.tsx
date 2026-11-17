import { useEffect, useRef, useState } from 'react';
import { useSim, currentChoices } from '../store';

const RECENT = 6; // on phones, show the latest exchange; earlier history is one tap away

export function ChatPanel() {
  const messages = useSim((s) => s.messages);
  const typing = useSim((s) => s.typing);
  const open = useSim((s) => s.chatOpen);
  const node = useSim((s) => s.node);
  const unread = useSim((s) => s.unread);
  // re-evaluate choices when evidence or flags change
  useSim((s) => s.evidence.length);
  useSim((s) => s.flags.length);
  const completed = useSim((s) => s.completedAt);
  const setChat = useSim((s) => s.setChat);
  const say = useSim((s) => s.say);
  const showDebrief = useSim((s) => s.showDebrief);
  const scroller = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const choices = typing || messages.length === 0 ? [] : currentChoices();
  const lastAlex = [...messages].reverse().find((m) => m.from === 'alex');
  const hidden = showAll ? 0 : Math.max(0, messages.length - RECENT);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing, choices.length, open]);

  return (
    <aside className={`chat ${open ? 'chat--open' : 'chat--closed'}`} aria-label="Conversation with Alex, field supervisor">
      {/* phone: collapsed peek bar */}
      <button className="chat__peek" onClick={() => setChat(true)} aria-expanded={false} aria-label={`Open conversation with Alex${unread ? `, ${unread} new` : ''}`}>
        <span className="avatar avatar--sm" aria-hidden>AL</span>
        <span className="chat__peektext">
          {typing ? <em>Alex is typing…</em> : lastAlex ? lastAlex.text : 'Alex · Field Supervisor'}
        </span>
        {unread > 0 && <b className="badge" aria-hidden>{unread}</b>}
        <span className="chat__peekcta" aria-hidden>Reply ▴</span>
      </button>

      <div className="chat__panel">
        <header className="chat__head">
          <div className="avatar" aria-hidden>AL</div>
          <div className="chat__who">
            <strong>Alex</strong>
            <span><i className="dot" /> Field Supervisor · on the radio</span>
          </div>
          <button className="icon-btn chat__min" onClick={() => setChat(false)} aria-label="Minimize conversation">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="chat__log" ref={scroller} role="log" aria-live="polite">
          {hidden > 0 && (
            <button className="chat__earlier" onClick={() => setShowAll(true)}>Show {hidden} earlier message{hidden > 1 ? 's' : ''}</button>
          )}
          {messages.slice(hidden).map((m) => (
            <div key={m.id} className={`bubble bubble--${m.from}`}>
              <span className="sr-only">{m.from === 'alex' ? 'Alex: ' : 'You: '}</span>{m.text}
            </div>
          ))}
          {typing && (
            <div className="bubble bubble--alex bubble--typing" aria-label="Alex is typing">
              <span /><span /><span />
            </div>
          )}
        </div>
        <div className="chat__reply" role="group" aria-label="Your replies">
          {completed ? (
            <button className="reply reply--primary" onClick={showDebrief}>Review your field decision →</button>
          ) : (
            choices.map((c, i) => (
              <button key={node + c.id} className="reply" style={{ animationDelay: `${i * 45}ms` }} onClick={() => say(c.id)}>
                {c.text}
              </button>
            ))
          )}
          {!completed && typing && <p className="chat__hint">Alex is replying…</p>}
        </div>
      </div>
    </aside>
  );
}

/** Desktop: floating tab to bring the side panel back. */
export function ChatTab() {
  const open = useSim((s) => s.chatOpen);
  const unread = useSim((s) => s.unread);
  const setChat = useSim((s) => s.setChat);
  if (open) return null;
  return (
    <button className="chat-tab" onClick={() => setChat(true)} aria-label="Open conversation with Alex">
      <div className="avatar avatar--sm">AL</div>
      Alex
      {unread > 0 && <b className="badge">{unread}</b>}
    </button>
  );
}
