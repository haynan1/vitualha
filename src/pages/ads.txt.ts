import type { APIRoute } from 'astro';

import { ADSENSE_CLIENT } from '@/config/ads';

/**
 * ads.txt — lista quem esta autorizado a vender o inventario do dominio.
 *
 * Nao é opcional: sem este arquivo o Google trata parte do inventario como
 * nao autorizada e a receita cai. Fica gerado a partir de
 * PUBLIC_ADSENSE_CLIENT para nao existir a chance de o ID do editor ficar
 * desatualizado num arquivo copiado a mao.
 *
 * `f08c47fec0942fa0` é o ID do Google no TAG-ID, fixo e igual para todos os
 * editores do AdSense.
 */
const GOOGLE_TAG_ID = 'f08c47fec0942fa0';

export const GET: APIRoute = () => {
  const publisherId = ADSENSE_CLIENT.replace(/^ca-/, '');

  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, ${GOOGLE_TAG_ID}\n`
    : '# Sem editor configurado. Defina PUBLIC_ADSENSE_CLIENT para autorizar a venda de anuncios.\n';

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
