import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Pencil, Plus, ShieldAlert, Store as StoreIcon } from 'lucide-react';
import { useState } from 'react';

import { Carregando } from '@/components/comum/Carregando';
import { PageHeader } from '@/components/comum/PageHeader';
import { EmptyState, FormSection } from '@/components/data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { cpfCnpj } from '@/lib/format';
import { traduzirErro } from '@/lib/query/lista';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/supabase';

type Filial = Tables<'stores'>;

/** ISO: 1 = segunda … 7 = domingo. */
const DIAS = [
  [1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [7, 'Dom'],
] as const;

export default function FiliaisPage() {
  const { contexto, can, recarregarContexto } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const podeEditar = can('cadastros.filiais');

  const [emEdicao, setEmEdicao] = useState<Filial | null>(null);
  const [aberto, setAberto] = useState(false);

  const filiais = useQuery({
    queryKey: ['filiais'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*').order('codigo');
      if (error) throw traduzirErro(error);
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async (dados: Partial<Filial>) => {
      if (emEdicao) {
        const { error } = await supabase.from('stores').update(dados).eq('id', emEdicao.id);
        if (error) throw traduzirErro(error);
        return;
      }
      // O código é sequencial dentro da rede e legível: é como a loja aparece
      // em relatório e na numeração de venda.
      const proximo = Math.max(0, ...(filiais.data ?? []).map((f) => f.codigo)) + 1;
      const { error } = await supabase
        .from('stores')
        .insert({ ...dados, tenant_id: contexto!.tenant.id, codigo: proximo } as never);
      if (error) throw traduzirErro(error);
    },
    onSuccess: async () => {
      toast({ title: emEdicao ? 'Filial alterada' : 'Filial cadastrada' });
      setAberto(false);
      setEmEdicao(null);
      void queryClient.invalidateQueries({ queryKey: ['filiais'] });
      // O seletor de loja lê do contexto da sessão.
      await recarregarContexto();
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  if (filiais.isPending) return <Carregando texto="Carregando filiais…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Filiais"
        descricao="Preço, estoque, caixa e venda são por filial. Os dias úteis daqui entram no prazo das Ordens de Serviço."
        acoes={
          podeEditar && (
            <Button
              onClick={() => {
                setEmEdicao(null);
                setAberto(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Nova filial
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filiais.data?.map((filial) => {
          const certificadoVencido =
            filial.certificado_validade && new Date(filial.certificado_validade) < new Date();

          return (
            <Card key={filial.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium">
                      <StoreIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      {filial.nome_fantasia}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Filial {String(filial.codigo).padStart(2, '0')}
                      {filial.cidade && ` · ${filial.cidade}${filial.uf ? `/${filial.uf}` : ''}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!filial.ativo && <Badge variant="outline">inativa</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!podeEditar}
                      onClick={() => {
                        setEmEdicao(filial);
                        setAberto(true);
                      }}
                      aria-label={`Editar ${filial.nome_fantasia}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <dl className="space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">CNPJ</dt>
                    <dd className="tabular">{filial.cnpj ? cpfCnpj(filial.cnpj) : '—'}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <CalendarDays className="h-3 w-3" aria-hidden />
                      Dias úteis
                    </dt>
                    <dd>
                      {DIAS.filter(([n]) => filial.dias_uteis.includes(n))
                        .map(([, r]) => r)
                        .join(', ')}
                    </dd>
                  </div>
                </dl>

                {certificadoVencido && (
                  <Alert variant="destructive" className="py-2">
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                    <AlertDescription className="text-xs">
                      Certificado digital vencido em{' '}
                      {new Date(filial.certificado_validade as string).toLocaleDateString('pt-BR')}
                      — esta filial não emite nota fiscal.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filiais.data?.length === 0 && (
          <EmptyState icone={StoreIcon} titulo="Nenhuma filial" className="md:col-span-2 xl:col-span-3" />
        )}
      </div>

      <FilialDialog
        aberto={aberto}
        filial={emEdicao}
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

function FilialDialog({
  aberto, filial, aoFechar, aoSalvar, salvando,
}: {
  aberto: boolean;
  filial: Filial | null;
  aoFechar: () => void;
  aoSalvar: (dados: Partial<Filial>) => void;
  salvando: boolean;
}) {
  const [form, setForm] = useState<Partial<Filial>>({});
  const chave = filial?.id ?? 'nova';

  const valor = (campo: keyof Filial) => String(form[campo] ?? filial?.[campo] ?? '');
  const diasUteis = (form.dias_uteis ?? filial?.dias_uteis ?? [1, 2, 3, 4, 5]) as number[];
  const nome = valor('nome_fantasia');

  return (
    <Dialog key={chave} open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{filial ? 'Editar filial' : 'Nova filial'}</DialogTitle>
          <DialogDescription>
            Certificado digital e licença são por filial, não da rede — uma loja pode emitir nota
            enquanto outra está com o certificado vencido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <FormSection titulo="Identificação">
            {(
              [
                ['nome_fantasia', 'Nome fantasia'],
                ['razao_social', 'Razão social'],
                ['cnpj', 'CNPJ'],
                ['inscricao_estadual', 'Inscrição estadual'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={`l-${campo}`}>{rotulo}</Label>
                <Input
                  id={`l-${campo}`}
                  value={valor(campo)}
                  onChange={(e) => setForm((a) => ({ ...a, [campo]: e.target.value }))}
                />
              </div>
            ))}
          </FormSection>

          <FormSection
            titulo="Dias de funcionamento"
            descricao="Entram no cálculo de prazo das O.S. Uma loja de shopping que abre domingo tem prazo diferente da loja de rua."
            colunas={1}
          >
            <div className="flex flex-wrap gap-3">
              {DIAS.map(([numero, rotulo]) => (
                <label key={numero} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={diasUteis.includes(numero)}
                    onCheckedChange={(v) =>
                      setForm((a) => ({
                        ...a,
                        dias_uteis: (v === true
                          ? [...diasUteis, numero]
                          : diasUteis.filter((d) => d !== numero)
                        ).sort((x, y) => x - y),
                      }))
                    }
                  />
                  {rotulo}
                </label>
              ))}
            </div>
            {diasUteis.length === 0 && (
              <p className="text-xs text-atraso">
                Sem nenhum dia útil, o prazo de qualquer O.S. desta filial fica indefinido.
              </p>
            )}
          </FormSection>

          <FormSection titulo="Endereço e fiscal" colunas={3}>
            {(
              [
                ['cep', 'CEP'],
                ['endereco', 'Endereço'],
                ['numero', 'Número'],
                ['bairro', 'Bairro'],
                ['cidade', 'Cidade'],
                ['uf', 'UF'],
                ['telefone', 'Telefone'],
                ['email', 'E-mail'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={`l-${campo}`}>{rotulo}</Label>
                <Input
                  id={`l-${campo}`}
                  value={valor(campo)}
                  maxLength={campo === 'uf' ? 2 : undefined}
                  onChange={(e) => setForm((a) => ({ ...a, [campo]: e.target.value }))}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="l-certificado">Validade do certificado digital</Label>
              <Input
                id="l-certificado"
                type="date"
                value={valor('certificado_validade')}
                onChange={(e) =>
                  setForm((a) => ({ ...a, certificado_validade: e.target.value || null }))
                }
              />
            </div>
          </FormSection>

          {filial && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={Boolean(form.ativo ?? filial.ativo)}
                onCheckedChange={(v) => setForm((a) => ({ ...a, ativo: v }))}
              />
              Filial ativa
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={nome.trim().length < 2 || diasUteis.length === 0 || salvando}
            onClick={() => {
              const dados: Partial<Filial> = { ...form, dias_uteis: diasUteis };
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
