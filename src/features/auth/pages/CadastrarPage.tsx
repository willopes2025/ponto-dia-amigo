import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Logo } from '@/components/comum/Logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

import { cadastrarSchema, type CadastrarForm } from '../schemas';

export default function CadastrarPage() {
  const { cadastrar, usuarioAutenticado, carregando } = useAuth();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false);

  const form = useForm<CadastrarForm>({
    resolver: zodResolver(cadastrarSchema),
    defaultValues: {
      nome: '', email: '', senha: '', confirmarSenha: '', nomeRede: '', nomeLoja: '',
    },
  });

  if (!carregando && usuarioAutenticado) {
    return <Navigate to="/painel" replace />;
  }

  const enviar = async (dados: CadastrarForm) => {
    setErro(null);
    const resultado = await cadastrar({
      nome: dados.nome,
      email: dados.email,
      senha: dados.senha,
      nomeRede: dados.nomeRede,
      nomeLoja: dados.nomeLoja || dados.nomeRede,
    });

    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    if (resultado.confirmacaoPendente) {
      setConfirmacaoPendente(true);
      return;
    }
    navigate('/painel', { replace: true });
  };

  if (confirmacaoPendente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
            <CardTitle>Confirme seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para{' '}
              <strong className="text-foreground">{form.getValues('email')}</strong>. Depois de
              confirmar, você já entra com a rede e a primeira loja criadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/entrar">Ir para a tela de entrada</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="scale-110" />
          <p className="text-sm text-muted-foreground">Gestão e inteligência para óticas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastrar minha ótica</CardTitle>
            <CardDescription>
              Criamos a rede, a primeira loja e o seu acesso de proprietário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(enviar)} className="space-y-4" noValidate>
                {erro && (
                  <Alert variant="destructive">
                    <AlertTitle>Não foi possível cadastrar</AlertTitle>
                    <AlertDescription>{erro}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seu nome</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomeRede"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da rede ou da ótica</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Seven Óticas" {...field} />
                      </FormControl>
                      <FormDescription>
                        Use o nome da rede. Cada loja entra depois como filial.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomeLoja"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nome da primeira loja{' '}
                        <span className="font-normal text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Seven Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="senha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmarSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar senha</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  )}
                  Criar conta
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
