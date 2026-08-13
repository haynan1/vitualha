import type { APIRoute } from 'astro';

import { localizedFeed } from '@/lib/feed';

export const GET: APIRoute = async (context) => localizedFeed('pt', context.site);
