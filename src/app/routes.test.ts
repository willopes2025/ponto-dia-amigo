import { describe, expect, it } from 'vitest';

import { ALL_PERMISSION_KEYS, MODELOS_PADRAO, PERMISSION_MODULES } from '@/lib/permissions/catalog';

import { GRUPOS, MODULOS } from './routes';

/**
 * Testes estruturais do registry e do catálogo.
 *
 * Não exercitam comportamento de tela: garantem que as três listas que precisam
 * concordar — rotas, catálogo de permissões e modelos padrão — não saiam de
 * sincronia. É o tipo de erro que não quebra o build e só aparece quando um
 * usuário real não consegue abrir um módulo.
 */

describe('registry de módulos', () => {
  it('não tem rota duplicada', () => {
    const paths = MODULOS.map((m) => m.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('toda rota começa com barra e não termina com barra', () => {
    for (const modulo of MODULOS) {
      expect(modulo.path.startsWith('/')).toBe(true);
      expect(modulo.path.endsWith('/')).toBe(false);
    }
  });

  it('toda permissão exigida existe no catálogo', () => {
    const conhecidas = new Set<string>(ALL_PERMISSION_KEYS);
    const orfas = MODULOS.filter((m) => !conhecidas.has(m.permissao)).map(
      (m) => `${m.path} → ${m.permissao}`,
    );
    expect(orfas).toEqual([]);
  });

  it('todo módulo pertence a um grupo declarado', () => {
    const grupos = new Set(GRUPOS.map((g) => g.key));
    for (const modulo of MODULOS) {
      expect(grupos.has(modulo.grupo)).toBe(true);
    }
  });

  it('todo módulo explica o que faz', () => {
    // O placeholder de módulo e a paleta de comandos usam `resumo`; sem ele a
    // tela vira um "em breve" vazio.
    for (const modulo of MODULOS) {
      expect(modulo.resumo.length).toBeGreaterThan(20);
    }
  });
});

describe('catálogo de permissões', () => {
  it('não tem chave duplicada', () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
  });

  it('toda chave tem o formato modulo.acao coerente com o módulo', () => {
    for (const modulo of PERMISSION_MODULES) {
      for (const acao of modulo.acoes) {
        expect(acao.key).toBe(`${modulo.key}.${acao.acao}`);
      }
    }
  });

  it('todo módulo tem rótulo e ao menos uma ação', () => {
    for (const modulo of PERMISSION_MODULES) {
      expect(modulo.label.length).toBeGreaterThan(2);
      expect(modulo.acoes.length).toBeGreaterThan(0);
    }
  });
});

describe('modelos de permissão padrão', () => {
  it('só referenciam chaves existentes', () => {
    const conhecidas = new Set<string>(ALL_PERMISSION_KEYS);
    for (const modelo of MODELOS_PADRAO) {
      const orfas = modelo.chaves.filter((c) => !conhecidas.has(c));
      expect(orfas, `modelo ${modelo.nome}`).toEqual([]);
    }
  });

  it('nenhum modelo padrão é vazio', () => {
    for (const modelo of MODELOS_PADRAO) {
      expect(modelo.chaves.length, `modelo ${modelo.nome}`).toBeGreaterThan(0);
    }
  });

  it('o vendedor não recebe as permissões que o separam do gerente', () => {
    // Este teste existe para travar a intenção do modelo: se alguém acrescentar
    // um curinga `vendas.*` ao Vendedor, o teste reprova antes de ir ao ar.
    const vendedor = MODELOS_PADRAO.find((m) => m.nome === 'Vendedor');
    expect(vendedor).toBeDefined();
    const chaves = new Set<string>(vendedor?.chaves ?? []);

    expect(chaves.has('vendas.incluir')).toBe(true);
    expect(chaves.has('vendas.consultar_proprias')).toBe(true);

    for (const proibida of [
      'vendas.cancelar',
      'vendas.excluir',
      'vendas.consultar',
      'produtos.ver_custo',
      'caixa.fechar',
      'cadastros.filiais',
      'permissoes.gerenciar_modelos',
      'inteligencia.configurar_holdout',
    ]) {
      expect(chaves.has(proibida), proibida).toBe(false);
    }
  });

  it('o laboratório não vê nada comercial nem financeiro', () => {
    const lab = MODELOS_PADRAO.find((m) => m.nome === 'Laboratório');
    const chaves = new Set<string>(lab?.chaves ?? []);
    for (const proibida of ['vendas.incluir', 'caixa.consultar', 'contas_receber.consultar']) {
      expect(chaves.has(proibida), proibida).toBe(false);
    }
    expect(chaves.has('ordens_servico.mover_etapa')).toBe(true);
  });
});
