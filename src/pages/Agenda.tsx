import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Clock, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointments } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  scheduled: "border-l-success bg-success/5",
  confirmed: "border-l-success bg-success/5",
  completed: "border-l-primary bg-primary/5",
  pending: "border-l-warning bg-warning/5",
  cancelled: "border-l-destructive bg-destructive/5",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Concluída",
  pending: "Pendente",
  cancelled: "Cancelada",
};

export default function Agenda() {
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: appointments = [], isLoading } = useAppointments({ date: dateStr });

  const goDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const confirmed = appointments.filter(a => a.status === "scheduled" || a.status === "completed").length;
  const pending = appointments.filter(a => a.status === "pending" as any).length;
  const cancelled = appointments.filter(a => a.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goDay(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => goDay(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("day")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "day" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >Dia</button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >Semana</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : appointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Nenhuma consulta neste dia</p>
              <p className="text-sm mt-1">Agende uma nova consulta clicando no botão acima.</p>
            </div>
          ) : (
            appointments.map((apt, i) => {
              const patientName = apt.patient?.name || "Paciente";
              const aptStatus = apt.status as string;
              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-xl border border-border shadow-card p-4 border-l-4 ${statusColors[aptStatus] || "border-l-muted"} hover:shadow-card-hover transition-shadow cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-display font-bold text-foreground">{apt.time}</p>
                        <p className="text-xs text-muted-foreground">{apt.duration}min</p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{patientName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            apt.type === "couple" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"
                          }`}>
                            {apt.type === "couple" ? "Casal" : "Individual"}
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
                        aptStatus === "scheduled" || aptStatus === "confirmed" ? "bg-success/10 text-success" :
                        aptStatus === "pending" ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {statusLabels[aptStatus] || aptStatus}
                      </span>
                      {aptStatus !== "cancelled" && (
                        <Button size="sm" variant={apt.mode === "video" ? "default" : "outline"}>
                          {apt.mode === "video" ? "Iniciar Videochamada" : "Ver Detalhes"}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

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
                <span className="text-sm font-semibold text-foreground">{appointments.length} consultas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmadas</span>
                <span className="text-sm font-semibold text-success">{confirmed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <span className="text-sm font-semibold text-warning">{pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canceladas</span>
                <span className="text-sm font-semibold text-destructive">{cancelled}</span>
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
