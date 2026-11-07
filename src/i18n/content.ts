import { getCollection, type CollectionEntry, type DataEntryMap } from 'astro:content';
import type { Locale } from './ui';

/*
 * Content in two languages.
 * Each entry is written once in its own language (the `lang` field, English by default).
 * A translation lives in src/content/translations/<locale>/<folder>/<id>.md and overrides
 * the text fields and the body. Missing translations fall back to the original.
 */

type Translatable = Exclude<keyof DataEntryMap, 'translations'>;

const FOLDER: Partial<Record<Translatable, string>> = { tvShows: 'tv-shows' };

let cache: Map<string, CollectionEntry<'translations'>> | undefined;
async function translations() {
  cache ??= new Map((await getCollection('translations')).map((t) => [t.id, t]));
  return cache;
}

type AnyEntry = CollectionEntry<Translatable>;

export interface LocalizedEntry<E extends AnyEntry> {
  id: string;
  /** Original data with translated fields merged in. */
  data: E['data'];
  /** Markdown body that is shown (translated when available). */
  body?: string;
  /** Pass this to render() to get the shown body. */
  source: E | CollectionEntry<'translations'>;
  /** Language of the shown title and fields. */
  lang: Locale;
  /** Language of the shown body. Differs from the page language when the body has no translation. */
  bodyLang: Locale;
  entry: E;
}

export type Localized<C extends Translatable> = LocalizedEntry<CollectionEntry<C>>;

const defined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function localize<E extends AnyEntry>(entry: E, locale: Locale): Promise<LocalizedEntry<E>> {
  const own = ((entry.data as { lang?: Locale }).lang ?? 'en') as Locale;
  const original: LocalizedEntry<E> = {
    id: entry.id,
    data: entry.data,
    body: entry.body,
    source: entry,
    lang: own,
    bodyLang: own,
    entry,
  };
  if (own === locale) return original;

  const folder = FOLDER[entry.collection] ?? entry.collection;
  const t = (await translations()).get(`${locale}/${folder}/${entry.id}`);
  if (!t) return original;

  const hasBody = Boolean(t.body?.trim());
  return {
    ...original,
    data: { ...entry.data, ...defined(t.data), lang: locale } as E['data'],
    body: hasBody ? t.body : entry.body,
    source: hasBody ? t : entry,
    lang: locale,
    bodyLang: hasBody || !entry.body?.trim() ? locale : own,
  };
}

export const localizeAll = <E extends AnyEntry>(entries: E[], locale: Locale) =>
  Promise.all(entries.map((e) => localize(e, locale)));
