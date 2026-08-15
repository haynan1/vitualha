import { resolve } from 'node:path';

import type { Image, Root } from 'mdast';
import { describe, expect, it } from 'vitest';

import { uploadFileName } from '@/lib/upload-path';
import { remarkUploadPath } from '@/plugins/remark-upload-path';

/**
 * O caminho canonico de um artigo. A profundidade importa: `src/content/blog/
 * pt/x.md` esta tres niveis abaixo de `src/`, entao o caminho correto para
 * `src/assets/uploads/` sobe tres vezes.
 */
const ARTIGO = resolve('src/content/blog/pt/artigo.md');
const AUTOR = resolve('src/content/authors/ana.md');

/** Roda o plugin sobre uma unica imagem e devolve a URL resultante. */
function reescreve(url: string, file: { path?: string }): string {
  const node: Image = { type: 'image', url, alt: null };
  const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [node] }] };

  remarkUploadPath()(tree, file);

  return node.url;
}

/** O caso comum: imagem no corpo de um artigo. */
const emArtigo = (url: string) => reescreve(url, { path: ARTIGO });

describe('uploadFileName', () => {
  it('reconhece o upload em qualquer profundidade', () => {
    expect(uploadFileName('/src/assets/uploads/foto.jpg')).toBe('foto.jpg');
    expect(uploadFileName('../../assets/uploads/foto.jpg')).toBe('foto.jpg');
    expect(uploadFileName('../../../../assets/uploads/foto.jpg')).toBe('foto.jpg');
    expect(uploadFileName('src/assets/uploads/foto.jpg')).toBe('foto.jpg');
  });

  it('preserva subpasta dentro de uploads', () => {
    expect(uploadFileName('/src/assets/uploads/2026/foto.jpg')).toBe('2026/foto.jpg');
  });

  it('ignora URL externa, mesmo contendo assets/uploads', () => {
    expect(uploadFileName('https://cdn.exemplo.com/assets/uploads/foto.jpg')).toBeUndefined();
    expect(uploadFileName('//cdn.exemplo.com/assets/uploads/foto.jpg')).toBeUndefined();
    expect(uploadFileName('data:image/png;base64,iVBORw0KGgo=')).toBeUndefined();
  });

  it('ignora imagem que nao vem do CMS', () => {
    expect(uploadFileName('./grafico.svg')).toBeUndefined();
    expect(uploadFileName('../figuras/grafico.svg')).toBeUndefined();
  });
});

describe('remarkUploadPath', () => {
  it('converte o caminho absoluto que o editor visual grava', () => {
    // Sem isso o Astro leria como public/: o build passa e a imagem quebra
    // no site publicado. É o caso silencioso, e o motivo do plugin existir.
    expect(emArtigo('/src/assets/uploads/foto.jpg')).toBe('../../../assets/uploads/foto.jpg');
  });

  it('corrige a profundidade errada', () => {
    expect(emArtigo('../../../../assets/uploads/foto.jpg')).toBe(
      '../../../assets/uploads/foto.jpg',
    );
    expect(emArtigo('../assets/uploads/foto.jpg')).toBe('../../../assets/uploads/foto.jpg');
  });

  it('é idempotente sobre o caminho ja correto', () => {
    const certo = '../../../assets/uploads/foto.jpg';

    expect(emArtigo(certo)).toBe(certo);
    expect(emArtigo(emArtigo(certo))).toBe(certo);
  });

  it('calcula a subida a partir do arquivo, nao de um valor fixo', () => {
    // Autor esta um nivel acima de um artigo: duas subidas, nao tres.
    expect(reescreve('/src/assets/uploads/ana.jpg', { path: AUTOR })).toBe(
      '../../assets/uploads/ana.jpg',
    );
  });

  it('nao toca em URL externa nem em imagem vizinha', () => {
    const externa = 'https://cdn.exemplo.com/assets/uploads/foto.jpg';

    expect(emArtigo(externa)).toBe(externa);
    expect(emArtigo('./grafico.svg')).toBe('./grafico.svg');
  });

  it('deixa o documento intacto quando nao sabe o caminho do arquivo', () => {
    expect(reescreve('/src/assets/uploads/foto.jpg', {})).toBe('/src/assets/uploads/foto.jpg');
  });
});
