import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionModal, Choice } from '@/components/action-modal';
import { Banner, Btn, Card, Divider, Field, Pill, SectionLabel } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { availableActions, can, type ActionKey } from '@/lib/actions';
import * as A from '@/lib/actions-api';
import { ApiError } from '@/lib/api';
import { fetchCustomer, type Customer } from '@/lib/customers';
import { dateShort, dateTime, initials, inr, kw, place } from '@/lib/format';
import { nextStatuses } from '@/lib/rules';
import { statusLabel, statusTone } from '@/lib/status';
import { api } from '@/state/api';
import { bumpData } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

type Tab = 'Overview' | 'Progress' | 'Loan' | 'Notes';

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const tabs: Tab[] = user?.role === 'installer' ? ['Progress', 'Notes'] : ['Overview', 'Progress', 'Loan', 'Notes'];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const { data: c, error, loading, reload } = useLoad(() => fetchCustomer(api, String(id)), [id]);
  // bumped after every change so the steps and notes reload
  const [rk, setRk] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  const changed = (msg: string) => {
    bumpData(); setRk((n) => n + 1); reload();
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 5000);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: space[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/customers'))}
          style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink }}>{c?.name ?? 'Customer'}</Text>
          <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink3 }}>{c?.project_id ?? ' '}</Text>
        </View>
        {c?.phone ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone}`)}
            style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.brandTint }}>
            <Ionicons name="call" size={20} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>

      {tabs.length > 1 ? (
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {tabs.map((t) => {
            const on = t === tab;
            return (
              <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t)}
                style={{ flex: 1, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: on ? colors.brand : 'transparent' }}>
                <Text style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.brand : colors.ink3 }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }}>
        {error && !c ? (
          <>
            <Banner>{error}</Banner>
            <Btn label="Try again" onPress={reload} />
          </>
        ) : loading && !c ? (
          <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading customer…</Text>
        ) : c ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[3] }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
                <Text style={{ color: colors.white, fontWeight: '700', fontSize: font.lead }}>{initials(c.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill>
                <Text style={{ color: colors.ink3, fontSize: font.caption, marginTop: 4 }}>{[place(c), kw(c.system_kw)].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
            {flash ? <Banner tone="done">{flash}</Banner> : null}
            {tab === 'Overview' ? <Overview c={c} /> : tab === 'Progress' ? <Progress c={c} role={user?.role} rk={rk} onChanged={changed} /> : tab === 'Loan' ? <Loan c={c} /> : <Notes c={c} role={user?.role} rk={rk} onChanged={changed} />}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 10, minHeight: 44, alignItems: 'flex-start' }}>
      <Text style={{ width: 120, color: colors.ink3, fontSize: font.small }}>{label}</Text>
      <Text selectable style={{ flex: 1, color: colors.ink, fontSize: font.body }}>{value && String(value).trim() ? value : '–'}</Text>
    </View>
  );
}

function Lines({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <Card style={{ paddingVertical: space[1] }}>
      {rows.map(([l, v], i) => (
        <View key={l}>{i > 0 ? <Divider /> : null}<Line label={l} value={v} /></View>
      ))}
    </Card>
  );
}

const SOURCE: Record<string, string> = { referral: 'Referral', walk_in: 'Walk-in', direct: 'Direct', website: 'Website', social: 'Social media' };

function Overview({ c }: { c: Customer }) {
  const agent = c.assigned_agent_name || c.agent_name;
  return (
    <>
      <SectionLabel>Customer</SectionLabel>
      <Lines rows={[
        ['Phone', c.phone], ['Project ID', c.project_id], ['Location', place(c)],
        ['System size', kw(c.system_kw)], ['Lead source', c.lead_source ? SOURCE[c.lead_source] ?? c.lead_source.replace(/_/g, ' ') : null],
        ['Sales agent', agent],
      ]} />
      <SectionLabel>Money</SectionLabel>
      <Lines rows={[
        ['Quotation', c.quotation_value ? inr(c.quotation_value) : null],
        ['Payment', c.payment_method ? String(c.payment_method).replace(/_/g, ' ') : null],
        ['Disbursed', (c.amount_disbursed || c.disbursed_amount) ? inr(c.amount_disbursed || c.disbursed_amount) : null],
      ]} />
    </>
  );
}

function Loan({ c }: { c: Customer }) {
  const bank = c.loan_bank || c.loan_bank_name || null;
  const amount = Number(c.loan_amount) > 0 ? c.loan_amount : null;
  const sanctioned = Number(c.sanctioned_amount) > 0 ? c.sanctioned_amount : null;
  const disbursed = Number(c.amount_disbursed || c.disbursed_amount) > 0 ? (c.amount_disbursed || c.disbursed_amount) : null;
  const has = !!(bank || amount || sanctioned || disbursed || c.loan_application_no);
  return (
    <>
      <SectionLabel>Loan</SectionLabel>
      {has ? (
        <Lines rows={[
          ['Bank', bank], ['Application no.', c.loan_application_no as string | null],
          ['Loan amount', amount ? inr(amount) : null], ['Sanctioned', sanctioned ? inr(sanctioned) : null],
          ['Disbursed', disbursed ? inr(disbursed) : null],
          ['2nd disbursal', Number(c.second_disbursal_amount) > 0 ? inr(c.second_disbursal_amount) : null],
        ]} />
      ) : (
        <Card><Text style={{ color: colors.ink2, fontSize: font.body }}>No loan details on this customer yet.</Text></Card>
      )}
    </>
  );
}

const GROUP_ORDER_NOTE = 'Steps follow this customer\'s own payment method.';

function Progress({ c, role, rk, onChanged }: { c: Customer; role?: string; rk: number; onChanged: (msg: string) => void }) {
  const { data: wf, error, loading, reload } = useLoad(() => A.fetchWorkflow(api, c.id), [c.id, c.status, rk]);
  const [open, setOpen] = useState<ActionKey | 'reject' | null>(null);
  const cancelled = c.status === 'cancelled';
  const pm = wf?.payment_method ?? (c.payment_method as string | undefined) ?? 'loan';
  const next = nextStatuses(c.status, pm);
  const actions = availableActions(c, role).filter((a) => a !== 'advance' || next.length > 0);
  const done = (msg: string) => () => { setOpen(null); onChanged(msg); };

  return (
    <>
      {cancelled ? (
        <Banner tone="inactive">
          Cancelled{c.cancelled_by_name ? ` by ${c.cancelled_by_name}` : ''}{c.cancelled_at ? ` on ${dateShort(c.cancelled_at)}` : ''}.
          {c.cancel_reason ? ` Reason: ${c.cancel_reason}` : ''}
        </Banner>
      ) : null}
      {c.completion_requested_at ? (
        <Banner tone="waiting">
          Completion requested{c.completion_requested_by_name ? ` by ${c.completion_requested_by_name}` : ''}. Waiting for approval.
          {c.completion_request_note ? ` Note: ${c.completion_request_note}` : ''}
        </Banner>
      ) : null}
      {!c.completion_requested_at && c.completion_rejected_note ? <Banner>Completion was sent back: {c.completion_rejected_note}</Banner> : null}

      {actions.length ? (
        <>
          <SectionLabel>Actions</SectionLabel>
          <View style={{ gap: space[2], marginBottom: space[2] }}>
            {actions.map((a) => a === 'review' ? (
              <View key={a} style={{ gap: space[2] }}>
                <Btn label="Approve completion" onPress={() => setOpen('review')} />
                <Btn label="Send completion back" variant="secondary" onPress={() => setOpen('reject')} />
              </View>
            ) : (
              <Btn key={a} label={ACTION_LABEL[a]} variant={a === 'cancel' ? 'danger' : a === 'advance' || a === 'requestCompletion' || a === 'reactivate' ? 'primary' : 'secondary'} onPress={() => setOpen(a)} />
            ))}
          </View>
        </>
      ) : null}

      <SectionLabel>Steps</SectionLabel>
      {error && !wf ? (
        <>
          <Banner>{error}</Banner>
          <Btn label="Try again" onPress={reload} />
        </>
      ) : loading && !wf ? (
        <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading steps…</Text>
      ) : wf ? (
        <>
          <Card style={{ paddingVertical: space[2] }}>
            {wf.steps.map((s, i) => {
              const isDone = !cancelled && s.state === 'done';
              const isCur = !cancelled && s.state === 'current';
              const problem = isCur && c.status === 'loan_rejected';
              const bg = problem ? colors.tone.problem.fg : isDone || isCur ? colors.brand : colors.border;
              return (
                <View key={s.key} style={{ flexDirection: 'row', minHeight: 48 }} accessible accessibilityLabel={`${s.label}, ${isDone ? 'done' : isCur ? 'current' : 'not started'}`}>
                  <View style={{ alignItems: 'center', width: 32 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                      {isDone ? <Ionicons name="checkmark" size={15} color={colors.white} /> : isCur ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} /> : null}
                    </View>
                    {i < wf.steps.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: isDone ? colors.brand : colors.border }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingTop: 7, paddingBottom: 8, paddingLeft: space[2] }}>
                    <Text style={{ fontSize: font.body, fontWeight: isCur ? '700' : '500', color: isDone || isCur ? colors.ink : colors.ink3 }}>{s.label}</Text>
                    {isCur && c.status !== s.key ? <Text style={{ fontSize: font.small, color: problem ? colors.tone.problem.fg : colors.ink2, marginTop: 2 }}>Now: {statusLabel(c.status)}</Text> : null}
                  </View>
                </View>
              );
            })}
          </Card>
          <Text style={{ color: colors.ink3, fontSize: font.caption, marginTop: space[1] }}>{GROUP_ORDER_NOTE}</Text>
        </>
      ) : null}

      {open === 'advance' ? <AdvanceModal c={c} options={next} onClose={() => setOpen(null)} onDone={done('Status updated.')} /> : null}
      {open === 'moveBack' ? <MoveBackModal c={c} wf={wf} onClose={() => setOpen(null)} onDone={done('Moved back.')} /> : null}
      {open === 'cancel' ? (
        <ActionModal title="Cancel this customer?" intro="The customer moves to Cancelled. An admin or manager can reactivate later."
          confirmLabel="Cancel customer" destructive confirmWord="CANCEL" textLabel="Reason" textRequired textPlaceholder="Why is this customer cancelled?"
          onConfirm={async (t) => { await A.cancelCustomer(api, c.id, t); done('Customer cancelled.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {open === 'reactivate' ? (
        <ActionModal title="Reactivate customer?" intro={`The customer goes back to ${statusLabel(c.cancelled_from_status as string | undefined) === 'New Customer' ? 'Lead Captured' : statusLabel(c.cancelled_from_status as string | undefined)}.`}
          confirmLabel="Reactivate" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.reactivateCustomer(api, c.id, t); done('Customer reactivated.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {open === 'requestCompletion' ? (
        <ActionModal title="Request project completion?" intro="An admin or manager will review it. The server checks that subsidy, referral and cash are all done."
          confirmLabel="Request completion" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.requestCompletion(api, c.id, t); done('Completion requested.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {open === 'review' ? (
        <ActionModal title="Approve completion?" intro="The project will be marked complete."
          confirmLabel="Approve" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.reviewCompletion(api, c.id, 'approve', t); done('Project marked complete.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {open === 'reject' ? (
        <ActionModal title="Send completion back?" intro="The requester will see your reason."
          confirmLabel="Send back" destructive textLabel="Reason" textRequired textPlaceholder="What is still missing?"
          onConfirm={async (t) => { await A.reviewCompletion(api, c.id, 'reject', t); done('Sent back.')(); }} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}

const ACTION_LABEL: Record<ActionKey, string> = {
  advance: 'Move to next step', moveBack: 'Move back', cancel: 'Cancel customer', reactivate: 'Reactivate customer',
  requestCompletion: 'Request completion', review: 'Review completion',
};

function AdvanceModal({ c, options, onClose, onDone }: { c: Customer; options: string[]; onClose: () => void; onDone: () => void }) {
  const [pick, setPick] = useState<string | null>(options.length === 1 ? options[0] : null);
  return (
    <ActionModal title="Move to next step" intro={`Now: ${statusLabel(c.status)}`} confirmLabel={pick ? `Move to ${statusLabel(pick)}` : 'Choose a step'}
      canConfirm={!!pick} textLabel="Note" textPlaceholder="Optional note"
      onConfirm={async (t) => { await A.changeStatus(api, c.id, pick as string, t); onDone(); }} onClose={onClose}>
      {options.map((o) => <Choice key={o} label={statusLabel(o)} selected={pick === o} onPress={() => setPick(o)} />)}
    </ActionModal>
  );
}

function MoveBackModal({ c, wf, onClose, onDone }: { c: Customer; wf: A.Workflow | null; onClose: () => void; onDone: () => void }) {
  const steps = (wf?.steps ?? []).filter((s) => s.can_move_back).reverse();
  const [pick, setPick] = useState<string | null>(null);
  const chosen = steps.find((s) => s.key === pick);
  return (
    <ActionModal title="Move back" intro={wf ? `Now: ${wf.current_label}. Pick the earlier step to return to.` : 'Loading steps…'}
      confirmLabel={chosen ? `Move back to ${chosen.label}` : 'Choose a step'} destructive canConfirm={!!chosen}
      textLabel="Reason" textRequired textPlaceholder="Why is this customer moving back?"
      onConfirm={async (t) => { await A.moveBack(api, c.id, pick as string, t); onDone(); }} onClose={onClose}>
      {steps.length === 0 && wf ? <Text style={{ color: colors.ink2, fontSize: font.body, marginBottom: space[3] }}>There is no earlier step to go back to.</Text> : null}
      {steps.map((s) => <Choice key={s.key} label={s.label} selected={pick === s.key} onPress={() => setPick(s.key)} />)}
      {chosen ? (
        <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space[3], marginBottom: space[2] }}>
          {chosen.resets?.length ? <Text style={{ fontWeight: '600', color: colors.ink, fontSize: font.small }}>This will reset</Text> : null}
          {chosen.resets?.map((r) => <Text key={r} style={{ color: colors.ink2, fontSize: font.small, marginTop: 2 }}>• {r}</Text>)}
          {chosen.keeps?.length ? <Text style={{ fontWeight: '600', color: colors.ink, fontSize: font.small, marginTop: space[2] }}>This stays</Text> : null}
          {chosen.keeps?.map((r) => <Text key={r} style={{ color: colors.ink2, fontSize: font.small, marginTop: 2 }}>• {r}</Text>)}
        </View>
      ) : null}
    </ActionModal>
  );
}

function Notes({ c, role, rk, onChanged }: { c: Customer; role?: string; rk: number; onChanged: (msg: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => A.fetchTimeline(api, c.id), [c.id, rk]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lock = useRef(false);
  const canNote = can.note(role);

  const add = async () => {
    if (lock.current) return;
    if (!text.trim()) { setErr('Write something first.'); return; }
    lock.current = true; setBusy(true); setErr(null);
    try {
      await A.addNote(api, c.id, text);
      setText(''); onChanged('Note added.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not add the note.');
    } finally { lock.current = false; setBusy(false); }
  };

  return (
    <>
      {canNote ? (
        <>
          <SectionLabel>Add a note</SectionLabel>
          <Field label="Note" value={text} onChangeText={(t) => { setText(t); if (err) setErr(null); }} multiline numberOfLines={3} textAlignVertical="top" maxLength={2000} placeholder="Write a note for this customer" error={err ?? undefined} editable={!busy} />
          <Btn label="Add note" onPress={add} loading={busy} disabled={busy} />
        </>
      ) : null}
      <SectionLabel>Timeline</SectionLabel>
      {error && !data ? (
        <>
          <Banner>{error}</Banner>
          <Btn label="Try again" onPress={reload} />
        </>
      ) : loading && !data ? (
        <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading timeline…</Text>
      ) : data && data.length === 0 ? (
        <Card><Text style={{ color: colors.ink2, fontSize: font.body }}>Nothing on the timeline yet.</Text></Card>
      ) : data ? (
        data.map((t) => {
          const note = A.isNote(t);
          const detail = A.timelineDetail(t);
          return (
            <View key={t.id} style={{ backgroundColor: note ? colors.brandTint : colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: note ? '#bfe3cb' : colors.border, padding: space[3], marginBottom: space[2] }}>
              <Text selectable style={{ fontSize: font.body, color: colors.ink }}>{t.action}</Text>
              {detail ? <Text selectable style={{ fontSize: font.small, color: colors.ink2, marginTop: 2 }}>{detail}</Text> : null}
              <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: 4 }}>{[t.user_name, dateTime(t.created_at)].filter(Boolean).join(' · ')}</Text>
            </View>
          );
        })
      ) : null}
    </>
  );
}
