/**
 * Monetizacao por AdSense.
 *
 * Regras que valem para todo o site:
 *
 *  - Sem `PUBLIC_ADSENSE_CLIENT` definido, nenhum script de anuncio é
 *    carregado e nenhum espaco é reservado. O site continua exatamente como
 *    é hoje — a monetizacao é aditiva, nao uma dependencia.
 *  - Anuncio nao aparece em desenvolvimento. Clicar no proprio anuncio é
 *    trafego invalido e derruba a conta; no `npm run dev` entra um marcador
 *    visual no lugar, para conferir o layout sem carregar nada do Google.
 *  - Todo espaco tem altura minima reservada. Anuncio que empurra o texto
 *    depois de carregado estraga a leitura e piora o Core Web Vitals — que
 *    por sua vez derruba o proprio faturamento.
 */

/** ID do editor, no formato `ca-pub-0000000000000000`. */
export const ADSENSE_CLIENT: string = import.meta.env.PUBLIC_ADSENSE_CLIENT?.trim() ?? '';

/**
 * IDs de bloco criados no painel do AdSense. Cada posicao tem o seu para os
 * relatorios separarem desempenho por lugar da pagina.
 */
export const AD_SLOTS = {
  /** Dentro do artigo, depois da segunda secao. */
  inArticle: import.meta.env.PUBLIC_ADSENSE_SLOT_IN_ARTICLE?.trim() ?? '',
  /** Fim do artigo, antes das perguntas frequentes. */
  articleEnd: import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_END?.trim() ?? '',
  /** Coluna lateral do artigo, abaixo do sumario (so em telas largas). */
  sidebar: import.meta.env.PUBLIC_ADSENSE_SLOT_SIDEBAR?.trim() ?? '',
  /** Entre blocos nas paginas de listagem. */
  listing: import.meta.env.PUBLIC_ADSENSE_SLOT_LISTING?.trim() ?? '',
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;

/** Anuncios existem quando ha editor configurado. */
export const ADS_ENABLED: boolean = ADSENSE_CLIENT.length > 0;

/** Em producao o anuncio é real; em desenvolvimento, apenas o espaco marcado. */
export const ADS_LIVE: boolean = ADS_ENABLED && import.meta.env.PROD;

export function slotId(name: AdSlotName): string {
  return AD_SLOTS[name];
}

/** Um espaco só é renderizado quando tem bloco proprio configurado. */
export function hasSlot(name: AdSlotName): boolean {
  return ADS_ENABLED && AD_SLOTS[name].length > 0;
}

/**
 * Tipo de pagina, do ponto de vista da monetizacao.
 *
 * Existe porque o <head> é renderizado antes do corpo: quando o script do
 * Google precisa ser decidido, nenhum bloco de anuncio foi montado ainda, e
 * nao ha como perguntar "esta pagina tem anuncio?". A pagina declara.
 *
 * Sem essa declaracao a alternativa seria carregar o script em todo lugar — e
 * ai a politica de privacidade, os termos, a busca e o 404 abririam conexao
 * com o servidor de anuncio do Google sem exibir um bloco sequer. Justamente
 * na pagina que explica ao leitor como a publicidade funciona, isso é
 * indefensavel.
 */
export type AdSurface = 'listing' | 'article';

const SURFACE_SLOTS: Record<AdSurface, readonly AdSlotName[]> = {
  /** Home, indice de artigos e paginas de categoria. */
  listing: ['listing'],
  /** Pagina de leitura: meio do texto, fim do texto e coluna lateral. */
  article: ['inArticle', 'articleEnd', 'sidebar'],
};

/**
 * O script do Google so entra quando a pagina tem ao menos um bloco possivel.
 * Desligar todos os slots de uma superficie no ambiente ja tira o script dela,
 * sem tocar em nenhum componente.
 */
export function surfaceHasAds(surface: AdSurface | undefined): boolean {
  return surface !== undefined && SURFACE_SLOTS[surface].some(hasSlot);
}
