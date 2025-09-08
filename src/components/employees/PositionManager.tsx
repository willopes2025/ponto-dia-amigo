import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, User, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Position {
  id: string;
  nome: string;
  descricao?: string;
  is_admin: boolean;
  permissoes: any;
  ativo: boolean;
}

interface PositionFormData {
  nome: string;
  descricao: string;
  is_admin: boolean;
  permissoes: {
    settings: boolean;
    employees: boolean;
    reports: boolean;
    schedules: boolean;
    timesheet: boolean;
    reports_own: boolean;
  };
}

const defaultPermissions = {
  settings: false,
  employees: false,
  reports: false,
  schedules: false,
  timesheet: true,
  reports_own: true,
};

export function PositionManager() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PositionFormData>({
    nome: '',
    descricao: '',
    is_admin: false,
    permissoes: { ...defaultPermissions }
  });
  
  const { toast } = useToast();
  const { isAdmin, userProfile } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchPositions();
    }
  }, [isAdmin]);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setPositions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cargos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do cargo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userProfile?.user_id)
        .single();

      if (profileError) throw profileError;

      const positionData = {
        nome: formData.nome,
        descricao: formData.descricao,
        is_admin: formData.is_admin,
        permissoes: formData.permissoes,
        company_id: profile.company_id
      };

      let error;
      
      if (editingId) {
        ({ error } = await supabase
          .from('positions')
          .update(positionData)
          .eq('id', editingId));
      } else {
        ({ error } = await supabase
          .from('positions')
          .insert([positionData]));
      }

      if (error) throw error;

      toast({
        title: editingId ? "Cargo atualizado" : "Cargo criado",
        description: `O cargo "${formData.nome}" foi ${editingId ? 'atualizado' : 'criado'} com sucesso.`,
      });

      setIsDialogOpen(false);
      setEditingId(null);
      setFormData({
        nome: '',
        descricao: '',
        is_admin: false,
        permissoes: { ...defaultPermissions }
      });
      
      await fetchPositions();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cargo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (position: Position) => {
    setFormData({
      nome: position.nome,
      descricao: position.descricao || '',
      is_admin: position.is_admin,
      permissoes: { ...defaultPermissions, ...position.permissoes }
    });
    setEditingId(position.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (positionId: string, positionName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cargo "${positionName}"?`)) {
      return;
    }

    try {
      // Check if position is being used
      const { data: profilesUsing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('position_id', positionId)
        .limit(1);

      if (checkError) throw checkError;

      if (profilesUsing && profilesUsing.length > 0) {
        toast({
          title: "Cargo não pode ser excluído",
          description: "Este cargo está sendo usado por colaboradores. Transfira-os para outro cargo primeiro.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('positions')
        .update({ ativo: false })
        .eq('id', positionId);

      if (error) throw error;

      toast({
        title: "Cargo excluído",
        description: `O cargo "${positionName}" foi removido com sucesso.`,
      });

      await fetchPositions();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cargo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePermission = (key: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [key]: value
      }
    }));
  };

  if (!isAdmin) {
    return (
      <Alert className="animate-fade-in">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Apenas administradores podem gerenciar cargos.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Cargos</h3>
          <p className="text-sm text-muted-foreground">
            Crie e configure cargos personalizados para sua empresa
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="animate-hover-scale">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cargo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl animate-scale-in">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Cargo' : 'Criar Novo Cargo'}
              </DialogTitle>
              <DialogDescription>
                Configure as informações e permissões do cargo
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Cargo*</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Analista, Gerente..."
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_admin"
                      checked={formData.is_admin}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          is_admin: checked,
                          permissoes: checked ? {
                            settings: true,
                            employees: true,
                            reports: true,
                            schedules: true,
                            timesheet: true,
                            reports_own: true,
                          } : { ...defaultPermissions }
                        }));
                      }}
                    />
                    <Label htmlFor="is_admin">Cargo de Administrador</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Administradores têm acesso total ao sistema
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva as responsabilidades do cargo..."
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Permissões do Cargo</h4>
                
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Configurações</Label>
                      <p className="text-xs text-muted-foreground">Acessar configurações da empresa</p>
                    </div>
                    <Switch
                      checked={formData.permissoes.settings}
                      onCheckedChange={(checked) => updatePermission('settings', checked)}
                      disabled={formData.is_admin}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Colaboradores</Label>
                      <p className="text-xs text-muted-foreground">Gerenciar colaboradores</p>
                    </div>
                    <Switch
                      checked={formData.permissoes.employees}
                      onCheckedChange={(checked) => updatePermission('employees', checked)}
                      disabled={formData.is_admin}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Relatórios Gerais</Label>
                      <p className="text-xs text-muted-foreground">Ver todos os relatórios</p>
                    </div>
                    <Switch
                      checked={formData.permissoes.reports}
                      onCheckedChange={(checked) => updatePermission('reports', checked)}
                      disabled={formData.is_admin}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Escalas/Horários</Label>
                      <p className="text-xs text-muted-foreground">Gerenciar escalas</p>
                    </div>
                    <Switch
                      checked={formData.permissoes.schedules}
                      onCheckedChange={(checked) => updatePermission('schedules', checked)}
                      disabled={formData.is_admin}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Registro de Ponto</Label>
                      <p className="text-xs text-muted-foreground">Registrar próprio ponto</p>
                    </div>
                    <Switch
                      checked={formData.permissoes.timesheet}
                      onCheckedChange={(checked) => updatePermission('timesheet', checked)}
                      disabled={formData.is_admin}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Relatórios Próprios</Label>
                      <p className="text-xs text-muted-foreground">Ver próprios relatórios</p>
                    </div>
                    <Switch
                      checked={formData.permissoes.reports_own}
                      onCheckedChange={(checked) => updatePermission('reports_own', checked)}
                      disabled={formData.is_admin}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingId(null);
                    setFormData({
                      nome: '',
                      descricao: '',
                      is_admin: false,
                      permissoes: { ...defaultPermissions }
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : (editingId ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {positions.map((position) => (
          <Card key={position.id} className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-lg">{position.nome}</CardTitle>
                    {position.descricao && (
                      <CardDescription className="mt-1">
                        {position.descricao}
                      </CardDescription>
                    )}
                  </div>
                  {position.is_admin && (
                    <Badge variant="default" className="animate-fade-in">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(position)}
                    className="animate-hover-scale"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(position.id, position.nome)}
                    className="animate-hover-scale text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div>
                <h5 className="font-medium text-sm mb-2">Permissões:</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(position.permissoes).map(([key, value]) => {
                    if (!value) return null;
                    
                    const labels: Record<string, string> = {
                      settings: 'Configurações',
                      employees: 'Colaboradores',
                      reports: 'Relatórios Gerais',
                      schedules: 'Escalas',
                      timesheet: 'Registro de Ponto',
                      reports_own: 'Relatórios Próprios'
                    };
                    
                    return (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {labels[key] || key}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {positions.length === 0 && (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cargo encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie o primeiro cargo personalizado para sua empresa
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Cargo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}