import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Contraste é regra, nao gosto: texto pequeno abaixo de 4.5:1 é ilegivel para
 * uma parte real dos leitores. Este teste le os tokens de verdade, entao
 * mudar uma cor no design system e quebrar acessibilidade falha o build —
 * em vez de passar despercebido ate alguem reclamar.
 *
 * Referencia: WCAG 2.2, criterio 1.4.3 (Contrast Minimum), nivel AA.
 */

const MIN_AA = 4.5;

const css = readFileSync(
  fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)),
  'utf8',
);

/** Extrai as variaveis de cor de um bloco especifico do arquivo. */
function palette(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Bloco "${selector}" nao encontrado em tokens.css`);

  const open = css.indexOf('{', start);
  const end = css.indexOf('color-scheme', open);
  const block = css.slice(open, end);

  const colors: Record<string, string> = {};
  for (const match of block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    colors[match[1] as string] = match[2] as string;
  }

  return colors;
}

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

const light = palette(':root {');
const dark = palette(":root[data-theme='dark']");

/**
 * Cada par corresponde a uma combinacao que existe de fato na interface.
 * Texto tenue aparece sobre os dois fundos (pagina e cartao), entao é medido
 * contra o pior dos dois.
 */
const pairs: Array<[string, string, string]> = [
  ['texto sobre a pagina', '--text', '--bg'],
  ['texto sobre cartao', '--text', '--surface'],
  ['texto secundario sobre a pagina', '--text-muted', '--bg'],
  ['texto secundario sobre cartao', '--text-muted', '--surface'],
  ['texto tenue sobre a pagina', '--text-faint', '--bg'],
  ['texto tenue sobre cartao', '--text-faint', '--surface'],
  ['link/destaque sobre a pagina', '--primary', '--bg'],
  ['texto do botao sobre o primario', '--primary-contrast', '--primary'],
  ['etiqueta sobre o tom claro da marca', '--primary-strong', '--tint'],
];

describe('contraste dos tokens (WCAG AA)', () => {
  for (const [name, foreground, background] of pairs) {
    it(`tema claro: ${name}`, () => {
      const fg = light[foreground];
      const bg = light[background];
      expect(fg, `${foreground} ausente no tema claro`).toBeDefined();
      expect(bg, `${background} ausente no tema claro`).toBeDefined();
      expect(contrast(fg as string, bg as string)).toBeGreaterThanOrEqual(MIN_AA);
    });

    it(`tema escuro: ${name}`, () => {
      const fg = dark[foreground];
      const bg = dark[background];
      expect(fg, `${foreground} ausente no tema escuro`).toBeDefined();
      expect(bg, `${background} ausente no tema escuro`).toBeDefined();
      expect(contrast(fg as string, bg as string)).toBeGreaterThanOrEqual(MIN_AA);
    });
  }

  it('define a paleta inteira nos dois temas', () => {
    // Uma cor presente so num tema deixaria o outro sem valor definido.
    expect(Object.keys(dark).sort()).toEqual(
      Object.keys(light)
        .filter((key) => key in dark)
        .sort(),
    );
  });
});
