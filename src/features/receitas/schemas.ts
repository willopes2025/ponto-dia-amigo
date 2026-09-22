import { z } from 'zod';

/**
 * Validação da receita óptica.
 *
 * A grade real de lentes anda de 0,25 em 0,25 dioptria; aceitar 1,37 deixa
 * entrar uma receita que nenhum laboratório monta — e o erro só aparece na O.S.
 * travada, dias depois. As mesmas regras existem como CHECK no banco: esta
 * camada existe para o erro aparecer enquanto a pessoa digita, não no envio.
 */
const grauOpcional = z
  .union([z.literal(''), z.coerce.number()])
  .optional()
  .refine(
    (v) => v === '' || v === undefined || (Math.abs(Number(v) * 100) % 25 === 0),
    'Use passos de 0,25 (ex.: -2,25)',
  )
  .refine(
    (v) => v === '' || v === undefined || (Number(v) >= -30 && Number(v) <= 30),
    'Fora da faixa de -30 a +30',
  );

const eixoOpcional = z
  .union([z.literal(''), z.coerce.number()])
  .optional()
  .refine(
    (v) => v === '' || v === undefined || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 180),
    'O eixo vai de 0° a 180°',
  );

const adicaoOpcional = z
  .union([z.literal(''), z.coerce.number()])
  .optional()
  .refine(
    (v) => v === '' || v === undefined || (Math.abs(Number(v) * 100) % 25 === 0 && Number(v) >= 0 && Number(v) <= 4),
    'Adição de 0 a +4,00, em passos de 0,25',
  );

const olho = {
  esferico: grauOpcional,
  cilindrico: grauOpcional,
  eixo: eixoOpcional,
  adicao: adicaoOpcional,
  dnp: z.union([z.literal(''), z.coerce.number().min(20).max(45)]).optional(),
  altura: z.union([z.literal(''), z.coerce.number().min(10).max(40)]).optional(),
};

export const receitaSchema = z
  .object({
    cliente_id: z.string().uuid('Selecione o cliente'),
    tipo: z.enum(['oculos', 'lente_contato']).default('oculos'),
    medico_id: z.string().uuid().optional().or(z.literal('')),
    medico_nome: z.string().trim().optional(),
    data_receita: z.string().min(1, 'Informe a data da receita'),
    validade: z.string().optional(),

    od_esferico: olho.esferico, od_cilindrico: olho.cilindrico, od_eixo: olho.eixo,
    od_adicao: olho.adicao, od_dnp: olho.dnp, od_altura: olho.altura,

    oe_esferico: olho.esferico, oe_cilindrico: olho.cilindrico, oe_eixo: olho.eixo,
    oe_adicao: olho.adicao, oe_dnp: olho.dnp, oe_altura: olho.altura,

    observacoes: z.string().trim().optional(),
  })
  .refine((d) => Boolean(d.medico_id) || (d.medico_nome ?? '').trim().length > 2, {
    path: ['medico_nome'],
    message: 'Selecione o prescritor cadastrado ou escreva o nome',
  })
  // Cilindro sem eixo é receita incompleta: a lente não pode ser montada.
  .refine((d) => !temValor(d.od_cilindrico) || temValor(d.od_eixo), {
    path: ['od_eixo'],
    message: 'Com cilíndrico, o eixo é obrigatório',
  })
  .refine((d) => !temValor(d.oe_cilindrico) || temValor(d.oe_eixo), {
    path: ['oe_eixo'],
    message: 'Com cilíndrico, o eixo é obrigatório',
  });

export type ReceitaForm = z.infer<typeof receitaSchema>;

function temValor(v: unknown): boolean {
  return v !== '' && v !== undefined && v !== null && Number(v) !== 0;
}
