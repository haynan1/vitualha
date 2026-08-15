/**
 * Leitura do cabecalho PNG, direto dos bytes do arquivo.
 *
 * Serve a dois propositos que o nome do arquivo nao resolve:
 *
 *  1. **Validacao real.** `.png` no nome e `image/png` no MIME sao os dois
 *     controlados por quem envia. A assinatura de 8 bytes e o IHDR nao — um
 *     arquivo que passa aqui é um PNG de verdade.
 *  2. **Transparencia.** O tipo de cor do IHDR (e a presenca de tRNS) diz se o
 *     arquivo *pode* ter pixel transparente. Sem isso a alternativa seria
 *     decodificar a imagem inteira so para mostrar um selo na miniatura.
 *
 * Nada aqui executa conteudo do arquivo: sao leituras de inteiros em posicoes
 * fixas, com limite conferido antes de cada uma.
 */

/** \x89PNG\r\n\x1a\n — os 8 bytes que abrem todo PNG. */
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** Tipos de cor do IHDR que carregam canal alfa por definicao. */
const COLOR_TYPE_GRAY_ALPHA = 4;
const COLOR_TYPE_RGBA = 6;
const COLOR_TYPE_PALETTE = 3;

export type PngInfo = {
  width: number;
  height: number;
  bitDepth: number;
  /** 0 cinza, 2 RGB, 3 paleta, 4 cinza+alfa, 6 RGBA. */
  colorType: number;
  /**
   * O arquivo tem como representar pixel transparente. Nao garante que exista
   * algum: um RGBA totalmente opaco tambem responde `true`. Quem precisa da
   * certeza confere os pixels depois de decodificar.
   */
  mayHaveAlpha: boolean;
};

export function hasPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < SIGNATURE.length) return false;

  return SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** Inteiro de 32 bits big-endian, como manda o formato. */
function readUint32(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset];
  const b = bytes[offset + 1];
  const c = bytes[offset + 2];
  const d = bytes[offset + 3];

  if (a === undefined || b === undefined || c === undefined || d === undefined) return Number.NaN;

  // `>>> 0` mantem o resultado sem sinal: sem ele, um tamanho acima de 2^31
  // voltaria negativo e passaria despercebido nas comparacoes seguintes.
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function readChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

/**
 * Percorre os chunks a partir do IHDR procurando `tRNS`, que é como paleta,
 * cinza e RGB declaram transparencia sem ter canal alfa.
 *
 * Para no primeiro `IDAT`: dali em diante sao dados de imagem, e o tRNS é
 * obrigado pelo formato a vir antes. Evita varrer megabytes a toa.
 */
function hasTransparencyChunk(bytes: Uint8Array): boolean {
  // 8 da assinatura + 25 do IHDR (4 tamanho + 4 tipo + 13 dados + 4 CRC).
  let offset = 8 + 25;

  while (offset + 8 <= bytes.length) {
    const length = readUint32(bytes, offset);
    if (!Number.isFinite(length)) return false;

    const type = readChunkType(bytes, offset + 4);
    if (type === 'tRNS') return true;
    if (type === 'IDAT') return false;

    // tamanho + tipo + dados + CRC
    const next = offset + 12 + length;
    // Chunk declarando tamanho absurdo: arquivo corrompido, para por aqui.
    if (next <= offset || next > bytes.length) return false;

    offset = next;
  }

  return false;
}

/**
 * Devolve os dados do cabecalho, ou `undefined` quando os bytes nao formam um
 * PNG valido. Precisa apenas dos primeiros ~64 KB do arquivo.
 */
export function readPngInfo(bytes: Uint8Array): PngInfo | undefined {
  if (!hasPngSignature(bytes)) return undefined;

  // O IHDR é obrigatoriamente o primeiro chunk.
  if (bytes.length < 8 + 25) return undefined;
  if (readChunkType(bytes, 12) !== 'IHDR') return undefined;

  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];

  if (bitDepth === undefined || colorType === undefined) return undefined;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  if (width <= 0 || height <= 0) return undefined;

  const alphaChannel = colorType === COLOR_TYPE_RGBA || colorType === COLOR_TYPE_GRAY_ALPHA;
  const palette = colorType === COLOR_TYPE_PALETTE;

  return {
    width,
    height,
    bitDepth,
    colorType,
    mayHaveAlpha:
      alphaChannel ||
      ((palette || colorType === 0 || colorType === 2) && hasTransparencyChunk(bytes)),
  };
}
