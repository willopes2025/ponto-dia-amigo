-- Atualizar todos os perfis existentes para serem admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE role != 'admin';