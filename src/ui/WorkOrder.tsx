import { useEffect } from 'react';
import { useSim } from '../store';
import { WORK_ORDER } from '../content/workOrder';

export function WorkOrderPanel() {
  const open = useSim((s) => s.woOpen);
  const setWO = useSim((s) => s.setWO);
  const discover = useSim((s) => s.discover);

  // reading the rows: logged once the order has been on screen long enough to read
  useEffect(() => {
    if (!open) return;
    const timers = WORK_ORDER.rows
      .filter((r) => r.evidence)
      .map((r, i) => window.setTimeout(() => discover(r.evidence!), 900 + i * 420));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setWO(false); };
    window.addEventListener('keydown', esc);
    return () => { timers.forEach(clearTimeout); window.removeEventListener('keydown', esc); };
  }, [open, discover, setWO]);

  if (!open) return null;
  return (
    <div className="wo-wrap" role="dialog" aria-modal="true" aria-label="Work order">
      <div className="tablet">
        <div className="tablet__bar">
          <span>CERTUS Field</span>
          <span>10:24 AM</span>
        </div>
        <div className="wo">
          <header className="wo__head">
            <div>
              <small>WORK ORDER</small>
              <h2>{WORK_ORDER.number}</h2>
            </div>
            <span className="pill">Scheduled · {WORK_ORDER.scheduled}</span>
          </header>
          <div className="wo__meta">
            <div><small>Account</small>{WORK_ORDER.account}</div>
            <div><small>Technician</small>{WORK_ORDER.technician}</div>
            <div><small>Supervisor</small>{WORK_ORDER.supervisor}</div>
          </div>
          <table className="wo__table">
            <tbody>
              {WORK_ORDER.rows.map((r) => (
                <tr key={r.label} className={r.status === 'unknown' ? 'is-unknown' : ''}>
                  <th scope="row">{r.label}</th>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="wo__notes"><small>Office notes</small><p>{WORK_ORDER.notes}</p></div>
          <p className="wo__fict">Training scenario · fictional account</p>
        </div>
        <button className="btn btn--light wo__close" onClick={() => setWO(false)} autoFocus>Close work order</button>
      </div>
    </div>
  );
}
