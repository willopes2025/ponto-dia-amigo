import { Info } from 'lucide-react';

import { MODO_DEMO } from '@/lib/env';

/**
 * Faixa de demonstração.
 *
 * Quem abre o link precisa saber, sem precisar perguntar, que está vendo dados
 * de exemplo e que o que digitar não fica salvo. Uma demonstração que parece
 * produção gera relato de bug que não existe.
 */
export function AvisoDemo() {
  if (!MODO_DEMO) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-center text-xs text-primary-foreground">
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <strong>Demonstração</strong> — dados de exemplo, rodando no seu navegador. Pode
        cadastrar e alterar à vontade: nada é salvo, e recarregar a página volta ao início.
      </span>
    </div>
  );
}
