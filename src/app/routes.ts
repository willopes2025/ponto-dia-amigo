import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent, BarChart3, Barcode, Boxes, ClipboardList, CreditCard, Eye, FileText,
  Handshake, LayoutDashboard, Landmark, Megaphone, Package, Percent, PiggyBank, Receipt,
  RefreshCw, ScrollText, Settings, Settings2, ShieldCheck, ShoppingCart, Sparkles, Table2,
  TrendingDown, TrendingUp, UserCog, Users, Wallet,
} from 'lucide-react';

import type { PermissionKey } from '@/lib/permissions/catalog';

/**
 * Registry único de rotas.
 *
 * O router E o menu leem daqui. No app anterior eram duas listas separadas —
 * um array de rotas e um array de navegação com um booleano `adminOnly` — e
 * duas listas que precisam concordar sempre acabam discordando: uma rota nova
 * sem item de menu, ou um item de menu apontando para uma rota removida.
 */

export type NavGrupo = 'operacao' | 'estoque' | 'financeiro' | 'inteligencia' | 'gestao' | 'sistema';

export const GRUPOS: { key: NavGrupo; label: string }[] = [
  { key: 'operacao', label: 'Operação' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'inteligencia', label: 'Inteligência' },
  { key: 'gestao', label: 'Gestão' },
  { key: 'sistema', label: 'Sistema' },
];

export interface ModuloDef {
  /** Caminho da rota, sem barra final. */
  path: string;
  /** Rótulo no menu e no título da página. */
  label: string;
  icon: LucideIcon;
  grupo: NavGrupo;
  /** Permissão exigida para acessar. Sem ela, a rota devolve 403 e o menu esconde. */
  permissao: PermissionKey;
  /** Uma linha explicando o que o módulo faz — usada no placeholder e na paleta de comandos. */
  resumo: string;
  /** Fase do plano em que o módulo é construído. `null` = já pronto. */
  fase: number | null;
  /** Palavras extras para a busca da paleta de comandos. */
  busca?: string[];
}

