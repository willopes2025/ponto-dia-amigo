import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { listarOpcoes, type LinhaCadastro } from '../api';
import { schemaDoCadastro, type CadastroConfig, type CampoExtra } from '../config';

/**
 * Formulário gerado a partir da configuração do cadastro.
 *
 * Cobre os campos padrão (nome, descrição, ordem, ativo) e os extras declarados
 * em `config.ts`. O que fugir disso ganha tela própria — a generalização vale
 * enquanto economiza repetição, não a ponto de virar um construtor de telas.
 */
export function CadastroForm({
  config,
  registro,
  aberto,
  aoFechar,
  aoSalvar,
  salvando,
}: {
  config: CadastroConfig;
  /** `null` para criação. */
  registro: LinhaCadastro | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (valores: Record<string, unknown>) => void;
  salvando: boolean;
}) {
  const schema = schemaDoCadastro(config);

  const valoresIniciais = (): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      nome: registro?.nome ?? '',
      ordem: registro?.ordem ?? 0,
      ativo: registro?.ativo ?? true,
    };
    if (config.temDescricao !== false) base.descricao = registro?.descricao ?? '';

    for (const campo of config.campos ?? []) {
      const valor = registro?.[campo.nome];
      base[campo.nome] =
        campo.tipo === 'booleano' ? Boolean(valor) : valor === null || valor === undefined ? '' : valor;
    }
    return base;
  };

  const form = useForm({
    resolver: zodResolver(schema),
    values: valoresIniciais(),
  });

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {registro
              ? `Editar ${config.rotuloSingular}`
              : `${config.genero === 'f' ? 'Nova' : 'Novo'} ${config.rotuloSingular}`}
          </DialogTitle>
          <DialogDescription>{config.descricao}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((valores) => aoSalvar(valores))}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} value={String(field.value ?? '')} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(config.campos ?? []).map((campo) => (
              <CampoDinamico key={campo.nome} campo={campo} form={form} />
            ))}

            {config.temDescricao !== false && (
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={String(field.value ?? '')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ordem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={String(field.value ?? 0)} />
                    </FormControl>
                    <FormDescription>Posição nos seletores do sistema.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Ativo</FormLabel>
                    </div>
                    <FormDescription>
                      Inativo some dos seletores, mas o histórico continua legível.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={aoFechar} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CampoDinamico({ campo, form }: { campo: CampoExtra; form: any }) {
  // As opções de um campo de referência vêm de outra tabela de apoio.
  const opcoes = useQuery({
    queryKey: ['cadastro-opcoes', campo.referenciaTabela],
    queryFn: () => listarOpcoes(campo.referenciaTabela as string),
    enabled: campo.tipo === 'referencia' && Boolean(campo.referenciaTabela),
    staleTime: 5 * 60_000,
  });

  return (
    <FormField
      control={form.control}
      name={campo.nome}
      render={({ field }: { field: any }) => (
        <FormItem>
          {campo.tipo !== 'booleano' && (
            <FormLabel>
              {campo.rotulo}
              {!campo.obrigatorio && (
                <span className="font-normal text-muted-foreground"> (opcional)</span>
              )}
            </FormLabel>
          )}

          <FormControl>
            {campo.tipo === 'booleano' ? (
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                <FormLabel className="!mt-0 font-normal">{campo.rotulo}</FormLabel>
              </div>
            ) : campo.tipo === 'textarea' ? (
              <Textarea rows={2} {...field} value={String(field.value ?? '')} />
            ) : campo.tipo === 'select' ? (
              <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {(campo.opcoes ?? []).map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : campo.tipo === 'referencia' ? (
              <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={opcoes.isPending ? 'Carregando…' : 'Selecione…'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(opcoes.data ?? []).map((opcao) => (
                    <SelectItem key={opcao.id} value={opcao.id}>
                      {opcao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={
                  campo.tipo === 'data'
                    ? 'date'
                    : campo.tipo === 'numero' || campo.tipo === 'moeda' || campo.tipo === 'percentual'
                      ? 'number'
                      : 'text'
                }
                step={campo.tipo === 'moeda' || campo.tipo === 'percentual' ? '0.01' : undefined}
                placeholder={campo.placeholder}
                {...field}
                value={String(field.value ?? '')}
              />
            )}
          </FormControl>

          {campo.descricao && <FormDescription>{campo.descricao}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
