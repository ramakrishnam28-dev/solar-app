import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionModal, Choice } from '@/components/action-modal';
import { CustomerCash } from '@/components/customer-cash';
import { CustomerDocs } from '@/components/customer-docs';
import { useUnderDevelopment } from '@/components/under-development';
import { markFieldVisitDone, sourceLabel } from '@/lib/customer-form';
import { Banner, Btn, Card, Field } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { availableActions, can, type ActionKey } from '@/lib/actions';
import * as A from '@/lib/actions-api';
import { ApiError } from '@/lib/api';
import { fetchCustomer, type Customer } from '@/lib/customers';
import { dateShort, dateTime, inr, kw, place } from '@/lib/format';
import { nextStatuses } from '@/lib/rules';
import { STEP_COUNT, STEP_SHORT, nextAction, primaryLabel, statusLabel, stepNumber } from '@/lib/status';
import { api } from '@/state/api';
import { bumpData } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

type Tab = 'Overview' | 'Progress' | 'Cash flow' | 'Docs' | 'Logs';
type Open = ActionKey | 'reject' | null;

/** "Loan: Sanctioned" → "Sanctioned" on the small decision buttons (the card already names the step). */
const shortStatus = (st: string) => statusLabel(st).replace(/^[^:]+:\s*/, '');

