import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { LOCK_AFTER_MS } from '@/lib/config';
import { ApiError } from '@/lib/api';
import { KEYS } from '@/lib/kv';
import { secureStore } from '@/lib/storage';
import { canAccess, type PageKey, type PermissionBundle } from '@/lib/permissions';
import { api, setSessionLostHandler } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  emp_id?: string | null;
  city?: string | null;
}

/** loading: reading the phone | signedOut | locked: waiting for fingerprint
 *  offline: signed in but the server cannot be reached | signedIn */
export type Status = 'loading' | 'signedOut' | 'locked' | 'offline' | 'signedIn';

interface LoginResult { accessToken: string; refreshToken: string; user: User }

interface SessionValue {
  status: Status;
  user: User | null;
  offlineMessage: string;
  can: (page: PageKey) => boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => Promise<boolean>;
  retry: () => Promise<void>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  setBiometricEnabled: (on: boolean) => Promise<{ ok: boolean; message?: string }>;
  checkConnection: () => Promise<{ ok: boolean; ms: number; message: string }>;
}

const Ctx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside <SessionProvider>');
  return v;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [bundle, setBundle] = useState<PermissionBundle | null>(null);
  const [offlineMessage, setOfflineMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  // refs so the AppState listener always sees current values
  const statusRef = useRef<Status>('loading');
  const bioRef = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const set = useCallback((s: Status) => { statusRef.current = s; setStatus(s); }, []);

  const clearLocal = useCallback(() => { setUser(null); setBundle(null); }, []);

  // A rejected refresh token (api client already wiped the tokens) -> signed out.
  useEffect(() => {
    setSessionLostHandler(() => { clearLocal(); set('signedOut'); });
    return () => setSessionLostHandler(null);
  }, [clearLocal, set]);

  /** Validate the stored session with the server and load permissions. */
  const loadSession = useCallback(async () => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      await secureStore.set(KEYS.user, JSON.stringify({ id: me.id, name: me.name, role: me.role }));
      try {
        // Permissions are best-effort: on failure we fall back to the built-in table.
        const b = await api.get<PermissionBundle>('/settings/bundle');
        setBundle({ rolePerms: b?.rolePerms ?? null, userOverrides: b?.userOverrides ?? null });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return; // session lost: already signed out
        setBundle(null);
      }
      set('signedIn');
    } catch (e) {
      if (e instanceof ApiError && e.network) {
        setOfflineMessage(e.message);
        set('offline');
      } else if (e instanceof ApiError && e.status === 401) {
        // onSessionLost already moved us to signedOut
      } else {
        setOfflineMessage(e instanceof Error ? e.message : 'Something went wrong.');
        set('offline');
      }
    }
  }, [set]);

  // Start-up: biometric capability, then restore session if there is one.
  useEffect(() => {
    let alive = true;
    (async () => {
      let hw = false;
      try { hw = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync()); } catch { hw = false; }
      const flag = (await secureStore.get(KEYS.biometric)) === '1';
      if (!alive) return;
      setBiometricAvailable(hw);
      const on = flag && hw;
      bioRef.current = on;
      setBiometricEnabledState(on);

      const refresh = await secureStore.get(KEYS.refresh);
      if (!alive) return;
      if (!refresh) { set('signedOut'); return; }
      if (on) { set('locked'); return; }
      await loadSession();
    })();
    return () => { alive = false; };
  }, [loadSession, set]);

  // Lock after a while in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') { backgroundedAt.current = Date.now(); return; }
      if (next === 'active') {
        const t = backgroundedAt.current; backgroundedAt.current = null;
        if (t && bioRef.current && statusRef.current === 'signedIn' && Date.now() - t > LOCK_AFTER_MS) set('locked');
      }
    });
    return () => sub.remove();
  }, [set]);

  const login = useCallback(async (identifier: string, password: string) => {
    const r = await api.postPublic<LoginResult>('/auth/login', { email: identifier.trim(), password });
    await secureStore.set(KEYS.access, r.accessToken);
    await secureStore.set(KEYS.refresh, r.refreshToken);
    setUser(r.user);
    set('loading');
    await loadSession();
  }, [loadSession, set]);

  const logout = useCallback(async () => {
    const refreshToken = await secureStore.get(KEYS.refresh);
    if (refreshToken) { try { await api.postPublic('/auth/logout', { refreshToken }); } catch { /* best effort */ } }
    await secureStore.remove(KEYS.access);
    await secureStore.remove(KEYS.refresh);
    await secureStore.remove(KEYS.user);
    clearLocal();
    set('signedOut');
  }, [clearLocal, set]);

  const unlock = useCallback(async () => {
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock RCAL Station', cancelLabel: 'Cancel' });
      if (!r.success) return false;
    } catch { return false; }
    // Back from the background: the data is already loaded, just reopen.
    if (user) { set('signedIn'); return true; }
    set('loading');
    await loadSession();
    return true;
  }, [loadSession, set, user]);

  const retry = useCallback(async () => { set('loading'); await loadSession(); }, [loadSession, set]);

  const setBiometricEnabled = useCallback(async (on: boolean) => {
    if (!on) {
      await secureStore.remove(KEYS.biometric);
      bioRef.current = false; setBiometricEnabledState(false);
      return { ok: true };
    }
    if (!biometricAvailable) return { ok: false, message: 'Set up a fingerprint, face or screen lock in your phone settings first.' };
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on unlock' });
      if (!r.success) return { ok: false, message: 'Not confirmed. Unlock stays off.' };
    } catch { return { ok: false, message: 'Could not use fingerprint or face on this phone.' }; }
    await secureStore.set(KEYS.biometric, '1');
    bioRef.current = true; setBiometricEnabledState(true);
    return { ok: true };
  }, [biometricAvailable]);

  const checkConnection = useCallback(async () => {
    const t0 = Date.now();
    try {
      await api.get('/auth/me');
      return { ok: true, ms: Date.now() - t0, message: 'Connected' };
    } catch (e) {
      return { ok: false, ms: Date.now() - t0, message: e instanceof Error ? e.message : 'Failed' };
    }
  }, []);

  const can = useCallback(
    (page: PageKey) => canAccess(user?.role, user?.id, page, bundle),
    [user, bundle],
  );

  const value = useMemo<SessionValue>(() => ({
    status, user, offlineMessage, can, login, logout, unlock, retry,
    biometricAvailable, biometricEnabled, setBiometricEnabled, checkConnection,
  }), [status, user, offlineMessage, can, login, logout, unlock, retry, biometricAvailable, biometricEnabled, setBiometricEnabled, checkConnection]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
