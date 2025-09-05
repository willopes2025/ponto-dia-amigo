import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Filter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { EmployeeFilters } from '@/components/employees/EmployeeFilters';

interface Employee {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  user_id: string;
  shift_id?: string;
  shifts?: {
    nome_turno: string;
    hora_inicio: string;
    hora_fim: string;
  };
}

interface Shift {
  id: string;
  nome_turno: string;
  hora_inicio: string;
  hora_fim: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          shifts (
            nome_turno,
            hora_inicio,
            hora_fim
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast the data to ensure proper typing
      const typedEmployees = (data || []).map(employee => ({
        ...employee,
        status: employee.status as 'ativo' | 'inativo'
      }));
      
      setEmployees(typedEmployees);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, nome_turno, hora_inicio, hora_fim')
        .order('nome_turno');

      if (error) throw error;
      setShifts(data || []);
    } catch (error: any) {
      console.error('Error fetching shifts:', error);
    }
  };

  const handleCreateEmployee = async (employeeData: any) => {
    try {
      // Generate a temporary email if using username
      const emailForAuth = employeeData.useUsername 
        ? `${employeeData.username}@temp.local`
        : employeeData.email;

      // First create the user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailForAuth,
        password: employeeData.password || 'temp123456', // Temporary password
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome: employeeData.nome
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update the profile with additional data including shift
        const profileUpdateData: any = {
          telefone: employeeData.telefone,
          status: 'ativo',
          shift_id: employeeData.shiftId || null
        };

        // If using username, update the profile with username and keep temporary email
        if (employeeData.useUsername) {
          profileUpdateData.username = employeeData.username;
          profileUpdateData.email = emailForAuth; // Keep the temporary email for auth
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.warn('Profile update error:', profileError);
        }

        // Create initial schedule if shift is selected
        if (employeeData.shiftId) {
          // Wait a bit for the profile to be created by the trigger
          setTimeout(async () => {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', authData.user.id)
                .single();

              if (profileData) {
                const today = new Date().toISOString().split('T')[0];
                await supabase
                  .from('schedules')
                  .insert({
                    user_id: profileData.id,
                    data: today,
                    shift_id: employeeData.shiftId
                  });
              }
            } catch (error) {
              console.warn('Schedule creation error:', error);
            }
          }, 1000);
        }

        await fetchEmployees();
        setIsCreateDialogOpen(false);
        
        toast({
          title: "Colaborador criado",
          description: `Colaborador criado com sucesso. ${employeeData.useUsername ? 'Username: ' + employeeData.username : 'Email de confirmação enviado.'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar colaborador",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateEmployee = async (employeeData: any) => {
    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: employeeData.nome,
          email: employeeData.email,
          telefone: employeeData.telefone,
          status: employeeData.status,
          shift_id: employeeData.shiftId || null
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      await fetchEmployees();
      setEditingEmployee(null);
      
      toast({
        title: "Colaborador atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar colaborador",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Tem certeza que deseja excluir o colaborador ${employee.nome}?`)) {
      return;
    }

    try {
      // Instead of deleting from auth (which requires admin privileges), 
      // just deactivate the profile
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inativo' })
        .eq('id', employee.id);

      if (error) throw error;

      await fetchEmployees();
      
      toast({
        title: "Colaborador desativado",
        description: "O colaborador foi desativado do sistema.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao desativar colaborador",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    const newStatus = employee.status === 'ativo' ? 'inativo' : 'ativo';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', employee.id);

      if (error) throw error;

      await fetchEmployees();
      
      toast({
        title: "Status atualizado",
        description: `Colaborador ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const activeEmployees = employees.filter(emp => emp.status === 'ativo').length;

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
          <h2 className="text-3xl font-bold tracking-tight">Colaboradores</h2>
          <p className="text-muted-foreground">
            Gerencie os colaboradores da sua empresa
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="animate-hover-scale">
              <Plus className="h-4 w-4 mr-2" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md animate-scale-in">
            <DialogHeader>
              <DialogTitle>Novo Colaborador</DialogTitle>
              <DialogDescription>
                Adicione um novo colaborador à empresa
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              shifts={shifts}
              onSubmit={handleCreateEmployee}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 animate-fade-in">
        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">colaboradores</p>
          </CardContent>
        </Card>

        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">em atividade</p>
          </CardContent>
        </Card>

        <Card className="animate-hover-lift stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Turno</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {employees.filter(emp => emp.shifts).length}
            </div>
            <p className="text-xs text-muted-foreground">turno definido</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 transition-all duration-200 focus:ring-2"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="animate-hover-scale"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="animate-slide-in-up">
              <EmployeeFilters
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum colaborador encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.nome}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.telefone || '-'}</TableCell>
                      <TableCell>
                        {employee.shifts ? (
                          <div className="text-sm">
                            <div className="font-medium">{employee.shifts.nome_turno}</div>
                            <div className="text-muted-foreground">
                              {employee.shifts.hora_inicio} - {employee.shifts.hora_fim}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem turno</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={employee.status === 'ativo' ? 'default' : 'destructive'}
                          className={employee.status === 'ativo' ? 'bg-success' : ''}
                        >
                          {employee.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(employee)}
                          >
                            {employee.status === 'ativo' ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEmployee(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Atualize os dados do colaborador
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <EmployeeForm
              employee={editingEmployee}
              shifts={shifts}
              onSubmit={handleUpdateEmployee}
              onCancel={() => setEditingEmployee(null)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}