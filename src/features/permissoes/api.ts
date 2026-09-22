import { supabase } from '@/lib/supabase';
import { traduzirErro } from '@/lib/query/lista';
import type { PermissionKey } from '@/lib/permissions/catalog';
import type { Tables } from '@/lib/supabase';

export type ModeloPermissao = Tables<'permission_profiles'>;

export interface ModeloComChaves extends ModeloPermissao {
  chaves: PermissionKey[];
  usuarios: number;
}

export async function listarModelos(): Promise<ModeloComChaves[]> {
  // Uma ida só: o modelo, suas chaves e quantos usuários o carregam. A
  // alternativa — uma consulta por modelo — faria seis viagens numa tela que
  // precisa ser instantânea para ser usável.
  const { data, error } = await supabase
    .from('permission_profiles')
    .select(
      `*,
       permission_profile_permissions ( permission_key ),
       user_permission_profiles ( profile_id )`,
    )
    .order('is_owner', { ascending: false })
    .order('nome');

  if (error) throw traduzirErro(error);

  return (data ?? []).map((linha) => {
    const { permission_profile_permissions: chaves, user_permission_profiles: usuarios, ...modelo } =
      linha;
    return {
      ...modelo,
      chaves: (chaves ?? []).map((c) => c.permission_key as PermissionKey),
      usuarios: (usuarios ?? []).length,
    };
  });
}

export async function criarModelo(
  tenantId: string,
  dados: { nome: string; descricao?: string | null },
) {
  const { data, error } = await supabase
    .from('permission_profiles')
    .insert({ tenant_id: tenantId, nome: dados.nome, descricao: dados.descricao ?? null })
    .select()
    .single();

  if (error) throw traduzirErro(error);
  return data;
}

export async function atualizarModelo(
  id: string,
  dados: { nome?: string; descricao?: string | null; ativo?: boolean },
) {
  const { error } = await supabase.from('permission_profiles').update(dados).eq('id', id);
  if (error) throw traduzirErro(error);
}

export async function excluirModelo(id: string) {
  const { error } = await supabase.from('permission_profiles').delete().eq('id', id);
  if (error) throw traduzirErro(error);
}

/**
 * Grava as chaves de um modelo, enviando só o que mudou.
 *
 * Apagar tudo e reinserir seria mais simples de escrever, mas deixaria o modelo
 * momentaneamente sem permissão nenhuma — e quem estivesse usando o sistema
 * naquele instante levaria um "sem permissão" do nada. Também encheria a trilha
 * de auditoria com 268 remoções e 268 inserções a cada salvamento.
 */
export async function salvarChaves(
  modeloId: string,
  chavesAtuais: PermissionKey[],
  chavesNovas: PermissionKey[],
) {
  const atuais = new Set(chavesAtuais);
  const novas = new Set(chavesNovas);

  const aRemover = chavesAtuais.filter((c) => !novas.has(c));
  const aAdicionar = chavesNovas.filter((c) => !atuais.has(c));

  if (aAdicionar.length > 0) {
    const { error } = await supabase
      .from('permission_profile_permissions')
      .insert(
        aAdicionar.map((chave) => ({
          permission_profile_id: modeloId,
          permission_key: chave,
        })),
      );
    if (error) throw traduzirErro(error);
  }

  if (aRemover.length > 0) {
    const { error } = await supabase
      .from('permission_profile_permissions')
      .delete()
      .eq('permission_profile_id', modeloId)
      .in('permission_key', aRemover);
    if (error) throw traduzirErro(error);
  }

  return { adicionadas: aAdicionar.length, removidas: aRemover.length };
}
