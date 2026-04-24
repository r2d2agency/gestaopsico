import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type Task } from "@/lib/tasksApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, ListTodo, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PatientTasks() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["patient-tasks"],
    queryFn: () => tasksApi.list("me"), // backend should handle 'me' to get current patient's tasks
  });

  const checkInTask = useMutation({
    mutationFn: (id: string) => tasksApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-tasks"] });
      toast.success("Parabéns por concluir a tarefa! 🌟");
    },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto px-4 pb-4">
      <div className="pt-4 pb-6">
        <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary" /> Minhas Tarefas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atividades sugeridas pelo seu psicólogo para entre as sessões.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ListTodo className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">Você não tem tarefas pendentes no momento.</p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`border-l-4 ${task.status === "completed" ? "border-l-emerald-500 bg-emerald-500/5" : "border-l-primary"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm font-bold ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {task.title}
                        </h3>
                        {task.status === "completed" && (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Concluído
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className={`text-xs ${task.status === "completed" ? "text-muted-foreground" : "text-muted-foreground/80"} leading-relaxed`}>
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3">
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Até {format(new Date(task.dueDate), "dd 'de' MMMM", { locale: ptBR })}</span>
                          </div>
                        )}
                        {task.completedAt && (
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Feito em {format(new Date(task.completedAt), "dd/MM")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {task.status !== "completed" && (
                      <Button
                        size="sm"
                        className="rounded-full h-8 px-4 gap-1.5 shadow-sm"
                        onClick={() => checkInTask.mutate(task.id)}
                        disabled={checkInTask.isPending}
                      >
                        {checkInTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Check-in
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
