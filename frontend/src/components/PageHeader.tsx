import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-1 min-w-0">
        {backHref && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0"
            onClick={() => navigate(backHref)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="font-semibold text-base md:text-lg text-foreground truncate">{title}</h1>
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-4 shrink-0">{actions}</div>
      )}
    </header>
  );
}
