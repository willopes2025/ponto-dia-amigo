import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type TimeEntryType = 'entrada' | 'saida' | 'pausa_inicio' | 'pausa_fim';

export interface TimeEntry {
  id: string;
  tipo: TimeEntryType;
  timestamp: string;
  data: string;
  valido: boolean;
  gps_lat?: number;
  gps_lng?: number;
  selfie_url?: string;
  user_id: string;
}

export interface Schedule {
  id: string;
  data: string;
  shifts: {
    nome_turno: string;
    hora_inicio: string;
    hora_fim: string;
    intervalo_minutos: number;
  };
  remoto: boolean;
  localizacao_obrigatoria: boolean;
}

export interface WorkStatus {
  isWorking: boolean;
  isOnBreak: boolean;
  currentTime: string;
  workedHours: string;
  breakTime: string;
  nextAction: TimeEntryType | null;
}

export function useTimesheet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatus>({
    isWorking: false,
    isOnBreak: false,
    currentTime: '',
    workedHours: '00:00',
    breakTime: '00:00',
    nextAction: 'entrada'
  });
  const [loading, setLoading] = useState(true);

  // Fetch today's data when component mounts
  useEffect(() => {
    if (user) {
      fetchTodayData();
      
      // Update current time every minute
      const interval = setInterval(() => {
        const now = new Date();
        setWorkStatus(prev => ({
          ...prev,
          currentTime: now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }));
        calculateWorkStatus();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Recalculate work status when entries change
  useEffect(() => {
    calculateWorkStatus();
  }, [todayEntries]);

  const fetchTodayData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Get user profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch today's schedule
      const { data: schedule } = await supabase
        .from('schedules')
        .select(`
          *,
          shifts (
            nome_turno,
            hora_inicio,
            hora_fim,
            intervalo_minutos
          )
        `)
        .eq('user_id', profile.id)
        .eq('data', today)
        .single();

      setTodaySchedule(schedule as any);

      // Fetch today's time entries
      const { data: entries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', profile.id)
        .eq('data', today)
        .order('timestamp', { ascending: true });

      setTodayEntries(entries as TimeEntry[] || []);
    } catch (error) {
      console.error('Error fetching today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkStatus = () => {
    const now = new Date();
    const entries = [...todayEntries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let isWorking = false;
    let isOnBreak = false;
    let workStartTime: Date | null = null;
    let breakStartTime: Date | null = null;
    let totalWorkedMs = 0;
    let totalBreakMs = 0;

    // Calculate work status based on entries
    for (const entry of entries) {
      const entryTime = new Date(entry.timestamp);
      
      switch (entry.tipo) {
        case 'entrada':
          isWorking = true;
          workStartTime = entryTime;
          break;
        case 'pausa_inicio':
          isOnBreak = true;
          breakStartTime = entryTime;
          if (workStartTime) {
            totalWorkedMs += entryTime.getTime() - workStartTime.getTime();
            workStartTime = null;
          }
          break;
        case 'pausa_fim':
          isOnBreak = false;
          isWorking = true;
          if (breakStartTime) {
            totalBreakMs += entryTime.getTime() - breakStartTime.getTime();
            breakStartTime = null;
          }
          workStartTime = entryTime;
          break;
        case 'saida':
          isWorking = false;
          if (workStartTime) {
            totalWorkedMs += entryTime.getTime() - workStartTime.getTime();
            workStartTime = null;
          }
          break;
      }
    }

    // Add current period if still working or on break
    if (isWorking && workStartTime) {
      totalWorkedMs += now.getTime() - workStartTime.getTime();
    }
    if (isOnBreak && breakStartTime) {
      totalBreakMs += now.getTime() - breakStartTime.getTime();
    }

    // Determine next action
    let nextAction: TimeEntryType | null = null;
    const hasEntry = entries.some(e => e.tipo === 'entrada');
    const hasPausaInicio = entries.some(e => e.tipo === 'pausa_inicio');
    const hasPausaFim = entries.some(e => e.tipo === 'pausa_fim');
    const hasSaida = entries.some(e => e.tipo === 'saida');

    if (!hasEntry) {
      nextAction = 'entrada';
    } else if (!hasPausaInicio && isWorking && !isOnBreak) {
      // Allow pause when working (regardless of scheduled break time)
      nextAction = 'pausa_inicio';
    } else if (hasPausaInicio && !hasPausaFim && isOnBreak) {
      nextAction = 'pausa_fim';
    } else if (!isOnBreak && hasEntry && !hasSaida) {
      nextAction = 'saida';
    }

    setWorkStatus({
      isWorking: isWorking && !isOnBreak,
      isOnBreak,
      currentTime: now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      workedHours: formatDuration(totalWorkedMs),
      breakTime: formatDuration(totalBreakMs),
      nextAction
    });
  };

  const formatDuration = (milliseconds: number): string => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const registerTimeEntry = async (
    tipo: TimeEntryType, 
    coordinates?: { latitude: number; longitude: number },
    selfieUrl?: string
  ) => {
    if (!user) return false;

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Perfil do usuário não encontrado');
      }

      // Check if location is required but not provided
      const requiresLocation = todaySchedule?.localizacao_obrigatoria && !todaySchedule?.remoto;
      if (requiresLocation && (!coordinates || !coordinates.latitude || !coordinates.longitude)) {
        throw new Error('Localização é obrigatória para registrar o ponto neste turno');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const entryData = {
        user_id: profile.id,
        tipo,
        timestamp: now.toISOString(),
        data: today,
        valido: true,
        gps_lat: coordinates?.latitude,
        gps_lng: coordinates?.longitude,
        selfie_url: selfieUrl
      };

      const { data, error } = await supabase
        .from('time_entries')
        .insert([entryData])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTodayEntries(prev => [...prev, data as TimeEntry]);

      // Show success message
      const actionLabels = {
        entrada: 'Entrada registrada',
        pausa_inicio: 'Pausa iniciada',
        pausa_fim: 'Pausa finalizada',
        saida: 'Saída registrada'
      };

      toast({
        title: actionLabels[tipo],
        description: `Registrado às ${now.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao registrar ponto",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error('Erro ao obter localização: ' + error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  return {
    todayEntries,
    todaySchedule,
    workStatus,
    loading,
    registerTimeEntry,
    getCurrentLocation,
    refreshData: fetchTodayData
  };
}