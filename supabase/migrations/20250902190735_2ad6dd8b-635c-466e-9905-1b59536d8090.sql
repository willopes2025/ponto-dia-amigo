-- Primeiro, vamos dropar as policies problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Admins can manage profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Criar políticas mais simples e sem recursão
-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- Permitir inserção de perfis (necessário para o signup)
CREATE POLICY "Allow profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Criar uma função security definer para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Admins podem ver todos os perfis da empresa
CREATE POLICY "Admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  public.is_admin() AND 
  company_id IN (
    SELECT p.company_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Admins podem gerenciar perfis da empresa
CREATE POLICY "Admins can manage company profiles" 
ON public.profiles 
FOR ALL 
USING (
  public.is_admin() AND 
  company_id IN (
    SELECT p.company_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Atualizar a função handle_new_user para garantir que empresas sejam criadas como admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Criar empresa se for um cadastro de empresa (tem nomeEmpresa)
    IF NEW.raw_user_meta_data ? 'nomeEmpresa' THEN
        -- Primeiro criar a empresa
        INSERT INTO public.companies (nome_fantasia)
        VALUES (NEW.raw_user_meta_data->>'nomeEmpresa')
        RETURNING id INTO NEW.raw_user_meta_data;
        
        -- Depois criar o perfil do admin
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            (NEW.raw_user_meta_data->>'id')::uuid,
            NEW.raw_user_meta_data->>'nome',
            NEW.email,
            'admin'
        );
    -- Criar perfil de colaborador se já tem company_id
    ELSIF NEW.raw_user_meta_data ? 'nome' AND NEW.raw_user_meta_data ? 'company_id' THEN
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            (NEW.raw_user_meta_data->>'company_id')::uuid,
            NEW.raw_user_meta_data->>'nome',
            NEW.email,
            COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'collab')
        );
    END IF;
    RETURN NEW;
END;
$function$;