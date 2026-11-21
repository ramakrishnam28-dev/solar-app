import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionModal, Choice } from '@/components/action-modal';
import { CustomerCash } from '@/components/customer-cash';
import { CustomerDocs } from '@/components/customer-docs';
import { CustomerLogs } from '@/components/customer-logs';
import { Field as FormField } from '@/components/ui';
import { ProgressTab } from '@/components/progress';
import { Banner, Btn } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import * as A from '@/lib/actions-api';
import { ApiError } from '@/lib/api';
import { fetchAudit, catOf } from '@/lib/audit';
import { markFieldVisitDone, sourceLabel } from '@/lib/customer-form';
import { dateShort, dateTime, inr, kw } from '@/lib/format';
import { loadFullCustomer, type FullCustomer } from '@/lib/full-customer';
import { progressView } from '@/lib/progress-cards';
import { STEP_COUNT, STEP_SHORT, statusLabel, stepNumber } from '@/lib/status';
import { api } from '@/state/api';
import { bumpData } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

type Tab = 'Overview' | 'Progress' | 'Cash flow' | 'Docs' | 'Logs';
type Open = 'cancel' | 'reactivate' | 'moveBack' | 'visit' | 'assign' | null;

const waNumber = (phone?: string | null) => {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};
const PRIV = (r?: string) => !!r && ['admin', 'manager', 'builder'].includes(r);

