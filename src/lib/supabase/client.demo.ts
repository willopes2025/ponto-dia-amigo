import { clienteDemo } from '@/demo/cliente';

import type { Database } from './database.types';
import type { createClient } from '@supabase/supabase-js';

/**
 * Substituto de `client.ts` no build de demonstração.
 *
 * O alias está em vite.config.ts, sob o modo `demo`. Nenhum outro arquivo do
 * projeto importa este — é o bundler que faz a troca.
 */
export const supabase = clienteDemo as unknown as ReturnType<typeof createClient<Database>>;
