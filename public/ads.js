/**
 * Ativa os blocos de anuncio presentes na pagina.
 *
 * Fica num arquivo externo (e nao inline) pela mesma razao que o theme.js: a
 * CSP de producao exige script-src 'self' sem 'unsafe-inline', e a verificacao
 * de build reprova qualquer script inline que escape.
 *
 * Nao é empacotado pelo Astro de proposito. Script de componente é resolvido
 * pelo grafo de modulos da pagina, nao pelo que a pagina de fato renderiza:
 * bastaria o <head> importar o componente para o bundle sair em todas as
 * paginas, inclusive nas que nao exibem anuncio nenhum. Num arquivo de caminho
 * fixo, quem decide é a tag <script> — e ela só é escrita onde ha bloco.
 *
 * Carregado com `defer`: roda depois do parse, com todos os <ins> ja no DOM, e
 * nao disputa a primeira pintura com o conteudo.
 */
(function () {
  const units = document.querySelectorAll('ins.adsbygoogle');
  if (units.length === 0) return;

  /**
   * A fila é um array simples ate o script do Google carregar; ele processa o
   * que ja estiver dentro. Criar aqui evita depender da ordem de chegada entre
   * este arquivo e o adsbygoogle.js, que é assincrono.
   */
  window.adsbygoogle = window.adsbygoogle || [];

  for (const unit of units) {
    // O proprio AdSense marca o elemento ao preencher. Sem esta checagem, um
    // segundo push no mesmo bloco faz o script reclamar de "ins ja preenchido"
    // e pode deixar o espaco vazio.
    if (unit.dataset.adsbygoogleStatus) continue;
    window.adsbygoogle.push({});
  }
})();
