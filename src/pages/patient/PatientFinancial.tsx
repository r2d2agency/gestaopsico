import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, Wallet, TrendingUp, Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { patientPortalApi } from "@/lib/portalApi";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PatientFinancial() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-financial"],
    queryFn: () => patientPortalApi.financial(),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-5 max-w-md mx-auto space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-xl" />
        {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const summary = (data as any)?.summary || { total: 0, paid: 0, pending: 0, overdue: 0, balance: 0 };
  const items = ((data as any)?.items || (data as any)?.payments || []) as any[];
  const sessionsCount = (data as any)?.sessionsCount || 0;
  const balance = summary.balance ?? (summary.pending + (summary.overdue || 0));

  const openItems = items.filter(p => p.status === "pending" || p.status === "overdue");
  const paidItems = items.filter(p => p.status === "paid");

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Financeiro</h1>
        <p className="text-xs text-muted-foreground">Acompanhe seu saldo e pagamentos</p>
      </div>

      {/* Balance hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Saldo a pagar</p>
                <p className="text-2xl font-bold text-foreground mt-1">{fmt(balance)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-foreground">{fmt(summary.total)}</p>
              </div>
              <div>
                <p className="text-[10px] text-success">Pago</p>
                <p className="text-sm font-bold text-success">{fmt(summary.paid)}</p>
              </div>
              <div>
                <p className="text-[10px] text-warning">Em aberto</p>
                <p className="text-sm font-bold text-warning">{fmt(summary.pending + (summary.overdue || 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sessions stat */}
      {sessionsCount > 0 && (
        <Card className="border-border/60">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sessões realizadas</p>
                <p className="text-sm font-semibold text-foreground">{sessionsCount} sessões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open items */}
      {openItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-warning" />
            Em aberto ({openItems.length})
          </h2>
          {openItems.map((p: any, i: number) => (
            <BillCard key={p.id} item={p} index={i} />
          ))}
        </div>
      )}

      {/* Paid history */}
      {paidItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            Histórico ({paidItems.length})
          </h2>
          {paidItems.slice(0, 10).map((p: any, i: number) => (
            <BillCard key={p.id} item={p} index={i} />
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-10">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
        </div>
      )}
    </div>
  );
}

function BillCard({ item, index }: { item: any; index: number }) {
  const isPaid = item.status === "paid";
  const isOverdue = item.status === "overdue";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={isOverdue ? "border-destructive/30 bg-destructive/5" : ""}>
        <CardContent className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                isPaid ? "bg-success/10" : isOverdue ? "bg-destructive/10" : "bg-warning/10"
              }`}>
                {isPaid
                  ? <CheckCircle className="w-4 h-4 text-success" />
                  : isOverdue
                    ? <AlertCircle className="w-4 h-4 text-destructive" />
                    : <Clock className="w-4 h-4 text-warning" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{item.description || "Pagamento"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.dueDate
                    ? `Vence em ${new Date(item.dueDate).toLocaleDateString("pt-BR")}`
                    : item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : ""}
                </p>
                {item.paidAt && (
                  <p className="text-[10px] text-success">Pago em {new Date(item.paidAt).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-foreground">{fmt(Number(item.value || item.amount || 0))}</p>
              <Badge variant="outline" className={`text-[9px] mt-0.5 ${
                isPaid ? "bg-success/10 text-success border-success/20"
                  : isOverdue ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-warning/10 text-warning border-warning/20"
              }`}>
                {isPaid ? "Pago" : isOverdue ? "Vencido" : "Pendente"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
