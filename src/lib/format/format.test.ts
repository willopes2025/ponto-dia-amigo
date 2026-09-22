import { describe, expect, it } from 'vitest';

import { cep, cpfCnpj, eixo, grau, iniciais, moeda, percentual, telefone } from './index';

describe('moeda', () => {
  it('formata em real brasileiro', () => {
    // O separador que o ICU coloca entre "R$" e o número é um espaço
    // inquebrável, não um espaço comum. Usamos o escape em vez do caractere
    // literal: um NBSP invisível no meio de uma asserção é a espécie de detalhe
    // que faz o teste falhar sem ninguém entender por quê.
    expect(moeda(1234.5)).toBe('R$\u00a01.234,50');
    expect(moeda(0)).toBe('R$\u00a00,00');
  });

  it('mostra travessão em vez de "R$ NaN" para valor ausente', () => {
    expect(moeda(null)).toBe('—');
    expect(moeda(undefined)).toBe('—');
    expect(moeda(Number.NaN)).toBe('—');
  });
});

describe('percentual', () => {
  it('recebe 12.5 e escreve 12,50%', () => {
    expect(percentual(12.5)).toBe('12,50%');
  });
});

describe('cpfCnpj', () => {
  it('escolhe a máscara pelo comprimento', () => {
    expect(cpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(cpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('devolve o valor original quando o comprimento não é de documento', () => {
    expect(cpfCnpj('123')).toBe('123');
  });
});

describe('telefone', () => {
  it('formata celular e fixo', () => {
    expect(telefone('11987654321')).toBe('(11) 98765-4321');
    expect(telefone('1134567890')).toBe('(11) 3456-7890');
  });

  it('preserva o DDI do Brasil quando presente', () => {
    expect(telefone('5511987654321')).toBe('+55 (11) 98765-4321');
  });
});

describe('cep', () => {
  it('formata com hífen', () => {
    expect(cep('01310100')).toBe('01310-100');
  });
});

describe('grau', () => {
  it('sempre traz o sinal e duas casas', () => {
    // Num campo de receita, "2,25" sem sinal é ambíguo — e a ambiguidade custa
    // uma lente errada.
    expect(grau(2.25)).toBe('+2,25');
    expect(grau(-1.5)).toBe('−1,50');
    expect(grau(0)).toBe('0,00');
  });

  it('mostra travessão quando não há grau', () => {
    expect(grau(null)).toBe('—');
  });
});

describe('eixo', () => {
  it('arredonda e acrescenta o símbolo de grau', () => {
    expect(eixo(180)).toBe('180°');
    expect(eixo(89.6)).toBe('90°');
  });
});

describe('iniciais', () => {
  it('usa o primeiro e o último nome', () => {
    expect(iniciais('Ana Maria Souza')).toBe('AS');
  });

  it('ignora partículas curtas', () => {
    expect(iniciais('Ana de Souza')).toBe('AS');
  });

  it('lida com nome único e vazio', () => {
    expect(iniciais('Ana')).toBe('AN');
    expect(iniciais('')).toBe('?');
    expect(iniciais(null)).toBe('?');
  });
});
