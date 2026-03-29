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
  Smile,
  CreditCard,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const professionalNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  { icon: Heart, label: "Casais", path: "/casais" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: Video, label: "Consultas", path: "/consultas" },
  { icon: FileText, label: "Prontuários", path: "/prontuarios" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: ClipboardList, label: "Testes", path: "/testes" },
  { icon: Sparkles, label: "Assistente IA", path: "/assistente-ia" },
  { icon: Bot, label: "Secretária IA", path: "/secretaria-ia" },
  { icon: Bell, label: "Notificações", path: "/notificacoes" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
];

const patientNav = [
  { icon: LayoutDashboard, label: "Início", path: "/portal" },
  { icon: Smile, label: "Humor", path: "/portal/humor" },
  { icon: ClipboardList, label: "Testes", path: "/portal/testes" },
  { icon: Calendar, label: "Consultas", path: "/portal/consultas" },
  { icon: CreditCard, label: "Financeiro", path: "/portal/financeiro" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const isPatient = user?.role === "patient";
  const navItems = isPatient ? patientNav : professionalNav;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-sm">PG</span>
        </div>
        <div>
          <h1 className="font-display font-bold text-sm text-sidebar-primary">PsicoGest</h1>
          <p className="text-xs text-sidebar-foreground/60">
            {isPatient ? "Portal do Paciente" : "Gestão Clínica"}
          </p>
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
        {!isPatient && user?.role === "superadmin" && (
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
    </aside>
  );
}
