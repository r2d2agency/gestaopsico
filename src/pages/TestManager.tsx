import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList, Plus, Send, Eye, Edit, Trash2, CheckCircle,
  Clock, ChevronRight, Loader2, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { testsApi, type TestTemplate, type TestQuestion } from "@/lib/portalApi";
import { usePatients } from "@/hooks/usePatients";

export default function TestManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [questions, setQuestions] = useState<Partial<TestQuestion>[]>([
    { text: "", type: "scale", options: [] }
  ]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["test-templates"],
    queryFn: () => testsApi.listTemplates(),
  });

  const { data: patients = [] } = usePatients();

  const createMutation = useMutation({
    mutationFn: () => testsApi.createTemplate({ title, description, category, questions: questions as TestQuestion[] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      toast({ title: "Teste criado!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: () => testsApi.assignTest(selectedTemplate, selectedPatient),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-templates"] });
      toast({ title: "Teste enviado ao paciente!" });
      setAssignOpen(false);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("");
    setQuestions([{ text: "", type: "scale", options: [] }]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", type: "scale", options: [] }]);
  };

  const updateQuestion = (i: number, field: string, value: unknown) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (i: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Testes Psicológicos</h1>
          <p className="text-sm text-muted-foreground">Crie testes e envie para seus pacientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setAssignOpen(true)}>
            <Send className="w-4 h-4" />Enviar Teste
          </Button>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />Novo Teste
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum teste criado</p>
          <p className="text-sm mt-1">Crie seu primeiro teste psicológico</p>
          <Button className="mt-3" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Criar Teste</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {t.category && <Badge variant="outline" className="w-fit text-xs">{t.category}</Badge>}
                </CardHeader>
                <CardContent>
                  {t.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />{t._count?.questions || 0} perguntas
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" />{t._count?.assignments || 0} envios
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => {
                      setSelectedTemplate(t.id);
                      setAssignOpen(true);
                    }}>
                      <Send className="w-3.5 h-3.5" />Enviar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Test Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Teste Psicológico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Inventário de Ansiedade" />
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
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Instruções para o paciente..." />
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
                      <button onClick={() => removeQuestion(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input value={q.text} onChange={e => updateQuestion(i, "text", e.target.value)} placeholder="Digite a pergunta..." />
                  <Select value={q.type} onValueChange={v => updateQuestion(i, "type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scale">Escala (1-5)</SelectItem>
                      <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                      <SelectItem value="text">Texto Livre</SelectItem>
                    </SelectContent>
                  </Select>
                  {q.type === "multiple_choice" && (
                    <Input
                      value={(q.options || []).join(", ")}
                      onChange={e => updateQuestion(i, "options", e.target.value.split(",").map(s => s.trim()))}
                      placeholder="Opção 1, Opção 2, Opção 3..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title || !questions[0]?.text}>
              {createMutation.isPending ? "Criando..." : "Criar Teste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Test Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Teste para Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Teste</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecione o teste" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.isActive).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !selectedTemplate || !selectedPatient}>
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
