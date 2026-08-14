# Arquitetura — Vitualha

Blog editorial bilíngue (PT-BR / EN) sobre nutrição baseada em evidências.
Site estático, conteúdo versionado em Git, editado por interface visual,
publicado automaticamente na Hostinger a cada push.

---

## 1. Stack e por que cada peça

| Camada    | Escolha                                   | Por que esta e não a alternativa                                                                                                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | **Astro 7**                               | Gera HTML puro e envia zero JavaScript por padrão. Next.js exigiria `output: export` para rodar em hospedagem compartilhada e ainda assim carregaria o runtime do React em páginas que são texto. Hugo é mais rápido no build, mas não tem modelo de componente nem validação de conteúdo tipada.                                                 |
| Conteúdo  | **Content Collections + Zod**             | O frontmatter é validado no build. Artigo com categoria inexistente, data invertida ou capa sem texto alternativo derruba o CI — nunca chega ao ar. Um CMS com banco não dá essa garantia sem código extra.                                                                                                                                       |
| Idiomas   | **i18n nativo do Astro + índice próprio** | PT na raiz, EN em `/en/`. O fallback de tradução é explícito no código (`buildLocaleIndex`), não delegado ao middleware: cada página sabe se está exibindo tradução real ou original, e o canonical acompanha.                                                                                                                                    |
| Edição    | **Sveltia CMS**                           | Editor visual sobre Git, com edição local sem servidor (File System Access API) e suporte a i18n lado a lado. Decap CMS exige um servidor auxiliar para editar local e evolui devagar; TinaCMS depende de serviço pago acima do plano gratuito. A configuração é compatível com Decap, então trocar é possível sem reescrever nada.               |
| Estilo    | **CSS nativo com design tokens**          | O design system veio do mockup como um conjunto de tokens; CSS custom properties mapeiam 1:1, funcionam em tema claro/escuro sem JavaScript e não adicionam dependência nem etapa de purge. Tailwind resolveria o mesmo com uma dependência a mais e menos controle tipográfico.                                                                  |
| Markdown  | **unified (remark/rehype)**               | O padrão do Astro 7 é o Sätteri, mais rápido, mas ainda sem suporte a _directives_ — a base dos blocos `:::dica` que o editor usa. Aqui o build é dominado por otimização de imagem, não por parse de Markdown, então a troca não compensaria. Reavaliar quando o ecossistema do Sätteri cobrir directives, âncora de título e wrapper de tabela. |
| Busca     | **Pagefind**                              | Índice estático gerado no fim do build e consultado no navegador via WebAssembly. Sem servidor de busca para manter, pagar ou proteger; a consulta do leitor não sai do dispositivo. Algolia custaria mensalidade e enviaria dados de leitura para terceiro.                                                                                      |
| Fontes    | **@fontsource-variable, auto-hospedadas** | Manrope (títulos) e Inter (texto). Servidas do próprio domínio: uma requisição a terceiro a menos, nenhum vazamento de IP do leitor para o Google e `font-src 'self'` na CSP. Só os subsets latin e latin-ext são declarados.                                                                                                                     |
| Imagens   | **`astro:assets` + sharp**                | AVIF/WebP responsivos gerados no build. Capa ausente cai num gradiente derivado da categoria — a grade nunca quebra.                                                                                                                                                                                                                              |
| Deploy    | **GitHub Actions → FTPS**                 | O artefato publicado é exatamente o que passou pela CI. Envio incremental: publicar um artigo não reenvia o site inteiro.                                                                                                                                                                                                                         |
| Receita   | **Google AdSense, sob configuração**      | É a única rede que paga sem exigir tráfego mínimo, e a integração inteira é opcional: sem `PUBLIC_ADSENSE_CLIENT` o site não carrega nada de terceiro e volta a ser o que era. Rede com mediação (Ezoic, Mediavine) exige volume que o site ainda não tem e devolve o controle do `<head>` para um script externo.                                |

### O que foi deliberadamente deixado de fora

- **Docker.** Não há serviço para orquestrar: nem banco, nem cache, nem
  processo de servidor. O ambiente local é `npm run dev`. Um Compose aqui
  seria cerimônia sem função.
- **View Transitions (ClientRouter).** Traria um roteador no cliente e uma
  classe inteira de bugs de re-hidratação (tema, sumário, busca) em troca de
  transição visual. Em site estático a navegação já é instantânea.
