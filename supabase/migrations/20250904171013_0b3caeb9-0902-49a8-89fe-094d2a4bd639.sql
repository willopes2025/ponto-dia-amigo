-- Function to calculate daily summaries from time entries
CREATE OR REPLACE FUNCTION public.calculate_daily_summary(
  p_user_id uuid,
  p_date date
) 
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entries RECORD;
  v_entrada TIMESTAMP;
  v_saida TIMESTAMP;
  v_pausa_inicio TIMESTAMP;
  v_pausa_fim TIMESTAMP;
  v_horas_trabalhadas INTERVAL;
  v_shift_hours INTERVAL;
  v_schedule_id UUID;
BEGIN
  -- Get time entries for the day, ordered by timestamp
  v_entrada := NULL;
  v_saida := NULL;
  v_pausa_inicio := NULL;
  v_pausa_fim := NULL;

  -- Get entries for the day
  FOR v_entries IN 
    SELECT tipo, timestamp
    FROM time_entries 
    WHERE user_id = p_user_id 
      AND data = p_date 
      AND valido = true
    ORDER BY timestamp
  LOOP
    CASE v_entries.tipo
      WHEN 'entrada' THEN
        v_entrada := v_entries.timestamp;
      WHEN 'pausa_inicio' THEN
        v_pausa_inicio := v_entries.timestamp;
      WHEN 'pausa_fim' THEN
        v_pausa_fim := v_entries.timestamp;
      WHEN 'saida' THEN
        v_saida := v_entries.timestamp;
    END CASE;
  END LOOP;

  -- Calculate worked hours
  v_horas_trabalhadas := INTERVAL '0';
  
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := v_saida - v_entrada;
    
    -- Subtract break time if both break start and end exist
    IF v_pausa_inicio IS NOT NULL AND v_pausa_fim IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas - (v_pausa_fim - v_pausa_inicio);
    END IF;
  END IF;

  -- Get expected hours from schedule
  SELECT interval_end - interval_start INTO v_shift_hours
  FROM schedules s
  JOIN shifts sh ON s.shift_id = sh.id
  WHERE s.user_id = p_user_id 
    AND s.data = p_date
  LIMIT 1;

  -- Insert or update daily summary
  INSERT INTO daily_summaries (
    user_id,
    data,
    horas_trabalhadas,
    horas_previstas,
    status,
    atrasos_min,
    extras_min
  ) 
  VALUES (
    p_user_id,
    p_date,
    v_horas_trabalhadas,
    COALESCE(v_shift_hours, INTERVAL '8 hours'),
    CASE 
      WHEN v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN 'completo'
      ELSE 'incompleto'
    END,
    0, -- Will calculate later if needed
    0  -- Will calculate later if needed
  )
  ON CONFLICT (user_id, data) 
  DO UPDATE SET
    horas_trabalhadas = EXCLUDED.horas_trabalhadas,
    horas_previstas = EXCLUDED.horas_previstas,
    status = EXCLUDED.status,
    updated_at = now();
END;
$$;

-- Function to generate daily summaries for all users and dates with time entries
CREATE OR REPLACE FUNCTION public.generate_missing_daily_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  -- For each unique user/date combination in time_entries that doesn't have a daily_summary
  FOR v_entry IN
    SELECT DISTINCT te.user_id, te.data
    FROM time_entries te
    LEFT JOIN daily_summaries ds ON ds.user_id = te.user_id AND ds.data = te.data
    WHERE ds.id IS NULL
  LOOP
    PERFORM calculate_daily_summary(v_entry.user_id, v_entry.data);
  END LOOP;
END;
$$;

-- Trigger function to automatically create/update daily summaries when time entries change
CREATE OR REPLACE FUNCTION public.handle_time_entry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle both INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM calculate_daily_summary(NEW.user_id, NEW.data);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_daily_summary(OLD.user_id, OLD.data);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger to automatically update daily summaries
DROP TRIGGER IF EXISTS trigger_time_entry_daily_summary ON time_entries;
CREATE TRIGGER trigger_time_entry_daily_summary
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_time_entry_change();

-- Generate daily summaries for existing time entries
SELECT generate_missing_daily_summaries();