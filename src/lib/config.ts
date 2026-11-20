import Constants from 'expo-constants';

type Extra = { apiUrl?: string; webUrl?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Backend base URL (the Cloudflare Worker). Override with EXPO_PUBLIC_API_URL in .env. */
export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || '').replace(/\/$/, '');
/** Web app, for pages that stay on the web (BOM, Assets, Settings ...). */
export const WEB_URL: string = (process.env.EXPO_PUBLIC_WEB_URL || extra.webUrl || '').replace(/\/$/, '');

/** Lock the app after this long in the background (when fingerprint unlock is on). */
export const LOCK_AFTER_MS = 2 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 30_000;
