/**
 * Quem é o dono de cada imagem em `src/assets/uploads/`.
 *
 * A pasta é plana e compartilhada por todos os artigos e pelos dois idiomas —
 * ver `media_folder` em public/admin/config.yml. Isso cria um risco que nao
 * aparece em lugar nenhum: subir uma imagem com um nome que ja existe nao gera
 * copia, **substitui** o arquivo. O artigo antigo que apontava para aquele nome
 * passa a exibir a imagem nova, o build continua verde e o `verify:build`
 * tambem — o caminho resolve, so que para o arquivo errado.
 *
 * A defesa tem duas metades, e as duas saem daqui para nao divergirem:
 *
 *  - `scripts/prepare-assets.mjs` renomeia toda imagem para um nome derivado do
 *    artigo que a usa, tirando o editor da responsabilidade de inventar nomes
 *    unicos;
 *  - `scripts/verify-build.mjs` reprova o que sobrou — o caso que renomear nao
 *    resolve, que é a mesma imagem sendo usada por dois artigos diferentes.
 *
 * A identidade de um artigo é o **nome do arquivo .md**, igual em pt/ e en/.
 * Duas traducoes do mesmo artigo sao um artigo so e dividem as imagens; dois
 * arquivos .md diferentes sao dois artigos e nunca deveriam dividir nada.
 */

/**
 * @typedef {object} Artigo
 * @property {string} chave nome do .md sem extensao — a identidade do artigo
 * @property {string} prefixo slug do permalink canonico, que nomeia as imagens
 * @property {string[]} arquivos as traducoes, relativas a raiz do projeto
 * @property {Map<string, string>} desejado nome atual -> nome que deveria ter
 */

/**
 * @typedef {object} Renomeio
 * @property {string} de nome atual em disco
 * @property {string} para nome derivado do artigo
 * @property {string} artigo chave do dono
 */

/**
 * @typedef {object} Compartilhado
 * @property {string} arquivo imagem disputada
 * @property {string[]} chaves artigos que apontam para ela
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Relativos a raiz do projeto. */
export const UPLOADS_DIR = join('src', 'assets', 'uploads');
const CONTENT_DIR = join('src', 'content', 'blog');

/**
 * Idioma padrao do site. Como a imagem é compartilhada entre as traducoes, é o
 * permalink dele que nomeia o arquivo — nao adianta as duas versoes disputarem.
 */
const LOCALE_CANONICO = 'pt';

/**
 * `assets/uploads/<arquivo>` em qualquer grafia que o editor grave — barra
 * inicial, caminho relativo, profundidade errada. Mesma regra de
 * src/lib/upload-path.ts, repetida aqui porque script .mjs nao le TypeScript.
 *
 * Vale para o **corpo** do artigo: ali a URL do markdown termina no primeiro
 * espaco, entao parar neles é o comportamento correto. O frontmatter tem
 * sintaxe propria e é tratado por CAPA.
 */