const waNumber = (phone?: string | null) => {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

export default function CustomerScreen() {
  const { id, tab: startTab, created } = useLocalSearchParams<{ id: string; tab?: string; created?: string }>();
  const { user } = useSession();
  const role = user?.role;
  const soon = useUnderDevelopment();
  const tabs: Tab[] = role === 'installer' ? ['Progress', 'Docs', 'Logs'] : ['Overview', 'Progress', 'Cash flow', 'Docs', 'Logs'];
  const [tab, setTab] = useState<Tab>(tabs.includes(startTab as Tab) ? (startTab as Tab) : tabs[0]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  // the decision button tapped on the dark current-step card, preselected in the dialog
  const [preset, setPreset] = useState<string | null>(null);
  const { data: c, error, loading, reload } = useLoad(() => fetchCustomer(api, String(id)), [id]);
  // bumped after every change so the steps and logs reload
  const [rk, setRk] = useState(0);
  const [flash, setFlash] = useState<string | null>(created === '1' ? 'Customer created. Add the KYC documents now.' : created === 'partial' ? 'Customer created. Father\'s name or consumer number did not save; add them with Edit.' : null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  const changed = (msg: string) => {
    bumpData(); setRk((n) => n + 1); reload();
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 5000);
  };
  const { data: wf, error: wfError, loading: wfLoading, reload: wfReload } = useLoad(() => A.fetchWorkflow(api, String(id)), [id, c?.status, rk]);

  const cancelled = c?.status === 'cancelled';
  const pm = wf?.payment_method ?? (c?.payment_method as string | undefined) ?? 'loan';
  const next = c ? nextStatuses(c.status, pm) : [];
  const actions = c ? availableActions(c, role).filter((a) => a !== 'advance' || next.length > 0) : [];
  const has = (a: ActionKey) => actions.includes(a);
  const done = (msg: string) => () => { setOpen(null); changed(msg); };
  const step = c ? stepNumber(c.status) : 0;

  // the big button at the bottom, in the order of the design: Move back + Save & advance
  const primary: { label: string; run: () => void } | null = !c ? null
    : has('reactivate') ? { label: 'Reactivate', run: () => setOpen('reactivate') }
    : has('advance') ? { label: tab === 'Progress' ? 'Save & advance' : primaryLabel(c.status), run: () => { setPreset(null); setOpen('advance'); } }
    : has('requestCompletion') && c.status === 'subsidy_credited' ? { label: 'Request completion', run: () => setOpen('requestCompletion') }
    : null;
  const usesCash = ['cash', 'hybrid'].includes(String(c?.payment_method ?? '').toLowerCase());
  // Cash flow tab: one wide Record payment button (wireframe A5)
  const cashBar = tab === 'Cash flow' && c && can.recordCash(role) && !cancelled
    ? { label: 'Record payment', run: () => (usesCash ? setRecordOpen(true) : soon('Record bank disbursal')) } : null;
  const menuHasItems = can.editCustomer(role) || can.assignAgent(role) || has('cancel') || has('reactivate');
  const edit = () => router.push({ pathname: '/edit-customer/[id]', params: { id: String(id) } });
  const wa = waNumber(c?.phone);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingVertical: space[2], backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/customers'))}
          style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text numberOfLines={1} accessibilityRole="header" style={{ flex: 1, marginLeft: 4, fontSize: font.title, fontWeight: '600', color: colors.ink }}>{c?.name ?? 'Customer'}</Text>
        {c?.phone ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone}`)}
            style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call-outline" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        {c && tab === 'Cash flow' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Share statement" onPress={() => soon('Share statement on WhatsApp')}
            style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="share-social-outline" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        {c && menuHasItems ? (
          <Pressable accessibilityRole="button" accessibilityLabel="More actions" onPress={() => setMenu(true)}
            style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      {c ? (
        <View style={{ flexShrink: 0, backgroundColor: colors.surface, paddingHorizontal: space[4], paddingBottom: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: font.caption, color: colors.ink2 }}>{[c.project_id, kw(c.system_kw)].filter(Boolean).join(' · ')}</Text>
            <View style={{ backgroundColor: cancelled ? colors.tone.inactive.bg : '#e0ebff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: font.caption, fontWeight: '600', color: cancelled ? colors.tone.inactive.fg : '#1d4ed8' }}>
                {cancelled ? 'Cancelled' : step ? `${STEP_SHORT[step - 1]} · step ${step}/${STEP_COUNT}` : statusLabel(c.status)}
              </Text>
            </View>
          </View>
          <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: space[2], overflow: 'hidden' }}>
            <View style={{ width: `${(step / STEP_COUNT) * 100}%`, height: 4, backgroundColor: colors.brand }} />
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexShrink: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {tabs.map((t) => {
          const on = t === tab;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t)}
              style={{ flex: 1, minHeight: MIN_TAP + 4, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: on ? colors.brand : 'transparent' }}>
              <Text numberOfLines={1} style={{ fontSize: font.small, fontWeight: on ? '700' : '500', color: on ? colors.brand : colors.ink2 }}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">
        {error && !c ? (
          <>
            <Banner>{error}</Banner>
            <Btn label="Try again" onPress={reload} />
          </>
        ) : loading && !c ? (
          <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading customer…</Text>
        ) : c ? (
          <>
            {flash ? <Banner tone="done">{flash}</Banner> : null}
            {tab === 'Overview' ? <Overview c={c} rk={rk} role={role} onLogs={() => setTab('Logs')} onEdit={edit} onVisit={() => setVisitOpen(true)} />
              : tab === 'Progress' ? <Progress c={c} role={role} onDocs={() => setTab('Docs')} showLoan={role !== 'installer'} wf={wf} wfError={wfError} wfLoading={wfLoading} wfReload={wfReload} next={next} has={has} setOpen={setOpen} onDecide={(n) => { setPreset(n); setOpen('advance'); }} />
              : tab === 'Cash flow' ? <CustomerCash c={c} role={role} rk={rk} onChanged={changed} recordOpen={recordOpen} setRecordOpen={setRecordOpen} />
              : tab === 'Docs' ? <CustomerDocs c={c} role={role} onChanged={changed} />
              : <Logs c={c} role={role} rk={rk} onChanged={changed} />}
          </>
        ) : null}
      </ScrollView>

      {cashBar ? (
        <View style={{ padding: space[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Btn label={cashBar.label} onPress={cashBar.run} />
        </View>
      ) : c && tab !== 'Cash flow' && (primary || wa || (tab === 'Progress' && has('moveBack'))) ? (
        <View style={{ flexDirection: 'row', gap: space[3], padding: space[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {tab === 'Progress' && has('moveBack') ? (
            <Btn label="Move back" variant="secondary" onPress={() => setOpen('moveBack')} style={{ flex: 1 }} />
          ) : wa ? (
            <Btn label="WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${wa}`)} style={{ flex: 1 }} />
          ) : null}
          {primary ? <Btn label={primary.label} onPress={primary.run} style={{ flex: 1.5 }} /> : null}
        </View>
      ) : null}

      {menu && c ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setMenu(false)} statusBarTranslucent>
          <Pressable accessibilityLabel="Close menu" onPress={() => setMenu(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <View style={{ position: 'absolute', top: 56, right: 12, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 6, minWidth: 210, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 }}>
              {can.editCustomer(role) ? <MenuItem label="Edit customer" onPress={() => { setMenu(false); edit(); }} /> : null}
              {can.assignAgent(role) ? <MenuItem label="Assign agent" onPress={() => { setMenu(false); soon('Assign agent'); }} /> : null}
              {has('reactivate') ? <MenuItem label="Reactivate customer" onPress={() => { setMenu(false); setOpen('reactivate'); }} /> : null}
              {has('cancel') ? <MenuItem label="Cancel customer" danger onPress={() => { setMenu(false); setOpen('cancel'); }} /> : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}

      {c && visitOpen ? (
        <ActionModal title="Field visit done?" intro={`Saved as visited today by ${user?.name ?? 'you'}.`} confirmLabel="Mark done"
          onConfirm={async () => { await markFieldVisitDone(api, c.id, { name: user?.name, emp_id: user?.emp_id, role: user?.role }); setVisitOpen(false); changed('Field visit marked done.'); }}
          onClose={() => setVisitOpen(false)} />
      ) : null}
      {c && open === 'advance' ? <AdvanceModal c={c} options={next} preset={preset} onClose={() => setOpen(null)} onDone={done('Status updated.')} /> : null}
      {c && open === 'moveBack' ? <MoveBackModal c={c} wf={wf} onClose={() => setOpen(null)} onDone={done('Moved back.')} /> : null}
      {c && open === 'cancel' ? (
        <ActionModal title="Cancel this customer?" intro="The customer moves to Cancelled. An admin or manager can reactivate later."
          confirmLabel="Cancel customer" destructive confirmWord="CANCEL" textLabel="Reason" textRequired textPlaceholder="Why is this customer cancelled?"
          onConfirm={async (t) => { await A.cancelCustomer(api, c.id, t); done('Customer cancelled.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'reactivate' ? (
        <ActionModal title="Reactivate customer?" intro={`The customer goes back to ${statusLabel(c.cancelled_from_status as string | undefined) === 'New Customer' ? 'Lead Captured' : statusLabel(c.cancelled_from_status as string | undefined)}.`}
          confirmLabel="Reactivate" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.reactivateCustomer(api, c.id, t); done('Customer reactivated.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'requestCompletion' ? (
        <ActionModal title="Request project completion?" intro="An admin or manager will review it. The server checks that subsidy, referral and cash are all done."
          confirmLabel="Request completion" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.requestCompletion(api, c.id, t); done('Completion requested.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'review' ? (
        <ActionModal title="Approve completion?" intro="The project will be marked complete."
          confirmLabel="Approve" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.reviewCompletion(api, c.id, 'approve', t); done('Project marked complete.')(); }} onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'reject' ? (
        <ActionModal title="Send completion back?" intro="The requester will see your reason."
          confirmLabel="Send back" destructive textLabel="Reason" textRequired textPlaceholder="What is still missing?"
          onConfirm={async (t) => { await A.reviewCompletion(api, c.id, 'reject', t); done('Sent back.')(); }} onClose={() => setOpen(null)} />
      ) : null}
    </SafeAreaView>
  );
}

function MenuItem({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: space[4], opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontSize: font.body, color: danger ? colors.tone.problem.fg : colors.ink }}>{label}</Text>
    </Pressable>
  );
}


function Cell({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ width: '50%', paddingVertical: 6, paddingRight: space[2] }}>
      <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{label}</Text>
      <Text selectable style={{ fontSize: font.body, fontWeight: '500', color: colors.ink, marginTop: 1 }}>{value && String(value).trim() ? value : '–'}</Text>
    </View>
  );
}

