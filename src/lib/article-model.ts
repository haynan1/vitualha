import type { CategoryKey } from '../config/categories';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales';

/**
 * Nucleo de regras de conteudo, isolado do `astro:content` de proposito:
 * funcoes puras sobre dados simples sao testaveis sem build e sao onde moram
 * as decisoes que realmente podem quebrar o site (traducao ausente, slug,
 * ordenacao, relacionados).
 */

export type EntryLike = {
  id: string;
  data: {
    publishedAt: Date;
    updatedAt?: Date | undefined;
    draft: boolean;
    featured: boolean;
    category: CategoryKey;
    tags: string[];
    permalink?: string | undefined;
  };
};

export type LocalizedEntry<T extends EntryLike> = {
  /** Chave de traducao — o nome do arquivo, igual nos dois idiomas. */
  key: string;
  /** Idioma da pagina que sera gerada. */
  locale: Locale;
  /** Idioma real do texto: difere de `locale` quando é conteudo de fallback. */
  contentLocale: Locale;
  /** true quando o idioma pedido ainda nao tem traducao deste artigo. */
  isFallback: boolean;
  slug: string;
  entry: T;
};

export class ContentIdError extends Error {}

/**
 * `pt/proteina-quanto-precisamos` => { locale: 'pt', key: 'proteina-...' }.
 * Subpastas dentro do idioma sao preservadas na chave.
 */
export function parseEntryId(id: string): { locale: Locale; key: string } {
  const [first, ...rest] = id.split('/');

  if (!isLocale(first) || rest.length === 0) {
    throw new ContentIdError(
      `Arquivo de conteudo fora do padrao: "${id}". Esperado <idioma>/<nome>.md, ex: pt/proteina.md`,
    );
  }

  return { locale: first, key: rest.join('/') };
}

/** Ultimo segmento da chave, salvo quando o frontmatter define um slug proprio. */
export function entrySlug(entry: EntryLike): string {
  if (entry.data.permalink) return entry.data.permalink;
  const { key } = parseEntryId(entry.id);
  return key.split('/').pop() ?? key;
}

/** Mais recente primeiro; empate resolvido pela chave para build deterministico. */
export function byDateDesc(a: EntryLike, b: EntryLike): number {
  const delta = b.data.publishedAt.getTime() - a.data.publishedAt.getTime();
  return delta !== 0 ? delta : a.id.localeCompare(b.id);
}

/**
 * Monta o acervo de um idioma. Quando o artigo ainda nao foi traduzido, a
 * versao no idioma padrao ocupa o lugar e é marcada como fallback — a pagina
 * existe, é indexavel pelo canonical correto e avisa o leitor, em vez de
 * devolver 404 para metade do site.
 */
export function buildLocaleIndex<T extends EntryLike>(
  entries: readonly T[],
  locale: Locale,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): Array<LocalizedEntry<T>> {
  const published = entries.filter((entry) => includeDrafts || !entry.data.draft);

  const byLocale = new Map<Locale, Map<string, T>>();
  for (const entry of published) {
    const { locale: entryLocale, key } = parseEntryId(entry.id);
    const bucket = byLocale.get(entryLocale) ?? new Map<string, T>();
    bucket.set(key, entry);
    byLocale.set(entryLocale, bucket);
  }

  const primary = byLocale.get(locale) ?? new Map<string, T>();
  const fallbackSource =
    locale === DEFAULT_LOCALE
      ? new Map<string, T>()
      : (byLocale.get(DEFAULT_LOCALE) ?? new Map<string, T>());

  const keys = new Set<string>([...primary.keys(), ...fallbackSource.keys()]);

  const localized: Array<LocalizedEntry<T>> = [];
  for (const key of keys) {
    const own = primary.get(key);
    const entry = own ?? fallbackSource.get(key);
    if (!entry) continue;

    localized.push({
      key,
      locale,
      contentLocale: own ? locale : DEFAULT_LOCALE,
      isFallback: !own,
      slug: entrySlug(entry),
      entry,
    });
  }

  return localized.sort((a, b) => byDateDesc(a.entry, b.entry));
}

/**
 * Relacionados por afinidade real: mesma categoria pesa mais que tag em comum,
 * e o desempate é sempre pelo artigo mais recente. Nunca devolve o proprio
 * artigo nem outra traducao dele.
 */
export function selectRelated<A extends Pick<LocalizedEntry<EntryLike>, 'key' | 'entry'>>(
  current: A,
  pool: readonly A[],
  limit: number,
): A[] {
  const currentTags = new Set(current.entry.data.tags);

  return pool
    .filter((candidate) => candidate.key !== current.key)
    .map((candidate) => {
      const sameCategory = candidate.entry.data.category === current.entry.data.category ? 3 : 0;
      const sharedTags = candidate.entry.data.tags.filter((tag) => currentTags.has(tag)).length;
      return { candidate, score: sameCategory + sharedTags };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.candidate.entry, b.candidate.entry))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export type HomeComposition<A> = {
  /** Artigo de abertura. Ausente quando o acervo esta vazio. */
  hero: A | undefined;
  /** Bloco de destaques logo abaixo do hero. */
  featured: A[];
  /** Grade cronologica. */
  latest: A[];
  /** true quando ainda ha artigos alem dos exibidos na home. */
  hasMore: boolean;
};

/**
 * Distribui o acervo nos blocos da home sem repetir nenhum artigo: os
 * marcados como `featured` sobem para o topo, o resto segue em ordem
 * cronologica. Cada artigo aparece exatamente uma vez.
 */
export function composeHome<A extends Pick<LocalizedEntry<EntryLike>, 'entry'>>(
  articles: readonly A[],
  limits: { featured: number; latest: number },
): HomeComposition<A> {
  const flagged = articles.filter((article) => article.entry.data.featured);
  const others = articles.filter((article) => !article.entry.data.featured);
  const ordered = [...flagged, ...others];

  const [hero, ...remaining] = ordered;
  const featured = remaining.slice(0, limits.featured);
  const latest = remaining.slice(featured.length, featured.length + limits.latest);

  return {
    hero,
    featured,
    latest,
    hasMore: remaining.length > featured.length + latest.length,
  };
}
