import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ActionModal } from '@/components/action-modal';
import { SourceSheet } from '@/components/source-sheet';
import { Banner, Btn } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import { ApiError } from '@/lib/api';
import type { Customer } from '@/lib/customers';
import { docSlots, documentUrl, fetchDocuments, resetDocument, uploadDocument, verifyDocument, type DocSlot } from '@/lib/docs';
import { fileProblem, pickFile, type Source } from '@/lib/media';
import { api } from '@/state/api';
import { useLoad } from '@/state/useLoad';

const STATE_CHIP: Record<DocSlot['state'], { text: string; bg: string; fg: string }> = {
  missing: { text: 'Missing', bg: colors.peach, fg: colors.peachInk },
  uploaded: { text: 'Uploaded', bg: '#e0ebff', fg: '#1d4ed8' },
  verified: { text: 'Verified', bg: colors.mint, fg: colors.mintInk },
  failed: { text: 'Re-upload', bg: colors.tone.problem.bg, fg: colors.tone.problem.fg },
};

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback);

/** Docs tab: the 8 KYC documents with upload, view, verify, remove (website Documents tab). */
export function CustomerDocs({ c, role, onChanged }: { c: Customer; role?: string; onChanged: (msg: string) => void }) {
  if (!can.documents(role)) return <Banner tone="inactive">Your role cannot open this customer's documents.</Banner>;
  return <Documents c={c} role={role} onChanged={onChanged} />;
}

function Documents({ c, role, onChanged }: { c: Customer; role?: string; onChanged: (msg: string) => void }) {
  const canVerify = can.verifyDocs(role);
  const canView = can.downloadDocs(role);
  const [busyV, setBusyV] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ kind: 'remove' | 'replaceVerified'; slot: DocSlot } | null>(null);
  const [rk, setRk] = useState(0);
  const { data, error, loading, reload } = useLoad(() => fetchDocuments(api, c.id), [c.id, rk]);
  const [sheet, setSheet] = useState<DocSlot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const lock = useRef(false);
  const slots = docSlots(data ?? []);
  const have = slots.filter((s) => s.state !== 'missing').length;
  const verified = slots.filter((s) => s.state === 'verified').length;
  const verify = async (slot: DocSlot, st: 'verified' | 'failed') => {
    if (!slot.doc) return;
    setBusyV(slot.key); setMsg(null);
    try { await verifyDocument(api, slot.doc.id, st); setRk((n) => n + 1); onChanged(st === 'verified' ? `${slot.label} verified.` : `${slot.label} marked as failed.`); }
    catch (e) { setMsg({ ok: false, text: errText(e, 'Could not save.') }); } finally { setBusyV(null); }
  };
  const remove = async (slot: DocSlot) => {
    if (!slot.doc) return;
    try { await resetDocument(api, slot.doc.id); setRk((n) => n + 1); onChanged(`${slot.label} removed. You can upload a new one.`); }
    catch (e) { setMsg({ ok: false, text: errText(e, 'Could not remove.') }); }
  };
  const openAll = async () => {
    const withFile = slots.filter((s) => s.doc && s.state !== 'missing');
    if (!withFile.length) { setMsg({ ok: false, text: 'No documents uploaded yet' }); return; }
    for (const s of withFile) { try { const u = await documentUrl(api, s.doc!.id); if (u) await Linking.openURL(u); } catch { /* skip */ } }
  };

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
        <Text style={{ fontSize: font.small, color: colors.ink2 }}>{data ? `${have} of ${slots.length} uploaded · ${verified} verified` : ''}</Text>
      </View>
      {msg && !msg.ok ? <Banner tone="problem">{msg.text}</Banner> : null}
      {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
        : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading documents" />
        : slots.map((s) => {
          const chip = STATE_CHIP[s.state];
          return (
            <View key={s.key} style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: space[2] }}>
              <Ionicons name={s.doc?.mime_type === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={20} color={colors.ink2} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.body, color: colors.ink }}>{s.label}</Text>
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <View style={{ backgroundColor: chip.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: font.caption, fontWeight: '600', color: chip.fg }}>{chip.text}</Text>
                  </View>
                </View>
              </View>
              {busy === s.key || busyV === s.key ? <ActivityIndicator color={colors.brand} accessibilityLabel={`Saving ${s.label}`} /> : null}
            </View>
            {busy === s.key || busyV === s.key ? null : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: space[2], paddingLeft: 28 }}>
                {s.state === 'missing' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Add ${s.label}`} disabled={!!busy} onPress={() => setSheet(s)} style={[chipBtn, { backgroundColor: colors.mint, borderColor: colors.mint }]}>
                    <Text style={[chipBtnText, { color: colors.mintInk }]}>Add</Text>
                  </Pressable>
                ) : (
                  <>
                    {canView ? <Pressable accessibilityRole="button" accessibilityLabel={`View ${s.label}`} onPress={() => view(s)} style={chipBtn}><Text style={chipBtnText}>View</Text></Pressable> : null}
                    {canVerify && s.state !== 'verified' ? <Pressable accessibilityRole="button" accessibilityLabel={`Verify ${s.label}`} onPress={() => verify(s, 'verified')} style={[chipBtn, { backgroundColor: colors.brand, borderColor: colors.brand }]}><Text style={[chipBtnText, { color: colors.white }]}>Verify</Text></Pressable> : null}
                    {canVerify && s.state === 'uploaded' ? <Pressable accessibilityRole="button" accessibilityLabel={`Fail ${s.label}`} onPress={() => verify(s, 'failed')} style={[chipBtn, { borderColor: '#fecaca' }]}><Text style={[chipBtnText, { color: colors.tone.problem.fg }]}>Fail</Text></Pressable> : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={`Replace ${s.label}`} disabled={!!busy} onPress={() => (s.state === 'verified' ? setAsk({ kind: 'replaceVerified', slot: s }) : setSheet(s))} style={chipBtn}><Text style={chipBtnText}>Replace</Text></Pressable>
                    {s.state !== 'verified' ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${s.label}`} onPress={() => setAsk({ kind: 'remove', slot: s })} style={chipBtn}><Text style={[chipBtnText, { color: colors.tone.problem.fg }]}>Remove</Text></Pressable> : null}
                  </>
                )}
              </View>
            )}
            </View>
          );
        })}
      {canView && have > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Open all documents" onPress={openAll} style={[chipBtn, { marginTop: space[2], alignSelf: 'flex-start' }]}><Text style={chipBtnText}>Open all documents</Text></Pressable> : null}
      {sheet ? <SourceSheet title={`Add ${sheet.label}`} onPick={(src) => upload(sheet, src)} onClose={() => setSheet(null)} /> : null}
      {ask ? (
        <ActionModal title={ask.kind === 'remove' ? `Remove ${ask.slot.label}?` : 'Replace a verified document?'}
          intro={ask.kind === 'remove' ? 'The file will be deleted and you can upload a new one.' : 'This document is already verified. Replacing it resets it to pending, and it must be verified again.'}
          confirmLabel={ask.kind === 'remove' ? 'Remove' : 'Yes, allow re-upload'} destructive={ask.kind === 'remove'}
          onConfirm={async () => { const a = ask; setAsk(null); if (a.kind === 'remove') await remove(a.slot); else setSheet(a.slot); }}
          onClose={() => setAsk(null)} />
      ) : null}
    </View>
  );
}

const chipBtn = { minHeight: MIN_TAP, minWidth: MIN_TAP + 12, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' } as const;
const chipBtnText = { fontSize: font.small, fontWeight: '600', color: colors.brand } as const;
