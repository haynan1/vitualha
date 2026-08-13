import type { Element, Root, RootContent } from 'hast';

export type InArticleAdOptions = {
  /** ID do editor (`ca-pub-...`). Vazio desliga a insercao. */
  client: string;
  /** ID do bloco criado no painel do AdSense. Vazio desliga a insercao. */
  slot: string;
  /** Em desenvolvimento entra apenas o marcador visual, sem script do Google. */
  live: boolean;
  /** Rotulo exibido acima do bloco. */
  label: string;
};

/**
 * Insere um bloco de anuncio dentro do artigo, logo antes da terceira secao.
 *
 * Essa é a posicao de maior valor num texto longo — o leitor ja se
 * comprometeu com a leitura — e a insercao acontece no servidor, no proprio
 * HTML, e nao por JavaScript depois: assim o espaco ja nasce reservado e o
 * texto nao pula quando o anuncio carrega.
 *
 * Duas condicoes limitam onde ele entra:
 *
 *  1. Apenas arquivos de `src/content/blog/`. O plugin roda sobre todo o
 *     Markdown do projeto, e as paginas institucionais tambem tem varias
 *     secoes — sem o filtro, a politica de privacidade ganharia um anuncio no
 *     meio do texto que explica como a publicidade funciona. Alem de pessimo
 *     para o leitor, é justamente o tipo de pagina onde o proprio AdSense nao
 *     quer anuncio.
 *  2. Apenas artigos com pelo menos quatro secoes. Em texto curto, anuncio no
 *     meio interrompe mais do que rende.
 */
const MIN_SECTIONS = 4;
const INSERT_BEFORE_HEADING = 3;
const ARTICLES_DIR = /[/\\]content[/\\]blog[/\\]/;

/**
 * Arquivo em processamento. O unified entrega um VFile, mas o campo util
 * varia conforme quem monta o pipeline — por isso todos sao opcionais e a
 * decisao é tomada pelo caminho que estiver disponivel.
 */
type MarkdownFile = {
  path?: string | undefined;
  history?: string[] | undefined;
  data?: { astro?: { fileUrl?: string | undefined } | undefined } | undefined;
};

/**
 * Caminho do arquivo de origem, ou string vazia quando nao da para saber.
 *
 * O parametro entra como `unknown`, e nao como VFile, de proposito: `vfile` é
 * dependencia transitiva do pipeline de Markdown, nao do projeto. Importar o
 * tipo de la amarraria este plugin a uma versao que o nosso package.json nao
 * declara — e o type-check quebraria no dia em que o @astrojs/markdown-remark
 * subisse de major. Alem disso, `unknown` é o unico tipo que o unified aceita
 * de volta sem reclamar: parametro de funcao é contravariante, entao qualquer
 * formato mais especifico aqui torna o transformer incompativel com
 * `RehypePlugin`. O formato real é conferido em tempo de execucao abaixo.
 */
function sourcePath(file: unknown): string {
  if (typeof file !== 'object' || file === null) return '';

  const { path, history, data } = file as MarkdownFile;

  if (typeof path === 'string') return path;
  if (typeof history?.[0] === 'string') return history[0];
  if (typeof data?.astro?.fileUrl === 'string') return data.astro.fileUrl;

  return '';
}

function adElement(options: InArticleAdOptions): Element {
  const unit: Element = options.live
    ? {
        type: 'element',
        tagName: 'ins',
        properties: {
          className: ['adsbygoogle', 'ad__unit'],
          style: 'display:block',
          'data-ad-client': options.client,
          'data-ad-slot': options.slot,
          'data-ad-format': 'fluid',
          'data-ad-layout': 'in-article',
        },
        children: [],
      }
    : {
        type: 'element',
        tagName: 'div',
        properties: { className: ['ad__placeholder'] },
        children: [{ type: 'text', value: 'inArticle' }],
      };

  return {
    type: 'element',
    tagName: 'aside',
    properties: {
      className: ['ad', 'ad--in-article'],
      style: '--ad-min-height: 320px;',
      'aria-label': options.label,
      'data-pagefind-ignore': 'true',
    },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['ad__label'] },
        children: [{ type: 'text', value: options.label }],
      },
      unit,
    ],
  };
}

export function rehypeInArticleAd(options: InArticleAdOptions) {
  return (tree: Root, file: unknown): undefined => {
    if (!options.client || !options.slot) return;
    if (!ARTICLES_DIR.test(sourcePath(file))) return;

    const headings: number[] = [];

    tree.children.forEach((node: RootContent, index: number) => {
      if (node.type === 'element' && node.tagName === 'h2') headings.push(index);
    });

    if (headings.length < MIN_SECTIONS) return;

    const target = headings[INSERT_BEFORE_HEADING - 1];
    if (target === undefined) return;

    tree.children.splice(target, 0, adElement(options));
  };
}
