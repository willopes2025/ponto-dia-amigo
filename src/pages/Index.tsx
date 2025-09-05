import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, BarChart3, Shield, CheckCircle, Star } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Ponto Seguro</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleLogin}>
                  Entrar
                </Button>
                <Button onClick={handleGetStarted}>
                  Começar Agora
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Controle de Ponto
            <span className="text-primary"> Inteligente</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Gerencie o tempo da sua equipe de forma eficiente com relatórios automáticos, 
            controle de jornada e integração completa para pequenas e médias empresas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-4">
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              Ver Demonstração
            </Button>
          </div>
          <div className="flex items-center justify-center mt-8 space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-warning fill-current" />
            ))}
            <span className="ml-2 text-muted-foreground">4.9/5 - Mais de 1.000 empresas confiam</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Como o Ponto Seguro funciona?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma solução completa para gerenciar o tempo da sua equipe em 3 passos simples
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center p-6">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>1. Registre o Ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Funcionários registram entrada, pausa e saída de forma simples e intuitiva
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <CardTitle>2. Gerencie Equipes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Controle funcionários, localização, horários e escalas em um só lugar
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-info/10 rounded-full w-fit">
                <BarChart3 className="h-8 w-8 text-info" />
              </div>
              <CardTitle>3. Relatórios Automáticos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Receba relatórios detalhados de horas trabalhadas, faltas e produtividade
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl font-bold text-foreground mb-6">
              Por que escolher o Ponto Seguro?
            </h3>
            <div className="space-y-4">
              {[
                'Reduz em 80% o tempo gasto com controle manual',
                'Relatórios automáticos para eSocial',
                'Interface intuitiva para qualquer idade',
                'Suporte técnico especializado',
                'Dados seguros e criptografados',
                'Integração com sistemas de RH'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl">
            <div className="text-center">
              <h4 className="text-2xl font-bold text-foreground mb-4">
                Teste Grátis por 14 Dias
              </h4>
              <p className="text-muted-foreground mb-6">
                Sem compromisso, sem cartão de crédito
              </p>
              <Button size="lg" onClick={handleGetStarted} className="w-full">
                Começar Teste Gratuito
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-secondary/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Planos que cabem no seu bolso
          </h2>
          <p className="text-xl text-muted-foreground">
            Escolha o plano ideal para o tamanho da sua empresa
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Básico */}
          <Card className="relative">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Básico</CardTitle>
              <CardDescription>Para pequenas empresas</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">R$ 12</span>
                <span className="text-muted-foreground">/funcionário/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Até 10 funcionários</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Controle de ponto básico</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Relatórios mensais</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Suporte por email</span>
              </div>
              <Button className="w-full mt-6" variant="outline" onClick={handleGetStarted}>
                Escolher Básico
              </Button>
            </CardContent>
          </Card>

          {/* Profissional */}
          <Card className="relative border-primary shadow-lg scale-105">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
              Mais Popular
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Profissional</CardTitle>
              <CardDescription>Para médias empresas</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">R$ 18</span>
                <span className="text-muted-foreground">/funcionário/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Até 50 funcionários</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Controle avançado + GPS</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Relatórios personalizados</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Integração eSocial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Suporte prioritário</span>
              </div>
              <Button className="w-full mt-6" onClick={handleGetStarted}>
                Escolher Profissional
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise */}
          <Card className="relative">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Enterprise</CardTitle>
              <CardDescription>Para grandes empresas</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">R$ 25</span>
                <span className="text-muted-foreground">/funcionário/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Funcionários ilimitados</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>API personalizada</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Múltiplas localizações</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Manager dedicado</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>SLA garantido</span>
              </div>
              <Button className="w-full mt-6" variant="outline" onClick={handleGetStarted}>
                Falar com Vendas
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">Ponto Seguro</span>
              </div>
              <p className="text-muted-foreground mb-4">
                A solução completa para controle de ponto da sua empresa.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-primary">Preços</a></li>
                <li><a href="#" className="hover:text-primary">Integrações</a></li>
                <li><a href="#" className="hover:text-primary">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Sobre nós</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Carreiras</a></li>
                <li><a href="#" className="hover:text-primary">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-primary">Documentação</a></li>
                <li><a href="#" className="hover:text-primary">Status</a></li>
                <li><a href="#" className="hover:text-primary">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Ponto Seguro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
