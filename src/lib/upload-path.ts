/**
 * Regra unica para interpretar o caminho de uma imagem enviada pelo editor
 * visual.
 *
 * O problema que ela resolve: o Sveltia e o Astro discordam sobre como
 * escrever um caminho de imagem. O CMS grava a partir da raiz do repositorio
 * (`/src/assets/uploads/foto.jpg`) — a doc dele so garante determinismo com a
 * barra inicial. O Astro le barra inicial como `public/`, que nao passa pelo
 * otimizador. E caminho relativo gravado pelo CMS ja chegou aqui com a
 * profundidade errada (`../../../../` onde cabia `../../../`), o que derrubou
 * um build com ImageNotFound.
 *
 * Em vez de exigir que o editor acerte a grafia, o projeto aceita todas e
 * converge para a que o Astro otimiza. Dois consumidores usam esta regra:
 *
 *  - `src/content.config.ts` — a capa, no frontmatter;
 *  - `src/plugins/remark-upload-path.ts` — as imagens no corpo do texto.
 *
 * Os dois precisam existir: a capa quebra o build quando esta errada (barulho
 * util), mas a imagem do corpo com barra inicial **passa no build** e so
 * quebra no site publicado — silenciosa, e por isso a mais perigosa.
 */

/** Pasta real das imagens, relativa a raiz do projeto. */
export const UPLOADS_DIR = 'src/assets/uploads';

/**
 * Nome do arquivo depois de `assets/uploads/`, em qualquer grafia:
 * `/src/assets/uploads/a.png`, `../../assets/uploads/a.png`,
 * `../../../../assets/uploads/sub/a.png`.
 */
const DENTRO_DE_UPLOADS = /(?:^|\/)assets\/uploads\/(.+)$/;

/** `https:`, `mailto:`, `data:` — e `//cdn.exemplo` sem protocolo. */
const EXTERNA = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Devolve o arquivo apontado, ou `undefined` quando o caminho nao é um upload
 * do CMS — imagem ao lado do artigo e URL externa passam intactas.
 */
export function uploadFileName(value: string): string | undefined {
  if (EXTERNA.test(value)) return undefined;

  return DENTRO_DE_UPLOADS.exec(value)?.[1];
}
