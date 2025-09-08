import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Position {
  id: string;
  nome: string;
  is_admin: boolean;
}

interface RoleManagerProps {
  employee: any;
  onRoleUpdate?: () => void;
}

export function RoleManager({ employee, onRoleUpdate }: RoleManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
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
        .select('id, nome, is_admin')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setPositions(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar cargos:', error);
    }
  };

  // Só admin pode gerenciar roles
  if (!isAdmin) return null;

  // Admin não pode alterar seu próprio role
  const canChangeRole = employee.id !== userProfile?.id;

  const handlePositionChange = async (newPositionId: string) => {
    if (!canChangeRole) return;
    
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ position_id: newPositionId })
        .eq('id', employee.id);

      if (error) throw error;

      const newPosition = positions.find(p => p.id === newPositionId);
      
      toast({
        title: "Cargo atualizado",
        description: `${employee.nome} agora é ${newPosition?.nome}`,
      });

      onRoleUpdate?.();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cargo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPositionBadge = (employee: any) => {
    const position = employee.positions || employee.position;
    if (!position) return null;
    
    if (position.is_admin) {
      return (
        <Badge variant="default" className="animate-fade-in">
          <Shield className="h-3 w-3 mr-1" />
          {position.nome}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="animate-fade-in">
        <User className="h-3 w-3 mr-1" />
        {position.nome}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2 animate-slide-in-right">
      {getPositionBadge(employee)}
      
      {canChangeRole && positions.length > 0 && (
        <Select
          value={employee.position_id || employee.positions?.id}
          onValueChange={handlePositionChange}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-40 animate-hover-scale">
            <SelectValue placeholder="Selecionar cargo" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                <div className="flex items-center">
                  {position.is_admin ? (
                    <Shield className="h-3 w-3 mr-2" />
                  ) : (
                    <User className="h-3 w-3 mr-2" />
                  )}
                  {position.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {!canChangeRole && (
        <span className="text-xs text-muted-foreground">
          (Você mesmo)
        </span>
      )}
    </div>
  );
}

interface RolePermissionsCardProps {
  className?: string;
}

export function RolePermissionsCard({ className }: RolePermissionsCardProps) {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <Card className={`animate-fade-in-delayed ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Permissões dos Cargos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Os cargos são totalmente personalizáveis e definem quais funcionalidades 
            cada colaborador pode acessar no sistema.
          </p>
          <p>
            Acesse a aba <strong>Cargos</strong> nas configurações para criar e 
            gerenciar cargos personalizados para sua empresa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}