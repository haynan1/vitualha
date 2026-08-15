import { MAX_BYTES, MAX_PIXELS } from './formats';
import { readPngInfo, type PngInfo } from './png';

/**
 * Porteiro da fila: decide se um arquivo entra, e por que nao entrou.
 *
 * A decisao é tomada pelos **bytes**, nunca pelo nome nem pelo `type` do
 * `File` — os dois vem de quem envia e podem dizer qualquer coisa. Um `.png`
 * que na verdade é um SVG (o caso classico, porque SVG carrega script) nao
 * passa da assinatura.
 *
 * Os limites de tamanho nao existem para vender plano nenhum: sao o ponto a
 * partir do qual o navegador falha ao alocar o canvas e a aba morre sem
 * mensagem. Melhor recusar com explicacao do que travar.
 */

export type RejectionReason =
  /** Os bytes nao formam um PNG — nome e MIME nao importam aqui. */
  | 'not-png'
  /** Acima do teto de bytes por arquivo. */
  | 'too-large'
  /** Resolucao alta demais para o navegador processar com seguranca. */
  | 'too-many-pixels'
  /** Arquivo vazio ou ilegivel. */
  | 'unreadable';

export type Inspection = { ok: true; info: PngInfo } | { ok: false; reason: RejectionReason };

/**
 * Basta o inicio do arquivo: assinatura, IHDR e os chunks anteriores ao
 * primeiro IDAT cabem folgadamente aqui.
 */
export const HEADER_BYTES = 64 * 1024;

/** Parte pura, sem File nem Blob — é o que os testes exercitam. */
export function inspectPngBytes(bytes: Uint8Array, byteLength: number): Inspection {
  if (byteLength <= 0 || bytes.length === 0) return { ok: false, reason: 'unreadable' };
  if (byteLength > MAX_BYTES) return { ok: false, reason: 'too-large' };

  const info = readPngInfo(bytes);
  if (!info) return { ok: false, reason: 'not-png' };

  if (info.width * info.height > MAX_PIXELS) return { ok: false, reason: 'too-many-pixels' };

  return { ok: true, info };
}

/** Le apenas o cabecalho do arquivo — nao carrega a imagem inteira. */
export async function inspectPngFile(file: File): Promise<Inspection> {
  try {
    const head = await file.slice(0, HEADER_BYTES).arrayBuffer();

    return inspectPngBytes(new Uint8Array(head), file.size);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}

/**
 * Filtro do seletor de arquivos e do drop. Continua sendo apenas uma dica de
 * interface: o que decide é `inspectPngFile`.
 */
export const ACCEPTED_TYPES = 'image/png,.png';
