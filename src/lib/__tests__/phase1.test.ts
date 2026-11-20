import test from 'node:test';
import assert from 'node:assert/strict';
import { inr, dateShort, initials, place, kw } from '../format';
import { statusLabel, statusTone, stageIndex, STAGES } from '../status';
import { unwrapList, unwrapPagination, listPath, fetchCustomersPage } from '../customers';
import { computeKpis, computeOps } from '../dashboard';

test('inr groups like India', () => {
  assert.equal(inr(1234567), '₹12,34,567');
  assert.equal(inr(950), '₹950');
  assert.equal(inr(100000), '₹1,00,000');
  assert.equal(inr(0), '₹0');
  assert.equal(inr('250000'), '₹2,50,000');
  assert.equal(inr(null), '–');
  assert.equal(inr('abc'), '–');
  assert.equal(inr(-1500), '-₹1,500');
});
test('dates, initials, place, kw', () => {
  assert.equal(dateShort('2026-11-05T10:00:00Z'), '5 Nov 2026');
  assert.equal(dateShort(''), '–');
  assert.equal(dateShort('junk'), '–');
  assert.equal(initials('Ravi Kumar Reddy'), 'RK');
  assert.equal(initials(null), '?');
  assert.equal(place({ village: 'Pedana', district: 'Krishna' }), 'Pedana, Krishna');
  assert.equal(place({ city: 'Vijayawada' }), 'Vijayawada');
  assert.equal(kw('3'), '3 kW');
  assert.equal(kw(null), '');
});
test('status labels and tones', () => {
  assert.equal(statusLabel('loan_applied'), 'Loan: Applied');
  assert.equal(statusLabel('some_new_status'), 'some new status');
  assert.equal(statusLabel(null), 'New Customer');
  assert.equal(statusTone('cancelled'), 'inactive');
  assert.equal(statusTone('loan_rejected'), 'problem');
  assert.equal(statusTone('subsidy_awaited'), 'waiting');
  assert.equal(statusTone('project_complete'), 'done');
  assert.equal(statusTone('loan_applied'), 'progress');
  // later stages must never be grey
  for (const s of ['installation_complete', 'subsidy_credited', 'net_meter_installed']) assert.notEqual(statusTone(s), 'inactive');
});
test('stages cover every non-cancelled status exactly once', () => {
  const all = STAGES.flatMap((s) => s.statuses);
  assert.equal(new Set(all).size, all.length);
  assert.equal(stageIndex('loan_rejected'), 2);
  assert.equal(stageIndex('project_complete'), STAGES.length - 1);
  assert.equal(stageIndex('cancelled'), -1);
});
test('unwrap handles every list shape', () => {
  assert.equal(unwrapList({ data: [{ id: 'a' }] } as never).length, 1);
  assert.equal(unwrapList({ data: { customers: [{ id: 'a' }, { id: 'b' }] } } as never).length, 2);
  assert.equal(unwrapList({ data: { data: [{ id: 'a' }] } } as never).length, 1);
  assert.equal(unwrapList({ data: null } as never).length, 0);
  assert.equal(unwrapList(undefined).length, 0);
  assert.deepEqual(unwrapPagination({ data: [], pagination: { total: 42, totalPages: 3, page: 1, limit: 20 } } as never, 0), { total: 42, totalPages: 3 });
  assert.deepEqual(unwrapPagination({ data: { pagination: { total: 7, totalPages: 1 } } } as never, 0), { total: 7, totalPages: 1 });
  assert.deepEqual(unwrapPagination({ data: [] } as never, 5), { total: 5, totalPages: 1 });
});
test('list path matches the web app', () => {
  assert.equal(listPath({}), '/customers?page=1&limit=20&segment=active');
  assert.equal(listPath({ segment: 'all' }), '/customers?page=1&limit=20');
  assert.equal(listPath({ page: 3, search: ' ravi ', segment: 'completed' }), '/customers?page=3&limit=20&search=ravi&segment=completed');
});
test('fetchCustomersPage returns list and paging', async () => {
  const fake = { getPage: async (p: string) => { assert.ok(p.includes('page=2')); return { data: [{ id: '1', name: 'A' }], pagination: { total: 21, totalPages: 2, page: 2, limit: 20 } }; } };
  const r = await fetchCustomersPage(fake as never, { page: 2 });
  assert.equal(r.list.length, 1); assert.equal(r.total, 21); assert.equal(r.totalPages, 2); assert.equal(r.page, 2);
});
const C = (o: object) => ({ id: Math.random().toString(), name: 'x', ...o }) as never;
test('dashboard KPIs and ops', () => {
  const list = [
    C({ status: 'loan_applied' }), C({ status: 'loan_applied' }),
    C({ status: 'loan_sanctioned' }), C({ status: 'disbursed_full' }),
    C({ status: 'installation_complete', field_visit_done: true }),
    C({ status: 'project_complete', field_visit_done: true, discom_submission_date: '2026-01-01', consumer_app_installed: true, post_install_bank_docs_submitted: true, disbursed_amount: 5 }),
    C({ status: 'survey_completed' }),
  ];
  const [cust, loans, inst] = computeKpis(list, 7);
  assert.equal(cust.value, 7); assert.match(cust.note, /1 installed · 1 need a quotation/);
  assert.equal(loans.value, 2); assert.equal(loans.note, '2 awaiting bank approval'); assert.equal(loans.tone, 'warn');
  assert.equal(inst.value, 2); assert.equal(inst.note, '1 ready to install');
  const ops = Object.fromEntries(computeOps(list).map((o) => [o.id, o.count]));
  assert.equal(ops.R2, 2); assert.equal(ops.R3, 2); assert.equal(ops.R4, 1);
  assert.equal(ops.R5, 1);   // installation_complete with no disbursed_amount
  assert.equal(ops.R6, 1);   // installation_complete without discom date
  assert.equal(ops.R7, 1);
  assert.equal(ops.R13, 5);  // 7 customers, 2 with field visit done
  assert.equal(computeOps(list).length, 13);
});
