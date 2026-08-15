import { describe, expect, it } from 'vitest';

import { normalizeHexColor } from '@/lib/converter/color';
import { archiveName, outputName, safeBaseName, uniqueNames } from '@/lib/converter/filename';
import { FORMAT_KEEPS_ALPHA, MAX_BYTES, OUTPUT_FORMATS } from '@/lib/converter/formats';
import { hasPngSignature, readPngInfo } from '@/lib/converter/png';
import { completeDimension, longEdgeDimensions, targetDimensions } from '@/lib/converter/resize';
import { compareSize, formatBytes, formatDimensions } from '@/lib/converter/stats';
import { inspectPngBytes } from '@/lib/converter/validate';
import { crc32, createZip } from '@/lib/converter/zip';

// ── Fixtures ───────────────────────────────────────────────────────────────

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function chunk(type: string, data: number[]): number[] {
  const length = data.length;

  return [
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...Array.from(type, (character) => character.charCodeAt(0)),
    ...data,
    // CRC nao é conferido na leitura do cabecalho — quatro zeros bastam.
    0,
    0,
    0,
    0,
  ];
}

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

/** PNG sintetico: so o suficiente para o leitor de cabecalho. */
function png(options: {
  width?: number;
  height?: number;
  colorType?: number;
  trns?: boolean;
}): Uint8Array {
  const { width = 1920, height = 1080, colorType = 6, trns = false } = options;

  return new Uint8Array([
    ...SIGNATURE,
    ...chunk('IHDR', [...be32(width), ...be32(height), 8, colorType, 0, 0, 0]),
    ...(trns ? chunk('tRNS', [0, 0, 0]) : []),
    ...chunk('IDAT', [0x78, 0x9c, 0x63, 0x00]),
  ]);
}

// ── PNG ────────────────────────────────────────────────────────────────────

