import { useState, useEffect } from 'react';
import { Plus, MapPin, Edit, Trash2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Location {
  id: string;
  nome: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  raio_metros: number;
  ativo: boolean;
  created_at: string;
}

interface LocationFormData {
  nome: string;
  endereco: string;
  latitude: string;
  longitude: string;
  raio_metros: string;
}

export default function Locations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    nome: '',
    endereco: '',
    latitude: '',
    longitude: '',
    raio_metros: '100'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar localizações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      latitude: '',
      longitude: '',
      raio_metros: '100'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) {
        toast({
          title: "Erro",
          description: "Perfil do usuário não encontrado",
          variant: "destructive",
        });
        return;
      }

      const locationData = {
        nome: formData.nome,
        endereco: formData.endereco || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        raio_metros: parseInt(formData.raio_metros),
        company_id: profile.company_id
      };

      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;

        toast({
          title: "Localização atualizada",
          description: "A localização foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('locations')
          .insert([locationData]);

        if (error) throw error;

        toast({
          title: "Localização criada",
          description: "A nova localização foi criada com sucesso.",
        });
      }

      await fetchLocations();
      setIsCreateDialogOpen(false);
      setEditingLocation(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar localização",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      nome: location.nome,
      endereco: location.endereco || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
      raio_metros: location.raio_metros.toString()
    });
  };

  const handleToggleStatus = async (location: Location) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ ativo: !location.ativo })
        .eq('id', location.id);

      if (error) throw error;

      await fetchLocations();
      
      toast({
        title: "Status atualizado",
        description: `Localização ${!location.ativo ? 'ativada' : 'desativada'} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`Tem certeza que deseja excluir a localização "${location.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id);

      if (error) throw error;

      await fetchLocations();
      
      toast({
        title: "Localização excluída",
        description: "A localização foi excluída do sistema.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir localização",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          toast({
            title: "Localização obtida",
            description: "Coordenadas atuais preenchidas automaticamente.",
          });
        },
        () => {
          toast({
            title: "Erro de localização",
            description: "Não foi possível obter sua localização atual.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive",
      });
    }
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
          <h2 className="text-3xl font-bold tracking-tight">Localizações</h2>
          <p className="text-muted-foreground">
            Gerencie os locais de trabalho para controle de ponto
          </p>
        </div>
        <Dialog 
          open={isCreateDialogOpen || !!editingLocation} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingLocation(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Localização
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Editar Localização' : 'Nova Localização'}
              </DialogTitle>
              <DialogDescription>
                {editingLocation 
                  ? 'Atualize os dados da localização'
                  : 'Adicione uma nova localização para controle de ponto'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Localização</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Escritório Central, Filial SP"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="-23.5505"
                    type="number"
                    step="any"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="-46.6333"
                    type="number"
                    step="any"
                  />
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={getCurrentLocation}
                className="w-full"
              >
                <Map className="h-4 w-4 mr-2" />
                Usar Localização Atual
              </Button>

              <div className="space-y-2">
                <Label htmlFor="raio_metros">Raio de Tolerância (metros)</Label>
                <Input
                  id="raio_metros"
                  value={formData.raio_metros}
                  onChange={(e) => setFormData(prev => ({ ...prev, raio_metros: e.target.value }))}
                  placeholder="100"
                  type="number"
                  min="1"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Distância máxima permitida para registrar o ponto
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingLocation(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingLocation ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Localizações Cadastradas</CardTitle>
          <CardDescription>
            Lista de todas as localizações para controle de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Coordenadas</TableHead>
                  <TableHead>Raio (m)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma localização cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.nome}</TableCell>
                      <TableCell>{location.endereco || '-'}</TableCell>
                      <TableCell>
                        {location.latitude && location.longitude
                          ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{location.raio_metros}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={location.ativo}
                            onCheckedChange={() => handleToggleStatus(location)}
                          />
                          <span className="text-sm">
                            {location.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(location)}
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