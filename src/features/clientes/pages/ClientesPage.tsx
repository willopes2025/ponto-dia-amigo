import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Cake, MessageCircle, Plus, UserRound, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/comum/PageHeader';
import {
  DataTable, EmptyState, ExportarButton, FilterBar, type Coluna, type FiltroAtivo,
} from '@/components/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { cpfCnpj, moeda, telefone } from '@/lib/format';
import { useListaParams } from '@/lib/query/useListaParams';
import { listarOpcoes } from '@/features/cadastros/api';

import { exportarClientes, listarClientes, type ClienteNaLista } from '../api';

const SEM_FILTRO = '__todos__';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { contexto, can } = useAuth();

  const lista = useListaParams({
    loja: undefined as string | undefined,
    origem: undefined as string | undefined,
    negativado: undefined as string | undefined,
  });

  const filtros = {
    storeId: lista.filtros.loja,
    origemId: lista.filtros.origem,
    negativado: lista.filtros.negativado === '1',
  };

  const consulta = useQuery({
    queryKey: ['clientes', lista.pagina, lista.busca, lista.ordenacao, filtros],
    queryFn: () =>
      listarClientes({
        pagina: lista.pagina,
        porPagina: lista.porPagina,
        busca: lista.busca,
        ordenacao: lista.ordenacao,
        filtros,
      }),
  });

  const origens = useQuery({
    queryKey: ['cadastro-opcoes', 'origens_cliente'],
    queryFn: () => listarOpcoes('origens_cliente'),
    staleTime: 5 * 60_000,
  });

  const filiais = contexto?.stores ?? [];

  const filtrosAtivos: FiltroAtivo[] = [
    lista.filtros.loja && {
      chave: 'loja',
      rotulo: 'Filial',
      valor: filiais.find((f) => f.id === lista.filtros.loja)?.nome_fantasia ?? '—',
      limpar: () => lista.filtrar('loja', undefined),
    },
    lista.filtros.origem && {
      chave: 'origem',
      rotulo: 'Origem',
      valor: origens.data?.find((o) => o.id === lista.filtros.origem)?.nome ?? '—',
      limpar: () => lista.filtrar('origem', undefined),
    },
    lista.filtros.negativado === '1' && {
      chave: 'negativado',
      rotulo: 'Situação',
      valor: 'negativados',
      limpar: () => lista.filtrar('negativado', undefined),
    },
  ].filter(Boolean) as FiltroAtivo[];

  const colunas: Coluna<ClienteNaLista>[] = [
    {
      chave: 'codigo',
      titulo: 'Cód.',
      ordenavel: true,
      alinhamento: 'direita',
      className: 'w-16',
      celula: (c) => <span className="text-muted-foreground tabular">{c.codigo}</span>,
    },
    {
      chave: 'nome',
      titulo: 'Cliente',
      ordenavel: true,
      celula: (c) => {
        const principal = c.cliente_telefones?.find((t) => t.principal) ?? c.cliente_telefones?.[0];
        return (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium">
              {c.nome}
              {c.negativado && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden />
                    </span>
                  </TooltipTrigger>
                  {/* Informação de crédito do consumidor: fica no sistema, nunca
                      numa mensagem ao cliente nem em tela voltada para ele. */}
                  <TooltipContent>Cliente negativado — uso interno</TooltipContent>
                </Tooltip>
              )}
            </p>
            <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              {c.cpf_cnpj && <span className="tabular">{cpfCnpj(c.cpf_cnpj)}</span>}
              {principal && (
                <span className="inline-flex items-center gap-1">
                  {principal.aceita_whatsapp && (
                    <MessageCircle className="h-3 w-3 text-success" aria-hidden />
                  )}
                  {telefone(principal.numero)}
                </span>
              )}
            </p>
          </div>
        );
      },
    },
    {
      chave: 'cidade',
      titulo: 'Cidade',
      ordenavel: true,
      ocultarNoMobile: true,
      celula: (c) =>
        c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ''}` : <span className="text-muted-foreground">—</span>,
    },
    {
      chave: 'vendas',
      titulo: 'Compras',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (c) => {
        const m = c.cliente_metricas;
        if (!m || m.vendas_qtd === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div>
            <p className="tabular">{moeda(m.vendas_valor)}</p>
            <p className="text-xs text-muted-foreground tabular">{m.vendas_qtd} venda(s)</p>
          </div>
        );
      },
    },
    {
      chave: 'receitas',
      titulo: 'Receitas',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (c) => (
        <span className="tabular">{c.cliente_metricas?.receitas_qtd ?? 0}</span>
      ),
    },
    {
      chave: 'atraso',
      titulo: 'Em atraso',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (c) => {
        const qtd = c.cliente_metricas?.parcelas_atraso_qtd ?? 0;
        if (qtd === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant="destructive" className="tabular">
            {qtd}
          </Badge>
        );
      },
    },
    {
      chave: 'contato',
      titulo: 'Contato',
      alinhamento: 'centro',
      ocultarNoMobile: true,
      celula: (c) =>
        c.consentimento_contato_em ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="border-success/40 text-success">
                opt-in
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Consentiu receber contato em{' '}
              {new Date(c.consentimento_contato_em).toLocaleDateString('pt-BR')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">sem opt-in</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Sem consentimento registrado, nenhuma régua de marketing dispara para este
              cliente.
            </TooltipContent>
          </Tooltip>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Clientes"
        descricao="Cadastrados uma vez na rede. Contagens de compra, receita e atraso vêm prontas do banco."
        acoes={
          can('clientes.incluir') && (
            <Button onClick={() => navigate('/clientes/novo')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo cliente
            </Button>
          )
        }
      />

      <FilterBar
        busca={lista.busca}
        aoBuscar={lista.buscar}
        placeholder="Buscar por nome, apelido ou documento…"
        filtrosAtivos={filtrosAtivos}
        aoLimparTudo={lista.limparFiltros}
        acoes={
          can('clientes.exportar') && (
            <ExportarButton
              nomeArquivo="clientes"
              obterLinhas={() => exportarClientes(filtros, lista.busca)}
            />
          )
        }
      >
        {filiais.length > 1 && (
          <Select
            value={lista.filtros.loja ?? SEM_FILTRO}
            onValueChange={(v) => lista.filtrar('loja', v === SEM_FILTRO ? undefined : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_FILTRO}>Todas as filiais</SelectItem>
              {filiais.map((filial) => (
                <SelectItem key={filial.id} value={filial.id}>
                  {filial.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={lista.filtros.origem ?? SEM_FILTRO}
          onValueChange={(v) => lista.filtrar('origem', v === SEM_FILTRO ? undefined : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_FILTRO}>Todas as origens</SelectItem>
            {(origens.data ?? []).map((origem) => (
              <SelectItem key={origem.id} value={origem.id}>
                {origem.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {can('clientes.ver_credito') && (
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={lista.filtros.negativado === '1'}
              onCheckedChange={(v) => lista.filtrar('negativado', v ? '1' : undefined)}
            />
            Negativados
          </label>
        )}
      </FilterBar>

      <DataTable
        colunas={colunas}
        linhas={consulta.data?.linhas}
        total={consulta.data?.total}
        chaveLinha={(c) => c.id}
        carregando={consulta.isPending}
        erro={consulta.error as Error | null}
        pagina={lista.pagina}
        porPagina={lista.porPagina}
        aoMudarPagina={lista.irParaPagina}
        ordenacao={lista.ordenacao}
        aoOrdenar={lista.ordenar}
        aoClicarLinha={(c) => navigate(`/clientes/${c.id}`)}
        vazio={
          <EmptyState
            icone={lista.busca || filtrosAtivos.length > 0 ? Users : UserRound}
            titulo={
              lista.busca || filtrosAtivos.length > 0
                ? 'Nenhum cliente com esses filtros'
                : 'Nenhum cliente cadastrado'
            }
            descricao={
              lista.busca || filtrosAtivos.length > 0
                ? 'Ajuste a busca ou limpe os filtros acima.'
                : 'O cadastro de cliente é a base da receita, da venda e de toda a camada de recompra.'
            }
            acao={
              can('clientes.incluir') &&
              !lista.busca && (
                <Button size="sm" onClick={() => navigate('/clientes/novo')}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Cadastrar cliente
                </Button>
              )
            }
          />
        }
      />

      {consulta.data && consulta.data.total > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Cake className="h-3.5 w-3.5" aria-hidden />
          Aniversariantes e receitas vencidas viram filas de trabalho no painel, a partir da fase 5.
        </p>
      )}
    </div>
  );
}
