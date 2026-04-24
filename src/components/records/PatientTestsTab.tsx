import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ClipboardList, Send, Trash2, FileText, BarChart3, 
  CheckCircle2, Clock3, RefreshCw, User, Plus, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { testsApi } from "@/lib/portalApi";
import { motion } from "framer-motion";

interface PatientTestsTabProps {
  patientId: string;
  patientName: string;
}

export default function PatientTestsTab({ patientId, patientName }: PatientTestsTabProps) {
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["test-templates"],
    queryFn: () => testsApi.listTemplates(),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["test-assignments-patient", patientId],
    queryFn: async () => {
      const all = await testsApi.listAssignments();
      return all.filter(a => a.patientId === patientId || a.patient?.id === patientId);
    },
  });

  const { data: results } = useQuery({
    queryKey: ["test-results", selectedAssignment],
    queryFn: () => testsApi.getResults(selectedAssignment!),
    enabled: !!selectedAssignment,
  });

  const assignMutation = useMutation({
    mutationFn: () => testsApi.assignTest(selectedTemplate, patientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-assignments-patient", patientId] });
      toast({ title: "Teste enviado com sucesso!" });
      setAssignOpen(false);
      setSelectedTemplate("");
    },
    onError: (err: Error) => toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => testsApi.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-assignments-patient", patientId] });
      toast({ title: "Envio removido" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => testsApi.resendAssignment(id),
    onSuccess: () => {
      toast({ title: "Lembrete enviado!" });
    },
  });

  const pending = useMemo(() => assignments.filter(a => a.status === "pending"), [assignments]);
  const completed = useMemo(() => assignments.filter(a => a.status === "completed"), [assignments]);

  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString("pt-BR") : "—";

  const openResults = (id: string) => {
    setSelectedAssignment(id);
    setResultsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Gestão de Testes</h2>
          <p className="text-xs text-muted-foreground">Envie e acompanhe os testes de {patientName}</p>
        </div>
        <Button size="sm" onClick={() => setAssignOpen(true)} className="gradient-primary border-0">
          <Send className="w-4 h-4 mr-2" /> Enviar Novo Teste
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Tests */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-warning" /> Testes Pendentes ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignmentsLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : pending.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum teste pendente.</p>
            ) : (
              pending.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.template?.title}</p>
                    <p className="text-[10px] text-muted-foreground">Enviado em {formatDate(a.assignedAt)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => resendMutation.mutate(a.id)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAssignmentMutation.mutate(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Tests */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Resultados Recebidos ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignmentsLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : completed.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado ainda.</p>
            ) : (
              completed.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{a.template?.title}</p>
                      {a.classification && <Badge variant="outline" className="text-[9px] px-1 h-4">{a.classification}</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Respondido em {formatDate(a.completedAt)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openResults(a.id)}>
                    <Eye className="w-3 h-3" /> Ver
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog for Assigning Test */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Teste para {patientName}</DialogTitle>
            <DialogDescription>Escolha um dos seus modelos de teste para enviar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo de Teste</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.isActive).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={!selectedTemplate || assignMutation.isPending} className="gradient-primary border-0">
              {assignMutation.isPending ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results View - Simplified for now, or could show the actual results */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado do Teste</DialogTitle>
          </DialogHeader>
          {results ? (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{results.template?.title}</h3>
                  <p className="text-sm text-muted-foreground">Respondido por {patientName} em {formatDate(results.completedAt)}</p>
                </div>
                {results.classification && (
                  <Badge className="text-sm py-1 px-3">{results.classification}</Badge>
                )}
              </div>

              <div className="space-y-4">
                {results.responses?.map((r: any, idx: number) => {
                  const q = results.template?.questions?.find((q: any) => q.id === r.questionId);
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20">
                      <p className="text-sm font-semibold mb-2">{idx + 1}. {q?.text || "Questão removida"}</p>
                      <p className="text-sm text-primary font-medium bg-primary/5 p-2 rounded border border-primary/20">
                        {r.answer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
