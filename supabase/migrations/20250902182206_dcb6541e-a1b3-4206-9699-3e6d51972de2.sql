-- Insert demo data for Ponto Seguro

-- Insert demo company
INSERT INTO public.companies (id, nome_fantasia, timezone, provedor_mensageria, remetente, janela_disparo_inicio, janela_disparo_fim)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Empresa Demo Ltda',
  'America/Sao_Paulo',
  'email',
  'ponto@empresademo.com.br',
  '07:30:00',
  '08:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Insert default policy for demo company
INSERT INTO public.policies (id, company_id, tolerancia_min, contar_hora_extra, excedente_paga, banco_horas, selfie_obrigatoria, gps_obrigatorio, ip_whitelist)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  15,
  true,
  false,
  true,
  false,
  false,
  ARRAY['192.168.1.0/24']
) ON CONFLICT (id) DO NOTHING;

-- Insert demo shifts
INSERT INTO public.shifts (id, company_id, nome_turno, hora_inicio, hora_fim, intervalo_minutos, dias_semana, policy_id)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'Turno Comercial',
    '08:00:00',
    '17:00:00',
    60,
    ARRAY[1,2,3,4,5],
    '550e8400-e29b-41d4-a716-446655440001'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    'Turno Manhã',
    '06:00:00',
    '14:00:00',
    60,
    ARRAY[1,2,3,4,5],
    '550e8400-e29b-41d4-a716-446655440001'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440000',
    'Turno Tarde',
    '14:00:00',
    '22:00:00',
    60,
    ARRAY[1,2,3,4,5],
    '550e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert demo holidays
INSERT INTO public.holidays (company_id, data, nome, regional, uf)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '2025-01-01', 'Confraternização Universal', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-02-17', 'Carnaval', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-02-18', 'Carnaval', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-04-21', 'Tiradentes', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-05-01', 'Dia do Trabalhador', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-09-07', 'Independência do Brasil', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-10-12', 'Nossa Senhora Aparecida', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-11-02', 'Finados', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-11-15', 'Proclamação da República', false, null),
  ('550e8400-e29b-41d4-a716-446655440000', '2025-12-25', 'Natal', false, null)
ON CONFLICT DO NOTHING;

-- Function to create demo profiles when users sign up
CREATE OR REPLACE FUNCTION public.create_demo_profile_if_demo_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is for the demo company by looking at metadata
  IF NEW.raw_user_meta_data ? 'company_id' AND 
     (NEW.raw_user_meta_data->>'company_id')::uuid = '550e8400-e29b-41d4-a716-446655440000' THEN
    
    -- Insert into profiles with the demo company
    INSERT INTO public.profiles (user_id, company_id, nome, email, role, telefone)
    VALUES (
      NEW.id,
      '550e8400-e29b-41d4-a716-446655440000',
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário Demo'),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'collab'),
      NEW.phone
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the existing trigger to use the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created_demo
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_demo_profile_if_demo_company();