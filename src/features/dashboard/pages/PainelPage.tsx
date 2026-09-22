import { useQuery } from '@tanstack/react-query';
import { Building2, KeyRound, Store as StoreIcon, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { MODULOS } from '@/app/routes';
import { Carregando } from '@/components/comum/Carregando';
import { PageHeader } from '@/components/comum/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { qk } from '@/lib/query/keys';
import { supabase } from '@/lib/supabase';
import { PERMISSION_MODULES } from '@/lib/permissions/catalog';

/**
 * Painel da fase 0.
 *
 * Nesta fase o painel mostra o estado da FUNDAÇÃO — rede, filiais, acesso — e
 * não indicadores de venda, que ainda não existem. Preferi isso a cards com
 * número falso: um painel que mente na demonstração é pior que um painel que
 * admite o que ainda não mede.
 *
 * Na fase 5 esta tela vira o painel acionável: cada card, uma fila de trabalho.
 */
export default function PainelPage() {
  const { contexto, storeAtual, can } = useAuth();

  const modelos = useQuery({
    queryKey: qk.rede.modelosPermissao(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_profiles')
        .select('id, nome, descricao, is_owner, ativo')
        .eq('ativo', true)
        .order('is_owner', { ascending: false })
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const usuarios = useQuery({
    queryKey: qk.rede.usuarios(),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: can('usuarios.consultar'),
  });

  if (!contexto) return <Carregando texto="Carregando o contexto da rede…" />;

  const totalChaves = PERMISSION_MODULES.reduce((soma, m) => soma + m.acoes.length, 0);
  const minhasChaves = contexto.permissions.size;
  const modulosVisiveis = MODULOS.filter((m) => can(m.permissao));
  const modulosProntos = modulosVisiveis.filter((m) => m.fase === null);

  const cards = [
    {
      titulo: 'Rede',
      valor: contexto.tenant.nome,
      detalhe: `/${contexto.tenant.slug}`,
      icone: Building2,
    },
    {
      titulo: 'Filial atual',
      valor: storeAtual?.nome_fantasia ?? 'Nenhuma',
      detalhe:
        contexto.stores.length > 1
          ? `${contexto.stores.length} filiais no seu acesso`
          : 'única filial',
      icone: StoreIcon,
    },
    {
      titulo: 'Seu acesso',
      valor: `${minhasChaves} de ${totalChaves}`,
      detalhe: 'permissões por ação de negócio',
      icone: KeyRound,
    },
    {
      titulo: 'Usuários ativos',
      valor: can('usuarios.consultar') ? (usuarios.data ?? '—') : '—',
      detalhe: can('usuarios.consultar') ? 'na rede' : 'exige usuarios.consultar',
      icone: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Olá, ${contexto.profile.nome.split(' ')[0]}`}
        descricao="A fundação da plataforma está no ar. Abaixo, o estado da sua rede e o que vem em seguida."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.titulo} className="stagger-item animate-fade-in-delayed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.titulo}
              </CardTitle>
              <card.icone className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="truncate text-xl font-semibold tabular" title={String(card.valor)}>
                {card.valor}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.detalhe}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelos de permissão da rede</CardTitle>
            <CardDescription>
              Criados junto com a rede e editáveis — menos o de proprietário, que é a trava que
              impede a rede de se trancar fora do próprio sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modelos.isPending ? (
              <Carregando texto="Carregando modelos…" className="py-6" />
            ) : modelos.isError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar os modelos de permissão.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {modelos.data?.map((modelo) => (
                  <li key={modelo.id} className="flex items-start gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{modelo.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{modelo.descricao}</p>
                    </div>
                    {modelo.is_owner && <Badge variant="secondary">acesso total</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Módulos</CardTitle>
            <CardDescription>
              {modulosProntos.length} de {modulosVisiveis.length} módulos do seu acesso já
              construídos. Os demais já têm rota, permissão e auditoria — falta a tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {modulosVisiveis.map((modulo) => (
                <Button
                  key={modulo.path}
                  asChild
                  size="sm"
                  variant={modulo.fase === null ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs"
                >
                  <Link to={modulo.path}>
                    <modulo.icon className="mr-1.5 h-3 w-3" aria-hidden />
                    {modulo.label}
                  </Link>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Atalho: <kbd className="rounded border border-border bg-muted px-1">Ctrl</kbd>{' '}
              <kbd className="rounded border border-border bg-muted px-1">K</kbd> abre a busca de
              módulos e a troca de filial.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
