/** Design tokens. Same palette as the web app redesign. */
export const colors = {
  brand: '#168056',
  brandHover: '#0f5c3f',
  brandTint: '#e3f6ec',
  sun: '#f5a524',
  bg: '#f4fbf7',
  surface: '#ffffff',
  border: '#d3eadc',
  ink: '#0b3d2c',
  ink2: '#2f5c49',
  ink3: '#4f7a66',
  white: '#ffffff',
  // design pass (Android wireframes)
  hero: '#168056',
  heroSoft: '#0f5c3f',
  mint: '#cdeedd',
  mintInk: '#0f5c3f',
  peach: '#fde7d3',
  peachInk: '#9a3412',
  tileGreen: '#e3f6ec',
  tileGrey: '#edf6f1',
  bar: ['#cdeedd', '#9be7c0', '#5fd39a', '#2fa774', '#f2c46d'],
  // status tones: one meaning per colour. Grey is for "cancelled" only.
  tone: {
    done: { fg: '#0f5c3f', bg: '#e3f6ec' },
    progress: { fg: '#1d4ed8', bg: '#eff6ff' },
    waiting: { fg: '#92400e', bg: '#fffbeb' },
    problem: { fg: '#b91c1c', bg: '#fef2f2' },
    inactive: { fg: '#4b524e', bg: '#eef2f0' },
  },
} as const;

export type Tone = keyof typeof colors.tone;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { caption: 12, small: 13, body: 15, lead: 17, title: 22, large: 28 } as const;

/** Every tappable control is at least this tall and wide (dp). */
export const MIN_TAP = 44;
