import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { loadEnv } from 'vite';

import { remarkCallouts } from './src/plugins/remark-callouts';
import { rehypeInArticleAd } from './src/plugins/rehype-in-article-ad';
import { rehypeTableScroll } from './src/plugins/rehype-table-scroll';
import { DEFAULT_LOCALE, LOCALES } from './src/i18n/locales';

const mode = process.env.NODE_ENV ?? 'production';
const env = loadEnv(mode, process.cwd(), '');
const { PUBLIC_SITE_URL } = env;

/**
 * `site` is baked into canonicals, hreflang, RSS, sitemap and JSON-LD at build
 * time. It must be the real production origin, so a malformed value fails
 * loudly here instead of silently shipping wrong URLs to Google.
 *
 * A barra final é removida, e nao reprovada: "https://x.com/" e "https://x.com"
 * designam a mesma origem, sem ambiguidade nenhuma, e a barra é justamente o
 * que o navegador acrescenta sozinho ao copiar da barra de endereco — o
 * caminho mais provavel do valor ate a caixa de texto do GitHub. Reprovar isso
 * derruba o deploy sem proteger de nada (ja derrubou).
 *
 * Continua reprovando o que muda o significado: esquema que nao seja https,
 * caminho, porta ou query. Nesses casos nao da para adivinhar a intencao, e
 * publicar um canonical errado é pior do que nao publicar.
 */
const site = (PUBLIC_SITE_URL?.trim() || 'https://vitualha.com').replace(/\/+$/, '');

if (!/^https:\/\/[^/?#]+$/.test(site)) {
  throw new Error(
    `PUBLIC_SITE_URL invalido: "${PUBLIC_SITE_URL}". Use apenas a origem https, ex: https://vitualha.com`,
  );
}

export default defineConfig({
  site,

  /**
   * Hospedagem estatica (Apache/LiteSpeed) serve `/artigos/` como
   * `/artigos/index.html`. Trailing slash sempre presente elimina uma classe
   * inteira de redirect 301 e de canonical duplicado.
   */
  trailingSlash: 'always',
  build: {
    format: 'directory',
    /**
     * Nenhum <style> inline no HTML: permite Content-Security-Policy com
     * `style-src 'self'` sem 'unsafe-inline'. Ver public/.htaccess.
     */
    inlineStylesheets: 'never',
  },

  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: {
      // PT na raiz (/), EN prefixado (/en/).
      prefixDefaultLocale: false,
    },
  },

  vite: {
    build: {
      /**
       * Zero significa "nunca embutir": scripts e assets pequenos sairiam
       * inline no HTML por padrao, e script inline é justamente o que a CSP
       * de producao (script-src 'self', sem 'unsafe-inline') bloqueia.
       * scripts/verify-build.mjs falha o build se algum inline escapar.
       */
      assetsInlineLimit: 0,
    },
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

  image: {
    // Layout responsivo por padrao: srcset + sizes gerados automaticamente.
    responsiveStyles: true,
    layout: 'constrained',
  },

  markdown: {
    /**
     * Pipeline unified (remark/rehype) em vez do Sätteri, que é o padrao no
     * Astro 7. Sätteri é mais rapido, mas ainda nao suporta directives — a
     * base dos blocos de destaque (`:::dica`) que o editor usa — nem tem
     * equivalentes maduros para ancora de titulo e wrapper de tabela.
     *
     * O custo é irrelevante aqui: neste site o tempo de build é dominado pela
     * otimizacao de imagens, nao pelo parse de Markdown. Vale reavaliar
     * quando o ecossistema de plugins do Sätteri cobrir esses tres casos.
     */
    processor: unified({
      remarkPlugins: [remarkDirective, remarkCallouts],
      rehypePlugins: [
        // Precisa rodar antes do autolink: sem id no titulo, nao existe
        // ancora para o plugin ligar. Ids ja existentes sao preservados,
        // entao continua batendo com o `headings` que alimenta o sumario.
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: { class: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
            /**
             * A ancora nasce vazia e o `#` é desenhado por CSS
             * (.heading-anchor::after). Se o simbolo entrasse como texto no
             * titulo, ele vazaria para o `headings` que alimenta o sumario —
             * "O que é proteína#".
             */
            content: [],
          },
        ],
        rehypeTableScroll,
        /**
         * Anuncio no meio do artigo. Fica aqui, e nao num componente, porque
         * a posicao depende da estrutura do texto (antes da terceira secao) —
         * algo que so o pipeline de Markdown enxerga. Renderizado no
         * servidor: o espaco ja nasce reservado, sem pulo de layout.
         */
        [
          rehypeInArticleAd,
          {
            client: env['PUBLIC_ADSENSE_CLIENT']?.trim() ?? '',
            slot: env['PUBLIC_ADSENSE_SLOT_IN_ARTICLE']?.trim() ?? '',
            live: mode === 'production',
            label: 'Publicidade',
          },
        ],
      ],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: DEFAULT_LOCALE,
        locales: { pt: 'pt-BR', en: 'en-US' },
      },
      // Busca e editor nao sao conteudo: nao entram no sitemap.
      filter: (page) =>
        !page.includes('/busca/') && !page.includes('/search/') && !page.includes('/admin'),
    }),
  ],
});
