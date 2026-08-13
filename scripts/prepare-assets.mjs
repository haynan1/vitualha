#!/usr/bin/env node
/**
 * Copia para public/ os assets que vem de dependencias npm: as fontes usadas
 * e o bundle do CMS.
 *
 * Por que copiar em vez de importar/CDN:
 *  - fonte com caminho estavel (/fonts/...) pode ser pre-carregada no <head>,
 *    o que um caminho com hash gerado pelo bundler nao permite;
 *  - CMS servido do proprio dominio dispensa liberar CDN de terceiro na CSP
 *    e congela a versao no package-lock, sem surpresa em producao.
 *
 * Idempotente: rodar de novo so reescreve o que mudou de tamanho.
 */
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Apenas os subsets que PT-BR e EN usam. Ver src/styles/fonts.css. */
const FONTS = [
  ['@fontsource-variable/inter', 'inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'inter-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'inter-latin-wght-italic.woff2'],
  ['@fontsource-variable/inter', 'inter-latin-ext-wght-italic.woff2'],
  ['@fontsource-variable/manrope', 'manrope-latin-wght-normal.woff2'],
  ['@fontsource-variable/manrope', 'manrope-latin-ext-wght-normal.woff2'],
];

function packageDir(name) {
  return dirname(require.resolve(`${name}/package.json`));
}

/**
 * @sveltia/cms nao expoe ./package.json em `exports`, entao a resolucao
 * padrao nao chega ate ele. O entrypoint declarado em `exports` aponta para
 * dist/, e é de la que sai o caminho do bundle IIFE que o /admin carrega.
 */
function sveltiaBundle() {
  return join(dirname(fileURLToPath(import.meta.resolve('@sveltia/cms'))), 'sveltia-cms.js');
}

async function sizeOf(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return -1;
  }
}

async function copyIfChanged(from, to) {
  await mkdir(dirname(to), { recursive: true });

  const [source, target] = await Promise.all([sizeOf(from), sizeOf(to)]);
  if (source < 0) throw new Error(`Asset ausente: ${from}. Rode npm install.`);
  if (source === target) return false;

  await copyFile(from, to);
  return true;
}

/**
 * Imagem de compartilhamento padrao (1200x630), usada quando o artigo nao tem
 * capa propria. Gerada aqui em vez de commitada: um binario a menos no
 * repositorio e a arte acompanha a marca sem passo manual.
 *
 * Falha nao interrompe o build — sem o arquivo, o site simplesmente nao
 * anuncia og:image padrao, e o resto continua correto.
 */
async function generateDefaultOgImage() {
  const target = join(root, 'public', 'og-default.png');
  if ((await sizeOf(target)) > 0) return false;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="glow" cx="0.18" cy="0.12" r="0.9">
        <stop offset="0" stop-color="#2E7D32" stop-opacity="0.42"/>
        <stop offset="1" stop-color="#17181A" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="#17181A"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <circle cx="104" cy="104" r="34" fill="#66BB6A"/>
    <text x="104" y="118" font-family="sans-serif" font-size="38" font-weight="bold"
      fill="#0E1A0F" text-anchor="middle">V</text>
    <text x="152" y="118" font-family="sans-serif" font-size="30" font-weight="bold"
      fill="#F2F2EF">Vitualha</text>
    <text x="72" y="352" font-family="sans-serif" font-size="82" font-weight="bold"
      fill="#F2F2EF">Nutrição baseada</text>
    <text x="72" y="446" font-family="sans-serif" font-size="82" font-weight="bold"
      fill="#66BB6A">em evidências.</text>
    <rect x="72" y="508" width="88" height="5" rx="2.5" fill="#66BB6A"/>
    <text x="72" y="566" font-family="Verdana, DejaVu Sans, Arial, sans-serif" font-size="26" font-weight="500"
      fill="#A9ACA6">Alimentos, nutrientes e saúde — sem atalho e sem hype.</text>
  </svg>`;

  try {
    const { default: sharp } = await import('sharp');
    await mkdir(dirname(target), { recursive: true });
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(target);
    return true;
  } catch (error) {
    console.warn(`[assets] og-default.png nao gerada (${error.message}) — seguindo sem ela`);
    return false;
  }
}

/**
 * Icones PNG derivados do favicon.svg — exigidos por iOS e pelo manifesto
 * (que nao aceitam SVG). Uma unica fonte de verdade para a marca.
 */
async function generateIcons() {
  const source = join(root, 'public', 'favicon.svg');
  const targets = [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ];

  let created = 0;

  try {
    const { default: sharp } = await import('sharp');
    const svg = await readFile(source);

    for (const [name, size] of targets) {
      const target = join(root, 'public', name);
      if ((await sizeOf(target)) > 0) continue;

      await sharp(svg, { density: 384 })
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toFile(target);
      created += 1;
    }
  } catch (error) {
    console.warn(`[assets] icones PNG nao gerados (${error.message}) — seguindo sem eles`);
  }

  return created;
}

async function main() {
  let copied = 0;

  for (const [pkg, file] of FONTS) {
    const changed = await copyIfChanged(
      join(packageDir(pkg), 'files', file),
      join(root, 'public', 'fonts', file),
    );
    if (changed) copied += 1;
  }

  const cmsChanged = await copyIfChanged(
    sveltiaBundle(),
    join(root, 'public', 'admin', 'sveltia-cms.js'),
  );
  if (cmsChanged) copied += 1;
  if (await generateDefaultOgImage()) copied += 1;
  copied += await generateIcons();

  console.log(
    copied > 0
      ? `[assets] ${copied} arquivo(s) atualizado(s) em public/`
      : '[assets] public/ ja esta em dia',
  );
}

main().catch((error) => {
  console.error(`[assets] falhou: ${error.message}`);
  process.exitCode = 1;
});
