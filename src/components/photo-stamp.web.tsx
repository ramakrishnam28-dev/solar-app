import React, { createContext, useContext } from 'react';

/** Web preview: no stamping (the phone app stamps; the website stamps on its own). */
export interface StampInput { uri: string; width: number; height: number; lines: string[] }
type StampFn = (s: StampInput) => Promise<string>;
const Ctx = createContext<StampFn | null>(null);
export const usePhotoStamp = () => useContext(Ctx);
export function PhotoStampHost({ children }: { children: React.ReactNode }) { return <>{children}</>; }