export const MODULOS: ModuloDef[] = [
  // ─── Operação ────────────────────────────────────────────────────────────
  {
    path: '/painel',
    label: 'Painel',
    icon: LayoutDashboard,
    grupo: 'operacao',
    permissao: 'dashboard.acessar',
    resumo: 'Cada indicador é uma fila de trabalho com ação direta, não só um número.',
    fase: null,
    busca: ['dashboard', 'início', 'home', 'indicadores'],
  },
  {
    path: '/atendimentos',
    label: 'Atendimentos',
    icon: Handshake,
    grupo: 'operacao',
    permissao: 'atendimento.acessar',
    resumo:
      'Registro de quem entrou na loja — inclusive quem não comprou —, com objeção e experimentação de armação.',
    fase: 7,
    busca: ['objeção', 'experimentação', 'visita', 'balcão'],
  },
  {
    path: '/clientes',
    label: 'Clientes',
    icon: Users,
    grupo: 'operacao',
    permissao: 'clientes.acessar',
    resumo: 'Cadastro completo com múltiplos contatos, núcleo familiar e histórico consolidado.',
    fase: 1,
    busca: ['cpf', 'cnpj', 'família', 'aniversário'],
  },
  {
    path: '/receitas',
    label: 'Receitas',
    icon: Eye,
    grupo: 'operacao',
    permissao: 'receitas.consultar',
    resumo: 'Prescrições ópticas por olho, com validade — a base do recall de recompra.',
    fase: 1,
    busca: ['prescrição', 'grau', 'dioptria', 'livro de receitas'],
  },
  {
    path: '/orcamentos',
    label: 'Orçamentos',
    icon: FileText,
    grupo: 'operacao',
    permissao: 'orcamentos.incluir',
    resumo: 'Orçamento com validade, que vira venda em um clique.',
    fase: 3,
  },
  {
    path: '/vendas',
    label: 'Vendas',
    icon: ShoppingCart,
    grupo: 'operacao',
    permissao: 'vendas.incluir',
    resumo: 'Venda com itens, descontos, múltiplas formas de recebimento e NFC-e.',
    fase: 3,
    busca: ['pdv', 'nfce', 'cupom'],
  },
  {
    path: '/ordens-servico',
    label: 'Ordens de Serviço',
    icon: ClipboardList,
    grupo: 'operacao',
    permissao: 'ordens_servico.consultar',
    resumo: 'Pipeline Kanban com etapas configuráveis e SLA em dias úteis por etapa.',
    fase: 3,
    busca: ['os', 'kanban', 'laboratório', 'montagem', 'entrega'],
  },
  {
    path: '/trocas',
    label: 'Trocas',
    icon: RefreshCw,
    grupo: 'operacao',
    permissao: 'trocas.consultar',
    resumo: 'Devolução e troca com crédito rastreado até o uso.',
    fase: 4,
  },

  // ─── Estoque ─────────────────────────────────────────────────────────────
  {
    path: '/produtos',
    label: 'Produtos',
    icon: Package,
    grupo: 'estoque',
    permissao: 'produtos.acessar',
    resumo: 'Cadastro único na rede, com preço e estoque por filial e matriz fiscal.',
    fase: 2,
    busca: ['armação', 'lente', 'sku', 'ean', 'grife'],
  },
  {
    path: '/tabelas-lentes',
    label: 'Tabelas de Lentes',
    icon: Table2,
    grupo: 'estoque',
    permissao: 'tabelas_lentes.acessar',
    resumo: 'Tabelas de preço por laboratório, com conferência e atualização em lote.',
    fase: 2,
  },
  {
    path: '/estoque',
    label: 'Estoque',
    icon: Boxes,
    grupo: 'estoque',
    permissao: 'estoque.acessar',
    resumo: 'Entrada por XML de NF-e, transferência entre filiais, inventário e etiquetas.',
    fase: 2,
    busca: ['nfe', 'xml', 'inventário', 'transferência', 'etiqueta'],
  },

  // ─── Financeiro ──────────────────────────────────────────────────────────
  {
    path: '/caixa',
    label: 'Caixa',
    icon: Wallet,
    grupo: 'financeiro',
    permissao: 'caixa.consultar',
    resumo: 'Abertura, fechamento, suprimento, sangria e transferência entre contas.',
    fase: 4,
  },
  {
    path: '/contas-pagar',
    label: 'Contas a Pagar',
    icon: TrendingDown,
    grupo: 'financeiro',
    permissao: 'contas_pagar.consultar',
    resumo: 'Títulos a pagar com baixa em lote e competência.',
    fase: 4,
  },
  {
    path: '/contas-receber',
    label: 'Contas a Receber',
    icon: TrendingUp,
    grupo: 'financeiro',
    permissao: 'contas_receber.consultar',
    resumo: 'Recebíveis e crediário, segmentáveis pelos mesmos filtros do CRM.',
    fase: 4,
    busca: ['crediário', 'cobrança', 'inadimplência'],
  },
  {
    path: '/cartao',
    label: 'Cartão',
    icon: CreditCard,
    grupo: 'financeiro',
    permissao: 'cartao.consultar',
    resumo: 'Conciliação com a adquirente, taxa por lançamento e antecipações.',
    fase: 4,
  },
  {
    path: '/cheques',
    label: 'Cheques',
    icon: Receipt,
    grupo: 'financeiro',
    permissao: 'cheques.consultar',
    resumo: 'Máquina de status: depositado, compensado, devolvido.',
    fase: 4,
  },
  {
    path: '/boletos',
    label: 'Boletos',
    icon: Barcode,
    grupo: 'financeiro',
    permissao: 'boletos.consultar',
    resumo: 'Emissão e baixa de boleto, com histórico de taxas.',
    fase: 4,
  },
  {
    path: '/cobranca-bancaria',
    label: 'Cobrança Bancária',
    icon: Landmark,
    grupo: 'financeiro',
    permissao: 'cobranca_bancaria.consultar',
    resumo: 'Remessa e retorno em CNAB para boleto registrado.',
    fase: 4,
    busca: ['cnab', 'remessa', 'retorno', 'febraban'],
  },
  {
    path: '/resultado',
    label: 'Resultado e Fluxo',
    icon: PiggyBank,
    grupo: 'financeiro',
    permissao: 'financeiro.dre',
    resumo: 'DRE pelo plano de contas e fluxo de caixa previsto vs. realizado por semana.',
    fase: 4,
    busca: ['dre', 'fluxo de caixa', 'plano de contas'],
  },

  // ─── Inteligência ────────────────────────────────────────────────────────
  {
    path: '/inteligencia',
    label: 'Funil e Oportunidade',
    icon: Sparkles,
    grupo: 'inteligencia',
    permissao: 'inteligencia.acessar',
    resumo:
      'Funil e oportunidade em aberto por fórmula explícita — cada termo auditável na tela.',
    fase: 8,
    busca: ['funil', 'oportunidade', 'recuperação'],
  },
  {
    path: '/atribuicao',
    label: 'Atribuição',
    icon: BarChart3,
    grupo: 'inteligencia',
    permissao: 'inteligencia.ver_atribuicao',
    resumo:
      'Resultado medido contra grupo de controle: quanto foi recuperado e quanto disso é incremental.',
    fase: 8,
    busca: ['grupo de controle', 'holdout', 'incremental', 'lift'],
  },
  {
    path: '/marketing',
    label: 'Marketing',
    icon: Megaphone,
    grupo: 'inteligencia',
    permissao: 'marketing.acessar',
    resumo: 'Campanhas, modelos de mensagem e réguas automáticas por gatilho de negócio.',
    fase: 6,
    busca: ['campanha', 'whatsapp', 'sms', 'cashback', 'indicação'],
  },
  {
    path: '/clube',
    label: 'Clube',
    icon: BadgePercent,
    grupo: 'inteligencia',
    permissao: 'clube.acessar',
    resumo: 'Plano de fidelidade com custo modelado por benefício e cobrança recorrente.',
    fase: 9,
  },

  // ─── Gestão ──────────────────────────────────────────────────────────────
  {
    path: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    grupo: 'gestao',
    permissao: 'relatorios.vendas',
    resumo: 'Os relatórios operacionais e financeiros, com agrupamento e exportação.',
    fase: 5,
  },
  {
    path: '/comissoes',
    label: 'Comissões',
    icon: Percent,
    grupo: 'gestao',
    permissao: 'comissoes.consultar_proprias',
    resumo: 'Parâmetros por colaborador e por equipe, apuração e detalhe por venda e O.S.',
    fase: 5,
  },
  {
    path: '/cadastros',
    label: 'Cadastros',
    icon: Settings2,
    grupo: 'gestao',
    permissao: 'cadastros.acessar',
    resumo: 'Tabelas auxiliares, fornecedores e laboratórios, funcionários, filiais e feriados.',
    fase: 1,
    busca: ['fornecedor', 'laboratório', 'grife', 'grupo', 'convênio', 'filial'],
  },

  // ─── Sistema ─────────────────────────────────────────────────────────────
  {
    path: '/usuarios',
    label: 'Usuários',
    icon: UserCog,
    grupo: 'sistema',
    permissao: 'usuarios.consultar',
    resumo: 'Convite de acesso, filiais por usuário e limite de desconto.',
    fase: 1,
    busca: ['convite', 'acesso', 'senha'],
  },
  {
    path: '/permissoes',
    label: 'Permissões',
    icon: ShieldCheck,
    grupo: 'sistema',
    permissao: 'permissoes.consultar',
    resumo: 'Modelos de permissão numa matriz de módulo × ação, com 268 chaves.',
    fase: 1,
    busca: ['perfil', 'cargo', 'rbac', 'modelo'],
  },
  {
    path: '/auditoria',
    label: 'Auditoria',
    icon: ScrollText,
    grupo: 'sistema',
    permissao: 'auditoria.consultar',
    resumo: 'Quem alterou o quê, quando, e de qual valor para qual.',
    fase: 1,
  },
  {
    path: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    grupo: 'sistema',
    permissao: 'configuracoes.acessar',
    resumo: 'Dados da rede, políticas de operação, integrações e plano.',
    fase: 1,
    busca: ['empresa', 'rede', 'integração', 'plano', 'assinatura'],
  },
];

/** Busca um módulo pelo caminho. */
export function moduloPorPath(path: string): ModuloDef | undefined {
  return MODULOS.find((m) => m.path === path);
}
