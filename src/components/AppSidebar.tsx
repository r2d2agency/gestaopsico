import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Heart,
  Video,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  { icon: Heart, label: "Casais", path: "/casais" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: Video, label: "Consultas", path: "/consultas" },
  { icon: FileText, label: "Prontuários", path: "/prontuarios" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: Sparkles, label: "Assistente IA", path: "/assistente-ia" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
];

const bottomItems = [
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
  { icon: LogOut, label: "Sair", path: "/" },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-sm">PG</span>
        </div>
        <div>
          <h1 className="font-display font-bold text-sm text-sidebar-primary">PsicoGest</h1>
          <p className="text-xs text-sidebar-foreground/60">Gestão Clínica</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
