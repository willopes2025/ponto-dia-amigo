-- Atualizar políticas RLS para permitir que todos os usuários vejam dados da empresa

-- Remover políticas restritivas de profiles
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;

-- Criar nova política para que todos os membros da empresa possam ver outros perfis da empresa
CREATE POLICY "Company members can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (company_id IN ( 
  SELECT p.company_id 
  FROM profiles p 
  WHERE p.user_id = auth.uid()
));

-- Atualizar política de time_entries para permitir visualização por todos da empresa
DROP POLICY IF EXISTS "Users can view their time entries" ON public.time_entries;

CREATE POLICY "Company members can view time entries" 
ON public.time_entries 
FOR SELECT 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  JOIN profiles my_profile ON p.company_id = my_profile.company_id 
  WHERE my_profile.user_id = auth.uid()
));

-- Atualizar política de schedules para permitir visualização por todos da empresa
DROP POLICY IF EXISTS "Users can view their schedules" ON public.schedules;

CREATE POLICY "Company members can view schedules" 
ON public.schedules 
FOR SELECT 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  JOIN profiles my_profile ON p.company_id = my_profile.company_id 
  WHERE my_profile.user_id = auth.uid()
));

-- Atualizar política de daily_summaries para permitir visualização por todos da empresa
DROP POLICY IF EXISTS "Users can view their daily summaries" ON public.daily_summaries;

CREATE POLICY "Company members can view daily summaries" 
ON public.daily_summaries 
FOR SELECT 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  JOIN profiles my_profile ON p.company_id = my_profile.company_id 
  WHERE my_profile.user_id = auth.uid()
));

-- Atualizar política de requests para permitir visualização por todos da empresa
DROP POLICY IF EXISTS "Users can view their requests" ON public.requests;

CREATE POLICY "Company members can view requests" 
ON public.requests 
FOR SELECT 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  JOIN profiles my_profile ON p.company_id = my_profile.company_id 
  WHERE my_profile.user_id = auth.uid()
));

-- Atualizar política de message_logs para permitir visualização por todos da empresa
DROP POLICY IF EXISTS "Users can view their message logs" ON public.message_logs;

CREATE POLICY "Company members can view message logs" 
ON public.message_logs 
FOR SELECT 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  JOIN profiles my_profile ON p.company_id = my_profile.company_id 
  WHERE my_profile.user_id = auth.uid()
));