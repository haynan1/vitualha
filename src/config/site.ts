import type { Locale } from '../i18n/locales';

/**
 * Identidade da publicacao. Tudo que é marca (nome, autoria institucional,
 * redes, contato) vive aqui; tudo que é ambiente (dominio, integracoes) vem
 * de variavel de ambiente. Ver .env.example.
 */
export const SITE = {
  name: 'Nutrição em Ação',
  shortName: 'Nutrição em Ação',
  /** Iniciais do logotipo. */
  monogram: 'N',
  email: 'contato@nutricaoemacao.com.br',
  /** Perfis oficiais. Entradas vazias sao omitidas do rodape e do JSON-LD. */
  social: {
    instagram: '',
    youtube: '',
    linkedin: '',
  },
  /** Usado no JSON-LD Organization e no rodape. */
  legalName: 'Nutrição em Ação',
  foundingYear: 2026,
} as const;

export const TAGLINE: Record<Locale, string> = {
  pt: 'Nutrição baseada em evidências, sem atalho e sem hype.',
  en: 'Evidence-based nutrition, no shortcuts and no hype.',
};

/**
 * Endpoint do provedor de newsletter (Buttondown, Beehiiv, Mailchimp...).
 * Vazio => o bloco de newsletter vira um convite para a pagina de contato,
 * em vez de um formulario que nao envia para lugar nenhum.
 */
export const NEWSLETTER_ACTION: string = import.meta.env.PUBLIC_NEWSLETTER_ACTION ?? '';

/** Campo de e-mail esperado pelo provedor (Buttondown usa `email`). */
export const NEWSLETTER_FIELD: string = import.meta.env.PUBLIC_NEWSLETTER_FIELD?.trim() || 'email';

/**
 * Analytics sem cookie (Plausible, Umami). Vazio => nenhum script de
 * terceiro é carregado. Ao preencher, libere o dominio na CSP do
 * public/.htaccess — a politica é deliberadamente restritiva por padrao.
 */
export const ANALYTICS = {
  src: import.meta.env.PUBLIC_ANALYTICS_SRC ?? '',
  websiteId: import.meta.env.PUBLIC_ANALYTICS_ID ?? '',
} as const;

/** Quantidade de artigos por bloco na home. */
export const HOME_LAYOUT = {
  featured: 3,
  latest: 8,
  related: 3,
} as const;
