#!/usr/bin/env node
/**
 * Cria o arquivo de um artigo novo, ja com o frontmatter valido.
 *
 *   npm run new -- "Proteína: quanto realmente precisamos?"
 *   npm run new -- "Creatine: what the science says" --locale en --category fitness
 *
 * Nasce como rascunho: aparece no `npm run dev` e nao vai para o site
 * publicado ate alguem trocar `draft` para false. Publicar por engano é um
 * erro mais caro do que esquecer de publicar.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LOCALES = ['pt', 'en'];
const CATEGORIES = ['nutrition', 'foods', 'health', 'fitness', 'recipes', 'science'];

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

/** "Proteína: quanto precisamos?" -> "proteina-quanto-precisamos" */
function slugify(title) {
  return (
    title
      .normalize('NFD')
      // NFD separa a letra do acento; esta faixa remove os acentos combinantes
      // que sobraram, transformando "Ação" em "acao".
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70)
      .replace(/-+$/g, '')
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Titulo com dois-pontos precisa de aspas em YAML. */
function yamlString(value) {
  return /[:#[\]{}&*!|>'"%@`]/.test(value) ? `'${value.replaceAll("'", "''")}'` : value;
}

function template({ title, category, author, locale, draft }) {
  const isPt = locale === 'pt';

  return `---
title: ${yamlString(title)}
summary: ${isPt ? 'Resumo de uma a duas frases. Aparece no card, na busca e no Google.' : 'One or two sentence summary. Shows up on cards, in search and on Google.'}
category: ${category}
publishedAt: ${today()}
author: ${author}
tags: []
featured: false
draft: ${draft}
references: []
faq: []
---

${isPt ? 'Primeiro parágrafo: a promessa do artigo em duas ou três frases. É ele que decide se a pessoa continua lendo.' : 'Opening paragraph: the promise of the article in two or three sentences. This is what decides whether the reader continues.'}

## ${isPt ? 'Primeira seção' : 'First section'}

${isPt ? 'Conteúdo.' : 'Content.'}

:::${isPt ? 'dica[Na prática]' : 'tip[In practice]'}
${isPt ? 'Bloco de destaque para a aplicação concreta.' : 'Callout for the concrete application.'}
:::

## ${isPt ? 'Conclusão' : 'Conclusion'}

${isPt ? 'O que fazer com essa informação.' : 'What to do with this information.'}
`;
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const title = positional.join(' ').trim();

  if (!title) {
    console.error(
      'Uso: npm run new -- "Título do artigo" [--locale pt|en] [--category nutrition] [--author camila-ferreira]',
    );
    process.exit(1);
  }

  const locale = typeof flags['locale'] === 'string' ? flags['locale'] : 'pt';
  const category = typeof flags['category'] === 'string' ? flags['category'] : 'nutrition';
  const author = typeof flags['author'] === 'string' ? flags['author'] : 'camila-ferreira';
  const slug = typeof flags['slug'] === 'string' ? slugify(flags['slug']) : slugify(title);
  const draft = flags['publish'] !== true;

  if (!LOCALES.includes(locale)) {
    console.error(`Idioma invalido: "${locale}". Use: ${LOCALES.join(', ')}`);
    process.exit(1);
  }

  if (!CATEGORIES.includes(category)) {
    console.error(`Categoria invalida: "${category}". Use: ${CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  if (!slug) {
    console.error('Nao foi possivel gerar um nome de arquivo a partir do titulo.');
    process.exit(1);
  }

  const file = join(root, 'src', 'content', 'blog', locale, `${slug}.md`);

  try {
    await access(file);
    console.error(`Ja existe: ${file}`);
    console.error('Para traduzir, crie o arquivo com o MESMO nome na pasta do outro idioma.');
    process.exit(1);
  } catch {
    // Nao existe — segue.
  }

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, template({ title, category, author, locale, draft }), 'utf8');

  const other = locale === 'pt' ? 'en' : 'pt';

  console.log(`\nCriado: src/content/blog/${locale}/${slug}.md`);
  console.log(`URL:    ${locale === 'pt' ? `/artigos/${slug}/` : `/en/articles/${slug}/`}`);
  console.log(`Estado: ${draft ? 'rascunho (nao vai para o ar)' : 'publicado'}`);
  console.log(`\nPara traduzir depois, use o mesmo nome de arquivo em src/content/blog/${other}/.`);
  console.log('Para ver agora: npm run dev\n');
}

main().catch((error) => {
  console.error(`[new] falhou: ${error.message}`);
  process.exit(1);
});
