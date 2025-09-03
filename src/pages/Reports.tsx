import { useState, useEffect } from 'react';
import { Download, Filter, Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeEntry {
  id: string;
  timestamp: string;
  tipo: string;
  data: string;
  valido: boolean;
  profiles: {
    nome: string;
  };
}

interface DailySummary {
  id: string;
  data: string;
  horas_trabalhadas: string | null;
  horas_previstas: string | null;
  atrasos_min: number;
  extras_min: number;
  status: string;
  profiles: {
    nome: string;
  };
}

interface MonthlyReport {
  employee_id: string;
  employee_name: string;
  total_hours: number;
  total_days: number;
  average_daily_hours: number;
  status: string;
}

interface Employee {
  id: string;
  nome: string;
  status: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'entries' | 'summary' | 'monthly'>('monthly');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalEmployees: 0,
    totalHours: 0,
    averageHours: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEmployees();
      fetchData();
    }
  }, [user, reportType, selectedEmployee, startDate, endDate]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      if (reportType === 'entries') {
        await fetchTimeEntries();
      } else if (reportType === 'summary') {
        await fetchDailySummaries();
      } else if (reportType === 'monthly') {
        await fetchMonthlyReports();
      }
      await calculateStats();
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        profiles!inner(nome, company_id)
      `)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('timestamp', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('user_id', selectedEmployee);
    }

    const { data, error } = await query;
    if (error) throw error;
    setTimeEntries(data || []);
  };

  const fetchDailySummaries = async () => {
    let query = supabase
      .from('daily_summaries')
      .select(`
        *,
        profiles!inner(nome, company_id)
      `)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('user_id', selectedEmployee);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Cast the data to ensure proper typing
    const typedSummaries = (data || []).map(summary => ({
      ...summary,
      horas_trabalhadas: summary.horas_trabalhadas as string | null,
      horas_previstas: summary.horas_previstas as string | null
    }));
    
    setDailySummaries(typedSummaries);
  };

  const fetchMonthlyReports = async () => {
    try {
      let query = supabase
        .from('daily_summaries')
        .select(`
          user_id,
          horas_trabalhadas,
          profiles!inner(nome, company_id)
        `)
        .gte('data', startDate)
        .lte('data', endDate)
        .not('horas_trabalhadas', 'is', null);

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by employee and calculate totals
      const employeeMap = new Map<string, {
        employee_id: string;
        employee_name: string;
        total_minutes: number;
        total_days: number;
      }>();

      data?.forEach(summary => {
        const empId = summary.user_id;
        const empName = summary.profiles.nome;
        
        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employee_id: empId,
            employee_name: empName,
            total_minutes: 0,
            total_days: 0
          });
        }

        const emp = employeeMap.get(empId)!;
        emp.total_days++;

        if (summary.horas_trabalhadas && typeof summary.horas_trabalhadas === 'string') {
          const match = summary.horas_trabalhadas.match(/(\d+):(\d+):(\d+)/);
          if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            emp.total_minutes += (hours * 60) + minutes;
          }
        }
      });

      const monthlyData: MonthlyReport[] = Array.from(employeeMap.values()).map(emp => ({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        total_hours: Math.round((emp.total_minutes / 60) * 100) / 100,
        total_days: emp.total_days,
        average_daily_hours: emp.total_days > 0 ? Math.round((emp.total_minutes / 60 / emp.total_days) * 100) / 100 : 0,
        status: 'ativo'
      }));

      setMonthlyReports(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
      throw error;
    }
  };

  const calculateStats = async () => {
    try {
      // Total entries in period
      const { count: entriesCount } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .gte('data', startDate)
        .lte('data', endDate);

      // Active employees
      const { count: employeesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // Daily summaries for hours calculation
      const { data: summaries } = await supabase
        .from('daily_summaries')
        .select('horas_trabalhadas')
        .gte('data', startDate)
        .lte('data', endDate)
        .not('horas_trabalhadas', 'is', null);

      let totalMinutes = 0;
      summaries?.forEach(summary => {
        if (summary.horas_trabalhadas && typeof summary.horas_trabalhadas === 'string') {
          // Convert PostgreSQL interval to minutes
          const match = summary.horas_trabalhadas.match(/(\d+):(\d+):(\d+)/);
          if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            totalMinutes += (hours * 60) + minutes;
          }
        }
      });

      const totalHours = totalMinutes / 60;
      const averageHours = summaries?.length ? totalHours / summaries.length : 0;

      setStats({
        totalEntries: entriesCount || 0,
        totalEmployees: employeesCount || 0,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: Math.round(averageHours * 100) / 100
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const formatDateTime = (timestamp: string) => {
    return format(parseISO(timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatType = (type: string) => {
    const types: { [key: string]: string } = {
      'entrada': 'Entrada',
      'saida_almoco': 'Saída Almoço',
      'volta_almoco': 'Volta Almoço',
      'saida': 'Saída'
    };
    return types[type] || type;
  };

  const formatInterval = (interval: string | null) => {
    if (!interval) return '-';
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return interval;
  };

  const handleExport = () => {
    let data: any[] = [];
    let reportTypeName = '';
    
    if (reportType === 'entries') {
      data = timeEntries;
      reportTypeName = 'entries';
    } else if (reportType === 'summary') {
      data = dailySummaries;
      reportTypeName = 'summary';
    } else if (reportType === 'monthly') {
      data = monthlyReports;
      reportTypeName = 'monthly';
    }
    
    if (data.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados no período selecionado.",
        variant: "destructive",
      });
      return;
    }

    // Simple CSV export
    let csv = '';
    let headers = [];
    
    if (reportType === 'entries') {
      headers = ['Colaborador', 'Data/Hora', 'Tipo', 'Status'];
      csv = headers.join(',') + '\n';
      
      timeEntries.forEach(entry => {
        csv += [
          entry.profiles.nome,
          formatDateTime(entry.timestamp),
          formatType(entry.tipo),
          entry.valido ? 'Válido' : 'Inválido'
        ].join(',') + '\n';
      });
    } else if (reportType === 'summary') {
      headers = ['Colaborador', 'Data', 'Horas Trabalhadas', 'Horas Previstas', 'Status'];
      csv = headers.join(',') + '\n';
      
      dailySummaries.forEach(summary => {
        csv += [
          summary.profiles.nome,
          formatDate(summary.data),
          formatInterval(summary.horas_trabalhadas),
          formatInterval(summary.horas_previstas),
          summary.status
        ].join(',') + '\n';
      });
    } else if (reportType === 'monthly') {
      headers = ['Colaborador', 'Horas Totais', 'Dias Trabalhados', 'Média Diária'];
      csv = headers.join(',') + '\n';
      
      monthlyReports.forEach(report => {
        csv += [
          report.employee_name,
          `${report.total_hours}h`,
          report.total_days,
          `${report.average_daily_hours}h`
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${reportTypeName}_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório exportado",
      description: "O arquivo CSV foi baixado com sucesso.",
    });
  };

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
          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">
            Análise detalhada de frequência e produtividade
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              ativos no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              trabalhadas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageHours}h</div>
            <p className="text-xs text-muted-foreground">
              por colaborador/dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={(value: 'entries' | 'summary' | 'monthly') => setReportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Resumo Mensal</SelectItem>
                <SelectItem value="entries">Registros de Ponto</SelectItem>
                <SelectItem value="summary">Resumo Diário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={fetchData} className="w-full">
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {reportType === 'entries' ? 'Registros de Ponto' : 
             reportType === 'summary' ? 'Resumo Diário' : 
             'Resumo Mensal por Colaborador'}
          </CardTitle>
          <CardDescription>
            {reportType === 'entries' 
              ? 'Todos os registros de entrada e saída no período'
              : reportType === 'summary'
              ? 'Resumo das horas trabalhadas por dia'
              : 'Horas totais trabalhadas por cada colaborador no período'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  {reportType === 'entries' ? (
                    <>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  ) : reportType === 'summary' ? (
                    <>
                      <TableHead>Data</TableHead>
                      <TableHead>Horas Trabalhadas</TableHead>
                      <TableHead>Horas Previstas</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Horas Totais</TableHead>
                      <TableHead>Dias Trabalhados</TableHead>
                      <TableHead>Média Diária</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reportType === 'entries' ? timeEntries : 
                  reportType === 'summary' ? dailySummaries : 
                  monthlyReports).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado
                    </TableCell>
                  </TableRow>
                ) : reportType === 'entries' ? (
                  timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.profiles.nome}
                      </TableCell>
                      <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatType(entry.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.valido ? 'default' : 'destructive'}>
                          {entry.valido ? 'Válido' : 'Inválido'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : reportType === 'summary' ? (
                  dailySummaries.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell className="font-medium">
                        {summary.profiles.nome}
                      </TableCell>
                      <TableCell>{formatDate(summary.data)}</TableCell>
                      <TableCell>{formatInterval(summary.horas_trabalhadas)}</TableCell>
                      <TableCell>{formatInterval(summary.horas_previstas)}</TableCell>
                      <TableCell>
                        <Badge variant={summary.status === 'completo' ? 'default' : 'destructive'}>
                          {summary.status === 'completo' ? 'Completo' : 'Incompleto'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  monthlyReports.map((report) => (
                    <TableRow key={report.employee_id}>
                      <TableCell className="font-medium">
                        {report.employee_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {report.total_hours}h
                        </Badge>
                      </TableCell>
                      <TableCell>{report.total_days} dias</TableCell>
                      <TableCell>{report.average_daily_hours}h</TableCell>
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