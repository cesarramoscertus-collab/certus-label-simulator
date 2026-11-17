// Deterministic, evidence-aware branching conversation with Alex (field supervisor).
// No AI API: every line is authored. Choices and replies read the learner's actual discoveries,
// so Alex never asks them to find something they already found, and questions instead of telling.

import type { EvidenceId } from '../content/evidence';

export type NodeId =
  | 'hub' | 'restrA' | 'rA_perim' | 'rA_law' | 'restrB' | 'rB_q' | 'sitesB'
  | 'think' | 'think_A' | 'think_B' | 'think_B2' | 'which' | 'which2'
  | 'decision' | 'dA_q' | 'dB_q' | 'dB_q2' | 'dB_q3' | 'dE_q' | 'dE_q2'
  | 'confirm' | 'k_food_q' | 'k_sites_q' | 'close_A' | 'askCustomer' | 'sB_food' | 'explain' | 'done';

export interface DCtx {
  ev: Set<EvidenceId>;
  flags: Set<string>;
}

export type Action = 'openWorkOrder' | 'complete';

export interface Result {
  alex: string[];
  node: NodeId;
  flags?: string[];
  evidence?: EvidenceId[];
  action?: Action;
}

interface ChoiceDef {
  id: string;
  text: string | ((c: DCtx) => string);
  once?: boolean;
  when?: (c: DCtx) => boolean;
  run: (c: DCtx) => Result;
}

// ── evidence helpers ──
const has = (c: DCtx, ...ids: EvidenceId[]) => ids.some((i) => c.ev.has(i));
const f = (c: DCtx, flag: string) => c.flags.has(flag);
const readA_restr = (c: DCtx) => has(c, 'A_restriction');
const readA_sites = (c: DCtx) => has(c, 'A_sites', 'A_directions');
const readB_sites = (c: DCtx) => has(c, 'B_sites', 'B_directions');
const readB_restr = (c: DCtx) => has(c, 'B_restriction');
const used = (c: DCtx, id: string) => f(c, 'used:' + id);

function catchLine(c: DCtx, second: string): { line: string; flag: string } {
  return f(c, 'caughtOnce')
    ? { line: second, flag: 'caughtOnce' }
    : { line: 'Good catch. What does that mean for this job?', flag: 'caughtOnce' };
}

function joinList(parts: string[]) {
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + (parts.length > 2 ? ',' : '') + ' and ' + parts[parts.length - 1];
}

function finalWords(c: DCtx): Result {
  const parts: string[] = [];
  if (f(c, 'k_loc')) parts.push('where the ants actually are');
  if (f(c, 'k_food')) parts.push('whether food is handled near those spots');
  if (f(c, 'k_sites')) parts.push('whether those spots are on the gel’s approved list');
  if (f(c, 'k_hist')) parts.push('what’s been put down there before');
  return {
    alex: [
      `So you’re not choosing anything until you know ${joinList(parts)}.`,
      'PerimeterGuard stays on the truck for the inside work. The gel might fit, once you can match the actual spots to its label.',
      'That’s a call I can defend to the customer and to an inspector. Go find the site manager.',
    ],
    node: 'done',
    flags: ['outcome:confirm'],
    action: 'complete',
  };
}

function closing(c: DCtx): Result {
  if (!f(c, 'A_out')) {
    return {
      alex: ['One more. Once you have those answers, is PerimeterGuard in the running for the inside work?'],
      node: 'close_A',
    };
  }
  return explain();
}

function explain(): Result {
  return {
    alex: ['Okay. The site manager’s going to ask what you’re putting down today. What do you tell them?'],
    node: 'explain',
  };
}

function recommendation(c: DCtx) {
  const needs = ['exactly where you’re seeing the ants'];
  if (f(c, 'k_food') || f(c, 'foodConcern')) needs.push('whether food is prepared or handled in those spots');
  const gel = f(c, 'k_sites') || readB_sites(c)
    ? 'If those spots match the approved cracks and crevices on the gel label, that’s what I’d use.'
    : 'Then I’ll match the spots to what the gel label allows.';
  return `“Nothing yet. First I need to see ${joinList(needs)}. ${gel} The perimeter product can’t be used inside.”`;
}

