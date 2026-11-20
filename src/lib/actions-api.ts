import type { ApiClient } from './api';

export interface WorkflowStep {
  key: string; group: string; label: string; rank: number;
  state: 'done' | 'current' | 'upcoming'; can_move_back: boolean;
  resets?: string[]; keeps?: string[];
}
export interface Workflow {
  payment_method: string; current_status: string; current_label: string; cancelled: boolean; steps: WorkflowStep[];
}
export interface TimelineItem {
  id: string; action: string; created_at: string; user_name?: string | null;
  metadata?: { type?: string; reason?: string; note?: string; [k: string]: unknown } | string | null;
}

type A = Pick<ApiClient, 'get' | 'post' | 'patch'>;
const id = encodeURIComponent;

export const fetchWorkflow = (api: A, cid: string) => api.get<Workflow>(`/customers/${id(cid)}/workflow`);
export const fetchTimeline = (api: A, cid: string) => api.get<TimelineItem[]>(`/customers/${id(cid)}/timeline`);
export const changeStatus = (api: A, cid: string, status: string, note?: string) =>
  api.patch(`/customers/${id(cid)}/status`, note?.trim() ? { status, note: note.trim() } : { status });
export const moveBack = (api: A, cid: string, target_status: string, reason: string) =>
  api.patch(`/customers/${id(cid)}/move-back`, { target_status, reason: reason.trim() });
export const cancelCustomer = (api: A, cid: string, reason: string) =>
  api.patch(`/customers/${id(cid)}/cancel`, { reason: reason.trim() });
export const reactivateCustomer = (api: A, cid: string, note?: string) =>
  api.patch(`/customers/${id(cid)}/reactivate`, note?.trim() ? { note: note.trim() } : {});
export const requestCompletion = (api: A, cid: string, note?: string) =>
  api.post(`/customers/${id(cid)}/completion/request`, note?.trim() ? { note: note.trim() } : {});
export const reviewCompletion = (api: A, cid: string, action: 'approve' | 'reject', note?: string) =>
  api.patch(`/customers/${id(cid)}/completion/review`, note?.trim() ? { action, note: note.trim() } : { action });
export const addNote = (api: A, cid: string, note: string) =>
  api.post(`/customers/${id(cid)}/notes`, { note: note.trim() });

/** Plain text for one timeline row, with the reason or note when the server stored one. */
export function timelineDetail(t: TimelineItem): string {
  let m = t.metadata;
  if (typeof m === 'string') { try { m = JSON.parse(m); } catch { m = null; } }
  if (!m || typeof m !== 'object') return '';
  if (m.type === 'note') return '';
  const extra = (m.reason as string) || (m.note as string) || '';
  return extra ? String(extra) : '';
}
export const isNote = (t: TimelineItem): boolean => {
  let m = t.metadata;
  if (typeof m === 'string') { try { m = JSON.parse(m); } catch { m = null; } }
  return !!m && typeof m === 'object' && m.type === 'note';
};
