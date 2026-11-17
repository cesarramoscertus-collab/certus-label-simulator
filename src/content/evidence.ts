// Evidence catalog. The journal records these when the learner actually encounters them.
// Entries describe what was found — never whether it is "the answer".

export type EvidenceId =
  | 'A_name' | 'A_pests' | 'A_sites' | 'A_directions' | 'A_restriction' | 'A_ppe' | 'A_storage'
  | 'B_name' | 'B_pests' | 'B_sites' | 'B_directions' | 'B_restriction' | 'B_ppe' | 'B_storage'
  | 'WO_complaint' | 'WO_location' | 'WO_area' | 'WO_food' | 'WO_history'
  | 'AX_location' | 'AX_history' | 'AX_food' | 'AX_site';

export type EvidenceSource = 'A' | 'B' | 'WO' | 'AX';

export interface EvidenceDef {
  id: EvidenceId;
  source: EvidenceSource;
  where: string; // where it was found
  note: string;  // what the technician would jot down
}

export const EVIDENCE: Record<EvidenceId, EvidenceDef> = {
  A_name: { id: 'A_name', source: 'A', where: 'PerimeterGuard SC · front panel', note: 'Suspension concentrate insecticide. Fictional training product, 1 quart (32 fl oz).' },
  A_pests: { id: 'A_pests', source: 'A', where: 'PerimeterGuard SC · Target Pests', note: 'Labeled for ants and crawling insects.' },
  A_sites: { id: 'A_sites', source: 'A', where: 'PerimeterGuard SC · Application Sites', note: 'Exterior building perimeters: foundations, exterior walls, and a band of soil or turf around the building.' },
  A_directions: { id: 'A_directions', source: 'A', where: 'PerimeterGuard SC · Directions for Use', note: 'Exterior perimeter applications only, as a coarse low-pressure band.' },
  A_restriction: { id: 'A_restriction', source: 'A', where: 'PerimeterGuard SC · Restrictions', note: '“Do not apply indoors.”' },
  A_ppe: { id: 'A_ppe', source: 'A', where: 'PerimeterGuard SC · Precautionary Statements', note: 'Long sleeves, long pants, shoes and socks, chemical-resistant gloves.' },
  A_storage: { id: 'A_storage', source: 'A', where: 'PerimeterGuard SC · Storage and Disposal', note: 'Store locked in original container; do not store below 32°F.' },

  B_name: { id: 'B_name', source: 'B', where: 'InteriorGuard Gel · front panel', note: 'Insecticide gel bait in reagent tubes. Fictional training product.' },
  B_pests: { id: 'B_pests', source: 'B', where: 'InteriorGuard Gel · Target Pests', note: 'Labeled for ants and cockroaches.' },
  B_sites: { id: 'B_sites', source: 'B', where: 'InteriorGuard Gel · Application Sites', note: 'Specific indoor cracks and crevices only — baseboards, voids behind/under equipment, plumbing penetrations, cabinet hinges.' },
  B_directions: { id: 'B_directions', source: 'B', where: 'InteriorGuard Gel · Directions for Use', note: 'Apply only in the approved locations listed on the label. Inspect first to find trails and harborage.' },
  B_restriction: { id: 'B_restriction', source: 'B', where: 'InteriorGuard Gel · Restrictions', note: '“Do not apply directly to food preparation surfaces.” In food-handling areas, crack-and-crevice placement only.' },
  B_ppe: { id: 'B_ppe', source: 'B', where: 'InteriorGuard Gel · Precautionary Statements', note: 'Wear gloves; wash hands after handling.' },
  B_storage: { id: 'B_storage', source: 'B', where: 'InteriorGuard Gel · Storage and Disposal', note: 'Store between 40°F and 90°F, away from food and feed.' },

  WO_complaint: { id: 'WO_complaint', source: 'WO', where: 'Work order · Complaint', note: 'Ant activity reported by the customer.' },
  WO_location: { id: 'WO_location', source: 'WO', where: 'Work order · Location', note: 'Indoor, commercial facility.' },
  WO_area: { id: 'WO_area', source: 'WO', where: 'Work order · Treatment area', note: 'Exact treatment area: not confirmed.' },
  WO_food: { id: 'WO_food', source: 'WO', where: 'Work order · Food handling', note: 'Food handling activity: unknown.' },
  WO_history: { id: 'WO_history', source: 'WO', where: 'Work order · Previous treatments', note: 'Previous treatments: not provided.' },

  AX_location: { id: 'AX_location', source: 'AX', where: 'Alex (supervisor)', note: 'Customer reported ants “somewhere inside.” Location not confirmed.' },
  AX_history: { id: 'AX_history', source: 'AX', where: 'Alex (supervisor)', note: 'No treatment history in our records; another company may have serviced the site.' },
  AX_food: { id: 'AX_food', source: 'AX', where: 'Alex (supervisor)', note: 'Alex doesn’t know whether food is handled or prepared on site.' },
  AX_site: { id: 'AX_site', source: 'AX', where: 'Alex (supervisor)', note: 'Account is listed only as “commercial.” Site manager is expecting us.' },
};

export const SOURCE_LABEL: Record<EvidenceSource, string> = {
  A: 'PerimeterGuard SC label',
  B: 'InteriorGuard Gel label',
  WO: 'Work order',
  AX: 'Conversation with Alex',
};
