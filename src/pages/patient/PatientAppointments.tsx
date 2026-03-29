import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Video, MapPin, Plus, Clock,
  ChevronLeft, ChevronRight, Loader2, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { patientPortalApi } from "@/lib/portalApi";

export default function PatientAppointments() {
  const qc = useQueryClient();
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [mode, setMode] = useState("in_person");
  const [notes, setNotes] = useState("");

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["patient-appointments"],
    queryFn: () => patientPortalApi.appointments(),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: () => patientPortalApi.dashboard(),
  });

  const allowBooking = dashboardData?.allowBooking ?? false;
  const bookingWeekdays = (dashboardData?.bookingWeekdays || "1,2,3,4,5").split(",").map(Number);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: ["patient-availability", dateStr],
    queryFn: () => patientPortalApi.availability(dateStr),
    enabled: !!dateStr,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      patientPortalApi.book({ date: dateStr, time: selectedTime!, mode, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
      qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast({ title: "Consulta agendada! ✅" });
      resetBooking();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
    },
  });

  const resetBooking = () => {
    setShowBooking(false);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setMode("in_person");
    setNotes("");
  };

  const allAppointments = (appointments as any[]) || [];
  const upcoming = allAppointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed"
  );
  const past = allAppointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );

  const availableSlots = availability?.slots?.filter((s) => s.available) || [];

  if (isLoading) {
    return (
      <div className="px-4 py-5 max-w-md mx-auto space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground">Minhas Consultas</h1>
          <p className="text-xs text-muted-foreground">Próximas sessões e histórico</p>
        </div>
        {allowBooking && (
          <Button size="sm" className="gap-1" onClick={() => setShowBooking(true)}>
            <Plus className="w-4 h-4" />
            Agendar
          </Button>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Próximas</p>
          {upcoming.map((apt: any, i: number) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(apt.date).toLocaleDateString("pt-BR", {
                          weekday: "short", day: "2-digit", month: "short",
                        })}
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
                    <Badge variant="outline" className="text-[9px]">
                      {apt.status === "confirmed" ? "Confirmada" : "Agendada"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {allAppointments.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma consulta encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Toque em "Agendar" para marcar sua primeira consulta
          </p>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Anteriores</p>
          {past.slice(0, 10).map((apt: any, i: number) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="opacity-70">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      apt.status === "completed" ? "bg-success/10" : "bg-destructive/10"
                    }`}>
                      <CalendarIcon className={`w-5 h-5 ${
                        apt.status === "completed" ? "text-success" : "text-destructive"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(apt.date).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                        {apt.time && ` às ${apt.time}`}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {apt.professional?.name}
                      </span>
                    </div>
                    <Badge
                      variant={apt.status === "completed" ? "default" : "destructive"}
                      className="text-[9px]"
                    >
                      {apt.status === "completed" ? "Realizada" : "Cancelada"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={(open) => { if (!open) resetBooking(); }}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-display">Agendar Consulta</DialogTitle>
            <DialogDescription className="text-xs">
              Escolha um dia e horário disponível
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Calendar */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a data</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today || !bookingWeekdays.includes(date.getDay());
                }}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto rounded-xl border")}
              />
            </div>

            {/* Time slots */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Horários disponíveis · {format(selectedDate, "dd/MM/yyyy")}
                </p>
                {loadingSlots ? (
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-9 w-16 rounded-lg" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Nenhum horário disponível neste dia
                  </p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                          selectedTime === slot.time
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        <Clock className="w-3 h-3 inline mr-1" />
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Mode */}
            {selectedTime && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Modalidade</p>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> Presencial
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-1.5">
                          <Video className="w-3 h-3" /> Online
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Observações (opcional)</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Gostaria de discutir sobre..."
                    className="text-xs min-h-[60px] resize-none"
                  />
                </div>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetBooking}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={!selectedDate || !selectedTime || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
            >
              {bookMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
