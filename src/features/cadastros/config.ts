import { z } from 'zod';

import type { PermissionKey } from '@/lib/permissions/catalog';

/**
 * Configuração das tabelas de apoio.
 *
 * São vinte cadastros com a mesma forma: nome, descrição, ordem, ativo. Em vez
 * de vinte telas quase idênticas — vinte lugares para o mesmo defeito aparecer —
 * há uma tela genérica lendo daqui. Acrescentar um cadastro nas fases seguintes
 * é uma entrada neste arquivo, não uma tela nova.
 *
 * As tabelas que fogem da forma (plano de contas é árvore, fornecedor tem
 * contatos) têm tela própria e não aparecem aqui.
 */

export type TipoCampo = 'texto' | 'textarea' | 'numero' | 'moeda' | 'percentual'
  | 'booleano' | 'select' | 'data' | 'referencia';

export interface CampoExtra {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  descricao?: string;
  obrigatorio?: boolean;
  opcoes?: { valor: string; rotulo: string }[];
  /** Para `referencia`: tabela de onde vêm as opções. */
  referenciaTabela?: string;
  /** Aparece como coluna na listagem, além do formulário. */
  naListagem?: boolean;
  placeholder?: string;
}

export interface CadastroConfig {
  /** Nome da tabela no banco. */
  tabela: string;
  /** Slug na URL, dentro de /cadastros. */
  slug: string;
  rotulo: string;
  rotuloSingular: string;
  descricao: string;
  /** Agrupamento nas abas da tela. */
  grupo: 'produto' | 'comercial' | 'financeiro' | 'clinico' | 'operacao';
  permissao: PermissionKey;
  /** `false` para cadastros que não usam o campo de descrição. */
  temDescricao?: boolean;
  campos?: CampoExtra[];
}

const NATUREZAS_PAGAMENTO = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
  { valor: 'boleto', rotulo: 'Boleto' },
  { valor: 'crediario', rotulo: 'Crediário' },
  { valor: 'cheque', rotulo: 'Cheque' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'credito_troca', rotulo: 'Crédito de troca' },
  { valor: 'cashback', rotulo: 'Cashback' },
  { valor: 'permuta', rotulo: 'Permuta' },
];

