import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EmployeeFiltersProps {
  statusFilter: 'all' | 'ativo' | 'inativo';
  roleFilter: 'all' | 'admin' | 'collab';
  onStatusChange: (value: 'all' | 'ativo' | 'inativo') => void;
  onRoleChange: (value: 'all' | 'admin' | 'collab') => void;
}

export function EmployeeFilters({
  statusFilter,
  roleFilter,
  onStatusChange,
  onRoleChange
}: EmployeeFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Apenas ativos</SelectItem>
            <SelectItem value="inativo">Apenas inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Função</Label>
        <Select value={roleFilter} onValueChange={onRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="collab">Colaboradores</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}