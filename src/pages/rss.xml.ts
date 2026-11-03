import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotes, noteTitle, excerpt } from '../utils/format';

export async function GET(context: APIContext) {
  const notes = await getNotes();
  return rss({
    title: 'azh. — notes',
    description: 'Short thoughts and informal notes from a little corner of the internet.',
    site: context.site!,
    items: notes.map((note) => ({
      title: noteTitle(note),
      pubDate: note.data.date,
      description: note.data.description ?? excerpt(note.body, 300),
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
    })),
  });
}
