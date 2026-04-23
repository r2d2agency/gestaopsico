import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, Clock, Plus, ArrowRight, Brain, ClipboardList } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { data: summary, isLoading } = useDashboardSummary();

  const todayAppointments = summary?.today_schedule?.map((c: any) => ({
    time: c.time,
    patient: c.patient?.name || "Paciente",
    type: c.type === "couple" ? "Casal" : "Individual",
    status: c.status === "scheduled" ? "confirmed" : c.status,
  })) || [];

  const todayCount = summary?.today_appointments ?? 0;
  const totalPatients = summary?.total_patients ?? 0;
  const monthlyRevenue = summary?.monthly_revenue ?? 0;
  const pendingPayments = summary?.pending_payments ?? 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Bom dia 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo do seu dia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/pacientes"><Plus className="w-4 h-4 mr-1" />Paciente</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/agenda"><Plus className="w-4 h-4 mr-1" />Consulta</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/assistente-ia"><Brain className="w-4 h-4 mr-1" />IA</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard icon={Calendar} label="Consultas Hoje" value={String(todayCount)} change={todayCount > 0 ? `${todayCount} agendada(s)` : "Nenhuma"} changeType={todayCount > 0 ? "positive" : "neutral"} />
            <StatCard icon={Users} label="Total Pacientes" value={String(totalPatients)} change={totalPatients > 0 ? "Ativos" : "Nenhum cadastrado"} changeType={totalPatients > 0 ? "positive" : "neutral"} />
            <StatCard icon={DollarSign} label="Faturamento Mensal" value={`R$ ${(monthlyRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} change={monthlyRevenue > 0 ? "Este mês" : "Sem faturamento"} changeType={monthlyRevenue > 0 ? "positive" : "neutral"} />
            <StatCard icon={Clock} label="Pagamentos Pendentes" value={`R$ ${(pendingPayments / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} change={pendingPayments > 0 ? "Pendente(s)" : "Nenhum pendente"} changeType={pendingPayments > 0 ? "negative" : "neutral"} />
          </>
        )}
      </div>

      {/* Schedule + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Consultas de Hoje</CardTitle>
              <Link to="/agenda" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver agenda <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {todayAppointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma consulta agendada para hoje</p>
                  <p className="text-xs mt-1">Agende uma nova consulta para começar</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/agenda"><Plus className="w-4 h-4 mr-1" />Agendar Consulta</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {todayAppointments.map((apt: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-muted/50 transition-colors gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-mono text-muted-foreground w-12 shrink-0">{apt.time}</span>
                        <div className="min-w-0">
                          <Link 
                            to={`/prontuarios?${apt.type === "Casal" ? `coupleId=${apt.couple_id}` : `patientId=${apt.patient_id}`}`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {apt.patient}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            apt.type === "Casal" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"
                          }`}>
                            {apt.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${apt.status === "confirmed" ? "bg-success" : "bg-warning"}`} />
                        <Button variant="outline" size="sm" className="hidden sm:inline-flex">Iniciar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="shadow-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Comece por aqui</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Cadastrar pacientes", description: "Adicione seus primeiros pacientes", to: "/pacientes", icon: Users },
                { label: "Agendar consultas", description: "Crie sua primeira consulta", to: "/agenda", icon: Calendar },
                { label: "Configurar testes", description: "Importe testes validados", to: "/testes", icon: ClipboardList },
                { label: "Ver financeiro", description: "Controle pagamentos e faturamento", to: "/financeiro", icon: DollarSign },
              ].map((item, i) => (
                <Link key={i} to={item.to} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
