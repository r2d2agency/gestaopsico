import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Bell, Search, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { orgSettingsApi } from "@/lib/portalApi";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AppLayout() {
  const { user } = useAuth();
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  const { data: orgSettings } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => orgSettingsApi.get(),
  });

  const portalSlug = orgSettings?.portalSlug;
  const portalUrl = portalSlug
    ? `${window.location.origin}/p/${portalSlug}`
    : null;

  // Apply org colors to the system
  useEffect(() => {
    if (orgSettings?.primaryColor) {
      document.documentElement.style.setProperty("--primary", orgSettings.primaryColor);
    }
    if (orgSettings?.accentColor) {
      document.documentElement.style.setProperty("--accent", orgSettings.accentColor);
    }
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--accent");
    };
  }, [orgSettings?.primaryColor, orgSettings?.accentColor]);

  const copyPortalLink = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl);
      toast({ title: "Link do portal copiado!", description: portalUrl });
    } else {
      toast({ title: "Slug não configurado", description: "Configure o slug do portal em Configurações > Dados da Clínica", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2 w-80">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar pacientes, consultas..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" onClick={copyPortalLink}>
                  <Link2 className="w-5 h-5 text-muted-foreground" />
                  {portalSlug && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{portalSlug ? "Copiar link do portal" : "Configure o slug do portal"}</p>
              </TooltipContent>
            </Tooltip>
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "profissional"}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
