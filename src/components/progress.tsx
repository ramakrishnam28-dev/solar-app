import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ActionModal } from '@/components/action-modal';
import { DateField, InstallerField, MoneyField, RadioField, Rich, SmallBtn, TextLine } from '@/components/fields';
import { usePhotoStamp } from '@/components/photo-stamp';
import { SourceSheet } from '@/components/source-sheet';
import { Banner, Btn } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { uploadSitePhoto } from '@/lib/docs';
import type { FullCustomer } from '@/lib/full-customer';
import { currentPosition, fileProblem, pickFile, placeName, stampLines, type Source } from '@/lib/media';
import { PHOTO_SLOTS, canOp, installerView, progressView, type CardAction, type FormField, type ProgressCard } from '@/lib/progress-cards';
import { FormProblem, approvePhoto, nmPhotoReview, runOp } from '@/lib/progress-ops';
import { api } from '@/state/api';

const TONE: Record<ProgressCard['tone'], { bg: string; border: string }> = {
  warn: { bg: '#fffbeb', border: '#fde68a' }, ok: { bg: '#ecfdf3', border: '#bfe3cb' }, grey: { bg: '#f6f7f6', border: '#e4e7e5' },
  red: { bg: '#fef2f2', border: '#fecaca' }, violet: { bg: '#fdf4ff', border: '#e9d5ff' }, dark: { bg: '#ecfdf3', border: colors.brand },
};
const errText = (e: unknown, f: string) => (e instanceof ApiError || e instanceof Error ? e.message : f);
const ROLE_NOTE = 'Your role cannot do this step. Ask an admin or manager.';

/** Update Progress tab, the website's cards and forms. `onChanged` reloads the customer. */
export function ProgressTab({ c, role, onChanged }: { c: FullCustomer; role?: string; onChanged: (msg: string) => void }) {
  if (role === 'installer') return <InstallerProgress c={c} onChanged={onChanged} />;
  const v = progressView(c, role);
  if (v.complete) {
    return (
      <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[5], alignItems: 'center' }}>
        <Text style={{ fontSize: 34 }}>🏆</Text>
        <Text style={{ color: colors.white, fontSize: font.title, fontWeight: '700', marginTop: space[2] }}>Project Complete</Text>
        <Text style={{ color: colors.mint, fontSize: font.small, marginTop: 4, textAlign: 'center' }}>All stages done. This project has been successfully completed.</Text>
        {v.complete.date ? <Text style={{ color: colors.white, fontSize: font.body, marginTop: space[3] }}>Completed on {new Date(v.complete.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text> : null}
      </View>
    );
  }
  return (
    <>
      {v.done.length ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[3], marginBottom: space[3] }}>
          {v.done.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 4 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={13} color={colors.white} /></View>
              <Text style={{ flex: 1, fontSize: font.small, color: colors.ink }}>{d.label}{d.detail ? <Text style={{ color: colors.ink3 }}> · {d.detail}</Text> : null}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {v.cards.length ? v.cards.map((card) => <CardView key={card.key + c.status} card={card} c={c} role={role} onChanged={onChanged} />)
        : <Text style={{ color: colors.ink3, fontSize: font.body, textAlign: 'center', padding: space[4] }}>No action needed at this stage.</Text>}
    </>
  );
}

