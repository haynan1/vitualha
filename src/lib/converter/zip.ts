/**
 * Gerador de ZIP minimo, so com o metodo STORE (sem compressao).
 *
 * Por que sem biblioteca: o conteudo aqui é sempre JPEG, WebP ou AVIF — todos
 * ja comprimidos. Passar deflate por cima gasta CPU do usuario para economizar
 * quase nada (costuma render menos de 1%). Sem deflate, o ZIP vira montagem de
 * cabecalhos, e uma dependencia so para concatenar bytes seria peso sem
 * contrapartida.
 *
 * Por que ZIP e nao varios downloads: navegador bloqueia downloads multiplos
 * em sequencia, e o usuario que converteu 20 imagens precisa de um clique, nao
 * de 20 caixas de permissao.
 *
 * Limites assumidos, coerentes com o uso: menos de 65.535 arquivos e menos de
 * 4 GB no total, entao nao ha ZIP64. Acima disso o navegador ja teria ficado
 * sem memoria muito antes — o conversor limita a fila bem abaixo.
 */

export type ZipEntry = { name: string; data: Uint8Array };

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

/** Bit 11: o nome do arquivo esta em UTF-8. Sem ele, acento vira lixo. */
const FLAG_UTF8 = 0x0800;

/** 2.0 — o minimo que entende diretorio central. */
const VERSION = 20;

const METHOD_STORE = 0;

let crcTable: Uint32Array | undefined;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;

  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let value = i;

    for (let bit = 0; bit < 8; bit += 1) {
      // 0xEDB88320 é o polinomio CRC-32 refletido, o mesmo do ZIP e do PNG.
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[i] = value >>> 0;
  }

  crcTable = table;
  return table;
}

export function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ (table[((crc ^ (data[i] ?? 0)) & 0xff) >>> 0] ?? 0);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Data/hora no formato MS-DOS, que é o que o ZIP guarda: 2 segundos de
 * resolucao e ano a partir de 1980.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Escritor sequencial little-endian — a ordem de bytes que o ZIP exige. */
class ByteWriter {
  private readonly view: DataView;
  private readonly bytes: Uint8Array<ArrayBuffer>;
  private offset = 0;

  constructor(size: number) {
    this.bytes = new Uint8Array(size);
    this.view = new DataView(this.bytes.buffer);
  }

  u16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value >>> 0, true);
    this.offset += 4;
  }

  raw(data: Uint8Array): void {
    this.bytes.set(data, this.offset);
    this.offset += data.length;
  }

  get position(): number {
    return this.offset;
  }

  finish(): Uint8Array<ArrayBuffer> {
    return this.bytes;
  }
}

/**
 * Monta o arquivo inteiro em memoria e devolve os bytes.
 *
 * @param when Data gravada nas entradas. Parametro em vez de `new Date()` fixo
 *   para o teste poder comparar bytes exatos.
 */
export function createZip(
  entries: readonly ZipEntry[],
  when: Date = new Date(),
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(when);

  const prepared = entries.map((entry) => {
    const name = encoder.encode(entry.name);

    return { name, data: entry.data, crc: crc32(entry.data) };
  });

  // 30 bytes de cabecalho local + 46 de entrada central + nome duas vezes.
  const size =
    prepared.reduce(
      (total, entry) => total + 30 + 46 + entry.name.length * 2 + entry.data.length,
      0,
    ) + 22;

  const out = new ByteWriter(size);
  const offsets: number[] = [];

  for (const entry of prepared) {
    offsets.push(out.position);

    out.u32(LOCAL_SIGNATURE);
    out.u16(VERSION);
    out.u16(FLAG_UTF8);
    out.u16(METHOD_STORE);
    out.u16(time);
    out.u16(date);
    out.u32(entry.crc);
    // Sem compressao, os dois tamanhos sao o mesmo numero.
    out.u32(entry.data.length);
    out.u32(entry.data.length);
    out.u16(entry.name.length);
    out.u16(0);
    out.raw(entry.name);
    out.raw(entry.data);
  }

  const centralStart = out.position;

  for (const [index, entry] of prepared.entries()) {
    out.u32(CENTRAL_SIGNATURE);
    out.u16(VERSION);
    out.u16(VERSION);
    out.u16(FLAG_UTF8);
    out.u16(METHOD_STORE);
    out.u16(time);
    out.u16(date);
    out.u32(entry.crc);
    out.u32(entry.data.length);
    out.u32(entry.data.length);
    out.u16(entry.name.length);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u32(0);
    out.u32(offsets[index] ?? 0);
    out.raw(entry.name);
  }

  const centralSize = out.position - centralStart;

  out.u32(END_SIGNATURE);
  out.u16(0);
  out.u16(0);
  out.u16(prepared.length);
  out.u16(prepared.length);
  out.u32(centralSize);
  out.u32(centralStart);
  out.u16(0);

  return out.finish();
}
