import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, Clock, Plus, ArrowRight, TrendingUp, Brain } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const weeklyData = [
  { day: "Seg", consultas: 6, receita: 1200 },
  { day: "Ter", consultas: 8, receita: 1600 },
  { day: "Qua", consultas: 5, receita: 1000 },
  { day: "Qui", consultas: 9, receita: 1800 },
  { day: "Sex", consultas: 7, receita: 1400 },
  { day: "Sáb", consultas: 3, receita: 600 },
  { day: "Dom", consultas: 0, receita: 0 },
];

const monthlyTrend = [
  { month: "Jan", pacientes: 42, consultas: 120 },
  { month: "Fev", pacientes: 48, consultas: 135 },
  { month: "Mar", pacientes: 55, consultas: 150 },
  { month: "Abr", pacientes: 52, consultas: 142 },
  { month: "Mai", pacientes: 60, consultas: 168 },
  { month: "Jun", pacientes: 65, consultas: 180 },
];

const typeData = [
  { name: "Individual", value: 65, fill: "hsl(var(--primary))" },
  { name: "Casal", value: 25, fill: "hsl(var(--info))" },
  { name: "Grupo", value: 10, fill: "hsl(var(--warning))" },
];

const chartConfig: ChartConfig = {
  consultas: { label: "Consultas", color: "hsl(var(--primary))" },
  receita: { label: "Receita", color: "hsl(var(--info))" },
  pacientes: { label: "Pacientes", color: "hsl(var(--primary))" },
};

const fallbackSchedule = [
  { time: "08:00", patient: "Ana Silva", type: "Individual", status: "confirmed" },
  { time: "09:30", patient: "Carlos & Maria", type: "Casal", status: "confirmed" },
  { time: "11:00", patient: "João Oliveira", type: "Individual", status: "pending" },
  { time: "14:00", patient: "Beatriz Santos", type: "Individual", status: "confirmed" },
  { time: "15:30", patient: "Pedro & Laura", type: "Casal", status: "confirmed" },
];

export default function Dashboard() {
  const { data: summary, isLoading } = useDashboardSummary();

  const todayAppointments = summary?.today_schedule?.map((c: any) => ({
    time: c.time,
    patient: c.patient?.name || "Paciente",
    type: c.type === "couple" ? "Casal" : "Individual",
    status: c.status === "scheduled" ? "confirmed" : c.status,
  })) || fallbackSchedule;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bom dia 👋</h1>
          <p className="text-muted-foreground mt-1">Aqui está o resumo do seu dia.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/pacientes"><Plus className="w-4 h-4 mr-2" />Novo Paciente</Link>
          </Button>
          <Button asChild>
            <Link to="/agenda"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/assistente-ia"><Brain className="w-4 h-4 mr-2" />Assistente IA</Link>
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
            <StatCard icon={Calendar} label="Consultas Hoje" value={String(summary?.today_appointments ?? 5)} change="+12%" changeType="positive" />
            <StatCard icon={Users} label="Total Pacientes" value={String(summary?.total_patients ?? 65)} change="+8%" changeType="positive" />
            <StatCard icon={DollarSign} label="Faturamento Mensal" value={`R$ ${((summary?.monthly_revenue ?? 1200000) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} change="+15%" changeType="positive" />
            <StatCard icon={Clock} label="Pagamentos Pendentes" value={`R$ ${((summary?.pending_payments ?? 350000) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} change="3 pendentes" changeType="negative" />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Tendência Mensal */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="lg:col-span-1 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Tendência Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="gradPacientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="pacientes" stroke="hsl(var(--primary))" fill="url(#gradPacientes)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar Chart - Consultas por Dia */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Consultas da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="consultas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - Tipo de Consulta */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Tipos de Consulta
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="h-[200px] w-full flex items-center">
                <div className="w-[60%] h-full">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="space-y-2">
                  {typeData.map((t) => (
                    <div key={t.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.fill }} />
                      <span className="text-muted-foreground">{t.name}</span>
                      <span className="font-semibold text-foreground">{t.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Schedule + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
              <div className="divide-y divide-border">
                {todayAppointments.map((apt: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-muted-foreground w-12">{apt.time}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{apt.patient}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          apt.type === "Casal" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {apt.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${apt.status === "confirmed" ? "bg-success" : "bg-warning"}`} />
                      <Button variant="outline" size="sm">Iniciar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-card h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[
                  { action: "Consulta finalizada", detail: "Ana Silva - Individual", time: "Há 2h", color: "bg-success" },
                  { action: "Pagamento recebido", detail: "R$ 250,00 - PIX", time: "Há 3h", color: "bg-primary" },
                  { action: "Novo paciente", detail: "João Oliveira cadastrado", time: "Há 5h", color: "bg-info" },
                  { action: "Prontuário atualizado", detail: "Beatriz Santos", time: "Ontem", color: "bg-warning" },
                  { action: "Consulta agendada", detail: "Pedro & Laura - Casal", time: "Ontem", color: "bg-secondary" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-6 py-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
