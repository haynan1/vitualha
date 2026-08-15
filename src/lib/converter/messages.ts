/**
 * Protocolo entre a pagina e o worker de AVIF.
 *
 * Sao tipos puros, sem import de runtime, justamente para os dois lados
 * poderem incluir este arquivo sem arrastar dependencia de DOM nem de worker.
 */

export type AvifEncodeRequest = {
  /** Correlaciona resposta com pedido: o worker atende um de cada vez, mas a fila nao espera. */
  id: number;
  width: number;
  height: number;
  /** RGBA, 4 bytes por pixel. Enviado como transferable — a pagina perde a posse. */
  pixels: ArrayBuffer;
  /** 0 a 100, como na interface. */
  quality: number;
};

export type AvifEncodeResponse =
  { id: number; ok: true; bytes: ArrayBuffer } | { id: number; ok: false; error: string };
