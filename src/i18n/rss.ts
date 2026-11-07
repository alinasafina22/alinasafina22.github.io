import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotes, noteTitle, excerpt } from '../utils/format';
import { localePath, useTranslations, type Locale } from './ui';

/** Notes feed for one language: /rss.xml (English) and /ru/rss.xml (Russian). */
export async function notesFeed(context: APIContext, locale: Locale) {
  const t = useTranslations(locale);
  const notes = await getNotes(locale);
  return rss({
    title: t('rss.title'),
    description: t('rss.description'),
    site: context.site!,
    customData: `<language>${locale}</language>`,
    items: notes.map((note) => ({
      title: noteTitle(note, locale),
      pubDate: note.data.date,
      description: note.data.description ?? excerpt(note.body, 300),
      link: localePath(locale, `/notes/${note.id}/`),
      categories: note.data.tags,
    })),
  });
}
