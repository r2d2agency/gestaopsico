import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Clock, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const appointments = [
  { id: 1, time: "08:00", duration: "50min", patient: "Ana Silva", type: "individual" as const, mode: "video" as const, status: "confirmed" as const },
  { id: 2, time: "09:30", duration: "80min", patient: "Carlos & Maria", type: "casal" as const, mode: "video" as const, status: "confirmed" as const },
  { id: 3, time: "11:00", duration: "50min", patient: "João Oliveira", type: "individual" as const, mode: "presencial" as const, status: "pending" as const },
  { id: 4, time: "14:00", duration: "50min", patient: "Beatriz Santos", type: "individual" as const, mode: "video" as const, status: "confirmed" as const },
  { id: 5, time: "15:30", duration: "80min", patient: "Pedro & Laura", type: "casal" as const, mode: "video" as const, status: "confirmed" as const },
  { id: 6, time: "17:00", duration: "50min", patient: "Fernanda Dias", type: "individual" as const, mode: "presencial" as const, status: "cancelled" as const },
];

const statusColors = {
  confirmed: "border-l-success bg-success/5",
  pending: "border-l-warning bg-warning/5",
  cancelled: "border-l-destructive bg-destructive/5",
};

const statusLabels = {
  confirmed: "Confirmada",
  pending: "Pendente",
  cancelled: "Cancelada",
};

export default function Agenda() {
  const [view, setView] = useState<"day" | "week">("day");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">Sexta-feira, 28 de Março de 2026</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline">Hoje</Button>
          <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("day")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "day" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main schedule */}
        <div className="lg:col-span-3 space-y-3">
          {appointments.map((apt, i) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-xl border border-border shadow-card p-4 border-l-4 ${statusColors[apt.status]} hover:shadow-card-hover transition-shadow cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-display font-bold text-foreground">{apt.time}</p>
                    <p className="text-xs text-muted-foreground">{apt.duration}</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{apt.patient}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        apt.type === "casal" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"
                      }`}>
                        {apt.type === "casal" ? "Casal" : "Individual"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {apt.mode === "video" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {apt.mode === "video" ? "Online" : "Presencial"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    apt.status === "confirmed" ? "bg-success/10 text-success" :
                    apt.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {statusLabels[apt.status]}
                  </span>
                  {apt.status !== "cancelled" && (
                    <Button size="sm" variant={apt.mode === "video" ? "default" : "outline"}>
                      {apt.mode === "video" ? "Iniciar Videochamada" : "Ver Detalhes"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mini calendar / stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Resumo do Dia</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-semibold text-foreground">6 consultas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmadas</span>
                <span className="text-sm font-semibold text-success">4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <span className="text-sm font-semibold text-warning">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canceladas</span>
                <span className="text-sm font-semibold text-destructive">1</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Horários Disponíveis</h3>
            <div className="space-y-2">
              {["10:00", "12:00", "16:00"].map(time => (
                <button key={time} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground">{time}</span>
                  <span className="text-muted-foreground ml-auto">Disponível</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
