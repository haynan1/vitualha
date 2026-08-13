# Guia editorial

Como escrever, traduzir e publicar no Nutrição em Ação. Este guia é sobre
conteúdo — decisões técnicas estão em [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Publicar em três passos

1. **Criar** — `npm run new -- "Título do artigo"` ou o botão _New_ no editor
   visual em `/admin`.
2. **Escrever** — o artigo nasce como rascunho: aparece no `npm run dev` e
   nunca no site publicado.
3. **Publicar** — troque `draft` para `false` (ou desmarque _Rascunho_ no
   editor) e faça `git push`. A CI valida e publica sozinha.

---

## Os campos do artigo

| Campo                | Obrigatório | O que é                                                                                                               |
| -------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `title`              | sim         | 10 a 120 caracteres. É o `<h1>` e o título no Google.                                                                 |
| `summary`            | sim         | 40 a 320 caracteres. Aparece no card, na busca e na descrição do Google. Escreva como frase completa.                 |
| `category`           | sim         | `nutrition`, `foods`, `health`, `fitness`, `recipes` ou `science`.                                                    |
| `publishedAt`        | sim         | `AAAA-MM-DD`.                                                                                                         |
| `author`             | não         | Nome do arquivo em `src/content/authors/` (ex.: `camila-ferreira`). Em branco, o artigo sai assinado pela publicação. |
| `reviewer`           | não         | Quem fez a revisão técnica. **Use sempre** em conteúdo clínico, de suplementação ou com número recomendado.           |
| `updatedAt`          | não         | Data da última revisão relevante. Aparece no artigo e no JSON-LD.                                                     |
| `cover` / `coverAlt` | não         | Havendo capa, o texto alternativo passa a ser obrigatório — o build cobra. Sem capa, entra um gradiente da categoria. |
| `tags`               | não         | Até 8. Alimentam as sugestões de leitura.                                                                             |
| `featured`           | não         | Sobe o artigo para o topo da home.                                                                                    |
| `permalink`          | não         | Endereço próprio da URL neste idioma. Serve principalmente para dar slug em inglês à tradução.                        |
| `references`         | não         | Fontes científicas. Só `https`.                                                                                       |
| `faq`                | não         | Perguntas e respostas. Viram bloco no artigo e dados estruturados de FAQ para o Google.                               |
| `noindex`            | não         | Tira a página dos buscadores.                                                                                         |

Erro em qualquer um deles **quebra o build de propósito**, com mensagem
dizendo o que corrigir. É melhor errar no CI do que publicar um artigo com
data invertida ou autor inexistente.

**Sobre assinar ou não.** Assine sempre que houver uma pessoa que responda
pelo texto — em saúde, o nome e a credencial de quem escreveu valem mais que
qualquer otimização. Deixe em branco quando não houver: nota curta,
atualização de pauta, material coletivo. Nesses casos quem assina é a
publicação, e a prova de confiança passa a ser a lista de `references` — que é
justamente o que o leitor consegue conferir sozinho. O que não vale é assinar
com um nome que não revisou o conteúdo.

---

## Blocos de destaque

```markdown
:::dica[Na prática]
Combine proteína com fibras no café da manhã.
:::

:::atencao[Cuidado com metas infladas]
Acima de 2,2 g/kg não há benefício adicional demonstrado.
:::

:::nota
Alimentos reais quase sempre trazem os dois tipos de fibra.
:::
```

Em inglês: `:::tip`, `:::warning`, `:::note`. O rótulo entre colchetes é
opcional — sem ele entra o título padrão do tipo.

## Tabelas

Markdown normal. Tabela larga ganha rolagem própria no celular
automaticamente, sem empurrar a página para o lado.

## Imagens

Coloque o arquivo em `src/assets/uploads/` (ou use o botão de upload do
editor) e referencie por caminho relativo. O build gera AVIF e WebP em vários
tamanhos. Toda imagem precisa de texto alternativo.

---

## Traduzir um artigo

O nome do arquivo é o que liga as duas versões:

```
src/content/blog/pt/proteina-quanto-precisamos.md
src/content/blog/en/proteina-quanto-precisamos.md   ← mesmo nome
```

Na versão em inglês, use `permalink` para dar uma URL em inglês:

```yaml
permalink: protein-how-much-do-we-need
```

No editor visual as duas versões aparecem lado a lado, na mesma tela.

**Enquanto a tradução não existe**, a página em inglês já funciona: mostra o
texto em português com um aviso ao leitor, aponta o `canonical` para a versão
original e fica fora do feed RSS em inglês. Ninguém encontra 404.

---

## Padrão de escrita

O que sustenta a credibilidade do site:

- **Comece pela conclusão.** O primeiro parágrafo entrega a resposta, não a
  introdução do assunto.
- **Toda afirmação quantitativa precisa de fonte** em `references`.
- **Quando a evidência é fraca, diga.** "Os dados ainda não permitem afirmar"
  vale mais do que uma conclusão inventada.
- **Sem superlativo, sem alimento milagroso, sem demonizar macronutriente.**
- **Frase curta.** O leitor está no celular, provavelmente com pressa.
- **Sempre feche com o que fazer** com a informação.

Regras de fonte, revisão e correção: [política editorial](src/content/pages/pt/editorial.md).

---

## Antes de publicar

```bash
npm run validate
```

Formatação, lint, tipos, testes e build completo — o mesmo que a CI roda.
Passando aqui, passa lá.
