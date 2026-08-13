import { describe, expect, it } from 'vitest';

import {
  buildLocaleIndex,
  composeHome,
  ContentIdError,
  entrySlug,
  parseEntryId,
  selectRelated,
  type EntryLike,
} from '@/lib/article-model';

/** Falha o teste em vez de propagar undefined quando a fixture nao existe. */
function found<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`fixture ausente: ${label}`);
  return value;
}

function entry(id: string, overrides: Partial<EntryLike['data']> = {}): EntryLike {
  return {
    id,
    data: {
      publishedAt: new Date('2026-01-01T00:00:00Z'),
      draft: false,
      featured: false,
      category: 'nutrition',
      tags: [],
      ...overrides,
    },
  };
}

describe('parseEntryId', () => {
  it('separa idioma e chave', () => {
    expect(parseEntryId('pt/proteina')).toEqual({ locale: 'pt', key: 'proteina' });
    expect(parseEntryId('en/proteina')).toEqual({ locale: 'en', key: 'proteina' });
  });

  it('preserva subpastas dentro do idioma', () => {
    expect(parseEntryId('pt/serie/parte-1')).toEqual({ locale: 'pt', key: 'serie/parte-1' });
  });

  it('rejeita arquivo sem pasta de idioma', () => {
    // Sem isso, um arquivo solto viraria artigo com idioma indefinido.
    expect(() => parseEntryId('proteina')).toThrow(ContentIdError);
    expect(() => parseEntryId('fr/proteina')).toThrow(ContentIdError);
  });
});

describe('entrySlug', () => {
  it('usa o nome do arquivo por padrao', () => {
    expect(entrySlug(entry('pt/proteina-quanto-precisamos'))).toBe('proteina-quanto-precisamos');
  });

  it('prefere o permalink quando definido', () => {
    expect(entrySlug(entry('en/proteina', { permalink: 'protein-intake' }))).toBe('protein-intake');
  });

  it('usa o ultimo segmento quando ha subpasta', () => {
    expect(entrySlug(entry('pt/serie/parte-1'))).toBe('parte-1');
  });
});

describe('buildLocaleIndex', () => {
  const entries = [
    entry('pt/a', { publishedAt: new Date('2026-03-01T00:00:00Z') }),
    entry('en/a', { publishedAt: new Date('2026-03-01T00:00:00Z') }),
    entry('pt/b', { publishedAt: new Date('2026-05-01T00:00:00Z') }),
    entry('pt/rascunho', { draft: true, publishedAt: new Date('2026-06-01T00:00:00Z') }),
    entry('en/so-em-ingles', { publishedAt: new Date('2026-04-01T00:00:00Z') }),
  ];

  it('ordena do mais recente para o mais antigo', () => {
    const index = buildLocaleIndex(entries, 'pt');
    expect(index.map((item) => item.key)).toEqual(['b', 'a']);
  });

  it('exclui rascunho por padrao e inclui sob demanda', () => {
    expect(buildLocaleIndex(entries, 'pt').some((item) => item.key === 'rascunho')).toBe(false);
    expect(
      buildLocaleIndex(entries, 'pt', { includeDrafts: true }).some(
        (item) => item.key === 'rascunho',
      ),
    ).toBe(true);
  });

  it('nao inventa fallback para o idioma padrao', () => {
    // 'so-em-ingles' existe apenas em ingles: nao deve aparecer em portugues.
    const index = buildLocaleIndex(entries, 'pt');
    expect(index.some((item) => item.key === 'so-em-ingles')).toBe(false);
  });

  it('usa a traducao propria quando ela existe', () => {
    const traduzido = buildLocaleIndex(entries, 'en').find((item) => item.key === 'a');
    expect(traduzido?.isFallback).toBe(false);
    expect(traduzido?.contentLocale).toBe('en');
  });

  it('cai no idioma padrao quando falta traducao, marcando como fallback', () => {
    const fallback = buildLocaleIndex(entries, 'en').find((item) => item.key === 'b');
    expect(fallback?.isFallback).toBe(true);
    expect(fallback?.contentLocale).toBe('pt');
    expect(fallback?.locale).toBe('en');
  });

  it('gera exatamente uma pagina por chave em cada idioma', () => {
    const keys = buildLocaleIndex(entries, 'en').map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('mantem ordem estavel quando as datas empatam', () => {
    const mesmoDia = [entry('pt/z'), entry('pt/a'), entry('pt/m')];
    expect(buildLocaleIndex(mesmoDia, 'pt').map((item) => item.key)).toEqual(['a', 'm', 'z']);
  });
});

describe('selectRelated', () => {
  const pool = buildLocaleIndex(
    [
      entry('pt/atual', { category: 'nutrition', tags: ['proteína'] }),
      entry('pt/mesma-categoria', { category: 'nutrition' }),
      entry('pt/mesma-tag', { category: 'recipes', tags: ['proteína'] }),
      entry('pt/sem-relacao', { category: 'recipes', tags: ['sopa'] }),
    ],
    'pt',
  );

  const current = found(
    pool.find((item) => item.key === 'atual'),
    'atual',
  );

  it('nunca devolve o proprio artigo', () => {
    const related = selectRelated(current, pool, 5);
    expect(related.some((item) => item.key === 'atual')).toBe(false);
  });

  it('coloca a mesma categoria acima da tag em comum', () => {
    const related = selectRelated(current, pool, 5);
    expect(related[0]?.key).toBe('mesma-categoria');
  });

  it('descarta quem nao tem nenhuma afinidade', () => {
    const related = selectRelated(current, pool, 5);
    expect(related.some((item) => item.key === 'sem-relacao')).toBe(false);
  });

  it('respeita o limite', () => {
    expect(selectRelated(current, pool, 1)).toHaveLength(1);
  });
});

describe('composeHome', () => {
  const articles = buildLocaleIndex(
    [
      entry('pt/1', { publishedAt: new Date('2026-01-01T00:00:00Z') }),
      entry('pt/2', { publishedAt: new Date('2026-02-01T00:00:00Z') }),
      entry('pt/3', { publishedAt: new Date('2026-03-01T00:00:00Z') }),
      entry('pt/4', { publishedAt: new Date('2026-04-01T00:00:00Z'), featured: true }),
      entry('pt/5', { publishedAt: new Date('2026-05-01T00:00:00Z') }),
    ],
    'pt',
  );

  it('abre com o artigo marcado como destaque', () => {
    const { hero } = composeHome(articles, { featured: 2, latest: 2 });
    expect(hero?.key).toBe('4');
  });

  it('nao repete nenhum artigo entre os blocos', () => {
    const { hero, featured, latest } = composeHome(articles, { featured: 2, latest: 2 });
    const shown = [found(hero, 'hero'), ...featured, ...latest].map((item) => item.key);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('sinaliza quando ainda ha artigos fora da home', () => {
    expect(composeHome(articles, { featured: 1, latest: 1 }).hasMore).toBe(true);
    expect(composeHome(articles, { featured: 2, latest: 8 }).hasMore).toBe(false);
  });

  it('aguenta acervo vazio', () => {
    const empty = composeHome([], { featured: 3, latest: 8 });
    expect(empty.hero).toBeUndefined();
    expect(empty.hasMore).toBe(false);
  });
});
