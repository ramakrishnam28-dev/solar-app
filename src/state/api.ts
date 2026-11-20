import { API_URL, REQUEST_TIMEOUT_MS } from '@/lib/config';
import { createApiClient } from '@/lib/api';
import { secureStore } from '@/lib/storage';

let onLost: (() => void) | null = null;
/** The session provider registers here so a rejected refresh token signs the user out. */
export const setSessionLostHandler = (fn: (() => void) | null) => { onLost = fn; };

export const api = createApiClient({
  baseUrl: API_URL,
  storage: secureStore,
  timeoutMs: REQUEST_TIMEOUT_MS,
  onSessionLost: () => onLost?.(),
});
