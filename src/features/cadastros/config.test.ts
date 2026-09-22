import { describe, expect, it } from 'vitest';

import { ALL_PERMISSION_KEYS } from '@/lib/permissions/catalog';

import { CADASTROS, GRUPOS_CADASTRO, cadastroPorSlug, schemaDoCadastro } from './config';

describe('configuração dos cadastros', () => {
  it('não tem slug nem tabela repetidos', () => {
    const slugs = CADASTROS.map((c) => c.slug);
    const tabelas = CADASTROS.map((c) => c.tabela);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(tabelas).size).toBe(tabelas.length);
  });

  it('toda permissão exigida existe no catálogo', () => {
    const conhecidas = new Set<string>(ALL_PERMISSION_KEYS);
    const orfas = CADASTROS.filter((c) => !conhecidas.has(c.permissao)).map((c) => c.slug);
    expect(orfas).toEqual([]);
  });

  it('todo cadastro pertence a um grupo declarado', () => {
    const grupos = new Set(GRUPOS_CADASTRO.map((g) => g.chave));
    for (const cadastro of CADASTROS) {
      expect(grupos.has(cadastro.grupo), cadastro.slug).toBe(true);
    }
  });

  it('campo de referência declara a tabela de origem', () => {
    // Sem a tabela, o seletor abriria vazio sem erro visível.
    for (const cadastro of CADASTROS) {
      for (const campo of cadastro.campos ?? []) {
        if (campo.tipo === 'referencia') {
          expect(campo.referenciaTabela, `${cadastro.slug}.${campo.nome}`).toBeTruthy();
        }
      }
    }
  });

  it('campo de seleção declara as opções', () => {
    for (const cadastro of CADASTROS) {
      for (const campo of cadastro.campos ?? []) {
        if (campo.tipo === 'select') {
          expect((campo.opcoes ?? []).length, `${cadastro.slug}.${campo.nome}`).toBeGreaterThan(1);
        }
      }
    }
  });

  it('acha o cadastro pelo slug', () => {
    expect(cadastroPorSlug('grifes')?.tabela).toBe('grifes');
    expect(cadastroPorSlug('inexistente')).toBeUndefined();
  });
});

describe('schemaDoCadastro', () => {
  it('exige nome em qualquer cadastro', () => {
    const schema = schemaDoCadastro(cadastroPorSlug('grifes')!);
    expect(schema.safeParse({ nome: '', ordem: 0, ativo: true }).success).toBe(false);
    expect(schema.safeParse({ nome: 'Ray-Ban', ordem: 0, ativo: true }).success).toBe(true);
  });

  it('converte número vindo do formulário, que chega como texto', () => {
    const schema = schemaDoCadastro(cadastroPorSlug('formas-pagamento')!);
    const resultado = schema.safeParse({
      nome: 'Crédito', ordem: '2', ativo: true, natureza: 'cartao_credito',
      taxa_percentual: '3.19', max_parcelas: '12',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.taxa_percentual).toBe(3.19);
      expect(resultado.data.ordem).toBe(2);
    }
  });

  it('recusa percentual acima de 100', () => {
    const schema = schemaDoCadastro(cadastroPorSlug('convenios')!);
    const r = schema.safeParse({
      nome: 'Convênio X', ordem: 0, ativo: true, tipo: 'desconto', desconto_percentual: '150',
    });
    expect(r.success).toBe(false);
  });

  it('exige o campo marcado como obrigatório', () => {
    const schema = schemaDoCadastro(cadastroPorSlug('subgrupos')!);
    expect(schema.safeParse({ nome: 'Metal', ordem: 0, ativo: true }).success).toBe(false);
    expect(
      schema.safeParse({ nome: 'Metal', ordem: 0, ativo: true, grupo_id: 'uuid-do-grupo' }).success,
    ).toBe(true);
  });

  it('não cria campo de descrição onde o cadastro não tem', () => {
    const schema = schemaDoCadastro(cadastroPorSlug('formas-pagamento')!);
    expect(Object.keys(schema.shape)).not.toContain('descricao');
    expect(Object.keys(schemaDoCadastro(cadastroPorSlug('grifes')!).shape)).toContain('descricao');
  });
});
