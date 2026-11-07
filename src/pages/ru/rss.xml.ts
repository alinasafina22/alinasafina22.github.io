import type { APIContext } from 'astro';
import { notesFeed } from '../../i18n/rss';

export const GET = (context: APIContext) => notesFeed(context, 'ru');
