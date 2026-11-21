import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_PERMISSIONS, PAGE_KEYS, canAccess, tabsFor, type PageKey } from '../permissions';

const web = JSON.parse(readFileSync(new URL('./web-default-permissions.json', import.meta.url), 'utf8'));

test('default permissions are identical to the web app table (all 7 roles x 24 pages)', () => {
  assert.deepEqual(Object.keys(web).sort(), Object.keys(DEFAULT_PERMISSIONS).sort());
  for (const role of Object.keys(web)) {
    for (const page of PAGE_KEYS) {
      assert.equal((DEFAULT_PERMISSIONS as any)[role][page], web[role][page], `${role}.${page}`);
    }
    assert.deepEqual(Object.keys(web[role]).sort(), [...PAGE_KEYS].sort(), `${role} page list`);
  }
});

test('precedence: own override > server role permission > default > no access', () => {
  const b = { rolePerms: { sales_agent: { reports: 1, loans: 0 } }, userOverrides: { u1: { loans: 1, customers: 0 } } };
  assert.equal(canAccess('sales_agent', 'u1', 'loans', b), true);      // override beats server 0
  assert.equal(canAccess('sales_agent', 'u1', 'customers', b), false); // override beats default 1
  assert.equal(canAccess('sales_agent', 'u2', 'loans', b), false);     // server 0 beats default 1
  assert.equal(canAccess('sales_agent', 'u2', 'reports', b), true);    // server 1 beats default 0
  assert.equal(canAccess('sales_agent', 'u2', 'team', b), false);      // default 0
  assert.equal(canAccess('sales_agent', 'u2', 'customers', null), true);
  assert.equal(canAccess('ghost', 'u', 'dashboard', b), false);
  assert.equal(canAccess(undefined, 'u', 'dashboard', b), false);
});

test("another user's overrides never apply to me", () => {
  const b = { userOverrides: { other: { systemSettings: 1 } } };
  assert.equal(canAccess('admin', 'me', 'systemSettings', b), false);
});

test('tabs per role', () => {
  const t = (role: string) => tabsFor((p: PageKey) => canAccess(role, 'x', p, null), role);
  assert.deepEqual(t('builder'), ['home', 'customers', 'new', 'tasks', 'more']);
  assert.deepEqual(t('sales_agent'), ['home', 'customers', 'new', 'tasks', 'more']); // myLeads + loans
  assert.deepEqual(t('installer'), ['tasks', 'home', 'more']);                       // Tasks first, no customers/+
  assert.deepEqual(t('finance'), ['home', 'customers', 'tasks', 'more']);            // no newCustomer
  assert.deepEqual(t('loan_officer'), ['home', 'customers', 'tasks', 'more']);
});
