import type { Locale } from './locales';

/**
 * Dicionario de interface. O objeto `pt` define o contrato: qualquer chave
 * ausente ou sobrando em `en` vira erro de compilacao, entao os dois idiomas
 * nunca saem de sincronia sem o build avisar.
 */
const pt = {
  nav: {
    home: 'Início',
    articles: 'Artigos',
    about: 'Sobre',
    contact: 'Contato',
    menu: 'Menu',
    close: 'Fechar',
    skipToContent: 'Pular para o conteúdo',
    backToTop: 'Voltar ao topo',
    imageConverter: 'Conversor de imagens',
  },
  header: {
    searchLabel: 'Pesquisar',
    searchPlaceholder: 'Pesquisar alimentos, nutrientes, receitas...',
    themeLabel: 'Alternar tema',
    langLabel: 'Alternar idioma',
  },
  home: {
    heroEyebrow: 'Em destaque',
    heroCta: 'Ler artigo',
    featuredTitle: 'Artigos em destaque',
    categoriesTitle: 'Explore por categoria',
    categoriesSubtitle: 'Navegue pelos temas que mais interessam a você.',
    latestTitle: 'Últimos artigos',
    latestSubtitle: 'Conteúdo novo, baseado em evidências, publicado com frequência.',
    viewAllBtn: 'Ver todos os artigos',
    empty: 'Ainda não há artigos publicados.',
  },
  article: {
    publishedLabel: 'Publicado em',
    updatedLabel: 'Atualizado em',
    readTime: 'min de leitura',
    tocTitle: 'Neste artigo',
    referencesTitle: 'Fontes científicas',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Você também pode gostar',
    reviewedBy: 'Revisão técnica',
    shareTitle: 'Compartilhar',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',
    noTranslationNotice:
      'Este artigo ainda não possui tradução completa em inglês. Exibindo o conteúdo original em português.',
    medicalDisclaimer:
      'As informações publicadas na Vitualha possuem caráter educacional e informativo e não substituem orientação individual de médicos, nutricionistas ou outros profissionais de saúde.',
  },
  category: {
    featuredTitle: 'Em destaque',
    latestTitle: 'Últimos artigos',
    empty: 'Ainda não há artigos nesta categoria.',
    allTitle: 'Todos os artigos',
    allSubtitle: 'Todo o acervo de conteúdo, do mais recente ao mais antigo.',
    countOne: 'artigo',
    countMany: 'artigos',
  },
  search: {
    title: 'Buscar',
    subtitle: 'Encontre artigos por alimento, nutriente ou tema.',
    placeholder: 'O que você procura?',
    empty: 'Nenhum resultado encontrado.',
    loading: 'Buscando...',
    resultsFor: 'Resultados para',
    noScript: 'A busca precisa de JavaScript. Navegue pelas categorias abaixo.',
  },
  newsletter: {
    title: 'Nutrição que cabe na sua rotina',
    text: 'Receba novos conteúdos sobre alimentação, saúde e qualidade de vida diretamente no seu e-mail.',
    placeholder: 'Seu melhor e-mail',
    button: 'Quero receber',
    privacy: 'Sem spam. Cancele quando quiser.',
    fallbackCta: 'Fale com a gente',
  },
  footer: {
    brandDesc: 'Informação para transformar conhecimento em escolhas mais conscientes.',
    contentHeading: 'Conteúdo',
    institutionalHeading: 'Institucional',
    legalHeading: 'Legal',
    editorial: 'Política editorial',
    privacy: 'Política de privacidade',
    terms: 'Termos de uso',
    disclaimer:
      'As informações publicadas na Vitualha possuem caráter educacional e informativo e não substituem orientação individual de médicos, nutricionistas ou outros profissionais de saúde.',
    copyright: 'Todos os direitos reservados.',
    rss: 'Assinar RSS',
  },
  breadcrumb: {
    home: 'Início',
    label: 'Você está aqui',
  },
  notFound: {
    title: 'Página não encontrada',
    text: 'O conteúdo que você procura não existe ou mudou de endereço.',
    cta: 'Voltar para o início',
  },
  meta: {
    homeTitle: 'Nutrição baseada em evidências',
    homeDescription:
      'Artigos sobre alimentação, nutrientes e saúde, apoiados em evidência científica e com as fontes à vista.',
    articlesDescription:
      'Todo o acervo da Vitualha: alimentos, nutrientes, saúde, fitness e receitas.',
    searchDescription: 'Busque artigos sobre alimentos, nutrientes, saúde e receitas.',
  },
  /**
   * Conversor de imagens. Este bloco é o unico que atravessa a fronteira do
   * servidor: vai inteiro para o HTML como JSON e é lido pelo script da
   * ferramenta. Ver src/components/converter/ImageConverter.astro.
   *
   * `{x}` sao marcadores substituidos em tempo de execucao.
   */
  converter: {
    // Privacidade — a promessa central da ferramenta.
    privacyNotice:
      'Suas imagens são processadas diretamente no seu navegador e não são enviadas para nossos servidores.',

    // Area de envio
    dropTitle: 'Arraste suas imagens PNG aqui',
    dropSubtitle: 'ou clique para selecionar',
    dropButton: 'Selecionar imagens',
    dropHint: 'PNG até {size} por arquivo · no máximo {count} imagens',
    dropPaste: 'Você também pode colar uma imagem com Ctrl+V.',
    dropAria: 'Selecionar imagens PNG para converter',

    // Lista de arquivos
    queueTitle: 'Imagens selecionadas',
    remove: 'Remover',
    removeAria: 'Remover {name} da lista',
    transparency: 'Transparência',
    clearAll: 'Limpar lista',

    // Estados de cada arquivo
    statusWaiting: 'Aguardando',
    statusWorking: 'Convertendo',
    statusDone: 'Concluído',
    statusError: 'Erro',

    // Formato
    formatLegend: 'Converter para',
    formatUnsupported: 'Seu navegador não oferece suporte a este formato.',

    // Qualidade
    qualityLabel: 'Qualidade',
    qualityValue: 'Qualidade: {value}%',
    presetSmaller: 'Tamanho menor',
    presetBalanced: 'Equilibrado',
    presetHigh: 'Alta qualidade',
    presetMaximum: 'Máxima qualidade',

    // Transparência
    alphaTitle: 'PNG com transparência detectada',
    alphaText:
      'JPEG não suporta transparência. Escolha a cor que substituirá as áreas transparentes.',
    alphaWhite: 'Branco',
    alphaBlack: 'Preto',
    alphaCustom: 'Personalizado',
    alphaPick: 'Escolher cor de fundo',

    // Dimensões
    advanced: 'Configurações avançadas',
    sizeLegend: 'Dimensões',
    sizeOriginal: 'Manter resolução original',
    sizeResize: 'Redimensionar imagem',
    width: 'Largura',
    height: 'Altura',
    keepRatio: 'Manter proporção',
    sizePresetOriginal: 'Original',
    sizePresetHint: 'Reduz pelo maior lado. Nunca amplia.',

    // Ação
    convert: 'Converter imagens',
    converting: 'Convertendo...',
    progress: 'Convertendo {done} de {total} imagens',
    restart: 'Converter novas imagens',

    // Resultado
    resultsTitle: 'Resultado',
    before: 'Antes',
    after: 'Depois',
    reduction: 'Redução',
    originalSize: 'Tamanho original',
    newSize: 'Novo tamanho',
    grew: 'O arquivo convertido ficou {percent}% maior que o original.',
    download: 'Baixar imagem',
    downloadAria: 'Baixar {name}',
    downloadAll: 'Baixar tudo',
    compare: 'Comparar antes e depois',
    compareClose: 'Fechar comparação',
    compareAria: 'Arraste para comparar o original com o convertido',
    compareBefore: 'Original',
    compareAfter: 'Convertido',

    // Erros
    errorNotPng: 'Este arquivo não parece ser uma imagem PNG válida.',
    errorTooLarge: 'Esta imagem é maior que o limite de {size}.',
    errorTooManyPixels:
      'A imagem é muito grande para ser processada com segurança neste dispositivo.',
    errorTooManyFiles: 'A lista aceita no máximo {count} imagens de uma vez.',
    errorUnreadable: 'Não foi possível ler este arquivo.',
    errorEncode: 'Não foi possível converter esta imagem. Tente novamente.',
    errorUnsupported: 'Seu navegador não oferece suporte a este formato.',
    errorMemory: 'Não há memória suficiente neste dispositivo para converter esta imagem.',
    errorDecode: 'Não foi possível abrir esta imagem. O arquivo pode estar corrompido.',
    errorNoScript: 'O conversor precisa de JavaScript para funcionar no seu navegador.',
    errorRejected: '{count} arquivo(s) não entraram na lista.',
  },
} satisfies Record<string, Record<string, string>>;

