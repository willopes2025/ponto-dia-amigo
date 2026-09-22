/**
 * GERADO AUTOMATICAMENTE — não edite.
 * Fonte: scripts/permissions-source.mjs · Regenere com: npm run gen:permissions
 *
 * Espelho em TypeScript do catálogo semeado no banco. Ter o tipo `PermissionKey`
 * aqui é o que faz `can('vendas.cancelar')` errar em tempo de compilação quando a
 * chave não existe, em vez de silenciosamente retornar false em produção.
 */

export type PermissionKey =
  | 'dashboard.acessar'
  | 'dashboard.card_vendas_mes'
  | 'dashboard.card_vendas_12m'
  | 'dashboard.card_comparativo_ano'
  | 'dashboard.card_contas_pagar'
  | 'dashboard.card_contas_receber'
  | 'dashboard.card_aniversariantes'
  | 'dashboard.card_receitas_vencidas'
  | 'dashboard.card_os_entregar'
  | 'dashboard.card_validade_produtos'
  | 'dashboard.card_estoque_minimo'
  | 'dashboard.card_negativados'
  | 'dashboard.card_oportunidade_aberto'
  | 'clientes.acessar'
  | 'clientes.consultar'
  | 'clientes.incluir'
  | 'clientes.alterar'
  | 'clientes.alterar_nome'
  | 'clientes.excluir'
  | 'clientes.importar'
  | 'clientes.exportar'
  | 'clientes.exportar_receitas'
  | 'clientes.negativar'
  | 'clientes.ver_credito'
  | 'clientes.analise_credito'
  | 'clientes.gerenciar_nucleo_familiar'
  | 'receitas.consultar'
  | 'receitas.incluir'
  | 'receitas.alterar'
  | 'receitas.excluir'
  | 'receitas.imprimir'
  | 'receitas.livro_receitas'
  | 'produtos.acessar'
  | 'produtos.consultar'
  | 'produtos.incluir'
  | 'produtos.alterar'
  | 'produtos.excluir'
  | 'produtos.ver_custo'
  | 'produtos.alterar_custo'
  | 'produtos.alterar_preco'
  | 'produtos.alterar_estoque'
  | 'produtos.alterar_validade'
  | 'produtos.alterar_fiscal'
  | 'produtos.importar'
  | 'produtos.exportar'
  | 'produtos.gerenciar_vitrine'
  | 'tabelas_lentes.acessar'
  | 'tabelas_lentes.consultar'
  | 'tabelas_lentes.salvar_conferencia'
  | 'tabelas_lentes.concluir_conferencia'
  | 'tabelas_lentes.ver_custo_fornecedor'
  | 'tabelas_lentes.excluir_em_conferencia'
  | 'orcamentos.consultar'
  | 'orcamentos.consultar_proprios'
  | 'orcamentos.incluir'
  | 'orcamentos.alterar'
  | 'orcamentos.excluir'
  | 'orcamentos.imprimir'
  | 'orcamentos.converter_venda'
  | 'orcamentos.prorrogar_validade'
  | 'vendas.consultar'
  | 'vendas.consultar_proprias'
  | 'vendas.incluir'
  | 'vendas.alterar'
  | 'vendas.cancelar'
  | 'vendas.excluir'
  | 'vendas.duplicar'
  | 'vendas.imprimir'
  | 'vendas.ver_paineis'
  | 'vendas.ver_margem'
  | 'vendas.data_retroativa'
  | 'vendas.alterar_valor_unitario'
  | 'vendas.autorizar_desconto_distancia'
  | 'vendas.alterar_funcionario'
  | 'vendas.alterar_convenio'
  | 'vendas.alterar_origem'
  | 'vendas.gerenciar_garantia'
  | 'vendas.emitir_nfce'
  | 'ordens_servico.consultar'
  | 'ordens_servico.consultar_proprias'
  | 'ordens_servico.incluir'
  | 'ordens_servico.alterar'
  | 'ordens_servico.alterar_proprias'
  | 'ordens_servico.alterar_somente_abertas'
  | 'ordens_servico.cancelar'
  | 'ordens_servico.confirmar_perda'
  | 'ordens_servico.mover_etapa'
  | 'ordens_servico.entregar'
  | 'ordens_servico.retornar_entregue'
  | 'ordens_servico.alterar_funcionario'
  | 'ordens_servico.imprimir'
  | 'ordens_servico.ver_paineis'
  | 'ordens_servico.data_retroativa'
  | 'ordens_servico.gerenciar_etapas'
  | 'trocas.consultar'
  | 'trocas.iniciar'
  | 'trocas.cancelar'
  | 'trocas.utilizar_credito'
  | 'trocas.utilizar_credito_acima_limite'
  | 'trocas.devolver_credito'
  | 'trocas.inutilizar_credito'
  | 'estoque.acessar'
  | 'estoque.posicao_atual'
  | 'estoque.posicao_todas_filiais'
  | 'estoque.entrada_nf'
  | 'estoque.entrada_manual'
  | 'estoque.transferir'
  | 'estoque.confirmar_transferencia'
  | 'estoque.inventario'
  | 'estoque.acerto'
  | 'estoque.etiquetas'
  | 'estoque.historico'
  | 'estoque.zerar'
  | 'estoque.exportar'
  | 'caixa.consultar'
  | 'caixa.abrir'
  | 'caixa.fechar'
  | 'caixa.reabrir'
  | 'caixa.pagar_despesa'
  | 'caixa.transferir'
  | 'caixa.suprimento'
  | 'caixa.sangria'
  | 'caixa.excluir_lancamento'
  | 'caixa.alterar_saldo_inicial'
  | 'contas_pagar.consultar'
  | 'contas_pagar.incluir'
  | 'contas_pagar.alterar'
  | 'contas_pagar.baixar'
  | 'contas_pagar.estornar'
  | 'contas_pagar.cancelar'
  | 'contas_pagar.imprimir'
  | 'contas_pagar.data_retroativa'
  | 'contas_receber.consultar'
  | 'contas_receber.incluir'
  | 'contas_receber.alterar'
  | 'contas_receber.receber'
  | 'contas_receber.estornar'
  | 'contas_receber.cancelar'
  | 'contas_receber.imprimir'
  | 'contas_receber.data_retroativa'
  | 'contas_receber.alterar_situacao'
  | 'contas_receber.renegociar'
  | 'contas_receber.autorizar_desconto_distancia'
  | 'contas_receber.baixar_outras_filiais'
  | 'crediario.consultar'
  | 'crediario.conceder'
  | 'crediario.alterar_limite'
  | 'crediario.baixar'
  | 'crediario.ver_score'
  | 'cartao.consultar'
  | 'cartao.conciliar'
  | 'cartao.gerenciar_antecipacoes'
  | 'cartao.alterar_taxa'
  | 'cartao.ver_liquido'
  | 'cheques.consultar'
  | 'cheques.incluir'
  | 'cheques.alterar_status'
  | 'cheques.devolver'
  | 'cheques.imprimir'
  | 'boletos.consultar'
  | 'boletos.emitir'
  | 'boletos.cancelar'
  | 'boletos.baixar'
  | 'boletos.ver_taxas'
  | 'cobranca_bancaria.consultar'
  | 'cobranca_bancaria.gerar_remessa'
  | 'cobranca_bancaria.processar_retorno'
  | 'cobranca_bancaria.configurar'
  | 'financeiro.fluxo_financeiro'
  | 'financeiro.dre'
  | 'financeiro.configurar_dre'
  | 'financeiro.plano_contas'
  | 'financeiro.contas_bancarias'
  | 'financeiro.documentos_fiscais'
  | 'financeiro.pedidos_fornecedor'
  | 'financeiro.pagamento_pedidos'
  | 'financeiro.extrato'
  | 'comissoes.consultar_proprias'
  | 'comissoes.consultar_todas'
  | 'comissoes.configurar_parametros'
  | 'comissoes.configurar_equipes'
  | 'comissoes.configurar_parametros_equipe'
  | 'comissoes.apurar'
  | 'comissoes.pagar'
  | 'marketing.acessar'
  | 'marketing.gerenciar_campanhas'
  | 'marketing.disparar_campanha'
  | 'marketing.consultar_envios'
  | 'marketing.gerenciar_templates'
  | 'marketing.gerenciar_eventos'
  | 'marketing.gerenciar_promocoes'
  | 'marketing.gerenciar_cashback'
  | 'marketing.gerenciar_indicacoes'
  | 'marketing.gerenciar_vitrine'
  | 'relatorios.vendas'
  | 'relatorios.produtos_vendidos'
  | 'relatorios.produtos_sem_giro'
  | 'relatorios.receitas_vencidas'
  | 'relatorios.aniversarios'
  | 'relatorios.extrato_financeiro'
  | 'relatorios.posicao_estoque'
  | 'relatorios.caixas'
  | 'relatorios.contas_pagar'
  | 'relatorios.contas_receber'
  | 'relatorios.livro_receitas'
  | 'relatorios.comissoes'
  | 'relatorios.comissoes_equipe'
  | 'relatorios.validade_produtos'
  | 'relatorios.exportar_excel'
  | 'atendimento.acessar'
  | 'atendimento.registrar'
  | 'atendimento.alterar'
  | 'atendimento.excluir'
  | 'atendimento.registrar_objecao'
  | 'atendimento.registrar_experimentacao'
  | 'atendimento.ver_contra_argumentos'
  | 'atendimento.gerenciar_contra_argumentos'
  | 'atendimento.ver_kpis'
  | 'inteligencia.acessar'
  | 'inteligencia.funil'
  | 'inteligencia.oportunidade_aberto'
  | 'inteligencia.filas_trabalho'
  | 'inteligencia.trabalhar_fila'
  | 'inteligencia.configurar_filas'
  | 'inteligencia.configurar_holdout'
  | 'inteligencia.ver_atribuicao'
  | 'inteligencia.segundo_par'
  | 'inteligencia.nbo'
  | 'inteligencia.crm_familiar'
  | 'inteligencia.painel_dono'
  | 'inteligencia.planograma'
  | 'inteligencia.auditar_vitrine'
  | 'cadastros.acessar'
  | 'cadastros.tabelas_auxiliares'
  | 'cadastros.fornecedores'
  | 'cadastros.funcionarios'
  | 'cadastros.equipes'
  | 'cadastros.filiais'
  | 'cadastros.medicos'
  | 'cadastros.feriados'
  | 'cadastros.integracoes'
  | 'cadastros.aliquota_automatica'
  | 'usuarios.consultar'
  | 'usuarios.incluir'
  | 'usuarios.alterar'
  | 'usuarios.excluir'
  | 'usuarios.resetar_senha'
  | 'permissoes.consultar'
  | 'permissoes.gerenciar_modelos'
  | 'permissoes.atribuir_modelos'
  | 'permissoes.ver_catalogo'
  | 'clube.acessar'
  | 'clube.gerenciar_planos'
  | 'clube.gerenciar_beneficios'
  | 'clube.gerenciar_membros'
  | 'clube.gerenciar_cobrancas'
  | 'clube.ver_custos'
  | 'assinaturas.consultar'
  | 'assinaturas.ver_plano'
  | 'assinaturas.ativar_addon'
  | 'assinaturas.cancelar_addon'
  | 'configuracoes.acessar'
  | 'configuracoes.dados_empresa'
  | 'configuracoes.politicas'
  | 'configuracoes.seguranca'
  | 'configuracoes.integracoes'
  | 'auditoria.consultar'
  | 'auditoria.exportar';

