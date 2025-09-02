-- Create locations table for admin management
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  raio_metros INTEGER DEFAULT 100,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create policies for locations
CREATE POLICY "Admins can manage locations" 
ON public.locations 
FOR ALL 
USING (company_id IN (
  SELECT profiles.company_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Company members can view locations" 
ON public.locations 
FOR SELECT 
USING (company_id IN (
  SELECT profiles.company_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add username column to profiles for login without email
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;

-- Create index for username
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Update profiles to have username based on name (for existing users)
UPDATE public.profiles SET username = LOWER(REPLACE(nome, ' ', '.')) WHERE username IS NULL;