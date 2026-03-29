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
              label="Organizações"
              value={String(metrics?.organizations.total ?? 0)}
              icon={Building2}
              change={`${metrics?.organizations.active ?? 0} ativas`}
              changeType="positive"
            />
            <StatCard
              label="Suspensas"
              value={String(metrics?.organizations.suspended ?? 0)}
              icon={AlertTriangle}
              change="Organizações suspensas"
              changeType="negative"
            />
            <StatCard
              label="Usuários Ativos"
              value={String(metrics?.users.active ?? 0)}
              icon={UserCheck}
              change={`${metrics?.users.total ?? 0} total`}
            />
            <StatCard
              label="Pacientes"
              value={String(metrics?.patients ?? 0)}
              icon={Users}
              change="Total no sistema"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Consultas do Mês"
              value={String(metrics?.appointments.monthly ?? 0)}
              icon={Calendar}
              change={`${metrics?.appointments.total ?? 0} total`}
            />
            <StatCard
              label="Receita Total"
              value={fmt(metrics?.revenue.total ?? 0)}
              icon={DollarSign}
              change="Pagamentos confirmados"
              changeType="positive"
            />
            <StatCard
              label="Planos Ativos"
              value={String(metrics?.planBreakdown?.length ?? 0)}
              icon={TrendingUp}
              change="Tipos de plano em uso"
            />
            <StatCard
              label="Taxa de Atividade"
              value={
                metrics?.users.total
                  ? `${Math.round((metrics.users.active / metrics.users.total) * 100)}%`
                  : "0%"
              }
              icon={Activity}
              change="Usuários ativos vs total"
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
