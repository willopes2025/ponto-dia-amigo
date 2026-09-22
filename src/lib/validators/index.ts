import { z } from 'zod';

import { digitos } from '@/lib/format';

/**
 * Validadores de documento brasileiro.
 *
 * Validar o dígito verificador — e não só o comprimento — evita que um CPF
 * digitado errado entre na base e só apareça meses depois, quando a nota
 * fiscal for rejeitada pela SEFAZ.
 */

export function cpfValido(valor: string): boolean {
  const d = digitos(valor);
  if (d.length !== 11) return false;
  // Sequências repetidas passam no cálculo do dígito, mas não são CPF.
  if (/^(\d)\1{10}$/.test(d)) return false;

  for (const [tamanho, peso] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) {
      soma += Number(d[i]) * (peso - i);
    }
    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (digito !== Number(d[tamanho])) return false;
  }

  return true;
}

export function cnpjValido(valor: string): boolean {
  const d = digitos(valor);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const calcular = (tamanho: number): number => {
    let soma = 0;
    let peso = tamanho - 7;
    for (let i = 0; i < tamanho; i += 1) {
      soma += Number(d[i]) * peso;
      peso -= 1;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcular(12) === Number(d[12]) && calcular(13) === Number(d[13]);
}

/** EAN-13 / GTIN-13, usado no código de barras dos produtos. */
export function ean13Valido(valor: string): boolean {
  const d = digitos(valor);
  if (d.length !== 13) return false;

  let soma = 0;
  for (let i = 0; i < 12; i += 1) {
    soma += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const digito = (10 - (soma % 10)) % 10;
  return digito === Number(d[12]);
}

// ---------------------------------------------------------------------------
// Schemas zod reutilizáveis
// ---------------------------------------------------------------------------

export const zCpf = z
  .string()
  .transform(digitos)
  .refine((v) => v === '' || cpfValido(v), 'CPF inválido');

export const zCnpj = z
  .string()
  .transform(digitos)
  .refine((v) => v === '' || cnpjValido(v), 'CNPJ inválido');

export const zCpfCnpj = z
  .string()
  .transform(digitos)
  .refine(
    (v) => v === '' || (v.length === 11 ? cpfValido(v) : v.length === 14 && cnpjValido(v)),
    'CPF ou CNPJ inválido',
  );

export const zCep = z
  .string()
  .transform(digitos)
  .refine((v) => v === '' || v.length === 8, 'CEP deve ter 8 dígitos');

export const zTelefone = z
  .string()
  .transform(digitos)
  .refine((v) => v === '' || (v.length >= 10 && v.length <= 13), 'Telefone inválido');

export const zEan13 = z
  .string()
  .transform(digitos)
  .refine((v) => v === '' || ean13Valido(v), 'Código EAN-13 inválido');

export const zEmail = z.string().trim().email('E-mail inválido');

export const zUf = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) =>
      v === '' ||
      [
        'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
        'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
      ].includes(v),
    'UF inválida',
  );

/**
 * Grau óptico. A grade real de lentes é em passos de 0,25 dioptria; aceitar
 * 1,37 deixa entrar uma receita que nenhum laboratório consegue montar.
 */
export const zGrau = z
  .number()
  .min(-30, 'Grau fora da faixa (-30 a +30)')
  .max(30, 'Grau fora da faixa (-30 a +30)')
  .refine((v) => Math.abs(v * 100) % 25 === 0, 'O grau precisa ser múltiplo de 0,25');

export const zEixo = z
  .number()
  .int('O eixo é um número inteiro de graus')
  .min(0, 'O eixo vai de 0° a 180°')
  .max(180, 'O eixo vai de 0° a 180°');

/** Senha: exigência mínima honesta — comprimento é o que mais importa. */
export const zSenha = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .max(72, 'A senha pode ter no máximo 72 caracteres');
