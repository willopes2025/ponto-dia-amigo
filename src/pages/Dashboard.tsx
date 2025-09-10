import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  MapPin,
  FileText,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayEntries: number;
  lateToday: number;
}

interface RecentActivity {
  id: string;
  employee_name: string;
  tipo: string;
  timestamp: string;
  status: 'on-time' | 'late';
}

interface UserProfile {
  company_id: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    todayEntries: 0,
    lateToday: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      fetchStats();
      fetchRecentActivity();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data as UserProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchStats = async () => {
    if (!userProfile) return;

    try {
      // Get all employees in company
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('company_id', userProfile.company_id);

      if (employeesError) throw employeesError;

      // Get today's time entries
      const today = new Date().toISOString().split('T')[0];
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('data', today);

      if (entriesError) throw entriesError;

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(emp => emp.status === 'ativo').length || 0;
      const todayEntries = entries?.length || 0;

      setStats({
        totalEmployees,
        activeEmployees,
        todayEntries,
        lateToday: 0 // TODO: Calculate based on schedule comparison
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!userProfile) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          tipo,
          timestamp,
          user_id,
          profiles!inner(nome, company_id)
        `)
        .eq('profiles.company_id', userProfile.company_id)
        .eq('data', today)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedActivity = data?.map(entry => ({
        id: entry.id,
        employee_name: (entry.profiles as any).nome,
        tipo: entry.tipo,
        timestamp: entry.timestamp,
        status: 'on-time' as const // TODO: Calculate based on schedule
      })) || [];

      setRecentActivity(formattedActivity);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  };

  const formatType = (type: string) => {
    const types: { [key: string]: string } = {
      'entrada': 'Entrada',
      'saida_almoco': 'Saída para almoço',
      'volta_almoco': 'Volta do almoço',
      'saida': 'Saída'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-in-up">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do controle de ponto da sua empresa
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Colaboradores
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              cadastrados no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Colaboradores Ativos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeEmployees}</div>
            <p className="text-xs text-muted-foreground">
              em atividade
            </p>
          </CardContent>
        </Card>

        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registros Hoje
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayEntries}</div>
            <p className="text-xs text-muted-foreground">
              pontos registrados
            </p>
          </CardContent>
        </Card>

        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Atrasos Hoje
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lateToday}</div>
            <p className="text-xs text-muted-foreground">
              colaboradores atrasados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 animate-slide-in-up">
        {/* Recent Activity */}
        <Card className="animate-hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Atividade Recente</span>
            </CardTitle>
            <CardDescription>
              Últimas movimentações de ponto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <div key={activity.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in stagger-item">
                <div className="flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'on-time' ? 'bg-success' : 'bg-warning'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{activity.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{formatType(activity.tipo)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatTime(activity.timestamp)}</p>
                  <Badge 
                    variant={activity.status === 'on-time' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {activity.status === 'on-time' ? 'No horário' : 'Atrasado'}
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade hoje
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Ações Rápidas</span>
            </CardTitle>
            <CardDescription>
              Tarefas administrativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              onClick={() => navigate('/locations')}
              className="flex items-center justify-between p-3 bg-muted rounded-lg animate-fade-in stagger-item animate-hover-scale cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">Gerenciar Localizações</p>
                <p className="text-xs text-muted-foreground">Definir locais de trabalho</p>
              </div>
              <Badge variant="outline">
                <MapPin className="h-3 w-3" />
              </Badge>
            </div>
            
            <div 
              onClick={() => navigate('/employees')}
              className="flex items-center justify-between p-3 bg-muted rounded-lg animate-fade-in stagger-item animate-hover-scale cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">Gerenciar Colaboradores</p>
                <p className="text-xs text-muted-foreground">Administrar equipe</p>
              </div>
              <Badge variant="outline">
                <Users className="h-3 w-3" />
              </Badge>
            </div>
            
            <div 
              onClick={() => navigate('/reports')}
              className="flex items-center justify-between p-3 bg-muted rounded-lg animate-fade-in stagger-item animate-hover-scale cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">Relatórios</p>
                <p className="text-xs text-muted-foreground">Gerar relatórios do período</p>
              </div>
              <Badge variant="outline">
                <FileText className="h-3 w-3" />
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}