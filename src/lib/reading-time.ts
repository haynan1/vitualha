/** Velocidade media de leitura silenciosa para texto informativo. */
const WORDS_PER_MINUTE = 200;

/**
 * Remove sintaxe Markdown para que blocos de codigo, URLs e marcacao nao
 * inflem a contagem. Aproximacao deliberada: o objetivo é uma estimativa
 * honesta em minutos, nao uma metrica exata.
 */
export function countWords(markdown: string): number {
  const text = markdown
    // blocos de codigo cercados
    .replace(/```[\s\S]*?```/g, ' ')
    // codigo inline
    .replace(/`[^`]*`/g, ' ')
    // imagens (o alt nao é lido em fluxo)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // links: mantem o texto, descarta a URL
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // diretivas de callout (:::dica)
    .replace(/^:{3}.*$/gm, ' ')
    // marcacao residual
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/<[^>]+>/g, ' ');

  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  return words.length;
}

/** Tempo de leitura em minutos inteiros, sempre >= 1. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(countWords(markdown) / WORDS_PER_MINUTE));
}
