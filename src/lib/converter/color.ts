import { DEFAULT_MATTE } from './formats';

/**
 * Cor de fundo usada para achatar transparencia ao converter para JPEG.
 *
 * O valor vem de um `<input type="color">`, que ja entrega `#rrggbb` — mas
 * tambem chega do `localStorage`, onde qualquer coisa pode ter sido gravada.
 * Como o texto termina em `ctx.fillStyle`, um valor invalido faria o canvas
 * ignorar a atribuicao em silencio e pintar o fundo com a cor anterior: o
 * usuario escolhe branco e recebe preto, sem nenhum erro na tela.
 *
 * Por isso a normalizacao é estrita e sempre devolve uma cor utilizavel.
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `fff`, `#FFF`, `ffffff` -> `#ffffff`. Invalido -> branco. */
export function normalizeHexColor(value: string, fallback: string = DEFAULT_MATTE): string {
  const match = HEX.exec(value.trim());
  if (!match) return fallback;

  const digits = (match[1] ?? '').toLowerCase();

  // A forma curta repete cada digito: `f0a` é `ff00aa`.
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;

  return `#${full}`;
}
