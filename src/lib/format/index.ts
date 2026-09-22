/**
 * Formatação pt-BR. Um lugar só, para a mesma moeda não aparecer de três
 * jeitos diferentes em três telas.
 */

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const MOEDA_SEM_SIMBOLO = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMERO = new Intl.NumberFormat('pt-BR');

const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** R$ 1.234,56 · null e undefined viram "—", nunca "R$ NaN". */
export function moeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return MOEDA.format(valor);
}

/** 1.234,56 — sem o símbolo, para colunas de tabela que já têm o cabeçalho "R$". */
export function moedaSemSimbolo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return MOEDA_SEM_SIMBOLO.format(valor);
}

export function numero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return NUMERO.format(valor);
}

/** 12,50% — recebe 12.5, não 0.125. */
export function percentual(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${PERCENTUAL.format(valor)}%`;
}

export function digitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** 123.456.789-09 ou 12.345.678/0001-95, conforme o tamanho. */
export function cpfCnpj(valor: string | null | undefined): string {
  const d = digitos(valor);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return valor ?? '';
}

/** (11) 98765-4321 · aceita e devolve com DDI quando houver. */
export function telefone(valor: string | null | undefined): string {
  const d = digitos(valor);

  // Com DDI do Brasil: +55 (11) 98765-4321
  if (d.length === 13 && d.startsWith('55')) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12 && d.startsWith('55')) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return valor ?? '';
}

/** 01310-100 */
export function cep(valor: string | null | undefined): string {
  const d = digitos(valor);
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return valor ?? '';
}

/**
 * Grau óptico sempre com sinal e duas casas: +2,25 · −1,50 · 0,00.
 * O sinal explícito importa: "2,25" e "+2,25" são a mesma lente, mas "-2,25"
 * é outra, e a ausência de sinal num campo de receita é ambiguidade que custa
 * uma lente errada.
 */
export function grau(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  const abs = Math.abs(valor).toFixed(2).replace('.', ',');
  if (valor > 0) return `+${abs}`;
  if (valor < 0) return `−${abs}`;
  return '0,00';
}

/** Eixo em graus: 180° */
export function eixo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${Math.round(valor)}°`;
}

/** Iniciais para avatar: "Ana Maria Souza" → "AS" */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
