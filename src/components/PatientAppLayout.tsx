import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, Calendar, MessageSquare, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const tabs = [
  { to: "/portal", icon: Home, label: "Início" },
  { to: "/portal/consultas", icon: Calendar, label: "Agenda" },
  { to: "/portal/mensagens", icon: MessageSquare, label: "Mensagens" },
  { to: "/portal/configuracoes", icon: Settings, label: "Config" },
];

export default function PatientAppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar - clinic/psychologist name */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">P</span>
          </div>
          <span className="font-display font-bold text-sm">PsicoGest</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary-foreground">
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </span>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {tabs.map(tab => {
            const isActive = location.pathname === tab.to || 
              (tab.to !== "/portal" && location.pathname.startsWith(tab.to));
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="patient-tab-indicator"
                    className="absolute -top-px left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} />
                <span className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
