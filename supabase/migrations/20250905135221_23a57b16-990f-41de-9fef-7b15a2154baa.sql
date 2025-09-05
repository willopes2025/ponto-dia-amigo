-- Add shift_id column to profiles table to associate default shift to employees
ALTER TABLE public.profiles 
ADD COLUMN shift_id uuid REFERENCES public.shifts(id);

-- Add comment to document the purpose
COMMENT ON COLUMN public.profiles.shift_id IS 'Default shift assigned to the employee';