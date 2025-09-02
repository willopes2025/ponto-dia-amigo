# Ponto Seguro

Sistema inteligente de gerenciamento de ponto eletrônico para equipes, com disparo automático de mensagens diárias e controle completo da jornada de trabalho.

## ✨ Funcionalidades Principais

### Para Administradores
- **Dashboard Executivo**: Visão geral de presença, atrasos, horas trabalhadas e eficiência da equipe
- **Gestão de Colaboradores**: CRUD completo de usuários com atribuição de turnos e escalas
- **Configuração de Turnos**: Definição de horários, intervalos e políticas específicas
- **Escalas Inteligentes**: Atribuição automática ou manual de turnos por colaborador/data
- **Políticas Flexíveis**: Configuração de tolerâncias, horas extras, banco de horas, GPS e selfie obrigatórios
- **Relatórios Avançados**: Exportação em CSV/Excel com filtros por período, colaborador e equipe
- **Sistema de Mensageria**: Templates personalizáveis para WhatsApp, SMS ou Email
- **Aprovação de Solicitações**: Gestão de ajustes, folgas e abonos solicitados pelos colaboradores

### Para Colaboradores
- **Registro de Ponto**: Interface intuitiva para entrada, saída e pausas
- **Agenda Pessoal**: Visualização de horários da semana e escalas
- **Mensagens Automáticas**: Recebimento diário de lembretes com horários de trabalho
- **Solicitações**: Pedidos de ajuste de ponto, folgas e abonos com justificativas
- **Histórico Pessoal**: Acompanhamento de horas trabalhadas, extras e saldo

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **UI Components**: Shadcn/ui + Radix UI
- **Autenticação**: Supabase Auth com RLS (Row Level Security)
- **Gerenciamento de Estado**: React Query + Context API
- **Formulários**: React Hook Form + Zod
- **Datas**: date-fns com localização PT-BR

## 🏗️ Arquitetura do Banco

### Tabelas Principais
- `companies`: Empresas com configurações de mensageria e timezone
- `profiles`: Perfis de usuários (admin/colaborador) vinculados às empresas
- `shifts`: Turnos de trabalho com horários e políticas
- `schedules`: Escalas diárias dos colaboradores
- `time_entries`: Registros de ponto (entrada/saída/pausas)
- `daily_summaries`: Resumos diários com cálculos de horas
- `policies`: Regras de tolerância, horas extras e validações
- `holidays`: Feriados nacionais e regionais
- `requests`: Solicitações de ajustes e folgas
- `message_logs`: Histórico de mensagens enviadas

## 📱 Como Usar

### 1. Primeiro Acesso
1. Acesse o sistema
2. Clique em "Cadastrar" na tela de login
3. Preencha os dados da empresa e do administrador
4. Confirme seu email (se necessário)

### 2. Configuração Inicial (Admin)
1. **Configurar Políticas**: Defina tolerâncias, horas extras e validações
2. **Criar Turnos**: Configure os horários de trabalho da empresa
3. **Cadastrar Colaboradores**: Adicione os usuários e atribua turnos
4. **Definir Escalas**: Configure as escalas semanais/mensais
5. **Configurar Mensageria**: Configure WhatsApp, SMS ou Email para lembretes

### 3. Uso Diário (Colaborador)
1. Acesse o sistema no horário de trabalho
2. Clique em "Registrar Entrada" na tela "Meu Ponto"
3. Registre pausas para almoço/intervalos
4. Registre a saída no final do expediente
5. Acompanhe suas horas na seção "Resumo da Semana"

### 4. Solicitações e Ajustes
- **Colaboradores**: Podem solicitar ajustes de ponto com justificativas
- **Administradores**: Aprovam/negam solicitações e fazem correções

## 🔧 Configurações Avançadas

### Validações de Ponto
- **GPS Obrigatório**: Validação de localização para trabalho presencial
- **Selfie Obrigatória**: Foto obrigatória para confirmação de identidade
- **IP Whitelist**: Restrição por faixa de IPs da empresa
- **Tolerância**: Minutos de atraso permitidos sem penalização

### Sistema de Mensageria
- **Horário de Disparo**: Configure janela de envio (ex: 07:30 - 08:00)
- **Templates Personalizáveis**: Customize mensagens de lembrete
- **Múltiplos Canais**: WhatsApp, SMS e Email
- **Logs Completos**: Histórico de envio e falhas

### Cálculos Automáticos
- **Horas Trabalhadas**: (Saída - Entrada) - Pausas
- **Horas Extras**: Excesso sobre a jornada prevista
- **Banco de Horas**: Acúmulo de saldo positivo/negativo
- **Atrasos**: Controle com tolerância configurável

## 📊 Relatórios

### Métricas Disponíveis
- Taxa de pontualidade
- Média de atraso por colaborador
- Horas extras acumuladas
- Faltas e absenteísmo
- Eficiência da equipe

### Exportações
- Formato CSV/Excel
- Filtros por período, colaborador e equipe
- Colunas personalizáveis
- Links compartilháveis (somente leitura)

## 🛡️ Segurança e Compliance

### LGPD/GDPR
- Consentimento para coleta de dados
- Política de privacidade integrada
- Exclusão de dados sob solicitação
- Mascaramento de informações sensíveis

### Auditoria
- Log completo de todas as alterações de ponto
- Rastreabilidade: quem, quando, de → para, motivo
- Histórico imutável de registros

## 🚨 Casos Especiais

### Tratamento de Inconsistências
- **Falta de saída**: Dia marcado como incompleto + notificação
- **Pausa aberta**: Fechamento automático no limite + marcação pendente
- **Sem escala**: Não dispara mensagem automática
- **Duplicidade**: Bloqueio + sugestão de solicitação de ajuste

## 🚀 Desenvolvimento

### Pré-requisitos
- Node.js 18+ instalado
- Conta no Supabase

### Configuração Local

```bash
# Clone o repositório
git clone <YOUR_GIT_URL>
cd ponto-seguro

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# Copie o .env.example para .env e configure as chaves do Supabase

# Execute o projeto
npm run dev
```

### Estrutura do Projeto
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── layouts/        # Layouts da aplicação
│   └── auth/           # Componentes de autenticação
├── hooks/              # Custom hooks
├── pages/              # Páginas da aplicação
├── lib/                # Utilitários e configurações
└── integrations/       # Integrações (Supabase)
```

## 📈 Roadmap

### Próximas Funcionalidades
- [ ] App móvel nativo (iOS/Android)
- [ ] Integração com relógio de ponto físico
- [ ] Dashboard em tempo real
- [ ] Notificações push
- [ ] API REST para integrações
- [ ] Relatórios com gráficos avançados
- [ ] Sistema de aprovação hierárquica

## Project info

**URL**: https://lovable.dev/projects/335f77f4-2dfc-4e42-8504-13eb0021d1d2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/335f77f4-2dfc-4e42-8504-13eb0021d1d2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/335f77f4-2dfc-4e42-8504-13eb0021d1d2) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

**Ponto Seguro** - Gestão inteligente de ponto eletrônico
*Desenvolvido com Lovable + Supabase*
