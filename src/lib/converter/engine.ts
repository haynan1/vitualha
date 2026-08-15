import { normalizeHexColor } from './color';
import { FORMAT_KEEPS_ALPHA, FORMAT_MIME, type OutputFormat } from './formats';
import type { AvifEncodeRequest, AvifEncodeResponse } from './messages';
import { longEdgeDimensions, targetDimensions, type Dimensions } from './resize';

/**
 * Motor da conversao, no navegador do usuario.
 *
 * Divisao de trabalho, e a razao de cada lado:
 *
 *  - **Decodificar, redimensionar e achatar transparencia** ficam na pagina.
 *    `createImageBitmap` e `drawImage` sao nativos e acelerados; passar isso
 *    para um worker custaria uma copia inteira da imagem e nao ganharia nada.
 *  - **JPEG e WebP** saem de `canvas.toBlob`, que os navegadores ja executam
 *    fora da thread principal. Chamar de dentro de um worker nao deixaria a
 *    interface mais fluida e exigiria `OffscreenCanvas`, que Safari so tem a
 *    partir da 16.4.
 *  - **AVIF** vai para o worker. É o unico formato sem encoder nativo, entao o
 *    trabalho é WebAssembly sincrono — na pagina, congelaria a aba.
 *
 * Nenhum byte sai do dispositivo em nenhum desses caminhos.
 */

export type ResizePlan =
  | { kind: 'original' }
  | { kind: 'custom'; width?: number | undefined; height?: number | undefined; keepRatio: boolean }
  | { kind: 'longEdge'; maxEdge: number };

export type ConvertOptions = {
  format: OutputFormat;
  /** 0 a 100. */
  quality: number;
  /** Cor que substitui a transparencia quando o destino nao tem canal alfa. */
  matte: string;
  resize: ResizePlan;
};

export type ConvertResult = {
  blob: Blob;
  width: number;
  height: number;
};

/** Falhas que a interface sabe traduzir. Qualquer outra vira erro generico. */
export type ConvertFailure = 'decode' | 'unsupported' | 'memory' | 'encode';

export class ConvertError extends Error {
  constructor(readonly failure: ConvertFailure) {
    super(failure);
    this.name = 'ConvertError';
  }
}

function planDimensions(source: Dimensions, plan: ResizePlan): Dimensions {
  if (plan.kind === 'longEdge') return longEdgeDimensions(source, plan.maxEdge);

  if (plan.kind === 'custom') {
    return targetDimensions(source, {
      width: plan.width,
      height: plan.height,
      keepRatio: plan.keepRatio,
    });
  }

  return { width: source.width, height: source.height };
}

/**
 * `toBlob` conferido.
 *
 * O detalhe que exige a conferencia: pedindo um tipo que o navegador nao
 * codifica, a especificacao manda cair para PNG **em silencio**. Sem checar o
 * `type` do resultado, um Safari antigo entregaria um PNG e a ferramenta o
 * salvaria como `.webp` — arquivo mentiroso, que quebra em qualquer lugar que
 * confie na extensao.
 */
function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ConvertError('encode'));
          return;
        }

        if (blob.type !== mime) {
          reject(new ConvertError('unsupported'));
          return;
        }

        resolve(blob);
      },
      mime,
      // A API trabalha em 0..1; a interface, em 0..100.
      quality / 100,
    );
  });
}

export class ConverterEngine {
  private worker: Worker | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, (response: AvifEncodeResponse) => void>();

  /**
   * O worker nasce na primeira conversao para AVIF — e so nela. Quem converte
   * para JPEG ou WebP nunca baixa o WebAssembly.
   */
  private getWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(new URL('./avif.worker.ts', import.meta.url), { type: 'module' });

    worker.addEventListener('message', (event: MessageEvent<AvifEncodeResponse>) => {
      const resolve = this.pending.get(event.data.id);
      if (!resolve) return;

      this.pending.delete(event.data.id);
      resolve(event.data);
    });

    this.worker = worker;
    return worker;
  }

  private encodeAvif(image: ImageData, quality: number): Promise<Blob> {
    const worker = this.getWorker();
    const id = this.nextId;
    this.nextId += 1;

    return new Promise((resolve, reject) => {
      this.pending.set(id, (response) => {
        if (!response.ok) {
          reject(new ConvertError('encode'));
          return;
        }

        resolve(new Blob([response.bytes], { type: FORMAT_MIME.avif }));
      });

      const request: AvifEncodeRequest = {
        id,
        width: image.width,
        height: image.height,
        pixels: image.data.buffer,
        quality,
      };

      // Transferido, nao copiado: uma imagem de 4000x3000 sao 48 MB que nao
      // precisam existir duas vezes.
      worker.postMessage(request, [request.pixels]);
    });
  }

  async convert(file: File, options: ConvertOptions): Promise<ConvertResult> {
    let bitmap: ImageBitmap | undefined;
    let canvas: HTMLCanvasElement | undefined;

    try {
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw new ConvertError('decode');
      }

      const target = planDimensions({ width: bitmap.width, height: bitmap.height }, options.resize);

      canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;

      const context = canvas.getContext('2d', { alpha: FORMAT_KEEPS_ALPHA[options.format] });
      if (!context) throw new ConvertError('memory');

      if (!FORMAT_KEEPS_ALPHA[options.format]) {
        // Pintar antes de desenhar é o que troca o "transparente" por uma cor
        // escolhida. Sem isto, o JPEG resolve sozinho — e resolve com preto.
        context.fillStyle = normalizeHexColor(options.matte);
        context.fillRect(0, 0, target.width, target.height);
      }

      // Reamostragem de qualidade alta na reducao; nenhum realce artificial é
      // aplicado depois, para o arquivo nao sair mais "nitido" que o original.
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, target.width, target.height);

      bitmap.close();
      bitmap = undefined;

      if (options.format === 'avif') {
        let image: ImageData;

        try {
          image = context.getImageData(0, 0, target.width, target.height);
        } catch {
          throw new ConvertError('memory');
        }

        const blob = await this.encodeAvif(image, options.quality);
        return { blob, width: target.width, height: target.height };
      }

      const blob = await canvasToBlob(canvas, FORMAT_MIME[options.format], options.quality);
      return { blob, width: target.width, height: target.height };
    } finally {
      bitmap?.close();

      // Zerar as dimensoes libera o buffer do canvas na hora, em vez de deixar
      // dezenas de megabytes esperando o coletor de lixo entre uma imagem e a
      // proxima da fila.
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  }

  /** Encerra o worker e descarta pedidos pendentes. */
  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.pending.clear();
  }
}

/**
 * Descobre o que este navegador realmente codifica.
 *
 * JPEG é universal. WebP depende do Safari ser 16 ou mais novo. AVIF nao usa
 * o navegador para codificar, entao basta haver WebAssembly — o que vale para
 * qualquer navegador que rode este site.
 */
export async function detectSupport(): Promise<Record<OutputFormat, boolean>> {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;

  const webp = await new Promise<boolean>((resolve) => {
    try {
      probe.toBlob((blob) => {
        resolve(blob?.type === FORMAT_MIME.webp);
      }, FORMAT_MIME.webp);
    } catch {
      resolve(false);
    }
  });

  probe.width = 0;
  probe.height = 0;

  return {
    jpeg: true,
    webp,
    avif: typeof WebAssembly === 'object',
  };
}
