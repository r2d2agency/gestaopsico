import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Bell, Search } from "lucide-react";

export default function AppLayout() {
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
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">DR</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">Dra. Renata</p>
                <p className="text-xs text-muted-foreground">Psicóloga</p>
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
