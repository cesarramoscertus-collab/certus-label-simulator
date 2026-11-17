import { useSim } from '../store';
import { startAmbient } from '../audio/ambient';

export function Intro() {
  const mode = useSim((s) => s.mode);
  const begin = useSim((s) => s.begin);
  if (mode !== 'intro') return null;
  return (
    <div className="intro">
      <div className="intro__card">
        <div className="intro__eyebrow">CERTUS Elite Technician Certification · Field Simulation</div>
        <h1>Two products. One ant call.<br /><span>Make a decision you can defend.</span></h1>
        <p>
          You’re on site at a commercial account. Before you go inside, your supervisor wants you to look over
          what’s in the truck. Handle the products, read what the labels actually say, check the job details,
          and talk it through with Alex.
        </p>
        <ul className="intro__how">
          <li><b>Pick up</b> a product from the tray and turn it in your hands.</li>
          <li><b>Tap the label</b> to open it full size and read it. What you examine goes into your field notes.</li>
          <li><b>Talk to Alex</b> whenever you want. There’s no set order.</li>
        </ul>
        <div className="intro__foot">
          <button className="btn btn--primary" onClick={() => { startAmbient(); begin(); }} autoFocus>
            Start at the truck
          </button>
          <span>About 5–7 minutes · Sound on for ambience (you can mute it)</span>
        </div>
        <p className="intro__fine">All products, labels, and registration identifiers in this activity are fictional training examples.</p>
      </div>
    </div>
  );
}
