-- Permite apenas admin criar colaboradores (user) para sua empresa
CREATE POLICY "Admins can create collaborators"
ON public.profiles
FOR INSERT
WITH CHECK (
  (role = 'user' AND
   company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  OR
  (role = 'admin' AND user_id = auth.uid()) -- só pode criar admin para si mesmo (signup)
);