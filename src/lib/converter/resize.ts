/**
 * Calculo das dimensoes de saida.
 *
 * Regra que atravessa o arquivo inteiro: sem pedido explicito, a imagem sai no
 * tamanho em que entrou. Reduzir resolucao por conta propria é a forma mais
 * comum de um conversor "economizar" bytes que o usuario nao autorizou a
 * perder — e depois ele descobre no dia da impressao.
 */

export type Dimensions = { width: number; height: number };

export type ResizeRequest = {
  /** Ausente significa "decidir a partir da outra medida". */
  width?: number | undefined;
  height?: number | undefined;
  keepRatio: boolean;
};

/** Pixel é indivisivel e imagem de zero pixel nao existe. */
function clamp(value: number): number {
  return Math.max(1, Math.round(value));
}

function isUsable(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Dimensoes finais para um pedido do usuario.
 *
 * Com `keepRatio` e as duas medidas preenchidas, a imagem é encaixada *dentro*
 * da caixa (contain), nunca cortada: o usuario pediu no maximo 800x600, e
 * receber 800x600 com um pedaco faltando seria outra coisa.
 */
export function targetDimensions(source: Dimensions, request: ResizeRequest): Dimensions {
  // Em variaveis proprias, e nao em propriedades: o estreitamento de tipo do
  // TypeScript acompanha o `const`, mas nao sobrevive a um acesso a campo.
  const width = isUsable(request.width) ? request.width : undefined;
  const height = isUsable(request.height) ? request.height : undefined;

  if (width === undefined && height === undefined) {
    return { width: clamp(source.width), height: clamp(source.height) };
  }

  const ratio = source.width / source.height;

  if (!request.keepRatio) {
    return {
      width: clamp(width ?? source.width),
      height: clamp(height ?? source.height),
    };
  }

  if (width !== undefined && height !== undefined) {
    // Escolhe o fator que cabe nas duas medidas.
    const scale = Math.min(width / source.width, height / source.height);
    return { width: clamp(source.width * scale), height: clamp(source.height * scale) };
  }

  if (width !== undefined) return { width: clamp(width), height: clamp(width / ratio) };

  return { width: clamp((height ?? 0) * ratio), height: clamp(height ?? 0) };
}

/**
 * Presets de "maior lado". Nunca aumenta: pedir 1920 numa imagem de 800 px
 * devolve os 800 originais. Ampliar nao acrescenta detalhe, so peso e
 * borroes — e o usuario escolheu um preset de reducao.
 */
export function longEdgeDimensions(source: Dimensions, maxEdge: number): Dimensions {
  if (!isUsable(maxEdge)) return { width: clamp(source.width), height: clamp(source.height) };

  const longest = Math.max(source.width, source.height);
  if (longest <= maxEdge) return { width: clamp(source.width), height: clamp(source.height) };

  const scale = maxEdge / longest;

  return { width: clamp(source.width * scale), height: clamp(source.height * scale) };
}

/** Completa a medida que falta, para o formulario mostrar as duas. */
export function completeDimension(
  source: Dimensions,
  edited: 'width' | 'height',
  value: number,
): Dimensions {
  const ratio = source.width / source.height;

  return edited === 'width'
    ? { width: clamp(value), height: clamp(value / ratio) }
    : { width: clamp(value * ratio), height: clamp(value) };
}
