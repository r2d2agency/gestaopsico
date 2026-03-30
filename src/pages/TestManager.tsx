import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ClipboardList, Plus, Send, Trash2, Loader2, FileText, Download, Upload, BookOpen, BarChart3, Eye, CheckCircle2, Clock3, Sparkles, RefreshCw, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { testsApi, type TestTemplate, type TestQuestion, type PresetTest, type TestAssignment } from "@/lib/portalApi";
import { usePatients } from "@/hooks/usePatients";
import { casaisApi, type Casal } from "@/lib/api";

export default function TestManager() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("meus");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedCouple, setSelectedCouple] = useState("");
  const [assignMode, setAssignMode] = useState<"patient" | "couple">("patient");
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [introText, setIntroText] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [questionsPerPage, setQuestionsPerPage] = useState(1);
  const [questions, setQuestions] = useState<Partial<TestQuestion>[]>([{ text: "", type: "scale", options: [] }]);
  const [assessment, setAssessment] = useState("");
  const [conclusion, setConclusion] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["test-templates"],
    queryFn: () => testsApi.listTemplates(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["test-assignments"],
    queryFn: () => testsApi.listAssignments(),
  });

  const { data: presets = [] } = useQuery({
    queryKey: ["test-presets"],
    queryFn: () => testsApi.listPresets(),
  });

  const { data: patients = [] } = usePatients();
  const { data: couples = [] } = useQuery<Casal[]>({
    queryKey: ["couples"],
    queryFn: () => casaisApi.list(),
  });

  const { data: results } = useQuery({
    queryKey: ["test-results", selectedAssignment],
    queryFn: () => testsApi.getResults(selectedAssignment!),
    enabled: !!selectedAssignment,
  });

  const pendingAssignments = useMemo(() => assignments.filter((a) => a.status === "pending"), [assignments]);
  const completedAssignments = useMemo(() => assignments.filter((a) => a.status === "completed"), [assignments]);

  const createMutation = useMutation({
    mutationFn: () => testsApi.createTemplate({ title, description, category, questions: questions as TestQuestion[], introText: introText || undefined, completionMessage: completionMessage || undefined, questionsPerPage } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      toast({ title: "Teste criado!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const importPresetMutation = useMutation({
    mutationFn: (index: number) => testsApi.importPreset(index),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      toast({ title: "Teste importado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const importJsonMutation = useMutation({
    mutationFn: (data: any) => testsApi.importJson(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      toast({ title: "Teste importado do JSON!" });
      setImportOpen(false);
      setJsonInput("");
    },
    onError: (err: Error) => toast({ title: "Erro no JSON", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testsApi.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      toast({ title: "Teste removido" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (assignMode === "couple") return testsApi.assignTest(selectedTemplate, undefined, selectedCouple);
      return testsApi.assignTest(selectedTemplate, selectedPatient);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      qc.invalidateQueries({ queryKey: ["test-assignments"] });
      toast({ title: data?.message || "Teste enviado!" });
      setAssignOpen(false);
      setSelectedPatient("");
      setSelectedCouple("");
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => testsApi.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-assignments"] });
      toast({ title: "Envio removido" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => testsApi.resendAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-assignments"] });
      toast({ title: "Teste reenviado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const saveClinicalNote = useMutation({
    mutationFn: () => testsApi.updateClinicalNote(selectedAssignment!, { professionalAssessment: assessment, professionalConclusion: conclusion }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-results", selectedAssignment] });
      qc.invalidateQueries({ queryKey: ["test-assignments"] });
      toast({ title: "Prontuário do teste atualizado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setIntroText("");
    setCompletionMessage("");
    setQuestionsPerPage(1);
    setQuestions([{ text: "", type: "scale", options: [] }]);
  };

  const addQuestion = () => setQuestions([...questions, { text: "", type: "scale", options: [] }]);

  const updateQuestion = (i: number, field: string, value: unknown) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (i: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== i));
  };

  const handleExport = async (id: string) => {
    try {
      const data = await testsApi.exportTemplate(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teste-${data.title?.replace(/\s+/g, "-").toLowerCase() || id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Teste exportado!" });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handleImportJson = () => {
    try {
      const data = JSON.parse(jsonInput);
      importJsonMutation.mutate(data);
    } catch {
      toast({ title: "JSON inválido", variant: "destructive" });
    }
  };

  const patientList = Array.isArray(patients) ? patients : (patients as any)?.data || [];

  const openResults = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setResultsOpen(true);
  };

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";

  const resultResponses = useMemo(() => {
    if (!results?.responses || !results?.template?.questions) return [];
    return results.template.questions.map((question) => ({
      question,
      response: results.responses.find((item) => item.questionId === question.id),
    }));
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Testes Psicológicos</h1>
          <p className="text-sm text-muted-foreground">Crie, envie, acompanhe resultados e registre tudo no prontuário.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" />Importar JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
            <Send className="w-4 h-4 mr-1" />Enviar Teste
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />Novo Teste
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="meus" className="gap-2"><ClipboardList className="w-4 h-4" />Meus Testes</TabsTrigger>
          <TabsTrigger value="resultados" className="gap-2"><BarChart3 className="w-4 h-4" />Resultados</TabsTrigger>
          <TabsTrigger value="modelos" className="gap-2"><BookOpen className="w-4 h-4" />Modelos Prontos</TabsTrigger>
        </TabsList>

        <TabsContent value="meus" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum teste criado</p>
              <p className="text-sm mt-1">Importe um modelo pronto ou crie do zero</p>
              <div className="flex gap-2 justify-center mt-3">
                <Button variant="outline" onClick={() => setTab("modelos")}><BookOpen className="w-4 h-4 mr-2" />Ver Modelos</Button>
                <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Criar Teste</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{t.title}</CardTitle>
                        <div className="flex gap-1">
                          {t.isPreset && <Badge variant="outline" className="text-[10px]">Modelo</Badge>}
                          <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Ativo" : "Inativo"}</Badge>
                        </div>
                      </div>
                      {t.category && <Badge variant="outline" className="w-fit text-xs mt-1">{t.category}</Badge>}
                    </CardHeader>
                    <CardContent>
                      {t.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{t._count?.questions || 0} perguntas</span>
                        <span className="flex items-center gap-1"><Send className="w-3 h-3" />{t._count?.assignments || 0} envios</span>
                      </div>
                      <div className="flex gap-1.5 mt-3">
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => { setSelectedTemplate(t.id); setAssignOpen(true); }}>
                          <Send className="w-3 h-3" />Enviar
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport(t.id)}>
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => deleteMutation.mutate(t.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resultados" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="w-4 h-4 text-warning" />Pendentes ({pendingAssignments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
              {pendingAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum teste pendente.</p>
                ) : pendingAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{assignment.template?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{assignment.patient?.name || "Paciente"}</span> · enviado em {formatDate(assignment.assignedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => resendMutation.mutate(assignment.id)} disabled={resendMutation.isPending}>
                        <RefreshCw className="w-3 h-3" />Reenviar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => deleteAssignmentMutation.mutate(assignment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="w-4 h-4 text-success" />Respondidos ({completedAssignments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum teste respondido ainda.</p>
                ) : completedAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{assignment.template?.title}</p>
                          {assignment.classification && <Badge variant="outline" className="text-[10px]">{assignment.classification}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{assignment.patient?.name || "Paciente"}</span> · respondido em {formatDate(assignment.completedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openResults(assignment.id)}>
                        <Eye className="w-3 h-3" />Resultado
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/prontuarios?patientId=${assignment.patient?.id}`)}>
                        <ExternalLink className="w-3 h-3" />Prontuário
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modelos" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presets.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-primary/20 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{p.title}</CardTitle>
                      <Badge variant="outline" className="bg-primary/5 text-primary text-[10px]">Validado</Badge>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">{p.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{p.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{p.questions.length} perguntas</span>
                      {p.scoringRules?.ranges && <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{p.scoringRules.ranges.length} faixas</span>}
                    </div>
                    {p.scoringRules?.ranges && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.scoringRules.ranges.map((r: any, ri: number) => (
                          <span key={ri} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r.label}: {r.min}-{r.max}</span>
                        ))}
                      </div>
                    )}
                    <Button size="sm" className="w-full gap-2" onClick={() => importPresetMutation.mutate(i)} disabled={importPresetMutation.isPending}>
                      {importPresetMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Importar para Meus Testes
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Teste Psicológico</DialogTitle>
            <DialogDescription>Defina as perguntas e opções de resposta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do teste" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ansiedade">Ansiedade</SelectItem>
                    <SelectItem value="depressao">Depressão</SelectItem>
                    <SelectItem value="personalidade">Personalidade</SelectItem>
                    <SelectItem value="autoestima">Autoestima</SelectItem>
                    <SelectItem value="estresse">Estresse</SelectItem>
                    <SelectItem value="relacionamento">Relacionamento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição (interna, só para você)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Notas internas sobre o teste..." />
            </div>
            <div>
              <Label>Texto introdutório (exibido ao paciente antes de começar)</Label>
              <Textarea value={introText} onChange={(e) => setIntroText(e.target.value)} rows={2} placeholder="Ex: Este teste avalia como você tem se sentido nas últimas 2 semanas..." />
            </div>
            <div>
              <Label>Mensagem final (exibida após conclusão)</Label>
              <Textarea value={completionMessage} onChange={(e) => setCompletionMessage(e.target.value)} rows={2} placeholder="Ex: Obrigado por responder! Seu psicólogo irá analisar os resultados..." />
            </div>
            <div>
              <Label>Perguntas por página</Label>
              <Select value={String(questionsPerPage)} onValueChange={(v) => setQuestionsPerPage(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 pergunta por página</SelectItem>
                  <SelectItem value="3">3 perguntas por página</SelectItem>
                  <SelectItem value="5">5 perguntas por página</SelectItem>
                  <SelectItem value="100">Todas de uma vez</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Perguntas</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
              </div>
              {questions.map((q, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Pergunta {i + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <Input value={q.text} onChange={(e) => updateQuestion(i, "text", e.target.value)} placeholder="Digite a pergunta..." />
                  <Select value={q.type} onValueChange={(v) => updateQuestion(i, "type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scale">Escala (Likert)</SelectItem>
                      <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                      <SelectItem value="text">Texto Livre</SelectItem>
                    </SelectContent>
                  </Select>
                  {(q.type === "multiple_choice" || q.type === "scale") && (
                    <Input value={(q.options || []).join(", ")} onChange={(e) => updateQuestion(i, "options", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="Opção 1, Opção 2, Opção 3..." />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title || !questions[0]?.text}>{createMutation.isPending ? "Criando..." : "Criar Teste"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Teste</DialogTitle>
            <DialogDescription>Selecione o teste e escolha o paciente ou casal que vai receber.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Teste</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecione o teste" /></SelectTrigger>
                <SelectContent>
                  {templates.filter((t) => t.isActive).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enviar para</Label>
              <Select value={assignMode} onValueChange={(v: "patient" | "couple") => { setAssignMode(v); setSelectedPatient(""); setSelectedCouple(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Paciente Individual</SelectItem>
                  <SelectItem value="couple">Casal (envia para ambos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignMode === "patient" ? (
              <div>
                <Label>Paciente</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {patientList.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Casal</Label>
                <Select value={selectedCouple} onValueChange={setSelectedCouple}>
                  <SelectTrigger><SelectValue placeholder="Selecione o casal" /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(couples) ? couples : []).map((c: Casal) => (
                      <SelectItem key={c.id} value={c.id}><span className="flex items-center gap-1"><Heart className="w-3 h-3 text-primary" />{c.name || `${c.patient1?.name} & ${c.patient2?.name}`}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !selectedTemplate || (assignMode === "patient" ? !selectedPatient : !selectedCouple)}>
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado do Teste</DialogTitle>
            <DialogDescription>As respostas, relatório e notas clínicas ficam registradas no prontuário do paciente.</DialogDescription>
          </DialogHeader>
          {!results ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="grid gap-3 md:grid-cols-3">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Paciente</p><p className="text-sm font-medium text-foreground mt-1">{results.patient?.name || "—"}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pontuação</p><p className="text-sm font-medium text-foreground mt-1">{results.score ?? "—"}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Classificação</p><p className="text-sm font-medium text-foreground mt-1">{results.classification || "—"}</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">{results.template?.title}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {resultResponses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem respostas ainda.</p>
                  ) : resultResponses.map(({ question, response }, index) => (
                    <div key={question.id || index} className="p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-sm font-medium text-foreground">{index + 1}. {question.text}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{response?.answer || "Sem resposta"}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Interpretação assistida</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{results.aiInterpretation || "Quando houver pontuação/classificação, o sistema gera um resumo inicial para apoio clínico."}</p>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Avaliação do profissional</Label>
                  <Textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} rows={5} placeholder="Observações clínicas sobre o teste..." />
                </div>
                <div>
                  <Label>Conclusão do profissional</Label>
                  <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={5} placeholder="Conclusão para consulta interna do profissional..." />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Essas anotações são internas e não aparecem para o paciente.</p>
                <Button onClick={() => saveClinicalNote.mutate()} disabled={saveClinicalNote.isPending || !selectedAssignment}>
                  {saveClinicalNote.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}Salvar no prontuário
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Teste via JSON</DialogTitle>
            <DialogDescription>Cole o JSON do teste exportado para importar o conteúdo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={12} placeholder='{"title": "...", "questions": [...]}' className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">O JSON deve conter: title, questions (array com text, type, options). Campos opcionais: description, category, scoringRules.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportJson} disabled={importJsonMutation.isPending || !jsonInput.trim()}>
              {importJsonMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
