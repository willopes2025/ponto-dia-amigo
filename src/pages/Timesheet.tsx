import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Calendar,
  MapPin,
  Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data - será substituído por dados reais
const mockTodaySchedule = {
  shift: "Turno Manhã",
  startTime: "08:00",
  endTime: "17:00",
  breakMinutes: 60,
  isRemote: false,
  requiresGPS: true,
  requiresSelfie: false
};

const mockTimeEntries = [
  { id: 1, type: "entrada", time: "08:05", valid: true, late: true },
  { id: 2, type: "pausa_inicio", time: "12:00", valid: true, late: false },
  { id: 3, type: "pausa_fim", time: "13:05", valid: true, late: true },
];

const mockCurrentStatus = {
  isWorking: true,
  isOnBreak: false,
  currentTime: "14:30",
  workedHours: "05:25",
  breakTime: "01:05"
};

export default function Timesheet() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleClockAction = async (action: 'entrada' | 'saida' | 'pausa_inicio' | 'pausa_fim') => {
    // Get location if required
    if (mockTodaySchedule.requiresGPS) {
      setIsLoadingLocation(true);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        setLocation(position);
      } catch (error) {
        console.error('Location error:', error);
        // Handle location error
      }
      setIsLoadingLocation(false);
    }

    // TODO: Implement actual time entry creation with Supabase
    console.log('Clock action:', action, location);
  };

  const getNextAction = () => {
    if (!mockCurrentStatus.isWorking) return 'entrada';
    if (!mockCurrentStatus.isOnBreak && mockTodaySchedule.breakMinutes > 0) return 'pausa_inicio';
    if (mockCurrentStatus.isOnBreak) return 'pausa_fim';
    return 'saida';
  };

  const getActionLabel = (action: string) => {
    const labels = {
      'entrada': 'Registrar Entrada',
      'saida': 'Registrar Saída',
      'pausa_inicio': 'Iniciar Pausa',
      'pausa_fim': 'Finalizar Pausa'
    };
    return labels[action as keyof typeof labels];
  };

  const getActionIcon = (action: string) => {
    const icons = {
      'entrada': Play,
      'saida': Square,
      'pausa_inicio': Pause,
      'pausa_fim': Play
    };
    const Icon = icons[action as keyof typeof icons];
    return <Icon className="h-5 w-5" />;
  };

  const getActionColor = (action: string) => {
    const colors = {
      'entrada': 'bg-time-entry hover:bg-time-entry/90',
      'saida': 'bg-time-exit hover:bg-time-exit/90',
      'pausa_inicio': 'bg-time-pause hover:bg-time-pause/90',
      'pausa_fim': 'bg-success hover:bg-success/90'
    };
    return colors[action as keyof typeof colors];
  };

  const nextAction = getNextAction();
  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Meu Ponto</h2>
        <p className="text-muted-foreground">
          {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Status Atual</span>
            </CardTitle>
            <CardDescription>
              Seu horário de trabalho hoje
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Turno</p>
                <p className="text-lg font-semibold">{mockTodaySchedule.shift}</p>
                <p className="text-sm text-muted-foreground">
                  {mockTodaySchedule.startTime} às {mockTodaySchedule.endTime}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas Trabalhadas</p>
                <p className="text-2xl font-bold text-primary">{mockCurrentStatus.workedHours}</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                className={`h-20 w-full text-lg font-semibold text-white ${getActionColor(nextAction)}`}
                onClick={() => handleClockAction(nextAction as any)}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Obtendo localização...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {getActionIcon(nextAction)}
                    <span>{getActionLabel(nextAction)}</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Requirements */}
            <div className="flex flex-wrap gap-2">
              {mockTodaySchedule.isRemote && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Trabalho Remoto
                </Badge>
              )}
              {mockTodaySchedule.requiresGPS && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  GPS Obrigatório
                </Badge>
              )}
              {mockTodaySchedule.requiresSelfie && (
                <Badge variant="outline" className="text-xs">
                  <Camera className="h-3 w-3 mr-1" />
                  Selfie Obrigatória
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Registros de Hoje</span>
            </CardTitle>
            <CardDescription>
              Suas marcações de ponto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockTimeEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum registro hoje
              </p>
            ) : (
              <div className="space-y-3">
                {mockTimeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full ${entry.valid ? 'bg-success' : 'bg-destructive'}`} />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {entry.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.time}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={entry.late ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {entry.late ? 'Atrasado' : 'No horário'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            {mockCurrentStatus.isOnBreak && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm font-medium text-warning-foreground">
                  Você está em pausa
                </p>
                <p className="text-xs text-muted-foreground">
                  Tempo de pausa: {mockCurrentStatus.breakTime}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Semana</CardTitle>
          <CardDescription>
            Suas horas trabalhadas esta semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">32:15</p>
              <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">40:00</p>
              <p className="text-sm text-muted-foreground">Horas Previstas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">2:30</p>
              <p className="text-sm text-muted-foreground">Horas Extras</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">-10:15</p>
              <p className="text-sm text-muted-foreground">Saldo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}