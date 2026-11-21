import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Burns the GPS stamp into a site photo, like the website does for installers
 * (stampAndCompressPhoto: place, lat/lon, date-time, "RCAL Renewables", green bar; max 1920 px; JPEG 75%).
 * A hidden view draws photo + banner, then it is captured to a new JPEG.
 */
export interface StampInput { uri: string; width: number; height: number; lines: string[] }
type StampFn = (s: StampInput) => Promise<string>;
const Ctx = createContext<StampFn | null>(null);
export const usePhotoStamp = () => useContext(Ctx);

const BOX = 360; // layout width of the hidden view (dp); output size is set on capture

export function PhotoStampHost({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<(StampInput & { resolve: (u: string) => void; reject: (e: unknown) => void }) | null>(null);
  const ref = useRef<never>(null);
  const stamp = useCallback<StampFn>((s) => new Promise((resolve, reject) => setJob({ ...s, resolve, reject })), []);

  const onLoad = async () => {
    if (!job) return;
    try {
      const max = 1920;
      let w = job.width || 1600, h = job.height || 1200;
      if (w > max || h > max) { if (w > h) { h = Math.round((h * max) / w); w = max; } else { w = Math.round((w * max) / h); h = max; } }
      const uri = await captureRef(ref as never, { format: 'jpg', quality: 0.75, width: w, height: h, result: 'tmpfile' });
      job.resolve(uri);
    } catch (e) {
      job.resolve(job.uri); // same as the website: fall back to the original photo
    } finally { setJob(null); }
  };

  const ratio = job ? (job.height || 3) / (job.width || 4) : 1;
  const font = Math.max(8, Math.round(BOX * 0.022));
  return (
    <Ctx.Provider value={stamp}>
      {children}
      {job ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }}>
          <View ref={ref} collapsable={false} style={{ width: BOX, height: BOX * ratio, backgroundColor: '#000' }}>
            <Image source={{ uri: job.uri }} style={{ width: BOX, height: BOX * ratio }} onLoad={onLoad} onError={() => { job.resolve(job.uri); setJob(null); }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', padding: font * 0.8, paddingBottom: font * 0.8 + 3 }}>
              {job.lines.map((l, i) => <Text key={i} style={{ color: '#fff', fontWeight: '700', fontSize: font, lineHeight: font * 1.55 }}>{l}</Text>)}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: '#166534' }} />
            </View>
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
