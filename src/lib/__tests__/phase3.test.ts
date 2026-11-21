import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPayload, changedKeys, emptyForm, phoneDigits, validateContact, validateSite } from '../customer-form';
import { docSlots, unwrapDocs } from '../docs';
import { loanTiles, slaLine, sortBySla, type Loan } from '../loans';
import { sortInstallations, taskGroups } from '../work';

test('new customer: contact and site checks match the server', () => {
  const f = { ...emptyForm(), name: 'A', phone: '12345' };
  const e = validateContact(f);
  assert.ok(e.name && e.phone);
  assert.deepEqual(validateContact({ ...f, name: 'Lakshmi', phone: '9876599887' }), {});
  assert.ok(validateSite({ ...emptyForm() }).city);
  assert.ok(validateSite({ ...emptyForm(), village: 'Pedana', pincode: '1234' }).pincode);
  assert.ok(validateSite({ ...emptyForm(), village: 'Pedana', system_kw: '-2' }).system_kw);
  assert.ok(validateSite({ ...emptyForm(), village: 'Pedana', lead_source: 'referral' }).referrer_phone);
  assert.deepEqual(validateSite({ ...emptyForm(), village: 'Pedana', system_kw: '3' }), {});
});

test('phone paste: +91 and leading 0 are dropped', () => {
  assert.equal(phoneDigits('+91 98765 99887'), '9876599887');
  assert.equal(phoneDigits('09876599887'), '9876599887');
  assert.equal(phoneDigits('98765-998'), '98765998');
});

test('payload: numbers typed, empty fields left out, WhatsApp defaults to phone', () => {
  const p = buildPayload({ ...emptyForm(), name: ' Lakshmi ', phone: '9876599887', village: 'Pedana', system_kw: '3', monthly_bill: '' });
  assert.equal(p.name, 'Lakshmi');
  assert.equal(p.whatsapp, '9876599887');
  assert.equal(p.city, 'Pedana');
  assert.equal(p.system_kw, 3);
  assert.equal('monthly_bill' in p, false);
  assert.equal('email' in p, false);
  assert.equal('referrer_name' in p, false);
  assert.deepEqual(changedKeys({ city: 'Pedana', system_kw: '3' }, { city: 'Pedana', system_kw: 3, mandal: 'M' }), { mandal: 'M' });
});

test('documents: 8 slots, states from server rows', () => {
  const s = docSlots(unwrapDocs({ documents: [{ id: 'd1', doc_type: 'pan', status: 'verified', has_file: true }, { id: 'd2', doc_type: 'aadhaar', status: 'pending', has_file: false }] }));
  assert.equal(s.length, 8);
  assert.equal(s.find((x) => x.key === 'pan')!.state, 'verified');
  assert.equal(s.find((x) => x.key === 'aadhaar')!.state, 'missing');
  assert.equal(unwrapDocs(null).length, 0);
});

test('loan tracker: overdue first, tiles, SLA line', () => {
  const loans: Loan[] = [
    { id: 'a', status: 'disbursed', disbursed_amount: 1 },
    { id: 'b', status: 'under_review', sla_days: 10, days_elapsed: 3, sla_days_left: 7, submitted_at: 'x' },
    { id: 'c', status: 'applied', sla_days: 7, days_elapsed: 18, sla_days_left: -11, submitted_at: 'x' },
  ];
  assert.deepEqual(sortBySla(loans).map((l) => l.id), ['c', 'b', 'a']);
  assert.deepEqual(loanTiles(loans), { pastSla: 1, inReview: 1, disbursed: 1 });
  assert.deepEqual(slaLine(loans[2]), { text: 'Day 18 of 7', fill: 1, over: true });
  assert.equal(slaLine(loans[1]).text, '7 days left');
});

test('tasks: groups by next action, installations open first', () => {
  const g = taskGroups([
    { id: '1', name: 'a', status: 'lead_captured', field_visit_done: false },
    { id: '2', name: 'b', status: 'loan_applied', field_visit_done: true },
    { id: '3', name: 'c', status: 'installation_complete', field_visit_done: true },
    { id: '4', name: 'd', status: 'cancelled' },
  ]);
  assert.deepEqual(g.map((x) => x.title), ['Field visit pending', 'Update loan decision']);
  assert.deepEqual(taskGroups([{ id: '2', name: 'b', status: 'loan_applied' }, { id: '5', name: 'e', status: 'kyc_pending' }], 'loan_officer').map((x) => x.items.length), [1]);
  assert.deepEqual(sortInstallations([
    { id: 'x', customer_id: '1', status: 'completed' }, { id: 'y', customer_id: '2', status: 'scheduled', scheduled_date: '2026-12-01' },
    { id: 'z', customer_id: '3', status: 'in_progress' },
  ]).map((i) => i.id), ['z', 'y', 'x']);
});

import { formFrom, updateCustomer } from '../customer-form';

test('edit: unchanged customer sends nothing, numbers compared as numbers', async () => {
  const before = { id: 'c1', name: 'Anjali Devi', phone: '9876510001', whatsapp: null, city: null, village: 'Pedana', system_kw: '3.00', lead_source: null, email: null };
  const sent: unknown[] = [];
  const fake = { patch: async (_p: string, b: unknown) => { sent.push(b); return {}; } };
  const r = await updateCustomer(fake as never, 'c1', before, formFrom(before));
  assert.deepEqual(r, { unchanged: true });
  assert.equal(sent.length, 0);
  const f = formFrom(before); f.mandal = 'Machilipatnam'; f.system_kw = '4';
  await updateCustomer(fake as never, 'c1', before, f);
  assert.deepEqual(sent[0], { mandal: 'Machilipatnam', system_kw: 4 });
});