function CardView({ card, c, role, onChanged }: { card: ProgressCard; c: FullCustomer; role?: string; onChanged: (m: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries((card.fields ?? []).map((f) => [f.key, f.initial ?? ''])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ask, setAsk] = useState<CardAction | null>(null);
  const lock = useRef(false);
  const t = TONE[card.tone];
  const set = (k: string) => (val: string) => { setValues((p) => ({ ...p, [k]: val })); if (errors[k]) setErrors((e) => ({ ...e, [k]: '' })); };

  const run = async (a: CardAction, extra?: Record<string, string>) => {
    if (a.op === 'openKyc') { router.push({ pathname: '/kyc/[id]', params: { id: c.id } }); return; }
    if (a.op === 'openDeal') { router.push({ pathname: '/deal/[id]', params: { id: c.id } }); return; }
    if (lock.current) return;
    lock.current = true; setBusy(a.label); setMsg(null);
    try {
      const m = await runOp(api, a.op, { id: c.id, values: { ...values, ...extra }, args: a.args, status: c.status, paymentMethod: c.payment_method as string });
      onChanged(m);
    } catch (e) {
      if (e instanceof FormProblem && e.field) setErrors((p) => ({ ...p, [e.field!]: e.message }));
      else setMsg(errText(e, 'Something went wrong. Try again.'));
      throw e;
    } finally { lock.current = false; setBusy(null); }
  };
  const tap = (a: CardAction) => {
    if (a.op === 'loanRejected' || a.op === 'sendBackCompletion' || a.confirm || a.op === 'disbursal2' && overRemaining(a)) { setAsk(a); return; }
    run(a).catch(() => {});
  };
  const overRemaining = (a: CardAction) => { const rem = Number(a.args?.remaining) || 0; const amt = parseFloat(values.amount || ''); return rem > 0 && amt > rem; };

  return (
    <View style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space[4], marginBottom: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[2] }}>
        {card.icon ? <Text style={{ fontSize: 18 }}>{card.icon}</Text> : null}
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: font.lead, fontWeight: '700', color: colors.ink }}>{card.title}</Text>
      </View>
      {card.rows ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surface, borderRadius: radius.md, padding: space[3], marginBottom: space[3] }}>
          {card.rows.map(([l, v]) => (
            <View key={l} style={{ width: '50%', paddingVertical: 4 }}>
              <Text style={{ fontSize: font.caption, color: colors.ink3 }}>{l}</Text>
              <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{v}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {card.bar ? (
        <View style={{ marginBottom: space[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: font.small, color: colors.ink2 }}>{card.bar.left}</Text>
            <Text style={{ fontSize: font.small, fontWeight: '700', color: colors.ink }}>{card.bar.right}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(card.bar.pct, 100)}%`, height: 6, backgroundColor: colors.brand }} />
          </View>
        </View>
      ) : null}
      {card.text?.map((line, i) => <Rich key={i} text={line} style={{ marginBottom: space[2] }} />)}
      {card.checklist?.map((line) => <Text key={line} style={{ fontSize: font.small, color: colors.ink2, marginBottom: 2 }}>✓ {line}</Text>)}
      {card.fields?.map((f) => <FieldView key={f.key} f={f} value={values[f.key] ?? ''} onChange={set(f.key)} error={errors[f.key]} />)}
      {card.install ? <InstallSectionView c={c} role={role} s={card.install} onChanged={onChanged} /> : null}
      {card.netmeter ? <NetMeterView c={c} role={role} s={card.netmeter} onChanged={onChanged} /> : null}
      {card.note ? <Text style={{ fontSize: font.small, color: colors.ink3, marginTop: space[1] }}>{card.note}</Text> : null}
      {msg ? <View style={{ marginTop: space[2] }}><Banner>{msg}</Banner></View> : null}
      {card.actions?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
          {card.actions.map((a) => {
            const allowed = canOp(a.op, role);
            const blocked = !allowed || !!a.disabledNote;
            return (
              <View key={a.label} style={{ flexGrow: 1, flexBasis: card.actions!.length > 1 ? '45%' : '100%' }}>
                <Btn label={a.label} variant={a.variant === 'danger' ? 'danger' : a.variant === 'secondary' ? 'secondary' : 'primary'} onPress={() => tap(a)} loading={busy === a.label} disabled={blocked || !!busy} />
                {!allowed ? <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: 4 }}>{ROLE_NOTE}</Text> : a.disabledNote ? <Text style={{ fontSize: font.caption, color: colors.peachInk, marginTop: 4 }}>{a.disabledNote}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {ask ? (
        <ActionModal
          title={ask.op === 'loanRejected' ? 'Loan Rejected' : ask.op === 'sendBackCompletion' ? 'Send completion back?' : ask.op === 'disbursal2' ? 'More than the remaining amount' : ask.label}
          intro={ask.op === 'loanRejected' ? "Enter the bank's reason for rejection to continue." : ask.op === 'sendBackCompletion' ? 'Why are you sending this back? The requester will see this.' : ask.op === 'disbursal2' ? `₹${Number(values.amount).toLocaleString('en-IN')} is more than the remaining ₹${Number(ask.args?.remaining).toLocaleString('en-IN')}. The excess is recorded as excess disbursal.` : ask.confirm}
          confirmLabel={ask.op === 'loanRejected' ? 'Confirm Rejection' : ask.op === 'sendBackCompletion' ? 'Send back' : ask.op === 'disbursal2' ? 'Proceed' : 'Yes'}
          destructive={ask.op === 'loanRejected' || ask.op === 'sendBackCompletion'}
          textLabel={ask.op === 'loanRejected' ? 'Rejection Reason' : ask.op === 'sendBackCompletion' ? 'Reason' : undefined}
          textRequired={ask.op === 'loanRejected' || ask.op === 'sendBackCompletion'}
          textPlaceholder={ask.op === 'loanRejected' ? 'e.g. Low CIBIL score, insufficient income proof…' : undefined}
          onConfirm={async (txt) => { const a = ask; await run(a, { reason: txt, note: txt }); setAsk(null); }}
          onClose={() => setAsk(null)} />
      ) : null}
    </View>
  );
}

function FieldView({ f, value, onChange, error }: { f: FormField; value: string; onChange: (v: string) => void; error?: string }) {
  if (f.kind === 'money') return <MoneyField label={f.label} value={value} onChange={onChange} error={error} placeholder={f.placeholder} />;
  if (f.kind === 'date') return <DateField label={f.label} value={value} onChange={onChange} error={error} minToday={f.minToday} maxToday={f.maxToday} />;
  if (f.kind === 'radio') return <RadioField label={f.label} options={f.options ?? []} value={value} onChange={onChange} error={error} />;
  if (f.kind === 'installer') return <InstallerField value={value} onChange={onChange} error={error} />;
  return <TextLine label={f.label} value={value} onChange={onChange} error={error} placeholder={f.placeholder} upper={f.upper} multiline={f.kind === 'textarea'} />;
}

// ── Installation (assign → schedule → 8 photos with approval → complete) ──
function InstallSectionView({ c, role, s, onChanged }: { c: FullCustomer; role?: string; s: NonNullable<ProgressCard['install']>; onChanged: (m: string) => void }) {
  const [installer, setInstaller] = useState('');
  const [date, setDate] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [askDone, setAskDone] = useState(false);
  const act = async (op: 'assignInstaller' | 'scheduleInstall' | 'installComplete', values: Record<string, string>) => {
    setBusy(op); setErr(null);
    try { onChanged(await runOp(api, op, { id: c.id, values })); } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(null); }
  };
  const can = (op: 'assignInstaller') => canOp(op, role);
  return (
    <View style={{ gap: space[3] }}>
      <Step n={1} done={s.hasInstaller} title="Assign Installer" right={s.hasInstaller ? s.assignedName : undefined}>
        {!s.hasInstaller ? (
          can('assignInstaller') ? (
            <>
              <InstallerField value={installer} onChange={setInstaller} />
              <Btn label="Assign" onPress={() => (installer ? act('assignInstaller', { installer }) : setErr('Select an installer first'))} loading={busy === 'assignInstaller'} />
            </>
          ) : <Text style={note}>{ROLE_NOTE}</Text>
        ) : null}
      </Step>
      <Step n={2} done={s.hasSchedule} title="Schedule Date" right={s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString('en-IN') : undefined}>
        {!s.hasSchedule && s.hasInstaller ? (
          can('assignInstaller') ? (
            <>
              <DateField label="Installation date" value={date} onChange={setDate} minToday />
              <Btn label="Confirm" onPress={() => act('scheduleInstall', { date })} loading={busy === 'scheduleInstall'} />
            </>
          ) : <Text style={note}>{ROLE_NOTE}</Text>
        ) : !s.hasSchedule ? <Text style={note}>Assign installer first</Text> : null}
      </Step>
      <Step n={3} done={s.photoCount >= 8} title="Upload Photos" right={`${s.uploadedCount}/8`}>
        {s.hasSchedule && s.instId ? <PhotoGrid c={c} role={role} canApprove={s.canApprove} onChanged={onChanged} /> : <Text style={note}>Schedule date first</Text>}
      </Step>
      <Step n={4} done={false} title="Mark Complete">
        {s.approvedCount >= 8
          ? <Btn label="Mark Installation Complete" onPress={() => setAskDone(true)} loading={busy === 'installComplete'} disabled={!canOp('installComplete', role)} />
          : <Text style={note}>{s.uploadedCount >= 8 ? `All photos need approval (${s.approvedCount}/8 approved)` : 'Upload and approve all 8 photos first'}</Text>}
      </Step>
      {err ? <Banner>{err}</Banner> : null}
      {askDone ? <ActionModal title="Mark installation as complete?" confirmLabel="Mark complete" onConfirm={async () => { await runOp(api, 'installComplete', { id: c.id, values: {} }).then(onChanged); setAskDone(false); }} onClose={() => setAskDone(false)} /> : null}
    </View>
  );
}
const note = { fontSize: font.small, color: colors.ink3 } as const;

function Step({ n, done, title, right, children }: { n: number; done: boolean; title: string; right?: string; children?: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: children ? space[2] : 0 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? colors.brand : colors.surface, borderWidth: done ? 0 : 1.5, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : <Text style={{ fontSize: 11, color: colors.ink2 }}>{n}</Text>}
        </View>
        <Text style={{ flex: 1, fontSize: font.body, fontWeight: '600', color: colors.ink }}>{title}</Text>
        {right ? <Text style={{ fontSize: font.small, color: colors.ink2 }}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** 8 labelled photos: View, Re-upload, Approve / Reject (admin, manager), Camera / Files when missing. */
export function PhotoGrid({ c, role, canApprove, onChanged }: { c: FullCustomer; role?: string; canApprove: boolean; onChanged: (m: string) => void }) {
  const map = c.installation.photo_map;
  const stamp = usePhotoStamp();
  const [sheet, setSheet] = useState<{ key: string; label: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reject, setReject] = useState<string | null>(null);
  const canUpload = canOp('assignInstaller', role) || role === 'sales_agent';

  const upload = async (slot: { key: string; label: string }, source: Source) => {
    setSheet(null); setErr(null);
    try {
      const file = await pickFile(source, true);
      if (!file) return;
      const bad = fileProblem(file); if (bad) { setErr(bad); return; }
      setBusy(slot.key);
      let f = file;
      if (role === 'installer' && stamp) {
        try {
          const pos = await currentPosition();
          const place = await placeName(pos.lat, pos.lng);
          const uri = await stamp({ uri: file.uri, width: file.width ?? 1600, height: file.height ?? 1200, lines: stampLines(place, pos.lat, pos.lng) });
          f = { ...file, uri, name: file.name.replace(/\.[^.]+$/, '') + '_stamped.jpg', type: 'image/jpeg', size: undefined };
        } catch { /* no GPS: upload without the stamp, like the website */ }
      }
      await uploadSitePhoto(api, c.id, slot.key, f);
      onChanged(`📷 ${slot.label} uploaded`);
    } catch (e) { setErr(errText(e, 'Upload failed. Try again.')); } finally { setBusy(null); }
  };
  const review = async (key: string, action: 'approved' | 'rejected', note?: string) => {
    setBusy(key); setErr(null);
    try { await approvePhoto(api, c.id, key, action, note); onChanged(action === 'approved' ? 'Photo approved' : 'Photo rejected'); }
    catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(null); }
  };

  return (
    <View>
      {c.installation.photos_reupload_requested ? <Banner tone="waiting">Re-upload requested{c.installation.photos_reupload_note ? `: ${c.installation.photos_reupload_note}` : ''}</Banner> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {PHOTO_SLOTS.map((p) => {
          const ph = map[p.key];
          const up = !!ph?.file_url;
          const st = ph?.approval_status || 'pending';
          const border = st === 'approved' ? '#bfe3cb' : st === 'rejected' ? '#fecaca' : colors.border;
          return (
            <View key={p.key} style={{ width: '48%', borderWidth: 1.5, borderColor: border, borderRadius: radius.md, padding: space[2], backgroundColor: st === 'approved' ? '#ecfdf3' : st === 'rejected' ? '#fff5f5' : colors.surface }}>
              <Text numberOfLines={2} style={{ fontSize: font.caption, fontWeight: '600', color: colors.ink2, marginBottom: 4 }}>{p.label}</Text>
              {up ? <Image source={{ uri: ph!.file_url! }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 6, backgroundColor: colors.tileGrey }} contentFit="cover" accessibilityLabel={`${p.label} photo`} /> : null}
              {busy === p.key ? <ActivityIndicator color={colors.brand} style={{ marginTop: 6 }} /> : up ? (
                <View style={{ gap: 6, marginTop: 6 }}>
                  <SmallBtn label="View" hint={`View ${p.label}`} tone="green" onPress={() => Linking.openURL(ph!.file_url!)} />
                  {st !== 'approved' && canUpload ? <SmallBtn label="Re-upload" hint={`Re-upload ${p.label}`} onPress={() => setSheet(p)} /> : null}
                  {st === 'pending' && canApprove ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{ flex: 1 }}><SmallBtn label="Approve" hint={`Approve ${p.label}`} tone="green" onPress={() => review(p.key, 'approved')} /></View>
                      <View style={{ flex: 1 }}><SmallBtn label="Reject" hint={`Reject ${p.label}`} tone="red" onPress={() => setReject(p.key)} /></View>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: font.caption, fontWeight: '600', color: st === 'approved' ? colors.brand : st === 'rejected' ? colors.tone.problem.fg : colors.ink3 }}>
                    {st === 'approved' ? 'Approved' : st === 'rejected' ? `Rejected${ph?.rejection_note ? ', ' + ph.rejection_note : ''}` : 'Pending review'}
                  </Text>
                </View>
              ) : canUpload ? (
                <View style={{ gap: 6 }}>
                  <SmallBtn label="Camera" hint={`Take photo for ${p.label}`} tone="green" onPress={() => upload(p, 'camera')} />
                  <SmallBtn label="Files" hint={`Choose file for ${p.label}`} onPress={() => upload(p, 'library')} />
                </View>
              ) : <Text style={note}>Missing</Text>}
            </View>
          );
        })}
      </View>
      {err ? <View style={{ marginTop: space[2] }}><Banner>{err}</Banner></View> : null}
      {sheet ? <SourceSheet title={`${sheet.label} photo`} photosOnly onPick={(s) => upload(sheet, s)} onClose={() => setSheet(null)} /> : null}
      {reject ? (
        <ActionModal title="Reject this photo?" intro="The installer will see your reason." confirmLabel="Reject" destructive textLabel="Reason" textPlaceholder="Optional reason"
          onConfirm={async (t) => { const k = reject; setReject(null); await review(k, 'rejected', t); }} onClose={() => setReject(null)} />
      ) : null}
    </View>
  );
}

// ── Net metering steps (applied → DISCOM docs date → approved (+ photo) → installed) ──
function NetMeterView({ c, role, s, onChanged }: { c: FullCustomer; role?: string; s: NonNullable<ProgressCard['netmeter']>; onChanged: (m: string) => void }) {
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const can = canOp('netMeter', role);
  const go = async (key: string, fn: () => Promise<string>) => { setBusy(key); setErr(null); try { onChanged(await fn()); } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(null); } };
  const uploadNm = async (source: Source) => {
    try {
      const file = await pickFile(source, true); if (!file) return;
      const bad = fileProblem(file); if (bad) { setErr(bad); return; }
      await go('photo', async () => { await uploadSitePhoto(api, c.id, 'net_meter', file); return 'Net meter photo uploaded'; });
    } catch (e) { setErr(errText(e, 'Upload failed.')); }
  };
  return (
    <View style={{ gap: space[2] }}>
      <Step n={1} done title="Applied to DISCOM" />
      <Step n={2} done={!!s.submittedDate} title="Submit Documents to DISCOM" right={s.submittedDate ? new Date(s.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined}>
        {!s.submittedDate && s.activeSubmit ? (can ? (
          <>
            <Text style={[note, { marginBottom: space[2] }]}>Record the date documents were submitted to DISCOM office</Text>
            <DateField label="Submission date" value={date} onChange={setDate} maxToday />
            <Btn label="Record" onPress={() => go('submit', () => runOp(api, 'nmSubmit', { id: c.id, values: { date } }))} loading={busy === 'submit'} />
          </>
        ) : <Text style={note}>{ROLE_NOTE}</Text>) : null}
      </Step>
      <Step n={3} done={s.approvedDone} title="DISCOM Approved">
        {s.activeApproved ? (
          <View style={{ gap: 6 }}>
            {s.photoUrl ? <Image source={{ uri: s.photoUrl }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 6 }} contentFit="cover" accessibilityLabel="Net meter photo" /> : null}
            {s.photoUrl ? <SmallBtn label="View Photo" tone="green" onPress={() => Linking.openURL(s.photoUrl!)} /> : null}
            {s.photoApproved ? <Text style={{ fontSize: font.small, color: colors.brand, fontWeight: '600' }}>✓ Photo Approved</Text>
              : s.photoReupload ? <Banner tone="waiting">Re-upload Requested</Banner>
              : s.photoUrl && s.canApprove ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ flex: 1 }}><SmallBtn label="Approve" tone="green" onPress={() => go('nmApprove', async () => { await nmPhotoReview(api, c.id, 'approve'); return 'Net meter photo approved'; })} /></View>
                  <View style={{ flex: 1 }}><SmallBtn label="Request Re-upload" tone="red" onPress={() => go('nmRe', async () => { await nmPhotoReview(api, c.id, 'reupload'); return 'Re-upload requested'; })} /></View>
                </View>
              ) : null}
            {(!s.photoUrl || s.photoReupload || !s.photoApproved) && can ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ flex: 1 }}><SmallBtn label={s.photoUrl ? 'Re-upload Photo' : 'Camera'} tone="green" onPress={() => uploadNm('camera')} /></View>
                <View style={{ flex: 1 }}><SmallBtn label="Files" onPress={() => uploadNm('library')} /></View>
              </View>
            ) : null}
          </View>
        ) : null}
        {s.canMarkApproved ? <Btn label="Mark Approved" onPress={() => go('approved', () => runOp(api, 'netMeter', { id: c.id, values: {}, args: { action: 'approved' } }))} loading={busy === 'approved'} disabled={!can} /> : null}
      </Step>
      <Step n={4} done={false} title="Net Meter Installed">
        {s.canMarkInstalled ? <Btn label="Mark Installed" onPress={() => go('installed', () => runOp(api, 'netMeter', { id: c.id, values: {}, args: { action: 'installed' } }))} loading={busy === 'installed'} disabled={!can} /> : null}
      </Step>
      {busy === 'photo' ? <ActivityIndicator color={colors.brand} /> : null}
      {err ? <Banner>{err}</Banner> : null}
    </View>
  );
}

// ── Installer's own view ──────────────────────────────────────────────
function InstallerProgress({ c, onChanged }: { c: FullCustomer; onChanged: (m: string) => void }) {
  const v = installerView(c);
  const [ask, setAsk] = useState(false);
  const tone = v.banner.tone === 'ok' ? { bg: colors.hero, fg: colors.white, sub: colors.mint } : v.banner.tone === 'red' ? { bg: '#fef2f2', fg: colors.tone.problem.fg, sub: colors.tone.problem.fg } : v.banner.tone === 'warn' ? { bg: '#fffbeb', fg: '#92400e', sub: '#92400e' } : { bg: colors.tileGrey, fg: colors.ink, sub: colors.ink2 };
  return (
    <>
      <View style={{ backgroundColor: tone.bg, borderRadius: radius.lg, padding: space[4], marginBottom: space[3] }}>
        {v.isComplete ? <Text style={{ color: tone.sub, fontSize: font.small }}>{v.banner.sub}</Text> : null}
        <Text style={{ color: tone.fg, fontSize: font.title, fontWeight: '700' }}>{v.banner.title}</Text>
        {v.isComplete ? <Text style={{ color: tone.sub, fontSize: font.small, marginTop: 4 }}>{c.name} · {c.project_id} · {c.system_kw ?? '?'} kW · {c.city || c.district || ''}</Text>
          : <Text style={{ color: tone.sub, fontSize: font.small, marginTop: 4 }}>{v.banner.sub}</Text>}
      </View>
      {v.isComplete ? null : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space[3], marginBottom: space[3], gap: space[2] }}>
            <Ionicons name="person-outline" size={20} color={colors.ink2} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: font.caption, color: colors.ink3 }}>Assigned Installer</Text>
              <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{v.assignedName || '—'}</Text>
            </View>
            <Text style={{ fontSize: font.small, color: colors.ink2 }}>{v.schedDate ? new Date(v.schedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'No date set'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[2] }}>
            <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>Upload Photos</Text>
            <Text style={{ fontSize: font.small, color: colors.ink2 }}>{v.uploaded}/8</Text>
          </View>
          <Text style={{ fontSize: font.caption, color: colors.ink3, marginBottom: space[2] }}>Photos are stamped with place, GPS and time.</Text>
          <PhotoGrid c={c} role="installer" canApprove={false} onChanged={onChanged} />
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, marginVertical: space[3], overflow: 'hidden' }}>
            <View style={{ width: `${(v.uploaded / 8) * 100}%`, height: 6, backgroundColor: colors.brand }} />
          </View>
          {v.allApproved ? <Btn label="Mark Installation Complete" onPress={() => setAsk(true)} />
            : <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: font.small }}>{v.allUploaded ? 'Waiting for admin to approve all photos' : `Upload all 8 photos to complete · ${v.uploaded}/8 done`}</Text>}
        </>
      )}
      {v.isComplete ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space[3] }}>
          <Text style={{ fontSize: font.caption, color: colors.ink3, marginBottom: space[2] }}>Job Summary</Text>
          {[['Customer', c.name], ['Project ID', c.project_id], ['System', `${c.system_kw ?? '?'} kW`], ['Location', c.city || c.district || '—']].map(([l, val]) => (
            <View key={l as string} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.ink2, fontSize: font.small }}>{l}</Text><Text style={{ color: colors.ink, fontWeight: '600', fontSize: font.small }}>{(val as string) || '—'}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {ask ? <ActionModal title="Mark installation as complete?" confirmLabel="Mark complete" onConfirm={async () => { onChanged(await runOp(api, 'installComplete', { id: c.id, values: {} })); setAsk(false); }} onClose={() => setAsk(false)} /> : null}
    </>
  );
}
