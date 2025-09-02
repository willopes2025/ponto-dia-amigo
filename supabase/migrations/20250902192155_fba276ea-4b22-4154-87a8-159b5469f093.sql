-- Criar perfis faltantes como admin para usuários que não têm perfil
INSERT INTO public.profiles (user_id, company_id, nome, email, role)
SELECT 
    u.id as user_id,
    c.id as company_id,
    COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)) as nome,
    u.email,
    'admin' as role
FROM auth.users u
CROSS JOIN (
    SELECT id FROM public.companies ORDER BY created_at DESC LIMIT 1
) c
WHERE u.id NOT IN (SELECT user_id FROM public.profiles)
AND u.raw_user_meta_data ? 'nomeEmpresa';

-- Se não há empresas, criar uma empresa padrão para os usuários sem perfil
INSERT INTO public.companies (nome_fantasia)
SELECT 'Empresa - ' || COALESCE(u.raw_user_meta_data->>'nomeEmpresa', split_part(u.email, '@', 1))
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.profiles)
AND u.raw_user_meta_data ? 'nomeEmpresa'
AND NOT EXISTS (SELECT 1 FROM public.companies);

-- Atualizar todos os perfis existentes para serem admin
UPDATE public.profiles SET role = 'admin' WHERE role != 'admin';