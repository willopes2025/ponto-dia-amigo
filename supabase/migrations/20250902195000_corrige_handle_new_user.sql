-- Corrigir a função handle_new_user para só criar admin quando houver nomeEmpresa
-- Não criar perfis automáticos para cadastros sem nomeEmpresa (colaboradores)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    company_uuid uuid;
BEGIN
    RAISE LOG 'handle_new_user triggered for user: % with metadata: %', NEW.id, NEW.raw_user_meta_data;
    
    -- Só criar empresa e admin se for um cadastro de empresa (tem nomeEmpresa)
    IF NEW.raw_user_meta_data ? 'nomeEmpresa' THEN
        INSERT INTO public.companies (nome_fantasia)
        VALUES (NEW.raw_user_meta_data->>'nomeEmpresa')
        RETURNING id INTO company_uuid;
        
        RAISE LOG 'Created company with ID: %', company_uuid;
        
        INSERT INTO public.profiles (user_id, company_id, nome, email, role)
        VALUES (
            NEW.id,
            company_uuid,
            NEW.raw_user_meta_data->>'nome',
            NEW.email,
            'admin'
        );
        
        RAISE LOG 'Created admin profile for user: %', NEW.id;
    END IF;
    -- Para cadastros sem nomeEmpresa, não criar perfil automático
    -- O perfil será criado posteriormente pelo admin da empresa
    
    RETURN NEW;
END;
$function$;