import { CATEGORY_LIST } from '../config/categories';
import type { Locale } from '../i18n/locales';
import { articlesUrl, categoryUrl, homeUrl, imageConverterUrl, route } from '../i18n/routes';
import { t } from '../i18n/ui';

export type NavItem = { label: string; href: string };

/** Um degrau da trilha de navegacao (breadcrumb). */
export type Crumb = { name: string; url: string };

/** Navegacao principal: home, as categorias e o acervo completo. */
export function mainNav(locale: Locale): NavItem[] {
  const ui = t(locale);

  return [
    { label: ui.nav.home, href: homeUrl(locale) },
    ...CATEGORY_LIST.filter((category) => category.key !== 'science').map((category) => ({
      label: category[locale].name,
      href: categoryUrl(locale, category[locale].slug),
    })),
    { label: ui.nav.articles, href: articlesUrl(locale) },
  ];
}

export type FooterColumn = { heading: string; items: NavItem[] };

export function footerColumns(locale: Locale): FooterColumn[] {
  const ui = t(locale);

  return [
    {
      heading: ui.footer.contentHeading,
      items: [
        ...CATEGORY_LIST.map((category) => ({
          label: category[locale].name,
          href: categoryUrl(locale, category[locale].slug),
        })),
        // Ferramenta gratuita do site. Sem link no rodape ela so existiria
        // para quem chegasse pela busca do Google.
        { label: ui.nav.imageConverter, href: imageConverterUrl(locale) },
      ],
    },
    {
      heading: ui.footer.institutionalHeading,
      items: [
        { label: ui.nav.about, href: route(locale, 'about') },
        { label: ui.nav.contact, href: route(locale, 'contact') },
        { label: ui.footer.editorial, href: route(locale, 'editorial') },
        { label: ui.nav.articles, href: articlesUrl(locale) },
      ],
    },
    {
      heading: ui.footer.legalHeading,
      items: [
        { label: ui.footer.privacy, href: route(locale, 'privacy') },
        { label: ui.footer.terms, href: route(locale, 'terms') },
      ],
    },
  ];
}

/**
 * Marca o item ativo considerando secao inteira: estando em um artigo de
 * Nutricao, o item "Nutricao" do menu fica ativo — o leitor sempre sabe onde
 * esta. A home so casa exatamente, senao ficaria ativa em todas as paginas.
 */
export function isActive(href: string, pathname: string, locale: Locale): boolean {
  if (href === homeUrl(locale)) return pathname === href;
  return pathname === href || pathname.startsWith(href);
}
