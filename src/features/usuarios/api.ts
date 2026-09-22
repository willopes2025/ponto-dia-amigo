import { supabase } from '@/lib/supabase';
import { traduzirErro } from '@/lib/query/lista';
import type { Tables } from '@/lib/supabase';

export type Perfil = Tables<'profiles'>;
export type Convite = Tables<'user_invites'>;

export interface UsuarioNaLista extends Perfil {
  user_stores: { store_id: string }[];
  user_permission_profiles: { permission_profile_id: string }[];
}

export async function listarUsuarios(): Promise<UsuarioNaLista[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, user_stores ( store_id ), user_permission_profiles ( permission_profile_id )')
    .order('nome');

  if (error) throw traduzirErro(error);
  return (data ?? []) as UsuarioNaLista[];
}

export async function listarConvites(): Promise<Convite[]> {
  const { data, error } = await supabase
    .from('user_invites')
    .select('*')
    .is('aceito_em', null)
    .order('created_at', { ascending: false });

  if (error) throw traduzirErro(error);
  return data ?? [];
}

export async function criarConvite(dados: {
  tenantId: string;
  email: string;
  nome: string;
  modelos: string[];
  filiais: string[];
  limiteDesconto: number;
  criadoPor: string | null;
}) {
  const { error } = await supabase.from('user_invites').insert({
    tenant_id: dados.tenantId,
    email: dados.email.trim().toLowerCase(),
    nome: dados.nome.trim() || null,
    permission_profile_ids: dados.modelos,
    store_ids: dados.filiais,
    limite_desconto: dados.limiteDesconto,
    criado_por: dados.criadoPor,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe um convite pendente para este e-mail.');
    }
    throw traduzirErro(error);
  }
}

export async function cancelarConvite(id: string) {
  const { error } = await supabase.from('user_invites').delete().eq('id', id);
  if (error) throw traduzirErro(error);
}

/** Acesso às filiais de um usuário: o que ele enxerga em toda tela por loja. */
export async function definirFiliais(profileId: string, filiais: string[], atuais: string[]) {
  const aRemover = atuais.filter((f) => !filiais.includes(f));
  const aAdicionar = filiais.filter((f) => !atuais.includes(f));

  if (aAdicionar.length > 0) {
    const { error } = await supabase
      .from('user_stores')
      .insert(aAdicionar.map((store_id) => ({ profile_id: profileId, store_id })));
    if (error) throw traduzirErro(error);
  }
  if (aRemover.length > 0) {
    const { error } = await supabase
      .from('user_stores')
      .delete()
      .eq('profile_id', profileId)
      .in('store_id', aRemover);
    if (error) throw traduzirErro(error);
  }
}

export async function definirModelos(profileId: string, modelos: string[], atuais: string[]) {
  const aRemover = atuais.filter((m) => !modelos.includes(m));
  const aAdicionar = modelos.filter((m) => !atuais.includes(m));

  if (aAdicionar.length > 0) {
    const { error } = await supabase
      .from('user_permission_profiles')
      .insert(aAdicionar.map((permission_profile_id) => ({ profile_id: profileId, permission_profile_id })));
    if (error) throw traduzirErro(error);
  }
  if (aRemover.length > 0) {
    const { error } = await supabase
      .from('user_permission_profiles')
      .delete()
      .eq('profile_id', profileId)
      .in('permission_profile_id', aRemover);
    if (error) throw traduzirErro(error);
  }
}

export async function alterarUsuario(
  id: string,
  dados: { ativo?: boolean; limite_desconto?: number },
) {
  const { error } = await supabase.from('profiles').update(dados).eq('id', id);
  if (error) throw traduzirErro(error);
}
