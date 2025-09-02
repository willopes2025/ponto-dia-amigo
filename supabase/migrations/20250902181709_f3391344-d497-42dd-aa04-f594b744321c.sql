-- Fix missing policies for daily_summaries, holidays, requests, message_logs

-- Daily summaries policies
CREATE POLICY "Users can view their daily summaries" ON public.daily_summaries
    FOR SELECT USING (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

CREATE POLICY "System can insert daily summaries" ON public.daily_summaries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage daily summaries" ON public.daily_summaries
    FOR ALL USING (
        user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

-- Holidays policies
CREATE POLICY "Company members can view holidays" ON public.holidays
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage holidays" ON public.holidays
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Requests policies
CREATE POLICY "Users can view their requests" ON public.requests
    FOR SELECT USING (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

CREATE POLICY "Users can create their requests" ON public.requests
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage requests" ON public.requests
    FOR ALL USING (
        user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

-- Message logs policies
CREATE POLICY "Users can view their message logs" ON public.message_logs
    FOR SELECT USING (
        user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

CREATE POLICY "System can insert message logs" ON public.message_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage message logs" ON public.message_logs
    FOR ALL USING (
        user_id IN (
            SELECT p.id FROM public.profiles p
            JOIN public.profiles my_profile ON p.company_id = my_profile.company_id
            WHERE my_profile.user_id = auth.uid() AND my_profile.role = 'admin'
        )
    );

-- Fix function search paths
DROP FUNCTION IF EXISTS public.handle_updated_at();
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP FUNCTION IF EXISTS public.handle_new_user();
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;