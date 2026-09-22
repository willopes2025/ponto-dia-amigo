import { z } from 'zod';

import { zCep, zCpfCnpj, zEmail, zTelefone, zUf } from '@/lib/validators';

export const clienteSchema = z.object({
  tipo: z.enum(['pf', 'pj']).default('pf'),
  nome: z.string().trim().min(2, 'Informe o nome'),
  apelido: z.string().trim().optional(),
  cpf_cnpj: zCpfCnpj.optional(),
  rg: z.string().trim().optional(),
  data_nascimento: z.string().optional(),
  sexo: z.enum(['feminino', 'masculino', 'outro', 'nao_informado']).default('nao_informado'),

  razao_social: z.string().trim().optional(),
  inscricao_estadual: z.string().trim().optional(),

  cep: zCep.optional(),
  endereco: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  uf: zUf.optional(),

  store_id: z.string().uuid().optional(),
  origem_id: z.string().uuid().optional().or(z.literal('')),
  convenio_id: z.string().uuid().optional().or(z.literal('')),
  profissao_id: z.string().uuid().optional().or(z.literal('')),
  nome_pai: z.string().trim().optional(),
  nome_mae: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),

  desconto_padrao: z.coerce.number().min(0).max(100).default(0),

  // LGPD: o consentimento é um ato, registrado com data e origem. Um booleano
  // "aceita contato" sem data não sustenta a base legal de nada.
  consentiu_contato: z.boolean().default(false),
})
  .refine((d) => d.tipo !== 'pj' || (d.razao_social ?? '').trim().length > 1, {
    path: ['razao_social'],
    message: 'Pessoa jurídica precisa de razão social',
  });

export type ClienteForm = z.infer<typeof clienteSchema>;

export const telefoneSchema = z.object({
  ddi: z.string().trim().default('55'),
  numero: zTelefone.refine((v) => v.length >= 10, 'Informe o telefone com DDD'),
  tipo: z.enum(['movel', 'fixo', 'comercial', 'recado']).default('movel'),
  aceita_whatsapp: z.boolean().default(false),
  aceita_sms: z.boolean().default(false),
  aceita_ligacao: z.boolean().default(true),
  principal: z.boolean().default(false),
});

export type TelefoneForm = z.infer<typeof telefoneSchema>;

export const emailSchema = z.object({
  email: zEmail,
  aceita_contato: z.boolean().default(true),
  principal: z.boolean().default(false),
});

export type EmailForm = z.infer<typeof emailSchema>;