- **Comentários.** Todo serviço de comentário embutido traz script de
  terceiro e rastreamento junto. Se virar necessidade, entra como decisão
  própria, com CSP revisada.
- **Framework de UI (React/Vue/Svelte).** Nenhuma tela do site precisa de
  estado no cliente além de tema, sumário e busca — todos resolvidos com
  poucas linhas de JavaScript nativo.

---

## 2. Estrutura

```
src/
├── config/           categories.ts (estrutural), site.ts (marca e ambiente)
├── i18n/             locales, rotas traduzidas, dicionário de interface
├── content/          o conteúdo em si — é isto que o CMS edita
│   ├── blog/pt/…     um arquivo por idioma, MESMO nome = mesma tradução
│   ├── blog/en/…
│   ├── pages/        sobre, contato, privacidade, termos, política editorial
│   └── authors/      autoria e revisão técnica
├── lib/              regras de negócio (índice por idioma, SEO, datas, feed)
│   └── article-model.ts   ← núcleo puro e testado, sem dependência do Astro
├── components/       peças de interface
├── layouts/          BaseLayout (casca) e ArticleLayout (leitura)
├── views/            uma view por tipo de página, compartilhada entre idiomas
├── pages/            só roteamento: cada arquivo é uma casca fina sobre a view
├── plugins/          transformações de Markdown (callouts, tabela rolável)
└── styles/           tokens, base, tipografia de artigo

scripts/              preparação de assets, criação de artigo, verificação de build
tests/                testes das regras que podem quebrar o site
public/               .htaccess, /admin (CMS), fontes, ícones
design/               mockup original que originou o design system
```

**Regra de ouro da estrutura:** `src/pages/` não contém lógica. Uma página é
uma casca de três linhas sobre uma view, e a view é a mesma nos dois idiomas.
É isso que impede PT e EN de divergirem com o tempo.

---

## 3. Decisões de arquitetura

### 3.1 Como as traduções se ligam

O nome do arquivo é a chave de tradução: `blog/pt/proteina.md` e
`blog/en/proteina.md` são o mesmo artigo. A URL de cada idioma pode ser
diferente — o campo opcional `permalink` no frontmatter dá ao texto em inglês
um endereço em inglês.

> O campo **não** se chama `slug` de propósito: `slug` é reservado pelo glob
> loader do Astro e substituiria o id da entrada, apagando o prefixo de idioma
> que liga as duas traduções.

### 3.2 Artigo ainda não traduzido

A página em inglês **existe** e mostra o texto em português, com aviso claro
ao leitor. Não é 404 e não é conteúdo duplicado: o `canonical` aponta para a
URL portuguesa, e o `hreflang="en"` só é anunciado quando há tradução de
verdade. O feed RSS em inglês também ignora esses artigos — quem assina em
inglês não deve receber texto em português.

### 3.3 Rascunhos

`draft: true` aparece em `npm run dev` e desaparece do build de produção. A
regra vive num único lugar (`src/lib/articles.ts`) e a verificação de build
falha se qualquer marca de rascunho aparecer no `dist/`.

### 3.4 Categorias em código, artigos em conteúdo

Categoria define URL, navegação, breadcrumb e JSON-LD. Por isso é um `enum`
validado no build, não um campo livre — um erro de digitação quebra o CI em
vez de gerar uma página órfã em produção.

### 3.5 Monetização sem refém

A integração com o AdSense é **aditiva**: `src/config/ads.ts` lê o ID do
editor do ambiente e, se ele não existir, nenhum script é carregado, nenhum
espaço é reservado e o `/ads.txt` sai dizendo que não há vendedor autorizado.
Não existe caminho em que o site dependa da publicidade para funcionar.

Três decisões sustentam isso:

**A página declara se tem anúncio.** O `<head>` é renderizado antes do corpo,
então na hora de decidir o script nenhum bloco existe para observar. Por isso
`BaseLayout` recebe `ads="listing"` ou `ads="article"` — e quem não recebe
nada não carrega script nenhum. Sem essa declaração o Google seria contatado
até na política de privacidade, que não exibe um bloco sequer. `verify-build`
falha se alguma página carregar o script sem ter bloco.

