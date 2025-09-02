-- Atualizar a função handle_new_user para que todas as contas sejam admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    company_uuid uuid;
BEGIN
    -- Criar empresa se for um cadastro de empresa (tem nomeEmpresa)
    IF NEW.raw_user_meta_data ? 'nomeEmpresa' THEN
        -- Primeiro criar a empresa
        INSERT INTO public.companies (nome_fantasia)
        VALUES (NEW.raw_user_meta_data->>'nomeEmpresa')
        RETURNING id INTO company_uuid;
        
        -- Depois criar o perfil do admin
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            company_uuid,
            NEW.raw_user_meta_data->>'nome',
            NEW.email,
            'admin'
        );
    -- Para qualquer outro cadastro, criar como admin com empresa padrão ou especificada
    ELSIF NEW.raw_user_meta_data ? 'nome' THEN
        -- Se tem company_id especificado, usar ele, senão criar nova empresa
        IF NEW.raw_user_meta_data ? 'company_id' THEN
            INSERT INTO public.profiles (user_id, company_id, nome, email, role)
            VALUES (
                NEW.id,
                (NEW.raw_user_meta_data->>'company_id')::uuid,
                NEW.raw_user_meta_data->>'nome',
                NEW.email,
                'admin'  -- SEMPRE admin
            );
        ELSE
            -- Criar nova empresa para este admin
            INSERT INTO public.companies (nome_fantasia)
            VALUES (COALESCE(NEW.raw_user_meta_data->>'nome', 'Empresa') || ' - Admin')
            RETURNING id INTO company_uuid;
            
            INSERT INTO public.profiles (user_id, company_id, nome, email, role)
            VALUES (
                NEW.id,
                company_uuid,
                NEW.raw_user_meta_data->>'nome',
                NEW.email,
                'admin'
            );
        END IF;
    ELSE
        -- Cadastro sem dados extras, criar empresa padrão
        INSERT INTO public.companies (nome_fantasia)
        VALUES ('Empresa - ' || COALESCE(split_part(NEW.email, '@', 1), 'Admin'))
        RETURNING id INTO company_uuid;
        
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            company_uuid,
            COALESCE(split_part(NEW.email, '@', 1), 'Admin'),
            NEW.email,
            'admin'
        );
    END IF;
    RETURN NEW;
END;
$function$;