const NODES: Record<NodeId, ChoiceDef[]> = {
  // ─────────────── open investigation ───────────────
  hub: [
    {
      id: 'h_labels', once: true, text: 'Let me check the labels.',
      run: () => ({ alex: ['Go ahead. Both are on the tray. Take your time with them.'], node: 'hub', flags: ['labelsIntent'] }),
    },
    {
      id: 'h_where', once: true, text: 'Do we know where the ants are?',
      run: () => ({
        alex: ['The customer reported ants somewhere inside, but I haven’t confirmed the exact location yet.'],
        node: 'hub', evidence: ['AX_location'],
      }),
    },
    {
      id: 'h_history', once: true, text: 'Have we treated this location before?',
      run: () => ({
        alex: ['Not that I can find. Nothing in our account history.', 'Doesn’t mean nobody has. Another company could’ve been out here.'],
        node: 'hub', evidence: ['AX_history'],
      }),
    },
    {
      id: 'h_food', once: true, text: 'Is there any food handling or food prep at this facility?',
      when: (c) => used(c, 'h_where') || f(c, 'woOpened') || readB_restr(c) || readB_sites(c),
      run: () => ({
        alex: ['Couldn’t tell you. The account’s just listed as commercial.', 'Could be offices, could be a warehouse with a break room, could be a kitchen. I haven’t been inside.'],
        node: 'hub', evidence: ['AX_food'],
      }),
    },
    {
      id: 'h_site', once: true, text: 'What else do we know about the site?',
      when: (c) => used(c, 'h_where') || f(c, 'woOpened'),
      run: () => ({
        alex: ['What’s on the work order is about all I have. Indoor, commercial, ants.', 'Site manager’s expecting you at the front entrance.'],
        node: 'hub', evidence: ['AX_site'],
      }),
    },
    {
      id: 'h_wo', once: true, text: 'Can you send me the work order?',
      when: (c) => !f(c, 'woOpened'),
      run: () => ({ alex: ['Sent it to your tablet.'], node: 'hub', action: 'openWorkOrder' }),
    },
    {
      id: 'h_lookB', once: true, text: 'Let me take a look at the gel.',
      when: (c) => f(c, 'askedSecond') && !readB_sites(c),
      run: () => ({ alex: ['Go ahead.'], node: 'hub' }),
    },
    {
      id: 'h_locGap', once: true, text: 'The work order doesn’t say exactly where the ants are.',
      when: (c) => has(c, 'WO_area', 'AX_location') && !f(c, 'locGap'),
      run: () => ({ alex: ['That’s the missing piece. What would you ask the customer?'], node: 'askCustomer', flags: ['locGap'] }),
    },
    {
      id: 'h_restrA', text: 'PerimeterGuard’s label says not to apply indoors.',
      when: (c) => readA_restr(c) && !f(c, 'discussedA'),
      run: (c) => {
        const k = catchLine(c, 'Right. What does that mean for this job?');
        return { alex: [k.line], node: 'restrA', flags: [k.flag, 'discussedA'] };
      },
    },
    {
      id: 'h_restrB', text: 'InteriorGuard can’t go directly on food prep surfaces.',
      when: (c) => readB_restr(c) && !f(c, 'discussedB'),
      run: (c) => {
        const k = catchLine(c, 'Okay. And how does that play into this job?');
        return { alex: [k.line], node: 'restrB', flags: [k.flag, 'discussedB'] };
      },
    },
    {
      id: 'h_sitesB', text: 'InteriorGuard is limited to specific indoor cracks and crevices.',
      when: (c) => readB_sites(c) && !f(c, 'discussedSitesB'),
      run: () => ({ alex: ['Looks promising. Anything we still need to verify?'], node: 'sitesB', flags: ['discussedSitesB'] }),
    },
    {
      id: 'h_think', text: 'I think I know which product to use.',
      when: (c) => !f(c, 'thinkAsked') && !f(c, 'decisionAsked'),
      run: () => ({ alex: ['Okay. What does the label tell you about where that product can be applied?'], node: 'think', flags: ['thinkAsked'] }),
    },
    {
      id: 'h_ready',
      text: (c) => (f(c, 'reconsider') ? 'Okay, I’ve taken another look. I’m ready to make a call.' : 'I’m ready to make a call.'),
      when: (c) => c.ev.size >= 3 || f(c, 'thinkAsked') || f(c, 'decisionAsked'),
      run: (c) => ({
        alex: [f(c, 'decisionAsked') ? 'Okay. Where are you landing now?' : 'All right. What are you thinking? Which product would you use for this job?'],
        node: 'decision', flags: ['decisionAsked'],
      }),
    },
  ],

  // ─────────────── restriction on A identified ───────────────
  restrA: [
    {
      id: 'rA1', text: 'No. The label says not to apply indoors, and the ants are inside.',
      run: () => ({ alex: ['Right. What about the second product?'], node: 'hub', flags: ['A_out', 'askedSecond'] }),
    },
    {
      id: 'rA2', text: 'It could, if we treat the outside perimeter.',
      run: () => ({
        alex: ['Maybe, down the road. But the call is about ants inside, and we don’t know where they’re coming from.', 'Would a perimeter band by itself answer what the customer called about?'],
        node: 'rA_perim',
      }),
    },
    {
      id: 'rA3', text: 'Probably. It’s labeled for ants.',
      run: () => ({
        alex: ['Might kill ants. That’s not the question.', 'The label tells you where it can legally go. What did that restriction say, word for word?'],
        node: 'rA_law', flags: ['reconsidered'],
      }),
    },
  ],
  rA_perim: [
    { id: 'rAp1', text: 'Not by itself. I’d need to know more first.', run: () => ({ alex: ['Fair. Hold that thought.'], node: 'hub', flags: ['A_out'] }) },
    {
      id: 'rAp2', text: 'Probably. It would stop them from getting in.',
      run: () => ({ alex: ['Could help, if they’re coming from outside. We don’t know that yet. Right now it’s a guess.'], node: 'hub', flags: ['A_out', 'assumed'] }),
    },
  ],
  rA_law: [
    {
      id: 'rAl1', text: '“Do not apply indoors.” So inside is off the table.',
      run: () => ({ alex: ['That’s the label. It isn’t a suggestion.'], node: 'hub', flags: ['A_out'] }),
    },
  ],

  // ─────────────── restriction on B identified ───────────────
  restrB: [
    {
      id: 'rB1', text: 'We’d need to know if food is prepared anywhere near the ants.',
      run: (c) => {
        if (has(c, 'AX_food')) return { alex: ['You already asked me, and I didn’t know. So that one’s still open.'], node: 'hub', flags: ['foodConcern'] };
        if (has(c, 'WO_food')) return { alex: ['Work order says unknown. So that one’s still open.'], node: 'hub', flags: ['foodConcern'] };
        return { alex: ['Do we know that right now?'], node: 'rB_q', flags: ['foodConcern'] };
      },
    },
    {
      id: 'rB2', text: 'We’d just keep it off the counters.',
      run: () => ({
        alex: ['That’s part of it.', 'Do we know whether this place even has food prep areas, or where they are compared to the ants?'],
        node: 'rB_q', flags: ['foodConcern'],
      }),
    },
    {
      id: 'rB3', text: 'It’s a bait gel, so it’s pretty low risk.',
      run: () => ({
        alex: ['Low risk isn’t what the label says. It says where it can and can’t go.', 'That restriction applies no matter how the product’s formulated.'],
        node: 'hub', flags: ['reconsidered'],
      }),
    },
  ],
  rB_q: [
    { id: 'rBq1', text: 'No. Nothing I’ve seen says either way.', run: () => ({ alex: ['Then it goes on your list.'], node: 'hub' }) },
    {
      id: 'rBq2', text: 'There’s probably a break room somewhere.',
      run: () => ({ alex: ['Probably isn’t something you can write on a service record.'], node: 'hub', flags: ['assumed'] }),
    },
  ],

  // ─────────────── B application sites raised ───────────────
  sitesB: [
    {
      id: 'sB1', text: 'Where exactly the ants are. The work order doesn’t say.',
      run: () => ({ alex: ['That’s the missing piece. What would you ask the customer?'], node: 'askCustomer', flags: ['locGap'] }),
    },
    {
      id: 'sB3', once: true, text: 'Whether there’s food prep near where we’d put it.',
      run: (c) => readB_restr(c)
        ? { alex: ['That matters, given what its restrictions say about food prep surfaces. What else?'], node: 'sitesB', flags: ['foodConcern'] }
        : { alex: ['Why would that matter for the gel?'], node: 'sB_food', flags: ['foodConcern'] },
    },
    {
      id: 'sB2', text: 'Nothing. It’s labeled for indoor ants, so we’re set.',
      run: () => ({
        alex: ['It’s labeled for specific indoor cracks and crevices.', 'Which cracks, at this site?'],
        node: 'think_B', flags: ['assumed'],
      }),
    },
  ],
  sB_food: [
    { id: 'sBf1', text: 'I’d have to check its restrictions to be sure.', run: () => ({ alex: ['Then check them.'], node: 'hub', flags: ['reconsider'] }) },
  ],
  askCustomer: [
    {
      id: 'q_loc', once: true, text: '“Where exactly have you been seeing the ants?”',
      run: () => ({ alex: ['First question I’d ask too. It tells you whether there’s a labeled site to treat at all.'], node: 'askCustomer', flags: ['k_loc'] }),
    },
    {
      id: 'q_food', once: true, text: '“Is food prepared, served, or stored in those areas?”',
      run: (c) => ({
        alex: [readB_restr(c) ? 'That decides how the gel’s restrictions apply in there.' : 'Worth knowing. Check what the gel label says about food areas before you go in.'],
        node: 'askCustomer', flags: ['k_food'],
      }),
    },
    {
      id: 'q_hist', once: true, text: '“Has anyone treated for ants here before? With what?”',
      run: () => ({ alex: ['Good to know before you put anything else down.'], node: 'askCustomer', flags: ['k_hist'] }),
    },
    {
      id: 'q_pref', once: true, text: '“Which product would you like us to use?”',
      run: () => ({ alex: ['They’ll look at you for that. Picking the product is our job, and the label decides where it can go.'], node: 'askCustomer', flags: ['distractor', 'used:k_cust'] }),
    },
    {
      id: 'q_done', text: 'That’s what I’d ask.',
      when: (c) => f(c, 'k_loc') || f(c, 'k_food'),
      run: (c) => ({
        alex: [f(c, 'k_loc') ? 'Good list. Hang on to it.' : 'You’d still want to know where they’re actually seeing ants.'],
        node: f(c, 'k_loc') ? 'hub' : 'askCustomer',
      }),
    },
  ],

  // ─────────────── "I think I know which product" ───────────────
  think: [
    {
      id: 'tA', text: 'PerimeterGuard: exterior building perimeters.',
      when: readA_sites,
      run: () => ({ alex: ['And where did the customer see the ants?'], node: 'think_A' }),
    },
    {
      id: 'tB', text: 'InteriorGuard: specific indoor cracks and crevices.',
      when: readB_sites,
      run: () => ({ alex: ['Which cracks and crevices, at this site?'], node: 'think_B' }),
    },
    {
      id: 'tP', text: 'Both list ants, so either one should work.',
      run: () => ({
        alex: ['Ants on the label tells you what it controls.', 'It doesn’t tell you where you can put it. Which section does?'],
        node: 'which', flags: ['assumed'],
      }),
    },
    {
      id: 'tN', text: 'I haven’t actually checked that part yet.',
      when: (c) => !readA_sites(c) || !readB_sites(c),
      run: () => ({ alex: ['Which section of the label would tell you?'], node: 'which' }),
    },
  ],
  think_A: [
    { id: 'tA1', text: 'Inside. So it doesn’t fit this complaint.', run: () => ({ alex: ['Okay. Keep going.'], node: 'hub', flags: ['A_out'] }) },
    {
      id: 'tA2', text: 'They didn’t say exactly.',
      run: () => ({ alex: ['They said inside. Exactly where, we don’t know.', 'Does an exterior-only product fit an inside complaint?'], node: 'think_B2', flags: ['locGap'] }),
    },
  ],
  think_B2: [
    { id: 'tB21', text: 'No. Not for the inside work.', run: () => ({ alex: ['Okay.'], node: 'hub', flags: ['A_out'] }) },
  ],
  think_B: [
    {
      id: 'tB1', text: 'We don’t know yet. Nobody’s confirmed where the ants are.',
      run: () => ({ alex: ['Then you know what you’re missing.'], node: 'hub', flags: ['locGap'] }),
    },
    {
      id: 'tB2', text: 'Wherever the ants are trailing.',
      run: () => ({ alex: ['And where’s that?'], node: 'which2', flags: ['assumed'] }),
    },
  ],
  which2: [
    { id: 'w2a', text: '…We don’t know yet.', run: () => ({ alex: ['Right.'], node: 'hub', flags: ['locGap'] }) },
  ],
  which: [
    {
      id: 'ws1', once: true, text: 'Application sites.',
      run: () => ({ alex: ['That’s one. Read it on both before you decide.'], node: 'hub', flags: ['reconsider'] }),
    },
    {
      id: 'ws2', once: true, text: 'Directions for use.',
      run: () => ({ alex: ['That’s part of it. Anything else on a label that limits where it can go?'], node: 'which', flags: ['reconsider'] }),
    },
    {
      id: 'ws5', once: true, text: 'Restrictions.',
      when: (c) => used(c, 'ws2') || used(c, 'ws1'),
      run: () => ({ alex: ['Check all of those, on both products.'], node: 'hub', flags: ['reconsider'] }),
    },
    {
      id: 'ws3', once: true, text: 'Target pests.',
      run: () => ({ alex: ['That tells you what it’s for, not where it goes. Try again.'], node: 'which' }),
    },
    {
      id: 'ws4', once: true, text: 'The front panel.',
      run: () => ({ alex: ['Front panel’s mostly the name, the signal word, and the active ingredient. Where would the use instructions be?'], node: 'which' }),
    },
  ],

  // ─────────────── decision ───────────────
  decision: [
    {
      id: 'dA', text: 'I’d use PerimeterGuard SC.',
      when: (c) => !f(c, 'A_out'),
      run: (c) => readA_restr(c)
        ? { alex: ['You looked at the back of that bottle. What did the restrictions say?'], node: 'dA_q', flags: ['choseA'] }
        : {
          alex: ['Before you load that up, what does its label say about where it can go?', 'Pick it up again and go through the whole thing. Then tell me.'],
          node: 'hub', flags: ['choseA', 'reconsider'],
        },
    },
    {
      id: 'dB', text: 'InteriorGuard Gel looks like the better choice.',
      run: (c) => readB_sites(c)
        ? { alex: ['It might end up being the one.', 'Its label limits it to specific indoor cracks and crevices. Do we know where we’d be putting it?'], node: 'dB_q', flags: ['choseB'] }
        : { alex: ['Maybe. Which part of that label tells you whether it fits this job?'], node: 'which', flags: ['choseB', 'reconsider'] },
    },
    {
      id: 'dE', text: 'Either one should work.',
      run: (c) => readA_restr(c)
        ? { alex: ['Even with what the PerimeterGuard label says about indoor use?'], node: 'dE_q', flags: ['choseEither'] }
        : { alex: ['Both labels list ants. Do both say the same thing about where they can be applied?'], node: 'dE_q2', flags: ['choseEither'] },
    },
    {
      id: 'dC', text: 'I need to confirm a few things before choosing.',
      run: () => ({ alex: ['What would you want to confirm?'], node: 'confirm', flags: ['choseConfirm'] }),
    },
    {
      id: 'dBack', text: 'Let me look at a few more things first.',
      run: () => ({ alex: ['Sure. I’m here.'], node: 'hub' }),
    },
  ],
  dA_q: [
    {
      id: 'dAq1', text: '“Do not apply indoors.” That rules it out here.',
      run: () => ({ alex: ['So where does that leave you?'], node: 'decision', flags: ['A_out', 'reconsidered'] }),
    },
    {
      id: 'dAq2', text: 'I don’t remember exactly.',
      run: () => ({ alex: ['Then go look again before you load anything.'], node: 'hub', flags: ['reconsider'] }),
    },
  ],
  dB_q: [
    {
      id: 'dBq1', text: 'No. The treatment area isn’t confirmed yet.',
      run: () => ({ alex: ['So are you ready to pick it?'], node: 'dB_q2', flags: ['locGap'] }),
    },
    {
      id: 'dBq2', text: 'Probably a kitchen or break room.',
      run: (c) => readB_restr(c)
        ? { alex: ['Probably isn’t a location. And if it is a kitchen, you read what that label says about food prep surfaces.', 'What does that mean for picking it right now?'], node: 'dB_q3', flags: ['assumed'] }
        : { alex: ['Probably isn’t a location.', 'And if it is a kitchen, check what that label says about food prep before you decide anything.'], node: 'hub', flags: ['assumed', 'reconsider'] },
    },
  ],
  dB_q2: [
    { id: 'dBq21', text: 'Not yet. I need to confirm a few things first.', run: () => ({ alex: ['What would you want to confirm?'], node: 'confirm', flags: ['reconsidered'] }) },
    {
      id: 'dBq22', text: 'Yes. I’ll figure out the spots once I’m inside.',
      run: () => ({ alex: ['Then you’d be choosing before you know whether those spots are on the label.', 'What would you need to know first?'], node: 'confirm', flags: ['rushed', 'reconsidered'] }),
    },
  ],
  dB_q3: [
    { id: 'dBq31', text: 'I’d need to see the layout before I put anything down.', run: () => ({ alex: ['What else would you want to confirm?'], node: 'confirm', flags: ['reconsidered', 'foodConcern'] }) },
  ],
  dE_q: [
    { id: 'dEq1', text: 'Fair. PerimeterGuard’s out for the inside.', run: () => ({ alex: ['Okay. So where are you now?'], node: 'decision', flags: ['A_out', 'reconsidered'] }) },
    { id: 'dEq2', text: 'It would still kill ants.', run: () => ({ alex: ['Not the question. The label says where it can go, and inside isn’t on it.', 'So where are you now?'], node: 'decision', flags: ['A_out', 'reconsidered'] }) },
  ],
  dE_q2: [
    { id: 'dEq21', text: 'I’m not sure. I’ll check.', run: () => ({ alex: ['Take your time.'], node: 'hub', flags: ['reconsider'] }) },
  ],

  // ─────────────── what would you confirm? ───────────────
  confirm: [
    {
      id: 'k_loc', once: true, text: 'Exactly where the ants are active.',
      run: (c) => ({
        alex: [
          has(c, 'AX_location') ? 'Right. I told you “somewhere inside,” and that’s still all we have.'
            : has(c, 'WO_area') ? 'Right. The work order says the area isn’t confirmed.' : 'Right. Nobody’s confirmed that yet.',
          'Without it, you can’t match a spot to a label.',
        ],
        node: 'confirm', flags: ['k_loc'],
      }),
    },
    {
      id: 'k_food', once: true, text: 'Whether food is prepared or handled near those spots.',
      run: (c) => readB_restr(c)
        ? { alex: ['That matters for the gel. You saw its restriction on food prep surfaces, and food-handling areas are crack-and-crevice only.'], node: 'confirm', flags: ['k_food'] }
        : { alex: ['Why does that matter for this job?'], node: 'k_food_q', flags: ['k_food'] },
    },
    {
      id: 'k_sites', once: true, text: 'Whether those spots are approved sites on the InteriorGuard label.',
      run: (c) => readB_sites(c)
        ? { alex: ['Right. “Specific cracks and crevices” means you match the spot to the list, not the other way around.'], node: 'confirm', flags: ['k_sites'] }
        : { alex: ['Have you read that list yet?'], node: 'k_sites_q', flags: ['k_sites'] },
    },
    {
      id: 'k_hist', once: true, text: 'Whether anything’s been applied there before, and what.',
      run: () => ({ alex: ['Worth asking the manager. Nothing in our records, but somebody else may have been out.'], node: 'confirm', flags: ['k_hist'] }),
    },
    {
      id: 'k_cust', once: true, text: 'Which product the customer would prefer.',
      run: () => ({ alex: ['They’ll have opinions. The label still decides where product can go.'], node: 'confirm', flags: ['distractor'] }),
    },
    {
      id: 'k_cost', once: true, text: 'Which product costs less.',
      run: () => ({ alex: ['Cost won’t make it defensible. What about the job itself?'], node: 'confirm', flags: ['distractor'] }),
    },
    {
      id: 'k_done', text: 'That’s what I’d need before choosing.',
      when: (c) => f(c, 'k_loc') && (f(c, 'k_food') || f(c, 'k_sites')),
      run: (c) => closing(c),
    },
    {
      id: 'k_stuck', text: 'I can’t think of anything else.',
      when: (c) => !(f(c, 'k_loc') && (f(c, 'k_food') || f(c, 'k_sites'))) &&
        ['k_loc', 'k_food', 'k_sites', 'k_hist', 'k_cust', 'k_cost'].filter((k) => used(c, k)).length >= 2,
      run: (c) => ({
        alex: [!f(c, 'k_loc')
          ? 'Think about it from the label’s side. Can you match a spot to a label if you don’t know the spot?'
          : 'What about what’s around those spots? Anything on the gel label that would care?'],
        node: 'confirm',
      }),
    },
  ],
  k_food_q: [
    {
      id: 'kf1', text: 'I’d want to check the gel label’s restrictions for that.',
      run: () => ({ alex: ['Do that before you go in.'], node: 'confirm', flags: ['reconsider'] }),
    },
    {
      id: 'kf2', text: 'Food areas usually come with tighter label rules.',
      run: () => ({ alex: ['They do. And that gel label has something to say about it. Worth reading before you go in.'], node: 'confirm' }),
    },
  ],
  k_sites_q: [
    { id: 'ks1', text: 'Not closely. I’ll check it.', run: () => ({ alex: ['Do that.'], node: 'confirm', flags: ['reconsider'] }) },
  ],
  close_A: [
    {
      id: 'cA1', text: 'No. Its label says do not apply indoors.',
      when: readA_restr,
      run: () => ({ ...explain(), flags: ['A_out'] }),
    },
    {
      id: 'cA2', text: 'Maybe, if the ants are near the walls.',
      run: (c) => readA_restr(c)
        ? { alex: ['You read the back of that bottle. Near the walls inside is still inside.'], node: 'close_A', flags: ['assumed'] }
        : { alex: ['Check the back of that bottle before you answer that.'], node: 'hub', flags: ['assumed', 'reconsider'] },
    },
    {
      id: 'cA3', text: 'I’d have to check its label.',
      when: (c) => !readA_restr(c),
      run: () => ({ alex: ['Go do that. I’ll wait.'], node: 'hub', flags: ['reconsider'] }),
    },
  ],
  explain: [
    {
      id: 'x_gel', once: true, text: '“I’ll use the gel. It’s the indoor product.”',
      run: () => ({ alex: ['That’s a pick without a location. What do you actually need from them first?'], node: 'explain', flags: ['rushed'] }),
    },
    {
      id: 'x_good', text: (c) => recommendation(c),
      run: (c) => finalWords(c),
    },
    {
      id: 'x_perim', once: true, text: '“I’ll spray the perimeter so they stop coming in.”',
      run: () => ({ alex: ['The ants are inside, and that label says not indoors. Try that again.'], node: 'explain', flags: ['assumed'] }),
    },
    {
      id: 'x_office', once: true, text: '“I’ll come back once the office gets more information.”',
      run: () => ({ alex: ['You’re on site. You can get that from the manager right now. How would you put it?'], node: 'explain' }),
    },
  ],
  done: [],
};

