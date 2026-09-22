import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, Phone, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmarDialog, EmptyState } from '@/components/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { telefone as formatarTelefone } from '@/lib/format';
import type { Tables } from '@/lib/supabase';

import { excluirEmail, excluirTelefone, salvarEmail, salvarTelefone } from '../api';

type Telefone = Tables<'cliente_telefones'>;
type Email = Tables<'cliente_emails'>;

interface ClienteComContatos {
  id: string;
  tenant_id: string;
  cliente_telefones?: Telefone[];
  cliente_emails?: Email[];
}

/**
 * Contatos do cliente, com consentimento POR CANAL.
 *
 * A pessoa pode aceitar WhatsApp e recusar SMS; tratar isso como uma permissão
 * única é o que gera reclamação de spam — e, sob a LGPD, é o que derruba a base
 * legal do disparo inteiro.
 */
export function ContatosCliente({ cliente }: { cliente: ClienteComContatos }) {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [novoTelefone, setNovoTelefone] = useState(false);
  const [novoEmail, setNovoEmail] = useState(false);
  const [telefoneParaExcluir, setTelefoneParaExcluir] = useState<Telefone | null>(null);

  const podeEditar = can('clientes.alterar');
  const telefones = cliente.cliente_telefones ?? [];
  const emails = cliente.cliente_emails ?? [];

  const recarregar = () =>
    queryClient.invalidateQueries({ queryKey: ['cliente', cliente.id] });

  const erroPadrao = (erro: Error) =>
    toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' });

  const salvarTel = useMutation({
    mutationFn: salvarTelefone,
    onSuccess: () => {
      setNovoTelefone(false);
      void recarregar();
    },
    onError: erroPadrao,
  });

  const removerTel = useMutation({
    mutationFn: (t: Telefone) => excluirTelefone(t.id),
    onSuccess: () => {
      setTelefoneParaExcluir(null);
      void recarregar();
    },
    onError: erroPadrao,
  });

  const salvarMail = useMutation({
    mutationFn: salvarEmail,
    onSuccess: () => {
      setNovoEmail(false);
      void recarregar();
    },
    onError: erroPadrao,
  });

  const removerMail = useMutation({
    mutationFn: (e: Email) => excluirEmail(e.id),
    onSuccess: () => void recarregar(),
    onError: erroPadrao,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Telefones</CardTitle>
          <CardDescription>
            O consentimento é por canal: WhatsApp e SMS são autorizações separadas, e só valem
            se o cliente também tiver autorizado contato no cadastro acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {telefones.length === 0 && !novoTelefone ? (
            <EmptyState
              icone={Phone}
              titulo="Nenhum telefone"
              descricao="Sem telefone, este cliente fica fora de qualquer fila de recuperação."
              acao={
                podeEditar && (
                  <Button size="sm" onClick={() => setNovoTelefone(true)}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden />
                    Adicionar telefone
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {telefones.map((tel) => (
                <li key={tel.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium tabular">
                      {formatarTelefone(`${tel.ddi}${tel.numero}`)}
                      {tel.principal && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" aria-hidden />
                          principal
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">{tel.tipo}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {(
                      [
                        ['aceita_whatsapp', 'WhatsApp'],
                        ['aceita_sms', 'SMS'],
                        ['aceita_ligacao', 'Ligação'],
                      ] as const
                    ).map(([campo, rotulo]) => (
                      <label key={campo} className="flex items-center gap-1.5 text-xs">
                        <Switch
                          checked={tel[campo]}
                          disabled={!podeEditar || salvarTel.isPending}
                          onCheckedChange={(v) =>
                            salvarTel.mutate({ ...tel, [campo]: v } as never)
                          }
                          aria-label={`${rotulo} para ${tel.numero}`}
                        />
                        {rotulo}
                      </label>
                    ))}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={!podeEditar}
                      onClick={() => setTelefoneParaExcluir(tel)}
                      aria-label={`Remover ${tel.numero}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {novoTelefone ? (
            <NovoTelefone
              aoCancelar={() => setNovoTelefone(false)}
              aoSalvar={(dados) =>
                salvarTel.mutate({
                  ...dados,
                  cliente_id: cliente.id,
                  tenant_id: cliente.tenant_id,
                  principal: telefones.length === 0,
                } as never)
              }
              salvando={salvarTel.isPending}
            />
          ) : (
            telefones.length > 0 &&
            podeEditar && (
              <Button variant="outline" size="sm" onClick={() => setNovoTelefone(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Adicionar telefone
              </Button>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">E-mails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {emails.length > 0 && (
            <ul className="divide-y divide-border">
              {emails.map((mail) => (
                <li key={mail.id} className="flex items-center gap-3 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{mail.email}</span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={mail.aceita_contato}
                      disabled={!podeEditar}
                      onCheckedChange={(v) =>
                        salvarMail.mutate({ ...mail, aceita_contato: v } as never)
                      }
                    />
                    Aceita contato
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={!podeEditar}
                    onClick={() => removerMail.mutate(mail)}
                    aria-label={`Remover ${mail.email}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {novoEmail ? (
            <NovoEmail
              aoCancelar={() => setNovoEmail(false)}
              aoSalvar={(email) =>
                salvarMail.mutate({
                  email,
                  cliente_id: cliente.id,
                  tenant_id: cliente.tenant_id,
                  principal: emails.length === 0,
                } as never)
              }
              salvando={salvarMail.isPending}
            />
          ) : (
            podeEditar && (
              <Button variant="outline" size="sm" onClick={() => setNovoEmail(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Adicionar e-mail
              </Button>
            )
          )}
        </CardContent>
      </Card>

      <ConfirmarDialog
        aberto={telefoneParaExcluir !== null}
        aoMudarAberto={(v) => !v && setTelefoneParaExcluir(null)}
        titulo="Remover telefone?"
        descricao={
          <p>
            O número{' '}
            <strong className="text-foreground">
              {telefoneParaExcluir && formatarTelefone(telefoneParaExcluir.numero)}
            </strong>{' '}
            e as autorizações de canal dele serão removidos.
          </p>
        }
        rotuloConfirmar="Remover"
        carregando={removerTel.isPending}
        aoConfirmar={() => telefoneParaExcluir && removerTel.mutate(telefoneParaExcluir)}
      />
    </>
  );
}

function NovoTelefone({
  aoCancelar, aoSalvar, salvando,
}: {
  aoCancelar: () => void;
  aoSalvar: (dados: {
    ddi: string; numero: string; tipo: 'movel' | 'fixo' | 'comercial' | 'recado';
    aceita_whatsapp: boolean; aceita_sms: boolean; aceita_ligacao: boolean;
  }) => void;
  salvando: boolean;
}) {
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState<'movel' | 'fixo' | 'comercial' | 'recado'>('movel');
  const [whatsapp, setWhatsapp] = useState(true);
  const [sms, setSms] = useState(false);

  const digitos = numero.replace(/\D/g, '');
  const valido = digitos.length >= 10 && digitos.length <= 13;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor="novo-numero">Número com DDD</Label>
          <Input
            id="novo-numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="(11) 98765-4321"
            inputMode="numeric"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movel">Móvel</SelectItem>
              <SelectItem value="fixo">Fixo</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="recado">Recado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
          <MessageCircle className="h-4 w-4 text-success" aria-hidden />
          Aceita WhatsApp
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={sms} onCheckedChange={setSms} />
          Aceita SMS
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={!valido || salvando}
          onClick={() =>
            aoSalvar({
              ddi: '55',
              numero: digitos,
              tipo,
              aceita_whatsapp: whatsapp,
              aceita_sms: sms,
              aceita_ligacao: true,
            })
          }
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function NovoEmail({
  aoCancelar, aoSalvar, salvando,
}: {
  aoCancelar: () => void;
  aoSalvar: (email: string) => void;
  salvando: boolean;
}) {
  const [email, setEmail] = useState('');
  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="min-w-[14rem] flex-1 space-y-1.5">
        <Label htmlFor="novo-email">E-mail</Label>
        <Input
          id="novo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>
      <Button variant="ghost" size="sm" onClick={aoCancelar} disabled={salvando}>
        Cancelar
      </Button>
      <Button size="sm" disabled={!valido || salvando} onClick={() => aoSalvar(email.trim())}>
        Adicionar
      </Button>
    </div>
  );
}
