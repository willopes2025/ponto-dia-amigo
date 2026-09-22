import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Mail, Store as StoreIcon, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/comum/PageHeader';
import { Carregando } from '@/components/comum/Carregando';
import { ConfirmarDialog, EmptyState } from '@/components/data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { listarModelos } from '@/features/permissoes/api';
import { useAuth } from '@/lib/auth';
import { iniciais } from '@/lib/format';

import {
  alterarUsuario, cancelarConvite, criarConvite, definirFiliais, definirModelos,
  listarConvites, listarUsuarios, type Convite, type UsuarioNaLista,
} from '../api';

export default function UsuariosPage() {
  const { contexto, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const podeGerenciar = can('usuarios.alterar');
  const podeConvidar = can('usuarios.incluir');
  const podeAtribuirModelos = can('permissoes.atribuir_modelos');

  const [convidando, setConvidando] = useState(false);
  const [conviteParaCancelar, setConviteParaCancelar] = useState<Convite | null>(null);

  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: listarUsuarios });
  const convites = useQuery({
    queryKey: ['convites'],
    queryFn: listarConvites,
    enabled: can('usuarios.consultar'),
  });
  const modelos = useQuery({ queryKey: ['modelos-permissao'], queryFn: listarModelos });

  const filiais = contexto?.stores ?? [];

  const erroPadrao = (erro: Error) =>
    toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' });

  const recarregar = () => {
    void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    void queryClient.invalidateQueries({ queryKey: ['convites'] });
  };

  const convidar = useMutation({
    mutationFn: criarConvite,
    onSuccess: () => {
      toast({
        title: 'Convite criado',
        description: 'A pessoa entra na sua rede ao se cadastrar com este e-mail.',
      });
      setConvidando(false);
      recarregar();
    },
    onError: erroPadrao,
  });

  const cancelar = useMutation({
    mutationFn: (c: Convite) => cancelarConvite(c.id),
    onSuccess: () => {
      setConviteParaCancelar(null);
      recarregar();
    },
    onError: erroPadrao,
  });

  const mudarFiliais = useMutation({
    mutationFn: ({ usuario, filiaisNovas }: { usuario: UsuarioNaLista; filiaisNovas: string[] }) =>
      definirFiliais(usuario.id, filiaisNovas, usuario.user_stores.map((s) => s.store_id)),
    onSuccess: recarregar,
    onError: erroPadrao,
  });

  const mudarModelos = useMutation({
    mutationFn: ({ usuario, modelosNovos }: { usuario: UsuarioNaLista; modelosNovos: string[] }) =>
      definirModelos(
        usuario.id,
        modelosNovos,
        usuario.user_permission_profiles.map((m) => m.permission_profile_id),
      ),
    onSuccess: recarregar,
    onError: erroPadrao,
  });

  const mudarAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => alterarUsuario(id, { ativo }),
    onSuccess: recarregar,
    onError: erroPadrao,
  });

  if (usuarios.isPending) return <Carregando texto="Carregando usuários…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Usuários"
        descricao="Quem entra no sistema, em quais filiais, com quais modelos de permissão."
        acoes={
          podeConvidar && (
            <Button onClick={() => setConvidando(true)}>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Convidar usuário
            </Button>
          )
        }
      />

      {(convites.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" aria-hidden />
              Convites pendentes
            </CardTitle>
            <CardDescription>
              A pessoa entra nesta rede ao se cadastrar com o e-mail convidado — já com as filiais
              e os modelos definidos aqui. Sem convite, um cadastro cria uma rede nova.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {convites.data?.map((convite) => (
                <li key={convite.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{convite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {convite.nome ? `${convite.nome} · ` : ''}
                      expira em {new Date(convite.expira_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {podeConvidar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setConviteParaCancelar(convite)}
                      aria-label={`Cancelar convite de ${convite.email}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {usuarios.data?.map((usuario) => {
          const filiaisDoUsuario = usuario.user_stores.map((s) => s.store_id);
          const modelosDoUsuario = usuario.user_permission_profiles.map(
            (m) => m.permission_profile_id,
          );
          const ehProprietario = modelos.data?.some(
            (m) => m.is_owner && modelosDoUsuario.includes(m.id),
          );
          const souEu = usuario.id === contexto?.profile.id;

          return (
            <Card key={usuario.id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {iniciais(usuario.nome)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {usuario.nome}
                        {souEu && <Badge variant="secondary">você</Badge>}
                        {ehProprietario && <Badge variant="secondary">proprietário</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={usuario.ativo}
                      // Desativar o próprio acesso tranca a pessoa para fora na
                      // hora; a checagem existe para evitar o clique distraído.
                      disabled={!podeGerenciar || souEu || mudarAtivo.isPending}
                      onCheckedChange={(ativo) => mudarAtivo.mutate({ id: usuario.id, ativo })}
                    />
                    Ativo
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <StoreIcon className="h-3 w-3" aria-hidden />
                      Filiais
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {filiais.map((filial) => (
                        <label key={filial.id} className="flex items-center gap-1.5 text-sm">
                          <Checkbox
                            checked={filiaisDoUsuario.includes(filial.id)}
                            disabled={!podeGerenciar || mudarFiliais.isPending}
                            onCheckedChange={(v) =>
                              mudarFiliais.mutate({
                                usuario,
                                filiaisNovas: v === true
                                  ? [...filiaisDoUsuario, filial.id]
                                  : filiaisDoUsuario.filter((f) => f !== filial.id),
                              })
                            }
                          />
                          {filial.nome_fantasia}
                        </label>
                      ))}
                    </div>
                    {filiaisDoUsuario.length === 0 && (
                      <p className="text-xs text-atraso">
                        Sem filial, esta pessoa não enxerga venda, estoque nem caixa de lugar nenhum.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modelos de permissão
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {(modelos.data ?? [])
                        .filter((m) => !m.is_owner)
                        .map((modelo) => (
                          <label key={modelo.id} className="flex items-center gap-1.5 text-sm">
                            <Checkbox
                              checked={modelosDoUsuario.includes(modelo.id)}
                              disabled={
                                !podeAtribuirModelos || ehProprietario || mudarModelos.isPending
                              }
                              onCheckedChange={(v) =>
                                mudarModelos.mutate({
                                  usuario,
                                  modelosNovos: v === true
                                    ? [...modelosDoUsuario, modelo.id]
                                    : modelosDoUsuario.filter((m) => m !== modelo.id),
                                })
                              }
                            />
                            {modelo.nome}
                          </label>
                        ))}
                    </div>
                    {ehProprietario && (
                      <p className="text-xs text-muted-foreground">
                        O proprietário tem acesso total; modelos adicionais não mudam nada.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {usuarios.data?.length === 0 && (
          <EmptyState
            icone={UserPlus}
            titulo="Nenhum usuário"
            descricao="Convide as pessoas da equipe para que cada uma entre com o próprio acesso."
          />
        )}
      </div>

      <ConviteDialog
        aberto={convidando}
        aoFechar={() => setConvidando(false)}
        filiais={filiais.map((f) => ({ id: f.id, nome: f.nome_fantasia }))}
        modelos={(modelos.data ?? []).filter((m) => !m.is_owner).map((m) => ({ id: m.id, nome: m.nome }))}
        salvando={convidar.isPending}
        aoConvidar={(dados) =>
          convidar.mutate({
            ...dados,
            tenantId: contexto!.tenant.id,
            criadoPor: contexto!.profile.id,
          })
        }
      />

      <ConfirmarDialog
        aberto={conviteParaCancelar !== null}
        aoMudarAberto={(v) => !v && setConviteParaCancelar(null)}
        titulo="Cancelar convite?"
        descricao={
          <p>
            O convite para{' '}
            <strong className="text-foreground">{conviteParaCancelar?.email}</strong> deixa de
            valer. Se a pessoa se cadastrar depois disso, criará uma rede própria em vez de
            entrar na sua.
          </p>
        }
        rotuloConfirmar="Cancelar convite"
        carregando={cancelar.isPending}
        aoConfirmar={() => conviteParaCancelar && cancelar.mutate(conviteParaCancelar)}
      />
    </div>
  );
}

function ConviteDialog({
  aberto, aoFechar, filiais, modelos, salvando, aoConvidar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  filiais: { id: string; nome: string }[];
  modelos: { id: string; nome: string }[];
  salvando: boolean;
  aoConvidar: (dados: {
    email: string; nome: string; modelos: string[]; filiais: string[]; limiteDesconto: number;
  }) => void;
}) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [modelosSelecionados, setModelos] = useState<string[]>([]);
  const [filiaisSelecionadas, setFiliais] = useState<string[]>([]);
  const [limite, setLimite] = useState('0');

  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const valido = emailValido && filiaisSelecionadas.length > 0 && modelosSelecionados.length > 0;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          setEmail('');
          setNome('');
          setModelos([]);
          setFiliais([]);
          setLimite('0');
          aoFechar();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>
            A pessoa se cadastra com este e-mail e entra direto na sua rede, com o acesso definido
            aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="convite-email">E-mail</Label>
            <Input
              id="convite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="convite-nome">
              Nome <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="convite-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Filiais que a pessoa acessa</Label>
            <div className="flex flex-wrap gap-3">
              {filiais.map((filial) => (
                <label key={filial.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={filiaisSelecionadas.includes(filial.id)}
                    onCheckedChange={(v) =>
                      setFiliais((atual) =>
                        v === true ? [...atual, filial.id] : atual.filter((f) => f !== filial.id),
                      )
                    }
                  />
                  {filial.nome}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modelos de permissão</Label>
            <div className="flex flex-wrap gap-3">
              {modelos.map((modelo) => (
                <label key={modelo.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={modelosSelecionados.includes(modelo.id)}
                    onCheckedChange={(v) =>
                      setModelos((atual) =>
                        v === true ? [...atual, modelo.id] : atual.filter((m) => m !== modelo.id),
                      )
                    }
                  />
                  {modelo.nome}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="convite-limite">Limite de desconto (%)</Label>
            <Input
              id="convite-limite"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
            />
          </div>

          <Alert>
            <AlertDescription>
              O convite não concede o perfil de proprietário, mesmo que alguém tente — é a trava
              que impede a rede de ganhar um segundo dono por engano.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || salvando}
            onClick={() =>
              aoConvidar({
                email,
                nome,
                modelos: modelosSelecionados,
                filiais: filiaisSelecionadas,
                limiteDesconto: Number(limite) || 0,
              })
            }
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Criar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
