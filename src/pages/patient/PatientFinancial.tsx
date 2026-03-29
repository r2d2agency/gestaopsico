import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { patientPortalApi } from "@/lib/portalApi";

const fmt = (v: number) =>
  (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PatientFinancial() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-financial"],
    queryFn: () => patientPortalApi.financial(),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-5 max-w-md mx-auto space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const summary = data?.summary || { total: 0, paid: 0, pending: 0 };
  const payments = data?.payments || [];

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Financeiro</h1>
        <p className="text-xs text-muted-foreground">Seus pagamentos e faturas</p>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-foreground">{fmt(summary.total)}</p>
              </div>
              <div>
                <p className="text-[10px] text-success">Pago</p>
                <p className="text-sm font-bold text-success">{fmt(summary.paid)}</p>
              </div>
              <div>
                <p className="text-[10px] text-warning">Pendente</p>
                <p className="text-sm font-bold text-warning">{fmt(summary.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payments list */}
      {payments.length === 0 ? (
        <div className="text-center py-10">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        p.status === "paid" ? "bg-success/10" : "bg-warning/10"
                      }`}>
                        {p.status === "paid" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Clock className="w-4 h-4 text-warning" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{fmt(p.amount || p.value || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("pt-BR") : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={p.status === "paid" ? "default" : "outline"} className="text-[9px]">
                      {p.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
