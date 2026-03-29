import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Bot,
  Bell,
  ClipboardList,
  Shield,
  HelpCircle,
  MessageSquare,
  Building2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { orgSettingsApi } from "@/lib/portalApi";

type NavItem = { icon: typeof LayoutDashboard; label: string; path: string; roles?: string[] };

const APP_NAME = "Psico Gleego";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const allNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes", roles: ["admin", "professional", "psychologist", "superadmin"] },
  { icon: Heart, label: "Casais", path: "/casais", roles: ["admin", "professional", "psychologist", "superadmin"] },
  { icon: Calendar, label: "Agenda", path: "/agenda", roles: ["admin", "professional", "psychologist", "secretary", "secretary_financial", "superadmin"] },
  { icon: Video, label: "Consultas", path: "/consultas", roles: ["admin", "professional", "psychologist", "secretary", "secretary_financial", "superadmin"] },
  { icon: FileText, label: "Prontuários", path: "/prontuarios", roles: ["admin", "professional", "psychologist", "superadmin"] },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro", roles: ["admin", "professional", "psychologist", "financial", "secretary_financial", "superadmin"] },
  { icon: ClipboardList, label: "Testes", path: "/testes", roles: ["admin", "professional", "psychologist", "superadmin"] },
  { icon: Sparkles, label: "Assistente IA", path: "/assistente-ia", roles: ["admin", "professional", "psychologist", "superadmin"] },
  { icon: Bot, label: "Secretária IA", path: "/secretaria-ia", roles: ["admin", "professional", "psychologist", "superadmin"] },
  { icon: MessageSquare, label: "Mensagens", path: "/mensagens", roles: ["admin", "professional", "psychologist", "secretary", "secretary_financial", "superadmin"] },
  { icon: Bell, label: "Notificações", path: "/notificacoes" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", roles: ["admin", "professional", "psychologist", "financial", "secretary_financial", "superadmin"] },
  { icon: HelpCircle, label: "Ajuda", path: "/ajuda" },
];

const patientNav: NavItem[] = [];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { data: orgSettings } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => orgSettingsApi.get(),
    enabled: !!user && user.role !== "patient",
  });

  const isPatient = user?.role === "patient";
  const role = user?.role || "professional";
  const userRoles = role === "secretary_financial" ? ["secretary_financial", "secretary", "financial"] : [role];

  const navItems = isPatient
    ? patientNav
    : allNav.filter((item) => !item.roles || userRoles.some((r) => item.roles!.includes(r)));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    professional: "Profissional",
    psychologist: "Psicólogo(a)",
    secretary: "Secretária",
    financial: "Financeiro",
    secretary_financial: "Secretária + Financeiro",
    superadmin: "Superadmin",
    patient: "Portal do Paciente",
  };

  const clinicName = orgSettings?.businessName || APP_NAME;
  const clinicLogo = orgSettings?.logo || "";

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        {clinicLogo ? (
          <img src={clinicLogo} alt={clinicName} className="w-10 h-10 rounded-xl object-contain bg-sidebar-accent p-1 border border-sidebar-border" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center border border-sidebar-border">
            <Building2 className="w-5 h-5 text-sidebar-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-sm text-sidebar-primary truncate">{clinicName}</h1>
          <p className="text-xs text-sidebar-foreground/60 truncate">{roleLabel[role] || "Gestão Clínica"}</p>
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
        {!isPatient && (role === "superadmin" || role === "admin") && (
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            <Shield className="w-5 h-5 shrink-0" />
            Superadmin
          </Link>
        )}
        {!isPatient && (
          <Link
            to="/configuracoes"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            <Settings className="w-5 h-5 shrink-0" />
            Configurações
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sair
        </button>
      </div>

      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-xs font-medium text-sidebar-primary">{APP_NAME}</p>
        <p className="text-[11px] text-sidebar-foreground/60">v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
