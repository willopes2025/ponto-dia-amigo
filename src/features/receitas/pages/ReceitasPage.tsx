import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Eye, MessageCircle, Plus, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/comum/PageHeader';
import { DataTable, EmptyState, FilterBar, type Coluna } from '@/components/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { eixo as formatarEixo, grau, moeda } from '@/lib/format';
import { useListaParams } from '@/lib/query/useListaParams';

import {
  listarReceitas, listarReceitasVencidas, type ReceitaNaLista, type ReceitaVencida,
} from '../api';

export default function ReceitasPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const lista = useListaParams({ aba: undefined as string | undefined });

  const aba = lista.filtros.aba === 'vencidas' ? 'vencidas' : 'livro';

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Receitas"
        descricao="A prescrição é o que dispara a recompra. Toda receita vencida é uma conversa que ainda não aconteceu."
        acoes={
          can('receitas.incluir') && (
            <Button onClick={() => navigate('/receitas/nova')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Nova receita
            </Button>
          )
        }
      />

      <Tabs value={aba}>
        <TabsList>
          <TabsTrigger value="livro" onClick={() => lista.filtrar('aba', undefined)}>
            Livro de receitas
          </TabsTrigger>
          <TabsTrigger value="vencidas" onClick={() => lista.filtrar('aba', 'vencidas')}>
            Receitas vencidas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {aba === 'livro' ? <LivroDeReceitas lista={lista} /> : <FilaDeRecall lista={lista} />}
    </div>
  );
}

type Lista = ReturnType<typeof useListaParams<{ aba: string | undefined }>>;

