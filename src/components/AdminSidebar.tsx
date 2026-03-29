import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CreditCard, ArrowLeft,
  Shield, Bot, Key, Settings, MessageSquare,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/admin" },
  { icon: Building2, label: "Organizações", path: "/admin/organizacoes" },
  { icon: Users, label: "Usuários", path: "/admin/usuarios" },
  { icon: CreditCard, label: "Planos", path: "/admin/planos" },
  { icon: MessageSquare, label: "WhatsApp", path: "/admin/whatsapp" },
  { icon: Bot, label: "Agentes de IA", path: "/admin/agentes-ia" },
  { icon: Key, label: "Provedores IA", path: "/admin/provedores-ia" },
  { icon: Settings, label: "Configurações", path: "/admin/configuracoes" },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-destructive/80 flex items-center justify-center">
          <Shield className="w-5 h-5 text-destructive-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-sm text-sidebar-primary">PsicoGest</h1>
          <p className="text-xs text-sidebar-foreground/60">Superadmin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);
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

      <div className="px-3 py-4 border-t border-sidebar-border">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" />
          Voltar ao Sistema
        </Link>
      </div>
    </aside>
  );
}
