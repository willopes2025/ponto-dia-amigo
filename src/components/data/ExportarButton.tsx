import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * Exporta para Excel o que está na tela — com os filtros aplicados, não a tabela
 * inteira. Exportar 40 mil linhas quando o usuário filtrou 12 é a forma mais
 * rápida de tornar a exportação inútil.
 *
 * O `xlsx` é carregado sob demanda: são ~400 kB que só fazem sentido no momento
 * em que alguém clica em exportar.
 */
export function ExportarButton<T extends Record<string, unknown>>({
  nomeArquivo,
  obterLinhas,
  rotulo = 'Exportar',
  desabilitado = false,
}: {
  /** Sem extensão; a data entra no nome para não sobrescrever o download anterior. */
  nomeArquivo: string;
  /** Busca as linhas já formatadas para planilha (cabeçalho legível, não nome de coluna). */
  obterLinhas: () => Promise<T[]>;
  rotulo?: string;
  desabilitado?: boolean;
}) {
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  const exportar = async () => {
    setExportando(true);
    try {
      const linhas = await obterLinhas();

      if (linhas.length === 0) {
        toast({
          title: 'Nada para exportar',
          description: 'Os filtros aplicados não retornaram nenhum registro.',
        });
        return;
      }

      const XLSX = await import('xlsx');
      const planilha = XLSX.utils.json_to_sheet(linhas);

      // Larguras a partir do conteúdo: planilha com tudo em 8 caracteres obriga
      // quem recebe a ajustar coluna por coluna antes de conseguir ler.
      const colunas = Object.keys(linhas[0] ?? {});
      planilha['!cols'] = colunas.map((coluna) => ({
        wch: Math.min(
          48,
          Math.max(
            coluna.length + 2,
            ...linhas.slice(0, 200).map((l) => String(l[coluna] ?? '').length + 2),
          ),
        ),
      }));

      const livro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(livro, planilha, 'Dados');

      const data = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(livro, `${nomeArquivo}-${data}.xlsx`);

      toast({
        title: 'Exportado',
        description: `${linhas.length} registro(s) em ${nomeArquivo}-${data}.xlsx`,
      });
    } catch (erro) {
      toast({
        title: 'Falha ao exportar',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={exportar} disabled={desabilitado || exportando}>
      {exportando ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="mr-2 h-4 w-4" aria-hidden />
      )}
      {rotulo}
    </Button>
  );
}