describe('readPngInfo', () => {
  it('le dimensoes e tipo de cor', () => {
    const info = readPngInfo(png({ width: 1920, height: 1080, colorType: 6 }));

    expect(info).toMatchObject({ width: 1920, height: 1080, colorType: 6, bitDepth: 8 });
  });

  it('reconhece canal alfa pelo tipo de cor', () => {
    // 6 = RGBA, 4 = cinza + alfa.
    expect(readPngInfo(png({ colorType: 6 }))?.mayHaveAlpha).toBe(true);
    expect(readPngInfo(png({ colorType: 4 }))?.mayHaveAlpha).toBe(true);
    // 2 = RGB, 0 = cinza: sem canal alfa.
    expect(readPngInfo(png({ colorType: 2 }))?.mayHaveAlpha).toBe(false);
    expect(readPngInfo(png({ colorType: 0 }))?.mayHaveAlpha).toBe(false);
  });

  it('reconhece transparencia declarada em tRNS numa paleta', () => {
    // Paleta sem tRNS é opaca; com tRNS, tem cor transparente.
    expect(readPngInfo(png({ colorType: 3 }))?.mayHaveAlpha).toBe(false);
    expect(readPngInfo(png({ colorType: 3, trns: true }))?.mayHaveAlpha).toBe(true);
  });

  it('recusa bytes que nao sao PNG', () => {
    // JPEG comeca com FF D8 FF; um SVG renomeado comeca com '<'.
    expect(readPngInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeUndefined();
    expect(readPngInfo(new TextEncoder().encode('<svg onload="alert(1)">'))).toBeUndefined();
    expect(hasPngSignature(new Uint8Array([0x89, 0x50]))).toBe(false);
  });

  it('recusa cabecalho truncado sem estourar', () => {
    expect(readPngInfo(new Uint8Array(SIGNATURE))).toBeUndefined();
  });
});

// ── Validacao ──────────────────────────────────────────────────────────────

describe('inspectPngBytes', () => {
  it('aceita um PNG dentro dos limites', () => {
    const result = inspectPngBytes(png({}), 2_800_000);

    expect(result.ok).toBe(true);
  });

  it('recusa arquivo que nao é PNG, mesmo com tamanho plausivel', () => {
    const result = inspectPngBytes(new TextEncoder().encode('GIF89a'), 1000);

    expect(result).toEqual({ ok: false, reason: 'not-png' });
  });

  it('recusa arquivo acima do teto de bytes', () => {
    expect(inspectPngBytes(png({}), MAX_BYTES + 1)).toEqual({ ok: false, reason: 'too-large' });
  });

  it('recusa resolucao que estouraria a memoria do navegador', () => {
    const enorme = png({ width: 30_000, height: 30_000 });

    expect(inspectPngBytes(enorme, 5_000_000)).toEqual({ ok: false, reason: 'too-many-pixels' });
  });

  it('recusa arquivo vazio', () => {
    expect(inspectPngBytes(new Uint8Array(), 0)).toEqual({ ok: false, reason: 'unreadable' });
  });
});

// ── Nomes de arquivo ───────────────────────────────────────────────────────

describe('outputName', () => {
  it('troca a extensao preservando o nome do usuario', () => {
    expect(outputName('foto-produto.png', 'jpeg')).toBe('foto-produto.jpg');
    expect(outputName('foto-produto.png', 'webp')).toBe('foto-produto.webp');
    expect(outputName('foto-produto.png', 'avif')).toBe('foto-produto.avif');
  });

  it('preserva acento e espaco', () => {
    expect(outputName('café da manhã.png', 'webp')).toBe('café da manhã.webp');
  });

  it('neutraliza travessia de diretorio', () => {
    expect(safeBaseName('../../etc/passwd.png')).toBe('passwd');
    expect(safeBaseName('C:\\Windows\\System32\\config.png')).toBe('config');
  });

  it('remove caracteres que quebrariam o download ou a tela', () => {
    expect(safeBaseName('<img onerror=alert(1)>.png')).toBe('img onerror=alert(1)');
    expect(safeBaseName('a:b|c?d*e.png')).toBe('abcde');
  });

  it('cai no padrao quando nao sobra nome utilizavel', () => {
    expect(safeBaseName('.png')).toBe('image');
    expect(safeBaseName('...')).toBe('image');
    expect(safeBaseName('   ')).toBe('image');
    // Nome reservado do Windows: um arquivo chamado CON nao pode ser criado.
    expect(safeBaseName('con.png')).toBe('image');
  });

  it('mantem o nome dentro de um limite razoavel', () => {
    expect(safeBaseName(`${'a'.repeat(500)}.png`).length).toBe(100);
  });
});

describe('uniqueNames', () => {
  it('mantem nomes ja distintos', () => {
    expect(uniqueNames(['a.jpg', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg']);
  });

  it('desambigua repetidos sem perder a extensao', () => {
    expect(uniqueNames(['foto.jpg', 'foto.jpg', 'foto.jpg'])).toEqual([
      'foto.jpg',
      'foto-2.jpg',
      'foto-3.jpg',
    ]);
  });

  it('trata colisao que so existe em sistema sem diferenciar maiuscula', () => {
    expect(uniqueNames(['Foto.jpg', 'foto.jpg'])).toEqual(['Foto.jpg', 'foto-2.jpg']);
  });

  it('nao gera novo conflito ao desambiguar', () => {
    expect(uniqueNames(['foto.jpg', 'foto-2.jpg', 'foto.jpg'])).toEqual([
      'foto.jpg',
      'foto-2.jpg',
      'foto-3.jpg',
    ]);
  });
});

describe('archiveName', () => {
  it('nomeia o pacote pelo formato escolhido', () => {
    expect(archiveName('webp')).toBe('imagens-webp.zip');
    expect(archiveName('jpeg')).toBe('imagens-jpg.zip');
  });
});

// ── Redimensionamento ──────────────────────────────────────────────────────

const FOTO = { width: 1920, height: 1080 };

describe('targetDimensions', () => {
  it('sem pedido nenhum, devolve o tamanho original', () => {
    expect(targetDimensions(FOTO, { keepRatio: true })).toEqual(FOTO);
  });

  it('deriva a altura a partir da largura, mantendo proporcao', () => {
    expect(targetDimensions(FOTO, { width: 960, keepRatio: true })).toEqual({
      width: 960,
      height: 540,
    });
  });

  it('deriva a largura a partir da altura', () => {
    expect(targetDimensions(FOTO, { height: 540, keepRatio: true })).toEqual({
      width: 960,
      height: 540,
    });
  });

  it('com as duas medidas e proporcao travada, encaixa dentro da caixa', () => {
    // 800x800 numa imagem 16:9 vira 800x450 — cabe, e nada é cortado.
    expect(targetDimensions(FOTO, { width: 800, height: 800, keepRatio: true })).toEqual({
      width: 800,
      height: 450,
    });
  });

  it('sem proporcao travada, obedece exatamente o que foi digitado', () => {
    expect(targetDimensions(FOTO, { width: 800, height: 800, keepRatio: false })).toEqual({
      width: 800,
      height: 800,
    });
  });

  it('ignora valor invalido em vez de gerar imagem de zero pixel', () => {
    expect(targetDimensions(FOTO, { width: 0, keepRatio: true })).toEqual(FOTO);
    expect(targetDimensions(FOTO, { width: Number.NaN, keepRatio: true })).toEqual(FOTO);
    expect(targetDimensions(FOTO, { width: -100, keepRatio: true })).toEqual(FOTO);
  });

  it('nunca devolve menos de um pixel', () => {
    expect(targetDimensions(FOTO, { width: 1, keepRatio: true }).height).toBe(1);
  });
});

describe('longEdgeDimensions', () => {
  it('reduz pelo maior lado', () => {
    expect(longEdgeDimensions(FOTO, 1200)).toEqual({ width: 1200, height: 675 });
  });

  it('respeita imagem em pé', () => {
    expect(longEdgeDimensions({ width: 1080, height: 1920 }, 1200)).toEqual({
      width: 675,
      height: 1200,
    });
  });

  it('nunca amplia: preset maior que a imagem devolve o original', () => {
    const pequena = { width: 800, height: 600 };

    expect(longEdgeDimensions(pequena, 1920)).toEqual(pequena);
  });
});

describe('completeDimension', () => {
  it('completa a medida que falta no formulario', () => {
    expect(completeDimension(FOTO, 'width', 960)).toEqual({ width: 960, height: 540 });
    expect(completeDimension(FOTO, 'height', 270)).toEqual({ width: 480, height: 270 });
  });
});

// ── Comparacao de tamanho ──────────────────────────────────────────────────

describe('compareSize', () => {
  it('calcula a reducao', () => {
    expect(compareSize(2_800_000, 420_000)).toMatchObject({ percent: 85, grew: false });
  });

  it('marca quando o arquivo cresceu, em vez de inventar economia', () => {
    const resultado = compareSize(100_000, 104_000);

    expect(resultado.grew).toBe(true);
    expect(resultado.percent).toBe(4);
  });

  it('nao divide por zero', () => {
    expect(compareSize(0, 1000)).toMatchObject({ percent: 0, grew: false });
  });
});

describe('formatBytes', () => {
  it('usa o separador decimal do idioma', () => {
    expect(formatBytes(2_936_013, 'pt')).toBe('2,8 MB');
    expect(formatBytes(2_936_013, 'en')).toBe('2.8 MB');
  });

  it('escala a unidade', () => {
    expect(formatBytes(430_080, 'en')).toBe('420.0 KB');
    expect(formatBytes(512, 'en')).toBe('512 B');
  });

  it('nao quebra com valor invalido', () => {
    expect(formatBytes(Number.NaN, 'pt')).toBe('—');
  });
});

describe('formatDimensions', () => {
  it('escreve com o sinal de multiplicacao', () => {
    expect(formatDimensions(1920, 1080, 'en')).toBe('1,920 × 1,080 px');
  });
});

// ── ZIP ────────────────────────────────────────────────────────────────────

describe('crc32', () => {
  it('bate com o vetor conhecido', () => {
    // CRC-32 de "hello" é 0x3610a686 — o mesmo valor que zip/gzip produzem.
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686);
  });

  it('devolve zero para entrada vazia', () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('createZip', () => {
  const firstData = new TextEncoder().encode('conteudo-1');

  const entries = [
    { name: 'foto.jpg', data: firstData },
    // Nome com acento: confere o marcador de UTF-8 no cabecalho.
    { name: 'café.webp', data: new TextEncoder().encode('conteudo-2') },
  ];

  const zip = createZip(entries, new Date('2026-08-15T12:00:00Z'));
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  it('abre com a assinatura de arquivo local', () => {
    expect(view.getUint32(0, true)).toBe(0x04034b50);
  });

  it('fecha com o registro de fim de diretorio central', () => {
    // O EOCD tem 22 bytes e é sempre o ultimo registro.
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
  });

  it('registra todas as entradas no diretorio central', () => {
    expect(view.getUint16(zip.length - 22 + 8, true)).toBe(entries.length);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(entries.length);
  });

  it('marca os nomes como UTF-8, para acento nao virar lixo', () => {
    // Bit 11 do campo de flags, no offset 6 do cabecalho local.
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
  });

  it('guarda sem compressao — o conteudo ja é uma imagem comprimida', () => {
    expect(view.getUint16(8, true)).toBe(0);
    // Sem compressao, tamanho comprimido e original sao iguais.
    expect(view.getUint32(18, true)).toBe(view.getUint32(22, true));
  });

  it('grava o CRC de cada entrada', () => {
    expect(view.getUint32(14, true)).toBe(crc32(firstData));
  });

  it('aponta o diretorio central para dentro do proprio arquivo', () => {
    const offset = view.getUint32(zip.length - 22 + 16, true);
    const size = view.getUint32(zip.length - 22 + 12, true);

    expect(offset + size).toBe(zip.length - 22);
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
  });

  it('produz um arquivo vazio valido quando nao ha entradas', () => {
    const vazio = createZip([]);

    expect(vazio.length).toBe(22);
    expect(new DataView(vazio.buffer).getUint32(0, true)).toBe(0x06054b50);
  });
});

// ── Cor de fundo ───────────────────────────────────────────────────────────

describe('normalizeHexColor', () => {
  it('aceita as formas usuais', () => {
    expect(normalizeHexColor('#FFFFFF')).toBe('#ffffff');
    expect(normalizeHexColor('000000')).toBe('#000000');
    expect(normalizeHexColor('#f0a')).toBe('#ff00aa');
  });

  it('cai no branco em vez de deixar o canvas ignorar o valor', () => {
    // fillStyle invalido nao lanca erro: mantem a cor anterior em silencio.
    expect(normalizeHexColor('javascript:alert(1)')).toBe('#ffffff');
    expect(normalizeHexColor('red')).toBe('#ffffff');
    expect(normalizeHexColor('')).toBe('#ffffff');
  });
});

// ── Catalogo ───────────────────────────────────────────────────────────────

describe('formats', () => {
  it('so JPEG perde a transparencia', () => {
    expect(FORMAT_KEEPS_ALPHA.jpeg).toBe(false);
    expect(FORMAT_KEEPS_ALPHA.webp).toBe(true);
    expect(FORMAT_KEEPS_ALPHA.avif).toBe(true);
  });

  it('cada formato tem extensao e mime declarados', () => {
    for (const format of OUTPUT_FORMATS) {
      expect(outputName('x.png', format)).toMatch(/\.(jpg|webp|avif)$/);
    }
  });
});
