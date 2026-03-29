import { motion } from "framer-motion";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Download, Filter } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialList, useFinancialSummary } from "@/hooks/useFinancial";

const statusConfig: Record<string, { label: string; class: string }> = {
  paid: { label: "Pago", class: "bg-success/10 text-success" },
  pending: { label: "Pendente", class: "bg-warning/10 text-warning" },
  overdue: { label: "Vencido", class: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
};

const methodLabels: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
  insurance: "Convênio",
};

export default function Financeiro() {
  const { data: payments = [], isLoading: loadingList } = useFinancialList();
  const { data: summary, isLoading: loadingSummary } = useFinancialSummary();

  const fmt = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Resumo financeiro</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filtrar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={DollarSign} label="Faturamento Total" value={fmt(summary?.total_revenue ?? 0)} change="" changeType="positive" />
            <StatCard icon={CheckCircle} label="Recebido" value={fmt(summary?.received ?? 0)} change="" changeType="positive" />
            <StatCard icon={AlertCircle} label="Pendente" value={fmt(summary?.pending ?? 0)} change="" changeType="negative" />
            <StatCard icon={TrendingUp} label="Ticket Médio" value={fmt(summary?.average_ticket ?? 0)} change="" changeType="positive" />
          </>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border shadow-card p-6"
      >
        <h2 className="font-display font-semibold text-foreground mb-4">Faturamento Mensal</h2>
        <div className="h-48 flex items-end gap-2">
          {[65, 78, 55, 90, 72, 85, 68, 95, 80, 88, 70, 92].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="w-full rounded-t-md gradient-primary"
              />
              <span className="text-[10px] text-muted-foreground">
                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i]}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {loadingList ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Últimas Transações</h2>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma transação encontrada.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Data</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Valor</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Forma</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((t) => {
                  const sc = statusConfig[t.status] || statusConfig.pending;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{t.patient_name || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.date ? new Date(t.date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{fmt(t.value)}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{methodLabels[t.method] || t.method || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.type === "couple" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"
                        }`}>{t.type === "couple" ? "Casal" : "Individual"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.class}`}>{sc.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </motion.div>
      )}
    </div>
  );
}
