import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ChipSelect, ReviewRow, StepHeader, panel } from '@/components/form';
import { Banner, Btn, Field } from '@/components/ui';
import { MIN_TAP, colors, font, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import {
  CATEGORIES, LEAD_SOURCES, ROOF_TYPES, checkDuplicatePhone, createCustomer, digits, phoneDigits, emptyForm, formFrom, sourceLabel,
  updateCustomer, validateContact, validateSite, type CustomerForm, type Duplicate, type Errors,
} from '@/lib/customer-form';
import type { Customer } from '@/lib/customers';
import { api } from '@/state/api';
import { bumpData } from '@/state/dataVersion';

const STEPS = ['Customer', 'Site & system', 'Review'];

/** New customer (3 steps) and Edit customer (same fields, one Save). */
export function CustomerFormScreen({ existing }: { existing?: Customer }) {
  const editing = !!existing;
  const [f, setF] = useState<CustomerForm>(() => (existing ? formFrom(existing) : emptyForm()));
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [dup, setDup] = useState<Duplicate | null>(null);
  const [dupOk, setDupOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);

  const set = (k: keyof CustomerForm) => (v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // look for the same phone number once 10 digits are typed
  const phone = digits(f.phone);
  useEffect(() => {
    setDup(null); setDupOk(false);
    if (phone.length !== 10 || (existing && digits(String(existing.phone ?? '')) === phone)) return;
    let live = true;
    const t = setTimeout(() => {
      checkDuplicatePhone(api, phone, existing?.id).then((d) => { if (live) setDup(d); }).catch(() => {});
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [phone, existing]);

  const top = () => scroll.current?.scrollTo({ y: 0, animated: true });

  const next = () => {
    const e = step === 1 ? validateContact(f) : validateSite(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step === 1 && dup && !dupOk) return;
    setStep(step + 1); top();
  };

  const save = async () => {
    const e = { ...validateContact(f), ...validateSite(f) };
    setErrors(e);
    if (Object.keys(e).length) { setError('Some fields need fixing.'); return; }
    if (dup && !dupOk) { setError('This phone number already belongs to another customer.'); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (editing && existing) {
        const r = await updateCustomer(api, existing.id, existing, f);
        bumpData();
        if (router.canGoBack()) router.back(); else router.replace({ pathname: '/customer/[id]', params: { id: existing.id } });
        if (r.unchanged) return;
      } else {
        const c = await createCustomer(api, f);
        bumpData();
        router.replace({ pathname: '/customer/[id]', params: { id: c.id, tab: 'Progress', created: c.followUpFailed ? 'partial' : '1' } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try again.');
      lock.current = false; setBusy(false);
    }
  };

  const contact = (
    <>
      <Field label="Customer name" value={f.name} onChangeText={set('name')} error={errors.name} autoCapitalize="words" placeholder="As on Aadhaar" />
      <Field label="Phone" value={f.phone} onChangeText={(t) => set('phone')(phoneDigits(t))} error={errors.phone} keyboardType="phone-pad" placeholder="10 digits" />
      {dup ? (
        <View style={{ backgroundColor: colors.peach, borderRadius: 12, padding: space[3], marginTop: -space[2], marginBottom: space[4] }} accessibilityRole="alert">
          <Text style={{ color: colors.peachInk, fontWeight: '700', fontSize: font.body }}>Already a customer</Text>
          <Text style={{ color: colors.peachInk, fontSize: font.small, marginTop: 2 }}>{dup.name}{dup.project_id ? ` · ${dup.project_id}` : ''} has this phone number.</Text>
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2] }}>
            <Btn label="Open customer" variant="secondary" onPress={() => router.push({ pathname: '/customer/[id]', params: { id: dup.id } })} style={{ flex: 1 }} />
            {!dupOk ? <Btn label="Continue anyway" variant="ghost" onPress={() => setDupOk(true)} style={{ flex: 1 }} /> : null}
          </View>
          {dupOk ? <Text style={{ color: colors.peachInk, fontSize: font.caption, marginTop: 6 }}>OK, a second customer will use this number.</Text> : null}
        </View>
      ) : null}
      <Field label="WhatsApp (optional)" value={f.whatsapp} onChangeText={(t) => set('whatsapp')(phoneDigits(t))} error={errors.whatsapp} keyboardType="phone-pad" placeholder="Same as phone if empty" />
      <Field label="Father's name (optional)" value={f.father_name} onChangeText={set('father_name')} autoCapitalize="words" />
      <Field label="Email (optional)" value={f.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
    </>
  );

  const site = (
    <>
      <Field label="Village" value={f.village} onChangeText={set('village')} autoCapitalize="words" />
      <Field label="Mandal" value={f.mandal} onChangeText={set('mandal')} autoCapitalize="words" />
      <Field label="District" value={f.district} onChangeText={set('district')} autoCapitalize="words" />
      <Field label="City / town" value={f.city} onChangeText={set('city')} error={errors.city} autoCapitalize="words" />
      <Field label="Pincode (optional)" value={f.pincode} onChangeText={(t) => set('pincode')(digits(t).slice(0, 6))} error={errors.pincode} keyboardType="number-pad" maxLength={6} />
      <Field label="Electricity consumer number (optional)" value={f.consumer_number} onChangeText={set('consumer_number')} autoCapitalize="characters" />
      <Field label="System size in kW (optional)" value={f.system_kw} onChangeText={set('system_kw')} error={errors.system_kw} keyboardType="decimal-pad" placeholder="e.g. 3" />
      <Field label="Monthly bill in ₹ (optional)" value={f.monthly_bill} onChangeText={set('monthly_bill')} error={errors.monthly_bill} keyboardType="number-pad" />
      {editing ? null : <ChipSelect label="Category" options={CATEGORIES} value={f.category} onChange={(v) => set('category')(v || 'residential')} />}
      <ChipSelect label="Roof" options={ROOF_TYPES.map((r) => ({ value: r, label: r }))} value={f.roof_type} onChange={set('roof_type')} />
      <ChipSelect label="Lead source" options={LEAD_SOURCES} value={f.lead_source} onChange={(v) => set('lead_source')(v || 'walk_in')} />
      {f.lead_source === 'referral' ? (
        <>
          <Field label="Referred by" value={f.referrer_name} onChangeText={set('referrer_name')} error={errors.referrer_name} autoCapitalize="words" />
          <Field label="Referrer phone" value={f.referrer_phone} onChangeText={(t) => set('referrer_phone')(phoneDigits(t))} error={errors.referrer_phone} keyboardType="phone-pad" />
        </>
      ) : null}
    </>
  );

  const review = (
    <>
      <View style={panel}>
        <Text style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink, marginBottom: space[2] }}>Check before saving</Text>
        <ReviewRow label="Name" value={f.name} />
        <ReviewRow label="Phone" value={f.phone} />
        <ReviewRow label="WhatsApp" value={f.whatsapp || f.phone} />
        <ReviewRow label="Place" value={[f.village, f.mandal, f.district, f.city].filter((x) => x.trim()).join(', ')} />
        <ReviewRow label="System" value={f.system_kw ? `${f.system_kw} kW` : ''} />
        <ReviewRow label="Roof" value={f.roof_type} />
        <ReviewRow label="Lead source" value={sourceLabel(f.lead_source)} />
        {f.lead_source === 'referral' ? <ReviewRow label="Referred by" value={`${f.referrer_name} · ${f.referrer_phone}`} /> : null}
      </View>
      <Field label="Notes (optional)" value={f.notes} onChangeText={set('notes')} multiline numberOfLines={3} textAlignVertical="top" maxLength={2000} placeholder="Anything the team should know" />
      <Text style={{ fontSize: font.small, color: colors.ink2, marginBottom: space[3] }}>
        Next you can add Aadhaar, PAN, bank passbook and the electricity bill with the camera.
      </Text>
    </>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingVertical: space[2], backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Close' : step > 1 ? 'Previous step' : 'Close'}
          onPress={() => (!editing && step > 1 ? (setStep(step - 1), top()) : router.back())}
          style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={!editing && step > 1 ? 'arrow-back' : 'close'} size={24} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, marginLeft: 4, fontSize: font.title, fontWeight: '600', color: colors.ink }}>{editing ? 'Edit customer' : 'New customer'}</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">
          {editing ? null : <StepHeader step={step} steps={STEPS} />}
          {error ? <Banner>{error}</Banner> : null}
          {editing ? <>{contact}{site}<Field label="Notes" value={f.notes} onChangeText={set('notes')} multiline numberOfLines={3} textAlignVertical="top" maxLength={2000} /></>
            : step === 1 ? contact : step === 2 ? site : review}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: space[3], padding: space[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {!editing && step > 1 ? <Btn label="Back" variant="secondary" onPress={() => { setStep(step - 1); top(); }} style={{ flex: 1 }} /> : null}
          {editing ? <Btn label="Save changes" onPress={save} loading={busy} disabled={busy} style={{ flex: 1 }} />
            : step < 3 ? <Btn label="Next" onPress={next} disabled={step === 1 && !!dup && !dupOk} style={{ flex: 1.5 }} />
            : <Btn label="Create customer" onPress={save} loading={busy} disabled={busy} style={{ flex: 1.5 }} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
