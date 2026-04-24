import { useState } from "react";
2: import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
3: import { tasksApi, type Task } from "@/lib/tasksApi";
4: import { Button } from "@/components/ui/button";
5: import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
6: import { Input } from "@/components/ui/input";
7: import { Textarea } from "@/components/ui/textarea";
8: import { Badge } from "@/components/ui/badge";
9: import { CheckCircle2, Circle, Clock, Plus, Trash2, ListTodo, Loader2 } from "lucide-react";
10: import { format } from "date-fns";
11: import { ptBR } from "date-fns/locale";
12: import { toast } from "sonner";
13: import {
14:   Dialog,
15:   DialogContent,
16:   DialogHeader,
17:   DialogTitle,
18:   DialogFooter,
19:   DialogTrigger,
20: } from "@/components/ui/dialog";
21: 
22: interface HomeworkManagerProps {
23:   patientId: string;
24: }
25: 
26: export default function HomeworkManager({ patientId }: HomeworkManagerProps) {
27:   const queryClient = useQueryClient();
28:   const [isAddOpen, setIsAddOpen] = useState(false);
29:   const [newTask, setNewTask] = useState({ title: "", description: "", dueDate: "" });
30: 
31:   const { data: tasks = [], isLoading } = useQuery({
32:     queryKey: ["tasks", patientId],
33:     queryFn: () => tasksApi.list(patientId),
34:     enabled: !!patientId,
35:   });
36: 
37:   const createTask = useMutation({
38:     mutationFn: (data: Partial<Task>) => tasksApi.create({ ...data, patientId }),
39:     onSuccess: () => {
40:       queryClient.invalidateQueries({ queryKey: ["tasks", patientId] });
41:       setIsAddOpen(false);
42:       setNewTask({ title: "", description: "", dueDate: "" });
43:       toast.success("Tarefa de casa definida!");
44:     },
45:   });
46: 
47:   const deleteTask = useMutation({
48:     mutationFn: (id: string) => tasksApi.delete(id),
49:     onSuccess: () => {
50:       queryClient.invalidateQueries({ queryKey: ["tasks", patientId] });
51:       toast.success("Tarefa excluída");
52:     },
53:   });
54: 
55:   const handleAddTask = () => {
56:     if (!newTask.title) return;
57:     createTask.mutate(newTask);
58:   };
59: 
60:   return (
61:     <Card className="border-border/60">
62:       <CardHeader className="flex flex-row items-center justify-between pb-4">
63:         <div>
64:           <CardTitle className="text-lg font-display flex items-center gap-2">
65:             <ListTodo className="w-5 h-5 text-indigo-500" /> Tarefas de Casa
66:           </CardTitle>
67:           <CardDescription>Atividades para o paciente realizar entre sessões</CardDescription>
68:         </div>
69:         <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
70:           <DialogTrigger asChild>
71:             <Button size="sm" className="gap-1.5 h-8 rounded-lg">
72:               <Plus className="w-3.5 h-3.5" /> Definir Tarefa
73:             </Button>
74:           </DialogTrigger>
75:           <DialogContent className="sm:max-w-[425px]">
76:             <DialogHeader>
77:               <DialogTitle>Nova Tarefa de Casa</DialogTitle>
78:             </DialogHeader>
79:             <div className="grid gap-4 py-4">
80:               <div className="grid gap-2">
81:                 <label htmlFor="title" className="text-sm font-medium">Título</label>
82:                 <Input
83:                   id="title"
84:                   placeholder="Ex: Diário de Pensamentos"
85:                   value={newTask.title}
86:                   onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
87:                 />
88:               </div>
89:               <div className="grid gap-2">
90:                 <label htmlFor="description" className="text-sm font-medium">Instruções</label>
91:                 <Textarea
92:                   id="description"
93:                   placeholder="O que o paciente deve fazer?"
94:                   value={newTask.description}
95:                   onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
96:                 />
97:               </div>
98:               <div className="grid gap-2">
99:                 <label htmlFor="dueDate" className="text-sm font-medium">Prazo (opcional)</label>
100:                 <Input
101:                   id="dueDate"
102:                   type="date"
103:                   value={newTask.dueDate}
104:                   onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
105:                 />
106:               </div>
107:             </div>
108:             <DialogFooter>
109:               <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
110:               <Button onClick={handleAddTask} disabled={createTask.isPending}>
111:                 {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
112:                 Salvar Tarefa
113:               </Button>
114:             </DialogFooter>
115:           </DialogContent>
116:         </Dialog>
117:       </CardHeader>
118:       <CardContent className="space-y-4">
119:         {isLoading ? (
120:           <div className="flex justify-center py-8">
121:             <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
122:           </div>
123:         ) : tasks.length === 0 ? (
124:           <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed border-border">
125:             <p className="text-sm text-muted-foreground">Nenhuma tarefa definida para este paciente.</p>
126:           </div>
127:         ) : (
128:           <div className="grid gap-3">
129:             {tasks.map((task) => (
130:               <div key={task.id} className="p-4 rounded-xl border border-border/40 bg-muted/20 group hover:bg-muted/30 transition-colors">
131:                 <div className="flex items-start justify-between gap-4">
132:                   <div className="flex items-start gap-3">
133:                     {task.status === "completed" ? (
134:                       <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
135:                     ) : (
136:                       <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />
137:                     )}
138:                     <div>
139:                       <h4 className={`text-sm font-semibold ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
140:                         {task.title}
141:                       </h4>
142:                       {task.description && (
143:                         <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
144:                       )}
145:                       <div className="flex items-center gap-3 mt-2">
146:                         {task.dueDate && (
147:                           <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
148:                             <Clock className="w-3 h-3" />
149:                             Prazo: {format(new Date(task.dueDate), "dd/MM/yyyy")}
150:                           </span>
151:                         )}
152:                         {task.completedAt && (
153:                           <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
154:                             Realizado em {format(new Date(task.completedAt), "dd/MM 'às' HH:mm")}
155:                           </Badge>
156:                         )}
157:                       </div>
158:                     </div>
159:                   </div>
160:                   <Button
161:                     variant="ghost"
162:                     size="icon"
163:                     className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
164:                     onClick={() => deleteTask.mutate(task.id)}
165:                   >
166:                     <Trash2 className="w-4 h-4" />
167:                   </Button>
168:                 </div>
169:               </div>
170:             ))}
171:           </div>
172:         )}
173:       </CardContent>
174:     </Card>
175:   );
176: }
