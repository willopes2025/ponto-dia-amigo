import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/components/comum/PageHeader';
import { Carregando } from '@/components/comum/Carregando';
import { FormSection } from '@/components/data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { listarOpcoes } from '@/features/cadastros/api';
import { listarClientes } from '@/features/clientes/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

import { atualizarReceita, criarReceita } from '../api';
import { receitaSchema, type ReceitaForm } from '../schemas';

/** Campos de um olho, na ordem em que o balcão lê a receita de papel. */
const CAMPOS_OLHO = [
  { sufixo: 'esferico', rotulo: 'Esférico', passo: '0.25', dica: 'Passos de 0,25' },
  { sufixo: 'cilindrico', rotulo: 'Cilíndrico', passo: '0.25' },
  { sufixo: 'eixo', rotulo: 'Eixo', passo: '1', dica: '0° a 180°' },
  { sufixo: 'adicao', rotulo: 'Adição', passo: '0.25' },
  { sufixo: 'dnp', rotulo: 'DNP', passo: '0.5' },
  { sufixo: 'altura', rotulo: 'Altura', passo: '0.5' },
] as const;

export default function ReceitaFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const novo = !id || id === 'nova';
  const navigate = useNavigate();
  const { contexto, storeAtual } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const receita = useQuery({
    queryKey: ['receita', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receitas')
        .select('*, clientes ( nome, codigo )')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !novo,
  });

  const medicos = useQuery({
    queryKey: ['cadastro-opcoes', 'medicos'],
    queryFn: () => listarOpcoes('medicos'),
    staleTime: 5 * 60_000,
  });

  // Os clientes do seletor vêm em página única: para redes grandes isto vira um
  // campo de busca com consulta ao servidor, na fase em que a venda entra.
  const clientes = useQuery({
    queryKey: ['clientes-para-receita'],
    queryFn: () =>
      listarClientes({ pagina: 1, porPagina: 200, filtros: {}, ordenacao: { campo: 'nome', direcao: 'asc' } }),
    staleTime: 60_000,
  });

  const form = useForm<ReceitaForm>({
    resolver: zodResolver(receitaSchema),
    values: receita.data
      ? ({
          cliente_id: receita.data.cliente_id,
          tipo: receita.data.tipo,
          medico_id: receita.data.medico_id ?? '',
          medico_nome: receita.data.medico_nome ?? '',
          data_receita: receita.data.data_receita,
          validade: receita.data.validade,
          od_esferico: receita.data.od_esferico ?? '',
          od_cilindrico: receita.data.od_cilindrico ?? '',
          od_eixo: receita.data.od_eixo ?? '',
          od_adicao: receita.data.od_adicao ?? '',
          od_dnp: receita.data.od_dnp ?? '',
          od_altura: receita.data.od_altura ?? '',
          oe_esferico: receita.data.oe_esferico ?? '',
          oe_cilindrico: receita.data.oe_cilindrico ?? '',
          oe_eixo: receita.data.oe_eixo ?? '',
          oe_adicao: receita.data.oe_adicao ?? '',
          oe_dnp: receita.data.oe_dnp ?? '',
          oe_altura: receita.data.oe_altura ?? '',
          observacoes: receita.data.observacoes ?? '',
        } as ReceitaForm)
      : ({
          cliente_id: searchParams.get('cliente') ?? '',
          tipo: 'oculos',
          medico_id: '',
          medico_nome: '',
          data_receita: new Date().toISOString().slice(0, 10),
          validade: '',
        } as ReceitaForm),
  });

  const tipo = form.watch('tipo');
  const temAdicao = Boolean(Number(form.watch('od_adicao')) || Number(form.watch('oe_adicao')));

  const salvar = useMutation({
    mutationFn: async (dados: ReceitaForm) => {
      const numero = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));

      const paraBanco = {
        tenant_id: contexto!.tenant.id,
        store_id: storeAtual?.id ?? null,
        cliente_id: dados.cliente_id,
        tipo: dados.tipo,
        medico_id: dados.medico_id || null,
        medico_nome: dados.medico_nome || null,
        data_receita: dados.data_receita,
        ...(dados.validade ? { validade: dados.validade } : {}),
        od_esferico: numero(dados.od_esferico),
        od_cilindrico: numero(dados.od_cilindrico),
        od_eixo: numero(dados.od_eixo),
        od_adicao: numero(dados.od_adicao),
        od_dnp: numero(dados.od_dnp),
        od_altura: numero(dados.od_altura),
        oe_esferico: numero(dados.oe_esferico),
        oe_cilindrico: numero(dados.oe_cilindrico),
        oe_eixo: numero(dados.oe_eixo),
        oe_adicao: numero(dados.oe_adicao),
        oe_dnp: numero(dados.oe_dnp),
        oe_altura: numero(dados.oe_altura),
        observacoes: dados.observacoes || null,
      };

      return novo
        ? criarReceita(paraBanco as never)
        : atualizarReceita(id as string, paraBanco as never);
    },
    onSuccess: () => {
      toast({ title: novo ? 'Receita cadastrada' : 'Receita alterada' });
      void queryClient.invalidateQueries({ queryKey: ['receitas'] });
      void queryClient.invalidateQueries({ queryKey: ['receitas-vencidas'] });
      navigate('/receitas');
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  if (!novo && receita.isPending) return <Carregando texto="Carregando receita…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={novo ? 'Nova receita' : `Receita ${receita.data?.codigo}`}
        descricao="Os graus seguem a grade real de lentes: passos de 0,25 dioptria, e eixo obrigatório quando há cilíndrico."
        acoes={
          <Button variant="outline" onClick={() => navigate('/receitas')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Voltar
          </Button>
        }
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((dados) => salvar.mutate(dados))}
          className="space-y-6"
          noValidate
        >
          <Card>
            <CardContent className="space-y-8 pt-6">
              <FormSection titulo="Identificação">
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={clientes.isPending ? 'Carregando…' : 'Selecione o cliente'}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(clientes.data?.linhas ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.codigo} · {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="oculos">Óculos</SelectItem>
                          <SelectItem value="lente_contato">Lente de contato</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medico_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prescritor cadastrado</FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(medicos.data ?? []).map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medico_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ou escreva o nome</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Dra. Helena Prado" />
                      </FormControl>
                      <FormDescription>
                        Receita trazida de fora não deve travar o atendimento por falta de cadastro.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_receita"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da receita</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Validade{' '}
                        <span className="font-normal text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormDescription>Em branco, assume um ano a partir da data.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              {(['od', 'oe'] as const).map((olho) => (
                <FormSection
                  key={olho}
                  titulo={olho === 'od' ? 'Olho direito (OD)' : 'Olho esquerdo (OE)'}
                  colunas={3}
                >
                  {CAMPOS_OLHO.filter(
                    // DNP e altura são de óculos; lente de contato usa curva base
                    // e diâmetro, que entram com o cadastro de LC.
                    (campo) =>
                      tipo === 'oculos' || (campo.sufixo !== 'dnp' && campo.sufixo !== 'altura'),
                  ).map((campo) => (
                    <FormField
                      key={campo.sufixo}
                      control={form.control}
                      name={`${olho}_${campo.sufixo}` as keyof ReceitaForm}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{campo.rotulo}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={campo.passo}
                              inputMode="decimal"
                              {...field}
                              value={String(field.value ?? '')}
                            />
                          </FormControl>
                          {'dica' in campo && campo.dica && (
                            <FormDescription>{campo.dica}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </FormSection>
              ))}

              {temAdicao && (
                <Alert>
                  <Eye className="h-4 w-4" aria-hidden />
                  <AlertDescription>
                    Receita com adição — multifocal. Cliente com multifocal e sem um solar com
                    grau é a oportunidade de segundo par mais frequente numa ótica; vira regra
                    automática na camada de inteligência.
                  </AlertDescription>
                </Alert>
              )}

              <FormSection titulo="Observações" colunas={1}>
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={3} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/receitas')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {novo ? 'Cadastrar receita' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
