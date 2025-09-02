import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EmployeeFiltersProps {
  statusFilter: 'all' | 'ativo' | 'inativo';
  onStatusChange: (value: 'all' | 'ativo' | 'inativo') => void;
}

export function EmployeeFilters({
  statusFilter,
  onStatusChange,
}: EmployeeFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-4 pt-4 border-t">
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
    </div>
  );
}