function LivroDeReceitas({ lista }: { lista: Lista }) {
  const navigate = useNavigate();

  const consulta = useQuery({
    queryKey: ['receitas', lista.pagina, lista.busca, lista.ordenacao],
    queryFn: () =>
      listarReceitas({
        pagina: lista.pagina,
        porPagina: lista.porPagina,
        busca: lista.busca,
        ordenacao: lista.ordenacao,
        filtros: {},
      }),
  });

  const colunas: Coluna<ReceitaNaLista>[] = [
    {
      chave: 'codigo',
      titulo: 'Nº',
      ordenavel: true,
      alinhamento: 'direita',
      className: 'w-16',
      celula: (r) => <span className="text-muted-foreground tabular">{r.codigo}</span>,
    },
    {
      chave: 'cliente',
      titulo: 'Cliente',
      celula: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.clientes?.nome ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.medicos?.nome ?? r.medico_nome ?? 'sem prescritor'}
          </p>
        </div>
      ),
    },
    {
      chave: 'od',
      titulo: 'OD',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (r) => <Olho esf={r.od_esferico} cil={r.od_cilindrico} eixo={r.od_eixo} />,
    },
    {
      chave: 'oe',
      titulo: 'OE',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (r) => <Olho esf={r.oe_esferico} cil={r.oe_cilindrico} eixo={r.oe_eixo} />,
    },
    {
      chave: 'multifocal',
      titulo: 'Tipo',
      alinhamento: 'centro',
      ocultarNoMobile: true,
      celula: (r) =>
        r.multifocal ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary">multifocal</Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Receita com adição. Multifocal sem um solar com grau é a oportunidade de segundo
              par mais frequente — vira regra automática na fase 8.
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">simples</span>
        ),
    },
    {
      chave: 'data_receita',
      titulo: 'Data',
      ordenavel: true,
      alinhamento: 'direita',
      celula: (r) => (
        <span className="tabular">{new Date(r.data_receita).toLocaleDateString('pt-BR')}</span>
      ),
    },
    {
      chave: 'validade',
      titulo: 'Validade',
      ordenavel: true,
      alinhamento: 'direita',
      celula: (r) => {
        const vencida = new Date(r.validade) < new Date();
        return (
          <span className={vencida ? 'font-medium text-atraso tabular' : 'tabular'}>
            {new Date(r.validade).toLocaleDateString('pt-BR')}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <FilterBar
        busca={lista.busca}
        aoBuscar={lista.buscar}
        placeholder="Buscar pelo nome do cliente…"
      />
      <DataTable
        colunas={colunas}
        linhas={consulta.data?.linhas}
        total={consulta.data?.total}
        chaveLinha={(r) => r.id}
        carregando={consulta.isPending}
        erro={consulta.error as Error | null}
        pagina={lista.pagina}
        porPagina={lista.porPagina}
        aoMudarPagina={lista.irParaPagina}
        ordenacao={lista.ordenacao}
        aoOrdenar={lista.ordenar}
        aoClicarLinha={(r) => navigate(`/receitas/${r.id}`)}
        vazio={
          <EmptyState
            icone={Eye}
            titulo="Nenhuma receita"
            descricao="A receita liga o cliente à recompra: sem ela, não há recall nem checagem de compatibilidade da lente."
          />
        }
      />
    </>
  );
}

function FilaDeRecall({ lista }: { lista: Lista }) {
  const consulta = useQuery({
    queryKey: ['receitas-vencidas', lista.pagina, lista.busca, lista.ordenacao],
    queryFn: () =>
      listarReceitasVencidas({
        pagina: lista.pagina,
        porPagina: lista.porPagina,
        busca: lista.busca,
        ordenacao: lista.ordenacao,
      }),
  });

  const colunas: Coluna<ReceitaVencida>[] = [
    {
      chave: 'cliente_nome',
      titulo: 'Cliente',
      celula: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.cliente_nome}</p>
          <p className="text-xs text-muted-foreground">
            Receita {r.codigo} · {r.tipo === 'lente_contato' ? 'lente de contato' : 'óculos'}
          </p>
        </div>
      ),
    },
    {
      chave: 'dias_vencida',
      titulo: 'Vencida há',
      ordenavel: true,
      alinhamento: 'direita',
      celula: (r) => <span className="tabular">{r.dias_vencida} dias</span>,
    },
    {
      chave: 'ticket_medio',
      titulo: 'Ticket médio',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (r) =>
        r.ticket_medio ? moeda(r.ticket_medio) : <span className="text-muted-foreground">—</span>,
    },
    {
      chave: 'elegivel',
      titulo: 'Pode receber contato?',
      celula: (r) => {
        // Esta coluna é o ponto da tela. Uma fila de recall que ignora
        // consentimento e canal não é fila de trabalho: é risco.
        if (r.negativado) {
          return (
            <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
              <ShieldOff className="h-3 w-3" aria-hidden />
              negativado
            </Badge>
          );
        }
        if (!r.consentiu_contato) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  sem opt-in
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                O cliente não autorizou contato. Registre a autorização na ficha antes de
                incluir numa campanha.
              </TooltipContent>
            </Tooltip>
          );
        }
        if (!r.tem_canal_aberto) {
          return (
            <Badge variant="outline" className="gap-1">
              sem canal
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="gap-1 border-success/40 text-success">
            <MessageCircle className="h-3 w-3" aria-hidden />
            elegível
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium">Como esta fila é montada</p>
        <p className="mt-1 text-muted-foreground">
          Só a receita <strong className="text-foreground">mais recente</strong> de cada cliente,
          por tipo — contar as antigas inflaria a fila e, mais adiante, o número de oportunidade
          em aberto. A coluna de elegibilidade cruza consentimento, canal aberto e negativação
          antes de qualquer disparo.
        </p>
      </div>

      <FilterBar
        busca={lista.busca}
        aoBuscar={lista.buscar}
        placeholder="Buscar pelo nome do cliente…"
      />

      <DataTable
        colunas={colunas}
        linhas={consulta.data?.linhas}
        total={consulta.data?.total}
        chaveLinha={(r) => r.receita_id as string}
        carregando={consulta.isPending}
        erro={consulta.error as Error | null}
        pagina={lista.pagina}
        porPagina={lista.porPagina}
        aoMudarPagina={lista.irParaPagina}
        ordenacao={lista.ordenacao}
        aoOrdenar={lista.ordenar}
        vazio={
          <EmptyState
            icone={Eye}
            titulo="Nenhuma receita vencida"
            descricao="Quando houver, cada linha aqui é uma conversa de recompra esperando acontecer."
          />
        }
      />
    </div>
  );
}

/** Grau de um olho, em notação de receita: esférico, cilíndrico e eixo. */
function Olho({
  esf, cil, eixo,
}: {
  esf: number | null;
  cil: number | null;
  eixo: number | null;
}) {
  if (esf === null && cil === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular text-xs">
      {grau(esf)}
      {cil !== null && cil !== 0 && (
        <>
          {' '}
          {grau(cil)} × {formatarEixo(eixo)}
        </>
      )}
    </span>
  );
}
