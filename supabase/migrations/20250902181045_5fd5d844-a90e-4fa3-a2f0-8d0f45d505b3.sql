-- Create custom types for enums
CREATE TYPE user_role AS ENUM ('admin', 'collab');
CREATE TYPE time_entry_type AS ENUM ('entrada', 'saida', 'pausa_inicio', 'pausa_fim');
CREATE TYPE entry_origin AS ENUM ('app', 'webhook', 'ajuste_admin');
CREATE TYPE request_type AS ENUM ('ajuste', 'abono', 'folga');
CREATE TYPE request_status AS ENUM ('pendente', 'aprovado', 'negado');
CREATE TYPE daily_status AS ENUM ('completo', 'incompleto', 'faltou');
CREATE TYPE message_status AS ENUM ('ok', 'falha');
CREATE TYPE messaging_provider AS ENUM ('whatsapp', 'sms', 'email');

-- Companies table
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_fantasia TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    provedor_mensageria messaging_provider DEFAULT 'email',
    chave_api TEXT,
    remetente TEXT,
    janela_disparo_inicio TIME DEFAULT '07:30:00',
    janela_disparo_fim TIME DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    role user_role DEFAULT 'collab',
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT, -- E.164 format
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id)
);

-- Policies table
CREATE TABLE public.policies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    tolerancia_min INTEGER DEFAULT 5,
    contar_hora_extra BOOLEAN DEFAULT false,
    excedente_paga BOOLEAN DEFAULT false,
    banco_horas BOOLEAN DEFAULT false,
    selfie_obrigatoria BOOLEAN DEFAULT false,
    gps_obrigatorio BOOLEAN DEFAULT false,
    ip_whitelist TEXT[], -- array of IPs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shifts table
CREATE TABLE public.shifts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    nome_turno TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    intervalo_minutos INTEGER DEFAULT 0,
    dias_semana INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Monday, 7=Sunday
    policy_id UUID REFERENCES public.policies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Schedules table
CREATE TABLE public.schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE NOT NULL,
    observacao TEXT,
    remoto BOOLEAN DEFAULT false,
    localizacao_obrigatoria BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Time Entries table
CREATE TABLE public.time_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    tipo time_entry_type NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    origem entry_origin DEFAULT 'app',
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    selfie_url TEXT,
    ip INET,
    valido BOOLEAN DEFAULT true,
    motivo_invalidez TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily Summaries table
CREATE TABLE public.daily_summaries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    horas_previstas INTERVAL,
    horas_trabalhadas INTERVAL,
    saldo_dia INTERVAL,
    atrasos_min INTEGER DEFAULT 0,
    extras_min INTEGER DEFAULT 0,
    status daily_status DEFAULT 'incompleto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, data)
);

-- Holidays table
CREATE TABLE public.holidays (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    nome TEXT NOT NULL,
    regional BOOLEAN DEFAULT false,
    uf TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Requests table
CREATE TABLE public.requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tipo request_type NOT NULL,
    data_ref DATE,
    payload JSONB,
    status request_status DEFAULT 'pendente',
    motivo_admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Message Logs table
CREATE TABLE public.message_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    canal messaging_provider NOT NULL,
    template_id TEXT,
    enviado_em TIMESTAMP WITH TIME ZONE,
    status message_status DEFAULT 'ok',
    erro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for companies
CREATE POLICY "Users can view their company" ON public.companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their company" ON public.companies
    FOR ALL USING (
        id IN (
            SELECT company_id FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create policies for profiles
CREATE POLICY "Users can view profiles in their company" ON public.profiles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles in their company" ON public.profiles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create policies for other tables (similar pattern)
CREATE POLICY "Company members can view policies" ON public.policies
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage policies" ON public.policies
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Similar policies for shifts, schedules, etc.
CREATE POLICY "Company members can view shifts" ON public.shifts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage shifts" ON public.shifts
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Schedules policies
CREATE POLICY "Users can view their schedules" ON public.schedules
    FOR SELECT USING (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage schedules" ON public.schedules
    FOR ALL USING (
        user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

-- Time entries policies
CREATE POLICY "Users can view their time entries" ON public.time_entries
    FOR SELECT USING (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

CREATE POLICY "Users can insert their time entries" ON public.time_entries
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage time entries" ON public.time_entries
    FOR ALL USING (
        user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_policies_updated_at
    BEFORE UPDATE ON public.policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_daily_summaries_updated_at
    BEFORE UPDATE ON public.daily_summaries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON public.requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if email and name are provided in metadata
    IF NEW.raw_user_meta_data ? 'nome' AND NEW.raw_user_meta_data ? 'company_id' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();