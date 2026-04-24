import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, Goal } from "@/lib/goalsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, CheckCircle2, Target, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PatientGoalsProps {
  patientId: string;
  patientName: string;
}

export default function PatientGoals({ patientId, patientName }: PatientGoalsProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<Partial<Goal>>({
    title: "",
    description: "",
    status: "pending",
    progress: 0,
    targetDate: "",
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals", patientId],
    queryFn: () => goalsApi.list(patientId),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Goal>) => goalsApi.create({ ...data, patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", patientId] });
      toast.success("Objetivo criado com sucesso");
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) => goalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", patientId] });
      toast.success("Objetivo atualizado");
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", patientId] });
      toast.success("Objetivo excluído");
    },
  });

  const resetForm = () => {
    setForm({ title: "", description: "", status: "pending", progress: 0, targetDate: "" });
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      description: goal.description,
      status: goal.status,
      progress: goal.progress,
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title) {
      toast.error("O título é obrigatório");
      return;
    }

    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleToggleComplete = (goal: Goal) => {
    const newStatus = goal.status === "completed" ? "in_progress" : "completed";
    const newProgress = newStatus === "completed" ? 100 : goal.progress;
    updateMutation.mutate({
      id: goal.id,
      data: { status: newStatus, progress: newProgress }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Objetivos Terapêuticos
          </h2>
          <p className="text-sm text-muted-foreground">Acompanhe o progresso do tratamento de {patientName}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Novo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Editar Objetivo" : "Novo Objetivo Terapêutico"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Objetivo</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Redução da ansiedade social" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição / Critérios de Sucesso</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o que se espera alcançar..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v, progress: v === 'completed' ? 100 : form.progress })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Progresso ({form.progress}%)</Label>
                  <Input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Alvo (Opcional)</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingGoal ? "Salvar Alterações" : "Criar Objetivo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhum objetivo definido para este paciente.</p>
            <Button variant="link" onClick={() => setIsDialogOpen(true)}>Clique para adicionar o primeiro</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => (
            <Card key={goal.id} className={`overflow-hidden border-l-4 ${goal.status === 'completed' ? 'border-l-success' : goal.status === 'in_progress' ? 'border-l-primary' : 'border-l-muted'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-lg ${goal.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{goal.title}</h3>
                      <Badge variant={goal.status === 'completed' ? 'success' : goal.status === 'in_progress' ? 'default' : 'secondary'}>
                        {goal.status === 'completed' ? 'Concluído' : goal.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                      </Badge>
                    </div>
                    {goal.description && <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>}
                    
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Criado em {format(new Date(goal.createdAt), "dd/MM/yy")}
                      </div>
                      {goal.targetDate && (
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Alvo: {format(new Date(goal.targetDate), "dd/MM/yy")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleToggleComplete(goal)} title={goal.status === 'completed' ? 'Reabrir' : 'Concluir'}>
                      <CheckCircle2 className={`w-5 h-5 ${goal.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(goal)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir objetivo?")) deleteMutation.mutate(goal.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Progresso</span>
                    <span className="text-muted-foreground">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