export default function CustomerScreen() {
  const { id, tab: startTab, created } = useLocalSearchParams<{ id: string; tab?: string; created?: string }>();
  const { user } = useSession();
  const role = user?.role;
  const tabs: Tab[] = role === 'installer' ? ['Progress', 'Logs'] : ['Overview', 'Progress', 'Cash flow', 'Docs', 'Logs'];
  const [tab, setTab] = useState<Tab>(tabs.includes(startTab as Tab) ? (startTab as Tab) : tabs[0]);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const { data: c, error, loading, reload } = useLoad(() => loadFullCustomer(api, String(id), role), [id, role]);
  const [rk, setRk] = useState(0);
  const [flash, setFlash] = useState<string | null>(created === '1' ? 'Customer created. Complete KYC next.' : created === 'partial' ? "Customer created. Father's name or consumer number did not save; add them with Edit." : null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  const changed = (msg: string) => {
    bumpData(); setRk((n) => n + 1); reload();
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 5000);
  };
  const goTab = (t: Tab) => { setTab(t); scroll.current?.scrollTo({ y: 0, animated: false }); };

  const cancelled = c?.status === 'cancelled';
  const step = c ? stepNumber(c.status) : 0;
  const canCancel = !!c && !cancelled && c.status !== 'project_complete' && can.cancel(role);
  const canMoveBack = !!c && !cancelled && PRIV(role) && !['kyc_pending', 'lead_captured'].includes(String(c.status));
  const canReactivate = cancelled && can.reactivate(role);
  const menuItems = [
    ...(can.editCustomer(role) ? [{ label: 'Edit customer', run: () => router.push({ pathname: '/edit-customer/[id]', params: { id: String(id) } }) }] : []),
    ...(can.editCustomer(role) ? [{ label: 'KYC & project details', run: () => router.push({ pathname: '/kyc/[id]', params: { id: String(id) } }) }] : []),
    ...(role !== 'installer' ? [{ label: 'Deal calculator', run: () => router.push({ pathname: '/deal/[id]', params: { id: String(id) } }) }] : []),
    ...(can.assignAgent(role) ? [{ label: 'Assign agent', run: () => setOpen('assign') }] : []),
    ...(canMoveBack ? [{ label: 'Move back', run: () => setOpen('moveBack') }] : []),
    ...(canReactivate ? [{ label: 'Reactivate customer', run: () => setOpen('reactivate') }] : []),
    ...(canCancel ? [{ label: 'Cancel customer', danger: true, run: () => setOpen('cancel') }] : []),
  ];
  const wa = waNumber(c?.phone as string);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingVertical: space[2], backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace(role === 'installer' ? '/tasks' : '/customers'))} style={iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text numberOfLines={1} accessibilityRole="header" style={{ flex: 1, marginLeft: 4, fontSize: font.title, fontWeight: '600', color: colors.ink }}>{c?.name ?? 'Customer'}</Text>
        {c?.phone ? <Pressable accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} style={iconBtn}><Ionicons name="call-outline" size={22} color={colors.ink} /></Pressable> : null}
        {c && menuItems.length ? <Pressable accessibilityRole="button" accessibilityLabel="More actions" onPress={() => setMenu(true)} style={iconBtn}><Ionicons name="ellipsis-vertical" size={22} color={colors.ink} /></Pressable> : null}
      </View>

      {c ? (
        <View style={{ flexShrink: 0, backgroundColor: colors.surface, paddingHorizontal: space[4], paddingBottom: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
            <Text numberOfLines={2} style={{ flex: 1, fontSize: font.caption, color: colors.ink2 }}>{[c.project_id, kw(c.system_kw), statusLabel(c.status)].filter(Boolean).join(' · ')}</Text>
            <View style={{ backgroundColor: cancelled ? colors.tone.inactive.bg : '#e0ebff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: font.caption, fontWeight: '600', color: cancelled ? colors.tone.inactive.fg : '#1d4ed8' }}>{cancelled ? 'Cancelled' : step ? `${STEP_SHORT[step - 1]} · step ${step}/${STEP_COUNT}` : ''}</Text>
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
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => goTab(t)}
              style={{ flex: 1, minHeight: MIN_TAP + 4, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: on ? colors.brand : 'transparent' }}>
              <Text numberOfLines={1} style={{ fontSize: font.small, fontWeight: on ? '700' : '500', color: on ? colors.brand : colors.ink2 }}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">
        {error && !c ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
          : loading && !c ? <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading customer…</Text>
          : c ? (
            <>
              {flash ? <Banner tone="done">{flash}</Banner> : null}
              {cancelled ? <Banner tone="inactive">Cancelled{c.cancelled_by_name ? ` by ${c.cancelled_by_name}` : ''}{c.cancelled_at ? ` on ${dateShort(c.cancelled_at)}` : ''}.{c.cancel_reason ? ` Reason: ${c.cancel_reason}` : ''}</Banner> : null}
              {tab === 'Overview' ? <Overview c={c} role={role} rk={rk} goTab={goTab} onVisit={() => setOpen('visit')} onChanged={changed} />
                : tab === 'Progress' ? (cancelled ? <Text style={{ color: colors.ink2, fontSize: font.body }}>This customer is cancelled.{canReactivate ? ' Reactivate from the ⋮ menu to continue.' : ''}</Text> : <ProgressTab c={c} role={role} onChanged={changed} />)
                : tab === 'Cash flow' ? <CustomerCash c={c} role={role} />
                : tab === 'Docs' ? <CustomerDocs c={c} role={role} onChanged={changed} />
                : <CustomerLogs id={c.id} rk={rk} />}
              {tab === 'Progress' && canMoveBack ? (
                <View style={{ marginTop: space[4], padding: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                  <Text style={{ fontSize: font.small, color: colors.ink2, marginBottom: space[2] }}>Entered something by mistake? Move this customer back to an earlier step. Saved payments and records are never deleted.</Text>
                  <Btn label="Move back" variant="secondary" onPress={() => setOpen('moveBack')} />
                </View>
              ) : null}
            </>
          ) : null}
      </ScrollView>

      {c && (wa || (tab !== 'Progress' && !cancelled)) ? (
        <View style={{ flexDirection: 'row', gap: space[3], padding: space[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {wa ? <Btn label="WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${wa}`)} style={{ flex: 1 }} /> : null}
          {tab !== 'Progress' && !cancelled ? <Btn label="Update progress" onPress={() => goTab('Progress')} style={{ flex: 1.4 }} /> : null}
        </View>
      ) : null}

      {menu && c ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setMenu(false)} statusBarTranslucent>
          <Pressable accessibilityLabel="Close menu" onPress={() => setMenu(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <View style={{ position: 'absolute', top: 56, right: 12, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 6, minWidth: 220, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 }}>
              {menuItems.map((m) => (
                <Pressable key={m.label} accessibilityRole="button" accessibilityLabel={m.label} onPress={() => { setMenu(false); m.run(); }} style={({ pressed }) => ({ minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: space[4], opacity: pressed ? 0.6 : 1 })}>
                  <Text style={{ fontSize: font.body, color: 'danger' in m && m.danger ? colors.tone.problem.fg : colors.ink }}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      ) : null}

      {c && open === 'cancel' ? (
        <ActionModal title="Cancel this customer?" intro="The customer moves to Cancelled. An admin or manager can reactivate later."
          confirmLabel="Cancel customer" destructive confirmWord="CANCEL" textLabel="Reason" textRequired textPlaceholder="Why is this customer cancelled?"
          onConfirm={async (t) => { await A.cancelCustomer(api, c.id, t); setOpen(null); changed('Customer cancelled.'); }} onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'reactivate' ? (
        <ActionModal title="Reactivate customer?" intro={`The customer goes back to ${statusLabel((c.cancelled_from_status as string) || 'lead_captured')}.`}
          confirmLabel="Reactivate" textLabel="Note" textPlaceholder="Optional note"
          onConfirm={async (t) => { await A.reactivateCustomer(api, c.id, t); setOpen(null); changed('Customer reactivated.'); }} onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'moveBack' ? <MoveBackModal c={c} onClose={() => setOpen(null)} onDone={() => { setOpen(null); changed('Moved back.'); }} /> : null}
      {c && open === 'visit' ? (
        <ActionModal title="Field visit done?" intro={`Saved as visited today by ${user?.name ?? 'you'}.`} confirmLabel="Mark done"
          onConfirm={async () => { await markFieldVisitDone(api, c.id, { name: user?.name, emp_id: user?.emp_id, role: user?.role }); setOpen(null); changed('Field visit marked done.'); }}
          onClose={() => setOpen(null)} />
      ) : null}
      {c && open === 'assign' ? <AssignAgent c={c} onClose={() => setOpen(null)} onDone={() => { setOpen(null); changed('Team assignment saved.'); }} /> : null}
    </SafeAreaView>
  );
}
const iconBtn = { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' } as const;

function Cell({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <View style={{ width: wide ? '100%' : '50%', paddingVertical: 6, paddingRight: space[2] }}>
      <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{label}</Text>
      <Text selectable style={{ fontSize: font.body, fontWeight: '500', color: colors.ink, marginTop: 1 }}>{value && String(value).trim() ? value : '—'}</Text>
    </View>
  );
}

function Panel({ title, action, onAction, tone = 'plain', children }: { title: string; action?: string; onAction?: () => void; tone?: 'plain' | 'peach' | 'green' | 'grey'; children: React.ReactNode }) {
  const bg = tone === 'peach' ? colors.peach : tone === 'green' ? colors.tileGreen : tone === 'grey' ? colors.tileGrey : colors.surface;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.lg, borderWidth: tone === 'plain' ? 1.5 : 0, borderColor: colors.ink, padding: space[4], marginBottom: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[2], gap: space[2] }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: font.lead, fontWeight: '600', color: colors.ink }}>{title}</Text>
        {action ? (
          <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={{ minHeight: MIN_TAP, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink, justifyContent: 'center' }}>
            <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.brand }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Overview: the website's Customer Details, Field Visit, Next Action, Last Activity and Notes. */
function Overview({ c, role, rk, goTab, onVisit, onChanged }: { c: FullCustomer; role?: string; rk: number; goTab: (t: Tab) => void; onVisit: () => void; onChanged: (m: string) => void }) {
  const { data: log } = useLoad(() => fetchAudit(api, c.id).catch(() => []), [c.id, rk]);
  const address = [c.address, c.village, c.mandal, c.city, c.district, c.state, c.pincode ? 'PIN: ' + c.pincode : ''].filter(Boolean).join(', ');
  const next = c.status === 'cancelled' ? [] : progressView(c, role).cards.slice(0, 3);
  const qv = Number(c.dc_quotation_value || c.quotation_value || 0);
  const method = String(c.payment_method || c.dc_payment_method || '');
  return (
    <>
      <Panel title="Customer Details">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Cell label="Phone" value={c.phone as string} />
          <Cell label="Project ID" value={c.project_id} />
          <Cell label="Aadhaar" value={c.aadhaar_masked as string} />
          <Cell label="PAN" value={c.pan as string} />
          <Cell label="Electricity Bill No." value={c.consumer_number as string} />
          <Cell label="DISCOM" value={c.company as string} />
          <Cell label="System Size" value={kw(c.system_kw)} />
          <Cell label="Lead Source" value={sourceLabel(c.lead_source)} />
          <Cell label="Agent" value={(c.assigned_agent_name || c.agent_name) as string} />
          <Cell label="Payment" value={method ? method[0].toUpperCase() + method.slice(1) : null} />
          <Cell label="Quotation" value={qv ? inr(qv) : null} />
          <Cell label="Roof" value={c.roof_type as string} />
          {c.lead_source === 'referral' ? <Cell label="Referred by" value={[c.referrer_name, c.referrer_phone].filter(Boolean).join(' · ') as string} wide /> : null}
          <Cell label="Full Address" value={address} wide />
        </View>
        {address ? <Pressable accessibilityRole="button" accessibilityLabel="Open address in Maps" onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)} style={{ minHeight: MIN_TAP, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: font.small, color: colors.brand, fontWeight: '600' }}>📍 Open in Maps</Text>
        </Pressable> : null}
      </Panel>

      {c.field_visit_done === true ? (
        <Panel title="Field Visit" tone="green">
          <Text style={{ fontSize: font.small, color: colors.brand, fontWeight: '700' }}>Completed</Text>
          <Text style={{ fontSize: font.small, color: colors.ink, marginTop: 2 }}>
            {[c.field_visit_by_name, c.field_visit_by_emp_id, c.field_visit_by_role ? String(c.field_visit_by_role).replace(/_/g, ' ') : null, c.field_visit_date ? dateShort(c.field_visit_date) : null].filter(Boolean).join(' · ') || '—'}
          </Text>
        </Panel>
      ) : c.status !== 'cancelled' ? (
        <Panel title="Field Visit Pending" tone="peach" action={can.editCustomer(role) ? 'Mark done' : undefined} onAction={onVisit}>
          <Text style={{ fontSize: font.small, color: colors.peachInk }}>Required before installation</Text>
        </Panel>
      ) : null}

      {next.length ? (
        <Panel title="Next Action" tone="grey" action="Open Progress" onAction={() => goTab('Progress')}>
          {next.map((n) => <Text key={n.key} style={{ fontSize: font.body, color: colors.ink, paddingVertical: 2 }}>{n.icon ? n.icon + ' ' : '• '}{n.title}</Text>)}
        </Panel>
      ) : null}

      <Panel title="Last Activity" tone="green" action="View all" onAction={() => goTab('Logs')}>
        {(log ?? []).slice(0, 3).map((r, i) => (
          <Text key={r.id ?? i} numberOfLines={2} style={{ fontSize: font.small, color: colors.ink, paddingVertical: 2 }}>{catOf(r.category).icon} {r.action} · {dateTime(r.created_at)}</Text>
        ))}
        {log && !log.length ? <Text style={{ fontSize: font.small, color: colors.ink2 }}>Nothing yet.</Text> : null}
      </Panel>

      <NotesPanel c={c} role={role} onChanged={onChanged} />
    </>
  );
}

/** Notes: the customer's note (PATCH notes), same as the website's Notes tab. */
function NotesPanel({ c, role, onChanged }: { c: FullCustomer; role?: string; onChanged: (m: string) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const canNote = can.editCustomer(role);
  const save = async () => {
    if (!text.trim()) { setErr('Please type a note first'); return; }
    setBusy(true); setErr(undefined);
    try { await api.patch(`/customers/${encodeURIComponent(c.id)}`, { notes: text.trim() }); setText(''); onChanged('Note saved.'); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save the note.'); } finally { setBusy(false); }
  };
  return (
    <Panel title="Notes" tone="grey">
      <Text selectable style={{ fontSize: font.body, color: c.notes ? colors.ink : colors.ink2, marginBottom: canNote ? space[3] : 0 }}>{(c.notes as string) || 'No notes added yet.'}</Text>
      {canNote ? (
        <>
          <FormField label="Add a note (replaces the current note)" value={text} onChangeText={(t) => { setText(t); setErr(undefined); }} multiline numberOfLines={3} textAlignVertical="top" maxLength={2000} placeholder="Type your note here…" error={err} />
          <Btn label="Save Note" onPress={save} loading={busy} disabled={busy} />
        </>
      ) : null}
    </Panel>
  );
}

function MoveBackModal({ c, onClose, onDone }: { c: FullCustomer; onClose: () => void; onDone: () => void }) {
  const { data: wf } = useLoad(() => A.fetchWorkflow(api, c.id), [c.id]);
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

/** Assign agent (website openAssignModal): staff list from GET /users (admin only). */
function AssignAgent({ c, onClose, onDone }: { c: FullCustomer; onClose: () => void; onDone: () => void }) {
  const { data, error } = useLoad(async () => {
    const body = await api.getPage<unknown>('/users?limit=200&is_active=true');
    const d = body?.data as unknown;
    const list = (Array.isArray(d) ? d : (d as { users?: unknown[] })?.users ?? []) as { id: string; name: string; role: string; emp_id?: string }[];
    return list.filter((u) => ['sales_agent', 'manager', 'admin', 'super_admin'].includes(u.role));
  }, []);
  const [pick, setPick] = useState<string | null>((c.assigned_agent as string) ?? null);
  return (
    <ActionModal title="Assign agent" intro={`${c.name} · ${c.project_id ?? ''}`} confirmLabel="Save assignment" canConfirm={!!pick && pick !== c.assigned_agent}
      onConfirm={async () => { await api.patch(`/customers/${encodeURIComponent(c.id)}`, { assigned_agent: pick }); onDone(); }} onClose={onClose}>
      {error ? <Banner>{error}</Banner> : !data ? <Text style={{ color: colors.ink3 }}>Loading staff…</Text>
        : data.map((u) => <Choice key={u.id} label={`${u.name} (${u.emp_id || u.role})`} selected={pick === u.id} onPress={() => setPick(u.id)} />)}
    </ActionModal>
  );
}
