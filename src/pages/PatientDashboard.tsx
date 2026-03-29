import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, CreditCard, ClipboardList, Smile, Heart,
  ChevronRight, Bell, TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { patientPortalApi, type PatientDashboard } from "@/lib/portalApi";

const MOODS = ["", "Muito mal", "Mal", "Neutro", "Bem", "Muito bem"];
const MOOD_COLORS = ["", "text-destructive", "text-warning", "text-muted-foreground", "text-success", "text-primary"];

export default function PatientDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: () => patientPortalApi.dashboard(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Olá, {data?.patientName?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Seu painel de acompanhamento</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/humor">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smile className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">Registrar Humor</p>
                  <p className="text-xs text-muted-foreground">Como você está?</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Link>
        <Link to="/portal/testes">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">Testes</p>
                  {data?.pendingTests ? (
                    <Badge variant="destructive" className="text-[10px]">{data.pendingTests} pendente{data.pendingTests > 1 ? "s" : ""}</Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tudo respondido</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Link>
      </div>

      {/* Mood History */}
      {data?.recentMood && data.recentMood.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />Seu humor recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-20">
                {data.recentMood.slice().reverse().map((entry, i) => (
                  <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(entry.mood / 5) * 100}%` }}
                      transition={{ delay: i * 0.05 }}
                      className={`w-full rounded-t-sm ${
                        entry.mood >= 4 ? "bg-success" :
                        entry.mood === 3 ? "bg-warning" : "bg-destructive"
                      }`}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upcoming Appointments */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />Próximas Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.upcomingAppointments?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma consulta agendada</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingAppointments.map(apt => (
                  <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(apt.date).toLocaleDateString("pt-BR")} às {apt.time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.professional.name} · {apt.mode === "video" ? "Online" : "Presencial"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{apt.type === "couple" ? "Casal" : "Individual"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-2">
        {[
          { to: "/portal/consultas", icon: Calendar, label: "Minhas Consultas", desc: "Ver histórico completo" },
          { to: "/portal/financeiro", icon: CreditCard, label: "Financeiro", desc: "Pagamentos e faturas" },
        ].map((link, i) => (
          <Link key={link.to} to={link.to}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <link.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
