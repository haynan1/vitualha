#!/usr/bin/env node
/**
 * Verificacao de layout do site construido — a leitura no celular.
 *
 * O `verify-build.mjs` le o HTML; este aqui mede o layout de verdade, num
 * navegador headless, porque o defeito que ele procura nao existe no HTML:
 * nasce do calculo de largura do CSS.
 *
 * O caso concreto: um track de grid com tamanho automatico cresce ate o
 * min-content do conteudo. Uma tabela larga dentro do artigo empurra esse
 * minimo para centenas de pixels, a coluna estoura o container e a pagina
 * inteira passa a rolar na horizontal — o texto sai da tela enquanto o leitor
 * rola. Nenhum teste unitario ve isso; um navegador ve em uma linha.
 *
 * Saida diferente de zero interrompe o deploy.
 */
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/** Larguras reais de celular. 320 é o piso que ainda aparece nos relatorios. */
const LARGURAS = [320, 390];

/**
 * Sem navegador o gate nao roda. Fora da CI isso é so um aviso — nem toda
 * maquina de quem escreve artigo tem Chrome no caminho esperado. Na CI o
 * `--strict` transforma a ausencia em falha, para o gate nao sumir calado.
 */
const ESTRITO = process.argv.includes('--strict');

const NAVEGADORES = [
  process.env['CHROME_PATH'],
  process.env['PUPPETEER_EXECUTABLE_PATH'],
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((caminho) => typeof caminho === 'string' && caminho.length > 0);

const TIPOS = {
  '.html': 'text/html;charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

/**
 * Mede a pagina por dentro. Um elemento so conta como defeito se nenhum
 * ancestral dele rolar na horizontal: tabela dentro de `.table-scroll` é
 * exatamente o comportamento desejado, e nao um vazamento.
 */
const SONDA = `(() => {
  const raiz = document.documentElement;
  const largura = raiz.clientWidth;

  const rotulo = (el) => {
    const classes =
      typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/[ ]+/).join('.')
        : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + classes;
  };

  const dentroDeUmBlocoQueRola = (el) => {
    for (let n = el.parentElement; n && n !== raiz; n = n.parentElement) {
      const eixo = getComputedStyle(n).overflowX;
      if (eixo === 'auto' || eixo === 'scroll' || eixo === 'hidden') return true;
    }
    return false;
  };

  const vazam = [];

  for (const el of document.querySelectorAll('body *')) {
    const estilo = getComputedStyle(el);
    if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
    if (estilo.position === 'fixed') continue;

    const caixa = el.getBoundingClientRect();
    if (caixa.width === 0 && caixa.height === 0) continue;
    if (caixa.right <= largura + 0.5 && caixa.left >= -0.5) continue;
    if (dentroDeUmBlocoQueRola(el)) continue;

    vazam.push({ seletor: rotulo(el), excesso: Math.round(caixa.right - largura) });
  }

  // O que vaza mais é o que segura os outros: e o primeiro lugar para olhar.
  vazam.sort((a, b) => b.excesso - a.excesso);

  return {
    rola: raiz.scrollWidth > largura + 0.5,
    excesso: raiz.scrollWidth - largura,
    culpados: vazam.slice(0, 3),
  };
})()`;

async function rotas(diretorio) {
  const encontradas = [];

  for (const entrada of await readdir(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name);

    if (entrada.isDirectory()) encontradas.push(...(await rotas(caminho)));
    else if (entrada.name === 'index.html') {
      const url = caminho
        .slice(dist.length)
        .replaceAll(sep, '/')
        .replace(/index\.html$/, '');
      encontradas.push(url || '/');
    }
  }

  return encontradas;
}

function servir() {
  const server = createServer((requisicao, resposta) => {
    let arquivo = join(dist, decodeURIComponent((requisicao.url ?? '/').split('?')[0]));

    if (existsSync(arquivo) && statSync(arquivo).isDirectory()) {
      arquivo = join(arquivo, 'index.html');
    }

    if (!existsSync(arquivo)) {
      resposta.writeHead(404);
      resposta.end('404');
      return;
    }

    resposta.writeHead(200, {
      'content-type': TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
    });
    createReadStream(arquivo).pipe(resposta);
  });

  return new Promise((pronto) => server.listen(0, '127.0.0.1', () => pronto(server)));
}

/** Cliente minimo do DevTools Protocol — o WebSocket ja vem no Node. */
function conectar(url) {
  const ws = new WebSocket(url);
  const pendentes = new Map();
  const ouvintes = [];
  let sequencia = 0;

  ws.onmessage = (evento) => {
    const mensagem = JSON.parse(evento.data);
    const pendente = mensagem.id ? pendentes.get(mensagem.id) : undefined;

    if (pendente) {
      pendentes.delete(mensagem.id);
      if (mensagem.error) pendente.reject(new Error(JSON.stringify(mensagem.error)));
      else pendente.resolve(mensagem.result);
      return;
    }

    for (const ouvinte of ouvintes.slice()) ouvinte(mensagem);
  };

  const pronto = new Promise((ok, erro) => {
    ws.onopen = ok;
    ws.onerror = erro;
  });

  const enviar = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++sequencia;
      pendentes.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  return { ws, pronto, enviar, ouvintes };
}

/**
 * A porta real sai no stderr do Chrome: `--remote-debugging-port=0` evita
 * brigar por uma porta fixa quando dois processos rodam na mesma maquina.
 */
function portaDoNavegador(processo) {
  return new Promise((pronto, erro) => {
    let saida = '';
    const prazo = setTimeout(() => erro(new Error('Chrome nao anunciou a porta')), 30_000);

    processo.stderr.on('data', (pedaco) => {
      saida += pedaco;
      const achado = saida.match(/ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!achado) return;

      clearTimeout(prazo);
      pronto(Number(achado[1]));
    });
  });
}

async function main() {
  if (!existsSync(dist)) {
    console.error('[layout] dist/ nao existe — rode o build antes.');
    process.exit(1);
  }

  const navegador = NAVEGADORES.find((caminho) => existsSync(caminho));

  if (!navegador) {
    const recado = '[layout] Chrome nao encontrado — defina CHROME_PATH.';

    if (ESTRITO) {
      console.error(`${recado} Em modo estrito isso é falha.`);
      process.exit(1);
    }

    console.warn(`${recado} Verificacao de layout pulada.`);
    return;
  }

  const server = await servir();
  const base = `http://127.0.0.1:${server.address().port}`;

  const chrome = spawn(
    navegador,
    [
      '--remote-debugging-port=0',
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      `--user-data-dir=${join(root, 'node_modules', '.cache', 'verify-layout')}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const porta = await portaDoNavegador(chrome);
  const versao = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json();

  const cdp = conectar(versao.webSocketDebuggerUrl);
  await cdp.pronto;

  const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.enviar('Target.attachToTarget', { targetId, flatten: true });
  await cdp.enviar('Page.enable', {}, sessionId);
  await cdp.enviar('Runtime.enable', {}, sessionId);

  const paginas = (await rotas(dist)).sort();
  const problemas = [];

  for (const largura of LARGURAS) {
    await cdp.enviar(
      'Emulation.setDeviceMetricsOverride',
      { width: largura, height: 844, deviceScaleFactor: 2, mobile: true },
      sessionId,
    );

    for (const pagina of paginas) {
      const carregou = new Promise((pronto) => {
        const ouvinte = (mensagem) => {
          if (mensagem.method !== 'Page.loadEventFired') return;
          if (mensagem.sessionId !== sessionId) return;

          cdp.ouvintes.splice(cdp.ouvintes.indexOf(ouvinte), 1);
          pronto(undefined);
        };

        cdp.ouvintes.push(ouvinte);
      });

      await cdp.enviar('Page.navigate', { url: base + pagina }, sessionId);
      await Promise.race([carregou, sleep(15_000)]);
      await sleep(120);

      const { result } = await cdp.enviar(
        'Runtime.evaluate',
        { expression: SONDA, returnByValue: true },
        sessionId,
      );

      if (result.value?.rola) problemas.push({ largura, pagina, ...result.value });
    }
  }

  cdp.ws.close();
  chrome.kill();
  server.close();

  if (problemas.length > 0) {
    console.error(`\n[layout] ${problemas.length} pagina(s) rolam na horizontal:\n`);

    for (const problema of problemas) {
      console.error(
        `  ${problema.pagina}  (${problema.largura}px, excesso de ${problema.excesso}px)`,
      );

      for (const culpado of problema.culpados) {
        console.error(`      ${culpado.seletor} vaza ${culpado.excesso}px`);
      }
    }

    console.error(
      '\n  Quase sempre é um track de grid com tamanho automatico: troque por' +
        '\n  minmax(0, …), ou de min-width: 0 ao item que segura o bloco largo.\n',
    );
    process.exit(1);
  }

  console.log(
    `[layout] ${paginas.length} paginas x ${LARGURAS.join('/')}px — nenhuma rola na horizontal.`,
  );
}

await main();
