import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * Segmentos de URL traduzidos. URL em portugues para leitor brasileiro e em
 * ingles para leitor internacional — os dois idiomas competem em buscas
 * diferentes, entao nenhum deles carrega o slug do outro.
 */
export const ROUTE_SEGMENTS = {
  pt: {
    articles: 'artigos',
    category: 'categoria',
    search: 'busca',
    about: 'sobre',
    contact: 'contato',
    privacy: 'privacidade',
    terms: 'termos',
    editorial: 'politica-editorial',
    tools: 'ferramentas',
    imageConverter: 'conversor-de-imagens',
  },
  en: {
    articles: 'articles',
    category: 'category',
    search: 'search',
    about: 'about',
    contact: 'contact',
    privacy: 'privacy',
    terms: 'terms',
    editorial: 'editorial-policy',
    tools: 'tools',
    imageConverter: 'image-converter',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type RouteKey = keyof (typeof ROUTE_SEGMENTS)['pt'];

/**
 * Paginas institucionais geradas a partir da colecao `pages`. A chave é o
 * nome do arquivo em src/content/pages/<idioma>/ e tambem o segmento
 * traduzido da URL — uma lista, duas responsabilidades, zero divergencia.
 */
export const CONTENT_PAGE_KEYS = ['about', 'contact', 'editorial', 'privacy', 'terms'] as const;

export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[number];

/** Prefixo do idioma: '' para o idioma padrao, '/en' para os demais. */
export function localeBase(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Monta um caminho absoluto ja normalizado (barra inicial e final).
 * Toda URL interna do site passa por aqui — trocar um segmento traduzido
 * atualiza o site inteiro sem caca a string solta.
 */
export function path(locale: Locale, ...segments: Array<string | undefined>): string {
  const parts = segments
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);

  return `${localeBase(locale)}/${parts.length ? `${parts.join('/')}/` : ''}`;
}

export function route(locale: Locale, key: RouteKey, ...rest: string[]): string {
  return path(locale, ROUTE_SEGMENTS[locale][key], ...rest);
}

export const homeUrl = (locale: Locale): string => path(locale);
export const articlesUrl = (locale: Locale): string => route(locale, 'articles');
export const articleUrl = (locale: Locale, slug: string): string => route(locale, 'articles', slug);
export const categoryUrl = (locale: Locale, slug: string): string =>
  route(locale, 'category', slug);
export const searchUrl = (locale: Locale): string => route(locale, 'search');

/**
 * Ferramentas ficam sob um segmento proprio (`/ferramentas/`, `/en/tools/`)
 * em vez de na raiz: separa utilitario de conteudo editorial na URL, no
 * breadcrumb e nos relatorios de busca, e abre espaco para a proxima sem
 * reorganizar nada.
 */
export const imageConverterUrl = (locale: Locale): string =>
  path(locale, ROUTE_SEGMENTS[locale].tools, ROUTE_SEGMENTS[locale].imageConverter);
