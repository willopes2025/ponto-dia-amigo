import { useState, useEffect } from 'react';
import { Plus, Calendar, Edit, Trash2, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Schedule {
  id: string;
  data: string;
  remoto: boolean;
  localizacao_obrigatoria: boolean;
  observacao?: string;
  user_id: string;
  shift_id: string;
  profiles: {
    nome: string;
  };
  shifts: {
    nome_turno: string;
    hora_inicio: string;
    hora_fim: string;
  };
}

interface Employee {
  id: string;
  nome: string;
  status: string;
}

interface Shift {
  id: string;
  nome_turno: string;
  hora_inicio: string;
  hora_fim: string;
}

export default function Schedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [formData, setFormData] = useState({
    user_id: '',
    shift_id: '',
    data: '',
    remoto: false,
    localizacao_obrigatoria: false,
    observacao: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSchedules();
      fetchEmployees();
      fetchShifts();
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          profiles!inner(nome, company_id),
          shifts(nome_turno, hora_inicio, hora_fim)
        `)
        .order('data', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar escalas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, status')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('nome_turno');

      if (error) throw error;
      setShifts(data || []);
    } catch (error: any) {
      console.error('Error fetching shifts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('schedules')
        .insert([formData]);

      if (error) throw error;

      await fetchSchedules();
      setIsCreateDialogOpen(false);
      setFormData({
        user_id: '',
        shift_id: '',
        data: '',
        remoto: false,
        localizacao_obrigatoria: false,
        observacao: ''
      });
      
      toast({
        title: "Escala criada",
        description: "A escala foi criada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar escala",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta escala?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      await fetchSchedules();
      
      toast({
        title: "Escala excluída",
        description: "A escala foi excluída com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir escala",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (selectedEmployee !== 'all' && schedule.user_id !== selectedEmployee) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Escalas</h2>
          <p className="text-muted-foreground">
            Gerencie os horários e turnos dos colaboradores
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Escala</DialogTitle>
              <DialogDescription>
                Agende um turno para um colaborador
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">Colaborador</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_id">Turno</Label>
                <Select value={formData.shift_id} onValueChange={(value) => setFormData(prev => ({ ...prev, shift_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.nome_turno} ({formatTime(shift.hora_inicio)} - {formatTime(shift.hora_fim)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Observações sobre a escala"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Escala
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter(s => s.data === new Date().toISOString().split('T')[0]).length}
            </div>
            <p className="text-xs text-muted-foreground">
              colaboradores escalados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter(s => {
                const scheduleDate = new Date(s.data);
                const now = new Date();
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                return scheduleDate >= weekStart && scheduleDate <= weekEnd;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              escalas programadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">
              turnos cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <CardTitle>Filtros</CardTitle>
            </div>
            <div className="flex gap-2">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma escala encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.profiles.nome}
                      </TableCell>
                      <TableCell>{formatDate(schedule.data)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {schedule.shifts.nome_turno}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatTime(schedule.shifts.hora_inicio)} - {formatTime(schedule.shifts.hora_fim)}
                      </TableCell>
                      <TableCell>{schedule.observacao || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(schedule.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}