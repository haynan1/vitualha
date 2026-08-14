# Vitualha

Blog editorial bilíngue (PT-BR / EN) sobre nutrição baseada em evidências.
Site estático em Astro, conteúdo em Markdown versionado no Git, editor visual
em `/admin`, deploy automático na Hostinger a cada push.

```bash
npm install
cp .env.example .env      # ajuste PUBLIC_SITE_URL
npm run dev               # http://localhost:4321
```

## Comandos

| Comando                   | O que faz                                                    |
| ------------------------- | ------------------------------------------------------------ |
| `npm run dev`             | Servidor local. Rascunhos ficam visíveis.                    |
| `npm run new -- "Título"` | Cria o arquivo do artigo com frontmatter válido.             |
| `npm run build`           | Build + índice de busca + verificação do resultado.          |
| `npm run preview`         | Serve o `dist/` como em produção.                            |
| `npm run validate`        | Formatação, lint, tipos, testes e build. Rode antes do push. |
| `npm test`                | Só os testes.                                                |

## Publicando um artigo

Dois caminhos, mesmo resultado (um arquivo `.md` no Git):

**Pelo editor visual** — `npm run dev`, abra
[localhost:4321/admin](http://localhost:4321/admin/), clique em
**Work with Local Repository** e escolha a pasta do projeto. Escreva, salve,
depois `git push`.

**Pelo terminal** — `npm run new -- "Título do artigo"`, edite o `.md`, troque
`draft: true` para `false`, `git push`.

Manual completo de uso — editores, campos, imagens, home, deploy:
**[MANUAL.md](MANUAL.md)**.
Referência rápida de escrita e blocos especiais: **[EDITORIAL.md](EDITORIAL.md)**.
Decisões técnicas, segurança e deploy: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Estrutura em uma olhada

```
src/content/blog/pt/       artigos em português
src/content/blog/en/       traduções (mesmo nome de arquivo = mesmo artigo)
src/content/pages/         sobre, contato, privacidade, termos, editorial
src/content/authors/       autoria e revisão técnica (hoje vazia)
src/assets/uploads/        imagens dos artigos — otimizadas no build
src/lib/article-model.ts   regras de conteúdo (testadas)
public/.htaccess           cabeçalhos de segurança, cache e redirects
```

## Antes do primeiro deploy

1. `PUBLIC_SITE_URL` no `.env` e em **Settings → Variables** do GitHub.
2. `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` em **Settings → Secrets**.
3. `FTP_SERVER_DIR` em **Variables** — a pasta que o domínio serve, com barra
   no final. Errar aqui não gera erro: o FTP grava com sucesso na pasta errada
   e o site continua servindo a versão antiga. Ver
   [ARCHITECTURE.md](ARCHITECTURE.md), seção 9.
4. `repo:` em `public/admin/config.yml` apontando para o repositório real.
5. E-mail e redes em `src/config/site.ts`.

## Qualidade

Todo push passa por formatação, lint, checagem de tipos, testes, `npm audit`
e uma verificação do HTML gerado — link interno quebrado, **imagem quebrada**,
página sem canonical, imagem sem `alt`, rascunho vazado ou script inline
reprovam o build antes do deploy.

O deploy também se autoverifica: depois de enviar, busca o site e reprova se a
resposta não vier deste build. Verde significa "no ar", não "arquivo em algum
lugar do servidor".
