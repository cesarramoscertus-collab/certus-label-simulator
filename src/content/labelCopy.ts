// Single source of truth for label wording. Both the 3D label texture (canvas) and the flat,
// zoomable HTML inspection view render from this data, so they can never disagree.
// Units are U.S. customary only. Every identifier is fictional.

import type { EvidenceId } from './evidence';

export type Size = 'xs' | 's' | 'body' | 'h' | 'band' | 'l' | 'xl' | 'xxl';
/** Canvas pixel size for each token at unit 1 (HTML uses px / 32 as em). */
export const SIZE_PX: Record<Size, number> = { xs: 26, s: 29, body: 32, h: 36, band: 40, l: 46, xl: 54, xxl: 74 };

export type Block =
  | { k: 'band'; text: string; tone?: 'navy' | 'teal'; size?: Size }
  | { k: 'h'; text: string; size?: Size; align?: 'center'; color?: 'navy' | 'ink' | 'teal'; rule?: boolean; tracking?: boolean }
  | { k: 'p'; text: string; size?: Size; muted?: boolean; bold?: boolean; align?: 'center'; italic?: boolean }
  | { k: 'ul'; items: string[]; size?: Size }
  | { k: 'rows'; rows: [string, string, boolean?][]; note: string }
  | { k: 'brand'; product: 'A' | 'B' }
  | { k: 'pests'; product: 'A' | 'B'; lines: string[] }
  | { k: 'tube' }
  | { k: 'barcode'; caption: string }
  | { k: 'gap'; n: number };

export interface SectionCopy {
  id: string;
  title: string;
  evidence?: EvidenceId;
  box?: boolean; // bordered "Restrictions" style box
  blocks: Block[];
}

export interface PanelCopy {
  id: string;
  name: string;      // "Front panel"
  face: number;      // canvas face index (A: always 0; B: box face)
  hero?: boolean;    // navy hero background (B front)
  sections: SectionCopy[];
}

export const DISCLAIMER = 'FICTIONAL TRAINING LABEL · NOT A REAL PRODUCT · NOT FOR SALE OR USE · CERTUS INSTRUCTIONAL MATERIAL';
const FICT_ID = '†Fictional training identifiers — not EPA registration numbers.';
const FICT_AI = '*Fictional training ingredient. Not a real chemical.';
const VIOLATION = '*It is a violation of Federal law to use this product in a manner inconsistent with its labeling.*';

