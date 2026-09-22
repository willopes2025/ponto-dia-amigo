import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Confirmação de ação destrutiva.
 *
 * Substitui o `window.confirm` que o app anterior usava: aquele não diz o que
 * exatamente será apagado, não tem estado de carregamento e é impossível de
 * estilizar ou testar.
 *
 * Quando `confirmacaoTexto` é passado, o usuário precisa digitar o nome do
 * registro. Reservado para exclusão que apaga histórico — um clique distraído
 * em "Excluir" não deve conseguir remover um cliente com três anos de compras.
 */
export function ConfirmarDialog({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  confirmacaoTexto,
  rotuloConfirmar = 'Confirmar',
  variante = 'destrutiva',
  carregando = false,
  aoConfirmar,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  /** Exige digitar exatamente este texto para liberar o botão. */
  confirmacaoTexto?: string;
  rotuloConfirmar?: string;
  variante?: 'destrutiva' | 'neutra';
  carregando?: boolean;
  aoConfirmar: () => void;
}) {
  const [digitado, setDigitado] = useState('');

  useEffect(() => {
    if (!aberto) setDigitado('');
  }, [aberto]);

  const liberado = !confirmacaoTexto || digitado.trim() === confirmacaoTexto.trim();

  return (
    <AlertDialog open={aberto} onOpenChange={aoMudarAberto}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">{descricao}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {confirmacaoTexto && (
          <div className="space-y-2">
            <Label htmlFor="confirmacao" className="text-sm font-normal">
              Digite <strong className="font-mono text-foreground">{confirmacaoTexto}</strong>{' '}
              para confirmar
            </Label>
            <Input
              id="confirmacao"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!liberado || carregando}
            onClick={(evento) => {
              // Sem isto o Radix fecha o diálogo antes de a mutação terminar, e
              // o estado de carregamento nunca aparece.
              evento.preventDefault();
              aoConfirmar();
            }}
            className={
              variante === 'destrutiva'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
