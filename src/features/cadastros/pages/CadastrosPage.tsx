import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/comum/PageHeader';
import {
  ConfirmarDialog, DataTable, EmptyState, FilterBar, type Coluna,
} from '@/components/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useListaParams } from '@/lib/query/useListaParams';

import {
  alternarAtivo, atualizarCadastro, criarCadastro, excluirCadastro, listarCadastro,
  type LinhaCadastro,
} from '../api';
import { CADASTROS, GRUPOS_CADASTRO, cadastroPorSlug } from '../config';
import { CadastroForm } from '../components/CadastroForm';

/**
 * Tela única para as vinte tabelas de apoio.
 *
 * O que muda entre um cadastro e outro está em `config.ts`. Esta tela lê a
 * configuração, monta colunas e formulário, e é isso — o que evita vinte telas
 * quase iguais, cada uma com sua própria versão do mesmo defeito.
 */
export default function CadastrosPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { contexto, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const disponiveis = useMemo(() => CADASTROS.filter((c) => can(c.permissao)), [can]);
  const config = cadastroPorSlug(slug ?? '') ?? disponiveis[0];

  const [emEdicao, setEmEdicao] = useState<LinhaCadastro | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<LinhaCadastro | null>(null);

  const lista = useListaParams({ ativos: undefined as string | undefined });
  const apenasAtivos = lista.filtros.ativos === '1';

  const chave = [
    'cadastro', config?.tabela, lista.pagina, lista.busca, lista.ordenacao, apenasAtivos,
  ];

  const consulta = useQuery({
    queryKey: chave,
    queryFn: () =>
      listarCadastro(config!.tabela, {
        pagina: lista.pagina,
        porPagina: lista.porPagina,
        busca: lista.busca,
        ordenacao: lista.ordenacao,
        apenasAtivos,
      }),
    enabled: Boolean(config),
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ['cadastro', config?.tabela] });

  const salvar = useMutation({
    mutationFn: (valores: Record<string, unknown>) =>
      emEdicao
        ? atualizarCadastro(config!.tabela, emEdicao.id, valores)
        : criarCadastro(config!.tabela, contexto!.tenant.id, valores),
    onSuccess: () => {
      toast({ title: emEdicao ? 'Alterado' : 'Cadastrado' });
      setFormAberto(false);
      setEmEdicao(null);
      void invalidar();
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  const excluir = useMutation({
    mutationFn: (registro: LinhaCadastro) => excluirCadastro(config!.tabela, registro.id),
    onSuccess: () => {
      toast({ title: 'Excluído' });
      setParaExcluir(null);
      void invalidar();
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível excluir', description: erro.message, variant: 'destructive' }),
  });

  const alternar = useMutation({
    mutationFn: ({ registro, ativo }: { registro: LinhaCadastro; ativo: boolean }) =>
      alternarAtivo(config!.tabela, registro.id, ativo),
    onSuccess: () => void invalidar(),
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível alterar', description: erro.message, variant: 'destructive' }),
  });

  if (!config) {
    return (
      <EmptyState
        icone={ListPlus}
        titulo="Sem cadastros disponíveis"
        descricao="Seu acesso não inclui nenhuma das tabelas de apoio."
      />
    );
  }

  const podeEscrever = can(config.permissao);

  const colunas: Coluna<LinhaCadastro>[] = [
    {
      chave: 'nome',
      titulo: 'Nome',
      ordenavel: true,
      celula: (linha) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{linha.nome}</p>
          {config.temDescricao !== false && linha.descricao && (
            <p className="truncate text-xs text-muted-foreground">{linha.descricao}</p>
          )}
        </div>
      ),
    },
    ...(config.campos ?? [])
      .filter((campo) => campo.naListagem)
      .map<Coluna<LinhaCadastro>>((campo) => ({
        chave: campo.nome,
        titulo: campo.rotulo,
        ocultarNoMobile: true,
        alinhamento:
          campo.tipo === 'numero' || campo.tipo === 'moeda' || campo.tipo === 'percentual'
            ? 'direita'
            : 'esquerda',
        celula: (linha) => {
          const valor = linha[campo.nome];
          if (valor === null || valor === undefined || valor === '') {
            return <span className="text-muted-foreground">—</span>;
          }
          if (campo.tipo === 'booleano') {
            return valor ? <Badge variant="secondary">sim</Badge> : <span className="text-muted-foreground">não</span>;
          }
          if (campo.tipo === 'percentual') return `${Number(valor).toFixed(2)}%`;
          if (campo.tipo === 'select') {
            return campo.opcoes?.find((o) => o.valor === valor)?.rotulo ?? String(valor);
          }
          if (campo.tipo === 'referencia') return <span className="text-muted-foreground">—</span>;
          return String(valor);
        },
      })),
    {
      chave: 'ativo',
      titulo: 'Ativo',
      alinhamento: 'centro',
      celula: (linha) => (
        <Switch
          checked={linha.ativo}
          disabled={!podeEscrever || alternar.isPending}
          onCheckedChange={(ativo) => alternar.mutate({ registro: linha, ativo })}
          aria-label={`${linha.ativo ? 'Desativar' : 'Ativar'} ${linha.nome}`}
        />
      ),
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      celula: (linha) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!podeEscrever}
            onClick={() => {
              setEmEdicao(linha);
              setFormAberto(true);
            }}
            aria-label={`Editar ${linha.nome}`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            disabled={!podeEscrever}
            onClick={() => setParaExcluir(linha)}
            aria-label={`Excluir ${linha.nome}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Cadastros"
        descricao="Tabelas de apoio que servem de dimensão para produto, venda, financeiro e relatório."
        acoes={
          podeEscrever && (
            <Button
              onClick={() => {
                setEmEdicao(null);
                setFormAberto(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo {config.rotuloSingular}
            </Button>
          )
        }
      />

      <div className="space-y-4">
        {GRUPOS_CADASTRO.map((grupo) => {
          const doGrupo = disponiveis.filter((c) => c.grupo === grupo.chave);
          if (doGrupo.length === 0) return null;

          return (
            <div key={grupo.chave} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {grupo.rotulo}
              </span>
              <Tabs value={config.slug}>
                <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
                  {doGrupo.map((item) => (
                    <TabsTrigger
                      key={item.slug}
                      value={item.slug}
                      onClick={() => navigate(`/cadastros/${item.slug}`)}
                      className="h-7 rounded-md border border-border px-2.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {item.rotulo}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h2 className="font-semibold">{config.rotulo}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{config.descricao}</p>
        </div>

        <FilterBar
          busca={lista.busca}
          aoBuscar={lista.buscar}
          placeholder={`Buscar ${config.rotulo.toLowerCase()}…`}
          filtrosAtivos={
            apenasAtivos
              ? [
                  {
                    chave: 'ativos',
                    rotulo: 'Situação',
                    valor: 'somente ativos',
                    limpar: () => lista.filtrar('ativos', undefined),
                  },
                ]
              : []
          }
        >
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={apenasAtivos}
              onCheckedChange={(v) => lista.filtrar('ativos', v ? '1' : undefined)}
            />
            Somente ativos
          </label>
        </FilterBar>

        <DataTable
          colunas={colunas}
          linhas={consulta.data?.linhas}
          total={consulta.data?.total}
          chaveLinha={(linha) => linha.id}
          carregando={consulta.isPending}
          erro={consulta.error as Error | null}
          pagina={lista.pagina}
          porPagina={lista.porPagina}
          aoMudarPagina={lista.irParaPagina}
          ordenacao={lista.ordenacao}
          aoOrdenar={lista.ordenar}
          vazio={
            <EmptyState
              icone={ListPlus}
              titulo={
                lista.busca || apenasAtivos
                  ? 'Nenhum registro com esses filtros'
                  : `Nenhum ${config.rotuloSingular} cadastrado`
              }
              descricao={
                lista.busca || apenasAtivos
                  ? 'Ajuste ou limpe os filtros acima.'
                  : config.descricao
              }
              acao={
                podeEscrever &&
                !lista.busca && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEmEdicao(null);
                      setFormAberto(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden />
                    Cadastrar {config.rotuloSingular}
                  </Button>
                )
              }
            />
          }
        />
      </div>

      <CadastroForm
        config={config}
        registro={emEdicao}
        aberto={formAberto}
        aoFechar={() => {
          setFormAberto(false);
          setEmEdicao(null);
        }}
        aoSalvar={(valores) => salvar.mutate(valores)}
        salvando={salvar.isPending}
      />

      <ConfirmarDialog
        aberto={paraExcluir !== null}
        aoMudarAberto={(v) => !v && setParaExcluir(null)}
        titulo={`Excluir ${config.rotuloSingular}?`}
        descricao={
          <>
            <p>
              <strong className="text-foreground">{paraExcluir?.nome}</strong> será removido em
              definitivo.
            </p>
            <p>
              Se este registro já foi usado em alguma venda ou cadastro, a exclusão será
              recusada — nesse caso, desative-o: ele some dos seletores e o histórico continua
              legível.
            </p>
          </>
        }
        rotuloConfirmar="Excluir"
        carregando={excluir.isPending}
        aoConfirmar={() => paraExcluir && excluir.mutate(paraExcluir)}
      />
    </div>
  );
}
