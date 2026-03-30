import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, Calendar, DollarSign, TrendingUp, TrendingDown,
  BarChart3, PieChart, Activity, Target, Clock,
  UserCheck, UserX, ArrowUpRight, ArrowDownRight,
  Download, Filter, CalendarDays, Wallet, AlertCircle,
  CheckCircle, XCircle, FileText, Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useFinancialList, useFinancialSummary } from "@/hooks/useFinancial";
import { useDashboardSummary } from "@/hooks/useDashboard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function Relatorios() {
  const [period, setPeriod] = useState("month");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: patients = [], isLoading: loadingPatients } = usePatients();
  const { data: appointments = [], isLoading: loadingAppts } = useAppointments();
  const { data: payments = [], isLoading: loadingPayments } = useFinancialList({ startDate: dateStart || undefined, endDate: dateEnd || undefined });
  const { data: summary, isLoading: loadingSummary } = useFinancialSummary();
  const { data: dashSummary, isLoading: loadingDash } = useDashboardSummary();

  const isLoading = loadingPatients || loadingAppts || loadingPayments || loadingSummary || loadingDash;

  const fmt = (v: number) =>
    (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── Derived metrics ──
  const metrics = useMemo(() => {
    const activePatients = patients.filter((p) => p.status === "active").length;
    const inactivePatients = patients.filter((p) => p.status === "inactive").length;
    const totalPatients = patients.length;
    const retentionRate = totalPatients > 0 ? Math.round((activePatients / totalPatients) * 100) : 0;

    const completedAppts = appointments.filter((a) => a.status === "completed");
    const cancelledAppts = appointments.filter((a) => a.status === "cancelled");
    const scheduledAppts = appointments.filter((a) => a.status === "scheduled");
    const attendedAppts = completedAppts.filter((a) => a.attended !== false);
    const attendanceRate = completedAppts.length > 0
      ? Math.round((attendedAppts.length / completedAppts.length) * 100) : 0;
    const cancelRate = appointments.length > 0
      ? Math.round((cancelledAppts.length / appointments.length) * 100) : 0;

    const paidPayments = payments.filter((p) => p.status === "paid");
    const pendingPayments = payments.filter((p) => p.status === "pending");
    const overduePayments = payments.filter((p) => p.status === "overdue");

    const totalRevenue = summary?.total_revenue ?? 0;
    const received = summary?.received ?? 0;
    const pending = summary?.pending ?? 0;
    const avgTicket = summary?.average_ticket ?? 0;

    // Revenue by method
    const revenueByMethod: Record<string, number> = {};
    paidPayments.forEach((p) => {
      const method = p.method || "outros";
      revenueByMethod[method] = (revenueByMethod[method] || 0) + p.value;
    });
    const methodLabels: Record<string, string> = {
      pix: "Pix", card: "Cartão", cash: "Dinheiro", insurance: "Convênio", outros: "Outros",
    };
    const revenueByMethodData = Object.entries(revenueByMethod).map(([k, v]) => ({
      name: methodLabels[k] || k,
      value: v,
    }));

    // Appts by type
    const individualAppts = appointments.filter((a) => a.type === "individual").length;
    const coupleAppts = appointments.filter((a) => a.type === "couple").length;
    const apptsByType = [
      { name: "Individual", value: individualAppts },
      { name: "Casal", value: coupleAppts },
    ].filter((d) => d.value > 0);

    // Appts by status
    const apptsByStatus = [
      { name: "Concluídas", value: completedAppts.length, color: "hsl(142 76% 36%)" },
      { name: "Agendadas", value: scheduledAppts.length, color: "hsl(var(--primary))" },
      { name: "Canceladas", value: cancelledAppts.length, color: "hsl(0 84% 60%)" },
    ].filter((d) => d.value > 0);

    // Monthly revenue (mock months from payments)
    const monthlyRevenue: Record<number, number> = {};
    const monthlyCount: Record<number, number> = {};
    paidPayments.forEach((p) => {
      if (p.date) {
        const m = new Date(p.date).getMonth();
        monthlyRevenue[m] = (monthlyRevenue[m] || 0) + p.value;
        monthlyCount[m] = (monthlyCount[m] || 0) + 1;
      }
    });
    const monthlyData = MONTHS.map((name, i) => ({
      name,
      receita: (monthlyRevenue[i] || 0) / 100,
      consultas: monthlyCount[i] || 0,
    }));

    // Patient growth (by created_at month)
    const patientsByMonth: Record<number, number> = {};
    patients.forEach((p) => {
      if (p.created_at) {
        const m = new Date(p.created_at).getMonth();
        patientsByMonth[m] = (patientsByMonth[m] || 0) + 1;
      }
    });
    let cumulative = 0;
    const patientGrowth = MONTHS.map((name, i) => {
      cumulative += patientsByMonth[i] || 0;
      return { name, total: cumulative, novos: patientsByMonth[i] || 0 };
    });

    // Top patients by sessions
    const sessionsByPatient: Record<string, { name: string; count: number; revenue: number }> = {};
    appointments.forEach((a) => {
      const pid = a.patient_id || a.patient?.id || "unknown";
      const pname = a.patient?.name || "Sem nome";
      if (!sessionsByPatient[pid]) sessionsByPatient[pid] = { name: pname, count: 0, revenue: 0 };
      sessionsByPatient[pid].count += 1;
      if (a.status === "completed") sessionsByPatient[pid].revenue += a.value || 0;
    });
    const topPatients = Object.values(sessionsByPatient)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const maxSessions = topPatients[0]?.count || 1;

    // Forecasting: simple projection
    const currentMonth = new Date().getMonth();
    const avgMonthlyRevenue = Object.values(monthlyRevenue).length > 0
      ? Object.values(monthlyRevenue).reduce((a, b) => a + b, 0) / Object.values(monthlyRevenue).length
      : 0;
    const projectedAnnual = avgMonthlyRevenue * 12;
    const avgMonthlyPatients = Object.values(patientsByMonth).length > 0
      ? Object.values(patientsByMonth).reduce((a, b) => a + b, 0) / Object.values(patientsByMonth).length
      : 0;

    return {
      activePatients, inactivePatients, totalPatients, retentionRate,
      completedAppts: completedAppts.length, cancelledAppts: cancelledAppts.length,
      scheduledAppts: scheduledAppts.length, attendanceRate, cancelRate,
      totalRevenue, received, pending, avgTicket,
      paidCount: paidPayments.length, pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      revenueByMethodData, apptsByType, apptsByStatus,
      monthlyData, patientGrowth, topPatients, maxSessions,
      avgMonthlyRevenue, projectedAnnual, avgMonthlyPatients,
    };
  }, [patients, appointments, payments, summary]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise completa da sua clínica</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground text-sm mt-1">Dashboards e indicadores para gestão clínica</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />Filtros
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range Filter */}
      {(showFilters || period === "custom") && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          <Card className="border-primary/20">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                  <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-44" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Final</Label>
                  <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-44" />
                </div>
                <Button size="sm" variant="outline" onClick={() => { setDateStart(""); setDateEnd(""); setPeriod("month"); }}>
                  Limpar Filtros
                </Button>
                {dateStart && dateEnd && (
                  <Badge variant="outline" className="text-xs">
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {new Date(dateStart + "T12:00:00").toLocaleDateString("pt-BR")} — {new Date(dateEnd + "T12:00:00").toLocaleDateString("pt-BR")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="patients"><Users className="w-4 h-4 mr-1.5" />Pacientes</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="w-4 h-4 mr-1.5" />Financeiro</TabsTrigger>
          <TabsTrigger value="forecast"><Target className="w-4 h-4 mr-1.5" />Previsibilidade</TabsTrigger>
        </TabsList>

        {/* ── VISÃO GERAL ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={Users} label="Pacientes Ativos" value={metrics.activePatients} suffix={`/ ${metrics.totalPatients}`} trend={metrics.retentionRate} trendLabel="retenção" />
            <KPICard icon={Calendar} label="Consultas Realizadas" value={metrics.completedAppts} suffix="concluídas" trend={metrics.attendanceRate} trendLabel="presença" />
            <KPICard icon={DollarSign} label="Receita Recebida" value={fmt(metrics.received)} isCurrency trend={0} trendLabel="" />
            <KPICard icon={AlertCircle} label="Pendente" value={fmt(metrics.pending)} isCurrency negative trend={0} trendLabel="" />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Receita Mensal</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]} />
                      <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Consultas por Status</CardTitle></CardHeader>
                <CardContent>
                  {metrics.apptsByStatus.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma consulta registrada</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <RechartsPie>
                        <Pie data={metrics.apptsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {metrics.apptsByStatus.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* ── PACIENTES ── */}
        <TabsContent value="patients" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={UserCheck} label="Ativos" value={metrics.activePatients} trend={metrics.retentionRate} trendLabel="retenção" />
            <KPICard icon={UserX} label="Inativos" value={metrics.inactivePatients} negative trend={0} trendLabel="" />
            <KPICard icon={Activity} label="Taxa de Presença" value={`${metrics.attendanceRate}%`} trend={metrics.attendanceRate} trendLabel="" />
            <KPICard icon={XCircle} label="Taxa de Cancelamento" value={`${metrics.cancelRate}%`} negative={metrics.cancelRate > 20} trend={0} trendLabel="" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Crescimento de Pacientes</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={metrics.patientGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Total" />
                      <Area type="monotone" dataKey="novos" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36%)" fillOpacity={0.15} name="Novos" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Top Pacientes (por sessões)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {metrics.topPatients.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Nenhum dado disponível</div>
                  ) : (
                    metrics.topPatients.map((p, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-foreground truncate">{p.name}</span>
                          <span className="text-muted-foreground">{p.count} sessões</span>
                        </div>
                        <Progress value={(p.count / metrics.maxSessions) * 100} className="h-2" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Type Distribution */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Consultas por Tipo</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {metrics.apptsByType.map((t) => (
                  <div key={t.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${t.name === "Casal" ? "bg-accent/20" : "bg-primary/10"}`}>
                      {t.name === "Casal" ? <Heart className="w-5 h-5 text-accent-foreground" /> : <Users className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{t.value}</p>
                      <p className="text-sm text-muted-foreground">{t.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FINANCEIRO ── */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={DollarSign} label="Faturamento Total" value={fmt(metrics.totalRevenue)} isCurrency />
            <KPICard icon={CheckCircle} label="Recebido" value={fmt(metrics.received)} isCurrency trend={0} trendLabel="" />
            <KPICard icon={Clock} label="Pendente" value={fmt(metrics.pending)} isCurrency negative />
            <KPICard icon={Wallet} label="Ticket Médio" value={fmt(metrics.avgTicket)} isCurrency />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Receita vs Consultas (Mensal)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="left" fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} name="Receita (R$)" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="consultas" stroke="hsl(142 76% 36%)" strokeWidth={2} name="Consultas" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Receita por Forma de Pagamento</CardTitle></CardHeader>
                <CardContent>
                  {metrics.revenueByMethodData.length === 0 ? (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Nenhum pagamento registrado</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPie>
                        <Pie data={metrics.revenueByMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {metrics.revenueByMethodData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Payment Status */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Status de Pagamentos</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatusBlock icon={CheckCircle} label="Pagos" count={metrics.paidCount} color="text-green-600 dark:text-green-400" bg="bg-green-500/10" />
                <StatusBlock icon={Clock} label="Pendentes" count={metrics.pendingCount} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-500/10" />
                <StatusBlock icon={AlertCircle} label="Vencidos" count={metrics.overdueCount} color="text-red-600 dark:text-red-400" bg="bg-red-500/10" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PREVISIBILIDADE ── */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> Projeção Anual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{fmt(metrics.projectedAnnual)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Baseado na média mensal de {fmt(metrics.avgMonthlyRevenue)}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="shadow-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Crescimento de Pacientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{Math.round(metrics.avgMonthlyPatients)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Novos pacientes por mês (média)</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Projeção: ~{Math.round(metrics.avgMonthlyPatients * 12)} novos pacientes/ano
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="shadow-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" /> Indicadores de Saúde
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthIndicator label="Retenção de Pacientes" value={metrics.retentionRate} target={80} />
                  <HealthIndicator label="Taxa de Presença" value={metrics.attendanceRate} target={85} />
                  <HealthIndicator label="Inadimplência" value={100 - (metrics.totalRevenue > 0 ? Math.round((metrics.received / metrics.totalRevenue) * 100) : 0)} target={10} inverted />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Forecast Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Projeção de Receita (Próximos Meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={generateForecast(metrics.monthlyData, metrics.avgMonthlyRevenue)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, ""]} />
                    <Legend />
                    <Area type="monotone" dataKey="real" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Receita Real" />
                    <Area type="monotone" dataKey="projecao" stroke="hsl(38 92% 50%)" fill="hsl(38 92% 50%)" fillOpacity={0.15} strokeDasharray="5 5" name="Projeção" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tips */}
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Insights e Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {generateInsights(metrics).map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <insight.icon className={`w-5 h-5 mt-0.5 shrink-0 ${insight.color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function KPICard({ icon: Icon, label, value, suffix, trend, trendLabel, isCurrency, negative }: {
  icon: React.ElementType; label: string; value: string | number; suffix?: string;
  trend?: number; trendLabel?: string; isCurrency?: boolean; negative?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="shadow-card">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {trend !== undefined && trend > 0 && (
              <Badge variant="outline" className={`text-xs ${negative ? "text-destructive border-destructive/30" : "text-green-600 border-green-600/30"}`}>
                {negative ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />}
                {trend}%{trendLabel ? ` ${trendLabel}` : ""}
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {suffix || label}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatusBlock({ icon: Icon, label, count, color, bg }: {
  icon: React.ElementType; label: string; count: number; color: string; bg: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg ${bg}`}>
      <Icon className={`w-8 h-8 ${color}`} />
      <div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function HealthIndicator({ label, value, target, inverted }: {
  label: string; value: number; target: number; inverted?: boolean;
}) {
  const isGood = inverted ? value <= target : value >= target;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {value}%
        </span>
      </div>
      <Progress value={inverted ? 100 - value : value} className="h-2" />
    </div>
  );
}

function generateForecast(monthlyData: { name: string; receita: number }[], avgRevenue: number) {
  const currentMonth = new Date().getMonth();
  return monthlyData.map((d, i) => ({
    ...d,
    real: i <= currentMonth ? d.receita : undefined,
    projecao: i > currentMonth ? avgRevenue / 100 : undefined,
  }));
}

function generateInsights(m: any) {
  const insights: { icon: React.ElementType; title: string; description: string; color: string }[] = [];

  if (m.retentionRate >= 80) {
    insights.push({ icon: CheckCircle, title: "Excelente retenção de pacientes", description: `${m.retentionRate}% dos seus pacientes estão ativos. Continue oferecendo um bom atendimento.`, color: "text-green-600" });
  } else if (m.retentionRate < 60) {
    insights.push({ icon: AlertCircle, title: "Atenção à retenção de pacientes", description: `Apenas ${m.retentionRate}% de retenção. Considere contatos de follow-up com pacientes inativos.`, color: "text-red-600" });
  }

  if (m.cancelRate > 20) {
    insights.push({ icon: XCircle, title: "Taxa de cancelamento alta", description: `${m.cancelRate}% das consultas foram canceladas. Envie lembretes automáticos via WhatsApp.`, color: "text-yellow-600" });
  }

  if (m.pendingCount > 5) {
    insights.push({ icon: Clock, title: "Pagamentos pendentes", description: `${m.pendingCount} pagamentos aguardando. Configure cobranças automáticas para melhorar o fluxo de caixa.`, color: "text-yellow-600" });
  }

  if (m.overdueCount > 0) {
    insights.push({ icon: AlertCircle, title: "Pagamentos vencidos", description: `${m.overdueCount} pagamento(s) vencido(s). Entre em contato com os pacientes para regularizar.`, color: "text-red-600" });
  }

  if (m.avgMonthlyPatients > 3) {
    insights.push({ icon: TrendingUp, title: "Bom crescimento", description: `Em média ${Math.round(m.avgMonthlyPatients)} novos pacientes por mês. Sua clínica está crescendo.`, color: "text-green-600" });
  }

  if (insights.length === 0) {
    insights.push({ icon: Activity, title: "Comece a usar", description: "Cadastre pacientes e agende consultas para ver insights personalizados aqui.", color: "text-primary" });
  }

  return insights;
}
