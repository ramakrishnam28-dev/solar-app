/** Customer documents (GET /documents/customer/:id, POST /documents/upload) and site photos. */
import type { ApiClient } from './api';
import { appendFile, type PickedFile } from './files';

export const DOC_TYPES: { key: string; label: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'pan', label: 'PAN card' },
  { key: 'electricity_bill', label: 'Electricity bill' },
  { key: 'bank_passbook', label: 'Bank passbook' },
  { key: 'passport_photo', label: 'Passport photo' },
  { key: 'roof_ownership', label: 'Roof ownership' },
  { key: 'consent_form', label: 'Consent form' },
  { key: 'other', label: 'Other' },
];

export interface DocRow {
  id: string; doc_type: string; doc_name?: string | null; mime_type?: string | null; status?: string | null;
  has_file?: boolean | null; upload_confirmed?: boolean | null; created_at?: string | null; updated_at?: string | null;
  file_size_kb?: number | null; ai_hint?: string | null;
}

export interface DocSlot { key: string; label: string; doc: DocRow | null; state: 'missing' | 'uploaded' | 'verified' | 'failed' }

/** One slot per document type, in the fixed order above, so missing ones are obvious. */
export function docSlots(rows: DocRow[]): DocSlot[] {
  return DOC_TYPES.map((t) => {
    const doc = rows.find((r) => r.doc_type === t.key) ?? null;
    const has = !!doc && (doc.has_file ?? doc.upload_confirmed ?? true) !== false && doc.status !== 'pending';
    const state: DocSlot['state'] = !doc || !has ? 'missing' : doc.status === 'verified' ? 'verified' : doc.status === 'failed' ? 'failed' : 'uploaded';
    return { key: t.key, label: t.label, doc, state };
  });
}

export function unwrapDocs(d: unknown): DocRow[] {
  if (Array.isArray(d)) return d as DocRow[];
  const o = d as { documents?: unknown; docs?: unknown } | null;
  if (Array.isArray(o?.documents)) return o!.documents as DocRow[];
  if (Array.isArray(o?.docs)) return o!.docs as DocRow[];
  return [];
}

export async function fetchDocuments(api: Pick<ApiClient, 'get'>, customerId: string): Promise<DocRow[]> {
  return unwrapDocs(await api.get<unknown>(`/documents/customer/${encodeURIComponent(customerId)}`));
}

export async function uploadDocument(api: Pick<ApiClient, 'upload'>, customerId: string, docType: string, file: PickedFile) {
  const form = new FormData();
  form.append('customer_id', customerId);
  form.append('doc_type', docType);
  await appendFile(form, 'file', file);
  return api.upload<unknown>('/documents/upload', form);
}

export async function documentUrl(api: Pick<ApiClient, 'get'>, docId: string): Promise<string | null> {
  const d = await api.get<{ download_url?: string; url?: string }>(`/documents/${encodeURIComponent(docId)}/url`);
  return d?.download_url ?? d?.url ?? null;
}

export async function verifyDocument(api: Pick<ApiClient, 'patch'>, docId: string, status: 'verified' | 'failed') {
  return api.patch(`/documents/${encodeURIComponent(docId)}/verify`, { status });
}
export async function resetDocument(api: Pick<ApiClient, 'post'>, docId: string) {
  return api.post(`/documents/${encodeURIComponent(docId)}/reset`, {});
}

// ── Site photos (installation) ─────────────────────────────────────
export const PHOTO_LABELS: { key: string; label: string }[] = [
  { key: 'before_install', label: 'Before install' },
  { key: 'mount_frame', label: 'Mount frame' },
  { key: 'panels_array', label: 'Panels' },
  { key: 'inverter_mount', label: 'Inverter' },
  { key: 'dc_wiring', label: 'DC wiring' },
  { key: 'ac_wiring', label: 'AC wiring' },
  { key: 'meter_board', label: 'Meter board' },
  { key: 'team_customer', label: 'Team with customer' },
];
export const NET_METER_LABEL = { key: 'net_meter', label: 'Net meter' };

export interface SitePhoto { label: string; file_url?: string | null; approval_status?: string | null; rejection_note?: string | null; uploaded_at?: string | null }
export interface SitePhotos {
  photos: SitePhoto[]; installation_id?: string | null; photos_approved?: boolean | null;
  photos_reupload_requested?: boolean | null; photos_reupload_note?: string | null; nm_photo_url?: string | null;
}

export async function fetchSitePhotos(api: Pick<ApiClient, 'get'>, customerId: string): Promise<SitePhotos> {
  const d = await api.get<SitePhotos>(`/customers/${encodeURIComponent(customerId)}/installation/photos`);
  return { ...d, photos: Array.isArray(d?.photos) ? d.photos : [] };
}

export const photoCount = (p: SitePhotos | null | undefined) =>
  PHOTO_LABELS.filter((l) => p?.photos.some((x) => x.label === l.key && x.file_url)).length;

export async function uploadSitePhoto(api: Pick<ApiClient, 'upload'>, customerId: string, label: string, file: PickedFile) {
  const form = new FormData();
  form.append('label', label);
  await appendFile(form, 'photo', file);
  return api.upload<unknown>(`/customers/${encodeURIComponent(customerId)}/installation/photos/upload`, form);
}

/** GPS check-in at the site (POST /installations/:id/checkin). */
export async function checkIn(api: Pick<ApiClient, 'post'>, installationId: string, lat: number, lng: number) {
  return api.post<{ gps_verified?: boolean; distance_m?: number | null; fence_m?: number; message?: string }>(`/installations/${encodeURIComponent(installationId)}/checkin`, { lat, lng });
}