export const CADASTROS: CadastroConfig[] = [
  // ─── Produto ────────────────────────────────────────────────────────────
  {
    tabela: 'grupos', slug: 'grupos', rotulo: 'Grupos', rotuloSingular: 'grupo',
    descricao: 'Categoria principal do produto. Dimensão de quase todo relatório de venda e estoque.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
    campos: [
      {
        nome: 'coeficiente', rotulo: 'Coeficiente', tipo: 'numero', naListagem: true,
        descricao: 'Multiplicador usado no preço sugerido desta categoria.',
      },
      { nome: 'indice', rotulo: 'Índice', tipo: 'numero', naListagem: true },
    ],
  },
  {
    tabela: 'subgrupos', slug: 'subgrupos', rotulo: 'Subgrupos', rotuloSingular: 'subgrupo',
    descricao: 'Subdivisão dentro de um grupo.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
    campos: [
      {
        nome: 'grupo_id', rotulo: 'Grupo', tipo: 'referencia', referenciaTabela: 'grupos',
        obrigatorio: true, naListagem: true,
      },
    ],
  },
  {
    tabela: 'grifes', slug: 'grifes', rotulo: 'Grifes', rotuloSingular: 'grife',
    descricao: 'Marca do produto. Vale a pena manter limpa: é por aqui que se lê o giro por marca.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'tipos_lente', slug: 'tipos-lente', rotulo: 'Tipos de lente', rotuloSingular: 'tipo de lente',
    descricao: 'Monofocal, multifocal, ocupacional. Usado na compatibilidade com a receita.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'cores', slug: 'cores', rotulo: 'Cores', rotuloSingular: 'cor',
    descricao: 'Cor da armação ou da lente.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'formatos', slug: 'formatos', rotulo: 'Formatos', rotuloSingular: 'formato',
    descricao: 'Formato da armação. Entra na recomendação por formato de rosto.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'tamanhos', slug: 'tamanhos', rotulo: 'Tamanhos', rotuloSingular: 'tamanho',
    descricao: 'Tamanho da armação.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'generos', slug: 'generos', rotulo: 'Gêneros', rotuloSingular: 'gênero',
    descricao: 'Público a que o produto se destina.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'unidades', slug: 'unidades', rotulo: 'Unidades', rotuloSingular: 'unidade',
    descricao: 'Unidade de medida: UN, PAR, CX.',
    grupo: 'produto', permissao: 'cadastros.tabelas_auxiliares',
  },

  // ─── Comercial ──────────────────────────────────────────────────────────
  {
    tabela: 'origens_cliente', slug: 'origens', rotulo: 'Origens de cliente', rotuloSingular: 'origem',
    descricao: 'De onde veio o cliente. É a dimensão que mede canal de aquisição.',
    grupo: 'comercial', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'convenios', slug: 'convenios', rotulo: 'Convênios', rotuloSingular: 'convênio',
    descricao: 'Empresas parceiras. O tipo muda o destino do recebível.',
    grupo: 'comercial', permissao: 'cadastros.tabelas_auxiliares',
    campos: [
      {
        nome: 'tipo', rotulo: 'Tipo', tipo: 'select', naListagem: true, obrigatorio: true,
        opcoes: [
          { valor: 'desconto', rotulo: 'Desconto no ato' },
          { valor: 'consignacao', rotulo: 'Consignação (fatura para a empresa)' },
          { valor: 'permuta', rotulo: 'Permuta' },
        ],
        descricao: 'Desconto abate na venda; consignação gera título contra a empresa parceira.',
      },
      { nome: 'desconto_percentual', rotulo: 'Desconto padrão', tipo: 'percentual', naListagem: true },
      { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'texto' },
      { nome: 'contato', rotulo: 'Contato', tipo: 'texto' },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'texto' },
      { nome: 'email', rotulo: 'E-mail', tipo: 'texto' },
    ],
  },
  {
    tabela: 'profissoes', slug: 'profissoes', rotulo: 'Profissões', rotuloSingular: 'profissão',
    descricao: 'Profissão do cliente. Usada na segmentação e na análise de crediário.',
    grupo: 'comercial', permissao: 'cadastros.tabelas_auxiliares',
  },
  {
    tabela: 'motivos_cancelamento', slug: 'motivos-cancelamento',
    rotulo: 'Motivos de cancelamento', rotuloSingular: 'motivo',
    descricao: 'Cancelar venda, O.S. e orçamento são decisões diferentes — o motivo oferecido acompanha.',
    grupo: 'comercial', permissao: 'cadastros.tabelas_auxiliares',
    temDescricao: false,
    campos: [
      {
        nome: 'aplica_a', rotulo: 'Aplica-se a', tipo: 'select', naListagem: true, obrigatorio: true,
        opcoes: [
          { valor: 'venda', rotulo: 'Venda' },
          { valor: 'os', rotulo: 'Ordem de serviço' },
          { valor: 'orcamento', rotulo: 'Orçamento' },
          { valor: 'troca', rotulo: 'Troca' },
          { valor: 'todos', rotulo: 'Todos' },
        ],
      },
    ],
  },

  // ─── Financeiro ─────────────────────────────────────────────────────────
  {
    tabela: 'formas_pagamento', slug: 'formas-pagamento',
    rotulo: 'Formas de pagamento', rotuloSingular: 'forma de pagamento',
    descricao: 'Taxa e prazo de crédito entram aqui: é o que permite conciliar o líquido que cai na conta.',
    grupo: 'financeiro', permissao: 'cadastros.tabelas_auxiliares',
    temDescricao: false,
    campos: [
      {
        nome: 'natureza', rotulo: 'Natureza', tipo: 'select', naListagem: true, obrigatorio: true,
        opcoes: NATUREZAS_PAGAMENTO,
      },
      { nome: 'permite_parcelamento', rotulo: 'Permite parcelar', tipo: 'booleano' },
      { nome: 'max_parcelas', rotulo: 'Máx. de parcelas', tipo: 'numero' },
      { nome: 'taxa_percentual', rotulo: 'Taxa (%)', tipo: 'percentual', naListagem: true },
      { nome: 'taxa_fixa', rotulo: 'Taxa fixa (R$)', tipo: 'moeda' },
      {
        nome: 'dias_credito', rotulo: 'Dias para crédito', tipo: 'numero', naListagem: true,
        descricao: 'Quantos dias até o valor cair na conta. Alimenta o fluxo de caixa previsto.',
      },
      {
        nome: 'movimenta_caixa', rotulo: 'Movimenta o caixa da loja', tipo: 'booleano',
        descricao: 'Dinheiro entra na gaveta; cartão e PIX vão direto para a conta bancária.',
      },
    ],
  },
  {
    tabela: 'situacoes_conta_receber', slug: 'situacoes-receber',
    rotulo: 'Situações de recebimento', rotuloSingular: 'situação',
    descricao: 'Estados do título a receber. A marcação de inadimplência alimenta a régua de cobrança.',
    grupo: 'financeiro', permissao: 'cadastros.tabelas_auxiliares',
    campos: [
      { nome: 'considera_inadimplente', rotulo: 'Conta como inadimplência', tipo: 'booleano', naListagem: true },
    ],
  },
  {
    tabela: 'tipos_documento', slug: 'tipos-documento',
    rotulo: 'Tipos de documento', rotuloSingular: 'tipo de documento',
    descricao: 'Nota, recibo, duplicata. Classifica o título no financeiro.',
    grupo: 'financeiro', permissao: 'cadastros.tabelas_auxiliares',
  },

  // ─── Clínico ────────────────────────────────────────────────────────────
  {
    tabela: 'medicos', slug: 'medicos', rotulo: 'Médicos e optometristas', rotuloSingular: 'prescritor',
    descricao: 'Quem prescreve. O conselho difere: CRM para oftalmologista, CRO para optometrista.',
    grupo: 'clinico', permissao: 'cadastros.medicos',
    temDescricao: false,
    campos: [
      {
        nome: 'conselho', rotulo: 'Conselho', tipo: 'select', naListagem: true, obrigatorio: true,
        opcoes: [
          { valor: 'CRM', rotulo: 'CRM' },
          { valor: 'CRO', rotulo: 'CRO' },
          { valor: 'OUTRO', rotulo: 'Outro' },
        ],
      },
      { nome: 'registro', rotulo: 'Registro', tipo: 'texto', naListagem: true },
      { nome: 'uf_registro', rotulo: 'UF do registro', tipo: 'texto' },
      { nome: 'especialidade', rotulo: 'Especialidade', tipo: 'texto' },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'texto' },
      { nome: 'email', rotulo: 'E-mail', tipo: 'texto' },
      { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
    ],
  },
  {
    tabela: 'responsaveis_tecnicos', slug: 'responsaveis-tecnicos',
    rotulo: 'Responsáveis técnicos', rotuloSingular: 'responsável técnico',
    descricao: 'Responsável técnico da filial, exigido pela regulamentação do setor.',
    grupo: 'clinico', permissao: 'cadastros.tabelas_auxiliares',
    temDescricao: false,
    campos: [
      { nome: 'registro', rotulo: 'Registro', tipo: 'texto', naListagem: true },
      { nome: 'cpf', rotulo: 'CPF', tipo: 'texto' },
    ],
  },

  // ─── Operação ───────────────────────────────────────────────────────────
  {
    tabela: 'feriados', slug: 'feriados', rotulo: 'Feriados', rotuloSingular: 'feriado',
    descricao:
      'Entram no prazo das Ordens de Serviço. Os nacionais já vêm cadastrados, inclusive os móveis; acrescente os municipais e os fechamentos da loja.',
    grupo: 'operacao', permissao: 'cadastros.feriados',
    temDescricao: false,
    campos: [
      { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true, naListagem: true },
      {
        nome: 'abrangencia', rotulo: 'Abrangência', tipo: 'select', naListagem: true, obrigatorio: true,
        opcoes: [
          { valor: 'nacional', rotulo: 'Nacional' },
          { valor: 'estadual', rotulo: 'Estadual' },
          { valor: 'municipal', rotulo: 'Municipal' },
          { valor: 'loja', rotulo: 'Fechamento da loja' },
        ],
      },
      { nome: 'uf', rotulo: 'UF', tipo: 'texto', placeholder: 'Só para feriado estadual' },
      { nome: 'recorrente', rotulo: 'Repete todo ano', tipo: 'booleano' },
    ],
  },
];

