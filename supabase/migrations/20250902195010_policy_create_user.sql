-- Remover políticas existentes de INSERT para profiles que podem conflitar
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Criar policy que permite que apenas administradores possam inserir colaboradores
-- e que usuários possam criar perfil admin apenas para si mesmos
CREATE POLICY "Admins can create collaborators"
ON public.profiles
FOR INSERT
WITH CHECK (
  (role = 'collab' AND
   company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  OR
  (role = 'admin' AND user_id = auth.uid())
);