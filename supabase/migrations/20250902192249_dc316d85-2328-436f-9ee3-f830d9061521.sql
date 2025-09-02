-- Verificar e corrigir a função handle_new_user para garantir que sempre crie admin
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
        
        -- Depois criar o perfil do admin
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            company_uuid,
            NEW.raw_user_meta_data->>'nome',
            NEW.email,
            'admin'
        );
        
        RAISE LOG 'Created admin profile for user: %', NEW.id;
        
    -- Para qualquer outro cadastro, SEMPRE criar como admin
    ELSE
        -- Se não tem nomeEmpresa, criar empresa genérica
        INSERT INTO public.companies (nome_fantasia)
        VALUES ('Empresa - ' || COALESCE(split_part(NEW.email, '@', 1), 'Admin'))
        RETURNING id INTO company_uuid;
        
        -- Criar perfil como admin
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            company_uuid,
            COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
            NEW.email,
            'admin'
        );
        
        RAISE LOG 'Created generic admin profile for user: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$;