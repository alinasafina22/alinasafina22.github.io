import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { localize } from '../i18n/content';
import { useTranslations, type Locale } from '../i18n/ui';

/*
 * Bookshelves: four independent collections shown through one shared interface.
 * This file maps each collection to a common "shelf item" shape so the grid,
 * filters and detail page can be written once.
 */

export type CategoryKey = 'books' | 'courses' | 'movies' | 'tv-shows';

type Accent = 'sage' | 'lavender' | 'peach' | 'dusty-rose' | 'dusty-blue' | 'butter' | 'oat';

export interface StatusDef {
  key: string;
  label: string;
  /** Short glyph shown next to the label so status never relies on color alone. */
  glyph: string;
  accent: Accent;
}

export interface CategoryDef {
  key: CategoryKey;
  collection: 'books' | 'courses' | 'movies' | 'tvShows';
  label: string;
  singular: string;
  description: string;
  emptyText: string;
  /** Cover-based categories use portrait cards; courses use wide cards. */
  layout: 'cover' | 'wide';
  statuses: StatusDef[];
  /** Hidden categories have no pages, tabs or links. Remove the line to bring one back. */
  hidden?: boolean;
}

/** Every category the site knows about, including hidden ones. */
export const ALL_CATEGORIES: CategoryDef[] = [
  {
    key: 'books',
    collection: 'books',
    label: 'Books',
    singular: 'Book',
    description: 'Paper, ebook and audio. Everything that has an author and pages.',
    emptyText: 'A little empty shelf. Books will show up here.',
    layout: 'cover',
    statuses: [
      { key: 'reading', label: 'Reading', glyph: '→', accent: 'sage' },
      { key: 'read', label: 'Read', glyph: '●', accent: 'dusty-blue' },
      { key: 'want-to-read', label: 'Want to read', glyph: '○', accent: 'butter' },
      { key: 'dnf', label: 'DNF', glyph: '×', accent: 'dusty-rose' },
    ],
  },
  {
    key: 'courses',
    collection: 'courses',
    label: 'Courses',
    singular: 'Course',
    description: 'Courses, tutorials and other structured learning.',
    emptyText: 'No courses yet. Learning in progress, probably.',
    layout: 'wide',
    statuses: [
      { key: 'learning', label: 'Learning', glyph: '→', accent: 'sage' },
      { key: 'completed', label: 'Completed', glyph: '●', accent: 'dusty-blue' },
      { key: 'want-to-take', label: 'Want to take', glyph: '○', accent: 'butter' },
      { key: 'paused', label: 'Paused', glyph: '‖', accent: 'lavender' },
      { key: 'dropped', label: 'Dropped', glyph: '×', accent: 'dusty-rose' },
    ],
  },
  {
    key: 'movies',
    collection: 'movies',
    label: 'Movies',
    singular: 'Movie',
    description: 'Films I watched or keep meaning to watch.',
    emptyText: 'No movies here yet. Popcorn is ready.',
    layout: 'cover',
    hidden: true,
    statuses: [
      { key: 'watched', label: 'Watched', glyph: '●', accent: 'dusty-blue' },
      { key: 'want-to-watch', label: 'Want to watch', glyph: '○', accent: 'butter' },
    ],
  },
  {
    key: 'tv-shows',
    collection: 'tvShows',
    label: 'TV Shows',
    singular: 'TV show',
    description: 'Series, one season or ten.',
    emptyText: 'No shows yet. The remote is waiting.',
    layout: 'cover',
    hidden: true,
    statuses: [
      { key: 'watching', label: 'Watching', glyph: '→', accent: 'sage' },
      { key: 'finished', label: 'Finished', glyph: '●', accent: 'dusty-blue' },
      { key: 'want-to-watch', label: 'Want to watch', glyph: '○', accent: 'butter' },
      { key: 'on-hold', label: 'On hold', glyph: '‖', accent: 'lavender' },
      { key: 'dropped', label: 'Dropped', glyph: '×', accent: 'dusty-rose' },
    ],
  },
];

/** Russian labels for categories and statuses. */
const RU: Record<CategoryKey, Pick<CategoryDef, 'label' | 'singular' | 'description' | 'emptyText'> & { statuses: Record<string, string> }> = {
  books: {
    label: 'Книги',
    singular: 'Книга',
    description: 'Бумажные, электронные и аудио. Всё, у чего есть автор и страницы.',
    emptyText: 'Маленькая пустая полка. Здесь появятся книги.',
    statuses: { reading: 'Читаю', read: 'Прочитано', 'want-to-read': 'Хочу прочитать', dnf: 'Бросила' },
  },
  courses: {
    label: 'Курсы',
    singular: 'Курс',
    description: 'Курсы, туториалы и другое структурированное обучение.',
    emptyText: 'Курсов пока нет. Наверное, учусь.',
    statuses: { learning: 'Прохожу', completed: 'Пройден', 'want-to-take': 'Хочу пройти', paused: 'На паузе', dropped: 'Бросила' },
  },
  movies: {
    label: 'Фильмы',
    singular: 'Фильм',
    description: 'Фильмы, которые я посмотрела или всё собираюсь посмотреть.',
    emptyText: 'Фильмов пока нет. Попкорн готов.',
    statuses: { watched: 'Посмотрела', 'want-to-watch': 'Хочу посмотреть' },
  },
  'tv-shows': {
    label: 'Сериалы',
    singular: 'Сериал',
    description: 'Сериалы, на один сезон или на десять.',
    emptyText: 'Сериалов пока нет. Пульт ждёт.',
    statuses: { watching: 'Смотрю', finished: 'Досмотрела', 'want-to-watch': 'Хочу посмотреть', 'on-hold': 'На паузе', dropped: 'Бросила' },
  },
};

