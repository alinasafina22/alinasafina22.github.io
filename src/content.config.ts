import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/*
 * Content model. Each collection is a folder in src/content/ with one Markdown file per entry.
 * The Markdown body is the long, optional part (review, notes, what I learned).
 * Images go next to the .md file and are referenced with a relative path, e.g. cover: ./cover.jpg
 */

const md = (folder: string) => glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${folder}` });

const tags = z.array(z.string()).default([]);

/**
 * A date written as 2026-06-15, or just 2026-06 when only the month is known.
 * Month-only dates are stored as the 1st with a 1 ms marker so they can be shown as "Jun 2026".
 */
const flexDate = z.preprocess((v) => {
  if (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v)) {
    const [y, m] = v.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 1));
  }
  return v;
}, z.coerce.date());
/** Personal rating on a 10-point scale. */
const rating = z.number().int().min(1).max(10).optional();
const lang = z.enum(['en', 'ru']).default('en');
/** Marks placeholder entries. Demo entries show a visible "demo" label. Delete them when real content exists. */
const demo = z.boolean().default(false);
/** Optional manual "last touched" date, used for "recently updated" sorting. */
const updated = z.coerce.date().optional();

export const BOOK_STATUSES = ['reading', 'read', 'want-to-read', 'dnf'] as const;
export const COURSE_STATUSES = ['learning', 'completed', 'want-to-take', 'paused', 'dropped'] as const;
export const MOVIE_STATUSES = ['watched', 'want-to-watch'] as const;
export const TV_STATUSES = ['watching', 'finished', 'want-to-watch', 'on-hold', 'dropped'] as const;

const notes = defineCollection({
  loader: md('notes'),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags,
    lang,
    demo,
    draft: z.boolean().default(false),
  }),
});

const books = defineCollection({
  loader: md('books'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.string(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      status: z.enum(BOOK_STATUSES),
      rating,
      startDate: flexDate.optional(),
      finishDate: flexDate.optional(),
      note: z.string().optional(),
      quotes: z.array(z.string()).default([]),
      tags,
      lang,
      demo,
      updated,
    }),
});

const courses = defineCollection({
  loader: md('courses'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      instructor: z.string().optional(),
      platform: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      status: z.enum(COURSE_STATUSES),
      rating,
      startDate: flexDate.optional(),
      completionDate: flexDate.optional(),
      note: z.string().optional(),
      learned: z.array(z.string()).default([]),
      url: z.url().optional(),
      tags,
      lang,
      demo,
      updated,
    }),
});

const movies = defineCollection({
  loader: md('movies'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int().optional(),
      poster: image().optional(),
      posterAlt: z.string().optional(),
      director: z.string().optional(),
      status: z.enum(MOVIE_STATUSES),
      rating,
      watchedDate: flexDate.optional(),
      note: z.string().optional(),
      tags,
      lang,
      demo,
      updated,
    }),
});

const tvShows = defineCollection({
  loader: md('tv-shows'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int().optional(),
      poster: image().optional(),
      posterAlt: z.string().optional(),
      status: z.enum(TV_STATUSES),
      rating,
      startDate: flexDate.optional(),
      finishDate: flexDate.optional(),
      season: z.number().int().optional(),
      note: z.string().optional(),
      tags,
      lang,
      demo,
      updated,
    }),
});

const things = defineCollection({
  loader: md('things'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      url: z.url().optional(),
      date: z.coerce.date(),
      tags,
      featured: z.boolean().default(false),
      lang,
      demo,
    }),
});

/** Editable copy for fixed pages: home, about, cv. */
const pages = defineCollection({
  loader: md('pages'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    greeting: z.string().optional(),
    subtitle: z.string().optional(),
    tagline: z.string().optional(),
    lang,
  }),
});

export const collections = { notes, books, courses, movies, tvShows, things, pages };
