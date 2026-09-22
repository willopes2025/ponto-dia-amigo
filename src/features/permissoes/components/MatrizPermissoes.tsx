import { ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PERMISSION_MODULES, type PermissionKey } from '@/lib/permissions/catalog';
import { normalizar } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Editor de modelo de permissão como matriz módulo × ação.
 *
 * São 268 chaves em 31 módulos. Uma lista plana de 268 caixas é inutilizável;
 * o agrupamento por módulo com estado de "parcialmente marcado" é o que torna
 * a tela navegável — quem configura pensa em "o que o vendedor faz em Vendas",
 * não em chaves soltas.
 *
 * As chaves marcadas como sensíveis (custo, margem, financeiro) recebem selo,
 * porque conceder uma delas é decisão diferente de conceder "consultar".
 */
export function MatrizPermissoes({
  selecionadas,
  aoMudar,
  somenteLeitura = false,
}: {
  selecionadas: Set<PermissionKey>;
  aoMudar: (chaves: Set<PermissionKey>) => void;
  somenteLeitura?: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const termo = normalizar(busca.trim());

  const modulosVisiveis = useMemo(() => {
    if (!termo) return PERMISSION_MODULES.map((m) => ({ modulo: m, acoes: m.acoes }));

    return PERMISSION_MODULES.map((modulo) => {
      const moduloCasa = normalizar(modulo.label).includes(termo) || modulo.key.includes(termo);
      const acoes = moduloCasa
        ? modulo.acoes
        : modulo.acoes.filter(
            (acao) =>
              normalizar(acao.label).includes(termo) ||
              acao.key.includes(termo) ||
              normalizar(acao.descricao ?? '').includes(termo),
          );
      return { modulo, acoes };
    }).filter((item) => item.acoes.length > 0);
  }, [termo]);

  const alternar = (chave: PermissionKey, marcado: boolean) => {
    const proximo = new Set(selecionadas);
    if (marcado) proximo.add(chave);
    else proximo.delete(chave);
    aoMudar(proximo);
  };

  const alternarModulo = (chaves: PermissionKey[], marcar: boolean) => {
    const proximo = new Set(selecionadas);
    for (const chave of chaves) {
      if (marcar) proximo.add(chave);
      else proximo.delete(chave);
    }
    aoMudar(proximo);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar permissão (ex.: cancelar, custo, caixa)…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular">
            {selecionadas.size} de {PERMISSION_MODULES.reduce((s, m) => s + m.acoes.length, 0)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setAbertos(
                abertos.size > 0 ? new Set() : new Set(PERMISSION_MODULES.map((m) => m.key)),
              )
            }
          >
            {abertos.size > 0 ? 'Recolher tudo' : 'Expandir tudo'}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {modulosVisiveis.map(({ modulo, acoes }) => {
          const chavesDoModulo = acoes.map((a) => a.key);
          const marcadas = chavesDoModulo.filter((c) => selecionadas.has(c)).length;
          const todas = marcadas === chavesDoModulo.length && marcadas > 0;
          const algumas = marcadas > 0 && !todas;
          // Com busca ativa, abre tudo: esconder o resultado da busca atrás de
          // um clique anula a busca.
          const aberto = Boolean(termo) || abertos.has(modulo.key);

          return (
            <Collapsible
              key={modulo.key}
              open={aberto}
              onOpenChange={(v) =>
                setAbertos((atual) => {
                  const proximo = new Set(atual);
                  if (v) proximo.add(modulo.key);
                  else proximo.delete(modulo.key);
                  return proximo;
                })
              }
            >
              <div className="flex items-center gap-3 bg-muted/40 px-3 py-2">
                <Checkbox
                  checked={todas ? true : algumas ? 'indeterminate' : false}
                  disabled={somenteLeitura}
                  onCheckedChange={(v) => alternarModulo(chavesDoModulo, v === true)}
                  aria-label={`Marcar todas as permissões de ${modulo.label}`}
                />
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="truncate text-sm font-medium">{modulo.label}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] tabular',
                      marcadas === 0
                        ? 'bg-muted text-muted-foreground'
                        : todas
                          ? 'bg-primary/10 text-primary'
                          : 'bg-warning/15 text-warning-foreground',
                    )}
                  >
                    {marcadas}/{chavesDoModulo.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      aberto && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <ul className="divide-y divide-border/60">
                  {acoes.map((acao) => (
                    <li key={acao.key} className="flex items-start gap-3 px-3 py-2 pl-10">
                      <Checkbox
                        id={acao.key}
                        checked={selecionadas.has(acao.key)}
                        disabled={somenteLeitura}
                        onCheckedChange={(v) => alternar(acao.key, v === true)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={acao.key}
                          className="flex flex-wrap items-center gap-1.5 text-sm"
                        >
                          {acao.label}
                          {acao.sensivel && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-warning/40 px-1 py-0 text-[10px] font-normal text-warning"
                                >
                                  <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                                  sensível
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                Esta permissão também é verificada na leitura, no banco — não só
                                ao gravar. Costuma envolver custo, margem ou dado financeiro.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </label>
                        {acao.descricao && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{acao.descricao}</p>
                        )}
                        <code className="mt-0.5 block text-[10px] text-muted-foreground/70">
                          {acao.key}
                        </code>
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {modulosVisiveis.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhuma permissão corresponde a “{busca}”.
          </p>
        )}
      </div>
    </div>
  );
}
