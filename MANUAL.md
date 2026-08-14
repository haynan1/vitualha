# Manual da Vitualha

Como escrever, revisar e publicar no blog. Não exige saber programar — a
maioria das tarefas é clicar, escrever e salvar.

Para arquitetura e decisões técnicas, ver `ARCHITECTURE.md`.
Para o estado da hospedagem e credenciais, ver `RELATORIO.md`.

---

## Sumário

1. [Como o sistema funciona](#1-como-o-sistema-funciona)
2. [Escrever pelo editor visual](#2-escrever-pelo-editor-visual)
3. [Escrever por arquivo](#3-escrever-por-arquivo)
4. [Os campos do artigo](#4-os-campos-do-artigo)
5. [Escrever bem no editor](#5-escrever-bem-no-editor) · [Imagens](#5a-imagens)
6. [Publicar](#6-publicar)
7. [Traduzir](#7-traduzir)
8. [Editar de qualquer lugar](#8-editar-de-qualquer-lugar)
9. [Manutenção](#9-manutenção)
10. [Quando algo dá errado](#10-quando-algo-dá-errado)
11. [A home](#11-a-home)

---

## 1. Como o sistema funciona

O site não tem banco de dados nem painel no servidor. Cada artigo é um arquivo
de texto dentro do repositório, e o site é **gerado** a partir desses arquivos.

```
você escreve  →  commit no GitHub  →  CI valida  →  site publicado
   (editor)         (salvar)           (~40s)        (~1min total)
```

Três consequências práticas:

- **Nada se perde.** Todo texto tem histórico completo. Dá para ver o que
  mudou, quando e voltar atrás.
- **Nada quebrado entra no ar.** Se um campo obrigatório faltar, a publicação
  falha antes de chegar ao site — e o site antigo continua servindo.
- **O site é rápido porque é estático.** Não há processamento por visita.

### Onde o conteúdo mora

```
src/content/
├── blog/
│   ├── pt/    os artigos em português
│   └── en/    os artigos em inglês
├── pages/
│   ├── pt/    about, contact, editorial, privacy, terms
│   └── en/
└── authors/   uma ficha por pessoa que assina
```

Português e inglês são **arquivos irmãos com o mesmo nome**. É o nome do
arquivo que liga uma tradução à outra — renomear um lado desfaz o par.

---

## 2. Escrever pelo editor visual

O jeito recomendado no dia a dia. Mostra os campos certos, valida enquanto
você escreve e não exige decorar sintaxe.

### Abrir

```bash
npm run dev
```

Abra `http://localhost:4321/admin/` e clique em **"Work with Local
Repository"**. Escolha a pasta do projeto. Não pede login nem senha.

O editor passa a gravar direto nos arquivos do seu computador.

### Criar um artigo

1. **Artigos** → **New Artigo**
2. Preencha os campos (o próximo capítulo explica cada um)
3. Escreva o texto no corpo
4. **Save**

O artigo nasce como **rascunho**: aparece no `npm run dev` para você revisar e
não vai para o site. Quando estiver pronto, desmarque `Rascunho` e salve.

### Ver como ficou

Com o `npm run dev` rodando, o site local recarrega sozinho a cada alteração.
Rascunhos aparecem só aqui, nunca no site publicado.

### Enviar para o ar

O editor grava no seu disco, não publica. Para publicar:

```bash
npm run validate
git add -A
git commit -m "post: creatina"
git push
```

---

## 3. Escrever por arquivo

Se preferir seu editor de texto.

### Criar com o frontmatter pronto

```bash
npm run new -- "Ômega-3: o que a evidência mostra"
npm run new -- "Omega-3: what the evidence shows" --locale en --category science
```

Cria o arquivo com todos os campos válidos, já como rascunho.

### Estrutura do arquivo

```markdown
---
title: 'Ômega-3: o que a evidência mostra'
summary: Um resumo de 40 a 320 caracteres que aparece no card, na busca e no Google.
category: science
publishedAt: 2026-08-14
tags:
  - ômega-3
  - suplementação
draft: true
---

O texto começa aqui, em Markdown.
```

O bloco entre `---` é o **frontmatter**: os dados do artigo. O texto vem
depois.

Não há campo `author` aí porque ainda não existe nenhuma ficha de autor — o
artigo sai assinado pela publicação. Ao criar a primeira ficha, acrescente
`author: nome-do-arquivo`.

---

## 4. Os campos do artigo

O build valida cada um e **falha se algo estiver errado**. É de propósito:
melhor quebrar na publicação do que publicar dado inválido.

| Campo         | Obrigatório | Regra                                                      |
| ------------- | ----------- | ---------------------------------------------------------- |
| `title`       | sim         | 10 a 120 caracteres                                        |
| `summary`     | sim         | 40 a 320 caracteres                                        |
| `category`    | sim         | `nutrition` `foods` `health` `fitness` `recipes` `science` |
| `publishedAt` | sim         | data — `2026-08-14`                                        |
| `updatedAt`   | não         | data da última revisão                                     |
| `author`      | não         | nome do arquivo em `authors/` — ainda não há fichas        |
| `reviewer`    | não         | quem revisou tecnicamente                                  |
| `cover`       | não         | imagem de capa — **exige `coverAlt`**                      |
| `coverAlt`    | com capa    | descrição da imagem, mínimo 5 caracteres                   |
| `tags`        | não         | até 8                                                      |
| `featured`    | não         | `true` destaca na home                                     |
| `draft`       | não         | `true` esconde do site publicado                           |
| `permalink`   | não         | muda o endereço; padrão é o nome do arquivo                |
| `references`  | não         | fontes: `title`, `url` (https), `publisher`                |
| `faq`         | não         | até 10 pares pergunta/resposta                             |
| `noindex`     | não         | tira do sitemap e pede para não indexar                    |

### Os que merecem atenção

**`summary`** é o texto que aparece no card, no resultado de busca e no Google.
Não é o primeiro parágrafo — é uma promessa do que o leitor vai levar.

**`author`** é opcional de propósito. Sem ele, o artigo é assinado pela
publicação, e a autoridade vem das fontes em `references`. Melhor isso do que
inventar uma pessoa.

**`reviewer`** é o sinal mais forte de confiança em conteúdo de saúde. Use
sempre que alguém com credencial revisar o texto.

**`references`** alimenta a seção de fontes e o dado estruturado que o Google
lê. URL precisa ser `https`.

**`faq`** vira a seção de perguntas no fim do artigo e pode aparecer como
resultado expandido na busca.

**`permalink`** só quando quiser um endereço diferente do nome do arquivo —
típico ao traduzir, para o inglês ter URL em inglês.

### Categorias

| Valor       | Aparece como |
| ----------- | ------------ |
| `nutrition` | Nutrição     |
| `foods`     | Alimentos    |
| `health`    | Saúde        |
| `fitness`   | Fitness      |
| `recipes`   | Receitas     |
| `science`   | Ciência      |

### Endereços

Nome de arquivo e `permalink` aceitam só **minúsculas sem acento, números e
hífen**: `proteina-quanto-precisamos`. O `npm run new` já converte o título.

---

## 5. Escrever bem no editor

O corpo é Markdown. O essencial:

```markdown
## Um subtítulo

Texto normal, com **negrito** e _itálico_.

- item de lista
- outro item

1. lista numerada
2. segundo item

[um link](https://exemplo.com)

> Uma citação.

### Subtítulo menor
```

### Índice automático

Os `##` viram o índice lateral do artigo, sozinhos. Use-os para dividir o
texto em blocos — ajuda o leitor e ajuda a busca.

---

## 5A. Imagens

As imagens moram em `src/assets/uploads/`. Não em `public/` — a diferença
importa: só o que está em `src/assets/` passa pelo otimizador.

### Onde colocar no texto

Pelo editor visual, use o botão de imagem. Ele grava o caminho certo sozinho.

Por arquivo, o caminho é **relativo ao artigo**, com três níveis de subida:

```markdown
![Descrição do que a imagem mostra](../../../assets/uploads/foto.jpg)
```

Os `../../../` saem de `src/content/blog/pt/` e chegam em `src/assets/`. Vale
para artigos nos dois idiomas, porque a profundidade é a mesma.

**Não use caminho começando com barra.** `/src/assets/uploads/foto.jpg` não
dá erro no build, não aparece em teste nenhum, e quebra no site: a imagem sai
sem otimização, apontando para um endereço que não existe. Testado.

### Quantas quiser, onde quiser

Não há limite nem posição fixa. Cada `![...]` no meio do texto vira uma
imagem otimizada:

```markdown
## O que a evidência mostra

![Gráfico da relação entre dose e resposta](../../../assets/uploads/dose-resposta.jpg)

Texto que segue depois da imagem.

## Como aplicar na prática

![Prato montado com as proporções descritas](../../../assets/uploads/prato.jpg)
```

### Capa

A capa é campo do frontmatter, não do corpo, e exige descrição:

```yaml
cover: ../../../assets/uploads/capa.jpg
coverAlt: Descrição do que a capa mostra
```

Ela aparece no topo do artigo, no card da listagem e no destaque da home. Sem
capa, o card mostra um gradiente derivado da cor da categoria — não fica
buraco.

### Sempre descreva a imagem

O texto entre colchetes é o que leitores de tela anunciam e o que aparece se a
imagem não carregar. Deixar vazio só se a imagem for puramente decorativa.

Na capa isso é obrigatório: `cover` sem `coverAlt` derruba o build de
propósito.

### Que formato subir

Suba **JPG** para fotografia e **PNG** para gráfico, diagrama ou qualquer
imagem com texto e linhas nítidas. SVG serve para ícone e logotipo.

Não se preocupe com o formato final: o build converte tudo para **WebP** e
gera várias larguras — três para a capa, até nove para imagem no corpo do
texto —, servindo a menor que couber na tela de quem lê. Você sobe uma
imagem; o navegador escolhe a versão certa.

O pipeline também aceita HEIC — o formato que o iPhone usa por padrão — mas
converter para JPG antes de subir evita surpresa e mantém o repositório legível
para qualquer editor.

### Que tamanho subir

**Largura de 1600 px, qualidade 85–90.** Esse é o número que importa.

O motivo é medido, não estimado. A maior variante que o layout chega a exibir
tem 1440 px (a capa do artigo); no corpo, a coluna de texto é bem mais
estreita. Subir além disso não melhora nada na tela e cobra caro no build:

| Origem  | Peso gerado no site | Ganho visível |
| ------- | ------------------- | ------------- |
| 3000 px | 10,4 MB             | nenhum        |
| 1600 px | 2,2 MB              | idêntico      |

Quase cinco vezes mais peso, pixel nenhum a mais na tela. Um artigo com quatro
fotos de 3000 px carrega 40 MB de variantes para o servidor sem que ninguém
veja diferença.

**Como redimensionar antes de subir:** qualquer editor serve. No Windows,
Fotos → Redimensionar → Personalizado → largura 1600. No celular, a maioria
dos apps de foto tem "exportar em tamanho médio".

### Peso do arquivo

Depois de redimensionar para 1600 px, um JPG de foto costuma ficar entre 200
e 500 KB. Acima de 1 MB, provavelmente a qualidade está em 100 — baixe para
85 e compare: a diferença é invisível e o arquivo cai pela metade.

---

## 6. Publicar

### O caminho normal

```bash
npm run validate     # o que a CI roda; erro aqui é erro lá
git add -A
git commit -m "post: ômega-3"
git push
```

Em cerca de um minuto o artigo está no ar. Sobem só os arquivos que mudaram.

**Rode o `npm run validate` antes do push.** Ele faz formatação, lint, tipos,
testes e build — e evita descobrir o problema depois.

### Acompanhar

```bash
gh run list --workflow deploy.yml     # os últimos deploys
gh run watch                          # acompanha o que está rodando
```

Verde significa **site no ar**: depois de enviar, o deploy busca o site e
reprova se ele não responder com o conteúdo novo.

### Conferir na mão

```bash
curl -sS https://vitualha.com/robots.txt      # tem que ter "Sitemap:"
```

Ou simplesmente abra o site.

### Republicar sem escrever nada

```bash
gh workflow run deploy.yml
```

---

## 7. Traduzir

Cada artigo tem um arquivo por idioma, com o **mesmo nome**:

```
src/content/blog/pt/creatina-o-que-a-ciencia-diz.md
src/content/blog/en/creatina-o-que-a-ciencia-diz.md
```

O nome do arquivo é o vínculo. Para o endereço em inglês ficar em inglês, use
o `permalink` no arquivo `en/`:

```yaml
permalink: creatine-what-science-says
```

O editor visual mostra os dois idiomas na mesma tela.

**Artigo sem tradução não some.** Ele aparece no idioma que existe, com aviso.
O que não acontece é entrar no feed RSS em inglês — quem assina o feed em
inglês não deve receber texto em português.

---

## 8. Editar de qualquer lugar

Para escrever do celular ou de outro computador, sem instalar nada. São quatro
etapas, uma vez só. Depois é só abrir `https://vitualha.com/admin/` e entrar.

O editor não fala com o GitHub sozinho: falta um intermediário que conduza o
login. Esse intermediário é o **sveltia-cms-auth**, um programa minúsculo que
roda de graça na Cloudflare. Ele existe porque o segredo do login não pode
morar numa página pública — precisa de um lugar fechado, e é ele.

### Etapa 1 — Publicar o autenticador na Cloudflare

1. Crie uma conta em [cloudflare.com](https://cloudflare.com) (o plano gratuito
   basta).
2. Abra [github.com/sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)
   e clique no botão **Deploy to Cloudflare Workers**.
3. Ao terminar, anote o endereço do Worker. Ele tem esta cara:

   ```
   https://sveltia-cms-auth.SEU-SUBDOMINIO.workers.dev
   ```

### Etapa 2 — Registrar o aplicativo no GitHub

Em [github.com/settings/applications/new](https://github.com/settings/applications/new):

| Campo                      | O que preencher                                                |
| -------------------------- | -------------------------------------------------------------- |
| Application name           | `Vitualha CMS`                                                 |
| Homepage URL               | `https://vitualha.com`                                         |
| Authorization callback URL | `https://sveltia-cms-auth.SEU-SUBDOMINIO.workers.dev/callback` |

O **callback precisa terminar em `/callback`** e apontar para o Worker da
etapa 1 — não para o site. Errar isso é a causa mais comum de o login não
voltar.

Clique em **Register application**, depois em **Generate a new client secret**.
Guarde os dois valores: o **Client ID** e o **Client Secret**. O secret só
aparece uma vez.

### Etapa 3 — Guardar as chaves no Worker

No painel da Cloudflare: **Workers & Pages** → `sveltia-cms-auth` →
**Settings** → **Variables**.

| Variável               | Valor           | Observação              |
| ---------------------- | --------------- | ----------------------- |
| `GITHUB_CLIENT_ID`     | o Client ID     |                         |
| `GITHUB_CLIENT_SECRET` | o Client Secret | clique em **Encrypt**   |
| `ALLOWED_DOMAINS`      | `vitualha.com`  | opcional, e recomendado |

**Sempre marque Encrypt no secret.** Sem isso ele fica legível no painel.

O `ALLOWED_DOMAINS` faz o Worker atender só o seu site. Sem ele, qualquer
página na internet poderia usar o seu autenticador.

### Etapa 4 — Ligar no editor

Em `public/admin/config.yml`, descomente a última linha do bloco `backend` e
troque pelo endereço do seu Worker:

```yaml
backend:
  name: github
  repo: haynan1/vitualha
  branch: main
  base_url: https://sveltia-cms-auth.SEU-SUBDOMINIO.workers.dev
```

Publique:

```bash
git add -A && git commit -m "feat(cms): ligar o login remoto" && git push
```

Pronto. Abra `https://vitualha.com/admin/` de qualquer aparelho, clique em
**Sign in with GitHub**, autorize, e o editor abre com o conteúdo real.

### Se o login abrir mas não conectar

O fluxo acontece numa janela separada, que a política de segurança da página
normalmente não governa. Se mesmo assim não voltar, acrescente a origem do
Worker ao `connect-src` em `public/admin/.htaccess` — há um comentário no
próprio arquivo mostrando onde. Use a origem exata, nunca
`https://*.workers.dev`: o coringa autorizaria o Worker de qualquer pessoa.

### Alternativa rápida, só para você

Se for o único a editar, dá para pular tudo isso: na tela de login, clique em
**Sign In with Token** e cole um token pessoal do GitHub. O próprio diálogo
abre a página de criação com as permissões certas já marcadas.

É mais simples, mas o token vive no seu navegador e expira — o caminho do
Worker é o que vale a pena para uso contínuo, e o único que funciona bem para
outras pessoas.

### Publicando pelo editor remoto

Nesse modo o **Save já é o commit**: o texto vai para o GitHub, a CI roda e o
site publica sozinho. Não há `git push` — e não há `npm run validate` antes,
então erro de conteúdo aparece como deploy vermelho em vez de erro na sua
tela. Vale conferir o Actions depois de publicar algo importante.

---

## 9. Manutenção

### Autores

**Ainda não há nenhuma ficha.** Enquanto for assim, todo artigo sai assinado
pela publicação, e a autoridade vem das fontes citadas em `references` — que é
o que o leitor pode conferir. Isso é uma escolha válida, não uma pendência: é
melhor do que atribuir um texto a alguém que não o revisou.

Para criar a primeira, um arquivo por pessoa em `src/content/authors/`:

```markdown
---
name: Nome Sobrenome
credential: CRN-3 12345
role:
  pt: Nutricionista clínica
  en: Clinical dietitian
bio:
  pt: Texto de pelo menos 20 caracteres.
  en: At least 20 characters.
links: {}
---
```

O nome do arquivo — `nome-sobrenome.md` — é o que se usa em `author:` e
`reviewer:` nos artigos. O `credential` (CRN, CRM) é o que mais pesa em
conteúdo de saúde.

Enquanto a pasta estiver vazia, o build avisa
`No files found matching "**/*.md"`. É esperado, e some quando a primeira
ficha existir.

### Páginas fixas

`src/content/pages/pt/` — sobre, contato, política editorial, privacidade,
termos. Mesma lógica dos artigos, com menos campos.

### Newsletter

Sem `PUBLIC_NEWSLETTER_ACTION` configurado, o bloco vira um convite para a
página de contato em vez de um formulário que não envia. Para ligar, defina a
variável com o endpoint do provedor (Buttondown, Beehiiv, Mailchimp).

### Anúncios

Enquanto `PUBLIC_ADSENSE_CLIENT` não existir, **nada do Google é carregado**.
Quando a conta sair, crie uma unidade por posição e coloque os IDs em
**Variables** no GitHub:

| Nome                              | Onde aparece              |
| --------------------------------- | ------------------------- |
| `PUBLIC_ADSENSE_CLIENT`           | o `ca-pub-…` da conta     |
| `PUBLIC_ADSENSE_SLOT_IN_ARTICLE`  | meio do artigo            |
| `PUBLIC_ADSENSE_SLOT_ARTICLE_END` | fim do artigo             |
| `PUBLIC_ADSENSE_SLOT_SIDEBAR`     | coluna lateral            |
| `PUBLIC_ADSENSE_SLOT_LISTING`     | home, índice e categorias |

Dá para ligar uma posição por vez: slot sem ID não aparece.

### Comandos

| Comando                             | O que faz                                       |
| ----------------------------------- | ----------------------------------------------- |
| `npm run dev`                       | Servidor local, porta 4321. Rascunhos visíveis. |
| `npm run new -- "Título"`           | Cria o artigo com frontmatter válido.           |
| `npm run validate`                  | Formatação + lint + tipos + testes + build.     |
| `npm test`                          | Só os testes.                                   |
| `npm run preview`                   | Serve como em produção.                         |
| `gh run list --workflow deploy.yml` | Últimos deploys.                                |
| `gh workflow run deploy.yml`        | Republica sem commit.                           |

---

## 10. Quando algo dá errado

### O deploy ficou vermelho

```bash
gh run view --log-failed
```

A mensagem diz o que corrigir. Os casos comuns:

| Mensagem                                             | O que é                                            |
| ---------------------------------------------------- | -------------------------------------------------- |
| `String must contain at least 40 character(s)`       | resumo curto demais                                |
| `Invalid enum value`                                 | categoria fora da lista                            |
| `Toda capa precisa de coverAlt`                      | imagem de capa sem descrição                       |
| `Use apenas letras minusculas sem acento`            | acento ou espaço no endereço                       |
| `robots.txt nao responde com o conteudo deste build` | envio foi para a pasta errada — ver `RELATORIO.md` |

**O site no ar não cai quando o deploy falha.** Só não recebe a novidade.

### O artigo não aparece

- `draft` ainda está `true`?
- `publishedAt` está no futuro?
- O deploy terminou verde?

### O `npm run validate` reclama de formatação

```bash
npm run format
```

Arruma sozinho.

### O editor visual não abre

Precisa do `npm run dev` rodando. O endereço é
`http://localhost:4321/admin/`, com a barra final.

### Voltar atrás

Todo texto tem histórico. Para ver o que mudou:

```bash
git log --oneline -- src/content/blog/pt/creatina-o-que-a-ciencia-diz.md
git show <hash>
```

Para restaurar uma versão anterior de um arquivo:

```bash
git checkout <hash> -- src/content/blog/pt/creatina-o-que-a-ciencia-diz.md
```

Depois `commit` e `push` normalmente.

---

## 11. A home

**A home não tem arquivo de conteúdo, e isso é de propósito.** Ela se monta
sozinha a partir dos artigos publicados. Você nunca escolhe manualmente o que
aparece ali — escolhe pelas marcações nos artigos.

Se houvesse uma lista fixa, publicar um artigo exigiria dois passos, e o
segundo seria esquecido. Assim a home nunca fica desatualizada.

### Como ela se articula

De cima para baixo:

| Bloco                 | O que entra                        | Quantos |
| --------------------- | ---------------------------------- | ------- |
| **Destaque grande**   | o primeiro artigo da fila          | 1       |
| **Em destaque**       | os próximos da fila                | 3       |
| **Categorias**        | as seis categorias fixas           | 6       |
| _(espaço de anúncio)_ | só aparece com AdSense configurado | —       |
| **Últimos artigos**   | os seguintes da fila               | 8       |
| **Newsletter**        | formulário ou convite para contato | —       |

### A fila

A ordem é decidida assim:

1. Artigos com `featured: true` vêm primeiro, do mais novo para o mais antigo.
2. Depois, todos os outros, também do mais novo para o mais antigo.

Dessa fila única saem, em sequência: o **destaque grande** (o primeiro), os
**3 em destaque** (os seguintes) e os **8 últimos** (os seguintes). O botão
"Ver todos os artigos" aparece sozinho quando sobra algo além dos 12.

### Como controlar o que aparece

**Para colocar um artigo no topo:** marque `featured: true` no frontmatter. Se
mais de um estiver marcado, o mais recente fica com o destaque grande.

**Para tirar do topo:** troque para `featured: false` ou apague a linha.

**Para mudar a ordem entre destaques:** ajuste o `publishedAt`. A data manda
dentro de cada grupo.

**Atenção ao marcar muitos.** Com cinco artigos em `featured: true`, os quatro
primeiros ocupam o destaque grande e o bloco "Em destaque", e o quinto cai em
"Últimos artigos" — onde ele estaria de qualquer jeito. Marcar tudo equivale a
não marcar nada.

### Mudar quantos aparecem

Em `src/config/site.ts`:

```ts
export const HOME_LAYOUT = {
  featured: 3, // cartões do bloco "Em destaque"
  latest: 8, // cartões do bloco "Últimos artigos"
  related: 3, // relacionados no fim de cada artigo
} as const;
```

O destaque grande é sempre um só.

### Mudar os textos

Em `src/i18n/ui.ts`, bloco `home` — há um para `pt` e outro para `en`:

```ts
home: {
  heroEyebrow: 'Em destaque',
  heroCta: 'Ler artigo',
  featuredTitle: 'Artigos em destaque',
  categoriesTitle: 'Explore por categoria',
  categoriesSubtitle: 'Navegue pelos temas que mais interessam a você.',
  latestTitle: 'Últimos artigos',
  latestSubtitle: 'Conteúdo novo, baseado em evidências, publicado com frequência.',
  viewAllBtn: 'Ver todos os artigos',
  empty: 'Ainda não há artigos publicados.',
},
```

O título e a descrição que o Google mostra ficam logo abaixo, em `meta`:
`homeTitle` e `homeDescription`.

### Mudar a ordem ou remover um bloco

A estrutura vive em `src/views/HomeView.astro`. Cada bloco é uma `<section>`
independente — reordenar é mover o trecho, remover é apagá-lo. É o único
arquivo da home que exige mexer em código.

### Categorias

As seis são fixas, definidas em `src/config/categories.ts` com nome, cor e
letra de cada uma. Aparecem sempre, mesmo sem artigo publicado na categoria.

---

## Convenções de commit

Não é obrigatório, mas mantém o histórico legível:

| Prefixo  | Quando                       |
| -------- | ---------------------------- |
| `post:`  | artigo novo                  |
| `edit:`  | correção em artigo existente |
| `feat:`  | funcionalidade nova          |
| `fix:`   | correção de defeito          |
| `docs:`  | documentação                 |
| `chore:` | manutenção                   |
