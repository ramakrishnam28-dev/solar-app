import { KEYS, type KeyValueStore } from './kv';

export class ApiError extends Error {
  status: number;
  fieldErrors: string[];
  /** true when the request never got an answer (offline, timeout, server asleep) */
  network: boolean;
  constructor(message: string, status = 0, opts: { fieldErrors?: string[]; network?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = opts.fieldErrors ?? [];
    this.network = !!opts.network;
  }
}

export interface ApiBody<T> {
  success?: boolean;
  message?: string;
  data: T;
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

export interface ApiClientOptions {
  baseUrl: string;
  storage: KeyValueStore;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Called when the refresh token is rejected: the user must sign in again. */
  onSessionLost?: () => void;
  /** Wait between automatic retries of GET requests (ms). 0 disables the wait (tests). */
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const RETRY_STATUSES = new Set([502, 503, 504]);
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createApiClient(opts: ApiClientOptions) {
  const { baseUrl, storage } = opts;
  const doFetch: typeof fetch = opts.fetchImpl ?? ((...a) => fetch(...a));
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const retryDelay = opts.retryDelayMs ?? 1500;
  const sleep = opts.sleep ?? defaultSleep;

  /** One refresh at a time. The server rotates the refresh token, so two parallel
   *  refreshes would invalidate each other and log the user out. */
  let refreshing: Promise<boolean> | null = null;

  async function rawFetch(method: string, path: string, body: unknown, token: string | null): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(`${baseUrl}/api/v1${path}`, {
        method,
        headers,
        body: body === undefined || body === null ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      const err = e as Error;
      if (err?.name === 'AbortError') {
        throw new ApiError('Request timed out. The server may be starting up, please try again.', 0, { network: true });
      }
      throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, { network: true });
    } finally {
      clearTimeout(timer);
    }
  }

  async function parse(res: Response): Promise<any> {
    return res.json().catch(() => ({}));
  }

  function toError(res: Response, data: any): ApiError {
    let msg: string = data?.message || data?.error || `Request failed (${res.status})`;
    const fieldErrors: string[] = Array.isArray(data?.errors)
      ? data.errors.map((e: any) => e?.message || e?.field).filter(Boolean)
      : [];
    if (fieldErrors.length) msg = `${msg}: ${fieldErrors.join(', ')}`;
    return new ApiError(msg, res.status, { fieldErrors });
  }

  /** @returns true if a new access token was stored; false if the refresh token was rejected.
   *  Throws ApiError(network) if the server could not be reached (tokens are kept). */
  function refreshTokens(): Promise<boolean> {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const refreshToken = await storage.get(KEYS.refresh);
      if (!refreshToken) return false;
      const res = await rawFetch('POST', '/auth/refresh', { refreshToken }, null);
      if (res.status === 401 || res.status === 403 || res.status === 400) return false;
      if (!res.ok) throw new ApiError(`Could not refresh the session (${res.status})`, res.status, { network: true });
      const data = await parse(res);
      const d = data?.data;
      if (!d?.accessToken) return false;
      await storage.set(KEYS.access, d.accessToken);
      if (d.refreshToken) await storage.set(KEYS.refresh, d.refreshToken);
      return true;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }

  async function sessionLost(): Promise<never> {
    await storage.remove(KEYS.access);
    await storage.remove(KEYS.refresh);
    await storage.remove(KEYS.user);
    opts.onSessionLost?.();
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  async function request<T>(method: string, path: string, body?: unknown, o: { auth?: boolean } = {}): Promise<ApiBody<T>> {
    const auth = o.auth !== false;
    const maxRetries = method === 'GET' ? 2 : 0;
    let attempt = 0;
    let refreshedOnce = false;
    for (;;) {
      const token = auth ? await storage.get(KEYS.access) : null;
      let res: Response;
      try {
        res = await rawFetch(method, path, body, token);
      } catch (e) {
        if (e instanceof ApiError && e.network && attempt < maxRetries) {
          attempt++; if (retryDelay) await sleep(retryDelay); continue;
        }
        throw e;
      }

      if (res.status === 401 && auth && !refreshedOnce) {
        refreshedOnce = true;
        const ok = await refreshTokens();   // may throw a network ApiError: keep the session
        if (!ok) return sessionLost();
        continue;
      }
      if (RETRY_STATUSES.has(res.status) && attempt < maxRetries) {
        attempt++; if (retryDelay) await sleep(retryDelay); continue;
      }
      const data = await parse(res);
      if (!res.ok) {
        if (res.status === 401 && auth) return sessionLost();
        throw toError(res, data);
      }
      return data as ApiBody<T>;
    }
  }

  return {
    request,
    get: <T>(path: string) => request<T>('GET', path).then((r) => r.data),
    getPage: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}).then((r) => r.data),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}).then((r) => r.data),
    del: <T>(path: string) => request<T>('DELETE', path).then((r) => r.data),
    /** Public calls (login). Never sends a token and never tries to refresh. */
    postPublic: <T>(path: string, body: unknown) => request<T>('POST', path, body, { auth: false }).then((r) => r.data),
    refreshTokens,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
