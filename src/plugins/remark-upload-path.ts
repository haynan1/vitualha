import { dirname, relative, resolve, sep } from 'node:path';

import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

import { UPLOADS_DIR, uploadFileName } from '../lib/upload-path';

/**
 * Reescreve o caminho das imagens do corpo do artigo para o formato relativo
 * que o `astro:assets` otimiza. A motivacao completa esta em
 * `src/lib/upload-path.ts`.
 *
 * A profundidade nao é chutada: sai de `relative()` sobre o caminho real do
 * arquivo. Vale para artigo, pagina institucional e qualquer estrutura de
 * pastas que venha depois.
 */

const UPLOADS = resolve(UPLOADS_DIR);

export function remarkUploadPath() {
  return (tree: Root, file: { path?: string }): undefined => {
    // Sem o caminho do arquivo nao ha como calcular a subida. Melhor deixar
    // como esta do que reescrever para um lugar errado.
    if (!file.path) return;

    const pasta = dirname(file.path);

    visit(tree, 'image', (node) => {
      const arquivo = uploadFileName(node.url);
      if (arquivo === undefined) return;

      const caminho = relative(pasta, resolve(UPLOADS, arquivo)).split(sep).join('/');

      // `relative` devolve `foto.jpg` quando o alvo esta na mesma pasta; sem
      // o `./` o Astro leria como pacote npm.
      node.url = caminho.startsWith('.') ? caminho : `./${caminho}`;
    });
  };
}
