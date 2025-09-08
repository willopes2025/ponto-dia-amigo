import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RoleManagerProps {
  employee: any;
  onRoleUpdate?: () => void;
}

export function RoleManager({ employee, onRoleUpdate }: RoleManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { isAdmin, userProfile } = useAuth();

  // Só admin pode gerenciar roles
  if (!isAdmin) return null;

  // Admin não pode alterar seu próprio role
  const canChangeRole = employee.id !== userProfile?.id;

  const handleRoleChange = async (newRole: 'admin' | 'user') => {
    if (!canChangeRole) return;
    
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Cargo atualizado",
        description: `${employee.nome} agora é ${newRole === 'admin' ? 'Administrador' : 'Usuário'}`,
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

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="animate-fade-in">
          <Shield className="h-3 w-3 mr-1" />
          Administrador
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="animate-fade-in">
        <User className="h-3 w-3 mr-1" />
        Usuário
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2 animate-slide-in-right">
      {getRoleBadge(employee.role)}
      
      {canChangeRole && (
        <Select
          value={employee.role}
          onValueChange={handleRoleChange}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-32 animate-hover-scale">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">
              <div className="flex items-center">
                <Shield className="h-3 w-3 mr-2" />
                Admin
              </div>
            </SelectItem>
            <SelectItem value="user">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-2" />
                Usuário
              </div>
            </SelectItem>
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default">
              <Shield className="h-3 w-3 mr-1" />
              Administrador
            </Badge>
          </div>
          <ul className="text-sm text-muted-foreground ml-4 space-y-1">
            <li>• Configurações da empresa</li>
            <li>• Gerenciar colaboradores</li>
            <li>• Criar e alterar cargos</li>
            <li>• Visualizar todos os relatórios</li>
            <li>• Gerenciar turnos e horários</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <User className="h-3 w-3 mr-1" />
              Usuário
            </Badge>
          </div>
          <ul className="text-sm text-muted-foreground ml-4 space-y-1">
            <li>• Registrar ponto</li>
            <li>• Visualizar próprios relatórios</li>
            <li>• Solicitar alterações</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}