function Panel({ title, action, onAction, bg = colors.surface, border = colors.ink, children }: { title: string; action?: string; onAction?: () => void; bg?: string; border?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: border, padding: space[4], marginBottom: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[2] }}>
        <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink }}>{title}</Text>
        {action ? (
          <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink, justifyContent: 'center' }}>
            <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.brand }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Overview({ c, rk, role, onLogs, onEdit, onVisit }: { c: Customer; rk: number; role?: string; onLogs: () => void; onEdit: () => void; onVisit: () => void }) {
  const { data: log } = useLoad(() => A.fetchTimeline(api, c.id), [c.id, rk]);
  const agent = c.assigned_agent_name || c.agent_name;
  const next = nextAction(c);
  const visitPending = !c.field_visit_done && c.status !== 'cancelled' && c.status !== 'project_complete';
  const recent = (log ?? []).slice(0, 2);
  const step = stepNumber(c.status);
  const notes = (log ?? []).filter((t) => A.isNote(t)).slice(0, 2);
  const wa = waNumber(c.phone);
  const mapQ = [place(c), c.village, c.district].filter(Boolean).join(' ');
  return (
    <>
      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
        {[
          ['Call', c.phone ? () => Linking.openURL(`tel:${c.phone}`) : null],
          ['WhatsApp', wa ? () => Linking.openURL(`https://wa.me/${wa}`) : null],
          ['Map', mapQ ? () => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(mapQ)}`) : null],
        ].map(([label, run]) => (
          <Pressable key={label as string} accessibilityRole="button" accessibilityLabel={`${label} customer`} disabled={!run} onPress={run as () => void}
            style={{ flex: 1, minHeight: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: run ? 1 : 0.4 }}>
            <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.ink }}>{label as string}</Text>
          </Pressable>
        ))}
      </View>
      {step ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink, padding: space[3], marginBottom: space[3] }}>
          <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.ink, marginBottom: space[2] }}>Step {step} of {STEP_COUNT} · {STEP_SHORT[step - 1]}</Text>
          <View style={{ flexDirection: 'row' }} accessibilityLabel={`Step ${step} of ${STEP_COUNT}`}>
            {STEP_SHORT.map((l, i) => (
              <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                  <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : i < step ? colors.brand : colors.border }} />
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i < step ? colors.brand : colors.surface, borderWidth: 1.5, borderColor: i < step ? colors.brand : colors.ink3 }} />
                  <View style={{ flex: 1, height: 2, backgroundColor: i === STEP_COUNT - 1 ? 'transparent' : i < step - 1 ? colors.brand : colors.border }} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 9, color: i + 1 === step ? colors.ink : colors.ink3, marginTop: 4, fontWeight: i + 1 === step ? '700' : '400' }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Panel title="Details" action={can.editCustomer(role) ? 'Edit' : undefined} onAction={onEdit}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Cell label="Phone" value={c.phone} />
          <Cell label="City" value={place(c)} />
          <Cell label="DISCOM" value={c.discom as string | null} />
          <Cell label="Lead source" value={sourceLabel(c.lead_source)} />
          <Cell label="Agent" value={agent} />
          <Cell label="Roof" value={(c.roof_type as string | null) ?? null} />
          <Cell label="Quotation" value={c.quotation_value ? inr(c.quotation_value) : null} />
          <Cell label="Payment" value={c.payment_method ? String(c.payment_method).replace(/_/g, ' ') : null} />
        </View>
      </Panel>
      {visitPending ? (
        <Panel title="Field visit pending" action={can.editCustomer(role) ? 'Mark done' : undefined} onAction={onVisit} bg={colors.peach} border={colors.peach}>
          <Text style={{ fontSize: font.small, color: colors.peachInk }}>Required before install</Text>
        </Panel>
      ) : null}
      <Panel title="Last activity" action="All logs" onAction={onLogs} bg={colors.tileGreen} border={colors.tileGreen}>
        {recent.length ? recent.map((t) => (
          <Text key={t.id} numberOfLines={1} style={{ fontSize: font.small, color: colors.ink, paddingVertical: 2 }}>{t.action} · {dateShort(t.created_at)}</Text>
        )) : <Text style={{ fontSize: font.small, color: colors.ink2 }}>Nothing yet.</Text>}
      </Panel>
      <Panel title="Notes" action="+ Add" onAction={onLogs} bg={colors.tileGrey} border={colors.tileGrey}>
        {notes.length ? notes.map((t) => (
          <Text key={t.id} numberOfLines={2} style={{ fontSize: font.small, color: colors.ink, paddingVertical: 2 }}>{t.action}</Text>
        )) : <Text style={{ fontSize: font.small, color: colors.ink2 }}>No notes yet</Text>}
      </Panel>
      <Text style={{ fontSize: font.caption, color: colors.ink3 }}>Next: {next.text}</Text>
    </>
  );
}

function Progress({ c, role, onDocs, showLoan, wf, wfError, wfLoading, wfReload, next, has, setOpen, onDecide }: {
  c: Customer; role?: string; onDocs: () => void; showLoan: boolean; wf: A.Workflow | null; wfError: string | null; wfLoading: boolean; wfReload: () => void;
  next: string[]; has: (a: ActionKey) => boolean; setOpen: (o: Open) => void; onDecide: (status: string) => void;
}) {
  const cancelled = c.status === 'cancelled';
  const bank = c.loan_bank || c.loan_bank_name || null;
  const amount = Number(c.loan_amount) > 0 ? c.loan_amount : null;
  const sanctioned = Number(c.sanctioned_amount) > 0 ? c.sanctioned_amount : null;
  const disbursed = Number(c.amount_disbursed || c.disbursed_amount) > 0 ? (c.amount_disbursed || c.disbursed_amount) : null;
  const hasLoan = !!(bank || amount || sanctioned || disbursed || c.loan_application_no);
  const inline = next.slice(0, 2);

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
      {has('review') ? (
        <View style={{ gap: space[2], marginBottom: space[3] }}>
          <Btn label="Approve completion" onPress={() => setOpen('review')} />
          <Btn label="Send completion back" variant="secondary" onPress={() => setOpen('reject')} />
        </View>
      ) : null}
      {has('requestCompletion') && c.status !== 'subsidy_credited' ? (
        <Btn label="Request completion" variant="secondary" onPress={() => setOpen('requestCompletion')} style={{ marginBottom: space[3] }} />
      ) : null}

      {error_or_loading(wfError, wfLoading, wf, wfReload)}
      {wf ? (
        <View>
          {wf.steps.map((s, i) => {
            const isDone = !cancelled && s.state === 'done';
            const isCur = !cancelled && s.state === 'current';
            const problem = isCur && c.status === 'loan_rejected';
            const last = i === wf.steps.length - 1;
            return (
              <View key={s.key} style={{ flexDirection: 'row' }} accessible={!isCur} accessibilityLabel={`${s.label}, ${isDone ? 'done' : isCur ? 'current' : 'not started'}`}>
                <View style={{ alignItems: 'center', width: 32 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, marginTop: 8,
                    backgroundColor: isDone ? colors.brand : colors.surface,
                    borderWidth: isDone ? 0 : 2, borderColor: problem ? colors.tone.problem.fg : isCur ? colors.brand : colors.ink3,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone ? <Ionicons name="checkmark" size={15} color={colors.white} />
                      : null}
                  </View>
                  {!last ? <View style={{ flex: 1, width: 2, minHeight: 20, backgroundColor: isDone ? colors.brand : colors.border }} /> : null}
                </View>
                <View style={{ flex: 1, paddingLeft: space[2], paddingBottom: space[3], paddingTop: 6 }}>
                  {isCur ? (
                    <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[3] }}>
                      <Text style={{ fontSize: font.lead, fontWeight: '700', color: colors.white }}>{s.label}</Text>
                      <Text style={{ fontSize: font.small, color: problem ? '#fca5a5' : colors.mint, marginTop: 4 }}>Now: {statusLabel(c.status)}</Text>
                      {has('advance') && inline.length ? (
                        <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
                          {next.length <= 2 ? inline.map((n, k) => (
                            <Pressable key={n} accessibilityRole="button" accessibilityLabel={statusLabel(n)} onPress={() => onDecide(n)}
                              style={{ flex: 1, minHeight: MIN_TAP, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: k === inline.length - 1 ? colors.mint : 'transparent', borderWidth: 1, borderColor: colors.mint, paddingHorizontal: 8 }}>
                              <Text numberOfLines={1} style={{ fontWeight: '700', color: k === inline.length - 1 ? colors.mintInk : colors.white, fontSize: font.small }}>{shortStatus(n)}</Text>
                            </Pressable>
                          )) : (
                            <Pressable accessibilityRole="button" accessibilityLabel="Choose next step" onPress={() => setOpen('advance')}
                              style={{ flex: 1, minHeight: MIN_TAP, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }}>
                              <Text style={{ fontWeight: '700', color: colors.mintInk, fontSize: font.small }}>Choose next step</Text>
                            </Pressable>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={{ fontSize: font.body, fontWeight: isDone ? '600' : '500', color: isDone ? colors.ink : colors.ink2, paddingTop: 3 }}>{s.label}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {wf && !cancelled && can.sitePhotos(role) ? (
        <Panel title="Site photos · GPS tagged" action="Open" onAction={onDocs} bg={colors.tileGrey} border={colors.tileGrey}>
          <Text style={{ fontSize: font.small, color: colors.ink2 }}>
            {c.installation_id ? `${Number(c.photos_uploaded ?? 0)} of 8 uploaded${c.gps_verified ? ' · GPS verified' : ''}` : 'No installation scheduled yet.'}
          </Text>
        </Panel>
      ) : null}

      {wf && hasLoan && showLoan ? (
        <Panel title="Loan">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Cell label="Bank" value={bank} />
            <Cell label="Application no." value={c.loan_application_no as string | null} />
            <Cell label="Loan amount" value={amount ? inr(amount) : null} />
            <Cell label="Sanctioned" value={sanctioned ? inr(sanctioned) : null} />
            <Cell label="Disbursed" value={disbursed ? inr(disbursed) : null} />
            <Cell label="2nd disbursal" value={Number(c.second_disbursal_amount) > 0 ? inr(c.second_disbursal_amount) : null} />
          </View>
        </Panel>
      ) : null}
    </>
  );
}

function error_or_loading(error: string | null, loading: boolean, wf: A.Workflow | null, reload: () => void) {
  if (error && !wf) {
    return (<><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>);
  }
  if (loading && !wf) return <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading steps…</Text>;
  return null;
}

const ACTION_LABEL: Record<ActionKey, string> = {
  advance: 'Move to next step', moveBack: 'Move back', cancel: 'Cancel customer', reactivate: 'Reactivate customer',
  requestCompletion: 'Request completion', review: 'Review completion',
};

function AdvanceModal({ c, options, preset, onClose, onDone }: { c: Customer; options: string[]; preset?: string | null; onClose: () => void; onDone: () => void }) {
  const [pick, setPick] = useState<string | null>(preset && options.includes(preset) ? preset : options.length === 1 ? options[0] : null);
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

function Logs({ c, role, rk, onChanged }: { c: Customer; role?: string; rk: number; onChanged: (msg: string) => void }) {
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
          
          <Field label="Note" value={text} onChangeText={(t) => { setText(t); if (err) setErr(null); }} multiline numberOfLines={3} textAlignVertical="top" maxLength={2000} placeholder="Write a note for this customer" error={err ?? undefined} editable={!busy} />
          <Btn label="Add note" onPress={add} loading={busy} disabled={busy} />
        </>
      ) : null}
      <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink, marginTop: space[4], marginBottom: space[2] }}>Activity log</Text>
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
