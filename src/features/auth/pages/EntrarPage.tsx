import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Logo } from '@/components/comum/Logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

import { entrarSchema, type EntrarForm } from '../schemas';

export default function EntrarPage() {
  const { entrar, usuarioAutenticado, carregando } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erro, setErro] = useState<string | null>(null);

  // Quando o guarda de rota manda para cá, ele diz de onde veio. Voltar para o
  // painel em vez do destino original é o que transforma um link compartilhado
  // ("olha o cliente tal") numa viagem ao lugar errado.
  const destino = (location.state as { de?: string } | null)?.de ?? '/painel';

  const form = useForm<EntrarForm>({
    resolver: zodResolver(entrarSchema),
    defaultValues: { email: '', senha: '' },
  });

  if (!carregando && usuarioAutenticado) {
    return <Navigate to={destino} replace />;
  }

  const enviar = async (dados: EntrarForm) => {
    setErro(null);
    const { erro: falha } = await entrar(dados.email, dados.senha);
    if (falha) {
      setErro(falha);
      return;
    }
    navigate(destino, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="scale-110" />
          <p className="text-sm text-muted-foreground">
            Gestão e inteligência para óticas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Acesse a conta da sua ótica.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(enviar)} className="space-y-4" noValidate>
                {erro && (
                  <Alert variant="destructive">
                    <AlertDescription>{erro}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="voce@suaotica.com.br"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  )}
                  Entrar
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link to="/cadastrar" className="font-medium text-primary hover:underline">
            Cadastrar minha ótica
          </Link>
        </p>
      </div>
    </div>
  );
}
