import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Users, 
  Calendar, 
  Settings, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Meu Ponto', href: '/timesheet', icon: Clock },
  { name: 'Colaboradores', href: '/employees', icon: Users, adminOnly: true },
  { name: 'Escalas', href: '/schedules', icon: Calendar, adminOnly: true },
  { name: 'Relatórios', href: '/reports', icon: BarChart3, adminOnly: true },
  { name: 'Configurações', href: '/settings', icon: Settings, adminOnly: true },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // TODO: Get user profile to check if admin
  const isAdmin = true; // Placeholder

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 h-full w-64 bg-card border-r">
          <SidebarContent 
            navigation={navigation} 
            isAdmin={isAdmin}
            onSignOut={handleSignOut}
            closeSidebar={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-card border-r">
          <SidebarContent 
            navigation={navigation} 
            isAdmin={isAdmin}
            onSignOut={handleSignOut}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="ml-2 text-xl font-semibold text-foreground lg:ml-0">
                Ponto Seguro
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ 
  navigation, 
  isAdmin, 
  onSignOut, 
  closeSidebar 
}: {
  navigation: any[];
  isAdmin: boolean;
  onSignOut: () => void;
  closeSidebar?: () => void;
}) {
  const navigate = useNavigate();

  const handleNavigation = (href: string) => {
    navigate(href);
    closeSidebar?.();
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-lg font-bold">Ponto Seguro</span>
        </div>
        {closeSidebar && (
          <Button variant="ghost" size="sm" onClick={closeSidebar}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 pb-4">
        {navigation
          .filter(item => !item.adminOnly || isAdmin)
          .map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          ))}
      </nav>

      {/* Sign out */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}