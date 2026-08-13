import { describe, expect, it } from 'vitest';

import { CATEGORIES, CATEGORY_LIST } from '@/config/categories';
import { LOCALES } from '@/i18n/locales';
import { articleUrl, categoryUrl, homeUrl, path, route } from '@/i18n/routes';
import { UI } from '@/i18n/ui';
import { formatDate, isoDate } from '@/lib/date';
import { countWords, readingMinutes } from '@/lib/reading-time';
import { alternateLinks, jsonLd } from '@/lib/seo';

describe('formatacao de data', () => {
  /**
   * Data de frontmatter é meia-noite UTC. Formatar no fuso local jogaria
   * "10 ago" para "9 ago" em qualquer maquina a oeste de Greenwich — inclusive
   * a do Brasil, onde o site é lido.
   */
  it('nao volta um dia em fuso negativo', () => {
    const data = new Date('2026-08-10T00:00:00Z');
    expect(formatDate(data, 'pt')).toContain('10');
    expect(formatDate(data, 'en')).toContain('10');
    expect(isoDate(data)).toBe('2026-08-10');
  });

  it('usa a ordem propria de cada idioma', () => {
    const data = new Date('2026-08-10T00:00:00Z');
    // pt: "10 ago 2026" — dia antes do mes; en: "Aug 10, 2026" — mes antes.
    expect(formatDate(data, 'pt')).toMatch(/^10 \w+ 2026$/);
    expect(formatDate(data, 'en')).toMatch(/^\w+ 10, 2026$/);
  });

  it('nao deixa ponto de abreviacao no mes em portugues', () => {
    expect(formatDate(new Date('2026-08-10T00:00:00Z'), 'pt')).not.toContain('.');
  });
});

describe('tempo de leitura', () => {
  it('ignora bloco de codigo e URL de link', () => {
    const markdown = [
      'Uma frase com cinco palavras aqui.',
      '```js',
      Array.from({ length: 300 }, () => 'const x = 1;').join('\n'),
      '```',
      '[texto do link](https://exemplo.com/uma/url/muito/longa/que/nao/se/le)',
    ].join('\n');

    // 6 palavras do texto + 3 do rotulo do link.
    expect(countWords(markdown)).toBeLessThan(15);
  });

  it('nunca devolve zero minuto', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('Duas palavras')).toBe(1);
  });

  it('cresce junto com o texto', () => {
    const texto = Array.from({ length: 1000 }, () => 'palavra').join(' ');
    expect(readingMinutes(texto)).toBe(5);
  });
});

describe('rotas', () => {
  it('sempre termina com barra', () => {
    for (const locale of LOCALES) {
      expect(homeUrl(locale).endsWith('/')).toBe(true);
      expect(articleUrl(locale, 'x').endsWith('/')).toBe(true);
      expect(categoryUrl(locale, 'x').endsWith('/')).toBe(true);
    }
  });

  it('deixa o idioma padrao na raiz e prefixa os demais', () => {
    expect(homeUrl('pt')).toBe('/');
    expect(homeUrl('en')).toBe('/en/');
  });

  it('traduz o segmento da URL', () => {
    expect(articleUrl('pt', 'proteina')).toBe('/artigos/proteina/');
    expect(articleUrl('en', 'protein')).toBe('/en/articles/protein/');
    expect(route('pt', 'privacy')).toBe('/privacidade/');
    expect(route('en', 'privacy')).toBe('/en/privacy/');
  });

  it('normaliza barras sobrando', () => {
    expect(path('pt', '/artigos/', '/proteina/')).toBe('/artigos/proteina/');
  });
});

describe('categorias', () => {
  it('tem slug unico dentro de cada idioma', () => {
    for (const locale of LOCALES) {
      const slugs = CATEGORY_LIST.map((category) => category[locale].slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('usa slug proprio em cada idioma', () => {
    // Slug de um idioma nunca deve valer no outro: sao URLs distintas e
    // cada uma precisa competir na busca do seu proprio idioma.
    const pt = CATEGORY_LIST.map((category) => category.pt.slug);
    const en = CATEGORY_LIST.map((category) => category.en.slug);

    expect(CATEGORIES.nutrition.pt.slug).toBe('nutricao');
    expect(CATEGORIES.nutrition.en.slug).toBe('nutrition');
    expect(pt).not.toEqual(en);
  });

  it('descreve toda categoria nos dois idiomas', () => {
    for (const category of CATEGORY_LIST) {
      for (const locale of LOCALES) {
        expect(CATEGORIES[category.key][locale].name.length).toBeGreaterThan(2);
        expect(CATEGORIES[category.key][locale].description.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('dicionario de interface', () => {
  it('tem as mesmas chaves nos dois idiomas', () => {
    const flatten = (dict: Record<string, Record<string, string>>): string[] =>
      Object.entries(dict)
        .flatMap(([group, values]) => Object.keys(values).map((key) => `${group}.${key}`))
        .sort();

    expect(flatten(UI.en)).toEqual(flatten(UI.pt));
  });

  it('nao deixa texto vazio', () => {
    for (const locale of LOCALES) {
      for (const group of Object.values(UI[locale])) {
        for (const value of Object.values(group)) {
          expect(value.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('seo', () => {
  const site = new URL('https://exemplo.com.br');

  it('escapa "<" no JSON-LD', () => {
    // Titulo vem do CMS: sem escape, "</script>" fecharia a tag e injetaria
    // markup arbitrario na pagina.
    const payload = jsonLd({ headline: '</script><img src=x onerror=alert(1)>' });
    expect(payload).not.toContain('</script>');
    expect(payload).toContain('\\u003c');
  });

  it('anuncia so os idiomas que existem, mais um x-default', () => {
    const links = alternateLinks({ pt: '/artigos/a/' }, site);
    expect(links.map((link) => link.hreflang)).toEqual(['pt-BR', 'x-default']);
    expect(links.every((link) => link.href.startsWith('https://exemplo.com.br'))).toBe(true);
  });

  it('aponta o x-default para o idioma padrao quando ha dois', () => {
    const links = alternateLinks({ pt: '/artigos/a/', en: '/en/articles/a/' }, site);
    const xDefault = links.find((link) => link.hreflang === 'x-default');
    expect(xDefault?.href).toBe('https://exemplo.com.br/artigos/a/');
  });
});
