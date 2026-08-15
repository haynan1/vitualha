/// <reference lib="webworker" />
import encode, { init } from '@jsquash/avif/encode';
// `?url` faz o Vite emitir o .wasm como asset com hash e devolver o endereco
// final. Sem isso, o Emscripten tentaria adivinhar o caminho a partir de
// `import.meta.url` e pediria /_astro/avif_enc.wasm, que nunca foi copiado.
import wasmUrl from '@jsquash/avif/codec/enc/avif_enc.wasm?url';

import type { AvifEncodeRequest, AvifEncodeResponse } from './messages';

/**
 * Worker de AVIF.
 *
 * Existe porque AVIF é o unico dos tres formatos sem encoder nativo em
 * navegador nenhum — JPEG e WebP saem do proprio canvas, que ja codifica fora
 * da thread principal. Aqui o trabalho é WebAssembly puro e sincrono: rodando
 * na pagina, travaria a interface por segundos numa imagem grande.
 *
 * O modulo pesado é carregado na primeira conversao, nunca no carregamento da
 * pagina: quem so le o artigo nao baixa nada disto.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

let ready: Promise<void> | undefined;

/**
 * Compila o wasm aqui e entrega o modulo pronto ao jSquash.
 *
 * O `init` aceita um `WebAssembly.Module` ja compilado, e é por esse caminho
 * que passamos: o outro seria deixar o Emscripten resolver o arquivo sozinho,
 * que é exatamente a parte fragil quando o bundler renomeia assets.
 */
async function ensureEncoder(): Promise<void> {
  ready ??= (async () => {
    const response = await fetch(wasmUrl);

    if (!response.ok) throw new Error(`wasm ${response.status}`);

    // compileStreaming exige Content-Type application/wasm. A hospedagem daqui
    // declara (ver public/.htaccess), mas um proxy ou CDN no meio do caminho
    // pode reescrever o cabecalho — e ai o caminho por ArrayBuffer entrega o
    // mesmo resultado, so gastando uma copia a mais.
    let module: WebAssembly.Module;

    try {
      module = await WebAssembly.compileStreaming(response.clone());
    } catch {
      module = await WebAssembly.compile(await response.arrayBuffer());
    }

    await init(module);
  })();

  return ready;
}

/**
 * Traduz a qualidade da interface para as opcoes do libavif.
 *
 * `subsample: 3` é YUV 4:4:4 — sem descarte de resolucao de cor. Fica reservado
 * a qualidade alta, onde o usuario esta pedindo fidelidade e nao tamanho; de
 * 4:2:0 para 4:4:4 o arquivo cresce, e em qualidade baixa isso contraria o
 * proprio pedido. Em 100 o encoder entra em modo sem perdas.
 */
function optionsFor(quality: number): Record<string, unknown> {
  const clamped = Math.min(100, Math.max(0, Math.round(quality)));

  if (clamped >= 100) return { lossless: true, speed: 6 };

  return {
    quality: clamped,
    subsample: clamped >= 90 ? 3 : 1,
    // 6 é o padrao do libavif: o ponto em que ganhar mais compressao passa a
    // custar tempo que o usuario sente esperando na tela.
    speed: 6,
    chromaDeltaQ: false,
    sharpness: 0,
  };
}

scope.addEventListener('message', (event: MessageEvent<AvifEncodeRequest>) => {
  const { id, width, height, pixels, quality } = event.data;

  void (async () => {
    try {
      await ensureEncoder();

      const image = { data: new Uint8ClampedArray(pixels), width, height };
      const bytes = await encode(image as ImageData, optionsFor(quality));

      const response: AvifEncodeResponse = { id, ok: true, bytes };
      scope.postMessage(response, [bytes]);
    } catch (error) {
      const response: AvifEncodeResponse = {
        id,
        ok: false,
        // Só a mensagem: stack trace nao interessa a quem esta convertendo, e
        // a interface troca isto por um texto proprio de qualquer forma.
        error: error instanceof Error ? error.message : 'encode failed',
      };

      scope.postMessage(response);
    }
  })();
});
