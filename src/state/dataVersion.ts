import { useEffect, useState } from 'react';

/** Bumped after any change to a customer, so Home and the list reload when you come back. */
let version = 0;
const listeners = new Set<() => void>();
export const bumpData = () => { version++; listeners.forEach((l) => l()); };
export function useDataVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return v;
}
