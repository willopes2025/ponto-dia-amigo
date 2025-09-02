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
  Camera,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimesheet, TimeEntryType } from '@/hooks/useTimesheet';
import { useToast } from '@/hooks/use-toast';

export default function Timesheet() {
  const { 
    todayEntries, 
    todaySchedule, 
    workStatus, 
    loading, 
    registerTimeEntry, 
    getCurrentLocation 
  } = useTimesheet();
  
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClockAction = async (action: TimeEntryType) => {
    if (isProcessing) return;
    
    setIsProcessing(true);

    try {
      let coordinates;

      // Get location if required and not remote work
      const requiresLocation = todaySchedule?.localizacao_obrigatoria && !todaySchedule?.remoto;
      if (requiresLocation) {
        try {
          coordinates = await getCurrentLocation();
        } catch (error: any) {
          toast({
            title: "Localização necessária",
            description: error.message,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      // Register the time entry
      const success = await registerTimeEntry(action, coordinates);
      
      if (!success) {
        setIsProcessing(false);
        return;
      }

    } catch (error: any) {
      toast({
        title: "Erro ao registrar ponto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionLabel = (action: TimeEntryType | null) => {
    if (!action) return 'Ponto finalizado';
    
    const labels = {
      'entrada': 'Registrar Entrada',
      'saida': 'Registrar Saída',
      'pausa_inicio': 'Iniciar Pausa',
      'pausa_fim': 'Finalizar Pausa'
    };
    return labels[action];
  };

  const getActionIcon = (action: TimeEntryType | null) => {
    if (!action) return <Square className="h-5 w-5" />;
    
    const icons = {
      'entrada': Play,
      'saida': Square,
      'pausa_inicio': Pause,
      'pausa_fim': Play
    };
    const Icon = icons[action];
    return <Icon className="h-5 w-5" />;
  };

  const getActionColor = (action: TimeEntryType | null) => {
    if (!action) return 'bg-muted text-muted-foreground cursor-not-allowed';
    
    const colors = {
      'entrada': 'bg-success hover:bg-success/90 text-white',
      'saida': 'bg-destructive hover:bg-destructive/90 text-white',
      'pausa_inicio': 'bg-warning hover:bg-warning/90 text-white',
      'pausa_fim': 'bg-success hover:bg-success/90 text-white'
    };
    return colors[action];
  };

  const formatEntryType = (tipo: string) => {
    const types = {
      'entrada': 'Entrada',
      'pausa_inicio': 'Início Pausa',
      'pausa_fim': 'Fim Pausa',
      'saida': 'Saída'
    };
    return types[tipo as keyof typeof types] || tipo;
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando dados do ponto...</span>
        </div>
      </div>
    );
  }

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
                <p className="text-lg font-semibold">
                  {todaySchedule?.shifts.nome_turno || 'Sem turno definido'}
                </p>
                {todaySchedule?.shifts && (
                  <p className="text-sm text-muted-foreground">
                    {todaySchedule.shifts.hora_inicio} às {todaySchedule.shifts.hora_fim}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas Trabalhadas</p>
                <p className="text-2xl font-bold text-primary">{workStatus.workedHours}</p>
                {workStatus.isOnBreak && (
                  <p className="text-sm text-warning">Em pausa: {workStatus.breakTime}</p>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                className={`h-20 w-full text-lg font-semibold ${getActionColor(workStatus.nextAction)}`}
                onClick={() => workStatus.nextAction && handleClockAction(workStatus.nextAction)}
                disabled={isProcessing || !workStatus.nextAction}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Registrando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {getActionIcon(workStatus.nextAction)}
                    <span>{getActionLabel(workStatus.nextAction)}</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Work Status Indicators */}
            <div className="flex justify-center space-x-4">
              {workStatus.isWorking && !workStatus.isOnBreak && (
                <Badge variant="default" className="bg-success">
                  <Clock className="h-3 w-3 mr-1" />
                  Trabalhando
                </Badge>
              )}
              {workStatus.isOnBreak && (
                <Badge variant="default" className="bg-warning">
                  <Pause className="h-3 w-3 mr-1" />
                  Em pausa
                </Badge>
              )}
              {!workStatus.isWorking && !workStatus.isOnBreak && todayEntries.length > 0 && (
                <Badge variant="outline">
                  <Square className="h-3 w-3 mr-1" />
                  Dia finalizado
                </Badge>
              )}
            </div>

            {/* Requirements */}
            {todaySchedule && (
              <div className="flex flex-wrap gap-2">
                {todaySchedule.remoto && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    Trabalho Remoto
                  </Badge>
                )}
                {todaySchedule.localizacao_obrigatoria && !todaySchedule.remoto && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    GPS Obrigatório
                  </Badge>
                )}
              </div>
            )}
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
            {todayEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum registro hoje
              </p>
            ) : (
              <div className="space-y-3">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full ${entry.valido ? 'bg-success' : 'bg-destructive'}`} />
                      <div>
                        <p className="text-sm font-medium">
                          {formatEntryType(entry.tipo)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={entry.valido ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {entry.valido ? 'Válido' : 'Inválido'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Hoje</CardTitle>
          <CardDescription>
            Suas horas trabalhadas hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{workStatus.workedHours}</p>
              <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {todaySchedule ? 
                  (() => {
                    const start = todaySchedule.shifts.hora_inicio.split(':');
                    const end = todaySchedule.shifts.hora_fim.split(':');
                    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
                    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
                    const totalMinutes = endMinutes - startMinutes - (todaySchedule.shifts.intervalo_minutos || 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  })()
                  : '00:00'
                }
              </p>
              <p className="text-sm text-muted-foreground">Horas Previstas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{workStatus.breakTime}</p>
              <p className="text-sm text-muted-foreground">Tempo de Pausa</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {todayEntries.length}
              </p>
              <p className="text-sm text-muted-foreground">Registros</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}