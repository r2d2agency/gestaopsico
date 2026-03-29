import { motion } from "framer-motion";
import {
  Building2,
  Users,
  UserCheck,
  Activity,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/StatCard";
import { useAdminMetrics } from "@/hooks/useAdmin";

export default function AdminDashboard() {
  const { data: metrics, isLoading } = useAdminMetrics();

  const fmt = (v: number) =>
    (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Painel Superadmin
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral de todo o sistema PsicoGest
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Organizações"
              value={metrics?.organizations.total ?? 0}
              icon={Building2}
              description={`${metrics?.organizations.active ?? 0} ativas`}
            />
            <StatCard
              title="Suspensas"
              value={metrics?.organizations.suspended ?? 0}
              icon={AlertTriangle}
              description="Organizações suspensas"
            />
            <StatCard
              title="Usuários Ativos"
              value={metrics?.users.active ?? 0}
              icon={UserCheck}
              description={`${metrics?.users.total ?? 0} total`}
            />
            <StatCard
              title="Pacientes"
              value={metrics?.patients ?? 0}
              icon={Users}
              description="Total no sistema"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Consultas do Mês"
              value={metrics?.appointments.monthly ?? 0}
              icon={Calendar}
              description={`${metrics?.appointments.total ?? 0} total`}
            />
            <StatCard
              title="Receita Total"
              value={fmt(metrics?.revenue.total ?? 0)}
              icon={DollarSign}
              description="Pagamentos confirmados"
            />
            <StatCard
              title="Planos Ativos"
              value={metrics?.planBreakdown?.length ?? 0}
              icon={TrendingUp}
              description="Tipos de plano em uso"
            />
            <StatCard
              title="Taxa de Atividade"
              value={
                metrics?.users.total
                  ? `${Math.round((metrics.users.active / metrics.users.total) * 100)}%`
                  : "0%"
              }
              icon={Activity}
              description="Usuários ativos vs total"
            />
          </div>

          {metrics?.planBreakdown && metrics.planBreakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h3 className="font-display font-semibold text-foreground mb-4">
                Distribuição de Planos
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {metrics.planBreakdown.map((p) => (
                  <div
                    key={p.plan}
                    className="rounded-lg bg-muted/50 p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-foreground">{p.count}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {p.plan}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
