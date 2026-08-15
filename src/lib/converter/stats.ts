import type { Locale } from '../../i18n/locales';
import { LOCALE_TAG } from '../../i18n/locales';

/**
 * Comparacao de tamanho antes/depois.
 *
 * O ponto delicado aqui é o caso em que o arquivo *cresce*. Acontece de
 * verdade: PNG de captura de tela com pouca cor, convertido para JPEG em
 * qualidade 100, sai maior. Mostrar "reducao de -4%" ou esconder o numero
 * seria mentir por omissao — o tipo de detalhe que separa ferramenta honesta
 * de ferramenta que infla resultado.
 */

export type SizeComparison = {
  before: number;
  after: number;
  /** Sempre positivo. Leia junto com `grew` para saber a direcao. */
  percent: number;
  /** O convertido ficou maior que o original. */
  grew: boolean;
};

export function compareSize(before: number, after: number): SizeComparison {
  if (!Number.isFinite(before) || before <= 0) {
    return { before, after, percent: 0, grew: false };
  }

  const delta = before - after;
  const percent = Math.round(Math.abs(delta / before) * 100);

  return { before, after, percent, grew: delta < 0 };
}

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/**
 * Tamanho legivel, com separador decimal do idioma: `2,8 MB` em portugues e
 * `2.8 MB` em ingles. Base 1024, que é a que os sistemas de arquivo mostram.
 */
export function formatBytes(bytes: number, locale: Locale): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';

  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // Byte inteiro nao tem casa decimal; a partir de KB, uma casa basta para
  // distinguir 420 KB de 480 KB sem poluir a tela.
  const digits = unit === 0 ? 0 : 1;

  const formatted = new Intl.NumberFormat(LOCALE_TAG[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

  return `${formatted} ${UNITS[unit]}`;
}

/** `1920 × 1080 px` — com o sinal de multiplicacao, nao a letra x. */
export function formatDimensions(width: number, height: number, locale: Locale): string {
  const number = new Intl.NumberFormat(LOCALE_TAG[locale]);

  return `${number.format(width)} × ${number.format(height)} px`;
}
