/**
 * Fonte unica de verdade dos idiomas. Importado tanto pelo astro.config.ts
 * (Node) quanto pelo codigo da aplicacao — por isso nao depende de nada.
 */
export const LOCALES = ['pt', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt';

/** Tag BCP-47 usada em <html lang>, hreflang, OpenGraph e RSS. */
export const LOCALE_TAG: Record<Locale, string> = {
  pt: 'pt-BR',
  en: 'en-US',
};

export const LOCALE_LABEL: Record<Locale, string> = {
  pt: 'PT',
  en: 'EN',
};

export const LOCALE_NAME: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
