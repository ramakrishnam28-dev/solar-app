/**
 * The camera, gallery and file pickers send the app to the background.
 * While one is open the biometric lock must not fire when the user comes back.
 */
let open = 0;
export function pauseLock(): () => void {
  open += 1;
  let done = false;
  return () => { if (!done) { done = true; open = Math.max(0, open - 1); } };
}
export const lockPaused = () => open > 0;
