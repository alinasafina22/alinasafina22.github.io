import { getCollection } from 'astro:content';

/** True for dates written with month precision only (see flexDate in content.config.ts). */
const monthOnly = (date: Date) => date.getUTCMilliseconds() === 1;

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    day: monthOnly(date) ? undefined : 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const isoDate = (date: Date) => date.toISOString().slice(0, monthOnly(date) ? 7 : 10);

/** Published notes, newest first. Drafts are visible in `astro dev` only. */
export async function getNotes() {
  const notes = await getCollection('notes', ({ data }) => import.meta.env.DEV || !data.draft);
  return notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** A note title, or a short excerpt for untitled notes. */
export function noteTitle(note: { data: { title?: string; date: Date }; body?: string }) {
  if (note.data.title) return note.data.title;
  const text = (note.body ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`]/g, '')
    .trim();
  const firstLine = text.split('\n').find((l) => l.trim()) ?? '';
  return firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine || `Note from ${formatDate(note.data.date)}`;
}

/** Plain-text excerpt for cards, meta descriptions and RSS. */
export function excerpt(body: string | undefined, max = 180) {
  const text = (body ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s.*$/gm, '')
    .replace(/[>*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
