import { useState } from "react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Bell, Search, Link2, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { orgSettingsApi } from "@/lib/portalApi";
import { toast } from "@/hooks/use-toast";
import { hexToHsl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Apply org colors to the entire system
  useEffect(() => {
    const root = document.documentElement;
    if (orgSettings?.primaryColor) {
      const hsl = hexToHsl(orgSettings.primaryColor);
      if (!hsl) return;
      const parts = hsl.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
      if (parts) {
        const h = parseFloat(parts[1]);
        const s = parseFloat(parts[2]);
        const l = parseFloat(parts[3]);
        root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
        root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
        root.style.setProperty("--secondary", `${h} ${Math.round(s * 0.45)}% 94%`);
        root.style.setProperty("--secondary-foreground", `${h} ${Math.round(s * 0.8)}% 35%`);
        root.style.setProperty("--accent", `${h} ${Math.round(s * 0.55)}% 91%`);
        root.style.setProperty("--accent-foreground", `${h} ${Math.round(s * 0.8)}% 35%`);
        root.style.setProperty("--sidebar-background", `${h} ${Math.round(s * 0.5)}% 12%`);
        root.style.setProperty("--sidebar-foreground", `${h} 10% 85%`);
        root.style.setProperty("--sidebar-primary", `${h} ${s}% ${Math.min(l + 10, 75)}%`);
        root.style.setProperty("--sidebar-accent", `${h} ${Math.round(s * 0.4)}% 18%`);
        root.style.setProperty("--sidebar-accent-foreground", `${h} 10% 85%`);
        root.style.setProperty("--sidebar-border", `${h} ${Math.round(s * 0.4)}% 20%`);
        root.style.setProperty("--sidebar-ring", `${h} ${s}% ${Math.min(l + 10, 75)}%`);
      }
    }
    if (orgSettings?.accentColor) {
      const hslAccent = hexToHsl(orgSettings.accentColor);
      if (hslAccent && hslAccent.includes("%")) {
        root.style.setProperty("--accent", hslAccent);
      }
    }
    return () => {
      const props = [
        "--primary", "--ring", "--secondary", "--secondary-foreground",
        "--accent", "--accent-foreground",
        "--sidebar-background", "--sidebar-foreground", "--sidebar-primary",
        "--sidebar-accent", "--sidebar-accent-foreground", "--sidebar-border", "--sidebar-ring",
      ];
      props.forEach((p) => root.style.removeProperty(p));
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
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-3 md:px-6 py-3 flex items-center justify-between gap-2">
          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search - hidden on small mobile, visible on sm+ */}
          <div className="hidden sm:flex items-center gap-3 bg-muted rounded-lg px-3 py-2 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar pacientes, consultas..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
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
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-foreground">{user?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "profissional"}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
