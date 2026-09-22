import { z } from 'zod';

/**
 * Configuração vinda do ambiente, validada na inicialização.
 *
 * Falhar aqui, na carga do módulo, é deliberado: é melhor a aplicação não subir
 * com uma mensagem clara do que subir e quebrar na primeira consulta com
 * "Invalid API key", que manda o desenvolvedor caçar o problema no lugar errado.
 */
/**
 * A versão de demonstração roda sem backend, com dados embutidos no bundle.
 * Publicada como página estática, não tem projeto Supabase para onde apontar.
 *
 * Deriva do modo do build (`vite build --mode demo`), e não de uma variável
 * própria: o vite.config já troca o cliente Supabase por esse mesmo modo, e
 * dois interruptores para a mesma decisão acabam ligados pela metade — foi o
 * que aconteceu na primeira tentativa, com o alias ativo e a interface achando
 * que estava em produção.
 */
export const MODO_DEMO = import.meta.env.MODE === 'demo';

const schema = z.object({
  VITE_SUPABASE_URL: z
    .string({ required_error: 'VITE_SUPABASE_URL não definida' })
    .url('VITE_SUPABASE_URL precisa ser uma URL (ex.: https://xxxx.supabase.co)'),
  VITE_SUPABASE_ANON_KEY: z
    .string({ required_error: 'VITE_SUPABASE_ANON_KEY não definida' })
    .min(20, 'VITE_SUPABASE_ANON_KEY parece curta demais para ser uma chave válida'),

  // `mock` roda tudo localmente, sem chamada externa. Trocar por um provedor
  // real é mudar esta variável — não o código que chama a integração.
  VITE_FISCAL_PROVIDER: z.enum(['mock', 'focus']).default('mock'),
  VITE_BOLETO_PROVIDER: z.enum(['mock', 'asaas']).default('mock'),
  VITE_ADQUIRENTE_PROVIDER: z.enum(['mock', 'pagarme']).default('mock'),
  VITE_MENSAGERIA_PROVIDER: z.enum(['mock', 'meta', 'zapi']).default('mock'),
});

function carregar() {
  if (MODO_DEMO) {
    // Sem credencial a validar: o cliente de demonstração não fala com ninguém.
    return schema.parse({
      VITE_SUPABASE_URL: 'https://demonstracao.visio.app',
      VITE_SUPABASE_ANON_KEY: 'demonstracao-sem-backend-nao-ha-credencial',
    });
  }

  const resultado = schema.safeParse(import.meta.env);

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `  · ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Configuração de ambiente inválida:\n${problemas}\n\n` +
        'Copie .env.example para .env e preencha com as credenciais do seu projeto Supabase.',
    );
  }

  return resultado.data;
}

export const env = carregar();
