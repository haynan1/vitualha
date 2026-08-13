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
    backToTop: 'Voltar ao topo',
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
      'Artigos sobre alimentação, nutrientes e saúde, escritos por nutricionistas e apoiados em ciência.',
    articlesDescription:
      'Todo o acervo da Vitualha: alimentos, nutrientes, saúde, fitness e receitas.',
    searchDescription: 'Busque artigos sobre alimentos, nutrientes, saúde e receitas.',
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
    backToTop: 'Back to top',
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
      'Articles about food, nutrients and health, written by dietitians and grounded in science.',
    articlesDescription:
      'The full Vitualha archive: foods, nutrients, health, fitness and recipes.',
    searchDescription: 'Search articles about foods, nutrients, health and recipes.',
  },
};

export const UI: Record<Locale, UIDict> = { pt, en };

export function t(locale: Locale): UIDict {
  return UI[locale];
}
