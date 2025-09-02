import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  TrendingUp
} from 'lucide-react';

// Mock data - será substituído por dados reais do Supabase
const mockStats = {
  totalEmployees: 25,
  presentToday: 22,
  lateToday: 3,
  onBreak: 5,
  todayHours: "176.5",
  expectedHours: "200.0",
  efficiency: 88.25
};

const mockRecentActivity = [
  { id: 1, employee: "João Silva", action: "Entrada", time: "08:05", status: "late" },
  { id: 2, employee: "Maria Santos", action: "Saída para almoço", time: "12:00", status: "on-time" },
  { id: 3, employee: "Pedro Costa", action: "Entrada", time: "07:58", status: "on-time" },
  { id: 4, employee: "Ana Oliveira", action: "Volta do almoço", time: "13:15", status: "late" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do controle de ponto da sua empresa
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Colaboradores Presentes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              de {mockStats.totalEmployees} colaboradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Atrasos Hoje
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{mockStats.lateToday}</div>
            <p className="text-xs text-muted-foreground">
              colaboradores atrasados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas Trabalhadas
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.todayHours}h</div>
            <p className="text-xs text-muted-foreground">
              de {mockStats.expectedHours}h previstas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Eficiência
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{mockStats.efficiency}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% do mês passado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
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
            {mockRecentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'on-time' ? 'bg-success' : 'bg-warning'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{activity.employee}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{activity.time}</p>
                  <Badge 
                    variant={activity.status === 'on-time' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {activity.status === 'on-time' ? 'No horário' : 'Atrasado'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Ações Rápidas</span>
            </CardTitle>
            <CardDescription>
              Tarefas pendentes e lembretes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Revisar Solicitações</p>
                <p className="text-xs text-muted-foreground">2 solicitações de ajuste pendentes</p>
              </div>
              <Badge variant="outline">2</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Relatório Semanal</p>
                <p className="text-xs text-muted-foreground">Gerar relatório da semana</p>
              </div>
              <Badge variant="outline">Novo</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Escalas da Próxima Semana</p>
                <p className="text-xs text-muted-foreground">Definir horários dos colaboradores</p>
              </div>
              <Badge variant="outline">Pendente</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}