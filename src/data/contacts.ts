/*
 * Contacts shown in the footer, on About and on /cv.
 * Leave a value empty ('') to hide that contact everywhere.
 */
export const contacts = {
  /** Email is split in two so the full address never appears in the page source. */
  email: { user: '', domain: '' }, // e.g. { user: 'hello', domain: 'example.com' }
  telegram: 'safinalina17',
  instagram: 'safinalina17',
  github: '', // GitHub username
};

export interface ContactLink {
  label: string;
  handle: string;
  href: string;
}

/** Public profile links (email is handled separately by EmailLink). */
export function profileLinks(): ContactLink[] {
  const links: ContactLink[] = [];
  if (contacts.telegram) {
    links.push({ label: 'Telegram', handle: `@${contacts.telegram}`, href: `https://t.me/${contacts.telegram}` });
  }
  if (contacts.instagram) {
    links.push({ label: 'Instagram', handle: `@${contacts.instagram}`, href: `https://instagram.com/${contacts.instagram}` });
  }
  if (contacts.github) {
    links.push({ label: 'GitHub', handle: contacts.github, href: `https://github.com/${contacts.github}` });
  }
  return links;
}

export const hasEmail = () => Boolean(contacts.email.user && contacts.email.domain);
