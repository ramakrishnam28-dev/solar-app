/** Tasks tab: what each role has to do next. */
import type { ApiClient } from './api';
import type { Customer } from './customers';
import { bucketOf, nextAction, stageIndex } from './status';

export interface Installation {
  id: string; customer_id: string; customer_name?: string | null; customer_project_id?: string | null; customer_city?: string | null;
  system_kw?: number | string | null; status?: string | null; scheduled_date?: string | null; progress_pct?: number | null;
  photos_uploaded?: number | string | null; checkin_at?: string | null; gps_verified?: boolean | null; installer_name?: string | null;
}

export async function fetchInstallations(api: Pick<ApiClient, 'getPage'>): Promise<Installation[]> {
  const body = await api.getPage<unknown>('/installations?limit=100');
  const d = body?.data as unknown;
  return Array.isArray(d) ? (d as Installation[]) : Array.isArray((d as { installations?: unknown })?.installations) ? (d as { installations: Installation[] }).installations : [];
}

export const INST_STATUS: Record<string, string> = { scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', on_hold: 'On hold', cancelled: 'Cancelled' };

/** Open jobs first (in progress, then by date), completed at the bottom. */
export function sortInstallations(list: Installation[]): Installation[] {
  const r = (i: Installation) => (i.status === 'in_progress' ? 0 : i.status === 'completed' || i.status === 'cancelled' ? 2 : 1);
  return [...list].sort((a, b) => r(a) - r(b) || String(a.scheduled_date ?? '9').localeCompare(String(b.scheduled_date ?? '9')));
}

const LOAN_ROLE = ['loan_ready', 'loan_applied', 'loan_rejected', 'loan_reapplication', 'loan_sanctioned', 'amount_disbursed', 'disbursed_partial'];
const FINANCE_ROLE = ['loan_sanctioned', 'amount_disbursed', 'disbursed_partial', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited'];

export interface TaskGroup { title: string; items: Customer[] }

/**
 * Customers that need someone on this role to act, grouped by the next action.
 * Groups keep the pipeline order (earliest stage first).
 */
export function taskGroups(customers: Customer[], role?: string): TaskGroup[] {
  const live = customers.filter((c) => bucketOf(c.status) >= 0 || c.status === 'project_complete' && !!c.completion_requested_at);
  let mine = live.filter((c) => nextAction(c).warm);
  if (role === 'loan_officer') mine = live.filter((c) => LOAN_ROLE.includes(String(c.status)));
  if (role === 'finance') mine = live.filter((c) => FINANCE_ROLE.includes(String(c.status)));
  const groups = new Map<string, Customer[]>();
  const order = new Map<string, number>();
  for (const c of [...mine].sort((a, b) => stageIndex(a.status) - stageIndex(b.status))) {
    const t = nextAction(c).text;
    if (!groups.has(t)) { groups.set(t, []); order.set(t, stageIndex(c.status)); }
    groups.get(t)!.push(c);
  }
  return [...groups.entries()].map(([title, items]) => ({ title, items }));
}

// ── More › trackers (same list pattern as the loan tracker) ───────────
export interface Tracker { key: 'netmeter' | 'subsidy' | 'disbursals'; title: string; statuses: string[]; page: 'netMeter' | 'subsidyTracker' | 'disbursements' }
export const TRACKERS: Tracker[] = [
  { key: 'disbursals', title: 'Disbursements', page: 'disbursements', statuses: ['loan_sanctioned', 'amount_disbursed', 'disbursed_partial', 'disbursed_full'] },
  { key: 'netmeter', title: 'Net meter', page: 'netMeter', statuses: ['installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed'] },
  { key: 'subsidy', title: 'Subsidy', page: 'subsidyTracker', statuses: ['net_meter_installed', 'subsidy_awaited', 'subsidy_credited'] },
];

/** Summary tiles: one per status in the tracker. */
export function trackerTiles(t: Tracker, customers: Customer[]) {
  return t.statuses.map((s) => ({ status: s, count: customers.filter((c) => c.status === s).length }));
}