const REFERENCIA = /((?:^|\/)assets\/uploads\/)([^\s)'"]+)/g;

/**
 * A linha `cover:` do frontmatter, separada em prefixo, valor e o branco final.
 *
 * Precisa de regra propria porque o valor é escalar YAML: vai ate o fim da
 * linha e pode conter espaco. Reaproveitar a REFERENCIA aqui lia
 * `01 - imagem.webp` como `01` — a capa ficava de fora do renomeio, aparecia
 * como orfa no verify:build e a mensagem de erro citava um arquivo que nao
 * existe. Ancorada na margem para pegar so o campo de topo.
 */
const CAPA = /^(cover:[ \t]*)(.*?)([ \t\r]*)$/m;

/** Nome do arquivo dentro de uploads, sem exigir que a linha termine ali. */
const DENTRO_DE_UPLOADS = /(?:^|\/)assets\/uploads\/(.+)$/;

/**
 * Escalar YAML como esta escrito: o valor sem aspas e a aspa usada, para que a
 * reescrita devolva a linha na mesma forma em que a encontrou.
 */
/** @param {string} bruto */
function escalarYaml(bruto) {
  const aspas = bruto.startsWith('"') || bruto.startsWith("'") ? bruto[0] : '';
  return { aspas, valor: aspas ? bruto.slice(1, -1) : bruto };
}

/** Nome no HTML vem percent-encoded; em disco o nome é literal. */
/** @param {string} valor */
function decodeNome(valor) {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

/** @param {string} valor */
function slugify(valor) {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** @param {string} arquivo */
function extensao(arquivo) {
  const ponto = arquivo.lastIndexOf('.');
  return ponto < 0 ? '' : arquivo.slice(ponto).toLowerCase();
}

/** @param {string} bruto */
function separaFrontmatter(bruto) {
  if (!bruto.startsWith('---')) return { frontmatter: '', corpo: bruto };

  const fim = bruto.indexOf('\n---', 3);
  if (fim < 0) return { frontmatter: '', corpo: bruto };

  return { frontmatter: bruto.slice(3, fim), corpo: bruto.slice(fim + 4) };
}

/** @param {string} texto */
function referencias(texto) {
  return [...texto.matchAll(REFERENCIA)].map((match) => decodeNome(match[2]));
}

/**
 * O arquivo apontado pelo `cover:`, ou undefined quando nao ha capa de upload.
 *
 * @param {string} frontmatter
 */
function capaDoFrontmatter(frontmatter) {
  const linha = CAPA.exec(frontmatter);
  if (!linha) return undefined;

  const arquivo = DENTRO_DE_UPLOADS.exec(escalarYaml(linha[2]).valor)?.[1];
  return arquivo === undefined ? undefined : decodeNome(arquivo);
}

/**
 * Troca os nomes antigos pelos novos no texto de um artigo, aplicando em cada
 * regiao a sintaxe que vale nela: CAPA no frontmatter, REFERENCIA no corpo.
 *
 * Separar as duas nao é preciosismo. Enquanto a capa era lida errado, o
 * renomeio dela simplesmente nao acontecia; corrigir so a leitura faria o
 * arquivo ser renomeado em disco enquanto o frontmatter continuava apontando
 * para o nome antigo — capa quebrada onde antes havia apenas um aviso.
 *
 * Uma passada por regiao: o nome novo nunca entra como candidato a ser trocado
 * de novo, entao nao ha risco de renomeio em cascata.
 *
 * @param {string} texto conteudo do .md
 * @param {Map<string, string>} aplicados nome antigo -> novo, so o que mudou em disco
 * @returns {string}
 */
export function reescreverReferencias(texto, aplicados) {
  // `corpo` é sufixo de `texto`, entao o que sobra na frente é o frontmatter
  // com os delimitadores. Sem frontmatter, a cabeca fica vazia e tudo cai na
  // regra do corpo — que é o certo para um .md solto.
  const { corpo } = separaFrontmatter(texto);
  const cabeca = texto.slice(0, texto.length - corpo.length);

  const cabecaNova = cabeca.replace(CAPA, (match, prefixo, bruto, fim) => {
    const { aspas, valor } = escalarYaml(bruto);
    const arquivo = DENTRO_DE_UPLOADS.exec(valor)?.[1];
    if (arquivo === undefined) return match;

    const novo = aplicados.get(decodeNome(arquivo));
    if (novo === undefined) return match;

    const caminho = valor.slice(0, valor.length - arquivo.length) + novo;
    return `${prefixo}${aspas}${caminho}${aspas}${fim}`;
  });

  const corpoNovo = corpo.replace(REFERENCIA, (match, prefixo, nome) => {
    const novo = aplicados.get(decodeNome(nome));
    return novo === undefined ? match : `${prefixo}${novo}`;
  });

  return cabecaNova + corpoNovo;
}

/**
 * Um artigo por arquivo .md, agrupando as traducoes. `capa` sai do frontmatter
 * e `corpo` mantem a ordem de aparicao no texto — é ela que vira a numeracao.
 *
 * @param {string} root
 * @returns {Promise<Artigo[]>}
 */
async function lerArtigos(root) {
  const porChave = new Map();
  const locales = await readdir(join(root, CONTENT_DIR), { withFileTypes: true });

  for (const locale of locales) {
    if (!locale.isDirectory()) continue;

    for (const entrada of await readdir(join(root, CONTENT_DIR, locale.name))) {
      if (!entrada.endsWith('.md')) continue;

      const chave = entrada.slice(0, -3);
      const caminho = join(CONTENT_DIR, locale.name, entrada);
      const { frontmatter, corpo } = separaFrontmatter(await readFile(join(root, caminho), 'utf8'));

      if (!porChave.has(chave)) porChave.set(chave, { chave, arquivos: [], porLocale: new Map() });
      const artigo = porChave.get(chave);

      artigo.arquivos.push(caminho);
      artigo.porLocale.set(locale.name, {
        permalink: /^permalink:\s*(.+)$/m.exec(frontmatter)?.[1].trim(),
        capa: capaDoFrontmatter(frontmatter),
        corpo: referencias(corpo),
      });
    }
  }

  return [...porChave.values()].map(montaArtigo);
}

function montaArtigo(artigo) {
  // A versao canonica manda na ordem; as demais so acrescentam o que for
  // exclusivo delas, para que um idioma com imagem a mais nao fique de fora.
  const canonica = artigo.porLocale.get(LOCALE_CANONICO);
  const versoes = [canonica, ...artigo.porLocale.values()].filter(Boolean);

  const prefixo = slugify(canonica?.permalink ?? artigo.chave);
  const capa = versoes.find((versao) => versao.capa)?.capa;

  const corpo = [];
  for (const versao of versoes) {
    for (const arquivo of versao.corpo) if (!corpo.includes(arquivo)) corpo.push(arquivo);
  }

  // `-capa` em vez de `-00` porque é o unico com papel proprio: aparece no
  // og:image e no card, nao no meio do texto.
  /** @type {Map<string, string>} */
  const desejado = new Map();
  if (capa) desejado.set(capa, `${prefixo}-capa${extensao(capa)}`);

  corpo.forEach((arquivo, indice) => {
    if (desejado.has(arquivo)) return; // capa reaproveitada no corpo: um nome so
    desejado.set(arquivo, `${prefixo}-${String(indice + 1).padStart(2, '0')}${extensao(arquivo)}`);
  });

  return { chave: artigo.chave, prefixo, arquivos: artigo.arquivos, desejado };
}

/**
 * O plano completo, sem tocar em disco: o que renomear, o que esta em conflito
 * e o que ninguem usa. Quem chama decide se aplica (prepare:assets) ou se
 * reprova (verify:build).
 *
 * @param {string} root
 * @returns {Promise<{artigos: Artigo[], renomeios: Renomeio[],
 *   compartilhados: Compartilhado[], orfaos: string[]}>}
 */
export async function planejarUploads(root) {
  const artigos = await lerArtigos(root);

  // Dono de cada arquivo. Mais de um dono é o caso perigoso: renomear para o
  // padrao de um artigo quebraria o outro, entao nao da para resolver sozinho.
  /** @type {Map<string, string[]>} */
  const donos = new Map();
  for (const artigo of artigos) {
    for (const arquivo of artigo.desejado.keys()) {
      if (!donos.has(arquivo)) donos.set(arquivo, []);
      donos.get(arquivo).push(artigo.chave);
    }
  }

  const compartilhados = [...donos]
    .filter(([, chaves]) => chaves.length > 1)
    .map(([arquivo, chaves]) => ({ arquivo, chaves }));

  /** @type {Renomeio[]} */
  const renomeios = [];
  for (const artigo of artigos) {
    for (const [atual, desejado] of artigo.desejado) {
      if (atual === desejado) continue;
      if (donos.get(atual).length > 1) continue; // conflito: reportado, nao renomeado
      renomeios.push({ de: atual, para: desejado, artigo: artigo.chave });
    }
  }

  const emDisco = (await readdir(join(root, UPLOADS_DIR))).filter((nome) => !nome.startsWith('.'));
  const orfaos = emDisco.filter((nome) => !donos.has(nome));

  return { artigos, renomeios, compartilhados, orfaos };
}