**O bloco do meio do artigo nasce no HTML, não em JavaScript.** Ele é inserido
pelo pipeline de Markdown (`src/plugins/rehype-in-article-ad.ts`), antes da
terceira seção e só em textos com pelo menos quatro — a posição depende da
estrutura do texto, que só o pipeline enxerga. Como sai no HTML, o espaço já
nasce reservado: o texto não pula quando o anúncio carrega, e o CLS não
degrada. Páginas institucionais ficam de fora por filtro de caminho.

**O script de ativação é um arquivo fixo em `public/ads.js`.** Não é um
`<script>` de componente porque script de componente entra pelo grafo de
módulos da página: bastaria o `<head>` importar o componente para o bundle
sair em todas as páginas, condicional ou não. Arquivo de caminho fixo mantém a
decisão em quem escreve a tag — e continua externo, como a CSP exige.

### 3.6 Artigo sem assinatura

`author` é opcional. Nem todo texto tem uma pessoa por trás, e inventar uma
seria pior do que não ter. Sem autor, o `JSON-LD` assina o artigo como a
`Organization` já presente no grafo — `author` é campo exigido pelo Google em
`Article`, então omiti-lo custaria a elegibilidade a resultado enriquecido. Na
página, a assinatura e o cartão de autoria simplesmente não aparecem, e a
prova de confiança fica com as fontes listadas em `references`, que o leitor
pode conferir uma a uma. `reviewer` continua sendo o sinal forte em conteúdo
clínico.

### 3.7 Onde mora a regra de negócio

`src/lib/article-model.ts` é puro: funções sobre dados simples, sem importar
`astro:content`. É onde estão as decisões que realmente podem quebrar o site
(fallback de idioma, ordenação, slug, relacionados) e é por isso que dá para
testá-las em milissegundos, sem build.

---

## 4. Segurança

O site é estático: não há banco, sessão, formulário processado no servidor
nem código executando em produção. A superfície de ataque é a entrega. É ela
que está protegida.

| Medida                                            | Onde                         | Por quê                                                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSP com `script-src 'self'`**                   | `public/.htaccess`           | Sem `'unsafe-inline'`. O build não gera nenhum script inline (`assetsInlineLimit: 0`) e `scripts/verify-build.mjs` **falha o build** se algum aparecer. `'wasm-unsafe-eval'` existe apenas para o Pagefind. |
| `style-src` permite inline                        | idem                         | Atributos `style=` são usados em gradiente por categoria e no dimensionamento responsivo de imagem. A fronteira que importa contra XSS é a execução de script, e ela continua fechada.                      |
| **HSTS 2 anos + HTTPS forçado**                   | idem                         | `preload` fica desligado até todos os subdomínios servirem HTTPS — a lista de preload é difícil de reverter.                                                                                                |
| `frame-ancestors 'none'`, `X-Frame-Options: DENY` | idem                         | Sem clickjacking.                                                                                                                                                                                           |
| `Permissions-Policy` restritiva                   | idem                         | Câmera, microfone, geolocalização e pagamento desligados: o site não usa nenhum deles.                                                                                                                      |
| **CSP separada para `/admin/`**                   | `public/admin/.htaccess`     | O CMS precisa falar com a API do GitHub. A exceção fica isolada na pasta, em vez de afrouxar a política do site inteiro.                                                                                    |
| **JSON-LD escapado**                              | `src/lib/seo.ts`             | Título vem do CMS, ou seja, é texto de terceiro. Sem escapar `<`, um `</script>` no título injetaria markup na página. Coberto por teste.                                                                   |
| **Zero script de terceiro por padrão**            | por padrão                   | Nenhuma fonte de CDN, nenhum widget social, nenhum analytics ligado sem decisão explícita. A exceção é o AdSense, e só quando configurado.                                                                  |
| **Anúncio isolado em iframe**                     | `public/.htaccess`           | `frame-src` é o que permite o anúncio; `script-src` libera apenas os domínios do Google que servem o tag. Nenhum criativo executa no contexto do documento.                                                 |
| **Script de anúncio só onde há anúncio**          | `src/config/ads.ts`          | Página sem bloco não contata o Google. Coberto por `verify-build`, que falha se o script aparecer numa página sem `<ins>`.                                                                                  |
| **ID de editor fictício barrado no CI**           | `scripts/verify-build.mjs`   | `pub-1234...` serve para conferir layout antes de a conta existir. Publicar com ele faria o Google tratar o inventário do domínio como não autorizado — aviso no build local, erro no CI.                   |
| **Segredos fora do repositório**                  | `.gitignore`, GitHub Secrets | `.env` nunca é versionado. Credencial de FTP vive em Secrets; domínio e integrações em Variables. Nada com `PUBLIC_` é segredo — vai para o HTML.                                                           |
| **Ações de CI pinadas por SHA**                   | `.github/workflows/`         | Tag pode ser movida para outro commit; SHA não.                                                                                                                                                             |
| **`npm audit` no CI**                             | `ci.yml`                     | Falha em vulnerabilidade `high` ou superior.                                                                                                                                                                |
| **Dependabot agrupado**                           | `.github/dependabot.yml`     | Atualização de rotina semanal em um PR; major separado, para leitura.                                                                                                                                       |

