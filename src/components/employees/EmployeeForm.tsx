import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Employee {
  id: string;
  nome: string;
  email: string;
  username?: string;
  telefone?: string;
  status: 'ativo' | 'inativo';
  shift_id?: string;
}

interface Shift {
  id: string;
  nome_turno: string;
  hora_inicio: string;
  hora_fim: string;
}

interface EmployeeFormProps {
  employee?: Employee;
  shifts: Shift[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function EmployeeForm({ employee, shifts, onSubmit, onCancel, isEditing = false }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    nome: employee?.nome || '',
    email: employee?.email || '',
    username: employee?.username || '',
    telefone: employee?.telefone || '',
    status: employee?.status || 'ativo',
    password: '',
    shiftId: employee?.shift_id || '',
    useUsername: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome Completo</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => handleInputChange('nome', e.target.value)}
          placeholder="João Silva"
          required
        />
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="useUsername"
              checked={formData.useUsername}
              onCheckedChange={(checked) => handleInputChange('useUsername', checked)}
            />
            <Label htmlFor="useUsername">Usar nome de usuário ao invés de email</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Permite criar colaborador sem email, usando apenas nome de usuário
          </p>
        </div>
      )}

      {formData.useUsername ? (
        <div className="space-y-2">
          <Label htmlFor="username">Nome de Usuário</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="joao.silva"
            required={formData.useUsername}
            disabled={isEditing}
          />
          <p className="text-xs text-muted-foreground">
            Será usado para fazer login no sistema
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="joao@empresa.com"
            required={!formData.useUsername}
            disabled={isEditing} // Email não pode ser alterado após criação
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          value={formData.telefone}
          onChange={(e) => handleInputChange('telefone', e.target.value)}
          placeholder="+55 11 99999-9999"
        />
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="password">Senha Inicial</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Se não informada, será gerada uma senha temporária
          </p>
        </div>
      )}

      {shifts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="shift">Turno Padrão</Label>
          <Select value={formData.shiftId} onValueChange={(value) => handleInputChange('shiftId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um turno (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((shift) => (
                <SelectItem key={shift.id} value={shift.id}>
                  {shift.nome_turno} ({shift.hora_inicio} - {shift.hora_fim})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Turno padrão usado para escalas automáticas
          </p>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center space-x-2">
          <Switch
            id="status"
            checked={formData.status === 'ativo'}
            onCheckedChange={(checked) => handleInputChange('status', checked ? 'ativo' : 'inativo')}
          />
          <Label htmlFor="status">Colaborador ativo</Label>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}