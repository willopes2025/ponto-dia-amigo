import { z } from 'zod';

import { zEmail, zSenha } from '@/lib/validators';

export const entrarSchema = z.object({
  email: zEmail,
  senha: z.string().min(1, 'Informe a senha'),
});

export type EntrarForm = z.infer<typeof entrarSchema>;

export const cadastrarSchema = z
  .object({
    nome: z.string().trim().min(3, 'Informe seu nome completo'),
    email: zEmail,
    senha: zSenha,
    confirmarSenha: z.string(),
    nomeRede: z.string().trim().min(3, 'Informe o nome da rede ou da ótica'),
    nomeLoja: z.string().trim().optional(),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    path: ['confirmarSenha'],
    message: 'As senhas não conferem',
  });

export type CadastrarForm = z.infer<typeof cadastrarSchema>;
