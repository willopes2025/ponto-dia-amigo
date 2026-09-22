import { describe, expect, it } from 'vitest';

import { termoBusca, traduzirErro } from './lista';

describe('termoBusca', () => {
  it('envolve o termo em curingas para busca parcial', () => {
    expect(termoBusca('ana')).toBe('%ana%');
  });

  it('ignora termo vazio ou só com espaços', () => {
    expect(termoBusca('')).toBeNull();
    expect(termoBusca('   ')).toBeNull();
    expect(termoBusca(undefined)).toBeNull();
  });

  it('escapa os curingas que o usuário digitar', () => {
    // Sem escapar, um "%" digitado casa com tudo e um "_" casa com qualquer
    // caractere — a lista devolve resultado que parece aleatório e ninguém
    // relaciona com o que foi digitado.
    expect(termoBusca('50%')).toBe('%50\\%%');
    expect(termoBusca('a_b')).toBe('%a\\_b%');
    expect(termoBusca('c\\d')).toBe('%c\\\\d%');
  });

  it('remove espaços nas pontas', () => {
    expect(termoBusca('  maria  ')).toBe('%maria%');
  });
});

describe('traduzirErro', () => {
  it('traduz violação de unicidade e nomeia o campo', () => {
    const erro = traduzirErro({
      code: '23505',
      message: 'duplicate key value violates unique constraint "clientes_documento_unico"',
      details: 'Key (tenant_id, cpf_cnpj)=(x, 529) already exists.',
    });
    expect(erro.message).toContain('Já existe um registro');
    expect(erro.message).toContain('cpf cnpj');
  });

  it('explica chave estrangeira como registro em uso', () => {
    const erro = traduzirErro({ code: '23503', message: 'violates foreign key constraint' });
    expect(erro.message).toContain('em uso');
  });

  it('diz que faltou permissão em vez de mostrar erro técnico', () => {
    // A mensagem crua sugere bug de sistema quando o que houve foi RLS.
    const erro = traduzirErro({ code: '42501', message: 'permission denied for table vendas' });
    expect(erro.message).toBe('Seu acesso não permite esta operação.');
  });

  it('preserva as mensagens que os nossos triggers levantam', () => {
    // Essas já vêm em português e explicam o motivo; traduzir de novo perderia
    // a informação específica.
    const nossa = 'A conta "Receitas" é de receita e não pode ter filho de despesa.';
    expect(traduzirErro({ message: nossa }).message).toBe(nossa);
  });

  it('cai no nome da restrição quando não há campo no detalhe', () => {
    const erro = traduzirErro({
      code: '23514',
      message: 'new row violates check constraint "receitas_od_esferico_grade"',
    });
    expect(erro.message).toContain('receitas od esferico grade');
  });
});
