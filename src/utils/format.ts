import { getCollection } from 'astro:content';
import { localizeAll } from '../i18n/content';
import { formatDateFor, useTranslations, type Locale } from '../i18n/ui';

/** True for dates written with month precision only (see flexDate in content.config.ts). */
const monthOnly = (date: Date) => date.getUTCMilliseconds() === 1;

export const formatDate = (date: Date, locale: Locale = 'en') => formatDateFor(locale, date, monthOnly(date));

export const isoDate = (date: Date) => date.toISOString().slice(0, monthOnly(date) ? 7 : 10);

/** Published notes in the given language, newest first. Drafts are visible in `astro dev` only. */
export async function getNotes(locale: Locale = 'en') {
  const notes = await getCollection('notes', ({ data }) => import.meta.env.DEV || !data.draft);
  const localized = await localizeAll(notes, locale);
  return localized.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export type Note = Awaited<ReturnType<typeof getNotes>>[number];

/** A note title, or a short excerpt for untitled notes. */
export function noteTitle(note: { data: { title?: string; date: Date }; body?: string }, locale: Locale = 'en') {
  if (note.data.title) return note.data.title;
  const text = (note.body ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`]/g, '')
    .trim();
  const firstLine = text.split('\n').find((l) => l.trim()) ?? '';
  return firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine || useTranslations(locale)('notes.untitled', { date: formatDate(note.data.date, locale) });
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

/** A link inside this site (a root-relative path), as opposed to an outside address. */
export const isLocalUrl = (url: string) => url.startsWith('/') && !url.startsWith('//');