export type UIDict = typeof pt;

const en: UIDict = {
  nav: {
    home: 'Home',
    articles: 'Articles',
    about: 'About',
    contact: 'Contact',
    menu: 'Menu',
    close: 'Close',
    skipToContent: 'Skip to content',
    backToTop: 'Back to top',
    imageConverter: 'Image converter',
  },
  header: {
    searchLabel: 'Search',
    searchPlaceholder: 'Search foods, nutrients, recipes...',
    themeLabel: 'Toggle theme',
    langLabel: 'Switch language',
  },
  home: {
    heroEyebrow: 'Featured',
    heroCta: 'Read article',
    featuredTitle: 'Featured articles',
    categoriesTitle: 'Explore by category',
    categoriesSubtitle: 'Browse the topics that matter most to you.',
    latestTitle: 'Latest articles',
    latestSubtitle: 'Fresh, evidence-based content, published regularly.',
    viewAllBtn: 'View all articles',
    empty: 'No articles published yet.',
  },
  article: {
    publishedLabel: 'Published on',
    updatedLabel: 'Updated on',
    readTime: 'min read',
    tocTitle: 'In this article',
    referencesTitle: 'Scientific sources',
    faqTitle: 'Frequently asked questions',
    relatedTitle: 'You might also like',
    reviewedBy: 'Technical review',
    shareTitle: 'Share',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    noTranslationNotice:
      'This article does not yet have a full English translation. Showing the original Portuguese content.',
    medicalDisclaimer:
      'Content published on Vitualha is for educational and informational purposes only and is not a substitute for personalized advice from physicians, dietitians, or other healthcare professionals.',
  },
  category: {
    featuredTitle: 'Featured',
    latestTitle: 'Latest articles',
    empty: 'No articles in this category yet.',
    allTitle: 'All articles',
    allSubtitle: 'The full archive, from newest to oldest.',
    countOne: 'article',
    countMany: 'articles',
  },
  search: {
    title: 'Search',
    subtitle: 'Find articles by food, nutrient or topic.',
    placeholder: 'What are you looking for?',
    empty: 'No results found.',
    loading: 'Searching...',
    resultsFor: 'Results for',
    noScript: 'Search requires JavaScript. Browse the categories below.',
  },
  newsletter: {
    title: 'Nutrition for everyday life',
    text: 'Receive new articles about nutrition, healthy eating and wellness directly in your inbox.',
    placeholder: 'Your best email',
    button: 'Subscribe',
    privacy: 'No spam. Unsubscribe anytime.',
    fallbackCta: 'Get in touch',
  },
  footer: {
    brandDesc: 'Information that turns knowledge into more conscious choices.',
    contentHeading: 'Content',
    institutionalHeading: 'About',
    legalHeading: 'Legal',
    editorial: 'Editorial policy',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    disclaimer:
      'Content published on Vitualha is for educational and informational purposes only and is not a substitute for personalized advice from physicians, dietitians, or other healthcare professionals.',
    copyright: 'All rights reserved.',
    rss: 'Subscribe via RSS',
  },
  breadcrumb: {
    home: 'Home',
    label: 'You are here',
  },
  notFound: {
    title: 'Page not found',
    text: 'The content you are looking for does not exist or has moved.',
    cta: 'Back to home',
  },
  meta: {
    homeTitle: 'Evidence-based nutrition',
    homeDescription:
      'Articles about food, nutrients and health, grounded in scientific evidence with the sources in plain sight.',
    articlesDescription:
      'The full Vitualha archive: foods, nutrients, health, fitness and recipes.',
    searchDescription: 'Search articles about foods, nutrients, health and recipes.',
  },
  converter: {
    privacyNotice:
      'Your images are processed directly in your browser and are not uploaded to our servers.',

    dropTitle: 'Drop your PNG images here',
    dropSubtitle: 'or click to select',
    dropButton: 'Select images',
    dropHint: 'PNG up to {size} per file · {count} images at most',
    dropPaste: 'You can also paste an image with Ctrl+V.',
    dropAria: 'Select PNG images to convert',

    queueTitle: 'Selected images',
    remove: 'Remove',
    removeAria: 'Remove {name} from the list',
    transparency: 'Transparency',
    clearAll: 'Clear list',

    statusWaiting: 'Waiting',
    statusWorking: 'Converting',
    statusDone: 'Done',
    statusError: 'Error',

    formatLegend: 'Convert to',
    formatUnsupported: 'Your browser does not support this format.',

    qualityLabel: 'Quality',
    qualityValue: 'Quality: {value}%',
    presetSmaller: 'Smaller file',
    presetBalanced: 'Balanced',
    presetHigh: 'High quality',
    presetMaximum: 'Maximum quality',

    alphaTitle: 'Transparent PNG detected',
    alphaText:
      'JPEG does not support transparency. Choose the colour that will replace transparent areas.',
    alphaWhite: 'White',
    alphaBlack: 'Black',
    alphaCustom: 'Custom',
    alphaPick: 'Pick a background colour',

    advanced: 'Advanced settings',
    sizeLegend: 'Dimensions',
    sizeOriginal: 'Keep original resolution',
    sizeResize: 'Resize image',
    width: 'Width',
    height: 'Height',
    keepRatio: 'Keep aspect ratio',
    sizePresetOriginal: 'Original',
    sizePresetHint: 'Scales down by the longest edge. Never upscales.',

    convert: 'Convert images',
    converting: 'Converting...',
    progress: 'Converting {done} of {total} images',
    restart: 'Convert new images',

    resultsTitle: 'Result',
    before: 'Before',
    after: 'After',
    reduction: 'Reduction',
    originalSize: 'Original size',
    newSize: 'New size',
    grew: 'The converted file is {percent}% larger than the original.',
    download: 'Download image',
    downloadAria: 'Download {name}',
    downloadAll: 'Download all',
    compare: 'Compare before and after',
    compareClose: 'Close comparison',
    compareAria: 'Drag to compare the original with the converted image',
    compareBefore: 'Original',
    compareAfter: 'Converted',

    errorNotPng: 'This file does not look like a valid PNG image.',
    errorTooLarge: 'This image is larger than the {size} limit.',
    errorTooManyPixels: 'This image is too large to be processed safely on this device.',
    errorTooManyFiles: 'The list accepts at most {count} images at a time.',
    errorUnreadable: 'This file could not be read.',
    errorEncode: 'This image could not be converted. Please try again.',
    errorUnsupported: 'Your browser does not support this format.',
    errorMemory: 'There is not enough memory on this device to convert this image.',
    errorDecode: 'This image could not be opened. The file may be corrupted.',
    errorNoScript: 'The converter needs JavaScript to run in your browser.',
    errorRejected: '{count} file(s) were not added to the list.',
  },
};

export const UI: Record<Locale, UIDict> = { pt, en };

export function t(locale: Locale): UIDict {
  return UI[locale];
}
