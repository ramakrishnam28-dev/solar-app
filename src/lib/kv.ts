/** Plain key-value storage contract + keys. No phone-only imports, so it is testable in Node. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(initial));
  return {
    async get(k) { return m.get(k) ?? null; },
    async set(k, v) { m.set(k, v); },
    async remove(k) { m.delete(k); },
    dump() { return Object.fromEntries(m); },
  };
}

export const KEYS = {
  access: 'rcal.access',
  refresh: 'rcal.refresh',
  user: 'rcal.user',
  biometric: 'rcal.biometric',
} as const;
