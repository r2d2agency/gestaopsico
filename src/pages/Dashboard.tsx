import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, Clock, Plus, ArrowRight } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const todayAppointments = [
  { time: "08:00", patient: "Ana Silva", type: "Individual", status: "confirmed" },
  { time: "09:30", patient: "Carlos & Maria", type: "Casal", status: "confirmed" },
  { time: "11:00", patient: "João Oliveira", type: "Individual", status: "pending" },
  { time: "14:00", patient: "Beatriz Santos", type: "Individual", status: "confirmed" },
  { time: "15:30", patient: "Pedro & Laura", type: "Casal", status: "confirmed" },
];

const recentPatients = [
  { name: "Ana Silva", lastVisit: "Hoje", status: "Ativo" },
  { name: "Carlos Mendes", lastVisit: "Ontem", status: "Ativo" },
  { name: "Juliana Costa", lastVisit: "3 dias atrás", status: "Ativo" },
  { name: "Roberto Lima", lastVisit: "1 semana", status: "Inativo" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bom dia, Dra. Renata 👋</h1>
          <p className="text-muted-foreground mt-1">Aqui está o resumo do seu dia.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/pacientes"><Plus className="w-4 h-4 mr-2" />Novo Paciente</Link>
          </Button>
          <Button asChild>
            <Link to="/agenda"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Consultas Hoje" value="5" change="+2 vs ontem" changeType="positive" />
        <StatCard icon={Users} label="Total Pacientes" value="127" change="+4 este mês" changeType="positive" />
        <StatCard icon={DollarSign} label="Faturamento Mensal" value="R$ 18.500" change="+12%" changeType="positive" />
        <StatCard icon={Clock} label="Pagamentos Pendentes" value="R$ 2.400" change="8 pendentes" changeType="negative" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card"
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Consultas de Hoje</h2>
            <Link to="/agenda" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {todayAppointments.map((apt, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
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
                  <span className={`w-2 h-2 rounded-full ${
                    apt.status === "confirmed" ? "bg-success" : "bg-warning"
                  }`} />
                  <Button variant="outline" size="sm">Iniciar</Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent patients */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border shadow-card"
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Pacientes Recentes</h2>
            <Link to="/pacientes" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentPatients.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary-foreground">
                      {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.lastVisit}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === "Ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
