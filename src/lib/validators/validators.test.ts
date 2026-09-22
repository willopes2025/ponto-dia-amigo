import { describe, expect, it } from 'vitest';

import { cnpjValido, cpfValido, ean13Valido, zGrau, zUf } from './index';

describe('cpfValido', () => {
  it('aceita CPF com dígito verificador correto, com ou sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(cpfValido('529.982.247-24')).toBe(false);
  });

  it('recusa sequência repetida', () => {
    // 111.111.111-11 passa no cálculo do dígito, mas não é um CPF válido —
    // é o erro clássico de quem valida só a fórmula.
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('00000000000')).toBe(false);
  });

  it('recusa comprimento errado', () => {
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita CNPJ válido com e sem máscara', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000181')).toBe(true);
  });

  it('recusa dígito verificador errado e sequência repetida', () => {
    expect(cnpjValido('11.222.333/0001-82')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
  });
});

describe('ean13Valido', () => {
  it('aceita EAN-13 com dígito de controle correto', () => {
    expect(ean13Valido('7891234567895')).toBe(true);
    expect(ean13Valido('4006381333931')).toBe(true);
  });

  it('recusa dígito de controle errado', () => {
    expect(ean13Valido('7891234567890')).toBe(false);
  });
});

describe('zGrau', () => {
  it('aceita os passos reais da grade de lentes (múltiplos de 0,25)', () => {
    for (const valor of [0, -0.25, 1.5, -2.75, 6, -10.25]) {
      expect(zGrau.safeParse(valor).success).toBe(true);
    }
  });

  it('recusa grau fora da grade', () => {
    // Nenhum laboratório monta 1,37 — deixar entrar é garantir uma O.S. travada.
    expect(zGrau.safeParse(1.37).success).toBe(false);
    expect(zGrau.safeParse(-0.1).success).toBe(false);
  });

  it('recusa grau fora da faixa clínica', () => {
    expect(zGrau.safeParse(35).success).toBe(false);
    expect(zGrau.safeParse(-31).success).toBe(false);
  });
});

describe('zUf', () => {
  it('normaliza para maiúsculas e aceita UF existente', () => {
    expect(zUf.parse('sp')).toBe('SP');
    expect(zUf.parse(' rj ')).toBe('RJ');
  });

  it('recusa sigla inexistente', () => {
    expect(zUf.safeParse('XX').success).toBe(false);
  });

  it('aceita vazio, porque UF é opcional em vários cadastros', () => {
    expect(zUf.safeParse('').success).toBe(true);
  });
});
