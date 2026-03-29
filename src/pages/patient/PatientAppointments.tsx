import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Video, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { patientPortalApi } from "@/lib/portalApi";

export default function PatientAppointments() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-appointments"],
    queryFn: () => patientPortalApi.appointments(),
  });

  const appointments = (data as any[]) || [];

  if (isLoading) {
    return (
      <div className="px-4 py-5 max-w-md mx-auto space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Minhas Consultas</h1>
        <p className="text-xs text-muted-foreground">Histórico e próximas sessões</p>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma consulta encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((apt: any, i: number) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      apt.status === "completed" ? "bg-success/10" :
                      apt.status === "cancelled" ? "bg-destructive/10" : "bg-primary/10"
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        apt.status === "completed" ? "text-success" :
                        apt.status === "cancelled" ? "text-destructive" : "text-primary"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(apt.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                        {apt.time && ` às ${apt.time}`}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {apt.mode === "video" ? (
                          <Video className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {apt.mode === "video" ? "Online" : "Presencial"}
                          {apt.professional?.name && ` · ${apt.professional.name}`}
                        </span>
                      </div>
                    </div>
                    <Badge variant={
                      apt.status === "completed" ? "default" :
                      apt.status === "cancelled" ? "destructive" : "outline"
                    } className="text-[9px]">
                      {apt.status === "completed" ? "Realizada" :
                       apt.status === "cancelled" ? "Cancelada" :
                       apt.status === "confirmed" ? "Confirmada" : "Agendada"}
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
