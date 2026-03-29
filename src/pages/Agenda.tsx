import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, ChevronLeft, ChevronRight, Clock, Video, MapPin, Loader2,
  UserCheck, Heart, Ban, Filter, Users, CalendarIcon, Repeat, Briefcase,
  Plane, Stethoscope, GraduationCap, Home, Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppointments } from "@/hooks/useAppointments";
import { format, addDays, eachDayOfInterval, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { consultasApi, casaisApi, apiRequest, type Consulta, type Casal } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PatientSearchSelect from "@/components/PatientSearchSelect";

const statusColors: Record<string, string> = {
  scheduled: "border-l-green-500 bg-green-500/5",
  confirmed: "border-l-green-500 bg-green-500/5",
  completed: "border-l-primary bg-primary/5",
  pending: "border-l-yellow-500 bg-yellow-500/5",
  cancelled: "border-l-destructive bg-destructive/5",
  blocked: "border-l-muted-foreground bg-muted/30",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Concluída",
  pending: "Pendente",
  cancelled: "Cancelada",
  blocked: "Bloqueado",
};

const emptyConsulta: Partial<Consulta> = {
  patient_id: "", type: "individual", date: "", time: "",
  duration: 50, value: 0, status: "scheduled",
  payment_status: "pending", mode: "in_person", notes: "",
};

export default function Agenda() {
  const { user } = useAuth();
  const role = user?.role || "professional";
  const isSecretary = role === "secretary";
  const isAdmin = role === "admin" || role === "superadmin";
  const canCreateForOthers = isSecretary || isAdmin;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [form, setForm] = useState<Partial<Consulta>>({ ...emptyConsulta });
  const [selectedProfessional, setSelectedProfessional] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockTime, setBlockTime] = useState("");
  const [blockDuration, setBlockDuration] = useState(60);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch professionals list for secretary/admin
  const { data: professionals = [] } = useQuery<any[]>({
    queryKey: ["professionals"],
    queryFn: () => apiRequest<any[]>("/settings/professionals"),
    enabled: canCreateForOthers,
  });

  // Fetch appointments - secretary/admin can filter by professional
  const queryParams: Record<string, string> = { date: dateStr };
  if (canCreateForOthers && selectedProfessional) {
    queryParams.professional_id = selectedProfessional;
  }
  const { data: appointments = [], isLoading } = useAppointments(queryParams);

  const { data: couples = [] } = useQuery<Casal[]>({
    queryKey: ["couples"],
    queryFn: () => casaisApi.list(),
  });
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: Partial<Consulta>) => consultasApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Consulta agendada com sucesso!" });
      setDialogOpen(false);
      setForm({ ...emptyConsulta });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const attendMutation = useMutation({
    mutationFn: (id: string) => consultasApi.attend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Comparecimento registrado e conta a receber gerada!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const blockMutation = useMutation({
    mutationFn: (data: any) => consultasApi.create({
      ...data,
      type: "blocked",
      status: "blocked",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Horário bloqueado!" });
      setBlockOpen(false);
      setBlockReason("");
      setBlockTime("");
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const goDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const set = (field: string, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (form.type === "couple") {
      if (!(form as any).couple_id || !form.date || !form.time) {
        toast({ title: "Preencha casal, data e horário", variant: "destructive" });
        return;
      }
    } else {
      if (!form.patient_id || !form.date || !form.time) {
        toast({ title: "Preencha paciente, data e horário", variant: "destructive" });
        return;
      }
    }
    // If secretary creating for a professional, include professional_id
    const payload = { ...form };
    if (canCreateForOthers && selectedProfessional) {
      (payload as any).professional_id = selectedProfessional;
    }
    createMutation.mutate(payload);
  };

  const handleBlock = () => {
    if (!blockTime) {
      toast({ title: "Selecione o horário", variant: "destructive" });
      return;
    }
    const data: any = {
      date: dateStr,
      time: blockTime,
      duration: blockDuration,
      notes: blockReason || "Compromisso pessoal",
    };
    if (canCreateForOthers && selectedProfessional) {
      data.professional_id = selectedProfessional;
    }
    blockMutation.mutate(data);
  };

  const confirmed = appointments.filter((a: any) => a.status === "scheduled" || a.status === "completed").length;
  const pending = appointments.filter((a: any) => a.status === "pending").length;
  const cancelled = appointments.filter((a: any) => a.status === "cancelled").length;
  const blocked = appointments.filter((a: any) => a.status === "blocked" || a.type === "blocked").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setBlockOpen(true); }} size="sm">
            <Ban className="w-4 h-4 mr-2" />Bloquear Horário
          </Button>
          <Button onClick={() => { setForm({ ...emptyConsulta, date: dateStr }); setDialogOpen(true); }} size="sm">
            <Plus className="w-4 h-4 mr-2" />Nova Consulta
          </Button>
        </div>
      </div>

      {/* Professional Filter (secretary/admin) */}
      {canCreateForOthers && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Profissional:</Label>
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Array.isArray(professionals) ? professionals : []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <Users className="w-3 h-3" />{p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProfessional && selectedProfessional !== "all" && (
            <Badge variant="outline" className="text-xs">
              Filtrando por profissional
            </Badge>
          )}
        </div>
      )}

      {/* Nova Consulta Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Consulta</DialogTitle>
            <DialogDescription>Agende uma nova consulta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Professional selector for secretary/admin */}
            {canCreateForOthers && (
              <div>
                <Label>Profissional *</Label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(professionals) ? professionals : []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type || "individual"} onValueChange={v => { set("type", v); if (v === "couple") set("patient_id", ""); else set("couple_id" as any, ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="couple">Casal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {form.type === "couple" ? (
                  <>
                    <Label>Casal *</Label>
                    <Select value={(form as any).couple_id || ""} onValueChange={v => set("couple_id" as any, v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione o casal" /></SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(couples) ? couples : []).map((c: Casal) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-primary" />{c.name || `${c.patient1?.name} & ${c.patient2?.name}`}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label>Paciente *</Label>
                    <PatientSearchSelect
                      value={form.patient_id || ""}
                      onValueChange={(v) => set("patient_id", v)}
                      placeholder="Buscar paciente..."
                    />
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} />
              </div>
              <div>
                <Label>Horário *</Label>
                <Input type="time" value={form.time || ""} onChange={e => set("time", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={form.duration || 50} onChange={e => set("duration", Number(e.target.value))} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={form.value || 0} onChange={e => set("value", Number(e.target.value))} />
              </div>
              <div>
                <Label>Modalidade</Label>
                <Select value={form.mode || "in_person"} onValueChange={v => set("mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">Presencial</SelectItem>
                    <SelectItem value="video">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Notas sobre a consulta..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Schedule Dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-muted-foreground" />Bloquear Horário
            </DialogTitle>
            <DialogDescription>Bloqueie um horário na agenda com um motivo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {canCreateForOthers && (
              <div>
                <Label>Profissional</Label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(professionals) ? professionals : []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horário *</Label>
                <Input type="time" value={blockTime} onChange={e => setBlockTime(e.target.value)} />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={blockDuration} onChange={e => setBlockDuration(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Compromisso pessoal, reunião, almoço..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancelar</Button>
            <Button onClick={handleBlock} disabled={blockMutation.isPending || !blockTime}>
              {blockMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goDay(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => goDay(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Appointments list */}
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
            appointments.map((apt: any, i: number) => {
              const patientName = apt.patient?.name || (apt.type === "blocked" ? "Bloqueado" : "Paciente");
              const aptStatus = apt.type === "blocked" ? "blocked" : (apt.status as string);
              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-xl border border-border shadow-card p-4 border-l-4 ${statusColors[aptStatus] || "border-l-muted"} hover:shadow-card-hover transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-display font-bold text-foreground">{apt.time}</p>
                        <p className="text-xs text-muted-foreground">{apt.duration}min</p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {apt.type === "blocked" ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Ban className="w-3.5 h-3.5" />
                              {apt.notes || "Horário Bloqueado"}
                            </span>
                          ) : patientName}
                        </p>
                        {apt.type !== "blocked" && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              apt.type === "couple" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                            }`}>
                              {apt.type === "couple" ? "Casal" : "Individual"}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {apt.mode === "video" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {apt.mode === "video" ? "Online" : "Presencial"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        aptStatus === "scheduled" || aptStatus === "confirmed" ? "bg-green-500/10 text-green-600" :
                        aptStatus === "pending" ? "bg-yellow-500/10 text-yellow-600" :
                        aptStatus === "blocked" ? "bg-muted text-muted-foreground" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {statusLabels[aptStatus] || aptStatus}
                      </span>
                      {apt.type !== "blocked" && aptStatus !== "cancelled" && !apt.attended && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => attendMutation.mutate(apt.id)}>
                          <UserCheck className="w-3.5 h-3.5" />Compareceu
                        </Button>
                      )}
                      {apt.attended && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-medium">✓ Presente</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Sidebar Summary */}
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
                <span className="text-sm font-semibold text-foreground">{appointments.length} itens</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agendadas</span>
                <span className="text-sm font-semibold text-green-600">{confirmed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <span className="text-sm font-semibold text-yellow-600">{pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canceladas</span>
                <span className="text-sm font-semibold text-destructive">{cancelled}</span>
              </div>
              {blocked > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bloqueados</span>
                  <span className="text-sm font-semibold text-muted-foreground">{blocked}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
