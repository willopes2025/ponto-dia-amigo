-- =============================================================================
-- Dados de demonstração do banco de desenvolvimento.
-- Recriados a cada `npm run db:dev`. Nunca usados em produção.
-- =============================================================================
set client_min_messages to warning;

-- Uma rede com três filiais, criada pelo mesmo caminho de um cadastro real.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dono@seven.com.br',
   '{"nome":"Ana Proprietária","nome_rede":"Seven Óticas","nome_loja":"Seven Centro"}');

do $$
declare
  v_tenant uuid;
  v_perfil uuid;
  v_loja2  uuid;
  v_loja3  uuid;
begin
  select id into v_tenant from public.tenants where nome = 'Seven Óticas';
  select id into v_perfil from public.profiles where email = 'dono@seven.com.br';

  insert into public.stores (tenant_id, codigo, nome_fantasia, cidade, uf, cnpj)
  values (v_tenant, 2, 'Seven Shopping Norte', 'Campinas', 'SP', '11222333000181')
  returning id into v_loja2;

  insert into public.stores (tenant_id, codigo, nome_fantasia, cidade, uf)
  values (v_tenant, 3, 'Seven Vila Nova', 'Campinas', 'SP')
  returning id into v_loja3;

  -- A proprietária acessa as três lojas — é o que exercita o seletor de filial.
  insert into public.user_stores (profile_id, store_id)
  values (v_perfil, v_loja2), (v_perfil, v_loja3);

  -- Grifes, para a tela de cadastros ter conteúdo real.
  insert into public.grifes (tenant_id, nome, ordem) values
    (v_tenant, 'Ray-Ban', 1), (v_tenant, 'Oakley', 2), (v_tenant, 'Vogue', 3),
    (v_tenant, 'Chilli Beans', 4), (v_tenant, 'Kipling', 5), (v_tenant, 'Atitude', 6),
    (v_tenant, 'Carrera', 7), (v_tenant, 'Hugo Boss', 8);

  insert into public.fornecedores (tenant_id, nome_fantasia, razao_social, cpf_cnpj, is_laboratorio, prazo_producao_dias, cidade, uf) values
    (v_tenant, 'Lab Óptico Paulista', 'Laboratório Óptico Paulista Ltda', '11222333000181', true, 5, 'São Paulo', 'SP'),
    (v_tenant, 'Essilor',             'Essilor do Brasil',                 '52998224725',    true, 7, 'São Paulo', 'SP'),
    (v_tenant, 'Distribuidora Vision', 'Vision Distribuidora de Óticas',   null,             false, null, 'Campinas', 'SP');

  insert into public.funcionarios (tenant_id, store_id, nome, funcao, data_admissao) values
    (v_tenant, null,    'Ana Proprietária', 'Proprietária', current_date - 1200),
    (v_tenant, v_loja2, 'Carla Mendes',     'Vendedora',    current_date - 400),
    (v_tenant, v_loja2, 'Diego Rocha',      'Vendedor',     current_date - 200),
    (v_tenant, v_loja3, 'Eduarda Lima',     'Gerente',      current_date - 800),
    (v_tenant, null,    'Fábio Souza',      'Montador',     current_date - 150);

  update public.profiles
     set funcionario_id = (select id from public.funcionarios where nome = 'Ana Proprietária')
   where id = v_perfil;

  -- Clientes com contato, consentimento e receita em estágios variados de
  -- validade: é o que faz a fila de recall ter conteúdo.
  insert into public.clientes
    (tenant_id, store_id, nome, cpf_cnpj, data_nascimento, cidade, uf, consentimento_contato_em, consentimento_origem)
  select
    v_tenant,
    case when i % 3 = 0 then v_loja2 when i % 3 = 1 then v_loja3 else (select id from public.stores where tenant_id = v_tenant and codigo = 1) end,
    nome,
    null,
    current_date - ((20 + (i * 7) % 50) * 365) - (i * 11 % 365),
    'Campinas', 'SP',
    case when i % 4 <> 0 then now() - (i || ' days')::interval end,
    case when i % 4 <> 0 then 'cadastro na loja' end
  from (values
    (1,'Ana Maria Souza'), (2,'Bruno Carvalho'), (3,'Camila Ribeiro'), (4,'Daniel Alves'),
    (5,'Eduarda Nunes'), (6,'Felipe Barros'), (7,'Gabriela Dias'), (8,'Henrique Matos'),
    (9,'Isabela Cunha'), (10,'João Pedro Lima'), (11,'Karina Prado'), (12,'Lucas Ferreira'),
    (13,'Mariana Castro'), (14,'Nicolas Moreira'), (15,'Olívia Tavares'), (16,'Paulo Ricardo'),
    (17,'Quésia Martins'), (18,'Rafael Andrade'), (19,'Sofia Bernardes'), (20,'Thiago Correia'),
    (21,'Ursula Pacheco'), (22,'Vinícius Gomes'), (23,'Wanda Siqueira'), (24,'Yuri Fontes')
  ) as c(i, nome);

  insert into public.cliente_telefones (tenant_id, cliente_id, numero, aceita_whatsapp, aceita_sms, principal)
  select v_tenant, id, '1198' || lpad((7650000 + codigo)::text, 7, '0'), codigo % 3 <> 0, codigo % 5 = 0, true
    from public.clientes where tenant_id = v_tenant;

  insert into public.receitas
    (tenant_id, store_id, cliente_id, medico_nome, data_receita,
     od_esferico, od_cilindrico, od_eixo, od_adicao, od_dnp,
     oe_esferico, oe_cilindrico, oe_eixo, oe_adicao, oe_dnp)
  select
    v_tenant, c.store_id, c.id,
    (array['Dra. Helena Prado','Dr. Marcos Vieira','Dra. Lúcia Amaral'])[1 + c.codigo % 3],
    -- Um terço vencida, um terço vencendo, um terço recente.
    current_date - (case when c.codigo % 3 = 0 then 500 when c.codigo % 3 = 1 then 340 else 60 end),
    (-0.25 * ((c.codigo % 12) + 1))::numeric(5,2),
    case when c.codigo % 2 = 0 then -0.50 else null end,
    case when c.codigo % 2 = 0 then (c.codigo * 15) % 181 else null end,
    case when c.codigo % 4 = 0 then 2.00 else null end,
    31.0,
    (-0.25 * ((c.codigo % 10) + 1))::numeric(5,2),
    case when c.codigo % 2 = 0 then -0.75 else null end,
    case when c.codigo % 2 = 0 then (c.codigo * 20) % 181 else null end,
    case when c.codigo % 4 = 0 then 2.00 else null end,
    30.5
  from public.clientes c where c.tenant_id = v_tenant;

  -- Alguns negativados, para a coluna e o filtro terem o que mostrar.
  insert into public.cliente_negativacoes (tenant_id, cliente_id, motivo, valor)
  select v_tenant, id, 'Parcela em atraso há mais de 90 dias', 300 + codigo * 17
    from public.clientes where tenant_id = v_tenant and codigo % 8 = 0;
end $$;
