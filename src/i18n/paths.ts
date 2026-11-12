/*
 * getStaticPaths helpers shared by the English pages (src/pages/) and the Russian ones (src/pages/ru/).
 */
import { getCollection } from 'astro:content';
import { getNotes } from '../utils/format';
import { categoriesFor, getShelf } from '../utils/shelves';
import { localizeAll } from './content';
import type { Locale } from './ui';

export async function notePaths(locale: Locale) {
  const notes = await getNotes(locale);
  return notes.map((note, i) => ({
    params: { slug: note.id },
    // Notes are newest first, so "newer" is the previous index.
    props: { note, newer: notes[i - 1], older: notes[i + 1], all: notes },
  }));
}

export async function thingPaths(locale: Locale) {
  const things = await localizeAll(await getCollection('things'), locale);
  return things.map((thing) => ({ params: { slug: thing.id }, props: { thing } }));
}

export async function recipePaths(locale: Locale) {
  const recipes = await localizeAll(await getCollection('recipes'), locale);
  return recipes.map((recipe) => ({ params: { slug: recipe.id }, props: { recipe } }));
}

export function categoryPaths(locale: Locale) {
  return categoriesFor(locale).map((category) => ({ params: { category: category.key }, props: { category } }));
}

export async function shelfItemPaths(locale: Locale) {
  const paths = [];
  for (const category of categoriesFor(locale)) {
    for (const item of await getShelf(category.key, locale)) {
      paths.push({ params: { category: category.key, slug: item.id }, props: { item } });
    }
  }
  return paths;
}
