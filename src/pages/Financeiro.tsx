import { motion } from "framer-motion";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Download, Filter } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";

const transactions = [
  { id: 1, patient: "Ana Silva", date: "28/03/2026", value: "R$ 250,00", method: "Pix", status: "paid" as const, type: "Individual" },
  { id: 2, patient: "Carlos & Maria", date: "28/03/2026", value: "R$ 400,00", method: "Cartão", status: "paid" as const, type: "Casal" },
  { id: 3, patient: "João Oliveira", date: "27/03/2026", value: "R$ 250,00", method: "Pix", status: "pending" as const, type: "Individual" },
  { id: 4, patient: "Beatriz Santos", date: "26/03/2026", value: "R$ 250,00", method: "Convênio", status: "paid" as const, type: "Individual" },
  { id: 5, patient: "Pedro & Laura", date: "25/03/2026", value: "R$ 400,00", method: "Dinheiro", status: "overdue" as const, type: "Casal" },
  { id: 6, patient: "Fernanda Dias", date: "24/03/2026", value: "R$ 250,00", method: "Pix", status: "paid" as const, type: "Individual" },
  { id: 7, patient: "Ricardo Alves", date: "23/03/2026", value: "R$ 250,00", method: "Cartão", status: "cancelled" as const, type: "Individual" },
];

const statusConfig = {
  paid: { label: "Pago", class: "bg-success/10 text-success" },
  pending: { label: "Pendente", class: "bg-warning/10 text-warning" },
  overdue: { label: "Vencido", class: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
};

export default function Financeiro() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Março de 2026</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filtrar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Faturamento Total" value="R$ 18.500" change="+12%" changeType="positive" />
        <StatCard icon={CheckCircle} label="Recebido" value="R$ 16.100" change="87%" changeType="positive" />
        <StatCard icon={AlertCircle} label="Pendente" value="R$ 1.600" change="5 pagtos" changeType="negative" />
        <StatCard icon={TrendingUp} label="Ticket Médio" value="R$ 285" change="+5%" changeType="positive" />
      </div>

      {/* Chart placeholder */}
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

      {/* Transactions table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">Últimas Transações</h2>
        </div>
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
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-foreground">{t.patient}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.date}</td>
                <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{t.value}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.method}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.type === "Casal" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"
                  }`}>{t.type}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[t.status].class}`}>
                    {statusConfig[t.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
