import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';

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

/** Categories shown on the site. */
export const CATEGORIES = ALL_CATEGORIES.filter((c) => !c.hidden);

export const getCategory = (key: string) => ALL_CATEGORIES.find((c) => c.key === key);

export interface DateRow {
  label: string;
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
  lang: 'en' | 'ru';
  demo: boolean;
  url?: string;
  quotes: string[];
  learned: string[];
  entry: CollectionEntry<'books' | 'courses' | 'movies' | 'tvShows'>;
}

const statusOf = (cat: CategoryDef, key: string) =>
  cat.statuses.find((s) => s.key === key) ?? cat.statuses[0];

const datesOnly = (rows: Array<[string, Date | undefined]>): DateRow[] =>
  rows.filter((r): r is [string, Date] => r[1] instanceof Date).map(([label, date]) => ({ label, date }));

const latest = (updated: Date | undefined, dates: DateRow[]) =>
  Math.max(updated?.getTime() ?? 0, ...dates.map((d) => d.date.getTime()), 0);

export async function getShelf(key: CategoryKey): Promise<ShelfItem[]> {
  const cat = getCategory(key)!;
  if (cat.hidden) return [];
  const base = `/bookshelves/${key}/`;
  let items: ShelfItem[] = [];

  if (key === 'books') {
    items = (await getCollection('books')).map((e) => {
      const d = e.data;
      const dates = datesOnly([
        ['Started', d.startDate],
        ['Finished', d.finishDate],
      ]);
      return {
        category: cat, id: e.id, href: `${base}${e.id}/`, title: d.title, creator: d.author,
        status: statusOf(cat, d.status), rating: d.rating, cover: d.cover,
        coverAlt: d.coverAlt ?? `Cover of ${d.title}`, note: d.note, tags: d.tags, dates,
        sortDate: latest(d.updated, dates), lang: d.lang, demo: d.demo, quotes: d.quotes, learned: [], entry: e,
      };
    });
  } else if (key === 'courses') {
    items = (await getCollection('courses')).map((e) => {
      const d = e.data;
      const dates = datesOnly([
        ['Started', d.startDate],
        ['Completed', d.completionDate],
      ]);
      return {
        category: cat, id: e.id, href: `${base}${e.id}/`, title: d.title, creator: d.instructor,
        subline: d.platform, status: statusOf(cat, d.status), rating: d.rating, cover: d.cover,
        coverAlt: d.coverAlt ?? `Cover of ${d.title}`, note: d.note, tags: d.tags, dates,
        sortDate: latest(d.updated, dates), lang: d.lang, demo: d.demo, url: d.url, quotes: [],
        learned: d.learned, entry: e,
      };
    });
  } else if (key === 'movies') {
    items = (await getCollection('movies')).map((e) => {
      const d = e.data;
      const dates = datesOnly([['Watched', d.watchedDate]]);
      return {
        category: cat, id: e.id, href: `${base}${e.id}/`, title: d.title, creator: d.director,
        subline: d.year ? String(d.year) : undefined, status: statusOf(cat, d.status), rating: d.rating,
        cover: d.poster, coverAlt: d.posterAlt ?? `Poster of ${d.title}`, note: d.note, tags: d.tags,
        dates, sortDate: latest(d.updated, dates), lang: d.lang, demo: d.demo, quotes: [], learned: [], entry: e,
      };
    });
  } else {
    items = (await getCollection('tvShows')).map((e) => {
      const d = e.data;
      const dates = datesOnly([
        ['Started', d.startDate],
        ['Finished', d.finishDate],
      ]);
      const sub = [d.year ? String(d.year) : '', d.season ? `Season ${d.season}` : ''].filter(Boolean).join(' · ');
      return {
        category: cat, id: e.id, href: `${base}${e.id}/`, title: d.title, subline: sub || undefined,
        status: statusOf(cat, d.status), rating: d.rating, cover: d.poster,
        coverAlt: d.posterAlt ?? `Poster of ${d.title}`, note: d.note, tags: d.tags, dates,
        sortDate: latest(d.updated, dates), lang: d.lang, demo: d.demo, quotes: [], learned: [], entry: e,
      };
    });
  }

  // Default order: most recently touched first, then by title.
  return items.sort((a, b) => b.sortDate - a.sortDate || a.title.localeCompare(b.title));
}

export async function getAllShelves() {
  const entries = await Promise.all(ALL_CATEGORIES.map(async (c) => [c.key, await getShelf(c.key)] as const));
  return Object.fromEntries(entries) as Record<CategoryKey, ShelfItem[]>;
}
