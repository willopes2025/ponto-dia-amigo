import { useState, useEffect } from 'react';
import { Save, Shield, Clock, MapPin, Bell, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { PositionManager } from '@/components/employees/PositionManager';

interface CompanySettings {
  id: string;
  nome_fantasia: string;
  timezone: string;
  provedor_mensageria: 'whatsapp' | 'sms' | 'email';
  remetente?: string;
  chave_api?: string;
  janela_disparo_inicio: string;
  janela_disparo_fim: string;
}

interface PolicySettings {
  id: string;
  tolerancia_min: number;
  contar_hora_extra: boolean;
  excedente_paga: boolean;
  banco_horas: boolean;
  selfie_obrigatoria: boolean;
  gps_obrigatorio: boolean;
  ip_whitelist: string[];
}

interface Shift {
  id: string;
  nome_turno: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: number[];
  intervalo_minutos: number;
}

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [policySettings, setPolicySettings] = useState<PolicySettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [newShift, setNewShift] = useState({
    nome_turno: '',
    hora_inicio: '',
    hora_fim: '',
    dias_semana: [1, 2, 3, 4, 5] as number[],
    intervalo_minutos: 60
  });
  const [ipWhitelist, setIpWhitelist] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      // Get user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Perfil não encontrado');

      // Get company settings
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!company) throw new Error('Empresa não encontrada');
      setCompanySettings(company);

      // Get policy settings - create if doesn't exist
      let { data: policy, error: policyError } = await supabase
        .from('policies')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (policyError) throw policyError;
      
      // If no policy exists, create default one
      if (!policy) {
        const { data: newPolicy, error: createError } = await supabase
          .from('policies')
          .insert({
            company_id: profile.company_id,
            tolerancia_min: 5,
            contar_hora_extra: false,
            excedente_paga: false,
            banco_horas: false,
            selfie_obrigatoria: false,
            gps_obrigatorio: false,
            ip_whitelist: []
          })
          .select('*')
          .single();

        if (createError) throw createError;
        policy = newPolicy;
      }
      
      setPolicySettings(policy);
      setIpWhitelist(policy.ip_whitelist?.join('\n') || '');

      // Get shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('nome_turno');

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);

    } catch (error: any) {
      console.error('Settings fetch error:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!companySettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          nome_fantasia: companySettings.nome_fantasia,
          timezone: companySettings.timezone,
          provedor_mensageria: companySettings.provedor_mensageria,
          remetente: companySettings.remetente,
          chave_api: companySettings.chave_api,
          janela_disparo_inicio: companySettings.janela_disparo_inicio,
          janela_disparo_fim: companySettings.janela_disparo_fim
        })
        .eq('id', companySettings.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações da empresa foram atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policySettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('policies')
        .update({
          tolerancia_min: policySettings.tolerancia_min,
          contar_hora_extra: policySettings.contar_hora_extra,
          excedente_paga: policySettings.excedente_paga,
          banco_horas: policySettings.banco_horas,
          selfie_obrigatoria: policySettings.selfie_obrigatoria,
          gps_obrigatorio: policySettings.gps_obrigatorio,
          ip_whitelist: ipWhitelist.split('\n').filter(ip => ip.trim() !== '')
        })
        .eq('id', policySettings.id);

      if (error) throw error;

      toast({
        title: "Políticas salvas",
        description: "As políticas de controle foram atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.nome_turno || !newShift.hora_inicio || !newShift.hora_fim) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('shifts')
        .insert([{
          ...newShift,
          company_id: profile.company_id
        }]);

      if (error) throw error;

      setNewShift({
        nome_turno: '',
        hora_inicio: '',
        hora_fim: '',
        dias_semana: [1, 2, 3, 4, 5],
        intervalo_minutos: 60
      });

      await fetchSettings();

      toast({
        title: "Turno criado",
        description: "O novo turno foi adicionado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar turno",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Tem certeza que deseja excluir este turno?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;

      await fetchSettings();

      toast({
        title: "Turno excluído",
        description: "O turno foi removido do sistema.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir turno",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const getDayNames = (days: number[]) => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days.map(day => dayNames[day]).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar as configurações da empresa.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema de controle de ponto
          </p>
        </div>
        <Badge variant="default" className="animate-fade-in">
          <Shield className="h-3 w-3 mr-1" />
          Área do Administrador
        </Badge>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="positions">Cargos</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="shifts">Turnos</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Informações da Empresa</span>
              </CardTitle>
              <CardDescription>
                Configure os dados básicos da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {companySettings && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome_fantasia">Nome da Empresa</Label>
                      <Input
                        id="nome_fantasia"
                        value={companySettings.nome_fantasia}
                        onChange={(e) => setCompanySettings({
                          ...companySettings,
                          nome_fantasia: e.target.value
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuso Horário</Label>
                      <Select
                        value={companySettings.timezone}
                        onValueChange={(value) => setCompanySettings({
                          ...companySettings,
                          timezone: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                          <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                          <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-lg font-medium mb-4">Configurações de Notificação</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="janela_inicio">Janela de Disparo - Início</Label>
                        <Input
                          id="janela_inicio"
                          type="time"
                          value={companySettings.janela_disparo_inicio}
                          onChange={(e) => setCompanySettings({
                            ...companySettings,
                            janela_disparo_inicio: e.target.value
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="janela_fim">Janela de Disparo - Fim</Label>
                        <Input
                          id="janela_fim"
                          type="time"
                          value={companySettings.janela_disparo_fim}
                          onChange={(e) => setCompanySettings({
                            ...companySettings,
                            janela_disparo_fim: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveCompany} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionManager />
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Políticas de Controle</span>
              </CardTitle>
              <CardDescription>
                Configure as regras de funcionamento do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {policySettings && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tolerancia">Tolerância para Atrasos (minutos)</Label>
                    <Input
                      id="tolerancia"
                      type="number"
                      min="0"
                      max="60"
                      value={policySettings.tolerancia_min}
                      onChange={(e) => setPolicySettings({
                        ...policySettings,
                        tolerancia_min: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Configurações de Horas</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Contar Hora Extra</Label>
                        <p className="text-sm text-muted-foreground">
                          Registrar horas trabalhadas além da jornada
                        </p>
                      </div>
                      <Switch
                        checked={policySettings.contar_hora_extra}
                        onCheckedChange={(checked) => setPolicySettings({
                          ...policySettings,
                          contar_hora_extra: checked
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Banco de Horas</Label>
                        <p className="text-sm text-muted-foreground">
                          Permitir compensação de horas
                        </p>
                      </div>
                      <Switch
                        checked={policySettings.banco_horas}
                        onCheckedChange={(checked) => setPolicySettings({
                          ...policySettings,
                          banco_horas: checked
                        })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Configurações de Segurança</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Selfie Obrigatória</Label>
                        <p className="text-sm text-muted-foreground">
                          Exigir foto para registrar ponto
                        </p>
                      </div>
                      <Switch
                        checked={policySettings.selfie_obrigatoria}
                        onCheckedChange={(checked) => setPolicySettings({
                          ...policySettings,
                          selfie_obrigatoria: checked
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>GPS Obrigatório</Label>
                        <p className="text-sm text-muted-foreground">
                          Exigir localização para registrar ponto
                        </p>
                      </div>
                      <Switch
                        checked={policySettings.gps_obrigatorio}
                        onCheckedChange={(checked) => setPolicySettings({
                          ...policySettings,
                          gps_obrigatorio: checked
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSavePolicy} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar Políticas'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Turnos de Trabalho</span>
              </CardTitle>
              <CardDescription>
                Gerencie os horários de trabalho da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create new shift */}
              <div className="p-4 border rounded-lg space-y-4">
                <h4 className="font-medium">Criar Novo Turno</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Nome do Turno</Label>
                    <Input
                      value={newShift.nome_turno}
                      onChange={(e) => setNewShift({
                        ...newShift,
                        nome_turno: e.target.value
                      })}
                      placeholder="Ex: Manhã"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Início</Label>
                    <Input
                      type="time"
                      value={newShift.hora_inicio}
                      onChange={(e) => setNewShift({
                        ...newShift,
                        hora_inicio: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input
                      type="time"
                      value={newShift.hora_fim}
                      onChange={(e) => setNewShift({
                        ...newShift,
                        hora_fim: e.target.value
                      })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreateShift} className="w-full">
                      Criar Turno
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing shifts */}
              <div className="space-y-3">
                <h4 className="font-medium">Turnos Existentes</h4>
                {shifts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum turno cadastrado
                  </p>
                ) : (
                  shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="font-medium">{shift.nome_turno}</h5>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(shift.hora_inicio)} - {formatTime(shift.hora_fim)} • {getDayNames(shift.dias_semana)}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteShift(shift.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Configurações de Segurança</span>
              </CardTitle>
              <CardDescription>
                Configure as medidas de segurança do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ip_whitelist">Lista de IPs Permitidos</Label>
                <textarea
                  id="ip_whitelist"
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  placeholder="192.168.1.1&#10;10.0.0.1&#10;172.16.0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Um IP por linha. Deixe vazio para permitir qualquer IP.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePolicy} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
