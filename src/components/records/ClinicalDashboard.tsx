import { useQuery } from "@tanstack/react-query";
import { recordsApi, type ClinicalDashboard as DashboardData } from "@/lib/recordsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, FileText, AlertTriangle, Tag, TrendingUp, BarChart3, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function ClinicalDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["clinical-dashboard"],
    queryFn: () => recordsApi.clinicalDashboard(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Pacientes Ativos" value={data.activePatients} />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total de Prontuários" value={data.totalRecords} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Registros Incompletos" value={data.incompleteRecords} warning={data.incompleteRecords > 0} />
        <StatCard icon={<Tag className="w-5 h-5" />} label="Temas Identificados" value={data.themes.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-primary" /> Pacientes com Mais Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            {data.patientFrequency.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda</p>
            ) : (
              <div className="space-y-2">
                {data.patientFrequency.slice(0, 8).map((p, i) => (
                  <motion.div key={p.patientId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm truncate flex-1">{p.patientName}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (p.count / (data.patientFrequency[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-primary w-6 text-right">{p.count}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Themes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><Tag className="w-4 h-4 text-primary" /> Temas Mais Frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.themes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Organize prontuários com IA para identificar temas</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.themes.map(({ name, count }) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name} <span className="ml-1 text-primary font-bold">{count as number}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent records */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> Sessões Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão recente</p>
          ) : (
            <div className="space-y-2">
              {data.recentRecords.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{r.patient?.name || "—"}</span>
                    {(!r.complaint && !r.keyPoints && !r.content) && (
                      <Badge variant="destructive" className="text-[10px]">Incompleto</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.date), "dd/MM", { locale: ptBR })}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ethical reminder */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            A IA organiza e sugere — nunca gera diagnósticos. O psicólogo revisa e valida todas as informações antes do registro definitivo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, warning }: { icon: React.ReactNode; label: string; value: number; warning?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="pt-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${warning ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
            {icon}
          </div>
          <div>
            <p className={`text-2xl font-bold ${warning ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
