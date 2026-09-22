import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/comum/PageHeader';
import { Carregando } from '@/components/comum/Carregando';
import { ConfirmarDialog, EmptyState } from '@/components/data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { ALL_PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions/catalog';
import { cn } from '@/lib/utils';

import {
  criarModelo, excluirModelo, listarModelos, salvarChaves,
  type ModeloComChaves,
} from '../api';
import { MatrizPermissoes } from '../components/MatrizPermissoes';

export default function PermissoesPage() {
  const { contexto, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const podeGerenciar = can('permissoes.gerenciar_modelos');

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [chaves, setChaves] = useState<Set<PermissionKey>>(new Set());
  const [novoAberto, setNovoAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<ModeloComChaves | null>(null);

  const modelos = useQuery({ queryKey: ['modelos-permissao'], queryFn: listarModelos });

  const selecionado = useMemo(
    () => modelos.data?.find((m) => m.id === selecionadoId) ?? modelos.data?.[0],
    [modelos.data, selecionadoId],
  );

  // Ao trocar de modelo, a matriz recarrega as chaves daquele modelo. Sem isto,
  // editar um modelo e clicar em outro levaria as marcações junto.
  useEffect(() => {
    if (selecionado) setChaves(new Set(selecionado.chaves));
  }, [selecionado?.id, selecionado?.chaves]); // eslint-disable-line react-hooks/exhaustive-deps

  const alterado = useMemo(() => {
    if (!selecionado) return false;
    if (selecionado.chaves.length !== chaves.size) return true;
    return selecionado.chaves.some((c) => !chaves.has(c));
  }, [selecionado, chaves]);

  const salvar = useMutation({
    mutationFn: () => salvarChaves(selecionado!.id, selecionado!.chaves, [...chaves]),
    onSuccess: ({ adicionadas, removidas }) => {
      toast({
        title: 'Permissões salvas',
        description: `${adicionadas} concedida(s), ${removidas} removida(s).`,
      });
      void queryClient.invalidateQueries({ queryKey: ['modelos-permissao'] });
      // Quem está editando pode ter mexido no próprio acesso.
      void queryClient.invalidateQueries({ queryKey: ['sessao'] });
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  const criar = useMutation({
    mutationFn: (dados: { nome: string; descricao: string }) =>
      criarModelo(contexto!.tenant.id, dados),
    onSuccess: (modelo) => {
      toast({ title: 'Modelo criado', description: 'Marque as permissões e salve.' });
      setNovoAberto(false);
      setSelecionadoId(modelo.id);
      void queryClient.invalidateQueries({ queryKey: ['modelos-permissao'] });
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível criar', description: erro.message, variant: 'destructive' }),
  });

  const excluir = useMutation({
    mutationFn: (modelo: ModeloComChaves) => excluirModelo(modelo.id),
    onSuccess: () => {
      toast({ title: 'Modelo excluído' });
      setParaExcluir(null);
      setSelecionadoId(null);
      void queryClient.invalidateQueries({ queryKey: ['modelos-permissao'] });
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível excluir', description: erro.message, variant: 'destructive' }),
  });

  if (modelos.isPending) return <Carregando texto="Carregando modelos de permissão…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Permissões"
        descricao={`${ALL_PERMISSION_KEYS.length} permissões por ação de negócio, organizadas por módulo. Um usuário pode receber mais de um modelo — o acesso é a união das chaves.`}
        acoes={
          podeGerenciar && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo modelo
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-1">
          {modelos.data?.map((modelo) => (
            <button
              key={modelo.id}
              type="button"
              onClick={() => setSelecionadoId(modelo.id)}
              className={cn(
                'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                modelo.id === selecionado?.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/60',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {modelo.is_owner && <Lock className="h-3 w-3 shrink-0" aria-hidden />}
                  {modelo.nome}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular">
                    {modelo.is_owner ? ALL_PERMISSION_KEYS.length : modelo.chaves.length} chaves
                  </span>
                  {modelo.usuarios > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Users className="h-3 w-3" aria-hidden />
                      <span className="tabular">{modelo.usuarios}</span>
                    </span>
                  )}
                </p>
              </div>
              {!modelo.ativo && <Badge variant="outline">inativo</Badge>}
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-4">
          {!selecionado ? (
            <EmptyState
              icone={ShieldCheck}
              titulo="Nenhum modelo de permissão"
              descricao="Crie um modelo para definir o que cada função enxerga e pode fazer."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-semibold">
                    {selecionado.nome}
                    {selecionado.is_owner && <Badge variant="secondary">acesso total</Badge>}
                  </h2>
                  {selecionado.descricao && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{selecionado.descricao}</p>
                  )}
                </div>

                {podeGerenciar && !selecionado.is_owner && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setParaExcluir(selecionado)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                      Excluir
                    </Button>
                    <Button
                      size="sm"
                      disabled={!alterado || salvar.isPending}
                      onClick={() => salvar.mutate()}
                    >
                      {salvar.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      )}
                      {alterado ? 'Salvar alterações' : 'Sem alterações'}
                    </Button>
                  </div>
                )}
              </div>

              {selecionado.is_owner ? (
                <Alert>
                  <Lock className="h-4 w-4" aria-hidden />
                  <AlertDescription>
                    O modelo de proprietário concede tudo e não é editável — nem por quem
                    administra permissões. É a trava que impede a rede de se trancar fora do
                    próprio sistema ao ajustar acessos. Para dar acesso amplo a outra pessoa,
                    duplique o modelo de gerente.
                  </AlertDescription>
                </Alert>
              ) : (
                selecionado.usuarios > 0 && (
                  <Alert>
                    <Users className="h-4 w-4" aria-hidden />
                    <AlertDescription>
                      {selecionado.usuarios} usuário(s) usam este modelo. A mudança vale para
                      todos assim que for salva.
                    </AlertDescription>
                  </Alert>
                )
              )}

              <MatrizPermissoes
                selecionadas={
                  selecionado.is_owner ? new Set(ALL_PERMISSION_KEYS) : chaves
                }
                aoMudar={setChaves}
                somenteLeitura={!podeGerenciar || selecionado.is_owner}
              />
            </>
          )}
        </div>
      </div>

      <NovoModeloDialog
        aberto={novoAberto}
        aoFechar={() => setNovoAberto(false)}
        aoCriar={(dados) => criar.mutate(dados)}
        salvando={criar.isPending}
      />

      <ConfirmarDialog
        aberto={paraExcluir !== null}
        aoMudarAberto={(v) => !v && setParaExcluir(null)}
        titulo="Excluir modelo de permissão?"
        descricao={
          <>
            <p>
              <strong className="text-foreground">{paraExcluir?.nome}</strong> e as{' '}
              {paraExcluir?.chaves.length} permissões dele serão removidos.
            </p>
            {(paraExcluir?.usuarios ?? 0) > 0 && (
              <p className="text-destructive">
                {paraExcluir?.usuarios} usuário(s) perdem este acesso imediatamente. Se for o
                único modelo deles, ficam sem acesso a nada.
              </p>
            )}
          </>
        }
        confirmacaoTexto={(paraExcluir?.usuarios ?? 0) > 0 ? paraExcluir?.nome : undefined}
        rotuloConfirmar="Excluir modelo"
        carregando={excluir.isPending}
        aoConfirmar={() => paraExcluir && excluir.mutate(paraExcluir)}
      />
    </div>
  );
}

function NovoModeloDialog({
  aberto, aoFechar, aoCriar, salvando,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (dados: { nome: string; descricao: string }) => void;
  salvando: boolean;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (!aberto) {
      setNome('');
      setDescricao('');
    }
  }, [aberto]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo modelo de permissão</DialogTitle>
          <DialogDescription>
            Crie o modelo e marque as permissões em seguida. Ele nasce sem nenhuma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-modelo">Nome</Label>
            <Input
              id="nome-modelo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Caixa, Consultor sênior"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao-modelo">
              Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="descricao-modelo"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que esta função faz no dia a dia."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={nome.trim().length < 2 || salvando}
            onClick={() => aoCriar({ nome: nome.trim(), descricao: descricao.trim() })}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Criar modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
