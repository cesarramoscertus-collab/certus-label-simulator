import { useSim } from '../store';
import type { EvidenceId } from '../content/evidence';

const KEY: { id: EvidenceId[]; label: string; why: string; flag?: string }[] = [
  { id: ['A_restriction'], label: 'PerimeterGuard SC · Restrictions', why: '“Do not apply indoors.” The complaint is inside, so this product is out for that work.' },
  { id: ['A_sites', 'A_directions'], label: 'PerimeterGuard SC · Application Sites / Directions', why: 'Exterior building perimeters only.' },
  { id: ['B_sites', 'B_directions'], label: 'InteriorGuard Gel · Application Sites / Directions', why: 'Specific indoor cracks and crevices, and only the locations the label lists.' },
  { id: ['B_restriction'], label: 'InteriorGuard Gel · Restrictions', why: 'Not directly on food preparation surfaces; crack-and-crevice only in food-handling areas.' },
  { id: ['WO_area', 'AX_location'], label: 'Treatment area', why: 'Not confirmed. “Somewhere inside” can’t be matched to a label.', flag: 'k_loc' },
  { id: ['WO_food', 'AX_food'], label: 'Food handling', why: 'Unknown, and it changes what the gel label allows.', flag: 'k_food' },
];

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Debrief() {
  const mode = useSim((s) => s.mode);
  const evidence = useSim((s) => s.evidence);
  const flags = useSim((s) => s.flags);
  const path = useSim((s) => s.path);
  const startedAt = useSim((s) => s.startedAt);
  const completedAt = useSim((s) => s.completedAt);
  const inspected = useSim((s) => s.inspected);
  const examined = useSim((s) => s.examined);
  const restart = useSim((s) => s.restart);
  if (mode !== 'debrief') return null;

  const ev = new Set(evidence.map((e) => e.id));
  const f = (x: string) => flags.includes(x);
  const picks: string[] = [];
  if (f('choseA')) picks.push('PerimeterGuard SC');
  if (f('choseB')) picks.push('InteriorGuard Gel');
  if (f('choseEither')) picks.push('“either one”');
  const confirmed = [
    f('k_loc') && 'exactly where the ants are active',
    f('k_food') && 'whether food is handled or prepared nearby',
    f('k_sites') && 'whether those spots are approved sites on the gel label',
    f('k_hist') && 'what has been applied there before',
  ].filter(Boolean) as string[];

  return (
    <div className="debrief">
      <div className="debrief__card">
        <header>
          <small>Field decision record · fictional training scenario</small>
          <h1>Your call: confirm before choosing</h1>
          <p className="debrief__time">Time on scenario {fmt((completedAt ?? performance.now()) - startedAt)} · {new Set(examined.map((e) => e.sectionId)).size} label sections examined · {evidence.length} notes · handled PerimeterGuard {Math.round(inspected.A)}s, InteriorGuard {Math.round(inspected.B)}s</p>
        </header>

        <div className="debrief__grid">
          <section>
            <h2>How your thinking moved</h2>
            {picks.length > 0 ? (
              <p>You first leaned toward {picks.join(', then ')}. When Alex pressed on the label evidence, you went back and reworked the decision. That’s the habit this activity is about.</p>
            ) : (
              <p>You held off on naming a product until you knew more. That’s the call a supervisor can stand behind.</p>
            )}
            {confirmed.length > 0 && (
              <>
                <h3>Before choosing, you said you’d confirm</h3>
                <ul className="ticks">{confirmed.map((c) => <li key={c}>{c}</li>)}</ul>
              </>
            )}
            {(f('distractor') || f('assumed')) && (
              <p className="debrief__aside">
                {f('assumed') && 'At least once you filled a gap with a “probably.” In the field, a guess about the site isn’t evidence. '}
                {f('used:k_cost') && f('used:k_cust') ? 'Cost and customer preference came up. Neither one changes what the label allows.' : f('used:k_cost') ? 'Cost came up. It doesn’t change what the label allows.' : f('used:k_cust') ? 'Customer preference came up. It doesn’t change what the label allows.' : ''}
              </p>
            )}
          </section>

          <section>
            <h2>The evidence that decides this job</h2>
            <ul className="evlist">
              {KEY.map((k) => {
                const found = k.id.some((i) => ev.has(i)) || (!!k.flag && f(k.flag));
                return (
                  <li key={k.label} className={found ? 'is-found' : 'is-missed'}>
                    <span className="evlist__mark" aria-hidden>{found ? '✓' : '–'}</span>
                    <div>
                      <strong>{k.label}</strong>
                      <p>{k.why}</p>
                      {!found && <em>This didn’t come up in your investigation.</em>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="debrief__expert">
          <h2>How an experienced tech reasons through it</h2>
          <p>
            PerimeterGuard SC’s label limits it to exterior building perimeters and says <b>do not apply indoors</b>. The complaint is
            inside, so it isn’t an option for that work. InteriorGuard Gel <i>could</i> fit, but only in specific indoor cracks and
            crevices the label lists, and never directly on food preparation surfaces. With the treatment area unconfirmed and food
            handling unknown, there’s nothing yet to match against that label. The defensible move is to confirm the site
            conditions first, then choose.
          </p>
        </section>

        <details className="debrief__transcript">
          <summary>Your side of the conversation ({path.length})</summary>
          <ol>{path.map((p, i) => <li key={i}>{p}</li>)}</ol>
        </details>

        <footer>
          <button className="btn btn--primary" onClick={restart}>Run the scenario again</button>
          <span>Notes in this record aren’t scored. They show what you found and how you used it.</span>
        </footer>
        <p className="debrief__fine">All products and identifiers in this activity are fictional.</p>
      </div>
    </div>
  );
}
