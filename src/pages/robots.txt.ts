import type { APIRoute } from 'astro';

/**
 * Gerado a partir de `site` (PUBLIC_SITE_URL) em vez de arquivo fixo: trocar
 * de dominio nao deixa para tras um sitemap apontando para o endereco antigo.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : '';

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Area de edicao: nao ha conteudo publico para indexar.',
    'Disallow: /admin/',
    '',
    sitemap ? `Sitemap: ${sitemap}` : '',
  ]
    .join('\n')
    .trim();

  return new Response(`${body}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
