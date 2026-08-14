#!/usr/bin/env node
/**
 * Verificacao do site construido — a ultima porta antes do deploy.
 *
 * Testes unitarios cobrem as regras de conteudo; type-check cobre os tipos.
 * O que nenhum dos dois enxerga é o HTML final: link interno quebrado, pagina
 * sem canonical, imagem sem alt, rascunho vazado, script inline que
 * invalidaria a CSP em producao. É exatamente essa camada que roda aqui.
 *
 * Saida diferente de zero interrompe o deploy.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const problems = [];
const warnings = [];

const fail = (file, message) => problems.push({ file, message });
const warn = (file, message) => warnings.push({ file, message });

async function walk(directory) {
  const found = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }

  return found;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** `/artigos/foo/` -> dist/artigos/foo/index.html */
function targetFor(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return join(dist, 'index.html');

  const relativePath = clean.replace(/^\//, '').replaceAll('/', sep);
  return clean.endsWith('/') ? join(dist, relativePath, 'index.html') : join(dist, relativePath);
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}=("([^"]*)"|'([^']*)')`, 'i'));
  return match ? (match[2] ?? match[3] ?? '') : undefined;
}

/**
 * Reconhece o ID de editor de mentira usado para conferir o layout antes de a
 * conta do AdSense existir: digito repetido (pub-1111...) ou a sequencia
 * 1234567890... Um ID real do Google nao tem nenhum dos dois formatos, entao
 * nao ha risco de reprovar um build legitimo.
 */
function isPlaceholderPublisher(id) {
  const digits = id.replace(/^pub-/, '');
  return /^(\d)\1+$/.test(digits) || '12345678901234567890'.startsWith(digits);
}

async function checkHtml(file, allFiles) {
  const html = await readFile(file, 'utf8');
  const label = relative(dist, file).replaceAll(sep, posix.sep);

  /**
   * O editor em /admin/ é a casca de uma aplicacao, nao uma pagina do site:
   * é noindex por definicao e nao tem canonical, descricao nem equivalente em
   * outro idioma. As regras estruturais (script inline, alt de imagem)
   * continuam valendo para ele.
   */
  const isAppShell = label.startsWith('admin/');

  // ── Cabecalho minimo de cada pagina ──────────────────────────────────────
  if (!isAppShell) {
    if (!/<html[^>]+lang="[a-z]{2}-[A-Z]{2}"/.test(html)) fail(label, 'sem <html lang> valido');
    if (!/<title>[^<]{5,}<\/title>/.test(html)) fail(label, 'sem <title>');
    if (!/<meta name="description" content="[^"]{40,}"/.test(html)) {
      fail(label, 'sem meta description (minimo 40 caracteres)');
    }
    if (!/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) {
      fail(label, 'sem canonical absoluto');
    }
  }

  // ── CSP: nenhum script inline ────────────────────────────────────────────
  // A politica em public/.htaccess usa script-src 'self' sem 'unsafe-inline'.
  // Um script inline passaria despercebido no dev e sumiria em producao.
  for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attributes, body] = tag;
    const isExternal = /\bsrc=/.test(attributes);
    const isData = /type=["'](application\/ld\+json|text\/yaml|application\/json)["']/.test(
      attributes,
    );

    if (!isExternal && !isData && body.trim().length > 0) {
      fail(label, 'script inline no HTML — a CSP de producao bloquearia sua execucao');
    }
  }

  // ── Imagens: alt presente e arquivo existente ────────────────────────────
  //
  // O `src` precisa ser conferido contra o dist, e nao so o `<a href>`. Uma
  // imagem escrita com caminho absoluto no Markdown — `/src/assets/...` em vez
  // do caminho relativo ao artigo — nao gera erro de build, nao aparece em
  // teste nenhum e sai do otimizador intacta, apontando para um arquivo que
  // nunca foi copiado. O resultado é imagem quebrada em producao com a CI
  // verde, que é a pior combinacao possivel: nada avisa.
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    if (attribute(tag[0], 'alt') === undefined) fail(label, 'imagem sem atributo alt');

    const candidatos = [attribute(tag[0], 'src')];

    // Cada item do srcset é "url 640w"; a URL é o primeiro campo. Uma variante
    // ausente so aparece no tamanho de tela que a escolhe, entao passaria por
    // qualquer conferencia feita a olho.
    const srcset = attribute(tag[0], 'srcset');
    if (srcset) {
      for (const parte of srcset.split(',')) {
        candidatos.push(parte.trim().split(/\s+/)[0]);
      }
    }

    for (const url of candidatos) {
      if (!url || !url.startsWith('/') || url.startsWith('//')) continue;
      if (!allFiles.has(targetFor(url))) fail(label, `imagem quebrada: ${url}`);
    }
  }

  // ── Rascunho nao pode chegar ao ar ───────────────────────────────────────
  if (html.includes('badge--draft')) fail(label, 'conteudo marcado como rascunho no build');

  // ── Sobras de ambiente ───────────────────────────────────────────────────
  if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(html)) fail(label, 'URL de localhost no HTML');

  // ── Links internos ───────────────────────────────────────────────────────
  for (const tag of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(tag[0], 'href');
    if (!href) {
      fail(label, 'link <a> sem href');
      continue;
    }

    if (!href.startsWith('/') || href.startsWith('//')) continue;

    const target = targetFor(href);
    if (!allFiles.has(target)) fail(label, `link interno quebrado: ${href}`);
  }

  // ── hreflang precisa apontar para pagina existente ───────────────────────
  for (const tag of html.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)"/gi)) {
    const url = new URL(tag[1]);
    if (!allFiles.has(targetFor(url.pathname))) {
      fail(label, `hreflang aponta para pagina inexistente: ${url.pathname}`);
    }
  }
}

