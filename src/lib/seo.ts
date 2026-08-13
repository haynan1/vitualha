import { SITE, TAGLINE } from '../config/site';
import { CATEGORIES, type CategoryKey } from '../config/categories';
import { LOCALE_TAG, LOCALES, DEFAULT_LOCALE, type Locale } from '../i18n/locales';
import { homeUrl } from '../i18n/routes';

/** Caminho relativo -> URL absoluta de producao. */
export function absolute(path: string, site: URL | undefined): string {
  if (!site) {
    throw new Error('astro.config.ts precisa definir `site` para gerar URLs absolutas');
  }
  return new URL(path, site).href;
}

/**
 * Serializa JSON-LD escapando `<`. Sem isso, um titulo contendo `</script>`
 * — vindo do CMS, portanto texto de terceiro — fecharia a tag e injetaria
 * markup arbitrario na pagina.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

type ArticleSchemaInput = {
  title: string;
  description: string;
  url: string;
  locale: Locale;
  publishedAt: Date;
  updatedAt?: Date | undefined;
  category: CategoryKey;
  image?: string | undefined;
  /** Ausente quando o artigo nao é assinado por uma pessoa. */
  author?: { name: string; url?: string | undefined; jobTitle?: string | undefined } | undefined;
  reviewer?: { name: string; jobTitle?: string | undefined } | undefined;
  site: URL | undefined;
};

export function organizationSchema(site: URL | undefined) {
  const profiles = Object.values(SITE.social).filter(Boolean);

  return {
    '@type': 'Organization',
    '@id': absolute('/#organization', site),
    name: SITE.legalName,
    url: absolute('/', site),
    email: SITE.email,
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
  };
}

export function websiteSchema(site: URL | undefined, locale: Locale) {
  return {
    '@type': 'WebSite',
    '@id': absolute('/#website', site),
    name: SITE.name,
    description: TAGLINE[locale],
    url: absolute(homeUrl(locale), site),
    inLanguage: LOCALE_TAG[locale],
    publisher: { '@id': absolute('/#organization', site) },
  };
}

/**
 * Article com autoria e revisao explicitas. Em conteudo de saude, quem
 * escreveu e quem revisou é justamente o que separa fonte confiavel de
 * conteudo generico aos olhos do buscador e do leitor.
 *
 * Quando o artigo nao tem assinatura pessoal, quem assina é a Organization —
 * por referencia ao no que ja existe no grafo, sem repetir os dados da marca.
 * `author` é campo exigido pelo Google em Article: omiti-lo custaria a
 * elegibilidade a resultado enriquecido, e preencher com uma pessoa
 * inventada seria pior ainda.
 */
export function articleSchema(input: ArticleSchemaInput) {
  const { site } = input;

  const author = input.author
    ? {
        '@type': 'Person',
        name: input.author.name,
        ...(input.author.jobTitle ? { jobTitle: input.author.jobTitle } : {}),
        ...(input.author.url ? { url: input.author.url } : {}),
      }
    : { '@id': absolute('/#organization', site) };

  return {
    '@type': 'Article',
    '@id': `${absolute(input.url, site)}#article`,
    headline: input.title,
    description: input.description,
    url: absolute(input.url, site),
    inLanguage: LOCALE_TAG[input.locale],
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    articleSection: CATEGORIES[input.category][input.locale].name,
    ...(input.image ? { image: [input.image] } : {}),
    author,
    ...(input.reviewer
      ? {
          reviewedBy: {
            '@type': 'Person',
            name: input.reviewer.name,
            ...(input.reviewer.jobTitle ? { jobTitle: input.reviewer.jobTitle } : {}),
          },
        }
      : {}),
    publisher: { '@id': absolute('/#organization', site) },
    isPartOf: { '@id': absolute('/#website', site) },
    mainEntityOfPage: absolute(input.url, site),
  };
}

export function breadcrumbSchema(
  trail: Array<{ name: string; url: string }>,
  site: URL | undefined,
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.url, site),
    })),
  };
}

export function faqSchema(faq: Array<{ question: string; answer: string }>) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Empacota os nós num unico bloco `@graph` — um <script> por pagina. */
export function graph(nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export type AlternateLinks = Array<{ hreflang: string; href: string }>;

/**
 * hreflang exige reciprocidade e um x-default. Sao geradas apenas as versoes
 * que existem de verdade naquele idioma.
 */
export function alternateLinks(
  urls: Partial<Record<Locale, string>>,
  site: URL | undefined,
): AlternateLinks {
  const links: AlternateLinks = [];

  for (const locale of LOCALES) {
    const url = urls[locale];
    if (url) links.push({ hreflang: LOCALE_TAG[locale], href: absolute(url, site) });
  }

  const fallback = urls[DEFAULT_LOCALE] ?? Object.values(urls)[0];
  if (fallback) links.push({ hreflang: 'x-default', href: absolute(fallback, site) });

  return links;
}
