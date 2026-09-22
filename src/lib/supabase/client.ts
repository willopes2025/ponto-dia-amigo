import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

import type { Database } from './database.types';

/**
 * Cliente Supabase único da aplicação, tipado pelo schema real.
 *
 * URL e chave vêm do ambiente, não do código: o mesmo build roda contra
 * desenvolvimento, homologação e produção, e nenhuma credencial entra no git.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { 'x-application-name': 'visio' },
    },
  },
);
