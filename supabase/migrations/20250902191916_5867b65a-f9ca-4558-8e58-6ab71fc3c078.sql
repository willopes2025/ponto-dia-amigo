-- Confirmar o email natanfgnntt123@gmail.com  
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'natanfgnntt123@gmail.com';