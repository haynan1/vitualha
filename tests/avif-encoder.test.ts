import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import encode, { init } from '@jsquash/avif/encode.js';

/**
 * Contrato com o encoder AVIF.
 *
 * AVIF é o unico formato do conversor sem encoder nativo em navegador: quem
 * codifica é o WebAssembly do libavif, em `src/lib/converter/avif.worker.ts`.
 * Isso cria duas dependencias que nenhum teste de unidade nosso pegaria:
 *
 *  1. **Os nomes das opcoes.** A biblioteca ja trocou `cqLevel` por `quality`
 *     entre versoes maiores. Opcao com nome errado nao lanca erro — é ignorada
 *     em silencio, e o arquivo sai na qualidade padrao. O usuario move o
 *     controle e nada muda.
 *  2. **A inicializacao por modulo pre-compilado.** O worker compila o .wasm
 *     por conta propria e entrega pronto ao `init()`, em vez de deixar o
 *     Emscripten adivinhar a URL — que é o que quebra quando o bundler renomeia
 *     o arquivo. Este teste percorre exatamente esse caminho.
 *
 * A conferencia é a assinatura do proprio arquivo: um AVIF de verdade abre com
 * a caixa `ftyp` e a marca `avif`. É o que impede a ferramenta de entregar
 * outro formato com a extensao trocada.
 */

const require = createRequire(import.meta.url);

function inspect(buffer: ArrayBuffer): { box: string; brand: string; size: number } {
  const bytes = new Uint8Array(buffer);
  const text = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));

  // ISO-BMFF: [tamanho 4][tipo da caixa 4][marca principal 4]
  return { box: text(4, 8), brand: text(8, 12), size: bytes.length };
}

/** Gradiente com metade direita semitransparente, para exercitar o alfa. */
function sample(width = 160, height = 120): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;

      data[i] = Math.round((x / width) * 255);
      data[i + 1] = Math.round((y / height) * 255);
      data[i + 2] = 128;
      data[i + 3] = x > width / 2 ? 128 : 255;
    }
  }

  return { data, width, height } as ImageData;
}

describe('encoder AVIF (WebAssembly)', () => {
  beforeAll(async () => {
    // Mesma sequencia do worker: compilar aqui e entregar o modulo pronto.
    const wasm = await readFile(
      join(dirname(require.resolve('@jsquash/avif/encode.js')), 'codec/enc/avif_enc.wasm'),
    );

    await init(await WebAssembly.compile(wasm));
  }, 30_000);

  it('produz um AVIF de verdade em qualidade alta com 4:4:4', async () => {
    const info = inspect(await encode(sample(), { quality: 95, subsample: 3, speed: 6 }));

    expect(info.box).toBe('ftyp');
    expect(info.brand).toBe('avif');
    expect(info.size).toBeGreaterThan(0);
  }, 30_000);

  it('aceita o modo sem perdas que a qualidade 100 aciona', async () => {
    const info = inspect(await encode(sample(), { lossless: true, speed: 6 }));

    expect(info.brand).toBe('avif');
  }, 30_000);

  it('a opcao de qualidade tem efeito real sobre o tamanho', async () => {
    // Se `quality` fosse ignorada — nome trocado numa atualizacao —, os dois
    // arquivos sairiam identicos e o controle da interface nao faria nada.
    const image = sample();

    const alta = await encode(image, { quality: 95, subsample: 1, speed: 6 });
    const baixa = await encode(image, { quality: 20, subsample: 1, speed: 6 });

    expect(baixa.byteLength).toBeLessThan(alta.byteLength);
  }, 30_000);
});
