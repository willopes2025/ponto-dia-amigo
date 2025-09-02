-- Remover sistema de roles e corrigir recursão infinita nas políticas RLS

-- Primeiro, criar função security definer para evitar recursão
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Remover todas as políticas problemáticas de profiles
DROP POLICY IF EXISTS "Company members can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Criar políticas simples para profiles sem recursão
CREATE POLICY "Company members can view all company profiles" 
ON public.profiles 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage all company profiles" 
ON public.profiles 
FOR ALL 
USING (company_id = get_user_company_id());

CREATE POLICY "Allow profile creation for authenticated users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Remover políticas administrativas de outras tabelas
DROP POLICY IF EXISTS "Admins can manage their company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can manage policies" ON public.policies;
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
DROP POLICY IF EXISTS "Admins can manage time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.schedules;
DROP POLICY IF EXISTS "Admins can manage daily summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Admins can manage requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can manage message logs" ON public.message_logs;

-- Criar políticas unificadas - todos da empresa podem gerenciar tudo
CREATE POLICY "Company members can manage company data" 
ON public.companies 
FOR ALL 
USING (id = get_user_company_id());

CREATE POLICY "Company members can manage locations" 
ON public.locations 
FOR ALL 
USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage shifts" 
ON public.shifts 
FOR ALL 
USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage policies" 
ON public.policies 
FOR ALL 
USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage holidays" 
ON public.holidays 
FOR ALL 
USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage time entries" 
ON public.time_entries 
FOR ALL 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  WHERE p.company_id = get_user_company_id()
));

CREATE POLICY "Company members can manage schedules" 
ON public.schedules 
FOR ALL 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  WHERE p.company_id = get_user_company_id()
));

CREATE POLICY "Company members can manage daily summaries" 
ON public.daily_summaries 
FOR ALL 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  WHERE p.company_id = get_user_company_id()
));

CREATE POLICY "Company members can manage requests" 
ON public.requests 
FOR ALL 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  WHERE p.company_id = get_user_company_id()
));

CREATE POLICY "Company members can manage message logs" 
ON public.message_logs 
FOR ALL 
USING (user_id IN ( 
  SELECT p.id 
  FROM profiles p 
  WHERE p.company_id = get_user_company_id()
));

-- Remover a coluna role da tabela profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Atualizar a função handle_new_user para não definir role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    company_uuid uuid;
BEGIN
    -- Log para debug
    RAISE LOG 'handle_new_user triggered for user: % with metadata: %', NEW.id, NEW.raw_user_meta_data;
    
    -- Criar empresa se for um cadastro de empresa (tem nomeEmpresa)
    IF NEW.raw_user_meta_data ? 'nomeEmpresa' THEN
        -- Primeiro criar a empresa
        INSERT INTO public.companies (nome_fantasia)
        VALUES (NEW.raw_user_meta_data->>'nomeEmpresa')
        RETURNING id INTO company_uuid;
        
        RAISE LOG 'Created company with ID: %', company_uuid;
        
        -- Depois criar o perfil do usuário
        INSERT INTO public.profiles (user_id, company_id, nome, email)
        VALUES (
            NEW.id,
            company_uuid,
            NEW.raw_user_meta_data->>'nome',
            NEW.email
        );
        
        RAISE LOG 'Created profile for user: %', NEW.id;
        
    -- Para qualquer outro cadastro, criar empresa genérica
    ELSE
        -- Se não tem nomeEmpresa, criar empresa genérica
        INSERT INTO public.companies (nome_fantasia)
        VALUES ('Empresa - ' || COALESCE(split_part(NEW.email, '@', 1), 'User'))
        RETURNING id INTO company_uuid;
        
        -- Criar perfil
        INSERT INTO public.profiles (user_id, company_id, nome, email)
        VALUES (
            NEW.id,
            company_uuid,
            COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
            NEW.email
        );
        
        RAISE LOG 'Created generic profile for user: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Remover função is_admin que não é mais necessária
DROP FUNCTION IF EXISTS public.is_admin();

-- Remover tipo user_role que não é mais necessário
DROP TYPE IF EXISTS user_role;