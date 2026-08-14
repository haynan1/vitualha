import rss from '@astrojs/rss';

import { SITE, TAGLINE } from '../config/site';
import { LOCALE_TAG, type Locale } from '../i18n/locales';
import { getArticles, getAuthor } from './articles';

/** Caminho publico do feed de cada idioma, usado na auto-referencia Atom. */
const FEED_PATH: Record<Locale, string> = {
  pt: 'rss.xml',
  en: 'en/rss.xml',
};

/**
 * Escapa texto que vai para dentro de `customData`. O @astrojs/rss trata esse
 * campo como XML pronto e nao o sanitiza — um `&` ou `<` vindo do conteudo
 * quebraria o feed inteiro, e um feed quebrado some do leitor sem avisar.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

  // Resolvidos em paralelo: sao leituras da mesma colecao ja carregada, e
  // encadear um await por artigo cresce com o acervo sem nenhum ganho.
  const authors = await Promise.all(articles.map((article) => getAuthor(article)));

  const feedUrl = new URL(FEED_PATH[locale], site).href;

  /**
   * `lastBuildDate` é a data do artigo mais recente, e nao a hora do build.
   * Usar a hora do build faria todo deploy — inclusive o que so mexe em CSS —
   * anunciar novidade para quem assina, e leitor que cria fama de gritar
   * lobo acaba consultado com menos frequencia.
   */
  const lastPublished = articles[0]?.entry.data.publishedAt;

  return rss({
    title: `${SITE.name} — ${locale === 'pt' ? 'Artigos' : 'Articles'}`,
    description: TAGLINE[locale],
    site,
    trailingSlash: true,
    /**
     * Sem isto o navegador abre o feed como arvore XML crua, com o aviso
     * "This XML file does not appear to have any style information".
     * Quem clica em "RSS" no rodape ve o endereco a assinar, e nao markup.
     */
    stylesheet: '/rss/styles.xsl',
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    items: articles.map((article, index) => ({
      title: article.entry.data.title,
      description: article.entry.data.summary,
      pubDate: article.entry.data.publishedAt,
      link: article.url,
      categories: article.entry.data.tags,
      customData: itemCustomData(authors[index]?.data.name),
    })),
    customData: [
      `<language>${LOCALE_TAG[locale].toLowerCase()}</language>`,
      // Auto-referencia exigida pela recomendacao do RSS Advisory Board: diz
      // ao agregador qual é o endereco canonico do feed, para que uma copia
      // servida em outro caminho nao vire uma segunda assinatura.
      `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
      ...(lastPublished ? [`<lastBuildDate>${lastPublished.toUTCString()}</lastBuildDate>`] : []),
      `<docs>https://www.rssboard.org/rss-specification</docs>`,
    ].join(''),
  });
}

/**
 * Autoria do item. Sai como `dc:creator` — e nao como o `author` do RSS 2.0,
 * que a especificacao define como endereco de e-mail. Publicar o e-mail de
 * quem assina o texto em todo agregador nao é aceitavel, e leitor nenhum
 * espera isso ali.
 *
 * Artigo sem autor sai sem o campo: a assinatura é da publicacao e a
 * autoridade vem das fontes citadas, entao nao ha pessoa a nomear.
 */
function itemCustomData(authorName: string | undefined): string | undefined {
  if (!authorName) return undefined;

  return `<dc:creator>${escapeXml(authorName)}</dc:creator>`;
}
