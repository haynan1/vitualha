/**
 * Categorias sao estruturais: definem URL, navegacao, breadcrumb e JSON-LD.
 * Por isso vivem em codigo e nao no CMS — um artigo com categoria inexistente
 * quebra o build (schema Zod), nunca gera uma pagina orfa em producao.
 *
 * Para adicionar uma categoria: acrescente a chave em CATEGORY_KEYS e a
 * entrada correspondente em CATEGORIES. O resto do site se atualiza sozinho.
 */
export const CATEGORY_KEYS = [
  'nutrition',
  'foods',
  'health',
  'fitness',
  'recipes',
  'science',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

type CategoryCopy = {
  /** Slug usado na URL daquele idioma. */
  slug: string;
  name: string;
  description: string;
};

export type Category = {
  key: CategoryKey;
  /** Inicial usada na marca visual da categoria. */
  letter: string;
  /** Matiz base (HSL) do gradiente gerado para capas e cards. */
  hue: number;
  pt: CategoryCopy;
  en: CategoryCopy;
};

export const CATEGORIES: Record<CategoryKey, Category> = {
  nutrition: {
    key: 'nutrition',
    letter: 'N',
    hue: 122,
    pt: {
      slug: 'nutricao',
      name: 'Nutrição',
      description: 'Informações sobre nutrientes, alimentação e ciência.',
    },
    en: {
      slug: 'nutrition',
      name: 'Nutrition',
      description: 'Information about nutrients, diet and science.',
    },
  },
  foods: {
    key: 'foods',
    letter: 'A',
    hue: 88,
    pt: {
      slug: 'alimentos',
      name: 'Alimentos',
      description: 'Benefícios, nutrientes e características dos principais alimentos.',
    },
    en: {
      slug: 'foods',
      name: 'Foods',
      description: 'Benefits, nutrients and characteristics of key foods.',
    },
  },
  health: {
    key: 'health',
    letter: 'S',
    hue: 172,
    pt: {
      slug: 'saude',
      name: 'Saúde',
      description: 'Como alimentação e estilo de vida influenciam o organismo.',
    },
    en: {
      slug: 'health',
      name: 'Health',
      description: 'How diet and lifestyle influence the body.',
    },
  },
  fitness: {
    key: 'fitness',
    letter: 'F',
    hue: 28,
    pt: {
      slug: 'fitness',
      name: 'Fitness',
      description: 'Nutrição relacionada ao exercício e composição corporal.',
    },
    en: {
      slug: 'fitness',
      name: 'Fitness',
      description: 'Nutrition related to exercise and body composition.',
    },
  },
  recipes: {
    key: 'recipes',
    letter: 'R',
    hue: 348,
    pt: {
      slug: 'receitas',
      name: 'Receitas',
      description: 'Receitas simples, nutritivas e equilibradas.',
    },
    en: {
      slug: 'recipes',
      name: 'Recipes',
      description: 'Simple, nutritious and balanced recipes.',
    },
  },
  science: {
    key: 'science',
    letter: 'C',
    hue: 258,
    pt: {
      slug: 'ciencia',
      name: 'Ciência',
      description: 'Pesquisas, estudos e descobertas relacionadas à nutrição.',
    },
    en: {
      slug: 'science',
      name: 'Science',
      description: 'Research, studies and discoveries related to nutrition.',
    },
  },
};

export const CATEGORY_LIST: Category[] = CATEGORY_KEYS.map((key) => CATEGORIES[key]);
