/**
 * Catalogo dos formatos de saida do conversor.
 *
 * Fonte unica: a interface, o worker, os nomes de arquivo e os testes leem
 * daqui. Acrescentar um formato é acrescentar uma entrada — nenhum `switch`
 * espalhado pela interface precisa ser caçado.
 */

export const OUTPUT_FORMATS = ['jpeg', 'webp', 'avif'] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const FORMAT_MIME = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
} as const satisfies Record<OutputFormat, string>;

/**
 * `jpg` e nao `jpeg`: é o que o usuario espera ver, e o que praticamente todo
 * software escreve. Os dois designam o mesmo formato.
 */
export const FORMAT_EXTENSION = {
  jpeg: 'jpg',
  webp: 'webp',
  avif: 'avif',
} as const satisfies Record<OutputFormat, string>;

/**
 * Formatos que carregam canal alfa. JPEG nao tem — por isso a interface pede
 * uma cor de fundo antes de converter imagem com transparencia, em vez de
 * decidir sozinha e devolver a foto com fundo preto.
 */
export const FORMAT_KEEPS_ALPHA = {
  jpeg: false,
  webp: true,
  avif: true,
} as const satisfies Record<OutputFormat, boolean>;

/** Rotulo exibido no seletor. */
export const FORMAT_LABEL = {
  jpeg: 'JPG / JPEG',
  webp: 'WebP',
  avif: 'AVIF',
} as const satisfies Record<OutputFormat, string>;

export function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === 'string' && (OUTPUT_FORMATS as readonly string[]).includes(value);
}

/**
 * Presets de qualidade. Numeros escolhidos pelo comportamento real dos
 * encoders, nao por simetria: abaixo de ~70 o JPEG comeca a mostrar blocagem
 * em gradiente e tom de pele, e 100 desliga praticamente toda a perda — util
 * para arquivo de trabalho, exagerado para web.
 */
export const QUALITY_PRESETS = {
  smaller: 70,
  balanced: 85,
  high: 95,
  maximum: 100,
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;

export const QUALITY_PRESET_KEYS = ['smaller', 'balanced', 'high', 'maximum'] as const;

export const DEFAULT_QUALITY: number = QUALITY_PRESETS.high;

export const DEFAULT_FORMAT: OutputFormat = 'webp';

/** Cor padrao para achatar transparencia ao converter para JPEG. */
export const DEFAULT_MATTE = '#ffffff';

/**
 * Acima disto o navegador costuma falhar ao alocar o canvas antes de qualquer
 * encoder ser chamado. O limite é por imagem, em pixels (largura x altura):
 * ~80 MP cobre 12000x6600, bem acima de qualquer camera de consumo.
 *
 * Nao é limite comercial e nao existe para empurrar plano pago — é o ponto a
 * partir do qual a aba trava em vez de converter.
 */
export const MAX_PIXELS = 80_000_000;

/** Teto por arquivo. PNG sem compressao de 80 MP passa longe disso. */
export const MAX_BYTES = 250 * 1024 * 1024;

/** Quantos arquivos a fila aceita de uma vez. */
export const MAX_FILES = 50;
