import { ArrowLeft, Hammer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { PageHeader } from '@/components/comum/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { moduloPorPath } from '@/app/routes';

/**
 * Placeholder de módulo ainda não construído.
 *
 * Diz o que o módulo vai fazer e em que fase entra, em vez de um "em breve"
 * vazio: quem abre a tela sai sabendo o que esperar e quando.
 */
export default function ModuloEmBrevePage() {
  const { pathname } = useLocation();
  const modulo = moduloPorPath(pathname);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={modulo?.label ?? 'Módulo'}
        descricao={modulo?.resumo}
        acoes={
          modulo?.fase !== null && modulo?.fase !== undefined ? (
            <Badge variant="secondary">Fase {modulo.fase}</Badge>
          ) : undefined
        }
      />

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Hammer className="h-5 w-5 text-muted-foreground" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base">Em construção</CardTitle>
            <p className="text-sm text-muted-foreground">
              A fundação está pronta: rede, filiais, permissões e auditoria já valem para este
              módulo. Falta a tela.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {modulo && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Permissão exigida</dt>
                <dd className="font-mono text-xs">{modulo.permissao}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rota</dt>
                <dd className="font-mono text-xs">{modulo.path}</dd>
              </div>
            </dl>
          )}

          <Button asChild variant="outline" size="sm">
            <Link to="/painel">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Voltar ao painel
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
