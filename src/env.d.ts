/// <reference types="astro/client" />

/**
 * Variaveis de ambiente do site, tipadas.
 *
 * Sem esta declaracao, `import.meta.env.PUBLIC_*` chega como `any` e some do
 * radar do type-checker — justamente nos pontos que decidem se a newsletter e
 * o analytics existem na pagina.
 *
 * Todas sao opcionais: ausente significa "recurso desligado", nunca erro.
 * Valores com prefixo PUBLIC_ vao para o HTML — nenhum segredo aqui.
 */
interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_NEWSLETTER_ACTION?: string;
  readonly PUBLIC_NEWSLETTER_FIELD?: string;
  readonly PUBLIC_ANALYTICS_SRC?: string;
  readonly PUBLIC_ANALYTICS_ID?: string;
  readonly PUBLIC_ADSENSE_CLIENT?: string;
  readonly PUBLIC_ADSENSE_SLOT_IN_ARTICLE?: string;
  readonly PUBLIC_ADSENSE_SLOT_ARTICLE_END?: string;
  readonly PUBLIC_ADSENSE_SLOT_SIDEBAR?: string;
  readonly PUBLIC_ADSENSE_SLOT_LISTING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