async function main() {
  if (!(await exists(dist))) {
    console.error('[verify] dist/ nao existe. Rode `npm run build` antes.');
    process.exit(1);
  }

  const files = await walk(dist);
  const allFiles = new Set(files);
  const pages = files.filter((file) => file.endsWith('.html'));

  if (pages.length === 0) {
    console.error('[verify] nenhuma pagina HTML em dist/');
    process.exit(1);
  }

  for (const page of pages) await checkHtml(page, allFiles);

  // ── Arquivos que o site nao pode ir para producao sem ────────────────────
  const required = [
    ['.htaccess', 'cabecalhos de seguranca e redirects'],
    ['robots.txt', 'orientacao para buscadores'],
    ['sitemap-index.xml', 'sitemap'],
    ['404.html', 'pagina de erro'],
    ['theme.js', 'aplicacao do tema antes da primeira pintura'],
    ['admin/index.html', 'editor de conteudo'],
    ['admin/config.yml', 'configuracao do editor'],
    ['rss.xml', 'feed de assinatura'],
    // Sem a folha, o feed aberto no navegador volta a ser arvore XML crua
    // precedida do aviso de "no style information" — parece defeito do site.
    ['rss/styles.xsl', 'apresentacao do feed no navegador'],
  ];

  for (const [file, purpose] of required) {
    if (!(await exists(join(dist, file)))) fail(file, `arquivo obrigatorio ausente (${purpose})`);
  }

  if (!(await exists(join(dist, 'pagefind')))) {
    warn('pagefind/', 'indice de busca ausente — rode `npm run index:search` depois do build');
  }

  // ── Coerencia da monetizacao ─────────────────────────────────────────────
  // Tudo aqui é falha silenciosa: nada quebra na tela, o site so deixa de
  // faturar ou passa a carregar terceiro onde nao devia. Por isso é aqui que
  // tem que ser pego.
  const withUnits = [];
  const withScript = [];

  for (const page of pages) {
    const html = await readFile(page, 'utf8');
    if (html.includes('<ins class="adsbygoogle')) withUnits.push(page);
    if (html.includes('googlesyndication.com')) withScript.push(page);
  }

  // Script do Google onde nao ha bloco: o leitor paga o custo de um terceiro
  // que nao vai exibir nada. Acontece sozinho no dia em que alguem esquecer o
  // `ads` do BaseLayout ou passar a superficie errada — ver src/config/ads.ts.
  for (const page of withScript) {
    if (withUnits.includes(page)) continue;
    fail(
      relative(dist, page).replaceAll(sep, posix.sep),
      'carrega o script do AdSense sem exibir nenhum bloco — remova o `ads` do BaseLayout desta pagina',
    );
  }

  if (withUnits.length > 0) {
    // Anuncio no ar sem ads.txt valido faz o Google tratar o inventario como
    // nao autorizado: o site exibe o bloco e nao fatura.
    const adsTxt = join(dist, 'ads.txt');
    const conteudo = (await exists(adsTxt)) ? await readFile(adsTxt, 'utf8') : '';
    const vendedor = conteudo.match(/^google\.com,\s*(pub-\d+),\s*DIRECT/m);

    if (!vendedor) {
      fail(
        'ads.txt',
        `${withUnits.length} pagina(s) exibem anuncio, mas ads.txt nao autoriza nenhum vendedor — ` +
          'defina PUBLIC_ADSENSE_CLIENT no ambiente de build',
      );
    } else if (isPlaceholderPublisher(vendedor[1])) {
      /*
       * Enquanto a conta do AdSense nao sai, preencher o .env com um ID de
       * mentira é a unica forma de conferir o layout dos blocos. Isso é util
       * na maquina de quem edita e desastroso em producao: o ads.txt subiria
       * autorizando um editor que nao existe, e o Google passa a tratar o
       * inventario do dominio como nao autorizado.
       *
       * Dai a diferenca de severidade: aviso no build local, erro no CI — que
       * é o unico build cujo artefato chega ao ar.
       */
      const mensagem =
        `ID de editor ficticio (${vendedor[1]}) — sirva para conferir layout, nunca para publicar. ` +
        'Troque pelo ca-pub- real do painel do AdSense ou deixe PUBLIC_ADSENSE_CLIENT vazio';

      if (process.env['CI']) fail('ads.txt', mensagem);
      else warn('ads.txt', mensagem);
    }
  }

  // ── Relatorio ────────────────────────────────────────────────────────────
  for (const { file, message } of warnings) console.warn(`[verify] aviso  ${file}: ${message}`);

  if (problems.length > 0) {
    for (const { file, message } of problems) console.error(`[verify] ERRO   ${file}: ${message}`);
    console.error(`\n[verify] ${problems.length} problema(s) em ${pages.length} pagina(s).`);
    process.exit(1);
  }

  console.log(`[verify] ${pages.length} paginas verificadas, nenhum problema.`);
}

main().catch((error) => {
  console.error(`[verify] falhou: ${error.stack ?? error.message}`);
  process.exit(1);
});