export const GRUPOS_CADASTRO: { chave: CadastroConfig['grupo']; rotulo: string }[] = [
  { chave: 'produto', rotulo: 'Produto' },
  { chave: 'comercial', rotulo: 'Comercial' },
  { chave: 'financeiro', rotulo: 'Financeiro' },
  { chave: 'clinico', rotulo: 'Clínico' },
  { chave: 'operacao', rotulo: 'Operação' },
];

export function cadastroPorSlug(slug: string): CadastroConfig | undefined {
  return CADASTROS.find((c) => c.slug === slug);
}

/** Monta o schema de validação a partir da configuração do cadastro. */
export function schemaDoCadastro(config: CadastroConfig) {
  const forma: Record<string, z.ZodTypeAny> = {
    nome: z.string().trim().min(1, 'Informe o nome'),
    ordem: z.coerce.number().int().min(0).default(0),
    ativo: z.boolean().default(true),
  };

  if (config.temDescricao !== false) {
    forma.descricao = z.string().trim().optional();
  }

  for (const campo of config.campos ?? []) {
    let validador: z.ZodTypeAny;

    switch (campo.tipo) {
      case 'numero':
      case 'moeda':
        validador = z.coerce.number().min(0, 'Não pode ser negativo');
        break;
      case 'percentual':
        validador = z.coerce.number().min(0, 'Não pode ser negativo').max(100, 'No máximo 100%');
        break;
      case 'booleano':
        validador = z.boolean();
        break;
      default:
        validador = z.string().trim();
    }

    forma[campo.nome] = campo.obrigatorio
      ? campo.tipo === 'booleano'
        ? validador
        : validador.refine(
            (v) => v !== '' && v !== undefined && v !== null,
            `${campo.rotulo} é obrigatório`,
          )
      : validador.optional().or(z.literal('')).or(z.null());
  }

  return z.object(forma);
}
