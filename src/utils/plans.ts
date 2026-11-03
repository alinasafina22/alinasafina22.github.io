import { getCollection, type CollectionEntry } from 'astro:content';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface PlanMonth {
  entry: CollectionEntry<'plans'>;
  key: string;
  label: string;
  done: number;
  total: number;
  when: 'past' | 'current' | 'future';
}

/** Counts Markdown checklist items: "- [ ]" and "- [x]". */
export function countTasks(body = '') {
  const items = body.match(/^\s*[-*+]\s+\[[ xX]\]/gm) ?? [];
  const done = items.filter((i) => /\[[xX]\]/.test(i)).length;
  return { done, total: items.length };
}

/** Current month first, then upcoming months, then past months (newest first). */
export async function getPlans(now = new Date()): Promise<PlanMonth[]> {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const plans = (await getCollection('plans')).map((entry) => {
    const [y, m] = entry.data.month.split('-').map(Number);
    const key = entry.data.month;
    return {
      entry,
      key,
      label: `${MONTHS[m - 1]} ${y}`,
      ...countTasks(entry.body),
      when: key === current ? 'current' : key > current ? 'future' : 'past',
    } satisfies PlanMonth;
  });
  const rank = { current: 0, future: 1, past: 2 } as const;
  return plans.sort(
    (a, b) =>
      rank[a.when] - rank[b.when] ||
      (a.when === 'past' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)),
  );
}
