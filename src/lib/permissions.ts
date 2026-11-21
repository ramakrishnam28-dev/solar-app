/**
 * Page permissions. Mirrors the web app: individual override > role permission from the
 * server > built-in default > no access.
 */
export const PAGE_KEYS = [
  'dashboard', 'newCustomer', 'customers', 'loans', 'installations', 'documents', 'finance',
  'disbursements', 'bom', 'quotation', 'reconciliation', 'cityAnalytics', 'reports', 'team',
  'profile', 'controlPanel', 'systemSettings', 'myLeads', 'netMeter', 'subsidyTracker',
  'referralEngine', 'amcService', 'assets', 'landingInbox',
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export type PermMap = Partial<Record<PageKey, number | boolean>>;

export type Role = 'builder' | 'admin' | 'manager' | 'sales_agent' | 'installer' | 'finance' | 'loan_officer';

const row = (on: PageKey[]): Record<PageKey, 0 | 1> =>
  Object.fromEntries(PAGE_KEYS.map((k) => [k, on.includes(k) ? 1 : 0])) as Record<PageKey, 0 | 1>;

const ALL = [...PAGE_KEYS] as PageKey[];
const without = (...off: PageKey[]) => ALL.filter((k) => !off.includes(k));

/** Copied from DEFAULT_PERMISSIONS in the web app (index.html). Keep in sync. */
export const DEFAULT_PERMISSIONS: Record<Role, Record<PageKey, 0 | 1>> = {
  builder: row(ALL),
  admin: row(without('systemSettings')),
  manager: row(without('team', 'controlPanel', 'systemSettings')),
  sales_agent: row(['dashboard', 'newCustomer', 'customers', 'loans', 'documents', 'finance', 'quotation', 'profile', 'myLeads', 'landingInbox']),
  installer: row(['dashboard', 'installations', 'finance', 'bom', 'profile', 'netMeter', 'amcService', 'assets']),
  finance: row(['dashboard', 'customers', 'loans', 'documents', 'finance', 'disbursements', 'bom', 'quotation', 'reconciliation', 'cityAnalytics', 'reports', 'profile', 'netMeter', 'subsidyTracker', 'referralEngine', 'assets']),
  loan_officer: row(['dashboard', 'customers', 'loans', 'documents', 'finance', 'disbursements', 'bom', 'quotation', 'cityAnalytics', 'profile', 'netMeter', 'subsidyTracker']),
};

export const ROLE_LABELS: Record<string, string> = {
  builder: 'Builder', admin: 'Admin', manager: 'Manager', sales_agent: 'Sales agent',
  installer: 'Installer', finance: 'Finance', loan_officer: 'Loan officer',
};

export interface PermissionBundle {
  rolePerms?: Record<string, PermMap> | null;
  /** userId -> page -> allowed */
  userOverrides?: Record<string, PermMap> | null;
}

export function canAccess(
  role: string | undefined,
  userId: string | undefined,
  page: PageKey,
  bundle: PermissionBundle | null | undefined,
): boolean {
  if (!role) return false;
  const own = userId ? bundle?.userOverrides?.[userId]?.[page] : undefined;
  if (own !== undefined && own !== null) return !!own;
  const fromServer = bundle?.rolePerms?.[role]?.[page];
  if (fromServer !== undefined && fromServer !== null) return !!fromServer;
  const fallback = (DEFAULT_PERMISSIONS as Record<string, Record<PageKey, 0 | 1>>)[role]?.[page];
  return !!(fallback ?? 0);
}

/** Pages that already exist natively in the app. Everything else opens on the web. */
export const NATIVE_PAGES: PageKey[] = ['dashboard', 'profile', 'customers', 'newCustomer', 'documents', 'installations', 'myLeads', 'loans', 'netMeter', 'subsidyTracker', 'disbursements'];

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard', newCustomer: 'New customer', customers: 'Customers', loans: 'Loans',
  installations: 'Installations', documents: 'Documents', finance: 'Finance',
  disbursements: 'Disbursements', bom: 'Orders (BOM)', quotation: 'Quotation',
  reconciliation: 'Reconciliation', cityAnalytics: 'City analytics', reports: 'Reports', team: 'Team',
  profile: 'Profile', controlPanel: 'Control panel', systemSettings: 'System settings',
  myLeads: 'My leads', netMeter: 'Net meter', subsidyTracker: 'Subsidy tracker',
  referralEngine: 'Referrals', amcService: 'AMC & service', assets: 'Assets', landingInbox: 'Landing inbox',
};

export type TabKey = 'home' | 'customers' | 'new' | 'tasks' | 'more';

/**
 * Bottom tabs by role (from the wireframes): Home, Customers, +, Tasks, More.
 * Installers get Tasks first and no Customers or +.
 */
export function tabsFor(can: (p: PageKey) => boolean, role?: string): TabKey[] {
  const hasTasks = can('installations') || can('loans') || can('myLeads');
  if (role === 'installer') {
    return [...(hasTasks ? (['tasks'] as TabKey[]) : []), 'home', 'more'];
  }
  const out: TabKey[] = ['home'];
  if (can('customers')) out.push('customers');
  if (can('newCustomer')) out.push('new');
  if (hasTasks) out.push('tasks');
  out.push('more');
  return out;
}
