import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { VALID_TRANSITIONS, STATUS_RANK, LOAN_STEPS, CASH_STEPS, nextStatuses } from '../rules';
import { can, availableActions, reasonError } from '../actions';
import * as A from '../actions-api';

const backend = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend-rules.json'), 'utf8'));

test('app rules are identical to the backend files', () => {
  assert.deepEqual(VALID_TRANSITIONS, backend.VALID_TRANSITIONS);
  assert.deepEqual(STATUS_RANK, backend.STATUS_RANK);
  assert.deepEqual(LOAN_STEPS, backend.LOAN_STEPS);
  assert.deepEqual(CASH_STEPS, backend.CASH_STEPS);
});

test('nextStatuses: no cancel, no project_complete, server order, cash hides loan steps', () => {
  assert.deepEqual(nextStatuses('lead_captured'), ['onboarded', 'pmsg_pending']);
  assert.deepEqual(nextStatuses('loan_applied'), ['loan_sanctioned', 'loan_rejected']);
  assert.deepEqual(nextStatuses('pmsg_registered', 'loan'), ['loan_ready', 'loan_applied', 'amount_disbursed', 'disbursed_full', 'installation_complete']);
  assert.deepEqual(nextStatuses('pmsg_registered', 'cash'), ['amount_disbursed', 'installation_complete']);
  assert.deepEqual(nextStatuses('subsidy_credited'), []);   // completion has its own button
  assert.deepEqual(nextStatuses('project_complete'), []);
  assert.deepEqual(nextStatuses('cancelled'), []);          // reactivate has its own button
  assert.deepEqual(nextStatuses('nonsense'), []);
  assert.deepEqual(nextStatuses(null), []);
});

test('role rules follow the server routes', () => {
  assert.ok(can.advance('sales_agent') && can.advance('loan_officer') && can.advance('admin') && can.advance('manager'));
  assert.ok(!can.advance('installer') && !can.advance('finance'));
  assert.ok(can.moveBack('manager') && !can.moveBack('sales_agent') && !can.moveBack('loan_officer'));
  assert.ok(can.cancel('sales_agent') && !can.cancel('installer') && !can.cancel('loan_officer') && !can.cancel('finance'));
  assert.ok(can.reactivate('admin') && !can.reactivate('sales_agent'));
  assert.ok(can.note('installer') && can.note('manager') && !can.note('inspector'));
  for (const f of Object.values(can)) assert.ok(f('builder'), 'builder passes every server role check');
  assert.ok(!can.advance(undefined));
});

test('availableActions by status and role', () => {
  const at = (status: string, role: string, extra = {}) => availableActions({ status, ...extra } as never, role);
  assert.deepEqual(at('loan_applied', 'sales_agent'), ['advance', 'cancel']);
  assert.deepEqual(at('loan_applied', 'manager'), ['advance', 'moveBack', 'cancel']);
  assert.deepEqual(at('loan_applied', 'installer'), []);
  assert.deepEqual(at('cancelled', 'admin'), ['reactivate']);
  assert.deepEqual(at('cancelled', 'sales_agent'), []);
  assert.deepEqual(at('project_complete', 'admin'), ['moveBack']);
  assert.deepEqual(at('project_complete', 'sales_agent'), []);
  assert.deepEqual(at('subsidy_credited', 'sales_agent'), ['requestCompletion', 'cancel']);
  assert.deepEqual(at('subsidy_credited', 'installer'), ['requestCompletion']);
  assert.deepEqual(at('subsidy_credited', 'manager', { completion_requested_at: '2026-11-01' }), ['review', 'moveBack', 'cancel']);
  assert.deepEqual(at('subsidy_credited', 'sales_agent', { completion_requested_at: '2026-11-01' }), ['cancel']);
});

test('reason needs 3 characters after trimming', () => {
  assert.ok(reasonError('') && reasonError('  a ') && reasonError('ab'));
  assert.equal(reasonError('abc'), null);
  assert.equal(reasonError('  abc  '), null);
});

test('API calls use the same paths and bodies as the website', async () => {
  const calls: [string, string, unknown][] = [];
  const f = (m: string) => async (p: string, b?: unknown) => { calls.push([m, p, b]); return {} as never; };
  const api = { get: f('GET'), post: f('POST'), patch: f('PATCH') } as never;
  await A.fetchWorkflow(api, 'c1'); await A.fetchTimeline(api, 'c1');
  await A.changeStatus(api, 'c1', 'onboarded'); await A.changeStatus(api, 'c1', 'onboarded', ' ok ');
  await A.moveBack(api, 'c1', 'lead_captured', ' wrong step '); await A.cancelCustomer(api, 'c1', ' customer left ');
  await A.reactivateCustomer(api, 'c1'); await A.reactivateCustomer(api, 'c1', 'back');
  await A.requestCompletion(api, 'c1'); await A.requestCompletion(api, 'c1', 'done');
  await A.reviewCompletion(api, 'c1', 'approve'); await A.reviewCompletion(api, 'c1', 'reject', ' no ');
  await A.addNote(api, 'c1', ' hello ');
  await A.fetchWorkflow(api, 'a/b');
  assert.deepEqual(calls, [
    ['GET', '/customers/c1/workflow', undefined], ['GET', '/customers/c1/timeline', undefined],
    ['PATCH', '/customers/c1/status', { status: 'onboarded' }], ['PATCH', '/customers/c1/status', { status: 'onboarded', note: 'ok' }],
    ['PATCH', '/customers/c1/move-back', { target_status: 'lead_captured', reason: 'wrong step' }],
    ['PATCH', '/customers/c1/cancel', { reason: 'customer left' }],
    ['PATCH', '/customers/c1/reactivate', {}], ['PATCH', '/customers/c1/reactivate', { note: 'back' }],
    ['POST', '/customers/c1/completion/request', {}], ['POST', '/customers/c1/completion/request', { note: 'done' }],
    ['PATCH', '/customers/c1/completion/review', { action: 'approve' }], ['PATCH', '/customers/c1/completion/review', { action: 'reject', note: 'no' }],
    ['POST', '/customers/c1/notes', { note: 'hello' }],
    ['GET', '/customers/a%2Fb/workflow', undefined],
  ]);
});

test('timeline helpers read notes and reasons, even when metadata is a string', () => {
  const t = (metadata: unknown) => ({ id: '1', action: 'x', created_at: '', metadata }) as never;
  assert.equal(A.isNote(t({ type: 'note' })), true);
  assert.equal(A.isNote(t('{"type":"note"}')), true);
  assert.equal(A.isNote(t({ reason: 'r' })), false);
  assert.equal(A.isNote(t(null)), false);
  assert.equal(A.timelineDetail(t({ reason: 'customer left' })), 'customer left');
  assert.equal(A.timelineDetail(t('{"note":"approved"}')), 'approved');
  assert.equal(A.timelineDetail(t({ type: 'note' })), '');
  assert.equal(A.timelineDetail(t('not json')), '');
});
