import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { SourceSheet } from '@/components/source-sheet';
import { Banner, Btn } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import { ApiError } from '@/lib/api';
import type { Customer } from '@/lib/customers';
import {
  NET_METER_LABEL, PHOTO_LABELS, checkIn, docSlots, documentUrl, fetchDocuments, fetchSitePhotos, photoCount,
  uploadDocument, uploadSitePhoto, type DocSlot,
} from '@/lib/docs';
import { currentPosition, fileProblem, pickFile, type Source } from '@/lib/media';
import { api } from '@/state/api';
import { useLoad } from '@/state/useLoad';

const STATE_CHIP: Record<DocSlot['state'], { text: string; bg: string; fg: string }> = {
  missing: { text: 'Missing', bg: colors.peach, fg: colors.peachInk },
  uploaded: { text: 'Uploaded', bg: '#e0ebff', fg: '#1d4ed8' },
  verified: { text: 'Verified', bg: colors.mint, fg: colors.mintInk },
  failed: { text: 'Re-upload', bg: colors.tone.problem.bg, fg: colors.tone.problem.fg },
};

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback);

/** Docs tab: KYC documents for office roles, site photos + GPS check-in for installation roles. */
export function CustomerDocs({ c, role, onChanged }: { c: Customer; role?: string; onChanged: (msg: string) => void }) {
  return (
    <>
      {can.documents(role) ? <Documents c={c} onChanged={onChanged} /> : null}
      {can.sitePhotos(role) ? <SitePhotosPanel c={c} role={role} onChanged={onChanged} /> : null}
      {!can.documents(role) && !can.sitePhotos(role) ? <Banner tone="inactive">Your role cannot open this customer's documents.</Banner> : null}
    </>
  );
}

function Documents({ c, onChanged }: { c: Customer; onChanged: (msg: string) => void }) {
  const [rk, setRk] = useState(0);
  const { data, error, loading, reload } = useLoad(() => fetchDocuments(api, c.id), [c.id, rk]);
  const [sheet, setSheet] = useState<DocSlot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const lock = useRef(false);
  const slots = docSlots(data ?? []);
  const have = slots.filter((s) => s.state !== 'missing').length;

  const upload = async (slot: DocSlot, source: Source) => {
    setSheet(null);
    if (lock.current) return;
    setMsg(null);
    try {
      const file = await pickFile(source);
      if (!file) return;
      const bad = fileProblem(file);
      if (bad) { setMsg({ ok: false, text: bad }); return; }
      lock.current = true; setBusy(slot.key);
      await uploadDocument(api, c.id, slot.key, file);
      setMsg({ ok: true, text: `${slot.label} uploaded.` });
      setRk((n) => n + 1); onChanged(`${slot.label} uploaded.`);
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Upload failed. Try again.') });
    } finally { lock.current = false; setBusy(null); }
  };

  const view = async (slot: DocSlot) => {
    if (!slot.doc) return;
    try {
      const url = await documentUrl(api, slot.doc.id);
      if (url) await Linking.openURL(url); else setMsg({ ok: false, text: 'No file to open yet.' });
    } catch (e) { setMsg({ ok: false, text: errText(e, 'Could not open the file.') }); }
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink, padding: space[4], marginBottom: space[3] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
        <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink }}>Documents</Text>
        <Text style={{ fontSize: font.small, color: colors.ink2 }}>{data ? `${have} of ${slots.length}` : ''}</Text>
      </View>
      {msg && !msg.ok ? <Banner tone="problem">{msg.text}</Banner> : null}
      {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
        : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading documents" />
        : slots.map((s) => {
          const chip = STATE_CHIP[s.state];
          return (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, borderTopWidth: 1, borderTopColor: colors.border, gap: space[2] }}>
              <Ionicons name={s.doc?.mime_type === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={20} color={colors.ink2} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.body, color: colors.ink }}>{s.label}</Text>
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <View style={{ backgroundColor: chip.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: font.caption, fontWeight: '600', color: chip.fg }}>{chip.text}</Text>
                  </View>
                </View>
              </View>
              {busy === s.key ? <ActivityIndicator color={colors.brand} accessibilityLabel={`Uploading ${s.label}`} /> : (
                <>
                  {s.state !== 'missing' ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`View ${s.label}`} onPress={() => view(s)} style={chipBtn}>
                      <Text style={chipBtnText}>View</Text>
                    </Pressable>
                  ) : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`${s.state === 'missing' ? 'Add' : 'Replace'} ${s.label}`} disabled={!!busy} onPress={() => setSheet(s)} style={[chipBtn, s.state === 'missing' && { backgroundColor: colors.mint, borderColor: colors.mint }]}>
                    <Text style={[chipBtnText, s.state === 'missing' && { color: colors.mintInk }]}>{s.state === 'missing' ? 'Add' : 'Replace'}</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}
      {sheet ? <SourceSheet title={`Add ${sheet.label}`} onPick={(src) => upload(sheet, src)} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

function SitePhotosPanel({ c, role, onChanged }: { c: Customer; role?: string; onChanged: (msg: string) => void }) {
  const [rk, setRk] = useState(0);
  const { data, error, loading, reload } = useLoad(() => fetchSitePhotos(api, c.id), [c.id, rk]);
  const [sheet, setSheet] = useState<{ key: string; label: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const instId = (data?.installation_id ?? (c.installation_id as string | null)) || null;
  const canUpload = can.uploadSitePhoto(role);
  const labels = c.status && ['installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited', 'project_complete'].includes(c.status)
    ? [...PHOTO_LABELS, NET_METER_LABEL] : PHOTO_LABELS;

  const upload = async (slot: { key: string; label: string }, source: Source) => {
    setSheet(null);
    if (lock.current) return;
    setMsg(null);
    try {
      const file = await pickFile(source, true);
      if (!file) return;
      const bad = fileProblem(file);
      if (bad) { setMsg({ ok: false, text: bad }); return; }
      if (file.type === 'application/pdf') { setMsg({ ok: false, text: 'Site photos must be photos, not PDFs.' }); return; }
      lock.current = true; setBusy(slot.key);
      await uploadSitePhoto(api, c.id, slot.key, file);
      setMsg({ ok: true, text: `${slot.label} photo uploaded.` });
      setRk((n) => n + 1); onChanged(`${slot.label} photo uploaded.`);
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Upload failed. Try again.') });
    } finally { lock.current = false; setBusy(null); }
  };

  const doCheckIn = async () => {
    if (!instId || checking) return;
    setChecking(true); setMsg(null);
    try {
      const pos = await currentPosition();
      const r = await checkIn(api, instId, pos.lat, pos.lng);
      const text = r?.message ?? (r?.gps_verified ? 'Checked in at the site.' : 'Check-in saved. GPS did not match the site.');
      if (r?.gps_verified) onChanged(text);
      else { setMsg({ ok: false, text }); onChanged('Check-in saved, GPS flagged for review.'); }
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Could not check in. Try again.') });
    } finally { setChecking(false); }
  };

  const photoFor = (k: string) => (k === 'net_meter' ? (data?.nm_photo_url ? { file_url: data.nm_photo_url, approval_status: null } : null) : data?.photos.find((p) => p.label === k && p.file_url) ?? null);

  return (
    <View style={{ backgroundColor: colors.tileGrey, borderRadius: radius.lg, padding: space[4], marginBottom: space[3] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
        <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink }}>Site photos · GPS tagged</Text>
        <Text style={{ fontSize: font.small, color: colors.ink2 }}>{data ? `${photoCount(data)} / ${PHOTO_LABELS.length}` : ''}</Text>
      </View>
      {msg && !msg.ok ? <Banner tone="problem">{msg.text}</Banner> : null}
      {data?.photos_reupload_requested ? <Banner tone="waiting">Re-upload asked{data.photos_reupload_note ? `: ${data.photos_reupload_note}` : '.'}</Banner> : null}
      {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
        : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading photos" />
        : !instId ? <Text style={{ fontSize: font.small, color: colors.ink2 }}>No installation scheduled yet. Photos open once the installation is created on the web.</Text>
        : (
          <>
            {can.checkin(role) ? (
              <Btn label={c.checkin_at ? 'Check in again (GPS)' : 'Check in at site (GPS)'} icon="location-outline" variant="secondary" onPress={doCheckIn} loading={checking} style={{ marginBottom: space[3] }} />
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {labels.map((l) => {
                const p = photoFor(l.key);
                const rejected = p && 'approval_status' in p && p.approval_status === 'rejected';
                return (
                  <Pressable key={l.key} accessibilityRole="button" accessibilityLabel={`${l.label} photo, ${p ? (rejected ? 'rejected' : 'uploaded') : 'missing'}`}
                    disabled={!canUpload || !!busy} onPress={() => setSheet(l)}
                    style={{ width: '31%', aspectRatio: 1, borderRadius: radius.md, borderWidth: p ? 0 : 1.5, borderStyle: p ? 'solid' : 'dashed', borderColor: rejected ? colors.tone.problem.fg : colors.ink3, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    {busy === l.key ? <ActivityIndicator color={colors.brand} />
                      : p?.file_url ? <Image source={{ uri: p.file_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
                      : <Ionicons name={canUpload ? 'add' : 'image-outline'} size={26} color={colors.ink2} />}
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: p ? 'rgba(0,0,0,0.55)' : 'transparent', paddingVertical: 2 }}>
                      <Text numberOfLines={1} style={{ fontSize: 10, textAlign: 'center', color: p ? colors.white : colors.ink2 }}>{rejected ? 'Rejected' : l.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      {sheet ? <SourceSheet title={`${sheet.label} photo`} photosOnly onPick={(src) => upload(sheet, src)} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

const chipBtn = { minHeight: MIN_TAP, minWidth: MIN_TAP + 12, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' } as const;
const chipBtnText = { fontSize: font.small, fontWeight: '600', color: colors.brand } as const;
