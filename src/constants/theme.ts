/** Design tokens. Same palette as the web app redesign. */
export const colors = {
  brand: '#166534',
  brandHover: '#14532d',
  brandTint: '#ecfdf3',
  sun: '#f5a524',
  bg: '#f6f7f6',
  surface: '#ffffff',
  border: '#e4e7e5',
  ink: '#1c1f1d',
  ink2: '#4b524e',
  ink3: '#6b726e',
  white: '#ffffff',
  // status tones: one meaning per colour. Grey is for "cancelled" only.
  tone: {
    done: { fg: '#166534', bg: '#ecfdf3' },
    progress: { fg: '#1d4ed8', bg: '#eff6ff' },
    waiting: { fg: '#92400e', bg: '#fffbeb' },
    problem: { fg: '#b91c1c', bg: '#fef2f2' },
    inactive: { fg: '#4b524e', bg: '#f1f3f2' },
  },
} as const;

export type Tone = keyof typeof colors.tone;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { caption: 12, small: 13, body: 15, lead: 17, title: 22, large: 28 } as const;

/** Every tappable control is at least this tall and wide (dp). */
export const MIN_TAP = 44;
