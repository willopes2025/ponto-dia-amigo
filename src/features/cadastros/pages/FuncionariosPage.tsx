import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Pencil, Plus, UserRound } from 'lucide-react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { cpfCnpj, telefone } from '@/lib/format';
import { listar, termoBusca, traduzirErro } from '@/lib/query/lista';
import { useListaParams } from '@/lib/query/useListaParams';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/supabase';

type Funcionario = Tables<'funcionarios'>;

const SEM_FILIAL = '__sem__';

export default function FuncionariosPage() {
  const { contexto, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const podeEditar = can('cadastros.funcionarios');

  const lista = useListaParams({ loja: undefined as string | undefined });
  const [emEdicao, setEmEdicao] = useState<Funcionario | null>(null);
  const [aberto, setAberto] = useState(false);

  const filiais = contexto?.stores ?? [];

  const consulta = useQuery({
    queryKey: ['funcionarios', lista.pagina, lista.busca, lista.ordenacao, lista.filtros],
    queryFn: () => {
      let q = supabase.from('funcionarios').select('*', { count: 'exact' });
      const termo = termoBusca(lista.busca);
      if (termo) q = q.ilike('nome', termo);
      if (lista.filtros.loja) q = q.eq('store_id', lista.filtros.loja);
      return listar<Funcionario>(q as never, {
        pagina: lista.pagina,
        porPagina: lista.porPagina,
        ordenacao: lista.ordenacao ?? { campo: 'nome', direcao: 'asc' },
      });
    },
  });

  const salvar = useMutation({
    mutationFn: async (dados: Partial<Funcionario>) => {
      if (emEdicao) {
        const { error } = await supabase.from('funcionarios').update(dados).eq('id', emEdicao.id);
        if (error) throw traduzirErro(error);
      } else {
        const { error } = await supabase
          .from('funcionarios')
          .insert({ ...dados, tenant_id: contexto!.tenant.id } as never);
        if (error) throw traduzirErro(error);
      }
    },
    onSuccess: () => {
      toast({ title: emEdicao ? 'Funcionário alterado' : 'Funcionário cadastrado' });
      setAberto(false);
      setEmEdicao(null);
      void queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  const colunas: Coluna<Funcionario>[] = [
    {
      chave: 'nome',
      titulo: 'Funcionário',
      ordenavel: true,
      celula: (f) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{f.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {f.funcao ?? 'sem função definida'}
          </p>
        </div>
      ),
    },
    {
      chave: 'cpf',
      titulo: 'CPF',
      ocultarNoMobile: true,
      celula: (f) =>
        f.cpf ? <span className="tabular">{cpfCnpj(f.cpf)}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      chave: 'telefone',
      titulo: 'Telefone',
      ocultarNoMobile: true,
      celula: (f) =>
        f.telefone_movel ? (
          <span className="tabular">{telefone(f.telefone_movel)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      chave: 'store_id',
      titulo: 'Filial',
      ocultarNoMobile: true,
      celula: (f) =>
        f.store_id ? (
          filiais.find((l) => l.id === f.store_id)?.nome_fantasia ?? '—'
        ) : (
          <span className="text-muted-foreground">toda a rede</span>
        ),
    },
    {
      chave: 'ativo',
      titulo: 'Ativo',
      alinhamento: 'centro',
      celula: (f) =>
        f.ativo ? (
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            ativo
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">desligado</span>
        ),
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
          aria-label={`Editar ${f.nome}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Funcionários"
        descricao="Existe funcionário sem login — o montador do laboratório, por exemplo. A comissão é do funcionário, não do usuário do sistema."
        acoes={
          podeEditar && (
            <Button
              onClick={() => {
                setEmEdicao(null);
                setAberto(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo funcionário
            </Button>
          )
        }
      />

      <FilterBar busca={lista.busca} aoBuscar={lista.buscar} placeholder="Buscar pelo nome…">
        {filiais.length > 1 && (
          <Select
            value={lista.filtros.loja ?? SEM_FILIAL}
            onValueChange={(v) => lista.filtrar('loja', v === SEM_FILIAL ? undefined : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_FILIAL}>Todas as filiais</SelectItem>
              {filiais.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
            icone={UserRound}
            titulo="Nenhum funcionário"
            descricao="O funcionário é quem a venda e a comissão referenciam."
          />
        }
      />

      <FuncionarioDialog
        aberto={aberto}
        funcionario={emEdicao}
        filiais={filiais.map((f) => ({ id: f.id, nome: f.nome_fantasia }))}
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

function FuncionarioDialog({
  aberto, funcionario, filiais, aoFechar, aoSalvar, salvando,
}: {
  aberto: boolean;
  funcionario: Funcionario | null;
  filiais: { id: string; nome: string }[];
  aoFechar: () => void;
  aoSalvar: (dados: Partial<Funcionario>) => void;
  salvando: boolean;
}) {
  const [form, setForm] = useState<Partial<Funcionario>>({});
  const chave = funcionario?.id ?? 'novo';
  const valor = (campo: keyof Funcionario) => String(form[campo] ?? funcionario?.[campo] ?? '');
  const nome = valor('nome');

  return (
    <Dialog key={chave} open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{funcionario ? 'Editar funcionário' : 'Novo funcionário'}</DialogTitle>
          <DialogDescription>
            Sem filial, o funcionário vale para toda a rede — o caso de quem trabalha no
            laboratório central.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <FormSection titulo="Identificação">
            {(
              [
                ['nome', 'Nome'],
                ['funcao', 'Função'],
                ['cpf', 'CPF'],
                ['rg', 'RG'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={`fn-${campo}`}>{rotulo}</Label>
                <Input
                  id={`fn-${campo}`}
                  value={valor(campo)}
                  onChange={(e) => setForm((a) => ({ ...a, [campo]: e.target.value }))}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Filial</Label>
              <Select
                value={String(form.store_id ?? funcionario?.store_id ?? SEM_FILIAL)}
                onValueChange={(v) =>
                  setForm((a) => ({ ...a, store_id: v === SEM_FILIAL ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_FILIAL}>Toda a rede</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fn-admissao">Admissão</Label>
              <Input
                id="fn-admissao"
                type="date"
                value={valor('data_admissao')}
                onChange={(e) =>
                  setForm((a) => ({ ...a, data_admissao: e.target.value || null }))
                }
              />
            </div>
          </FormSection>

          <FormSection titulo="Contato" colunas={3}>
            {(
              [
                ['telefone_movel', 'Celular'],
                ['telefone_fixo', 'Telefone fixo'],
                ['email', 'E-mail'],
                ['cidade', 'Cidade'],
                ['uf', 'UF'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={`fn-${campo}`}>{rotulo}</Label>
                <Input
                  id={`fn-${campo}`}
                  value={valor(campo)}
                  maxLength={campo === 'uf' ? 2 : undefined}
                  onChange={(e) => setForm((a) => ({ ...a, [campo]: e.target.value }))}
                />
              </div>
            ))}
          </FormSection>

          {funcionario && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={Boolean(form.ativo ?? funcionario.ativo)}
                onCheckedChange={(v) => setForm((a) => ({ ...a, ativo: v }))}
              />
              Funcionário ativo
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={nome.trim().length < 2 || salvando}
            onClick={() => {
              const dados: Partial<Funcionario> = { ...form };
              for (const [c, v] of Object.entries(dados)) {
                if (typeof v === 'string' && v.trim() === '') {
                  (dados as Record<string, unknown>)[c] = null;
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