// ═════════════════════════ PRODUCT A — PerimeterGuard SC ═════════════════════════
// Panels listed in the order you meet them turning the bottle to the right from the front.
export const A_PANELS: PanelCopy[] = [
  {
    id: 'A_front_panel', name: 'Front panel', face: 0,
    sections: [
      {
        id: 'A_front', title: 'Product identity', evidence: 'A_name', blocks: [
          { k: 'h', text: 'PROFESSIONAL PEST CONTROL PRODUCT', size: 's', color: 'teal', tracking: true },
          { k: 'brand', product: 'A' },
          { k: 'h', text: 'INSECTICIDE · SUSPENSION CONCENTRATE', size: 'h', color: 'ink', rule: true },
        ],
      },
      { id: 'A_front_pests', title: 'Target pests (front claim)', evidence: 'A_pests', blocks: [{ k: 'pests', product: 'A', lines: ['Controls ants', 'and crawling', 'insects'] }] },
      {
        id: 'A_active', title: 'Active ingredient', blocks: [
          { k: 'rows', rows: [['ACTIVE INGREDIENT:', '', true], ['Trainexolin*', '7.9%'], ['OTHER INGREDIENTS:', '92.1%'], ['TOTAL:', '100.0%', true]], note: FICT_AI },
        ],
      },
      {
        id: 'A_signal', title: 'Signal word', blocks: [
          { k: 'h', text: 'KEEP OUT OF REACH OF CHILDREN', size: 'l', align: 'center', color: 'ink' },
          { k: 'h', text: 'CAUTION', size: 'xxl', align: 'center', color: 'ink' },
          { k: 'p', text: 'See right side panel for additional precautionary statements.', size: 's', muted: true, align: 'center' },
        ],
      },
      {
        id: 'A_epa', title: 'Registration identifiers (fictional)', blocks: [
          { k: 'p', text: '**EPA Reg. No.** TRAINING-PG-001†    **EPA Est. No.** TRAINING-01†', size: 's' },
          { k: 'p', text: FICT_ID, size: 'xs', muted: true },
        ],
      },
      { id: 'A_net', title: 'Net contents', blocks: [{ k: 'h', text: 'NET CONTENTS: 1 QUART (32 FL OZ)', size: 'h', align: 'center' }] },
    ],
  },
  {
    id: 'A_right_panel', name: 'Right side panel', face: 0,
    sections: [
      {
        id: 'A_ppe', title: 'Precautionary Statements', evidence: 'A_ppe', blocks: [
          { k: 'band', text: 'PRECAUTIONARY STATEMENTS', size: 'band' },
          { k: 'h', text: 'Hazards to Humans and Domestic Animals', size: 'body' },
          { k: 'p', text: '**CAUTION.** Harmful if absorbed through skin. Avoid contact with skin, eyes, or clothing. Wash thoroughly with soap and water after handling and before eating, drinking, or using tobacco.' },
          { k: 'h', text: 'Personal Protective Equipment', size: 'body' },
          { k: 'p', text: 'Applicators must wear long-sleeved shirt, long pants, shoes plus socks, and chemical-resistant gloves.' },
        ],
      },
      {
        id: 'A_firstaid', title: 'First Aid', blocks: [
          { k: 'band', text: 'FIRST AID', tone: 'teal', size: 'h' },
          { k: 'p', text: '**If on skin or clothing:** Take off contaminated clothing. Rinse skin with plenty of water.' },
          { k: 'p', text: '**If in eyes:** Hold eye open and rinse slowly and gently with water.' },
          { k: 'p', text: '**If swallowed:** Call a poison control center or doctor for treatment advice.' },
          { k: 'p', text: 'Have the product container or label with you when seeking treatment.', size: 's', muted: true },
        ],
      },
      {
        id: 'A_env', title: 'Environmental Hazards', blocks: [
          { k: 'h', text: 'Environmental Hazards', size: 'body' },
          { k: 'p', text: 'This product is toxic to fish and aquatic invertebrates. Do not apply directly to water or to areas where surface water is present.' },
        ],
      },
    ],
  },
  {
    id: 'A_back_panel', name: 'Back panel', face: 0,
    sections: [
      {
        id: 'A_dfu', title: 'Directions for Use (heading)', blocks: [
          { k: 'band', text: 'DIRECTIONS FOR USE', size: 'l' },
          { k: 'p', text: VIOLATION, size: 's', muted: true },
        ],
      },
      {
        id: 'A_pests', title: 'Target Pests', evidence: 'A_pests', blocks: [
          { k: 'h', text: 'TARGET PESTS', rule: true },
          { k: 'p', text: 'Ants and crawling insects, including pavement ants, odorous house ants, ground beetles, and millipedes.' },
        ],
      },
      {
        id: 'A_sites', title: 'Application Sites', evidence: 'A_sites', blocks: [
          { k: 'h', text: 'APPLICATION SITES', rule: true },
          { k: 'p', text: '**Exterior building perimeters:** foundations, exterior walls up to 3 ft above grade, and soil or turf in a band up to 10 ft out from the foundation.' },
        ],
      },
      {
        id: 'A_mix', title: 'Mixing', blocks: [
          { k: 'h', text: 'MIXING', rule: true },
          { k: 'p', text: 'Mix 0.5 fl oz per 1 gallon of water. Apply 1 gallon of finished spray per 1,000 sq ft.' },
        ],
      },
      {
        id: 'A_directions', title: 'Directions for Use', evidence: 'A_directions', blocks: [
          { k: 'h', text: 'HOW TO APPLY', rule: true },
          { k: 'p', text: '**Exterior perimeter applications only.** Apply as a coarse, low-pressure band spray around the outside of the structure, treating where pests enter.' },
        ],
      },
      {
        id: 'A_restriction', title: 'Restrictions', evidence: 'A_restriction', box: true, blocks: [
          { k: 'band', text: 'RESTRICTIONS', size: 'band' },
          { k: 'h', text: 'DO NOT APPLY INDOORS.', size: 'xl' },
          { k: 'p', text: 'Do not apply to or allow drift onto food, feed, or water. Do not apply when rain is expected within 24 hours. Do not water treated areas to the point of runoff.', size: 's' },
        ],
      },
    ],
  },
  {
    id: 'A_left_panel', name: 'Left side panel', face: 0,
    sections: [
      {
        id: 'A_storage', title: 'Storage and Disposal', evidence: 'A_storage', blocks: [
          { k: 'band', text: 'STORAGE AND DISPOSAL', size: 'band' },
          { k: 'p', text: 'Do not contaminate water, food, or feed by storage or disposal.', bold: true },
          { k: 'p', text: '**Pesticide Storage:** Store in the original container in a cool, dry, locked area inaccessible to children and pets. Do not store below 32°F. Keep container closed when not in use.' },
          { k: 'p', text: '**Pesticide Disposal:** Wastes resulting from the use of this product must be disposed of on site or at an approved waste disposal facility.' },
          { k: 'p', text: '**Container Handling:** Nonrefillable container. Do not reuse or refill this container. Triple rinse promptly after emptying. Offer for recycling if available.' },
        ],
      },
      {
        id: 'A_warranty', title: 'Conditions of Sale', blocks: [
          { k: 'h', text: 'CONDITIONS OF SALE', size: 'h', rule: true },
          { k: 'p', text: 'Read the entire label before use. Follow directions carefully. The directions on this label reflect the conditions of use for this training example only.', size: 's', muted: true },
        ],
      },
      {
        id: 'A_maker', title: 'Manufacturer', blocks: [
          { k: 'p', text: 'Manufactured for:', size: 's', muted: true },
          { k: 'p', text: '**Northfield Training Laboratories** (fictional)' },
          { k: 'p', text: 'Training Example Series · Label TRN-PG-2026', size: 's', muted: true },
          { k: 'barcode', caption: '0 00000 00001 0  TRAINING' },
        ],
      },
    ],
  },
];

