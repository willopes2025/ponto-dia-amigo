import '@testing-library/jest-dom/vitest';

/**
 * `import.meta.env` no ambiente de teste.
 *
 * `src/lib/env.ts` valida a configuração na carga do módulo e lança se faltar
 * algo — comportamento que queremos em produção. Nos testes, preenchemos com
 * valores de fachada para que importar qualquer coisa que toque no Supabase não
 * exija um projeto real.
 */
Object.assign(import.meta.env, {
  VITE_SUPABASE_URL: 'https://projeto-de-teste.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'chave-anonima-de-teste-suficientemente-longa',
});
