import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, FlaskConical, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/comum/PageHeader';
import {
  DataTable, EmptyState, FilterBar, FormSection, type Coluna,
} from '@/components/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { cpfCnpj } from '@/lib/format';
import { listar, termoBusca, traduzirErro } from '@/lib/query/lista';
import { useListaParams } from '@/lib/query/useListaParams';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/supabase';

type Fornecedor = Tables<'fornecedores'>;

export default function FornecedoresPage() {
  const { contexto, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const podeEditar = can('cadastros.fornecedores');

  const lista = useListaParams({ laboratorio: undefined as string | undefined });
  const [emEdicao, setEmEdicao] = useState<Fornecedor | null>(null);
  const [aberto, setAberto] = useState(false);

  const consulta = useQuery({
    queryKey: ['fornecedores', lista.pagina, lista.busca, lista.ordenacao, lista.filtros],
    queryFn: () => {
      let q = supabase.from('fornecedores').select('*', { count: 'exact' });
      const termo = termoBusca(lista.busca);
      if (termo) q = q.or(`nome_fantasia.ilike.${termo},razao_social.ilike.${termo}`);
      if (lista.filtros.laboratorio === '1') q = q.eq('is_laboratorio', true);
      return listar<Fornecedor>(q as never, {
        pagina: lista.pagina,
        porPagina: lista.porPagina,
        ordenacao: lista.ordenacao ?? { campo: 'nome_fantasia', direcao: 'asc' },
      });
    },
  });

  const salvar = useMutation({
    mutationFn: async (dados: Partial<Fornecedor>) => {
      if (emEdicao) {
        const { error } = await supabase.from('fornecedores').update(dados).eq('id', emEdicao.id);
        if (error) throw traduzirErro(error);
      } else {
        const { error } = await supabase
          .from('fornecedores')
          .insert({ ...dados, tenant_id: contexto!.tenant.id } as never);
        if (error) throw traduzirErro(error);
      }
    },
    onSuccess: () => {
      toast({ title: emEdicao ? 'Fornecedor alterado' : 'Fornecedor cadastrado' });
      setAberto(false);
      setEmEdicao(null);
      void queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  const colunas: Coluna<Fornecedor>[] = [
    {
      chave: 'nome_fantasia',
      titulo: 'Fornecedor',
      ordenavel: true,
      celula: (f) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium">
            {f.nome_fantasia}
            {f.is_laboratorio && (
              <Badge variant="secondary" className="gap-1">
                <FlaskConical className="h-3 w-3" aria-hidden />
                laboratório
              </Badge>
            )}
          </p>
          {f.razao_social && (
            <p className="truncate text-xs text-muted-foreground">{f.razao_social}</p>
          )}
        </div>
      ),
    },
    {
      chave: 'cpf_cnpj',
      titulo: 'CNPJ',
      ocultarNoMobile: true,
      celula: (f) =>
        f.cpf_cnpj ? (
          <span className="tabular">{cpfCnpj(f.cpf_cnpj)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      chave: 'prazo',
      titulo: 'Prazo',
      alinhamento: 'direita',
      ocultarNoMobile: true,
      celula: (f) =>
        f.prazo_producao_dias !== null ? (
          <span className="tabular">{f.prazo_producao_dias} dias úteis</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      chave: 'cidade',
      titulo: 'Cidade',
      ocultarNoMobile: true,
      celula: (f) =>
        f.cidade ? `${f.cidade}${f.uf ? `/${f.uf}` : ''}` : <span className="text-muted-foreground">—</span>,
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      celula: (f) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!podeEditar}
          onClick={() => {
            setEmEdicao(f);
            setAberto(true);
          }}
          aria-label={`Editar ${f.nome_fantasia}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Fornecedores e laboratórios"
        descricao="Marcar um fornecedor como laboratório é o que o faz aparecer no seletor da Ordem de Serviço e na conciliação de pedidos."
        acoes={
          podeEditar && (
            <Button
              onClick={() => {
                setEmEdicao(null);
                setAberto(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo fornecedor
            </Button>
          )
        }
      />

      <FilterBar
        busca={lista.busca}
        aoBuscar={lista.buscar}
        placeholder="Buscar por nome ou razão social…"
        filtrosAtivos={
          lista.filtros.laboratorio === '1'
            ? [
                {
                  chave: 'laboratorio',
                  rotulo: 'Tipo',
                  valor: 'só laboratórios',
                  limpar: () => lista.filtrar('laboratorio', undefined),
                },
              ]
            : []
        }
      >
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={lista.filtros.laboratorio === '1'}
            onCheckedChange={(v) => lista.filtrar('laboratorio', v ? '1' : undefined)}
          />
          Só laboratórios
        </label>
      </FilterBar>

      <DataTable
        colunas={colunas}
        linhas={consulta.data?.linhas}
        total={consulta.data?.total}
        chaveLinha={(f) => f.id}
        carregando={consulta.isPending}
        erro={consulta.error as Error | null}
        pagina={lista.pagina}
        porPagina={lista.porPagina}
        aoMudarPagina={lista.irParaPagina}
        ordenacao={lista.ordenacao}
        aoOrdenar={lista.ordenar}
        vazio={
          <EmptyState
            icone={Building2}
            titulo="Nenhum fornecedor"
            descricao="Sem laboratório cadastrado, a Ordem de Serviço não tem para onde enviar a montagem."
          />
        }
      />

      <FornecedorDialog
        aberto={aberto}
        fornecedor={emEdicao}
        aoFechar={() => {
          setAberto(false);
          setEmEdicao(null);
        }}
        aoSalvar={(dados) => salvar.mutate(dados)}
        salvando={salvar.isPending}
      />
    </div>
  );
}

function FornecedorDialog({
  aberto, fornecedor, aoFechar, aoSalvar, salvando,
}: {
  aberto: boolean;
  fornecedor: Fornecedor | null;
  aoFechar: () => void;
  aoSalvar: (dados: Partial<Fornecedor>) => void;
  salvando: boolean;
}) {
  const [form, setForm] = useState<Partial<Fornecedor>>({});

  // `key` no Dialog recria o estado a cada abertura: sem isso, abrir para
  // editar depois de criar traria os campos do anterior.
  const chave = fornecedor?.id ?? 'novo';
  const valor = (campo: keyof Fornecedor) =>
    String(form[campo] ?? fornecedor?.[campo] ?? '');

  const marcado = (campo: keyof Fornecedor) =>
    Boolean(form[campo] ?? fornecedor?.[campo] ?? false);

  const nome = valor('nome_fantasia');

  return (
    <Dialog key={chave} open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fornecedor ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
          <DialogDescription>
            O prazo de produção alimenta a previsão de entrega da O.S. quando a etapa não tem
            prazo próprio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <FormSection titulo="Identificação">
            {(
              [
                ['nome_fantasia', 'Nome fantasia'],
                ['razao_social', 'Razão social'],
                ['cpf_cnpj', 'CNPJ'],
                ['inscricao_estadual', 'Inscrição estadual'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={`f-${campo}`}>{rotulo}</Label>
                <Input
                  id={`f-${campo}`}
                  value={valor(campo)}
                  onChange={(e) => setForm((a) => ({ ...a, [campo]: e.target.value }))}
                />
              </div>
            ))}
          </FormSection>

          <FormSection titulo="Operação">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={marcado('is_laboratorio')}
                  onCheckedChange={(v) => setForm((a) => ({ ...a, is_laboratorio: v }))}
                />
                <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden />
                É laboratório óptico
              </label>
            </div>

            {marcado('is_laboratorio') && (
              <div className="space-y-1.5">
                <Label htmlFor="f-prazo">Prazo de produção (dias úteis)</Label>
                <Input
                  id="f-prazo"
                  type="number"
                  min={0}
                  value={valor('prazo_producao_dias')}
                  onChange={(e) =>
                    setForm((a) => ({
                      ...a,
                      prazo_producao_dias: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
            )}
          </FormSection>

          <FormSection titulo="Contato e endereço" colunas={3}>
            {(
              [
                ['telefone', 'Telefone'],
                ['email', 'E-mail'],
                ['website', 'Site'],
                ['cep', 'CEP'],
                ['endereco', 'Endereço'],
                ['numero', 'Número'],
                ['bairro', 'Bairro'],
                ['cidade', 'Cidade'],
                ['uf', 'UF'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={`f-${campo}`}>{rotulo}</Label>
                <Input
                  id={`f-${campo}`}
                  value={valor(campo)}
                  maxLength={campo === 'uf' ? 2 : undefined}
                  onChange={(e) => setForm((a) => ({ ...a, [campo]: e.target.value }))}
                />
              </div>
            ))}
          </FormSection>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={nome.trim().length < 2 || salvando}
            onClick={() => {
              const dados: Partial<Fornecedor> = { ...form };
              // Campo em branco vira NULL: string vazia num índice único faz
              // dois fornecedores sem CNPJ colidirem.
              for (const [chave, v] of Object.entries(dados)) {
                if (typeof v === 'string' && v.trim() === '') {
                  (dados as Record<string, unknown>)[chave] = null;
                }
              }
              aoSalvar(dados);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
