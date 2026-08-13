/**
 * Aplica o tema salvo antes da primeira pintura da pagina.
 *
 * Precisa ser sincrono e ficar no <head>: qualquer atraso aqui vira um flash
 * branco para quem le no escuro. Fica num arquivo externo (e nao inline) para
 * que a CSP possa exigir script-src 'self' sem 'unsafe-inline'.
 *
 * Sem valor salvo, nenhum atributo é escrito e o CSS decide pelo
 * prefers-color-scheme do sistema.
 */
(function () {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch {
    /* Navegacao privada pode bloquear localStorage — seguir o sistema basta. */
  }
})();