**LGPD.** Sem cookie de rastreamento. A única informação guardada no
navegador é a preferência de tema, em `localStorage`, que nunca sai do
dispositivo. A política de privacidade descreve exatamente isso.

---

## 5. Performance

Restrições de projeto, não otimização posterior:

- **Zero JavaScript de framework.** O que existe são três scripts pequenos e
  independentes: tema, sumário e busca (esta só carrega ao digitar).
- **Fonte pré-carregada** com caminho estável — um caminho com hash não
  poderia ser pré-carregado no `<head>`.
- **Imagens responsivas** em AVIF/WebP, com `eager` apenas na capa acima da
  dobra e `lazy` no resto.
- **Cache imutável de um ano** para tudo com nome hasheado; HTML sempre
  revalidado, para um artigo novo aparecer na hora.
- **Sem CSS inline**, para a CSP poder exigir `style-src 'self'` na origem.

---

## 6. Custo em produção

| Item                                    | Custo                                             |
| --------------------------------------- | ------------------------------------------------- |
| Hospedagem Hostinger (compartilhada)    | plano já contratado                               |
| GitHub Actions (repositório público)    | grátis                                            |
| GitHub Actions (repositório privado)    | ~2 min por deploy, dentro da cota gratuita mensal |
| Busca (Pagefind)                        | R$ 0 — roda no navegador                          |
| CMS (Sveltia)                           | R$ 0 — sem serviço, sem assinatura                |
| Fontes, ícones, imagem social           | R$ 0 — gerados no build                           |
| **Total recorrente além da hospedagem** | **R$ 0**                                          |

O único custo que cresce com o tempo é banda, proporcional à audiência —
mitigado pelo cache de um ano nos assets.

---

## 7. Rodando o projeto

```bash
npm install
cp .env.example .env     # ajuste PUBLIC_SITE_URL
npm run dev              # http://localhost:4321
```

| Comando                   | O que faz                                                       |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | Servidor local com recarga automática. Rascunhos visíveis.      |
| `npm run new -- "Título"` | Cria o arquivo do artigo já com frontmatter válido.             |
| `npm run build`           | Build + índice de busca + verificação. É o que roda no CI.      |
| `npm run preview`         | Serve o `dist/` como em produção.                               |
| `npm run validate`        | Formatação + lint + tipos + testes + build. Rode antes do push. |
| `npm test`                | Só os testes (rápido).                                          |

Porta: **4321** (padrão do Astro). Nenhum outro serviço sobe localmente.

---

## 8. Editando de qualquer lugar

O caminho padrão é local: `npm run dev`, abrir `/admin/`, clicar em
**Work with Local Repository**, escolher a pasta do projeto. Sem login, sem
servidor — o CMS grava direto nos arquivos `.md`, e depois é `git push`.

Para editar do celular ou de outra máquina, sem o projeto instalado, o editor
precisa de um intermediário que conduza o login: o segredo do OAuth não pode
morar numa página pública. Esse papel é do `sveltia-cms-auth`, que roda como
Cloudflare Worker gratuito.

1. Publique o `sveltia-cms-auth` na Cloudflare e anote a URL do Worker.
2. Registre um OAuth App no GitHub com callback `<worker>/callback`.
3. Grave `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` nas variáveis do Worker,
   e `ALLOWED_DOMAINS` com o domínio do site.
4. Acrescente `base_url: <worker>` ao bloco `backend` do
   `public/admin/config.yml` — a linha já está lá, comentada.

