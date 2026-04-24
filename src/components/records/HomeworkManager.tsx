import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type Task } from "@/lib/tasksApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Plus, Trash2, ListTodo, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HomeworkManagerProps {
  patientId: string;
}

export default function HomeworkManager({ patientId }: HomeworkManagerProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", dueDate: "" });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", patientId],
    queryFn: () => tasksApi.list(patientId),
    enabled: !!patientId,
  });

  const createTask = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create({ ...data, patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", patientId] });
      setIsAddOpen(false);
      setNewTask({ title: "", description: "", dueDate: "" });
      toast.success("Tarefa de casa definida!");
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", patientId] });
      toast.success("Tarefa excluída");
    },
  });

  const handleAddTask = () => {
    if (!newTask.title) return;
    createTask.mutate(newTask);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-500" /> Tarefas de Casa
          </CardTitle>
          <CardDescription>Atividades para o paciente realizar entre sessões</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 h-8 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Definir Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nova Tarefa de Casa</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium">Título</label>
                <Input
                  id="title"
                  placeholder="Ex: Diário de Pensamentos"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">Instruções</label>
                <Textarea
                  id="description"
                  placeholder="O que o paciente deve fazer?"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="dueDate" className="text-sm font-medium">Prazo (opcional)</label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddTask} disabled={createTask.isPending}>
                {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Nenhuma tarefa definida para este paciente.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 rounded-xl border border-border/40 bg-muted/20 group hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <h4 className={`text-sm font-semibold ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {task.dueDate && (
                          <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Prazo: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                          </span>
                        )}
                        {task.completedAt && (
                          <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Realizado em {format(new Date(task.completedAt), "dd/MM 'às' HH:mm")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteTask.mutate(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
