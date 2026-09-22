import { supabase } from '@/lib/supabase';
import { listar, termoBusca, traduzirErro, type ParametrosLista } from '@/lib/query/lista';
import type { Tables, TablesInsert } from '@/lib/supabase';

export type Cliente = Tables<'clientes'>;
export type ClienteMetricas = Tables<'cliente_metricas'>;
export type ClienteTelefone = Tables<'cliente_telefones'>;
export type ClienteEmail = Tables<'cliente_emails'>;

export interface ClienteNaLista extends Cliente {
  cliente_metricas: ClienteMetricas | null;
  cliente_telefones: Pick<ClienteTelefone, 'numero' | 'ddi' | 'aceita_whatsapp' | 'principal'>[];
}

export interface FiltrosCliente {
  storeId?: string;
  origemId?: string;
  convenioId?: string;
  cidade?: string;
  negativado?: boolean;
  comAtraso?: boolean;
}

export async function listarClientes(params: ParametrosLista & { filtros: FiltrosCliente }) {
  // As métricas vêm juntas em vez de cinco subconsultas por linha: a listagem
  // mostra contagem de vendas, O.S., receitas e parcelas em atraso, e calcular
  // isso por linha é o que torna uma lista de 5 mil clientes inutilizável.
  let consulta = supabase
    .from('clientes')
    .select(
      `*,
       cliente_metricas ( * ),
       cliente_telefones ( numero, ddi, aceita_whatsapp, principal )`,
      { count: 'exact' },
    )
    .eq('ativo', true);

  const termo = termoBusca(params.busca);
  if (termo) {
    // Nome, apelido ou documento — quem está no balcão digita o que tem à mão.
    const digitos = (params.busca ?? '').replace(/\D/g, '');
    const condicoes = [`nome.ilike.${termo}`, `apelido.ilike.${termo}`];
    if (digitos.length >= 3) condicoes.push(`cpf_cnpj.ilike.%${digitos}%`);
    consulta = consulta.or(condicoes.join(','));
  }

  const { filtros } = params;
  if (filtros.storeId) consulta = consulta.eq('store_id', filtros.storeId);
  if (filtros.origemId) consulta = consulta.eq('origem_id', filtros.origemId);
  if (filtros.convenioId) consulta = consulta.eq('convenio_id', filtros.convenioId);
  if (filtros.cidade) consulta = consulta.ilike('cidade', `%${filtros.cidade}%`);
  if (filtros.negativado) consulta = consulta.eq('negativado', true);

  return listar<ClienteNaLista>(consulta as never, {
    ...params,
    ordenacao: params.ordenacao ?? { campo: 'nome', direcao: 'asc' },
  });
}

export async function buscarCliente(id: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select(
      `*,
       cliente_metricas ( * ),
       cliente_telefones ( * ),
       cliente_emails ( * ),
       cliente_referencias ( * ),
       cliente_negativacoes ( * )`,
    )
    .eq('id', id)
    .single();

  if (error) throw traduzirErro(error);
  return data;
}

export async function criarCliente(dados: TablesInsert<'clientes'>) {
  const { data, error } = await supabase.from('clientes').insert(dados).select().single();
  if (error) throw traduzirErro(error);
  return data;
}

export async function atualizarCliente(id: string, dados: Partial<TablesInsert<'clientes'>>) {
  const { data, error } = await supabase
    .from('clientes')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw traduzirErro(error);
  return data;
}

// ---------------------------------------------------------------------------
// Contatos
// ---------------------------------------------------------------------------
export async function salvarTelefone(dados: TablesInsert<'cliente_telefones'>) {
  const { error } = await supabase
    .from('cliente_telefones')
    .upsert(dados, { onConflict: 'id' });
  if (error) throw traduzirErro(error);
}

export async function excluirTelefone(id: string) {
  const { error } = await supabase.from('cliente_telefones').delete().eq('id', id);
  if (error) throw traduzirErro(error);
}

export async function salvarEmail(dados: TablesInsert<'cliente_emails'>) {
  const { error } = await supabase.from('cliente_emails').upsert(dados, { onConflict: 'id' });
  if (error) throw traduzirErro(error);
}

export async function excluirEmail(id: string) {
  const { error } = await supabase.from('cliente_emails').delete().eq('id', id);
  if (error) throw traduzirErro(error);
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------
/**
 * Linhas para planilha, com os mesmos filtros da tela.
 *
 * O limite de 5 mil é deliberado: acima disso a exportação trava o navegador
 * montando a planilha, e o pedido real nesse volume é de extração pelo banco,
 * não de download pela tela.
 */
export async function exportarClientes(filtros: FiltrosCliente, busca?: string) {
  const { linhas } = await listarClientes({
    pagina: 1,
    porPagina: 5000,
    busca,
    filtros,
    ordenacao: { campo: 'codigo', direcao: 'asc' },
  });

  return linhas.map((cliente) => ({
    Código: cliente.codigo,
    Nome: cliente.nome,
    Apelido: cliente.apelido ?? '',
    Tipo: cliente.tipo === 'pj' ? 'Pessoa jurídica' : 'Pessoa física',
    'CPF/CNPJ': cliente.cpf_cnpj ?? '',
    Nascimento: cliente.data_nascimento ?? '',
    Telefone: cliente.cliente_telefones?.find((t) => t.principal)?.numero ?? '',
    Cidade: cliente.cidade ?? '',
    UF: cliente.uf ?? '',
    Negativado: cliente.negativado ? 'Sim' : 'Não',
    Vendas: cliente.cliente_metricas?.vendas_qtd ?? 0,
    'Valor comprado': cliente.cliente_metricas?.vendas_valor ?? 0,
    'Última compra': cliente.cliente_metricas?.ultima_compra_em ?? '',
    Receitas: cliente.cliente_metricas?.receitas_qtd ?? 0,
    'Parcelas em atraso': cliente.cliente_metricas?.parcelas_atraso_qtd ?? 0,
    'Consentiu contato': cliente.consentimento_contato_em ? 'Sim' : 'Não',
  }));
}
