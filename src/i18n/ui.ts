/*
 * Site languages and interface strings.
 * English lives at the site root, Russian under /ru/.
 * To change a label, edit it here in both languages.
 */

export const LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', ru: 'Русский' };

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** Locale of the current page, from Astro.currentLocale. */
export const toLocale = (v: string | undefined): Locale => (isLocale(v) ? v : DEFAULT_LOCALE);

/** Root-relative link for a locale: '/notes/' → '/ru/notes/'. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean}`;
}

/** The same page in another language. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const bare = pathname.replace(/^\/ru(?=\/|$)/, '') || '/';
  return localePath(to, bare);
}

/** Russian plural forms: 1 книга, 2 книги, 5 книг. */
export function pluralRu(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const en = {
  'site.description': 'A little corner of the internet: notes, bookshelves and things worth remembering.',
  'site.titleSuffix': 'a little corner of the internet',
  'skip': 'Skip to content',
  'menu': 'Menu',
  'nav.main': 'Main',
  'nav.home': 'Home',
  'nav.notes': 'Notes',
  'nav.bookshelves': 'Bookshelves',
  'nav.things': 'Things',
  'nav.about': 'About',
  'lang.switch': 'Language',
  'footer.made': 'made with curiosity and too many browser tabs',
  'breadcrumbs': 'Breadcrumbs',
  'tags': 'Tags',

  'home.tagline': 'a little corner of the internet',
  'home.recentNotes': 'Recent notes',
  'home.allNotes': 'All notes →',
  'home.noNotes': 'No notes yet.',
  'home.noNotesHint': 'The first one is always the hardest.',
  'home.currently': 'Currently',
  'home.bookshelves': 'Bookshelves →',
  'home.verb.books': 'reading',
  'home.verb.courses': 'learning',
  'home.verb.tv-shows': 'watching',
  'home.things': 'Some things',
  'home.allThings': 'All things →',
  'home.explore': 'Explore',
  'home.tile.notes': 'Short thoughts, half-baked ideas and things I learned.',
  'home.tile.bookshelves': 'Books and courses.',
  'home.tile.things': 'Pictures, links and small discoveries.',
  'home.tile.about': 'Who is behind this little corner.',

  'notes.title': 'Notes',
  'notes.meta': 'Short thoughts, informal notes and things I learned.',
  'notes.lead': 'Short thoughts, half-formed ideas and things I learned along the way.',
  'notes.rss': 'RSS feed',
  'notes.empty': 'No notes found.',
  'notes.emptyHint': 'Add a Markdown file to src/content/notes/',
  'notes.more': 'More notes',
  'notes.older': '← older',
  'notes.newer': 'newer →',
  'notes.related': 'Related notes',
  'notes.untitled': 'Note from {date}',
  'rss.title': 'azh. — notes',
  'rss.description': 'Short thoughts and informal notes from a little corner of the internet.',

  'things.title': 'Things',
  'things.meta': 'A visual collection of interesting discoveries: pictures, links and small finds.',
  'things.lead': 'Pictures, links, websites and small discoveries I wanted to keep.',
  'things.empty': 'Nothing here yet.',
  'things.emptyHint': 'Add a Markdown file to src/content/things/',
  'things.saved': 'saved',
  'things.visit': 'Visit {host}',
  'things.savedIn': '{title}, saved in Things.',
  'external': '(external link, opens in a new tab)',
  'newTab': '(opens in a new tab)',

  'shelves.title': 'Bookshelves',
  'shelves.lead': "Things I've read and learned.",
  'shelves.all': 'All {n} →',
  'shelves.open': 'Open →',
  'shelves.categories': 'Bookshelf categories',
  'shelves.filterStatus': 'Filter by status',
  'shelves.filterTag': 'Filter by tag',
  'shelves.all.status': 'All',
  'shelves.allTags': 'All tags',
  'shelves.search': 'Search {what}…',
  'shelves.sort': 'sort',
  'shelves.sort.recent': 'Recently updated',
  'shelves.sort.title': 'Title A–Z',
  'shelves.sort.rating': 'Rating',
  'shelves.noMatch': 'Nothing on this shelf matches.',
  'shelves.noMatchHint': 'Try another status or a shorter search.',
  'shelves.shown': '{n} shown',
  'shelves.earlier': 'Earlier',
  'shelves.inProgress': 'In progress',
  'shelves.now.books': 'Reading now',
  'shelves.now.courses': 'Learning now',
  'shelves.now.tv-shows': 'Watching now',
  'shelves.addFile': 'Add a Markdown file to src/content/{folder}/',
  'item.review': 'Review',
  'item.notes': 'Notes',
  'item.quotes': 'Quotes',
  'item.learned': 'What I learned',
  'item.openOn': 'Open on {host}',
  'item.by': '{title} by {creator}',
  'item.coverOf': 'Cover of {title}',
  'item.posterOf': 'Poster of {title}',
  'item.season': 'Season {n}',
  'item.originalLang': 'Written in {lang}.',
  'lang.name.en': 'English',
  'lang.name.ru': 'Russian',
  'rating': 'Rated {n} out of 10',

  'stats.title': 'Reading stats',
  'stats.readIn': 'read in {year}',
  'stats.readingNow': 'reading now',
  'stats.wantToRead': 'want to read',
  'stats.readSince': 'read since {year}',
  'stats.perMonth': 'Books per month',
  'stats.perYear': 'Books per year',
  'stats.year': 'Year',
  'stats.total': 'Total',
  'stats.asTable': 'Show as table',
  'stats.more': '+ {n} more',

  'about.elsewhere': 'Find me elsewhere',
  'cv.download': 'Download PDF',
  'cv.print': 'Print',
  'cv.contacts': 'Contacts',
  'contact.email': 'email',

  '404.title': 'Not found',
  '404.heading': 'This page wandered off.',
  '404.lead': 'It might have moved, or it never existed. Happens to the best of us.',
  '404.home': 'Back to the start',
  '404.notes': 'Read some notes',

  'date.saved': 'saved',
  'date.started': 'started',
  'date.finished': 'finished',
  'date.completed': 'completed',
  'date.watched': 'watched',
};

type Key = keyof typeof en;

const ru: Record<Key, string> = {
  'site.description': 'Мой уголок интернета: заметки, книжные полки и то, что хочется запомнить.',
  'site.titleSuffix': 'мой уголок интернета',
  'skip': 'Перейти к содержимому',
  'menu': 'Меню',
  'nav.main': 'Основное меню',
  'nav.home': 'Главная',
  'nav.notes': 'Заметки',
  'nav.bookshelves': 'Полки',
  'nav.things': 'Находки',
  'nav.about': 'Обо мне',
  'lang.switch': 'Язык',
  'footer.made': 'сделано с любопытством и слишком большим числом вкладок',
  'breadcrumbs': 'Навигация',
  'tags': 'Теги',

  'home.tagline': 'мой уголок интернета',
  'home.recentNotes': 'Свежие заметки',
  'home.allNotes': 'Все заметки →',
  'home.noNotes': 'Заметок пока нет.',
  'home.noNotesHint': 'Первая всегда даётся труднее всего.',
  'home.currently': 'Сейчас',
  'home.bookshelves': 'Полки →',
  'home.verb.books': 'читаю',
  'home.verb.courses': 'прохожу',
  'home.verb.tv-shows': 'смотрю',
  'home.things': 'Немного находок',
  'home.allThings': 'Все находки →',
  'home.explore': 'Разделы',
  'home.tile.notes': 'Короткие мысли, сырые идеи и то, что я узнала.',
  'home.tile.bookshelves': 'Книги и курсы.',
  'home.tile.things': 'Картинки, ссылки и маленькие открытия.',
  'home.tile.about': 'Кто стоит за этим уголком.',

  'notes.title': 'Заметки',
  'notes.meta': 'Короткие мысли, заметки и то, что я узнала.',
  'notes.lead': 'Короткие мысли, недодуманные идеи и то, что я узнала по пути.',
  'notes.rss': 'RSS-лента',
  'notes.empty': 'Заметок не нашлось.',
  'notes.emptyHint': 'Добавь Markdown-файл в src/content/notes/',
  'notes.more': 'Другие заметки',
  'notes.older': '← раньше',
  'notes.newer': 'позже →',
  'notes.related': 'Похожие заметки',
  'notes.untitled': 'Заметка от {date}',
  'rss.title': 'azh. — заметки',
  'rss.description': 'Короткие мысли и заметки из моего уголка интернета.',

  'things.title': 'Находки',
  'things.meta': 'Коллекция интересных находок: картинки, ссылки и маленькие открытия.',
  'things.lead': 'Картинки, ссылки, сайты и маленькие открытия, которые хочется сохранить.',
  'things.empty': 'Здесь пока пусто.',
  'things.emptyHint': 'Добавь Markdown-файл в src/content/things/',
  'things.saved': 'сохранено',
  'things.visit': 'Открыть {host}',
  'things.savedIn': '{title}: сохранено в находках.',
  'external': '(внешняя ссылка, откроется в новой вкладке)',
  'newTab': '(откроется в новой вкладке)',

  'shelves.title': 'Полки',
  'shelves.lead': 'Что я прочитала и чему научилась.',
  'shelves.all': 'Все {n} →',
  'shelves.open': 'Открыть →',
  'shelves.categories': 'Разделы полок',
  'shelves.filterStatus': 'Фильтр по статусу',
  'shelves.filterTag': 'Фильтр по тегу',
  'shelves.all.status': 'Все',
  'shelves.allTags': 'Все теги',
  'shelves.search': 'Искать {what}…',
  'shelves.sort': 'сортировка',
  'shelves.sort.recent': 'Недавние',
  'shelves.sort.title': 'По названию',
  'shelves.sort.rating': 'По оценке',
  'shelves.noMatch': 'На этой полке ничего не нашлось.',
  'shelves.noMatchHint': 'Попробуй другой статус или запрос покороче.',
  'shelves.shown': 'Показано: {n}',
  'shelves.earlier': 'Раньше',
  'shelves.inProgress': 'В процессе',
  'shelves.now.books': 'Читаю сейчас',
  'shelves.now.courses': 'Прохожу сейчас',
  'shelves.now.tv-shows': 'Смотрю сейчас',
  'shelves.addFile': 'Добавь Markdown-файл в src/content/{folder}/',
  'item.review': 'Рецензия',
  'item.notes': 'Заметки',
  'item.quotes': 'Цитаты',
  'item.learned': 'Что я узнала',
  'item.openOn': 'Открыть на {host}',
  'item.by': '{title}, {creator}',
  'item.coverOf': 'Обложка книги «{title}»',
  'item.posterOf': 'Постер «{title}»',
  'item.season': 'Сезон {n}',
  'item.originalLang': 'Текст только на {lang}.',
  'lang.name.en': 'английском',
  'lang.name.ru': 'русском',
  'rating': 'Оценка {n} из 10',

  'stats.title': 'Статистика чтения',
  'stats.readIn': 'прочитано в {year}',
  'stats.readingNow': 'читаю сейчас',
  'stats.wantToRead': 'хочу прочитать',
  'stats.readSince': 'прочитано с {year}',
  'stats.perMonth': 'Книги по месяцам',
  'stats.perYear': 'Книги по годам',
  'stats.year': 'Год',
  'stats.total': 'Всего',
  'stats.asTable': 'Показать таблицей',
  'stats.more': 'и ещё {n}',

  'about.elsewhere': 'Где меня найти',
  'cv.download': 'Скачать PDF',
  'cv.print': 'Распечатать',
  'cv.contacts': 'Контакты',
  'contact.email': 'почта',

  '404.title': 'Не найдено',
  '404.heading': 'Эта страница куда-то ушла.',
  '404.lead': 'Возможно, её перенесли, а может, её и не было. Бывает.',
  '404.home': 'На главную',
  '404.notes': 'Почитать заметки',

  'date.saved': 'сохранено',
  'date.started': 'начала',
  'date.finished': 'дочитала',
  'date.completed': 'закончила',
  'date.watched': 'посмотрела',
};

const dict: Record<Locale, Record<Key, string>> = { en, ru };

/** Translator for one locale: t('shelves.all', { n: 5 }). */
export function useTranslations(locale: Locale) {
  return (key: Key, vars: Record<string, string | number> = {}) =>
    dict[locale][key].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** "5 books" / "5 книг". */
export function booksCount(locale: Locale, n: number) {
  return locale === 'ru' ? `${n} ${pluralRu(n, 'книга', 'книги', 'книг')}` : `${n} ${n === 1 ? 'book' : 'books'}`;
}

/*
 * Tags are written once (in any language) in the content files.
 * This map gives each tag a label per language. Tags missing here are shown as written.
 */
const TAGS: Record<string, Record<Locale, string>> = {
  'детектив': { en: 'mystery', ru: 'детектив' },
  'проза': { en: 'fiction', ru: 'проза' },
  'классика': { en: 'classics', ru: 'классика' },
  'фэнтези': { en: 'fantasy', ru: 'фэнтези' },
  'любовный роман': { en: 'romance', ru: 'любовный роман' },
  'психология': { en: 'psychology', ru: 'психология' },
  'фантастика': { en: 'sci-fi', ru: 'фантастика' },
  'техническая': { en: 'technical', ru: 'техническая' },
  'нон-фикшн': { en: 'non-fiction', ru: 'нон-фикшн' },
  'ужасы': { en: 'horror', ru: 'ужасы' },
  'сайты': { en: 'websites', ru: 'сайты' },
  'комиксы': { en: 'comics', ru: 'комиксы' },
  'программирование': { en: 'programming', ru: 'программирование' },
  'математика': { en: 'maths', ru: 'математика' },
};

export const tagLabel = (tag: string, locale: Locale) => TAGS[tag]?.[locale] ?? tag;

/** Dates: "7 Nov 2026" / "7 ноября 2026"; month-only dates: "Jun 2026" / "июнь 2026". */
export function formatDateFor(locale: Locale, date: Date, monthOnly: boolean) {
  if (locale === 'ru') {
    return date
      .toLocaleDateString('ru-RU', { day: monthOnly ? undefined : 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .replace(/\s*г\.$/, '');
  }
  return date.toLocaleDateString('en-GB', { day: monthOnly ? undefined : 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Month names for charts and shelf groups. */
export function monthNames(locale: Locale, style: 'long' | 'short') {
  const tag = locale === 'ru' ? 'ru-RU' : 'en-GB';
  return Array.from({ length: 12 }, (_, m) => {
    const name = new Date(Date.UTC(2026, m, 1)).toLocaleDateString(tag, { month: style, timeZone: 'UTC' }).replace('.', '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}
