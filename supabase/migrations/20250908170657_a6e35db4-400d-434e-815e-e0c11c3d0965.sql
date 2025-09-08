-- Create positions table for custom roles
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  permissoes jsonb DEFAULT '{}'::jsonb,
  is_admin boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(company_id, nome)
);

-- Enable RLS for positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Positions policies
CREATE POLICY "Company members can view positions"
ON public.positions FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage positions"
ON public.positions FOR ALL
USING (company_id = get_user_company_id() AND is_admin());

-- Add position_id to profiles and remove role column dependency
ALTER TABLE public.profiles ADD COLUMN position_id uuid REFERENCES public.positions(id);

-- Create default admin and user positions for existing companies
INSERT INTO public.positions (company_id, nome, descricao, is_admin, permissoes)
SELECT 
  c.id as company_id,
  'Administrador' as nome,
  'Cargo com acesso total ao sistema' as descricao,
  true as is_admin,
  '{
    "settings": true,
    "employees": true,
    "reports": true,
    "schedules": true,
    "timesheet": true
  }'::jsonb as permissoes
FROM companies c;

INSERT INTO public.positions (company_id, nome, descricao, is_admin, permissoes)
SELECT 
  c.id as company_id,
  'Colaborador' as nome,
  'Cargo básico do sistema' as descricao,
  false as is_admin,
  '{
    "timesheet": true,
    "reports_own": true
  }'::jsonb as permissoes
FROM companies c;

-- Update existing profiles to use positions
UPDATE public.profiles 
SET position_id = (
  SELECT p.id 
  FROM positions p 
  WHERE p.company_id = profiles.company_id 
    AND ((profiles.role = 'admin' AND p.is_admin = true) 
         OR (profiles.role != 'admin' AND p.is_admin = false))
  LIMIT 1
);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update is_admin function to check positions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles pr
    JOIN positions pos ON pr.position_id = pos.id
    WHERE pr.user_id = auth.uid() AND pos.is_admin = true
  );
$function$;