export interface PermissionAction {
  key: PermissionKey;
  acao: string;
  label: string;
  descricao: string | null;
  /** Checada também na leitura (no RLS), não só na escrita. */
  sensivel: boolean;
}

export interface PermissionModule {
  key: string;
  label: string;
  /** Nome do ícone em lucide-react. */
  icon: string;
  acoes: PermissionAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    "key": "dashboard",
    "label": "Painel de Informações",
    "icon": "LayoutDashboard",
    "acoes": [
      {
        "key": "dashboard.acessar",
        "acao": "acessar",
        "label": "Acessar o painel",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_vendas_mes",
        "acao": "card_vendas_mes",
        "label": "Card: vendas do mês",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_vendas_12m",
        "acao": "card_vendas_12m",
        "label": "Card: últimos 12 meses",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_comparativo_ano",
        "acao": "card_comparativo_ano",
        "label": "Card: mesmo mês do ano anterior",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_contas_pagar",
        "acao": "card_contas_pagar",
        "label": "Card: contas a pagar em aberto",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "dashboard.card_contas_receber",
        "acao": "card_contas_receber",
        "label": "Card: contas a receber em aberto",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "dashboard.card_aniversariantes",
        "acao": "card_aniversariantes",
        "label": "Card: aniversariantes da semana",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_receitas_vencidas",
        "acao": "card_receitas_vencidas",
        "label": "Card: receitas vencidas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_os_entregar",
        "acao": "card_os_entregar",
        "label": "Card: O.S. a entregar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_validade_produtos",
        "acao": "card_validade_produtos",
        "label": "Card: validade de produtos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_estoque_minimo",
        "acao": "card_estoque_minimo",
        "label": "Card: produtos abaixo do estoque mínimo",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_negativados",
        "acao": "card_negativados",
        "label": "Card: clientes negativados",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "dashboard.card_oportunidade_aberto",
        "acao": "card_oportunidade_aberto",
        "label": "Card: oportunidade em aberto",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "clientes",
    "label": "Clientes",
    "icon": "Users",
    "acoes": [
      {
        "key": "clientes.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Clientes",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.consultar",
        "acao": "consultar",
        "label": "Consultar clientes",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.incluir",
        "acao": "incluir",
        "label": "Incluir cliente",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.alterar",
        "acao": "alterar",
        "label": "Alterar cliente",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.alterar_nome",
        "acao": "alterar_nome",
        "label": "Alterar o nome de um cliente já cadastrado",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.excluir",
        "acao": "excluir",
        "label": "Excluir cliente",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.importar",
        "acao": "importar",
        "label": "Importar clientes em massa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.exportar",
        "acao": "exportar",
        "label": "Exportar clientes",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.exportar_receitas",
        "acao": "exportar_receitas",
        "label": "Exportar receitas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.negativar",
        "acao": "negativar",
        "label": "Negativar e remover negativação",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clientes.ver_credito",
        "acao": "ver_credito",
        "label": "Ver situação de crédito e parcelas em atraso",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "clientes.analise_credito",
        "acao": "analise_credito",
        "label": "Efetuar análise de crédito",
        "descricao": "Exige consentimento do titular; a decisão é sempre revisável por humano.",
        "sensivel": true
      },
      {
        "key": "clientes.gerenciar_nucleo_familiar",
        "acao": "gerenciar_nucleo_familiar",
        "label": "Gerenciar núcleo familiar",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "receitas",
    "label": "Receitas (prescrições)",
    "icon": "Eye",
    "acoes": [
      {
        "key": "receitas.consultar",
        "acao": "consultar",
        "label": "Consultar receitas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "receitas.incluir",
        "acao": "incluir",
        "label": "Incluir receita",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "receitas.alterar",
        "acao": "alterar",
        "label": "Alterar receita",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "receitas.excluir",
        "acao": "excluir",
        "label": "Excluir receita",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "receitas.imprimir",
        "acao": "imprimir",
        "label": "Imprimir receita",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "receitas.livro_receitas",
        "acao": "livro_receitas",
        "label": "Acessar o Livro de Receitas",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "produtos",
    "label": "Produtos",
    "icon": "Package",
    "acoes": [
      {
        "key": "produtos.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Produtos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.consultar",
        "acao": "consultar",
        "label": "Consultar produtos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.incluir",
        "acao": "incluir",
        "label": "Incluir produto",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.alterar",
        "acao": "alterar",
        "label": "Alterar dados do produto",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.excluir",
        "acao": "excluir",
        "label": "Excluir ou arquivar produto",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.ver_custo",
        "acao": "ver_custo",
        "label": "Ver preço de custo",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "produtos.alterar_custo",
        "acao": "alterar_custo",
        "label": "Alterar preço de custo",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "produtos.alterar_preco",
        "acao": "alterar_preco",
        "label": "Alterar preço de venda",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.alterar_estoque",
        "acao": "alterar_estoque",
        "label": "Alterar quantidade em estoque",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.alterar_validade",
        "acao": "alterar_validade",
        "label": "Alterar validade",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.alterar_fiscal",
        "acao": "alterar_fiscal",
        "label": "Alterar configuração fiscal (NCM, CEST, tributação)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.importar",
        "acao": "importar",
        "label": "Importar produtos em massa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.exportar",
        "acao": "exportar",
        "label": "Exportar produtos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "produtos.gerenciar_vitrine",
        "acao": "gerenciar_vitrine",
        "label": "Incluir e remover da vitrine online",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "tabelas_lentes",
    "label": "Tabelas de Lentes",
    "icon": "Table2",
    "acoes": [
      {
        "key": "tabelas_lentes.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Tabelas de Lentes",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "tabelas_lentes.consultar",
        "acao": "consultar",
        "label": "Consultar tabelas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "tabelas_lentes.salvar_conferencia",
        "acao": "salvar_conferencia",
        "label": "Salvar conferência de produtos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "tabelas_lentes.concluir_conferencia",
        "acao": "concluir_conferencia",
        "label": "Concluir conferência",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "tabelas_lentes.ver_custo_fornecedor",
        "acao": "ver_custo_fornecedor",
        "label": "Ver preço de custo do fornecedor",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "tabelas_lentes.excluir_em_conferencia",
        "acao": "excluir_em_conferencia",
        "label": "Excluir tabela em conferência",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "orcamentos",
    "label": "Orçamentos",
    "icon": "FileText",
    "acoes": [
      {
        "key": "orcamentos.consultar",
        "acao": "consultar",
        "label": "Consultar todos os orçamentos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.consultar_proprios",
        "acao": "consultar_proprios",
        "label": "Consultar somente os próprios orçamentos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.incluir",
        "acao": "incluir",
        "label": "Incluir orçamento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.alterar",
        "acao": "alterar",
        "label": "Alterar orçamento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.excluir",
        "acao": "excluir",
        "label": "Excluir orçamento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.imprimir",
        "acao": "imprimir",
        "label": "Imprimir orçamento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.converter_venda",
        "acao": "converter_venda",
        "label": "Converter orçamento em venda",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "orcamentos.prorrogar_validade",
        "acao": "prorrogar_validade",
        "label": "Prorrogar a validade de um orçamento",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "vendas",
    "label": "Vendas",
    "icon": "ShoppingCart",
    "acoes": [
      {
        "key": "vendas.consultar",
        "acao": "consultar",
        "label": "Consultar todas as vendas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.consultar_proprias",
        "acao": "consultar_proprias",
        "label": "Consultar somente as próprias vendas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.incluir",
        "acao": "incluir",
        "label": "Incluir venda",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.alterar",
        "acao": "alterar",
        "label": "Alterar venda",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.cancelar",
        "acao": "cancelar",
        "label": "Cancelar venda",
        "descricao": "Exige motivo obrigatório e fica na trilha de auditoria.",
        "sensivel": false
      },
      {
        "key": "vendas.excluir",
        "acao": "excluir",
        "label": "Excluir venda",
        "descricao": "Exige motivo obrigatório e fica na trilha de auditoria.",
        "sensivel": false
      },
      {
        "key": "vendas.duplicar",
        "acao": "duplicar",
        "label": "Duplicar venda",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.imprimir",
        "acao": "imprimir",
        "label": "Imprimir venda e relatórios",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.ver_paineis",
        "acao": "ver_paineis",
        "label": "Ver painéis de resumo",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.ver_margem",
        "acao": "ver_margem",
        "label": "Ver margem de lucro",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "vendas.data_retroativa",
        "acao": "data_retroativa",
        "label": "Lançar com data retroativa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.alterar_valor_unitario",
        "acao": "alterar_valor_unitario",
        "label": "Alterar valor unitário do item",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.autorizar_desconto_distancia",
        "acao": "autorizar_desconto_distancia",
        "label": "Autorizar desconto à distância",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.alterar_funcionario",
        "acao": "alterar_funcionario",
        "label": "Alterar o funcionário vinculado",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.alterar_convenio",
        "acao": "alterar_convenio",
        "label": "Alterar o convênio vinculado",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.alterar_origem",
        "acao": "alterar_origem",
        "label": "Alterar a origem do cliente vinculada",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.gerenciar_garantia",
        "acao": "gerenciar_garantia",
        "label": "Gerenciar validade do termo de garantia",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "vendas.emitir_nfce",
        "acao": "emitir_nfce",
        "label": "Emitir NFC-e",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "ordens_servico",
    "label": "Ordens de Serviço",
    "icon": "ClipboardList",
    "acoes": [
      {
        "key": "ordens_servico.consultar",
        "acao": "consultar",
        "label": "Consultar todas as O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.consultar_proprias",
        "acao": "consultar_proprias",
        "label": "Consultar somente as próprias O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.incluir",
        "acao": "incluir",
        "label": "Incluir O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.alterar",
        "acao": "alterar",
        "label": "Alterar qualquer O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.alterar_proprias",
        "acao": "alterar_proprias",
        "label": "Alterar somente as próprias O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.alterar_somente_abertas",
        "acao": "alterar_somente_abertas",
        "label": "Alterar somente O.S. abertas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.cancelar",
        "acao": "cancelar",
        "label": "Cancelar O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.confirmar_perda",
        "acao": "confirmar_perda",
        "label": "Confirmar O.S. em perda",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.mover_etapa",
        "acao": "mover_etapa",
        "label": "Mover O.S. entre etapas do Kanban",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.entregar",
        "acao": "entregar",
        "label": "Entregar O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.retornar_entregue",
        "acao": "retornar_entregue",
        "label": "Retornar O.S. entregue para não entregue",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.alterar_funcionario",
        "acao": "alterar_funcionario",
        "label": "Alterar o funcionário vinculado",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.imprimir",
        "acao": "imprimir",
        "label": "Imprimir O.S.",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.ver_paineis",
        "acao": "ver_paineis",
        "label": "Ver painéis de resumo",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.data_retroativa",
        "acao": "data_retroativa",
        "label": "Abrir ou lançar com data retroativa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "ordens_servico.gerenciar_etapas",
        "acao": "gerenciar_etapas",
        "label": "Configurar tipos e etapas de O.S. (SLA por etapa)",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "trocas",
    "label": "Trocas",
    "icon": "RefreshCw",
    "acoes": [
      {
        "key": "trocas.consultar",
        "acao": "consultar",
        "label": "Consultar trocas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "trocas.iniciar",
        "acao": "iniciar",
        "label": "Iniciar troca",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "trocas.cancelar",
        "acao": "cancelar",
        "label": "Cancelar troca",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "trocas.utilizar_credito",
        "acao": "utilizar_credito",
        "label": "Utilizar crédito de troca dentro do limite",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "trocas.utilizar_credito_acima_limite",
        "acao": "utilizar_credito_acima_limite",
        "label": "Utilizar crédito de troca acima do limite",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "trocas.devolver_credito",
        "acao": "devolver_credito",
        "label": "Devolver crédito de troca",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "trocas.inutilizar_credito",
        "acao": "inutilizar_credito",
        "label": "Inutilizar crédito de troca",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "estoque",
    "label": "Estoque",
    "icon": "Boxes",
    "acoes": [
      {
        "key": "estoque.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Estoque",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.posicao_atual",
        "acao": "posicao_atual",
        "label": "Consultar posição atual",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.posicao_todas_filiais",
        "acao": "posicao_todas_filiais",
        "label": "Consultar a posição de todas as filiais",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.entrada_nf",
        "acao": "entrada_nf",
        "label": "Dar entrada por XML de NF-e",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.entrada_manual",
        "acao": "entrada_manual",
        "label": "Dar entrada manual",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.transferir",
        "acao": "transferir",
        "label": "Solicitar transferência entre filiais",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.confirmar_transferencia",
        "acao": "confirmar_transferencia",
        "label": "Confirmar recebimento de transferência",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.inventario",
        "acao": "inventario",
        "label": "Realizar inventário",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.acerto",
        "acao": "acerto",
        "label": "Fazer acerto de estoque",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.etiquetas",
        "acao": "etiquetas",
        "label": "Montar e imprimir etiquetas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.historico",
        "acao": "historico",
        "label": "Consultar histórico de movimentação",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.zerar",
        "acao": "zerar",
        "label": "Zerar estoque",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "estoque.exportar",
        "acao": "exportar",
        "label": "Exportar posição de estoque",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "caixa",
    "label": "Caixa",
    "icon": "Wallet",
    "acoes": [
      {
        "key": "caixa.consultar",
        "acao": "consultar",
        "label": "Consultar posição atual do caixa",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "caixa.abrir",
        "acao": "abrir",
        "label": "Abrir caixa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.fechar",
        "acao": "fechar",
        "label": "Fechar caixa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.reabrir",
        "acao": "reabrir",
        "label": "Reabrir caixa fechado",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.pagar_despesa",
        "acao": "pagar_despesa",
        "label": "Pagar despesas pelo caixa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.transferir",
        "acao": "transferir",
        "label": "Transferir entre contas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.suprimento",
        "acao": "suprimento",
        "label": "Lançar suprimento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.sangria",
        "acao": "sangria",
        "label": "Lançar sangria",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.excluir_lancamento",
        "acao": "excluir_lancamento",
        "label": "Apagar lançamentos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "caixa.alterar_saldo_inicial",
        "acao": "alterar_saldo_inicial",
        "label": "Alterar saldo inicial",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "contas_pagar",
    "label": "Contas a Pagar",
    "icon": "TrendingDown",
    "acoes": [
      {
        "key": "contas_pagar.consultar",
        "acao": "consultar",
        "label": "Consultar contas a pagar",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "contas_pagar.incluir",
        "acao": "incluir",
        "label": "Incluir conta a pagar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_pagar.alterar",
        "acao": "alterar",
        "label": "Alterar conta a pagar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_pagar.baixar",
        "acao": "baixar",
        "label": "Baixar conta a pagar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_pagar.estornar",
        "acao": "estornar",
        "label": "Estornar baixa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_pagar.cancelar",
        "acao": "cancelar",
        "label": "Cancelar conta a pagar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_pagar.imprimir",
        "acao": "imprimir",
        "label": "Imprimir",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_pagar.data_retroativa",
        "acao": "data_retroativa",
        "label": "Lançar ou baixar com data retroativa",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "contas_receber",
    "label": "Contas a Receber",
    "icon": "TrendingUp",
    "acoes": [
      {
        "key": "contas_receber.consultar",
        "acao": "consultar",
        "label": "Consultar contas a receber",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "contas_receber.incluir",
        "acao": "incluir",
        "label": "Incluir conta a receber",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.alterar",
        "acao": "alterar",
        "label": "Alterar conta a receber",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.receber",
        "acao": "receber",
        "label": "Receber / baixar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.estornar",
        "acao": "estornar",
        "label": "Estornar recebimento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.cancelar",
        "acao": "cancelar",
        "label": "Cancelar conta a receber",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.imprimir",
        "acao": "imprimir",
        "label": "Imprimir",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.data_retroativa",
        "acao": "data_retroativa",
        "label": "Lançar ou receber com data retroativa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.alterar_situacao",
        "acao": "alterar_situacao",
        "label": "Alterar situação",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.renegociar",
        "acao": "renegociar",
        "label": "Renegociar dívida",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.autorizar_desconto_distancia",
        "acao": "autorizar_desconto_distancia",
        "label": "Autorizar desconto à distância",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "contas_receber.baixar_outras_filiais",
        "acao": "baixar_outras_filiais",
        "label": "Baixar títulos de outras filiais da rede",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "crediario",
    "label": "Crediário",
    "icon": "CreditCard",
    "acoes": [
      {
        "key": "crediario.consultar",
        "acao": "consultar",
        "label": "Consultar crediários",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "crediario.conceder",
        "acao": "conceder",
        "label": "Conceder crediário",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "crediario.alterar_limite",
        "acao": "alterar_limite",
        "label": "Alterar limite do cliente",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "crediario.baixar",
        "acao": "baixar",
        "label": "Baixar parcela de crediário",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "crediario.ver_score",
        "acao": "ver_score",
        "label": "Ver score e histórico de análise de crédito",
        "descricao": null,
        "sensivel": true
      }
    ]
  },
  {
    "key": "cartao",
    "label": "Recebimentos Cartão",
    "icon": "CreditCard",
    "acoes": [
      {
        "key": "cartao.consultar",
        "acao": "consultar",
        "label": "Consultar recebimentos de cartão",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "cartao.conciliar",
        "acao": "conciliar",
        "label": "Conciliar com a adquirente",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cartao.gerenciar_antecipacoes",
        "acao": "gerenciar_antecipacoes",
        "label": "Gerenciar antecipações",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cartao.alterar_taxa",
        "acao": "alterar_taxa",
        "label": "Alterar taxa",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cartao.ver_liquido",
        "acao": "ver_liquido",
        "label": "Ver valor líquido e taxa descontada",
        "descricao": null,
        "sensivel": true
      }
    ]
  },
  {
    "key": "cheques",
    "label": "Cheques",
    "icon": "Receipt",
    "acoes": [
      {
        "key": "cheques.consultar",
        "acao": "consultar",
        "label": "Consultar cheques",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "cheques.incluir",
        "acao": "incluir",
        "label": "Incluir cheque",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cheques.alterar_status",
        "acao": "alterar_status",
        "label": "Alterar status (depositado, compensado, devolvido)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cheques.devolver",
        "acao": "devolver",
        "label": "Registrar devolução",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cheques.imprimir",
        "acao": "imprimir",
        "label": "Imprimir",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "boletos",
    "label": "Boletos",
    "icon": "Barcode",
    "acoes": [
      {
        "key": "boletos.consultar",
        "acao": "consultar",
        "label": "Consultar boletos",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "boletos.emitir",
        "acao": "emitir",
        "label": "Emitir boleto",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "boletos.cancelar",
        "acao": "cancelar",
        "label": "Cancelar boleto",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "boletos.baixar",
        "acao": "baixar",
        "label": "Baixar boleto",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "boletos.ver_taxas",
        "acao": "ver_taxas",
        "label": "Ver taxas de emissão",
        "descricao": null,
        "sensivel": true
      }
    ]
  },
  {
    "key": "cobranca_bancaria",
    "label": "Cobrança Bancária",
    "icon": "Landmark",
    "acoes": [
      {
        "key": "cobranca_bancaria.consultar",
        "acao": "consultar",
        "label": "Consultar remessas e retornos",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "cobranca_bancaria.gerar_remessa",
        "acao": "gerar_remessa",
        "label": "Gerar arquivo de remessa (CNAB)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cobranca_bancaria.processar_retorno",
        "acao": "processar_retorno",
        "label": "Processar arquivo de retorno (CNAB)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cobranca_bancaria.configurar",
        "acao": "configurar",
        "label": "Configurar convênio de cobrança",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "financeiro",
    "label": "Financeiro",
    "icon": "PiggyBank",
    "acoes": [
      {
        "key": "financeiro.fluxo_financeiro",
        "acao": "fluxo_financeiro",
        "label": "Consultar fluxo financeiro (previsto e realizado)",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "financeiro.dre",
        "acao": "dre",
        "label": "Consultar Resultado (DRE)",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "financeiro.configurar_dre",
        "acao": "configurar_dre",
        "label": "Configurar o DRE",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "financeiro.plano_contas",
        "acao": "plano_contas",
        "label": "Gerenciar plano de contas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "financeiro.contas_bancarias",
        "acao": "contas_bancarias",
        "label": "Gerenciar contas bancárias e caixas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "financeiro.documentos_fiscais",
        "acao": "documentos_fiscais",
        "label": "Consultar documentos fiscais",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "financeiro.pedidos_fornecedor",
        "acao": "pedidos_fornecedor",
        "label": "Consultar pedidos faturados por fornecedor",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "financeiro.pagamento_pedidos",
        "acao": "pagamento_pedidos",
        "label": "Gerenciar pagamento de pedidos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "financeiro.extrato",
        "acao": "extrato",
        "label": "Consultar extrato financeiro",
        "descricao": null,
        "sensivel": true
      }
    ]
  },
  {
    "key": "comissoes",
    "label": "Gestão de Comissões",
    "icon": "Percent",
    "acoes": [
      {
        "key": "comissoes.consultar_proprias",
        "acao": "consultar_proprias",
        "label": "Consultar somente a própria comissão",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "comissoes.consultar_todas",
        "acao": "consultar_todas",
        "label": "Consultar a comissão de todos os funcionários",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "comissoes.configurar_parametros",
        "acao": "configurar_parametros",
        "label": "Configurar parâmetros de comissão",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "comissoes.configurar_equipes",
        "acao": "configurar_equipes",
        "label": "Configurar gerentes e equipes",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "comissoes.configurar_parametros_equipe",
        "acao": "configurar_parametros_equipe",
        "label": "Configurar comissão por gerente/equipe",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "comissoes.apurar",
        "acao": "apurar",
        "label": "Apurar comissões do período",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "comissoes.pagar",
        "acao": "pagar",
        "label": "Registrar pagamento de comissão",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "marketing",
    "label": "Marketing",
    "icon": "Megaphone",
    "acoes": [
      {
        "key": "marketing.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Marketing",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_campanhas",
        "acao": "gerenciar_campanhas",
        "label": "Gerenciar campanhas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.disparar_campanha",
        "acao": "disparar_campanha",
        "label": "Disparar campanha",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.consultar_envios",
        "acao": "consultar_envios",
        "label": "Consultar histórico de envios",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_templates",
        "acao": "gerenciar_templates",
        "label": "Gerenciar modelos de mensagem",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_eventos",
        "acao": "gerenciar_eventos",
        "label": "Gerenciar eventos automáticos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_promocoes",
        "acao": "gerenciar_promocoes",
        "label": "Gerenciar promoções",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_cashback",
        "acao": "gerenciar_cashback",
        "label": "Gerenciar cashback",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_indicacoes",
        "acao": "gerenciar_indicacoes",
        "label": "Gerenciar indicações",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "marketing.gerenciar_vitrine",
        "acao": "gerenciar_vitrine",
        "label": "Configurar a vitrine online",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "relatorios",
    "label": "Relatórios",
    "icon": "BarChart3",
    "acoes": [
      {
        "key": "relatorios.vendas",
        "acao": "vendas",
        "label": "Relatório de vendas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.produtos_vendidos",
        "acao": "produtos_vendidos",
        "label": "Relatório de produtos vendidos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.produtos_sem_giro",
        "acao": "produtos_sem_giro",
        "label": "Relatório de produtos sem giro",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.receitas_vencidas",
        "acao": "receitas_vencidas",
        "label": "Relatório de receitas vencidas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.aniversarios",
        "acao": "aniversarios",
        "label": "Relatório de aniversários",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.extrato_financeiro",
        "acao": "extrato_financeiro",
        "label": "Relatório de extrato financeiro",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "relatorios.posicao_estoque",
        "acao": "posicao_estoque",
        "label": "Relatório de posição atual do estoque",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.caixas",
        "acao": "caixas",
        "label": "Relatório de caixas",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "relatorios.contas_pagar",
        "acao": "contas_pagar",
        "label": "Relatório de contas a pagar",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "relatorios.contas_receber",
        "acao": "contas_receber",
        "label": "Relatório de contas a receber",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "relatorios.livro_receitas",
        "acao": "livro_receitas",
        "label": "Livro de receitas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.comissoes",
        "acao": "comissoes",
        "label": "Relatório de comissões",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "relatorios.comissoes_equipe",
        "acao": "comissoes_equipe",
        "label": "Relatório de comissões por gerente/equipe",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "relatorios.validade_produtos",
        "acao": "validade_produtos",
        "label": "Relatório de validade de produtos",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "relatorios.exportar_excel",
        "acao": "exportar_excel",
        "label": "Exportar relatórios para Excel",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "atendimento",
    "label": "Atendimento",
    "icon": "Handshake",
    "acoes": [
      {
        "key": "atendimento.acessar",
        "acao": "acessar",
        "label": "Acessar o registro de atendimento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.registrar",
        "acao": "registrar",
        "label": "Registrar atendimento (inclusive sem venda)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.alterar",
        "acao": "alterar",
        "label": "Alterar atendimento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.excluir",
        "acao": "excluir",
        "label": "Excluir atendimento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.registrar_objecao",
        "acao": "registrar_objecao",
        "label": "Registrar objeção",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.registrar_experimentacao",
        "acao": "registrar_experimentacao",
        "label": "Registrar experimentação de armação",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.ver_contra_argumentos",
        "acao": "ver_contra_argumentos",
        "label": "Ver a biblioteca de contra-argumento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.gerenciar_contra_argumentos",
        "acao": "gerenciar_contra_argumentos",
        "label": "Gerenciar a biblioteca de contra-argumento",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "atendimento.ver_kpis",
        "acao": "ver_kpis",
        "label": "Ver KPIs de atendimento e de experimentação → venda",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "inteligencia",
    "label": "Inteligência",
    "icon": "Sparkles",
    "acoes": [
      {
        "key": "inteligencia.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Inteligência",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.funil",
        "acao": "funil",
        "label": "Ver o funil",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.oportunidade_aberto",
        "acao": "oportunidade_aberto",
        "label": "Ver oportunidade em aberto",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "inteligencia.filas_trabalho",
        "acao": "filas_trabalho",
        "label": "Ver filas de trabalho",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.trabalhar_fila",
        "acao": "trabalhar_fila",
        "label": "Trabalhar uma fila (disparar ação)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.configurar_filas",
        "acao": "configurar_filas",
        "label": "Configurar filas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.configurar_holdout",
        "acao": "configurar_holdout",
        "label": "Configurar o grupo de controle",
        "descricao": "Mexer no holdout afeta a medição de incremental; a mudança é versionada e não reescreve histórico.",
        "sensivel": false
      },
      {
        "key": "inteligencia.ver_atribuicao",
        "acao": "ver_atribuicao",
        "label": "Ver a atribuição com grupo de controle",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "inteligencia.segundo_par",
        "acao": "segundo_par",
        "label": "Ver e trabalhar oportunidades de segundo par",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.nbo",
        "acao": "nbo",
        "label": "Usar a próxima melhor oferta",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.crm_familiar",
        "acao": "crm_familiar",
        "label": "Ver e trabalhar o CRM familiar",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.painel_dono",
        "acao": "painel_dono",
        "label": "Receber o painel proativo do dono",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "inteligencia.planograma",
        "acao": "planograma",
        "label": "Gerenciar planograma",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "inteligencia.auditar_vitrine",
        "acao": "auditar_vitrine",
        "label": "Auditar vitrine por foto",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "cadastros",
    "label": "Cadastros",
    "icon": "Settings2",
    "acoes": [
      {
        "key": "cadastros.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Cadastros",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.tabelas_auxiliares",
        "acao": "tabelas_auxiliares",
        "label": "Gerenciar tabelas auxiliares",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.fornecedores",
        "acao": "fornecedores",
        "label": "Gerenciar fornecedores e laboratórios",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.funcionarios",
        "acao": "funcionarios",
        "label": "Gerenciar funcionários",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.equipes",
        "acao": "equipes",
        "label": "Gerenciar equipes",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.filiais",
        "acao": "filiais",
        "label": "Gerenciar filiais",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.medicos",
        "acao": "medicos",
        "label": "Gerenciar médicos e optometristas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.feriados",
        "acao": "feriados",
        "label": "Gerenciar feriados",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.integracoes",
        "acao": "integracoes",
        "label": "Gerenciar integrações",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "cadastros.aliquota_automatica",
        "acao": "aliquota_automatica",
        "label": "Configurar alíquota automática",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "usuarios",
    "label": "Usuários",
    "icon": "UserCog",
    "acoes": [
      {
        "key": "usuarios.consultar",
        "acao": "consultar",
        "label": "Consultar usuários",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "usuarios.incluir",
        "acao": "incluir",
        "label": "Incluir usuário",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "usuarios.alterar",
        "acao": "alterar",
        "label": "Alterar usuário (inclusive limite de desconto e situação)",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "usuarios.excluir",
        "acao": "excluir",
        "label": "Excluir usuário",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "usuarios.resetar_senha",
        "acao": "resetar_senha",
        "label": "Resetar senha de usuário",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "permissoes",
    "label": "Permissões",
    "icon": "ShieldCheck",
    "acoes": [
      {
        "key": "permissoes.consultar",
        "acao": "consultar",
        "label": "Consultar modelos de permissão",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "permissoes.gerenciar_modelos",
        "acao": "gerenciar_modelos",
        "label": "Criar e editar modelos de permissão",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "permissoes.atribuir_modelos",
        "acao": "atribuir_modelos",
        "label": "Atribuir modelos a usuários",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "permissoes.ver_catalogo",
        "acao": "ver_catalogo",
        "label": "Ver o catálogo completo de permissões",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "clube",
    "label": "Clube de fidelidade",
    "icon": "BadgePercent",
    "acoes": [
      {
        "key": "clube.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Clube",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clube.gerenciar_planos",
        "acao": "gerenciar_planos",
        "label": "Gerenciar planos do clube",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clube.gerenciar_beneficios",
        "acao": "gerenciar_beneficios",
        "label": "Gerenciar benefícios e o custo de cada um",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clube.gerenciar_membros",
        "acao": "gerenciar_membros",
        "label": "Gerenciar membros",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clube.gerenciar_cobrancas",
        "acao": "gerenciar_cobrancas",
        "label": "Gerenciar cobrança recorrente",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "clube.ver_custos",
        "acao": "ver_custos",
        "label": "Ver o custo modelado por benefício",
        "descricao": null,
        "sensivel": true
      }
    ]
  },
  {
    "key": "assinaturas",
    "label": "Plano e assinaturas",
    "icon": "Receipt",
    "acoes": [
      {
        "key": "assinaturas.consultar",
        "acao": "consultar",
        "label": "Consultar assinaturas",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "assinaturas.ver_plano",
        "acao": "ver_plano",
        "label": "Ver o plano atual",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "assinaturas.ativar_addon",
        "acao": "ativar_addon",
        "label": "Ativar um add-on",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "assinaturas.cancelar_addon",
        "acao": "cancelar_addon",
        "label": "Cancelar um add-on",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "configuracoes",
    "label": "Configurações",
    "icon": "Settings",
    "acoes": [
      {
        "key": "configuracoes.acessar",
        "acao": "acessar",
        "label": "Acessar o menu Configurações",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "configuracoes.dados_empresa",
        "acao": "dados_empresa",
        "label": "Alterar dados da rede",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "configuracoes.politicas",
        "acao": "politicas",
        "label": "Alterar políticas de operação",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "configuracoes.seguranca",
        "acao": "seguranca",
        "label": "Alterar configurações de segurança",
        "descricao": null,
        "sensivel": false
      },
      {
        "key": "configuracoes.integracoes",
        "acao": "integracoes",
        "label": "Alterar credenciais de integração",
        "descricao": null,
        "sensivel": false
      }
    ]
  },
  {
    "key": "auditoria",
    "label": "Auditoria",
    "icon": "ScrollText",
    "acoes": [
      {
        "key": "auditoria.consultar",
        "acao": "consultar",
        "label": "Consultar a trilha de auditoria",
        "descricao": null,
        "sensivel": true
      },
      {
        "key": "auditoria.exportar",
        "acao": "exportar",
        "label": "Exportar a trilha de auditoria",
        "descricao": null,
        "sensivel": false
      }
    ]
  }
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_MODULES.flatMap((m) =>
  m.acoes.map((a) => a.key),
);

const LABELS = new Map<string, string>(
  PERMISSION_MODULES.flatMap((m) => m.acoes.map((a) => [a.key, `${m.label} · ${a.label}`])),
);

/** Rótulo legível de uma chave, para mensagens de erro e telas de 403. */
export function permissionLabel(key: string): string {
  return LABELS.get(key) ?? key;
}

/** Modelos de permissão criados junto com a rede (espelho de criar_modelos_padrao). */
export const MODELOS_PADRAO: { nome: string; descricao: string; chaves: PermissionKey[] }[] = [
  {
    "nome": "Gerente",
    "descricao": "Opera a loja por completo, menos o que mexe na estrutura da rede.",
    "chaves": [
      "atendimento.acessar",
      "atendimento.alterar",
      "atendimento.excluir",
      "atendimento.gerenciar_contra_argumentos",
      "atendimento.registrar",
      "atendimento.registrar_experimentacao",
      "atendimento.registrar_objecao",
      "atendimento.ver_contra_argumentos",
      "atendimento.ver_kpis",
      "auditoria.consultar",
      "boletos.baixar",
      "boletos.cancelar",
      "boletos.consultar",
      "boletos.emitir",
      "boletos.ver_taxas",
      "cadastros.acessar",
      "cadastros.feriados",
      "cadastros.fornecedores",
      "cadastros.funcionarios",
      "cadastros.medicos",
      "cadastros.tabelas_auxiliares",
      "caixa.abrir",
      "caixa.alterar_saldo_inicial",
      "caixa.consultar",
      "caixa.excluir_lancamento",
      "caixa.fechar",
      "caixa.pagar_despesa",
      "caixa.reabrir",
      "caixa.sangria",
      "caixa.suprimento",
      "caixa.transferir",
      "cartao.alterar_taxa",
      "cartao.conciliar",
      "cartao.consultar",
      "cartao.gerenciar_antecipacoes",
      "cartao.ver_liquido",
      "cheques.alterar_status",
      "cheques.consultar",
      "cheques.devolver",
      "cheques.imprimir",
      "cheques.incluir",
      "clientes.acessar",
      "clientes.alterar",
      "clientes.alterar_nome",
      "clientes.analise_credito",
      "clientes.consultar",
      "clientes.excluir",
      "clientes.exportar",
      "clientes.exportar_receitas",
      "clientes.gerenciar_nucleo_familiar",
      "clientes.importar",
      "clientes.incluir",
      "clientes.negativar",
      "clientes.ver_credito",
      "clube.acessar",
      "clube.gerenciar_beneficios",
      "clube.gerenciar_cobrancas",
      "clube.gerenciar_membros",
      "clube.gerenciar_planos",
      "clube.ver_custos",
      "comissoes.apurar",
      "comissoes.configurar_equipes",
      "comissoes.configurar_parametros",
      "comissoes.configurar_parametros_equipe",
      "comissoes.consultar_todas",
      "comissoes.pagar",
      "contas_pagar.alterar",
      "contas_pagar.baixar",
      "contas_pagar.cancelar",
      "contas_pagar.consultar",
      "contas_pagar.data_retroativa",
      "contas_pagar.estornar",
      "contas_pagar.imprimir",
      "contas_pagar.incluir",
      "contas_receber.alterar",
      "contas_receber.alterar_situacao",
      "contas_receber.autorizar_desconto_distancia",
      "contas_receber.baixar_outras_filiais",
      "contas_receber.cancelar",
      "contas_receber.consultar",
      "contas_receber.data_retroativa",
      "contas_receber.estornar",
      "contas_receber.imprimir",
      "contas_receber.incluir",
      "contas_receber.receber",
      "contas_receber.renegociar",
      "crediario.alterar_limite",
      "crediario.baixar",
      "crediario.conceder",
      "crediario.consultar",
      "crediario.ver_score",
      "dashboard.acessar",
      "dashboard.card_aniversariantes",
      "dashboard.card_comparativo_ano",
      "dashboard.card_contas_pagar",
      "dashboard.card_contas_receber",
      "dashboard.card_estoque_minimo",
      "dashboard.card_negativados",
      "dashboard.card_oportunidade_aberto",
      "dashboard.card_os_entregar",
      "dashboard.card_receitas_vencidas",
      "dashboard.card_validade_produtos",
      "dashboard.card_vendas_12m",
      "dashboard.card_vendas_mes",
      "estoque.acerto",
      "estoque.acessar",
      "estoque.confirmar_transferencia",
      "estoque.entrada_manual",
      "estoque.entrada_nf",
      "estoque.etiquetas",
      "estoque.exportar",
      "estoque.historico",
      "estoque.inventario",
      "estoque.posicao_atual",
      "estoque.posicao_todas_filiais",
      "estoque.transferir",
      "estoque.zerar",
      "financeiro.contas_bancarias",
      "financeiro.documentos_fiscais",
      "financeiro.dre",
      "financeiro.extrato",
      "financeiro.fluxo_financeiro",
      "financeiro.pagamento_pedidos",
      "financeiro.pedidos_fornecedor",
      "financeiro.plano_contas",
      "inteligencia.acessar",
      "inteligencia.auditar_vitrine",
      "inteligencia.configurar_filas",
      "inteligencia.crm_familiar",
      "inteligencia.filas_trabalho",
      "inteligencia.funil",
      "inteligencia.nbo",
      "inteligencia.oportunidade_aberto",
      "inteligencia.painel_dono",
      "inteligencia.planograma",
      "inteligencia.segundo_par",
      "inteligencia.trabalhar_fila",
      "inteligencia.ver_atribuicao",
      "marketing.acessar",
      "marketing.consultar_envios",
      "marketing.disparar_campanha",
      "marketing.gerenciar_campanhas",
      "marketing.gerenciar_cashback",
      "marketing.gerenciar_eventos",
      "marketing.gerenciar_indicacoes",
      "marketing.gerenciar_promocoes",
      "marketing.gerenciar_templates",
      "marketing.gerenciar_vitrine",
      "orcamentos.alterar",
      "orcamentos.consultar",
      "orcamentos.consultar_proprios",
      "orcamentos.converter_venda",
      "orcamentos.excluir",
      "orcamentos.imprimir",
      "orcamentos.incluir",
      "orcamentos.prorrogar_validade",
      "ordens_servico.alterar",
      "ordens_servico.alterar_funcionario",
      "ordens_servico.alterar_proprias",
      "ordens_servico.alterar_somente_abertas",
      "ordens_servico.cancelar",
      "ordens_servico.confirmar_perda",
      "ordens_servico.consultar",
      "ordens_servico.consultar_proprias",
      "ordens_servico.data_retroativa",
      "ordens_servico.entregar",
      "ordens_servico.gerenciar_etapas",
      "ordens_servico.imprimir",
      "ordens_servico.incluir",
      "ordens_servico.mover_etapa",
      "ordens_servico.retornar_entregue",
      "ordens_servico.ver_paineis",
      "permissoes.consultar",
      "produtos.acessar",
      "produtos.alterar",
      "produtos.alterar_custo",
      "produtos.alterar_estoque",
      "produtos.alterar_fiscal",
      "produtos.alterar_preco",
      "produtos.alterar_validade",
      "produtos.consultar",
      "produtos.excluir",
      "produtos.exportar",
      "produtos.gerenciar_vitrine",
      "produtos.importar",
      "produtos.incluir",
      "produtos.ver_custo",
      "receitas.alterar",
      "receitas.consultar",
      "receitas.excluir",
      "receitas.imprimir",
      "receitas.incluir",
      "receitas.livro_receitas",
      "relatorios.aniversarios",
      "relatorios.caixas",
      "relatorios.comissoes",
      "relatorios.comissoes_equipe",
      "relatorios.contas_pagar",
      "relatorios.contas_receber",
      "relatorios.exportar_excel",
      "relatorios.extrato_financeiro",
      "relatorios.livro_receitas",
      "relatorios.posicao_estoque",
      "relatorios.produtos_sem_giro",
      "relatorios.produtos_vendidos",
      "relatorios.receitas_vencidas",
      "relatorios.validade_produtos",
      "relatorios.vendas",
      "tabelas_lentes.acessar",
      "tabelas_lentes.concluir_conferencia",
      "tabelas_lentes.consultar",
      "tabelas_lentes.excluir_em_conferencia",
      "tabelas_lentes.salvar_conferencia",
      "tabelas_lentes.ver_custo_fornecedor",
      "trocas.cancelar",
      "trocas.consultar",
      "trocas.devolver_credito",
      "trocas.iniciar",
      "trocas.inutilizar_credito",
      "trocas.utilizar_credito",
      "trocas.utilizar_credito_acima_limite",
      "usuarios.consultar",
      "vendas.alterar",
      "vendas.alterar_convenio",
      "vendas.alterar_funcionario",
      "vendas.alterar_origem",
      "vendas.alterar_valor_unitario",
      "vendas.autorizar_desconto_distancia",
      "vendas.cancelar",
      "vendas.consultar",
      "vendas.consultar_proprias",
      "vendas.data_retroativa",
      "vendas.duplicar",
      "vendas.emitir_nfce",
      "vendas.excluir",
      "vendas.gerenciar_garantia",
      "vendas.imprimir",
      "vendas.incluir",
      "vendas.ver_margem",
      "vendas.ver_paineis"
    ]
  },
  {
    "nome": "Vendedor",
    "descricao": "Atende, orça, vende e acompanha as próprias O.S.",
    "chaves": [
      "atendimento.acessar",
      "atendimento.alterar",
      "atendimento.excluir",
      "atendimento.registrar",
      "atendimento.registrar_experimentacao",
      "atendimento.registrar_objecao",
      "atendimento.ver_contra_argumentos",
      "atendimento.ver_kpis",
      "clientes.acessar",
      "clientes.alterar",
      "clientes.consultar",
      "clientes.gerenciar_nucleo_familiar",
      "clientes.incluir",
      "comissoes.consultar_proprias",
      "dashboard.acessar",
      "dashboard.card_aniversariantes",
      "dashboard.card_os_entregar",
      "dashboard.card_receitas_vencidas",
      "estoque.acessar",
      "estoque.posicao_atual",
      "inteligencia.acessar",
      "inteligencia.crm_familiar",
      "inteligencia.filas_trabalho",
      "inteligencia.nbo",
      "inteligencia.segundo_par",
      "inteligencia.trabalhar_fila",
      "orcamentos.alterar",
      "orcamentos.consultar_proprios",
      "orcamentos.converter_venda",
      "orcamentos.imprimir",
      "orcamentos.incluir",
      "ordens_servico.alterar_proprias",
      "ordens_servico.consultar_proprias",
      "ordens_servico.entregar",
      "ordens_servico.imprimir",
      "ordens_servico.incluir",
      "ordens_servico.mover_etapa",
      "produtos.acessar",
      "produtos.consultar",
      "receitas.alterar",
      "receitas.consultar",
      "receitas.imprimir",
      "receitas.incluir",
      "relatorios.aniversarios",
      "relatorios.produtos_vendidos",
      "relatorios.receitas_vencidas",
      "tabelas_lentes.acessar",
      "tabelas_lentes.consultar",
      "trocas.consultar",
      "trocas.iniciar",
      "trocas.utilizar_credito",
      "vendas.consultar_proprias",
      "vendas.emitir_nfce",
      "vendas.imprimir",
      "vendas.incluir"
    ]
  },
  {
    "nome": "Financeiro",
    "descricao": "Cuida de caixa, títulos, cartão, cheque, boleto e resultado.",
    "chaves": [
      "auditoria.consultar",
      "boletos.baixar",
      "boletos.cancelar",
      "boletos.consultar",
      "boletos.emitir",
      "boletos.ver_taxas",
      "caixa.abrir",
      "caixa.consultar",
      "caixa.fechar",
      "caixa.pagar_despesa",
      "caixa.reabrir",
      "caixa.sangria",
      "caixa.suprimento",
      "caixa.transferir",
      "cartao.alterar_taxa",
      "cartao.conciliar",
      "cartao.consultar",
      "cartao.gerenciar_antecipacoes",
      "cartao.ver_liquido",
      "cheques.alterar_status",
      "cheques.consultar",
      "cheques.devolver",
      "cheques.imprimir",
      "cheques.incluir",
      "clientes.acessar",
      "clientes.consultar",
      "clientes.negativar",
      "clientes.ver_credito",
      "cobranca_bancaria.configurar",
      "cobranca_bancaria.consultar",
      "cobranca_bancaria.gerar_remessa",
      "cobranca_bancaria.processar_retorno",
      "comissoes.apurar",
      "comissoes.consultar_todas",
      "comissoes.pagar",
      "contas_pagar.alterar",
      "contas_pagar.baixar",
      "contas_pagar.cancelar",
      "contas_pagar.consultar",
      "contas_pagar.data_retroativa",
      "contas_pagar.estornar",
      "contas_pagar.imprimir",
      "contas_pagar.incluir",
      "contas_receber.alterar",
      "contas_receber.alterar_situacao",
      "contas_receber.autorizar_desconto_distancia",
      "contas_receber.baixar_outras_filiais",
      "contas_receber.cancelar",
      "contas_receber.consultar",
      "contas_receber.data_retroativa",
      "contas_receber.estornar",
      "contas_receber.imprimir",
      "contas_receber.incluir",
      "contas_receber.receber",
      "contas_receber.renegociar",
      "crediario.alterar_limite",
      "crediario.baixar",
      "crediario.conceder",
      "crediario.consultar",
      "crediario.ver_score",
      "dashboard.acessar",
      "dashboard.card_contas_pagar",
      "dashboard.card_contas_receber",
      "dashboard.card_negativados",
      "financeiro.configurar_dre",
      "financeiro.contas_bancarias",
      "financeiro.documentos_fiscais",
      "financeiro.dre",
      "financeiro.extrato",
      "financeiro.fluxo_financeiro",
      "financeiro.pagamento_pedidos",
      "financeiro.pedidos_fornecedor",
      "financeiro.plano_contas",
      "ordens_servico.consultar",
      "relatorios.caixas",
      "relatorios.contas_pagar",
      "relatorios.contas_receber",
      "relatorios.exportar_excel",
      "relatorios.extrato_financeiro",
      "relatorios.vendas",
      "trocas.cancelar",
      "trocas.consultar",
      "trocas.devolver_credito",
      "trocas.iniciar",
      "trocas.inutilizar_credito",
      "trocas.utilizar_credito",
      "trocas.utilizar_credito_acima_limite",
      "vendas.consultar"
    ]
  },
  {
    "nome": "Laboratório",
    "descricao": "Trabalha o pipeline de O.S. — sem acesso comercial ou financeiro.",
    "chaves": [
      "clientes.consultar",
      "dashboard.acessar",
      "dashboard.card_os_entregar",
      "estoque.acessar",
      "estoque.confirmar_transferencia",
      "estoque.historico",
      "estoque.posicao_atual",
      "ordens_servico.alterar",
      "ordens_servico.consultar",
      "ordens_servico.entregar",
      "ordens_servico.imprimir",
      "ordens_servico.mover_etapa",
      "ordens_servico.ver_paineis",
      "produtos.acessar",
      "produtos.consultar",
      "receitas.consultar"
    ]
  },
  {
    "nome": "Estoquista",
    "descricao": "Entrada, transferência, inventário e etiquetas.",
    "chaves": [
      "cadastros.acessar",
      "cadastros.fornecedores",
      "cadastros.tabelas_auxiliares",
      "dashboard.acessar",
      "dashboard.card_estoque_minimo",
      "dashboard.card_validade_produtos",
      "estoque.acerto",
      "estoque.acessar",
      "estoque.confirmar_transferencia",
      "estoque.entrada_manual",
      "estoque.entrada_nf",
      "estoque.etiquetas",
      "estoque.exportar",
      "estoque.historico",
      "estoque.inventario",
      "estoque.posicao_atual",
      "estoque.posicao_todas_filiais",
      "estoque.transferir",
      "produtos.acessar",
      "produtos.alterar",
      "produtos.alterar_estoque",
      "produtos.alterar_validade",
      "produtos.consultar",
      "produtos.incluir",
      "relatorios.exportar_excel",
      "relatorios.posicao_estoque",
      "relatorios.produtos_sem_giro",
      "relatorios.validade_produtos"
    ]
  }
];
