import {
  BarChart3, ClipboardList, Eye, Handshake, Layers, ShieldCheck, Store as StoreIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Logo } from '@/components/comum/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

const PILARES = [
  {
    icone: ClipboardList,
    titulo: 'O.S. em Kanban com SLA',
    texto:
      'O ciclo receita → laboratório → montagem → entrega num quadro arrastável, com prazo em dias úteis por etapa e alerta de atraso. É o coração operacional de uma ótica, e o que um ERP genérico de varejo não tem.',
  },
  {
    icone: StoreIcon,
    titulo: 'Multi-loja de verdade',
    texto:
      'Cliente e produto cadastrados uma vez na rede; preço, estoque, caixa e venda por filial. Não é um campo "loja" pendurado num sistema de loja única.',
  },
  {
    icone: Handshake,
    titulo: 'O atendimento que não virou venda',
    texto:
      'Quem entrou e não comprou, qual foi a objeção, quais armações a pessoa experimentou. É o dado que ninguém guarda — e sem ele qualquer recomendação é genérica.',
  },
  {
    icone: BarChart3,
    titulo: 'Resultado medido, não prometido',
    texto:
      'Uma fatia pequena e aleatória de cada fila fica sem ação, e o painel mostra quanto do resultado é incremental de verdade. Um número menor e verificável resiste à desconfiança; um número grande e redondo, não.',
  },
  {
    icone: Eye,
    titulo: 'Receita como entidade',
    texto:
      'Prescrição por olho, com validade — base do livro de receitas, do recall de recompra e da checagem de compatibilidade da lente.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Permissão por ação',
    texto:
      '268 permissões em 31 módulos. "Só consulta das próprias vendas" para o vendedor e gestão completa para o gerente são duas linhas de configuração, não dois sistemas.',
  },
];

export default function LandingPage() {
  const { usuarioAutenticado } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            {usuarioAutenticado ? (
              <Button asChild size="sm">
                <Link to="/painel">Ir para o painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/entrar">Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/cadastrar">Cadastrar minha ótica</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              Plataforma vertical para óticas
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Do balcão ao DRE — e a prova de que a ação deu resultado.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              A VISIO é gestão completa de ótica — clientes e receitas, produtos e estoque por
              filial, vendas, Ordens de Serviço em Kanban, financeiro — somada à camada que mede
              o que cada ação de recuperação realmente trouxe de novo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/cadastrar">Começar agora</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/entrar">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              O que faz diferença numa ótica
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {PILARES.map((pilar) => (
                <Card key={pilar.titulo} className="animate-hover-lift">
                  <CardHeader className="pb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <pilar.icone className="h-4.5 w-4.5 text-primary" aria-hidden />
                    </span>
                    <CardTitle className="pt-2 text-base">{pilar.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{pilar.texto}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo mostrarTexto={false} />
          <p>VISIO · Gestão e inteligência para óticas</p>
        </div>
      </footer>
    </div>
  );
}
