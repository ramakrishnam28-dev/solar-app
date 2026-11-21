import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ChipSelect } from '@/components/form';
import { FormScreen, Section } from '@/components/form-screen';
import { Banner, Btn, Field, Screen } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { can } from '@/lib/actions';
import { ApiError } from '@/lib/api';
import { ROOF_TYPES } from '@/lib/customer-form';
import { fetchCustomer, type Customer } from '@/lib/customers';
import { DISCOMS, GRIDS, PHASES, kycDuplicates, kycFrom, kycPayload, validateKyc, type KycErrors, type KycForm } from '@/lib/kyc';
import { api } from '@/state/api';
import { bumpData } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

/** KYC & project details: the website's New Customer step 2 (Aadhaar, PAN, bank, project, DISCOM, field visit). */
export default function KycScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { data, error, reload } = useLoad(() => fetchCustomer(api, String(id)), [id]);
  if (!can.editCustomer(user?.role)) return <Screen><Banner>Your role cannot edit KYC details.</Banner><Btn label="Close" variant="secondary" onPress={() => router.back()} /></Screen>;
  if (error && !data) return <Screen><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></Screen>;
  if (!data) return <Screen><Text style={{ color: colors.ink3, fontSize: font.body }}>Loading customer…</Text></Screen>;
  return <KycForm_ c={data} />;
}

function KycForm_({ c }: { c: Customer }) {
  const { user } = useSession();
  const [f, setF] = useState<KycForm>(() => kycFrom(c));
  const [errors, setErrors] = useState<KycErrors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const onFile = !!c.aadhaar_masked;
  const set = (k: keyof KycForm) => (v: string) => { setF((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));

  const save = async () => {
    const e = validateKyc(f, onFile); setErrors(e);
    if (Object.keys(e).length) { setMsg('Some fields need fixing.'); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true); setMsg(null);
    try {
      const dup = await kycDuplicates(api, c.id, f);
      if (dup) { setMsg(dup); return; }
      await api.patch(`/customers/${encodeURIComponent(c.id)}`, kycPayload(f, { name: user?.name, emp_id: user?.emp_id, role: user?.role }));
      bumpData();
      router.back();
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'Failed to save, please try again'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <FormScreen title="KYC & project details" sub={`${c.name}${c.project_id ? ' · ' + c.project_id : ''}`} bottom={<Btn label="Save KYC" onPress={save} loading={busy} disabled={busy} style={{ flex: 1 }} />}>
      {msg ? <Banner>{msg}</Banner> : null}
      <Section title="KYC">
        <Field label={onFile ? `Aadhaar (on file: ${c.aadhaar_masked}). Type to replace` : 'Aadhaar *'} value={f.aadhaar} onChangeText={(t) => set('aadhaar')(t.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1-'))} keyboardType="number-pad" placeholder="XXXX-XXXX-XXXX" error={errors.aadhaar} />
        <Field label="PAN *" value={f.pan} onChangeText={(t) => set('pan')(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} autoCapitalize="characters" placeholder="ABCDE1234F" error={errors.pan} />
        <Field label="Electricity consumer number" value={f.consumer_number} onChangeText={set('consumer_number')} autoCapitalize="characters" />
        <ChipSelect label="DISCOM" options={opts(DISCOMS)} value={f.company} onChange={set('company')} />
      </Section>
      <Section title="Bank account">
        <Field label="Account number" value={f.bank_account} onChangeText={(t) => set('bank_account')(t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <Field label="IFSC" value={f.bank_ifsc} onChangeText={(t) => set('bank_ifsc')(t.toUpperCase().replace(/\s/g, '').slice(0, 11))} autoCapitalize="characters" error={errors.bank_ifsc} />
        <Field label="Bank name" value={f.bank_name} onChangeText={set('bank_name')} />
        <Field label="Branch" value={f.bank_branch} onChangeText={set('bank_branch')} />
        <Field label="Account holder" value={f.account_holder} onChangeText={(t) => set('account_holder')(t.toUpperCase())} autoCapitalize="characters" placeholder="Same as full name" />
      </Section>
      <Section title="Project">
        <Field label="System size (kW) *" value={f.system_kw} onChangeText={set('system_kw')} keyboardType="decimal-pad" error={errors.system_kw} placeholder="e.g. 3" />
        <Field label="Monthly bill (₹)" value={f.monthly_bill} onChangeText={set('monthly_bill')} keyboardType="number-pad" />
        <Field label="Sanctioned load (kW)" value={f.sanctioned_load} onChangeText={set('sanctioned_load')} keyboardType="decimal-pad" placeholder="5" />
        <Field label="Shadow-free area (sq.m)" value={f.shadow_free_area} onChangeText={set('shadow_free_area')} keyboardType="decimal-pad" placeholder="40" />
        <ChipSelect label="Roof" options={opts(ROOF_TYPES)} value={f.roof_type} onChange={set('roof_type')} />
        <ChipSelect label="Phase" options={opts(PHASES)} value={f.phase_type} onChange={set('phase_type')} />
        <ChipSelect label="Grid" options={opts(GRIDS)} value={f.grid_type} onChange={set('grid_type')} />
        <ChipSelect label="Existing solar" options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} value={f.existing_solar} onChange={(v) => set('existing_solar')(v)} />
        {f.existing_solar === 'yes' ? <Field label="Existing solar (kW)" value={f.existing_solar_kw} onChangeText={set('existing_solar_kw')} keyboardType="decimal-pad" /> : null}
      </Section>
      <Section title="Field visit">
        <ChipSelect label={`Field visit done? (saved as done by ${user?.name ?? 'you'}, today)`} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} value={f.field_visit} onChange={(v) => set('field_visit')(v)} />
      </Section>
    </FormScreen>
  );
}
