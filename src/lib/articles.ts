import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

import { HOME_LAYOUT } from '../config/site';
import type { CategoryKey } from '../config/categories';
import { LOCALES, type Locale } from '../i18n/locales';
import { articleUrl, homeUrl } from '../i18n/routes';
import {
  buildLocaleIndex,
  composeHome,
  selectRelated,
  type HomeComposition,
  type LocalizedEntry,
} from './article-model';
import { readingMinutes } from './reading-time';

export type BlogEntry = CollectionEntry<'blog'>;
export type AuthorEntry = CollectionEntry<'authors'>;

export type Article = LocalizedEntry<BlogEntry> & {
  /** Estimativa de leitura em minutos, calculada do texto real. */
  minutes: number;
  /** URL canonica da pagina no idioma corrente. */
  url: string;
};

/**
 * Rascunhos aparecem no `astro dev` para revisao e somem do build de
 * producao. A regra vive num lugar so para nao existir a chance de um
 * rascunho vazar por descuido de uma pagina especifica.
 */
const INCLUDE_DRAFTS = import.meta.env.DEV;

const indexCache = new Map<Locale, Article[]>();

function decorate(localized: LocalizedEntry<BlogEntry>): Article {
  return {
    ...localized,
    minutes: readingMinutes(localized.entry.body ?? ''),
    url: articleUrl(localized.locale, localized.slug),
  };
}

/** Acervo completo de um idioma, do mais recente ao mais antigo. */
export async function getArticles(locale: Locale): Promise<Article[]> {
  const cached = indexCache.get(locale);
  if (cached) return cached;

  const entries = await getCollection('blog');
  const articles = buildLocaleIndex(entries, locale, { includeDrafts: INCLUDE_DRAFTS }).map(
    decorate,
  );

  indexCache.set(locale, articles);
  return articles;
}

export async function getArticleBySlug(locale: Locale, slug: string): Promise<Article | undefined> {
  const articles = await getArticles(locale);
  return articles.find((article) => article.slug === slug);
}

export async function getArticlesByCategory(
  locale: Locale,
  category: CategoryKey,
): Promise<Article[]> {
  const articles = await getArticles(locale);
  return articles.filter((article) => article.entry.data.category === category);
}

export async function getHome(locale: Locale): Promise<HomeComposition<Article>> {
  const articles = await getArticles(locale);
  return composeHome(articles, { featured: HOME_LAYOUT.featured, latest: HOME_LAYOUT.latest });
}

export async function getRelated(article: Article): Promise<Article[]> {
  const articles = await getArticles(article.locale);
  return selectRelated(article, articles, HOME_LAYOUT.related);
}

/**
 * Destino do seletor de idioma a partir de um artigo. Se o outro idioma nao
 * tiver aquele artigo nem fallback, cai na home daquele idioma — o seletor
 * nunca leva o leitor para um 404.
 */
export async function translationUrl(key: string, target: Locale): Promise<string> {
  const articles = await getArticles(target);
  const match = articles.find((article) => article.key === key);
  return match ? match.url : homeUrl(target);
}

/** Mapa de urls equivalentes por idioma — base das tags hreflang. */
export async function alternateUrls(key: string): Promise<Partial<Record<Locale, string>>> {
  const alternates: Partial<Record<Locale, string>> = {};

  for (const locale of LOCALES) {
    const articles = await getArticles(locale);
    const match = articles.find((article) => article.key === key);
    // Paginas de fallback nao sao versao traduzida: anuncia-las como
    // alternativa em ingles entregaria texto em portugues a quem pediu ingles.
    if (match && !match.isFallback) alternates[locale] = match.url;
  }

  return alternates;
}

/**
 * O tipo de `getEntry` promete que a referencia sempre resolve; o
 * comportamento real, nao. Com um autor inexistente o Astro registra o aviso
 * e devolve undefined, e a pagina quebra depois com
 * "Cannot read properties of undefined" — mensagem que nao diz o que
 * consertar. O `as` abaixo existe justamente para permitir a checagem que o
 * tipo considera desnecessaria, trocando o TypeError por uma instrucao.
 */
function requireEntry(
  entry: AuthorEntry,
  article: Article,
  field: string,
  id: string,
): AuthorEntry {
  if ((entry as AuthorEntry | undefined) === undefined) {
    throw new Error(
      `Autor "${id}" (campo ${field} de ${article.entry.id}) nao existe. ` +
        `Crie src/content/authors/${id}.md ou corrija o campo.`,
    );
  }

  return entry;
}

export async function getAuthor(article: Article): Promise<AuthorEntry | undefined> {
  const reference = article.entry.data.author;
  if (!reference) return undefined;

  return requireEntry(await getEntry(reference), article, 'author', reference.id);
}

export async function getReviewer(article: Article): Promise<AuthorEntry | undefined> {
  const reference = article.entry.data.reviewer;
  if (!reference) return undefined;

  return requireEntry(await getEntry(reference), article, 'reviewer', reference.id);
}
