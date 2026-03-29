import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAiAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from "@/hooks/useAi";

const categories = [
  { value: "clinical_analysis", label: "Análise Clínica" },
  { value: "session_notes", label: "Notas de Sessão" },
  { value: "treatment_suggestion", label: "Sugestão de Tratamento" },
  { value: "chat_assistant", label: "Chat Assistente" },
  { value: "general", label: "Geral" },
];

const capabilities = [
  "Análise de prontuários",
  "Sugestões de tratamento",
  "Chat assistente",
  "Resumo de sessões",
  "Identificação de padrões",
];

export default function AdminAiAgents() {
  const { data: agents, isLoading } = useAiAgents();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const [isOpen, setIsOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", systemPrompt: "", category: "general",
    defaultModel: "gemini", capabilities: [] as string[],
  });

  const openNew = () => {
    setEditAgent(null);
    setForm({ name: "", description: "", systemPrompt: "", category: "general", defaultModel: "gemini", capabilities: [] });
    setIsOpen(true);
  };

  const openEdit = (agent: any) => {
    setEditAgent(agent);
    setForm({
      name: agent.name, description: agent.description || "", systemPrompt: agent.systemPrompt,
      category: agent.category, defaultModel: agent.defaultModel, capabilities: agent.capabilities || [],
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (editAgent) {
      await updateAgent.mutateAsync({ id: editAgent.id, data: form });
    } else {
      await createAgent.mutateAsync(form);
    }
    setIsOpen(false);
  };

  const toggleCap = (cap: string) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter(c => c !== cap)
        : [...f.capabilities, cap],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agentes de IA</h1>
          <p className="text-muted-foreground">Crie e gerencie agentes que os psicólogos podem usar</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Agente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editAgent ? "Editar Agente" : "Novo Agente de IA"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Analista Clínico" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição breve do agente" />
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea rows={6} value={form.systemPrompt} onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))} placeholder="Instruções base do agente..." />
              </div>
              <div className="space-y-2">
                <Label>Modelo Padrão</Label>
                <Select value={form.defaultModel} onValueChange={v => setForm(f => ({ ...f, defaultModel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI GPT</SelectItem>
                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacidades</Label>
                <div className="flex flex-wrap gap-2">
                  {capabilities.map(cap => (
                    <Badge
                      key={cap}
                      variant={form.capabilities.includes(cap) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleCap(cap)}
                    >
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} disabled={!form.name || !form.systemPrompt} className="w-full">
                {editAgent ? "Salvar Alterações" : "Criar Agente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents?.map((agent) => (
          <motion.div key={agent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{agent.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        {categories.find(c => c.value === agent.category)?.label || agent.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(agent)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateAgent.mutate({ id: agent.id, data: { isActive: !agent.isActive } })}>
                      {agent.isActive ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAgent.mutate(agent.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {agent.capabilities?.slice(0, 3).map(cap => (
                    <Badge key={cap} variant="outline" className="text-[10px]">{cap}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Modelo: {agent.defaultModel}</span>
                  <span>{agent._count?.chats || 0} chats</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
