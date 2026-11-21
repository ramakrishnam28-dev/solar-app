import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Banner, Btn } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { auditCats, auditWhy, catOf, fetchAudit, isBlocked } from '@/lib/audit';
import { dateTime } from '@/lib/format';
import { api } from '@/state/api';
import { useLoad } from '@/state/useLoad';

const PAGE = 20;

/** Logs tab: full audit log with category filter, before → after values, who and when. */
export function CustomerLogs({ id, rk }: { id: string; rk: number }) {
  const { data, error, loading, reload } = useLoad(() => fetchAudit(api, id), [id, rk]);
  const [cat, setCat] = useState('');
  const [shown, setShown] = useState(PAGE);
  if (error && !data) return <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>;
  if (loading && !data) return <ActivityIndicator color={colors.brand} accessibilityLabel="Loading activity log" />;
  const all = data ?? [];
  const rows = cat ? all.filter((r) => (r.category || 'system') === cat) : all;
  return (
    <>
      <Text style={{ fontSize: font.small, color: colors.ink2, marginBottom: space[2] }}>{rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</Text>
      {all.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: space[3] }} contentContainerStyle={{ gap: 8 }}>
          {['', ...auditCats(all)].map((k) => {
            const on = k === cat; const c = k ? catOf(k) : { label: 'All', icon: '' };
            return (
              <Pressable key={k || 'all'} accessibilityRole="button" accessibilityLabel={c.label} accessibilityState={{ selected: on }} onPress={() => { setCat(k); setShown(PAGE); }}
                style={{ minHeight: MIN_TAP, minWidth: MIN_TAP, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: on ? colors.mint : colors.ink, backgroundColor: on ? colors.mint : colors.surface }}>
                <Text style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.mintInk : colors.ink }}>{c.icon ? c.icon + ' ' : ''}{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {rows.length === 0 ? <Text style={{ color: colors.ink2, fontSize: font.body, padding: space[4], textAlign: 'center' }}>No activity yet.</Text> : null}
      {rows.slice(0, shown).map((r, i) => {
        const c = catOf(r.category); const blocked = isBlocked(r); const why = auditWhy(r);
        const diff = r.field_name && (r.old_value != null || r.new_value != null);
        return (
          <View key={r.id ?? i} style={{ backgroundColor: blocked ? '#fef2f2' : colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: blocked ? '#fecaca' : colors.border, padding: space[3], marginBottom: space[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
              <Text style={{ fontSize: font.caption, fontWeight: '600', color: colors.ink2 }}>{c.icon} {c.label}</Text>
              <Text style={{ fontSize: font.caption, fontWeight: '700', color: blocked ? colors.tone.problem.fg : colors.brand }}>{blocked ? 'Blocked' : '✓ Done'}</Text>
            </View>
            <Text selectable style={{ fontSize: font.body, color: colors.ink, marginTop: 4 }}>{r.action || '—'}</Text>
            {r.block_reason ? <Text style={{ fontSize: font.small, color: colors.tone.problem.fg, marginTop: 2 }}>{r.block_reason}</Text> : null}
            {why ? <Text style={{ fontSize: font.small, color: colors.ink2, marginTop: 2 }}>{why}</Text> : null}
            {diff ? (
              <Text style={{ fontSize: font.small, color: colors.ink2, marginTop: 4 }}>
                {String(r.field_name).replace(/_/g, ' ')}: <Text style={{ color: colors.tone.problem.fg, textDecorationLine: 'line-through' }}>{r.old_value || '—'}</Text> → <Text style={{ color: colors.brand, fontWeight: '600' }}>{r.new_value || '—'}</Text>
              </Text>
            ) : null}
            <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: 6 }}>
              {[r.user_name, r.user_emp_id, r.user_role ? r.user_role.replace(/_/g, ' ') : null, dateTime(r.created_at)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        );
      })}
      {rows.length > shown ? <Btn label={`Show more (${rows.length - shown} left)`} variant="secondary" onPress={() => setShown(shown + PAGE)} /> : null}
    </>
  );
}
