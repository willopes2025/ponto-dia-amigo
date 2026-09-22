import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { Carregando } from '@/components/comum/Carregando';
import { PageHeader } from '@/components/comum/PageHeader';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { listarOpcoes } from '@/features/cadastros/api';
import { useAuth } from '@/lib/auth';
import { cpfCnpj as formatarDoc } from '@/lib/format';

import { atualizarCliente, buscarCliente, criarCliente } from '../api';
import { clienteSchema, type ClienteForm } from '../schemas';
import { ContatosCliente } from '../components/ContatosCliente';

const SEM_VALOR = '';

export default function ClienteFormPage() {
  const { id } = useParams<{ id: string }>();
  const novo = !id || id === 'novo';
  const navigate = useNavigate();
  const { contexto, storeAtual } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cliente = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => buscarCliente(id as string),
    enabled: !novo,
  });

  const origens = useQuery({
    queryKey: ['cadastro-opcoes', 'origens_cliente'],
    queryFn: () => listarOpcoes('origens_cliente'),
    staleTime: 5 * 60_000,
  });
  const convenios = useQuery({
    queryKey: ['cadastro-opcoes', 'convenios'],
    queryFn: () => listarOpcoes('convenios'),
    staleTime: 5 * 60_000,
  });
  const profissoes = useQuery({
    queryKey: ['cadastro-opcoes', 'profissoes'],
    queryFn: () => listarOpcoes('profissoes'),
    staleTime: 5 * 60_000,
  });

  const form = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    values: cliente.data
      ? {
          tipo: cliente.data.tipo,
          nome: cliente.data.nome,
          apelido: cliente.data.apelido ?? '',
          cpf_cnpj: cliente.data.cpf_cnpj ?? '',
          rg: cliente.data.rg ?? '',
          data_nascimento: cliente.data.data_nascimento ?? '',
          sexo: cliente.data.sexo,
          razao_social: cliente.data.razao_social ?? '',
          inscricao_estadual: cliente.data.inscricao_estadual ?? '',
          cep: cliente.data.cep ?? '',
          endereco: cliente.data.endereco ?? '',
          numero: cliente.data.numero ?? '',
          complemento: cliente.data.complemento ?? '',
          bairro: cliente.data.bairro ?? '',
          cidade: cliente.data.cidade ?? '',
          uf: cliente.data.uf ?? '',
          store_id: cliente.data.store_id ?? undefined,
          origem_id: cliente.data.origem_id ?? '',
          convenio_id: cliente.data.convenio_id ?? '',
          profissao_id: cliente.data.profissao_id ?? '',
          nome_pai: cliente.data.nome_pai ?? '',
          nome_mae: cliente.data.nome_mae ?? '',
          observacoes: cliente.data.observacoes ?? '',
          desconto_padrao: Number(cliente.data.desconto_padrao ?? 0),
          consentiu_contato: Boolean(cliente.data.consentimento_contato_em),
        }
      : {
          tipo: 'pf',
          nome: '',
          sexo: 'nao_informado',
          desconto_padrao: 0,
          consentiu_contato: false,
          store_id: storeAtual?.id,
        },
  });

  const tipo = form.watch('tipo');

  const salvar = useMutation({
    mutationFn: async (dados: ClienteForm) => {
      const { consentiu_contato, ...resto } = dados;

      const paraBanco = {
        ...resto,
        tenant_id: contexto!.tenant.id,
        store_id: resto.store_id ?? storeAtual?.id ?? null,
        // Campo vazio vira NULL: string vazia num índice único faz dois
        // clientes sem documento colidirem.
        cpf_cnpj: resto.cpf_cnpj || null,
        data_nascimento: resto.data_nascimento || null,
        origem_id: resto.origem_id || null,
        convenio_id: resto.convenio_id || null,
        profissao_id: resto.profissao_id || null,
        uf: resto.uf || null,
        // O consentimento guarda QUANDO e DE ONDE. Marcar de novo algo já
        // consentido não reescreve a data original — ela é a prova.
        consentimento_contato_em: consentiu_contato
          ? (cliente.data?.consentimento_contato_em ?? new Date().toISOString())
          : null,
        consentimento_origem: consentiu_contato
          ? (cliente.data?.consentimento_origem ?? 'cadastro na loja')
          : null,
      };

      return novo
        ? criarCliente(paraBanco as never)
        : atualizarCliente(id as string, paraBanco as never);
    },
    onSuccess: (salvo) => {
      toast({ title: novo ? 'Cliente cadastrado' : 'Cliente alterado' });
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
      void queryClient.invalidateQueries({ queryKey: ['cliente', salvo.id] });
      if (novo) navigate(`/clientes/${salvo.id}`, { replace: true });
    },
    onError: (erro: Error) =>
      toast({ title: 'Não foi possível salvar', description: erro.message, variant: 'destructive' }),
  });

  if (!novo && cliente.isPending) return <Carregando texto="Carregando cliente…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={novo ? 'Novo cliente' : (cliente.data?.nome ?? 'Cliente')}
        descricao={
          novo
            ? 'Só o nome é obrigatório. O resto pode ser completado depois, sem travar o atendimento.'
            : `Código ${cliente.data?.codigo} · ${cliente.data?.cpf_cnpj ? formatarDoc(cliente.data.cpf_cnpj) : 'sem documento'}`
        }
        acoes={
          <Button variant="outline" onClick={() => navigate('/clientes')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Voltar
          </Button>
        }
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((dados) => salvar.mutate(dados))}
          className="space-y-8"
          noValidate
        >
          <Card>
            <CardContent className="space-y-8 pt-6">
              <FormSection titulo="Identificação">
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
                          <SelectItem value="pf">Pessoa física</SelectItem>
                          <SelectItem value="pj">Pessoa jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tipo === 'pj' ? 'Nome fantasia' : 'Nome completo'}</FormLabel>
                      <FormControl>
                        <Input {...field} autoFocus={novo} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipo === 'pj' && (
                  <FormField
                    control={form.control}
                    name="razao_social"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão social</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="cpf_cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipo === 'pj' ? 'CNPJ' : 'CPF'}{' '}
                        <span className="font-normal text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} inputMode="numeric" />
                      </FormControl>
                      <FormDescription>
                        O dígito verificador é conferido — CPF errado só aparece quando a nota é
                        rejeitada.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipo === 'pf' && (
                  <>
                    <FormField
                      control={form.control}
                      name="apelido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Apelido{' '}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="data_nascimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormDescription>Base da régua de aniversário.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sexo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sexo</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nao_informado">Não informado</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </FormSection>

              <FormSection titulo="Endereço" colunas={3}>
                {(
                  [
                    ['cep', 'CEP', 'numeric'],
                    ['endereco', 'Endereço', 'text'],
                    ['numero', 'Número', 'text'],
                    ['complemento', 'Complemento', 'text'],
                    ['bairro', 'Bairro', 'text'],
                    ['cidade', 'Cidade', 'text'],
                    ['uf', 'UF', 'text'],
                  ] as const
                ).map(([nome, rotulo, modo]) => (
                  <FormField
                    key={nome}
                    control={form.control}
                    name={nome}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{rotulo}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            inputMode={modo === 'numeric' ? 'numeric' : undefined}
                            maxLength={nome === 'uf' ? 2 : undefined}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </FormSection>

              <FormSection titulo="Comercial" colunas={3}>
                <FormField
                  control={form.control}
                  name="store_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filial de cadastro</FormLabel>
                      <Select value={field.value ?? SEM_VALOR} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(contexto?.stores ?? []).map((filial) => (
                            <SelectItem key={filial.id} value={filial.id}>
                              {filial.nome_fantasia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Não restringe acesso; responde de onde veio.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(
                  [
                    ['origem_id', 'Origem', origens.data],
                    ['convenio_id', 'Convênio', convenios.data],
                    ['profissao_id', 'Profissão', profissoes.data],
                  ] as const
                ).map(([nome, rotulo, opcoes]) => (
                  <FormField
                    key={nome}
                    control={form.control}
                    name={nome}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {rotulo}{' '}
                          <span className="font-normal text-muted-foreground">(opcional)</span>
                        </FormLabel>
                        <Select value={field.value ?? SEM_VALOR} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(opcoes ?? []).map((opcao) => (
                              <SelectItem key={opcao.id} value={opcao.id}>
                                {opcao.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="desconto_padrao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto padrão (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection titulo="Consentimento de contato" colunas={1}>
                <FormField
                  control={form.control}
                  name="consentiu_contato"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="flex items-start gap-3">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          <FormLabel className="!mt-0">
                            O cliente autorizou receber contato
                          </FormLabel>
                          <FormDescription>
                            Guardamos a data e a origem da autorização. Sem ela, nenhuma régua de
                            marketing dispara para este cliente — nem aniversário, nem recall de
                            receita.
                          </FormDescription>
                        </div>
                      </div>

                      {cliente.data?.consentimento_contato_em && (
                        <Alert>
                          <ShieldCheck className="h-4 w-4" aria-hidden />
                          <AlertDescription>
                            Consentimento registrado em{' '}
                            {new Date(cliente.data.consentimento_contato_em).toLocaleString('pt-BR')}
                            {cliente.data.consentimento_origem &&
                              ` · origem: ${cliente.data.consentimento_origem}`}
                            . Desmarcar revoga o consentimento.
                          </AlertDescription>
                        </Alert>
                      )}
                    </FormItem>
                  )}
                />
              </FormSection>

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
            <Button type="button" variant="outline" onClick={() => navigate('/clientes')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {novo ? 'Cadastrar cliente' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Contatos só depois que o cliente existe: cada telefone é uma linha
          própria, com opt-in por canal. */}
      {!novo && cliente.data && <ContatosCliente cliente={cliente.data} />}
    </div>
  );
}
