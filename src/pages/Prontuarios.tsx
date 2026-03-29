import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { prontuariosApi, pacientesApi, consultasApi, type Prontuario } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Plus, Search, Calendar, User, Edit, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function Prontuarios() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filterPatientId, setFilterPatientId] = useState<string>(searchParams.get("patientId") || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Prontuario | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    patientId: "",
    coupleId: "",
    appointmentId: "",
    type: "individual" as "individual" | "couple",
    date: new Date().toISOString().split("T")[0],
    content: "",
    aiContent: "",
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["prontuarios", filterPatientId],
    queryFn: () => prontuariosApi.listAll(filterPatientId ? { patientId: filterPatientId } : undefined),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["pacientes-all"],
    queryFn: async () => {
      const res = await pacientesApi.list();
      return Array.isArray(res) ? res : (res as any).data ?? [];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["consultas-for-prontuario", form.patientId],
    queryFn: () => consultasApi.list({}),
    enabled: isCreateOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => prontuariosApi.create(data as Partial<Prontuario>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuarios"] });
      toast.success("Prontuário criado com sucesso");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao criar prontuário"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      prontuariosApi.update(id, data as Partial<Prontuario>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuarios"] });
      toast.success("Prontuário atualizado");
      setIsEditOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const resetForm = () =>
    setForm({ patientId: "", coupleId: "", appointmentId: "", type: "individual", date: new Date().toISOString().split("T")[0], content: "", aiContent: "" });

  const handleCreate = () => {
    if (!form.patientId && !form.coupleId) {
      toast.error("Selecione um paciente ou casal");
      return;
    }
    if (!form.content.trim()) {
      toast.error("O conteúdo é obrigatório");
      return;
    }
    const data: Record<string, unknown> = {
      type: form.type,
      date: form.date,
      content: form.content,
    };
    if (form.patientId) data.patientId = form.patientId;
    if (form.coupleId) data.coupleId = form.coupleId;
    if (form.appointmentId) data.appointmentId = form.appointmentId;
    if (form.aiContent) data.aiContent = form.aiContent;
    createMutation.mutate(data);
  };

  const filteredRecords = records.filter((r: Prontuario) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.patient?.name?.toLowerCase().includes(term) ||
      r.couple?.name?.toLowerCase().includes(term) ||
      r.content?.toLowerCase().includes(term)
    );
  });

  const patientAppointments = form.patientId
    ? appointments.filter((a) => a.patient_id === form.patientId)
    : appointments;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Prontuários</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registros clínicos dos pacientes — crie com ou sem consulta vinculada
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 shadow-glow" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" /> Novo Prontuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Novo Prontuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "individual" | "couple" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="couple">Casal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Paciente</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Consulta vinculada <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select value={form.appointmentId} onValueChange={(v) => setForm({ ...form, appointmentId: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma — registro avulso" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma — registro avulso</SelectItem>
                    {patientAppointments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR })} às {a.time} — {a.type === "couple" ? "Casal" : "Individual"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Conteúdo do Prontuário</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Anotações da sessão, observações clínicas, encaminhamentos..."
                  rows={8}
                />
              </div>

              <div>
                <Label>Notas de IA <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Textarea
                  value={form.aiContent}
                  onChange={(e) => setForm({ ...form, aiContent: e.target.value })}
                  placeholder="Rascunho gerado por IA, insights, sugestões..."
                  rows={4}
                />
              </div>

              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full gradient-primary border-0">
                {createMutation.isPending ? "Salvando..." : "Criar Prontuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPatientId || "_all"} onValueChange={(v) => setFilterPatientId(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Todos os pacientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os pacientes</SelectItem>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-foreground text-lg">Nenhum prontuário encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Crie um novo prontuário para registrar informações clínicas — com ou sem consulta vinculada.
            </p>
            <Button className="mt-4 gradient-primary border-0" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Criar Prontuário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((record: Prontuario, i: number) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">
                        {record.patient?.name || record.couple?.name || "—"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={record.type === "couple" ? "secondary" : "default"} className="text-xs">
                        {record.type === "couple" ? "Casal" : "Individual"}
                      </Badge>
                      {record.appointment ? (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" /> Vinculado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Avulso
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    {format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {record.appointment && ` • ${record.appointment.time}`}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {record.content || "Sem conteúdo"}
                  </p>
                  {record.ai_content && (
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                      🧠 Contém notas de IA
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => { setSelectedRecord(record); setIsViewOpen(true); }}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setSelectedRecord(record);
                        setForm({
                          patientId: record.patient_id || "",
                          coupleId: record.couple_id || "",
                          appointmentId: record.appointment_id || "",
                          type: record.type,
                          date: record.date?.split("T")[0] || "",
                          content: record.content || "",
                          aiContent: record.ai_content || "",
                        });
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Prontuário — {selectedRecord?.patient?.name || selectedRecord?.couple?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 mt-4">
              <div className="flex gap-2 flex-wrap">
                <Badge>{selectedRecord.type === "couple" ? "Casal" : "Individual"}</Badge>
                <Badge variant="outline">
                  {format(new Date(selectedRecord.date), "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
                {selectedRecord.appointment ? (
                  <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" /> Consulta às {selectedRecord.appointment.time}</Badge>
                ) : (
                  <Badge variant="outline">Registro avulso</Badge>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Conteúdo</Label>
                <div className="bg-muted/50 rounded-lg p-4 mt-1 text-sm whitespace-pre-wrap">{selectedRecord.content}</div>
              </div>
              {selectedRecord.ai_content && (
                <div>
                  <Label className="text-xs text-primary">🧠 Notas de IA</Label>
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mt-1 text-sm whitespace-pre-wrap">{selectedRecord.ai_content}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Prontuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
              />
            </div>
            <div>
              <Label>Notas de IA <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                value={form.aiContent}
                onChange={(e) => setForm({ ...form, aiContent: e.target.value })}
                rows={4}
              />
            </div>
            <Button
              onClick={() => {
                if (!selectedRecord) return;
                updateMutation.mutate({
                  id: selectedRecord.id,
                  data: { content: form.content, aiContent: form.aiContent },
                });
              }}
              disabled={updateMutation.isPending}
              className="w-full gradient-primary border-0"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
