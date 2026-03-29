import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pacientesApi, consultasApi, casaisApi } from "@/lib/api";
import { recordsApi, type RecordData } from "@/lib/recordsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Plus, Search, Calendar, User, Edit, Eye, Sparkles, Brain,
  AlertTriangle, TrendingUp, Tag, BarChart3, Clock, ChevronRight, ArrowLeft,
  Users, Heart, Filter, CalendarDays, Trash2, RefreshCw, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PatientTimeline from "@/components/records/PatientTimeline";
import ClinicalDashboard from "@/components/records/ClinicalDashboard";

const EMPTY_FORM = {
  patientId: "", coupleId: "", appointmentId: "", type: "individual" as string,
  date: new Date().toISOString().split("T")[0], modality: "in_person" as string,
  content: "", complaint: "", keyPoints: "", clinicalObservations: "",
  interventions: "", evolution: "", nextSteps: "", privateNotes: "", aiContent: "",
};

type TypeFilter = "all" | "individual" | "couple";

export default function Prontuarios() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get("patientId") || "";

  // Two-level: null = patient list, string = selected patient/couple detail
  const [selectedEntity, setSelectedEntity] = useState<{ type: "patient" | "couple"; id: string; name: string } | null>(
    initialPatientId ? { type: "patient", id: initialPatientId, name: "" } : null
  );
  const [detailTab, setDetailTab] = useState("records");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // Data
  const { data: patients = [] } = useQuery({
    queryKey: ["pacientes-all"],
    queryFn: async () => {
      const res = await pacientesApi.list();
      return Array.isArray(res) ? res : (res as any).data ?? [];
    },
  });

  const { data: couples = [] } = useQuery({
    queryKey: ["couples"],
    queryFn: () => casaisApi.list(),
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["prontuarios", selectedEntity?.id],
    queryFn: () => {
      if (!selectedEntity) return recordsApi.listAll();
      if (selectedEntity.type === "patient") return recordsApi.listAll({ patientId: selectedEntity.id });
      return recordsApi.listAll({ coupleId: selectedEntity.id });
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["consultas-for-prontuario", form.patientId],
    queryFn: () => consultasApi.list({}),
    enabled: isCreateOpen,
  });

  // Build card list: patients + couples with record counts
  const entityCards = useMemo(() => {
    const allRecords = records;
    const patientCards = patients.map((p: any) => ({
      type: "patient" as const,
      id: p.id,
      name: p.name,
      recordCount: 0, // will use all records if not filtered
      lastDate: null as string | null,
    }));

    const coupleCards = (couples as any[]).map((c: any) => ({
      type: "couple" as const,
      id: c.id,
      name: c.name || `${c.patient1?.name} & ${c.patient2?.name}`,
      recordCount: 0,
      lastDate: null as string | null,
    }));

    return [...patientCards, ...coupleCards];
  }, [patients, couples]);

  // Filter cards
  const filteredCards = useMemo(() => {
    let cards = entityCards;
    if (typeFilter === "individual") cards = cards.filter(c => c.type === "patient");
    if (typeFilter === "couple") cards = cards.filter(c => c.type === "couple");
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      cards = cards.filter(c => c.name.toLowerCase().includes(term));
    }
    return cards;
  }, [entityCards, typeFilter, searchTerm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<RecordData>) => recordsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuarios"] });
      toast.success("Prontuário criado com sucesso");
      setIsCreateOpen(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: () => toast.error("Erro ao criar prontuário"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecordData> }) => recordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuarios"] });
      toast.success("Prontuário atualizado");
      setIsEditOpen(false);
      setIsViewOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const handleCreate = () => {
    if (!form.patientId && !form.coupleId) { toast.error("Selecione um paciente ou casal"); return; }
    const hasContent = form.content || form.complaint || form.keyPoints;
    if (!hasContent) { toast.error("Preencha pelo menos o motivo ou conteúdo"); return; }
    const data: Partial<RecordData> = {
      type: form.type, date: form.date, modality: form.modality,
      content: form.content || undefined, complaint: form.complaint || undefined,
      keyPoints: form.keyPoints || undefined, clinicalObservations: form.clinicalObservations || undefined,
      interventions: form.interventions || undefined, evolution: form.evolution || undefined,
      nextSteps: form.nextSteps || undefined, privateNotes: form.privateNotes || undefined,
      aiContent: form.aiContent || undefined,
    };
    if (form.patientId) data.patientId = form.patientId;
    if (form.coupleId) data.coupleId = form.coupleId;
    if (form.appointmentId) data.appointmentId = form.appointmentId;
    createMutation.mutate(data);
  };

  const handleOrganizeAi = async (recordId: string) => {
    setAiLoading("organize-" + recordId);
    try {
      const result = await recordsApi.organizeWithAi(recordId);
      queryClient.invalidateQueries({ queryKey: ["prontuarios"] });
      if (result.record) { setSelectedRecord(result.record); loadFormFromRecord(result.record); }
      toast.success("Prontuário organizado com IA!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao organizar com IA");
    } finally { setAiLoading(null); }
  };

  const handleClinicalSupport = async (recordId: string) => {
    setAiLoading("support-" + recordId);
    try {
      const result = await recordsApi.clinicalSupport(recordId);
      queryClient.invalidateQueries({ queryKey: ["prontuarios"] });
      toast.success("Apoio clínico gerado!");
      if (selectedRecord) setSelectedRecord({ ...selectedRecord, aiClinicalSupport: result.clinicalSupport });
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar apoio clínico");
    } finally { setAiLoading(null); }
  };

  const loadFormFromRecord = (r: RecordData) => {
    setForm({
      patientId: r.patientId || "", coupleId: r.coupleId || "", appointmentId: r.appointmentId || "",
      type: r.type as any, date: r.date?.split("T")[0] || "", modality: r.modality || "in_person",
      content: r.content || "", complaint: r.complaint || "", keyPoints: r.keyPoints || "",
      clinicalObservations: r.clinicalObservations || "", interventions: r.interventions || "",
      evolution: r.evolution || "", nextSteps: r.nextSteps || "", privateNotes: r.privateNotes || "",
      aiContent: r.aiContent || "",
    });
  };

  const handleSelectEntity = (type: "patient" | "couple", id: string, name: string) => {
    setSelectedEntity({ type, id, name });
    setDetailTab("records");
  };

  const handleBack = () => {
    setSelectedEntity(null);
    setDetailTab("records");
  };

  const patientAppointments = form.patientId
    ? appointments.filter((a) => a.patient_id === form.patientId)
    : appointments;

  // Update name if we came from URL param and now have patients loaded
  if (selectedEntity && !selectedEntity.name && patients.length > 0) {
    const found = patients.find((p: any) => p.id === selectedEntity.id);
    if (found) setSelectedEntity({ ...selectedEntity, name: found.name });
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedEntity && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {selectedEntity ? selectedEntity.name : "Prontuário Clínico"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedEntity
                ? `${selectedEntity.type === "couple" ? "Casal" : "Paciente"} — prontuários e evolução`
                : "Selecione um paciente ou casal para ver seus prontuários"}
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 shadow-glow" onClick={() => {
              const newForm = { ...EMPTY_FORM };
              if (selectedEntity?.type === "patient") newForm.patientId = selectedEntity.id;
              if (selectedEntity?.type === "couple") { newForm.coupleId = selectedEntity.id; newForm.type = "couple"; }
              setForm(newForm);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Prontuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Novo Prontuário
              </DialogTitle>
            </DialogHeader>
            <RecordForm
              form={form} setForm={setForm}
              patients={patients} appointments={patientAppointments}
              onSubmit={handleCreate} isLoading={createMutation.isPending}
              submitLabel="Criar Prontuário"
            />
          </DialogContent>
        </Dialog>
      </div>

      <AnimatePresence mode="wait">
        {!selectedEntity ? (
          /* =================== PATIENT/COUPLE CARDS VIEW =================== */
          <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar paciente ou casal..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-2">
                {(["all", "individual", "couple"] as TypeFilter[]).map((f) => (
                  <Button key={f} size="sm" variant={typeFilter === f ? "default" : "outline"}
                    onClick={() => setTypeFilter(f)}
                    className={typeFilter === f ? "gradient-primary border-0" : ""}
                  >
                    {f === "all" && <><Filter className="w-3.5 h-3.5 mr-1" /> Todos</>}
                    {f === "individual" && <><User className="w-3.5 h-3.5 mr-1" /> Individual</>}
                    {f === "couple" && <><Heart className="w-3.5 h-3.5 mr-1" /> Casal</>}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dashboard summary row */}
            <div className="mb-6">
              <ClinicalDashboard />
            </div>

            {/* Cards grid */}
            {filteredCards.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground text-lg">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground text-sm mt-1">Ajuste os filtros ou cadastre novos pacientes.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card, i) => (
                  <motion.div key={`${card.type}-${card.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card
                      className="hover:shadow-lg transition-all cursor-pointer group border-border/60 hover:border-primary/40"
                      onClick={() => handleSelectEntity(card.type, card.id, card.name)}
                    >
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl ${card.type === "couple" ? "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400" : "bg-primary/10 text-primary"}`}>
                            {card.type === "couple" ? <Heart className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{card.name}</h3>
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {card.type === "couple" ? "Casal" : "Individual"}
                            </Badge>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* =================== DETAIL VIEW (records, evolution, dashboard) =================== */
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="records" className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Registros
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Evolução
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" /> Dashboard
                </TabsTrigger>
              </TabsList>

              {/* Records tab */}
              <TabsContent value="records" className="space-y-4 mt-4">
                {recordsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
                  </div>
                ) : records.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-display font-semibold text-foreground text-lg">Nenhum prontuário</h3>
                      <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                        Crie o primeiro prontuário para {selectedEntity.name}.
                      </p>
                      <Button className="mt-4 gradient-primary border-0" onClick={() => {
                        const newForm = { ...EMPTY_FORM };
                        if (selectedEntity.type === "patient") newForm.patientId = selectedEntity.id;
                        if (selectedEntity.type === "couple") { newForm.coupleId = selectedEntity.id; newForm.type = "couple"; }
                        setForm(newForm);
                        setIsCreateOpen(true);
                      }}>
                        <Plus className="w-4 h-4 mr-2" /> Criar Prontuário
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {records.map((record: RecordData, i: number) => (
                      <motion.div key={record.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <Card className="hover:shadow-lg transition-shadow group">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" />
                                <CardTitle className="text-base">{record.patient?.name || record.couple?.name || "—"}</CardTitle>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge variant={record.type === "couple" ? "secondary" : "default"} className="text-xs">
                                  {record.type === "couple" ? "Casal" : "Individual"}
                                </Badge>
                                {record.modality && (
                                  <Badge variant="outline" className="text-xs">
                                    {record.modality === "video" || record.modality === "online" ? "Online" : "Presencial"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-2">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              {record.appointment && ` • ${record.appointment.time}`}
                            </p>
                            {record.complaint && (
                              <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">📋 {record.complaint}</p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {record.keyPoints || record.content || "Sem conteúdo"}
                            </p>
                            {record.themes && record.themes.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {record.themes.slice(0, 4).map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px] py-0"><Tag className="w-2.5 h-2.5 mr-0.5" />{t}</Badge>
                                ))}
                              </div>
                            )}
                            {(record.aiContent || record.aiClinicalSupport) && (
                              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Contém análise de IA
                              </p>
                            )}
                            <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelectedRecord(record); setIsViewOpen(true); }}>
                                <Eye className="w-3 h-3 mr-1" /> Ver
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelectedRecord(record); loadFormFromRecord(record); setIsEditOpen(true); }}>
                                <Edit className="w-3 h-3 mr-1" /> Editar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Timeline tab */}
              <TabsContent value="timeline" className="mt-4">
                {selectedEntity.type === "patient" ? (
                  <PatientTimeline patients={patients} selectedPatientId={selectedEntity.id} onSelectPatient={() => {}} />
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-foreground">Evolução disponível para pacientes individuais</h3>
                      <p className="text-muted-foreground text-sm mt-1">Selecione um paciente individual para ver a linha do tempo.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Dashboard tab */}
              <TabsContent value="dashboard" className="mt-4">
                <ClinicalDashboard />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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
                <Badge variant="outline">{format(new Date(selectedRecord.date), "dd/MM/yyyy", { locale: ptBR })}</Badge>
                {selectedRecord.modality && (
                  <Badge variant="outline">{selectedRecord.modality === "video" || selectedRecord.modality === "online" ? "Online" : "Presencial"}</Badge>
                )}
                {selectedRecord.appointment ? (
                  <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" /> {selectedRecord.appointment.time}</Badge>
                ) : (
                  <Badge variant="outline">Registro avulso</Badge>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="text-primary border-primary/30"
                  onClick={() => handleOrganizeAi(selectedRecord.id)} disabled={!!aiLoading}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  {aiLoading === "organize-" + selectedRecord.id ? "Organizando..." : "Organizar com IA"}
                </Button>
                <Button size="sm" variant="outline" className="text-primary border-primary/30"
                  onClick={() => handleClinicalSupport(selectedRecord.id)} disabled={!!aiLoading}>
                  <Brain className="w-4 h-4 mr-1" />
                  {aiLoading === "support-" + selectedRecord.id ? "Gerando..." : "Gerar Apoio Clínico"}
                </Button>
              </div>

              {selectedRecord.complaint && <RecordSection label="Motivo / Demanda" content={selectedRecord.complaint} />}
              {selectedRecord.keyPoints && <RecordSection label="Principais Pontos da Sessão" content={selectedRecord.keyPoints} />}
              {selectedRecord.clinicalObservations && <RecordSection label="Observações Clínicas" content={selectedRecord.clinicalObservations} />}
              {selectedRecord.interventions && <RecordSection label="Intervenções Realizadas" content={selectedRecord.interventions} />}
              {selectedRecord.evolution && <RecordSection label="Evolução" content={selectedRecord.evolution} icon={<TrendingUp className="w-4 h-4" />} />}
              {selectedRecord.nextSteps && <RecordSection label="Próximos Passos" content={selectedRecord.nextSteps} icon={<ChevronRight className="w-4 h-4" />} />}
              {selectedRecord.content && !selectedRecord.complaint && <RecordSection label="Conteúdo" content={selectedRecord.content} />}
              {selectedRecord.content && selectedRecord.complaint && <RecordSection label="Anotações gerais" content={selectedRecord.content} />}

              {selectedRecord.themes && selectedRecord.themes.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Temas</Label>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {selectedRecord.themes.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                </div>
              )}

              {selectedRecord.aiContent && (
                <div>
                  <Label className="text-xs text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Resumo IA</Label>
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mt-1 text-sm whitespace-pre-wrap">{selectedRecord.aiContent}</div>
                </div>
              )}

              {selectedRecord.aiClinicalSupport && (
                <div>
                  <Label className="text-xs text-primary flex items-center gap-1"><Brain className="w-3 h-3" /> Apoio Clínico IA</Label>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-1 text-sm whitespace-pre-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-2">
                      <AlertTriangle className="w-3 h-3" /> Sugestão de apoio — não substitui avaliação profissional
                    </div>
                    {selectedRecord.aiClinicalSupport}
                  </div>
                </div>
              )}

              {selectedRecord.privateNotes && (
                <div>
                  <Label className="text-xs text-destructive">🔒 Observações Privadas</Label>
                  <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-4 mt-1 text-sm whitespace-pre-wrap">{selectedRecord.privateNotes}</div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { loadFormFromRecord(selectedRecord); setIsViewOpen(false); setIsEditOpen(true); }}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Prontuário</DialogTitle>
          </DialogHeader>
          <RecordForm
            form={form} setForm={setForm}
            patients={patients} appointments={patientAppointments}
            onSubmit={() => {
              if (!selectedRecord) return;
              updateMutation.mutate({
                id: selectedRecord.id,
                data: {
                  content: form.content || undefined, complaint: form.complaint || undefined,
                  keyPoints: form.keyPoints || undefined, clinicalObservations: form.clinicalObservations || undefined,
                  interventions: form.interventions || undefined, evolution: form.evolution || undefined,
                  nextSteps: form.nextSteps || undefined, privateNotes: form.privateNotes || undefined,
                  aiContent: form.aiContent || undefined, modality: form.modality,
                },
              });
            }}
            isLoading={updateMutation.isPending}
            submitLabel="Salvar Alterações"
            isEdit
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordSection({ label, content, icon }: { label: string; content: string; icon?: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
      <div className="bg-muted/50 rounded-lg p-3 mt-1 text-sm whitespace-pre-wrap">{content}</div>
    </div>
  );
}

function RecordForm({
  form, setForm, patients, appointments, onSubmit, isLoading, submitLabel, isEdit
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  patients: any[];
  appointments: any[];
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4 mt-4">
      {!isEdit && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
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
            <div>
              <Label>Modalidade</Label>
              <Select value={form.modality} onValueChange={(v) => setForm({ ...form, modality: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">Presencial</SelectItem>
                  <SelectItem value="video">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Paciente</Label>
            <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
              <SelectContent>
                {patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Consulta vinculada <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Select value={form.appointmentId || "_none"} onValueChange={(v) => setForm({ ...form, appointmentId: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhuma — registro avulso</SelectItem>
                {appointments.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR })} às {a.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div>
        <Label className="flex items-center gap-1">📋 Motivo / Demanda <span className="text-muted-foreground text-xs">(queixa principal)</span></Label>
        <Textarea value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })}
          placeholder="Qual a queixa ou demanda principal desta sessão?" rows={2} />
      </div>
      <div>
        <Label>📝 Principais pontos da sessão</Label>
        <Textarea value={form.keyPoints} onChange={(e) => setForm({ ...form, keyPoints: e.target.value })}
          placeholder="Resumo dos temas abordados..." rows={3} />
      </div>
      <div>
        <Label>👁️ Observações clínicas</Label>
        <Textarea value={form.clinicalObservations} onChange={(e) => setForm({ ...form, clinicalObservations: e.target.value })}
          placeholder="Percepções durante o atendimento..." rows={2} />
      </div>
      <div>
        <Label>🛠️ Intervenções realizadas</Label>
        <Textarea value={form.interventions} onChange={(e) => setForm({ ...form, interventions: e.target.value })}
          placeholder="Técnicas, abordagens ou direcionamentos..." rows={2} />
      </div>
      <div>
        <Label className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Evolução</Label>
        <Textarea value={form.evolution} onChange={(e) => setForm({ ...form, evolution: e.target.value })}
          placeholder="Comparação com sessões anteriores..." rows={2} />
      </div>
      <div>
        <Label className="flex items-center gap-1"><ChevronRight className="w-3.5 h-3.5" /> Próximos passos</Label>
        <Textarea value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })}
          placeholder="Encaminhamentos e foco para continuidade..." rows={2} />
      </div>
      <div>
        <Label>🔒 Observações privadas <span className="text-muted-foreground text-xs">(não aparece em relatórios)</span></Label>
        <Textarea value={form.privateNotes} onChange={(e) => setForm({ ...form, privateNotes: e.target.value })}
          placeholder="Anotações exclusivas do profissional..." rows={2} className="border-destructive/20" />
      </div>
      <div>
        <Label>Anotações livres <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="Texto livre, transcrição, observações gerais..." rows={4} />
      </div>

      <Button onClick={onSubmit} disabled={isLoading} className="w-full gradient-primary border-0">
        {isLoading ? "Salvando..." : submitLabel}
      </Button>
    </div>
  );
}
