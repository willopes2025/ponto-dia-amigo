import { supabase } from '@/lib/supabase';
import { listar, termoBusca, traduzirErro, type ParametrosLista } from '@/lib/query/lista';

/**
 * Acesso às tabelas de apoio.
 *
 * O nome da tabela é dinâmico, vindo da configuração — por isso as funções
 * aqui não conseguem ser tipadas pelo schema gerado como as demais features.
 * A validação real está no banco: RLS decide o acesso e as restrições recusam
 * dado inválido. O `as never` isola essa perda de tipo neste arquivo, em vez de
 * espalhá-la pelas telas.
 */

export interface LinhaCadastro {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string | null;
  ordem?: number | null;
  ativo: boolean;
  [coluna: string]: unknown;
}

function tabela(nome: string) {
  return supabase.from(nome as never);
}

export async function listarCadastro(
  nomeTabela: string,
  params: ParametrosLista & { apenasAtivos?: boolean },
) {
  let consulta = tabela(nomeTabela).select('*', { count: 'exact' });

  const termo = termoBusca(params.busca);
  if (termo) {
    consulta = consulta.ilike('nome', termo);
  }
  if (params.apenasAtivos) {
    consulta = consulta.eq('ativo', true);
  }

  return listar<LinhaCadastro>(
    consulta as never,
    // Sem ordenação escolhida, usa a ordem manual do cadastro e depois o nome —
    // é como a lista aparece nos seletores do resto do sistema.
    { ...params, ordenacao: params.ordenacao ?? { campo: 'nome', direcao: 'asc' } },
  );
}

/** Opções para um seletor: só os registros ativos, ordenados como aparecem nas telas. */
export async function listarOpcoes(nomeTabela: string) {
  const { data, error } = await tabela(nomeTabela)
    .select('id, nome')
    .eq('ativo', true)
    .order('ordem')
    .order('nome');

  if (error) throw traduzirErro(error);
  return (data ?? []) as unknown as { id: string; nome: string }[];
}

export async function criarCadastro(
  nomeTabela: string,
  tenantId: string,
  valores: Record<string, unknown>,
) {
  const { data, error } = await tabela(nomeTabela)
    .insert({ ...limpar(valores), tenant_id: tenantId } as never)
    .select()
    .single();

  if (error) throw traduzirErro(error);
  return data as unknown as LinhaCadastro;
}

export async function atualizarCadastro(
  nomeTabela: string,
  id: string,
  valores: Record<string, unknown>,
) {
  const { data, error } = await tabela(nomeTabela)
    .update(limpar(valores) as never)
    .eq('id', id)
    .select()
    .single();

  if (error) throw traduzirErro(error);
  return data as unknown as LinhaCadastro;
}

/**
 * Exclusão com desativação como alternativa.
 *
 * Um cadastro em uso não pode sumir — apagaria a referência de vendas antigas.
 * O banco recusa com violação de chave estrangeira; aqui traduzimos isso numa
 * sugestão acionável em vez de um erro técnico.
 */
export async function excluirCadastro(nomeTabela: string, id: string) {
  const { error } = await tabela(nomeTabela).delete().eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Este registro está em uso e não pode ser excluído. Desative-o: ele deixa de aparecer nos seletores e o histórico continua legível.',
      );
    }
    throw traduzirErro(error);
  }
}

export async function alternarAtivo(nomeTabela: string, id: string, ativo: boolean) {
  const { error } = await tabela(nomeTabela).update({ ativo } as never).eq('id', id);
  if (error) throw traduzirErro(error);
}

/** Campo vazio vira NULL: string vazia num campo opcional polui índice e relatório. */
function limpar(valores: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(valores).map(([chave, valor]) => [
      chave,
      typeof valor === 'string' && valor.trim() === '' ? null : valor,
    ]),
  );
}
