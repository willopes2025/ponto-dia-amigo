import { Link } from 'react-router-dom';

import { Logo } from '@/components/comum/Logo';
import { Button } from '@/components/ui/button';

export default function NaoEncontradoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Logo />
      <div>
        <p className="text-5xl font-semibold tracking-tight">404</p>
        <p className="mt-2 text-muted-foreground">Esta página não existe.</p>
      </div>
      <Button asChild>
        <Link to="/painel">Ir para o painel</Link>
      </Button>
    </div>
  );
}
