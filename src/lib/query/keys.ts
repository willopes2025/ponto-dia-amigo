/**
 * Fábrica de chaves do React Query.
 *
 * Centralizar aqui existe por um motivo prático: invalidar cache com string
 * literal espalhada pelo código erra silenciosamente — a tela simplesmente não
 * atualiza e ninguém sabe por quê. Com a fábrica, `qk.clientes.all` invalida
 * tudo de clientes, e o TypeScript garante a forma da chave.
 *
 * Convenção: toda chave começa pelo escopo (rede ou filial) a que pertence, para
 * que trocar de filial no seletor invalide exatamente o que é por filial e
 * preserve o que é por rede.
 */
export const qk = {
  sessao: {
    contexto: () => ['sessao', 'contexto'] as const,
    permissoes: () => ['sessao', 'permissoes'] as const,
  },

  rede: {
    tenant: () => ['rede', 'tenant'] as const,
    filiais: () => ['rede', 'filiais'] as const,
    usuarios: () => ['rede', 'usuarios'] as const,
    usuario: (id: string) => ['rede', 'usuarios', id] as const,
    convites: () => ['rede', 'convites'] as const,
    modelosPermissao: () => ['rede', 'modelos-permissao'] as const,
    modeloPermissao: (id: string) => ['rede', 'modelos-permissao', id] as const,
    catalogoPermissoes: () => ['rede', 'catalogo-permissoes'] as const,
    auditoria: (filtros?: unknown) => ['rede', 'auditoria', filtros ?? {}] as const,
  },
} as const;

/** Prefixo para invalidar tudo que depende da filial selecionada. */
export const CHAVE_ESCOPO_FILIAL = 'filial' as const;
