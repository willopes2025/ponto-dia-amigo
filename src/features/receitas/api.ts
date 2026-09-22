import { supabase } from '@/lib/supabase';
import { listar, termoBusca, traduzirErro, type ParametrosLista } from '@/lib/query/lista';
import type { Tables, TablesInsert } from '@/lib/supabase';

export type Receita = Tables<'receitas'>;
export type ReceitaVencida = Tables<'vw_receitas_vencidas'>;

export interface ReceitaNaLista extends Receita {
  clientes: { nome: string; codigo: number } | null;
  medicos: { nome: string } | null;
}

export async function listarReceitas(
  params: ParametrosLista & { filtros: { clienteId?: string; tipo?: string; vencidas?: boolean } },
) {
  let consulta = supabase
    .from('receitas')
    .select('*, clientes!inner ( nome, codigo ), medicos ( nome )', { count: 'exact' })
    .eq('ativo', true);

  const termo = termoBusca(params.busca);
  if (termo) consulta = consulta.ilike('clientes.nome', termo);

  if (params.filtros.clienteId) consulta = consulta.eq('cliente_id', params.filtros.clienteId);
  if (params.filtros.tipo) consulta = consulta.eq('tipo', params.filtros.tipo as never);
  if (params.filtros.vencidas) {
    consulta = consulta.lt('validade', new Date().toISOString().slice(0, 10));
  }

  return listar<ReceitaNaLista>(consulta as never, {
    ...params,
    ordenacao: params.ordenacao ?? { campo: 'data_receita', direcao: 'desc' },
  });
}

/**
 * Fila de recall por receita vencida.
 *
 * Lê a view, que já resolve o que é elegível: só a receita mais recente por
 * cliente e tipo — contar as antigas inflaria a fila e, mais adiante, o número
 * de oportunidade em aberto.
 */
export async function listarReceitasVencidas(params: ParametrosLista) {
  let consulta = supabase
    .from('vw_receitas_vencidas')
    .select('*', { count: 'exact' });

  const termo = termoBusca(params.busca);
  if (termo) consulta = consulta.ilike('cliente_nome', termo);

  return listar<ReceitaVencida>(consulta as never, {
    ...params,
    ordenacao: params.ordenacao ?? { campo: 'dias_vencida', direcao: 'desc' },
  });
}

export async function criarReceita(dados: TablesInsert<'receitas'>) {
  const { data, error } = await supabase.from('receitas').insert(dados).select().single();
  if (error) throw traduzirErro(error);
  return data;
}

export async function atualizarReceita(id: string, dados: Partial<TablesInsert<'receitas'>>) {
  const { data, error } = await supabase
    .from('receitas')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw traduzirErro(error);
  return data;
}
