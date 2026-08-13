import rss from '@astrojs/rss';

import { SITE, TAGLINE } from '../config/site';
import { LOCALE_TAG, type Locale } from '../i18n/locales';
import { getArticles } from './articles';

/**
 * Feed por idioma. Um unico feed misturando portugues e ingles obrigaria o
 * assinante a receber metade do conteudo em uma lingua que talvez nao leia.
 *
 * Artigos exibidos por fallback ficam de fora do feed em ingles: quem assina
 * o feed em ingles nao deve receber texto em portugues.
 */
export async function localizedFeed(locale: Locale, site: URL | undefined) {
  if (!site) throw new Error('astro.config.ts precisa definir `site` para gerar o RSS');

  const articles = (await getArticles(locale)).filter((article) => !article.isFallback);

  return rss({
    title: `${SITE.name} — ${locale === 'pt' ? 'Artigos' : 'Articles'}`,
    description: TAGLINE[locale],
    site,
    trailingSlash: true,
    items: articles.map((article) => ({
      title: article.entry.data.title,
      description: article.entry.data.summary,
      pubDate: article.entry.data.publishedAt,
      link: article.url,
      categories: article.entry.data.tags,
    })),
    customData: `<language>${LOCALE_TAG[locale].toLowerCase()}</language>`,
  });
}