/** A category with labels in the given language. */
export function localizeCategory(cat: CategoryDef, locale: Locale): CategoryDef {
  if (locale === 'en') return cat;
  const ru = RU[cat.key];
  return {
    ...cat,
    label: ru.label,
    singular: ru.singular,
    description: ru.description,
    emptyText: ru.emptyText,
    statuses: cat.statuses.map((s) => ({ ...s, label: ru.statuses[s.key] ?? s.label })),
  };
}

/** Categories shown on the site. */
export const CATEGORIES = ALL_CATEGORIES.filter((c) => !c.hidden);

export const categoriesFor = (locale: Locale) => CATEGORIES.map((c) => localizeCategory(c, locale));

export const getCategory = (key: string) => ALL_CATEGORIES.find((c) => c.key === key);

export interface DateRow {
  key: 'started' | 'finished' | 'completed' | 'watched';
  date: Date;
}

export interface ShelfItem {
  category: CategoryDef;
  id: string;
  href: string;
  title: string;
  /** Author, instructor or director. */
  creator?: string;
  /** Extra line under the creator: platform, year, season. */
  subline?: string;
  status: StatusDef;
  rating?: number;
  cover?: ImageMetadata;
  coverAlt: string;
  note?: string;
  tags: string[];
  dates: DateRow[];
  /** Date used for "recent" sorting. */
  sortDate: number;
  /** Language of the shown title. */
  lang: Locale;
  /** Language of the shown review. */
  bodyLang: Locale;
  hasBody: boolean;
  /** Year the item is planned for (books only). */
  plan?: number;
  demo: boolean;
  url?: string;
  /** Certificate link (courses only). */
  certificate?: string;
  quotes: string[];
  learned: string[];
  /** Pass to render() to show the review in the current language. */
  source: CollectionEntry<'books' | 'courses' | 'movies' | 'tvShows' | 'translations'>;
}

const statusOf = (cat: CategoryDef, key: string) =>
  cat.statuses.find((s) => s.key === key) ?? cat.statuses[0];

const datesOnly = (rows: Array<[DateRow['key'], Date | undefined]>): DateRow[] =>
  rows.filter((r): r is [DateRow['key'], Date] => r[1] instanceof Date).map(([key, date]) => ({ key, date }));

const latest = (updated: Date | undefined, dates: DateRow[]) =>
  Math.max(updated?.getTime() ?? 0, ...dates.map((d) => d.date.getTime()), 0);

export async function getShelf(key: CategoryKey, locale: Locale = 'en'): Promise<ShelfItem[]> {
  const base = getCategory(key)!;
  if (base.hidden) return [];
  const cat = localizeCategory(base, locale);
  const t = useTranslations(locale);
  const href = (id: string) => `${locale === 'en' ? '' : `/${locale}`}/bookshelves/${key}/${id}/`;
  const collection = cat.collection;

  const entries = await getCollection(collection);
  const items = await Promise.all(
    entries.map(async (e): Promise<ShelfItem> => {
      const l = await localize(e, locale);
      const d = l.data as Record<string, any>;
      let dates: DateRow[];
      let creator: string | undefined;
      let subline: string | undefined;
      let cover: ImageMetadata | undefined = d.cover;
      let coverAlt = d.coverAlt ?? t('item.coverOf', { title: d.title });
      if (key === 'books') {
        dates = datesOnly([['started', d.startDate], ['finished', d.finishDate]]);
        creator = d.author;
      } else if (key === 'courses') {
        dates = datesOnly([['started', d.startDate], ['completed', d.completionDate]]);
        creator = d.instructor;
        subline = d.platform;
      } else if (key === 'movies') {
        dates = datesOnly([['watched', d.watchedDate]]);
        creator = d.director;
        subline = d.year ? String(d.year) : undefined;
        cover = d.poster;
        coverAlt = d.posterAlt ?? t('item.posterOf', { title: d.title });
      } else {
        dates = datesOnly([['started', d.startDate], ['finished', d.finishDate]]);
        subline = [d.year ? String(d.year) : '', d.season ? t('item.season', { n: d.season }) : ''].filter(Boolean).join(' · ') || undefined;
        cover = d.poster;
        coverAlt = d.posterAlt ?? t('item.posterOf', { title: d.title });
      }
      return {
        category: cat, id: e.id, href: href(e.id), title: d.title, creator, subline,
        status: statusOf(cat, d.status), rating: d.rating, cover, coverAlt, note: d.note, tags: d.tags,
        dates, sortDate: latest(d.updated, dates), lang: l.lang, bodyLang: l.bodyLang,
        hasBody: Boolean(l.body?.trim()), plan: d.plan, demo: d.demo, url: d.url, certificate: d.certificate, quotes: d.quotes ?? [], learned: d.learned ?? [],
        source: l.source,
      };
    }),
  );

  // Default order: most recently touched first, then by title.
  return items.sort((a, b) => b.sortDate - a.sortDate || a.title.localeCompare(b.title, locale));
}

export async function getAllShelves(locale: Locale = 'en') {
  const entries = await Promise.all(ALL_CATEGORIES.map(async (c) => [c.key, await getShelf(c.key, locale)] as const));
  return Object.fromEntries(entries) as Record<CategoryKey, ShelfItem[]>;
}
