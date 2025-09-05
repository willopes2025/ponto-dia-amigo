import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  BarChart3, 
  Shield, 
  MapPin, 
  Calendar, 
  FileText, 
  Settings, 
  Smartphone, 
  Cloud, 
  Lock, 
  Bell,
  ArrowLeft,
  CheckCircle,
  Timer,
  UserCheck,
  Building2,
  Activity,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react';

const Features = () => {
  const navigate = useNavigate();

  const coreFeatures = [
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Controle de Ponto Digital",
      description: "Registro de entrada, pausa, retorno e saída com timestamp preciso",
      details: [
        "Registro em tempo real",
        "Histórico completo de marcações",
        "Validação automática de horários",
        "Correção de marcações"
      ]
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Gestão de Funcionários",
      description: "Cadastro completo e organização da equipe",
      details: [
        "Perfis detalhados de funcionários",
        "Organização por departamentos",
        "Controle de acesso e permissões",
        "Histórico profissional"
      ]
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Controle de Localização",
      description: "Gestão de múltiplas unidades e locais de trabalho",
      details: [
        "Cadastro de filiais",
        "Controle geográfico",
        "Rastreamento por GPS",
        "Relatórios por localização"
      ]
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Gestão de Escalas",
      description: "Planejamento e controle de horários de trabalho",
      details: [
        "Criação de escalas flexíveis",
        "Turnos personalizados",
        "Controle de folgas",
        "Substituições automáticas"
      ]
    }
  ];

  const reportingFeatures = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Relatórios Avançados",
      description: "Análises detalhadas da jornada de trabalho",
      details: [
        "Relatórios de horas trabalhadas",
        "Análise de produtividade",
        "Controle de absenteísmo",
        "Exportação para Excel/PDF"
      ]
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Conformidade Legal",
      description: "Adequação às leis trabalhistas brasileiras",
      details: [
        "Integração com eSocial",
        "Relatórios para auditoria",
        "Backup automático de dados",
        "Certificação digital"
      ]
    },
    {
      icon: <Activity className="h-8 w-8" />,
      title: "Dashboard em Tempo Real",
      description: "Visão geral instantânea da operação",
      details: [
        "Status atual da equipe",
        "Métricas de produtividade",
        "Alertas automáticos",
        "Gráficos interativos"
      ]
    }
  ];

  const securityFeatures = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Segurança Avançada",
      description: "Proteção total dos dados da empresa",
      details: [
        "Criptografia de ponta a ponta",
        "Backup automático",
        "Controle de acesso por níveis",
        "Auditoria de ações"
      ]
    },
    {
      icon: <Cloud className="h-8 w-8" />,
      title: "Sistema em Nuvem",
      description: "Acesso de qualquer lugar, a qualquer momento",
      details: [
        "Disponibilidade 24/7",
        "Sincronização automática",
        "Escalabilidade ilimitada",
        "Atualizações automáticas"
      ]
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "App Mobile",
      description: "Controle total na palma da mão",
      details: [
        "App para Android e iOS",
        "Marcação por biometria",
        "Modo offline",
        "Notificações push"
      ]
    }
  ];

  const managementFeatures = [
    {
      icon: <Settings className="h-8 w-8" />,
      title: "Configurações Flexíveis",
      description: "Personalização completa do sistema",
      details: [
        "Regras de negócio customizáveis",
        "Horários flexíveis",
        "Políticas de overtime",
        "Integração com outros sistemas"
      ]
    },
    {
      icon: <Bell className="h-8 w-8" />,
      title: "Alertas Inteligentes",
      description: "Notificações automáticas para gestores",
      details: [
        "Alertas de atraso",
        "Notificação de faltas",
        "Lembretes de marcação",
        "Relatórios por email"
      ]
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Monitoramento em Tempo Real",
      description: "Acompanhamento contínuo da equipe",
      details: [
        "Status ao vivo dos funcionários",
        "Localização em tempo real",
        "Produtividade instantânea",
        "Alertas de irregularidades"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Ponto Seguro</span>
            </div>
          </div>
          <Button onClick={() => navigate('/auth')}>
            Começar Agora
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Funcionalidades
            <span className="text-primary"> Completas</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Descubra todas as ferramentas que o Ponto Seguro oferece para 
            revolucionar o controle de ponto da sua empresa
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Mais de 50 funcionalidades integradas
          </Badge>
        </div>
      </section>

      {/* Core Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Funcionalidades Principais
          </h2>
          <p className="text-muted-foreground text-lg">
            O essencial para o controle de ponto da sua empresa
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {coreFeatures.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit text-primary">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Reporting Features */}
      <section className="container mx-auto px-4 py-16 bg-secondary/20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Relatórios e Análises
          </h2>
          <p className="text-muted-foreground text-lg">
            Dados inteligentes para decisões estratégicas
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {reportingFeatures.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit text-accent">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Security Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Segurança e Tecnologia
          </h2>
          <p className="text-muted-foreground text-lg">
            Proteção máxima com tecnologia de ponta
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {securityFeatures.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-info/10 rounded-full w-fit text-info">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Management Features */}
      <section className="container mx-auto px-4 py-16 bg-secondary/20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Gestão e Controle
          </h2>
          <p className="text-muted-foreground text-lg">
            Ferramentas avançadas para administradores
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {managementFeatures.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-warning/10 rounded-full w-fit text-warning">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Pronto para transformar sua gestão de ponto?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Teste gratuitamente todas essas funcionalidades por 14 dias
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8 py-4">
              Começar Teste Gratuito
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/')} className="text-lg px-8 py-4">
              Ver Preços
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/10">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 Ponto Seguro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Features;