**Passo a passo com telas e valores exatos em `MANUAL.md`, seção 8.**

O Worker pede escopo `repo,user`, que cobre repositório privado — nada muda no
editor se o repositório deixar de ser público.

Publicar continua sendo o mesmo caminho: commit → CI → deploy. No editor
remoto o Save já é o commit, então não há `npm run validate` antes: erro de
conteúdo aparece como deploy vermelho, e não na tela de quem escreveu.

---

## 9. Deploy

Push em `main` dispara a CI (formatação, lint, tipos, testes, auditoria,
build, verificação do `dist/`). Só o artefato aprovado é enviado por FTPS
para `public_html/`.

Segredos necessários em **Settings → Secrets and variables → Actions**:

| Tipo     | Nome                       | Valor                       |
| -------- | -------------------------- | --------------------------- |
| Secret   | `FTP_SERVER`               | host FTP da Hostinger       |
| Secret   | `FTP_USERNAME`             | usuário FTP                 |
| Secret   | `FTP_PASSWORD`             | senha FTP                   |
| Variable | `PUBLIC_SITE_URL`          | `https://seudominio.com.br` |
| Variable | `PUBLIC_NEWSLETTER_ACTION` | opcional                    |
| Variable | `PUBLIC_ANALYTICS_SRC`     | opcional                    |
| Variable | `PUBLIC_ADSENSE_CLIENT`    | opcional — `ca-pub-…`       |
| Variable | `PUBLIC_ADSENSE_SLOT_*`    | opcional — um por posição   |

**Ligando o AdSense.** Enquanto a conta não sai, nada precisa ser feito: sem
`PUBLIC_ADSENSE_CLIENT` o site não carrega nada do Google. Quando o painel
liberar, crie uma unidade de anúncio por posição (`IN_ARTICLE`, `ARTICLE_END`,
`SIDEBAR`, `LISTING`), coloque o `ca-pub-` e os IDs de bloco em **Variables** e
publique — o `/ads.txt` passa a autorizar o vendedor sozinho. Posição sem ID
configurado simplesmente não aparece, então dá para ligar uma de cada vez.

O `.htaccess` é parte do artefato: o deploy falha de propósito se ele não
estiver presente, para o site nunca subir sem cabeçalho de segurança.

---

## 10. Limites conhecidos

- **`noindex` e sitemap.** Um artigo com `noindex: true` recebe a meta tag,
  mas continua listado no sitemap — o filtro do `@astrojs/sitemap` opera
  sobre URL, sem acesso ao frontmatter. A meta tag é a instrução que os
  buscadores obedecem; caso vire incômodo, o sitemap passa a ser gerado por
  rota própria.
- **Página 404 única.** Hospedagem estática serve um documento de erro só;
  ele sai em português, com o seletor de idioma disponível.
- **Acessibilidade no lint.** `eslint-plugin-jsx-a11y` ainda declara peer
  `eslint@^9` e forçaria a instalação a quebrar o `npm ci`. As diagnósticas
  nativas do compilador rodam via `npm run check`, e o `verify-build` cobre
  imagem sem `alt`.
- **Node 24.16+.** O parser do ESLint para arquivos `.astro` exige essa
  versão; abaixo dela o `npm run lint` emite aviso de engine.
- **Listagem sem paginação.** `/artigos/` e as páginas de categoria renderizam
  o acervo inteiro. É o comportamento certo — e melhor para busca — até algo
  em torno de 150 artigos; a partir daí o HTML fica pesado no celular. O
  conserto é uma rota só: trocar `getStaticPaths` por
  `paginate(articles, { pageSize: 24 })` em `src/pages/artigos/index.astro` e
  no equivalente em inglês.
- **Cadeia de suprimento do CMS.** `@sveltia/cms` é um bundle de terceiro
  servido do próprio domínio. Versão exata travada no `package-lock`,
  atualizações chegam por PR do Dependabot (revisável) e o editor só executa
  para quem edita — nunca para o leitor. Ainda assim, é a dependência de
  maior superfície do projeto: leia o diff antes de aceitar a atualização.
- **Deploy sem rollback automático.** O envio é incremental por FTPS; voltar
  atrás significa reverter o commit e deixar a CI publicar de novo (~2 min).
  Aceitável para um blog; se virar problema, a saída é versionar releases em
  pastas e trocar um symlink — o que exige VPS.
