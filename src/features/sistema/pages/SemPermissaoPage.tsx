import { ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { moduloPorPath } from '@/app/routes';
import { permissionLabel } from '@/lib/permissions/catalog';

/**
 * 403 explícito.
 *
 * O contrário disto — mandar o usuário para uma tela vazia ou para o painel sem
 * dizer nada — é o que faz o suporte perder uma hora até descobrir que faltava
 * uma permissão. Aqui a tela nomeia qual.
 */
export default function SemPermissaoPage() {
  const { pathname } = useLocation();
  const modulo = moduloPorPath(pathname);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden />
          </span>
          <CardTitle>Sem permissão</CardTitle>
          <CardDescription>
            {modulo
              ? `Seu acesso não inclui "${permissionLabel(modulo.permissao)}".`
              : 'Seu acesso não inclui esta tela.'}{' '}
            Peça a quem administra a rede para incluir esta permissão no seu modelo de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {modulo && (
            <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              {modulo.permissao}
            </p>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/painel">Voltar ao painel</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
