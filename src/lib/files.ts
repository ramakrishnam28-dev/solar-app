/** File helpers with no React Native import (unit-testable). */
export interface PickedFile { uri: string; name: string; type: string; size?: number }

export const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'];

export function guessType(name: string, fallback: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', pdf: 'application/pdf' } as Record<string, string>)[ext ?? ''] ?? fallback;
}

/** Checks the server would refuse anyway, done on the phone so the user is told at once. */
export function fileProblem(f: PickedFile): string | null {
  if (!ALLOWED.includes(f.type)) return 'Use a JPG, PNG, HEIC, WEBP photo or a PDF.';
  if (f.size && f.size > MAX_BYTES) return 'File is larger than 10 MB. Take the photo again or pick a smaller file.';
  return null;
}

/** Adds the file to a form the way each platform needs it. */
export async function appendFile(form: FormData, field: string, f: PickedFile): Promise<void> {
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && !(globalThis as { HermesInternal?: unknown }).HermesInternal) {
    const blob = await (await fetch(f.uri)).blob();
    form.append(field, blob, f.name);
  } else {
    form.append(field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
  }
}

