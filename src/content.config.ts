import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { CATEGORY_KEYS } from './config/categories';
import { LOCALES } from './i18n/locales';

/**
 * Slug seguro para URL: minusculas, sem acento, sem barra. Bloqueia no build
 * qualquer slug que geraria rota quebrada ou colisao de arquivo.
 */
const urlSlug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use apenas letras minusculas sem acento, numeros e hifens (ex: proteina-quanto-precisamos)',
  );

const reference_ = z.object({
  title: z.string().min(3),
  url: z.url().startsWith('https://', 'Fontes devem usar https'),
  publisher: z.string().optional(),
});

const faqItem = z.object({
  question: z.string().min(3),
  answer: z.string().min(3),
});

const blog = defineCollection({
  /**
   * Um arquivo por idioma, em pastas irmas: `pt/<chave>.md` e `en/<chave>.md`.
   * A chave (nome do arquivo) é o que liga as duas traducoes — o CMS edita as
   * duas na mesma tela e elas nunca se perdem uma da outra.
   */
  loader: glob({ base: './src/content/blog', pattern: `{${LOCALES.join(',')}}/**/*.md` }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(10).max(120),
        summary: z.string().min(40).max(320),
        category: z.enum(CATEGORY_KEYS),
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date().optional(),
        /**
         * Assinatura pessoal. Opcional: nem todo texto tem uma pessoa por
         * tras — pauta curta, nota de atualizacao ou material coletivo saem
         * assinados pela publicacao, e a autoridade vem das fontes citadas em
         * `references`, que é o que o leitor pode conferir.
         *
         * Sem autor, o JSON-LD assina o artigo como a Organization (ver
         * articleSchema em src/lib/seo.ts): o campo `author` continua presente
         * para o buscador, sem inventar uma pessoa que nao existe.
         */
        author: reference('authors').optional(),
        /** Revisao tecnica: sinal de confianca em conteudo de saude (E-E-A-T). */
        reviewer: reference('authors').optional(),
        cover: image().optional(),
        coverAlt: z.string().min(5).optional(),
        tags: z.array(z.string().min(2)).max(8).default([]),
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
        /**
         * Sobrescreve o endereco da URL neste idioma. Padrao: nome do arquivo.
         *
         * Nao se chama `slug` de proposito: `slug` é campo reservado do glob
         * loader do Astro e substituiria o id da entrada, apagando o prefixo
         * de idioma que liga as duas traducoes.
         */
        permalink: urlSlug.optional(),
        references: z.array(reference_).default([]),
        faq: z.array(faqItem).max(10).default([]),
        /** Remove a pagina do sitemap e pede noindex aos buscadores. */
        noindex: z.boolean().default(false),
      })
      .strict()
      .refine((data) => !data.cover || Boolean(data.coverAlt), {
        message:
          'Toda capa precisa de coverAlt — imagem sem texto alternativo é barreira de acesso',
        path: ['coverAlt'],
      })
      .refine((data) => !data.updatedAt || data.updatedAt >= data.publishedAt, {
        message: 'updatedAt nao pode ser anterior a publishedAt',
        path: ['updatedAt'],
      }),
});

const authors = defineCollection({
  loader: glob({ base: './src/content/authors', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(3),
        /** Cargo/credencial exibido junto da assinatura. */
        role: z.object({ pt: z.string().min(2), en: z.string().min(2) }),
        bio: z.object({ pt: z.string().min(20), en: z.string().min(20) }),
        avatar: image().optional(),
        /** Registro profissional (CRN/CRM). Reforca autoridade em saude. */
        credential: z.string().optional(),
        links: z
          .object({
            website: z.url().optional(),
            instagram: z.url().optional(),
            linkedin: z.url().optional(),
          })
          .default({}),
      })
      .strict(),
});

/**
 * Paginas institucionais (sobre, contato, privacidade, termos, politica
 * editorial). Ficam no CMS junto com os artigos: texto juridico e de marca
 * muda sem precisar de deploy manual nem de editor de codigo.
 */
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: `{${LOCALES.join(',')}}/**/*.md` }),
  schema: z
    .object({
      title: z.string().min(3),
      description: z.string().min(40).max(320),
      updatedAt: z.coerce.date().optional(),
      noindex: z.boolean().default(false),
    })
    .strict(),
});

export const collections = { blog, authors, pages };
