import { FORMAT_EXTENSION, type OutputFormat } from './formats';

/**
 * Nome do arquivo de saida.
 *
 * Duas exigencias que puxam para lados opostos:
 *
 *  - **Reconhecivel.** `foto-produto.png` tem que virar `foto-produto.jpg`, e
 *    nao `file123-converted-final2.jpg`. O nome é do usuario, nao nosso.
 *  - **Seguro.** O mesmo texto vira atributo `download`, entrada de ZIP e
 *    conteudo de elemento na tela. Um nome como `../../.bashrc` ou
 *    `<img onerror=...>.png` nao pode escapar de nenhum dos tres.
 *
 * A saida daqui é sempre um unico segmento, sem barra, sem caractere de
 * controle e sem os que o Windows recusa. A protecao contra XSS na tela vem de
 * escrever sempre em `textContent` — isto aqui é a segunda camada, nao a
 * unica.
 */

/** Windows recusa estes; `/` e `\` sairiam do diretorio de download. */
const ILLEGAL = /[<>:"|?*/\\]/g;

/**
 * Remove caracteres de controle — invisiveis na tela e perigosos num cabecalho
 * de download, onde uma quebra de linha permitiria injetar outro cabecalho.
 *
 * Feito por codigo de caractere e nao por expressao regular de proposito: o
 * intervalo escrito como regex fica ilegivel no arquivo (sao bytes invisiveis)
 * e é justamente o padrao que a regra `no-control-regex` existe para pegar.
 */
function stripControl(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;

      return code > 0x1f && code !== 0x7f;
    })
    .join('');
}

/** Nomes reservados pelo Windows, com ou sem extensao. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const MAX_BASE_LENGTH = 100;

/**
 * Remove a extensao e tudo que possa fazer o nome escapar do proprio campo.
 * Devolve `fallback` quando nao sobra nada utilizavel.
 */
export function safeBaseName(original: string, fallback = 'image'): string {
  // Só o ultimo segmento: descarta qualquer caminho que venha junto.
  const lastSegment = original.split(/[/\\]/).pop() ?? '';

  const withoutExtension = lastSegment.replace(/\.[^.]*$/, '');

  const cleaned = stripControl(withoutExtension)
    .replace(ILLEGAL, '')
    // Espacos multiplos viram um so; o nome continua legivel.
    .replace(/\s+/g, ' ')
    // Ponto ou espaco nas pontas quebram o Explorer do Windows.
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    // O corte pode ter deixado um espaco solto no fim.
    .replace(/[\s.]+$/g, '');

  if (cleaned.length === 0 || RESERVED.test(cleaned)) return fallback;

  return cleaned;
}

/** `foto-produto.png` + `webp` -> `foto-produto.webp` */
export function outputName(original: string, format: OutputFormat, fallback = 'image'): string {
  return `${safeBaseName(original, fallback)}.${FORMAT_EXTENSION[format]}`;
}

/**
 * Desambigua nomes repetidos dentro de um mesmo ZIP.
 *
 * Acontece de verdade: duas pastas diferentes, dois `captura.png`. Sem isto o
 * ZIP sai com duas entradas de mesmo nome e o extrator sobrescreve uma — o
 * usuario baixa 8 imagens e encontra 7.
 *
 * A comparacao ignora maiuscula/minuscula porque Windows e macOS tambem
 * ignoram: `Foto.jpg` e `foto.jpg` colidem la, mesmo sendo distintos aqui.
 */
export function uniqueNames(names: readonly string[]): string[] {
  const used = new Set<string>();

  return names.map((name) => {
    const key = name.toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return name;
    }

    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : '';

    let counter = 2;
    let candidate = `${base}-${counter}${extension}`;

    while (used.has(candidate.toLowerCase())) {
      counter += 1;
      candidate = `${base}-${counter}${extension}`;
    }

    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/** Nome do ZIP quando o usuario baixa tudo de uma vez. */
export function archiveName(format: OutputFormat): string {
  return `imagens-${FORMAT_EXTENSION[format]}.zip`;
}