// ═════════════════════════ PRODUCT B — InteriorGuard Gel carton ═════════════════════════
// Box face indices follow three.js BoxGeometry: 0 +X right, 1 -X left, 2 top, 3 bottom, 4 front, 5 back.
export const B_PANELS: PanelCopy[] = [
  {
    id: 'B_front_panel', name: 'Front panel', face: 4, hero: true,
    sections: [
      {
        id: 'B_front', title: 'Product identity', evidence: 'B_name', blocks: [
          { k: 'h', text: 'PROFESSIONAL PEST CONTROL PRODUCT', size: 's', color: 'teal', tracking: true },
          { k: 'brand', product: 'B' },
          { k: 'tube' },
        ],
      },
      { id: 'B_front_pests', title: 'Target pests (front claim)', evidence: 'B_pests', blocks: [{ k: 'pests', product: 'B', lines: ['Controls ants', 'and cockroaches'] }] },
      {
        id: 'B_active', title: 'Active ingredient', blocks: [
          { k: 'rows', rows: [['ACTIVE INGREDIENT:', '', true], ['Baitrinol*', '0.05%'], ['OTHER INGREDIENTS:', '99.95%'], ['TOTAL:', '100.00%', true]], note: FICT_AI },
        ],
      },
      {
        id: 'B_signal', title: 'Signal word', blocks: [
          { k: 'h', text: 'KEEP OUT OF REACH OF CHILDREN', size: 'l', align: 'center', color: 'ink' },
          { k: 'h', text: 'CAUTION', size: 'xxl', align: 'center', color: 'ink' },
          { k: 'p', text: 'See side panel for additional precautionary statements.', size: 's', muted: true, align: 'center' },
        ],
      },
      {
        id: 'B_epa', title: 'Registration identifiers (fictional)', blocks: [
          { k: 'p', text: '**EPA Reg. No.** TRAINING-IG-002†    **EPA Est. No.** TRAINING-02†', size: 's', align: 'center' },
          { k: 'p', text: FICT_ID, size: 'xs', muted: true, align: 'center' },
        ],
      },
      { id: 'B_net', title: 'Net contents', blocks: [{ k: 'h', text: '4 REAGENT TUBES · 1.06 OZ EACH · NET WT. 4.24 OZ', size: 'body', align: 'center' }] },
    ],
  },
  {
    id: 'B_right_panel', name: 'Right side panel', face: 0,
    sections: [
      {
        id: 'B_ppe', title: 'Precautionary Statements', evidence: 'B_ppe', blocks: [
          { k: 'band', text: 'PRECAUTIONS', size: 'band' },
          { k: 'h', text: 'Hazards to Humans and Domestic Animals', size: 'body' },
          { k: 'p', text: '**CAUTION.** Harmful if swallowed. Avoid contact with skin or eyes. Wear gloves when applying. Wash hands with soap and water after handling and before eating, drinking, or using tobacco.' },
        ],
      },
      {
        id: 'B_firstaid', title: 'First Aid', blocks: [
          { k: 'band', text: 'FIRST AID', tone: 'teal', size: 'h' },
          { k: 'p', text: '**If swallowed:** Call a poison control center or doctor for treatment advice.' },
          { k: 'p', text: '**If on skin:** Wash with plenty of soap and water.' },
          { k: 'p', text: '**If in eyes:** Rinse slowly and gently with water.' },
        ],
      },
      {
        id: 'B_env', title: 'Environmental Hazards', blocks: [
          { k: 'h', text: 'Environmental Hazards', size: 'body' },
          { k: 'p', text: 'Do not apply directly to water. Do not contaminate water when disposing of equipment.' },
        ],
      },
    ],
  },
  {
    id: 'B_back_panel', name: 'Back panel', face: 5,
    sections: [
      {
        id: 'B_dfu', title: 'Directions for Use (heading)', blocks: [
          { k: 'band', text: 'DIRECTIONS FOR USE', size: 'l' },
          { k: 'p', text: VIOLATION, size: 's', muted: true },
        ],
      },
      {
        id: 'B_pests', title: 'Target Pests', evidence: 'B_pests', blocks: [
          { k: 'h', text: 'TARGET PESTS', rule: true },
          { k: 'p', text: 'Ants (including odorous house, pavement, and Argentine ants) and cockroaches (including German and American cockroaches).' },
        ],
      },
      {
        id: 'B_sites', title: 'Application Sites', evidence: 'B_sites', blocks: [
          { k: 'h', text: 'APPLICATION SITES', rule: true },
          { k: 'p', text: '**For use in specific indoor cracks and crevices only.** Approved locations:' },
          { k: 'ul', items: [
            'Cracks and crevices along baseboards and moldings',
            'Voids behind and beneath appliances and equipment',
            'Gaps around plumbing penetrations and under sinks',
            'Cabinet hinges, door frames, and wall voids',
          ] },
          { k: 'p', text: 'Not for use as a surface, spot, or broadcast treatment.', bold: true },
        ],
      },
      {
        id: 'B_directions', title: 'Directions for Use', evidence: 'B_directions', blocks: [
          { k: 'h', text: 'HOW TO APPLY', rule: true },
          { k: 'p', text: '**Apply only in the approved locations listed on this label.** Inspect first to locate foraging trails and harborage. Place pea-sized spots (about 1/4 in) or short beads directly into cracks and crevices where pests are active. Reapply as bait is consumed.' },
        ],
      },
      {
        id: 'B_restriction', title: 'Restrictions', evidence: 'B_restriction', box: true, blocks: [
          { k: 'band', text: 'RESTRICTIONS', size: 'band' },
          { k: 'h', text: 'DO NOT APPLY DIRECTLY TO FOOD PREPARATION SURFACES.', size: 'xl' },
          { k: 'p', text: 'In food-handling areas, apply only into cracks and crevices. Do not contaminate food, utensils, or food-contact surfaces. Do not apply where children or pets can contact the bait.' },
        ],
      },
    ],
  },
  {
    id: 'B_left_panel', name: 'Left side panel', face: 1,
    sections: [
      {
        id: 'B_storage', title: 'Storage and Disposal', evidence: 'B_storage', blocks: [
          { k: 'band', text: 'STORAGE & DISPOSAL', size: 'band' },
          { k: 'p', text: 'Do not contaminate water, food, or feed by storage or disposal.', bold: true },
          { k: 'p', text: '**Storage:** Store in original container between 40°F and 90°F, away from food and feed, in a locked area.' },
          { k: 'p', text: '**Disposal:** Nonrefillable tubes. Do not reuse. Place empty tubes and carton in trash.' },
        ],
      },
      {
        id: 'B_maker', title: 'Manufacturer', blocks: [
          { k: 'p', text: 'Manufactured for:', size: 's', muted: true },
          { k: 'p', text: '**Northfield Training Laboratories** (fictional)' },
          { k: 'p', text: 'Training Example Series · Label TRN-IG-2026', size: 's', muted: true },
          { k: 'barcode', caption: '0 00000 00002 7  TRAINING' },
        ],
      },
    ],
  },
];

export const PANELS = { A: A_PANELS, B: B_PANELS };

export function findSection(product: 'A' | 'B', id: string) {
  for (const p of PANELS[product]) {
    const s = p.sections.find((x) => x.id === id);
    if (s) return { panel: p, section: s };
  }
  return null;
}

/** Plain-text version of a section (screen readers, journal, tests). */
export function sectionText(s: SectionCopy) {
  const out: string[] = [];
  for (const b of s.blocks) {
    if (b.k === 'band' || b.k === 'h' || b.k === 'p') out.push(b.text.replace(/\*/g, ''));
    if (b.k === 'ul') out.push(...b.items);
    if (b.k === 'rows') out.push(...b.rows.map((r) => `${r[0]} ${r[1]}`.trim()), b.note);
    if (b.k === 'pests') out.push(b.lines.join(' '));
  }
  return out.join('\n');
}