/**
 * Alex speaking up unprompted when the learner turns up something important.
 * Only fires while the conversation is idle in the hub, and each one only once.
 */
export function proactive(c: DCtx): Result | null {
  if (readA_restr(c) && !f(c, 'discussedA') && !f(c, 'proA')) {
    return { alex: ['So, does that product work for this job?'], node: 'restrA', flags: ['proA', 'discussedA'] };
  }
  if (readB_sites(c) && !f(c, 'discussedSitesB') && !f(c, 'proB')) {
    return { alex: ['Looks promising. Anything we still need to verify?'], node: 'sitesB', flags: ['proB', 'discussedSitesB'] };
  }
  return null;
}

export function choicesFor(node: NodeId, c: DCtx): { id: string; text: string }[] {
  return NODES[node]
    .filter((d) => !(d.once && used(c, d.id)))
    .filter((d) => (d.when ? d.when(c) : true))
    .map((d) => ({ id: d.id, text: typeof d.text === 'function' ? d.text(c) : d.text }));
}

export function choose(node: NodeId, id: string, c: DCtx): Result & { playerText: string } {
  const def = NODES[node].find((d) => d.id === id);
  if (!def) throw new Error(`No choice ${id} in ${node}`);
  const r = def.run(c);
  const playerText = typeof def.text === 'function' ? def.text(c) : def.text;
  return { ...r, flags: [...(r.flags ?? []), 'used:' + id], playerText };
}

export const OPENING = ['We’ve got an ant complaint at this facility. Before you head inside, take a look at the two products in the truck.'];
