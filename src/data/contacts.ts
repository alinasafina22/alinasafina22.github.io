/*
 * Contacts shown in the footer, on About and on /cv.
 * Leave a value empty ('') to hide that contact everywhere.
 */
export const contacts = {
  /** Email is split in two so the full address never appears in the page source. */
  email: { user: 'alinasafina22', domain: 'gmail.com' },
  telegram: 'safinalina17',
  instagram: 'safinalina17',
  github: 'alinasafina22',
};

export interface ContactLink {
  label: string;
  handle: string;
  href: string;
  /** Personal profiles are left out of the CV. */
  personal?: boolean;
}

/** Public profile links (email is handled separately by EmailLink). */
export function profileLinks(workOnly = false): ContactLink[] {
  const links: ContactLink[] = [];
  if (contacts.telegram) {
    links.push({ label: 'Telegram', handle: `@${contacts.telegram}`, href: `https://t.me/${contacts.telegram}` });
  }
  if (contacts.instagram) {
    links.push({ label: 'Instagram', handle: `@${contacts.instagram}`, href: `https://instagram.com/${contacts.instagram}`, personal: true });
  }
  if (contacts.github) {
    links.push({ label: 'GitHub', handle: contacts.github, href: `https://github.com/${contacts.github}` });
  }
  return workOnly ? links.filter((l) => !l.personal) : links;
}

export const hasEmail = () => Boolean(contacts.email.user && contacts.email.domain);
