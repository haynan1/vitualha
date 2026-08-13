import { LOCALE_TAG, type Locale } from '../i18n/locales';

/**
 * Datas de frontmatter (`2026-08-10`) sao interpretadas como meia-noite UTC.
 * Formatar no fuso local jogaria a data um dia para tras no Brasil (UTC-3),
 * entao toda formatacao é fixada em UTC.
 */
const TIME_ZONE = 'UTC';

/** `10 ago 2026` (pt) / `Aug 10, 2026` (en). */
export function formatDate(date: Date, locale: Locale): string {
  const parts = new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const month = get('month').replace(/\.$/, '');
  const day = get('day');
  const year = get('year');

  return locale === 'pt' ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}

/** `2026-08-10` — valor de <time datetime> e do JSON-LD. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
