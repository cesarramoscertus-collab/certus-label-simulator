import type { EvidenceId } from './evidence';

export interface WorkOrderRow { label: string; value: string; evidence?: EvidenceId; status?: 'unknown' | 'ok' }

export const WORK_ORDER = {
  number: 'WO-TRN-40812',
  account: 'Commercial account (training scenario)',
  scheduled: 'Today · 10:30 AM',
  technician: 'You',
  supervisor: 'Alex',
  rows: [
    { label: 'Service type', value: 'Ant service — single visit' },
    { label: 'Complaint', value: 'Ant activity', evidence: 'WO_complaint', status: 'ok' },
    { label: 'Location', value: 'Indoor commercial facility', evidence: 'WO_location', status: 'ok' },
    { label: 'Exact treatment area', value: 'Not confirmed', evidence: 'WO_area', status: 'unknown' },
    { label: 'Food handling activity', value: 'Unknown', evidence: 'WO_food', status: 'unknown' },
    { label: 'Previous treatments', value: 'Not provided', evidence: 'WO_history', status: 'unknown' },
  ] as WorkOrderRow[],
  notes: 'Customer called the office reporting ants inside the building. Site contact will meet technician at the front entrance.',
};
