/** Activity log = the website's audit log (GET /customers/:id/audit-log, renderAuditLog/drawAuditTable). */
import type { ApiClient } from './api';

export interface AuditRow {
  id?: string; created_at?: string; category?: string; action?: string; field_name?: string | null;
  old_value?: string | null; new_value?: string | null; result?: string | null; block_reason?: string | null;
  user_name?: string | null; user_role?: string | null; user_emp_id?: string | null; metadata?: unknown;
}
export const AUDIT_CATEGORIES: Record<string, { label: string; icon: string }> = {
  customer_edit: { label: 'Customer Edit', icon: '✏️' }, status_change: { label: 'Status Change', icon: '🔄' },
  assignment: { label: 'Assignment', icon: '👤' }, document: { label: 'Document', icon: '📄' }, loan: { label: 'Loan', icon: '🏦' },
  disbursal: { label: 'Disbursal', icon: '💰' }, installation: { label: 'Installation', icon: '🔧' }, photo: { label: 'Photo', icon: '📸' },
  net_meter: { label: 'Net Meter', icon: '⚡' }, subsidy: { label: 'Subsidy', icon: '🏛️' }, referral: { label: 'Referral', icon: '🤝' },
  finance: { label: 'Finance', icon: '🧮' }, deal_calculator: { label: 'Deal Calculator', icon: '🧮' }, note: { label: 'Note', icon: '📝' },
  failed_action: { label: 'Failed/Blocked', icon: '🚫' }, system: { label: 'System', icon: '⚙️' },
};
export const catOf = (c?: string) => AUDIT_CATEGORIES[c ?? ''] ?? { label: (c ?? 'system').replace(/_/g, ' '), icon: '⚙️' };
export const isBlocked = (r: AuditRow) => r.result === 'blocked' || r.result === 'error';
export function auditWhy(r: AuditRow): string | null {
  let md = r.metadata as Record<string, unknown> | string | null | undefined;
  if (typeof md === 'string') { try { md = JSON.parse(md); } catch { md = null; } }
  const m = md as Record<string, unknown> | null | undefined;
  return (m && (m.reason || m.note) ? String(m.reason || m.note) : null);
}
export async function fetchAudit(api: Pick<ApiClient, 'get'>, id: string): Promise<AuditRow[]> {
  const d = await api.get<unknown>(`/customers/${encodeURIComponent(id)}/audit-log`);
  return Array.isArray(d) ? (d as AuditRow[]) : [];
}
/** Categories present, in first-seen order (the website's filter list). */
export const auditCats = (rows: AuditRow[]) => [...new Set(rows.map((r) => r.category || 'system'))];
