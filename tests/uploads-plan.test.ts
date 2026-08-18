import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planejarUploads, reescreverReferencias } from '../scripts/lib/uploads.mjs';

/**
 * O caso que motivou a regra separada para o frontmatter: o Sveltia grava a
 * capa com o nome que veio da maquina de quem enviou, e esse nome pode ter
 * espaco. No corpo isso chega percent-encoded; no `cover:` chega literal, e o
 * valor so termina no fim da linha.
 */
const CAPA_COM_ESPACO = '01 - imagem.webp';

const raizes: string[] = [];

/** Projeto de mentira com a mesma estrutura que os scripts esperam. */
async function projeto(arquivos: Record<string, string>, uploads: string[]) {
  const raiz = await mkdtemp(join(tmpdir(), 'vitualha-uploads-'));
  raizes.push(raiz);

  await mkdir(join(raiz, 'src', 'assets', 'uploads'), { recursive: true });
  for (const nome of uploads) await writeFile(join(raiz, 'src', 'assets', 'uploads', nome), 'x');

  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    const destino = join(raiz, 'src', 'content', 'blog', caminho);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, conteudo);
  }

  return raiz;
}

function artigo(permalink: string, capa: string, corpo: string[] = []) {
  const imagens = corpo.map((nome) => `![alt](/src/assets/uploads/${nome})`).join('\n\n');

  return `---
title: Artigo
permalink: ${permalink}
cover: /src/assets/uploads/${capa}
coverAlt: Uma capa qualquer
---

# Artigo

${imagens}
`;
}

afterEach(async () => {
  for (const raiz of raizes.splice(0)) await rm(raiz, { recursive: true, force: true });
});

describe('planejarUploads', () => {
  it('renomeia a capa cujo nome tem espaco', async () => {
    // Lida pela regra do corpo, `01 - imagem.webp` virava `01`: nao havia
    // arquivo com esse nome para renomear, e o verify:build acusava um caminho
    // que nao existe enquanto tratava o arquivo real como orfao.
    const raiz = await projeto({ 'pt/whey.md': artigo('whey', CAPA_COM_ESPACO) }, [
      CAPA_COM_ESPACO,
    ]);

    const { renomeios, orfaos } = await planejarUploads(raiz);

    expect(renomeios).toEqual([{ de: CAPA_COM_ESPACO, para: 'whey-capa.webp', artigo: 'whey' }]);
    expect(orfaos).toEqual([]);
  });

  it('numera o corpo pela ordem de aparicao e usa o permalink canonico', async () => {
    const raiz = await projeto(
      {
        'pt/whey.md': artigo('whey', 'capa.png', ['a.webp', 'b.webp']),
        'en/whey.md': artigo('whey-en', 'capa.png', ['a.webp', 'b.webp']),
      },
      ['capa.png', 'a.webp', 'b.webp'],
    );

    const { renomeios } = await planejarUploads(raiz);

    expect(renomeios).toEqual([
      { de: 'capa.png', para: 'whey-capa.png', artigo: 'whey' },
      { de: 'a.webp', para: 'whey-01.webp', artigo: 'whey' },
      { de: 'b.webp', para: 'whey-02.webp', artigo: 'whey' },
    ]);
  });

  it('nao renomeia imagem disputada por dois artigos', async () => {
    const raiz = await projeto(
      {
        'pt/whey.md': artigo('whey', 'capa.png'),
        'pt/creatina.md': artigo('creatina', 'capa.png'),
      },
      ['capa.png'],
    );

    const { renomeios, compartilhados } = await planejarUploads(raiz);

    expect(renomeios).toEqual([]);

    // A ordem das chaves sai do readdir, que nao promete nada entre sistemas
    // de arquivo — o que importa é quem disputa o arquivo, nao a sequencia.
    const [disputa] = compartilhados;
    expect(disputa?.arquivo).toBe('capa.png');
    expect([...(disputa?.chaves ?? [])].sort()).toEqual(['creatina', 'whey']);
  });

  it('aponta como orfa a imagem que nenhum artigo usa', async () => {
    const raiz = await projeto({ 'pt/whey.md': artigo('whey', 'whey-capa.png') }, [
      'whey-capa.png',
      'sobra.png',
    ]);

    const { orfaos } = await planejarUploads(raiz);

    expect(orfaos).toEqual(['sobra.png']);
  });
});

describe('reescreverReferencias', () => {
  const aplicados = new Map([
    [CAPA_COM_ESPACO, 'whey-capa.webp'],
    ['foto do treino.webp', 'whey-01.webp'],
  ]);

  it('reescreve o valor inteiro do cover, espacos inclusive', () => {
    // Sem isso, o renomeio em disco acontece e o frontmatter continua no nome
    // antigo — capa quebrada onde antes havia so um aviso.
    const texto = `---\ncover: /src/assets/uploads/${CAPA_COM_ESPACO}\n---\n\n# Titulo\n`;

    expect(reescreverReferencias(texto, aplicados)).toBe(
      '---\ncover: /src/assets/uploads/whey-capa.webp\n---\n\n# Titulo\n',
    );
  });

  it('preserva as aspas que o frontmatter usava', () => {
    const texto = `---\ncover: '/src/assets/uploads/${CAPA_COM_ESPACO}'\n---\n`;

    expect(reescreverReferencias(texto, aplicados)).toBe(
      "---\ncover: '/src/assets/uploads/whey-capa.webp'\n---\n",
    );
  });

  it('reescreve a imagem do corpo, que chega percent-encoded', () => {
    const texto = '---\ntitle: x\n---\n\n![alt](/src/assets/uploads/foto%20do%20treino.webp)\n';

    expect(reescreverReferencias(texto, aplicados)).toBe(
      '---\ntitle: x\n---\n\n![alt](/src/assets/uploads/whey-01.webp)\n',
    );
  });

  it('nao trata como capa um `cover:` escrito no corpo do texto', () => {
    const texto = `---\ntitle: x\n---\n\ncover: /src/assets/uploads/${CAPA_COM_ESPACO}\n`;

    expect(reescreverReferencias(texto, aplicados)).toBe(texto);
  });

  it('deixa intacto o que nao foi renomeado', () => {
    const texto = '---\ncover: /src/assets/uploads/outra.webp\n---\n\n![a](../figuras/x.svg)\n';

    expect(reescreverReferencias(texto, aplicados)).toBe(texto);
  });

  it('é idempotente', () => {
    const texto = `---\ncover: /src/assets/uploads/${CAPA_COM_ESPACO}\n---\n`;
    const uma = reescreverReferencias(texto, aplicados);

    expect(reescreverReferencias(uma, aplicados)).toBe(uma);
  });
});
