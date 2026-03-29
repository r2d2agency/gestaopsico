import { useState } from "react";
import { Key, Plus, Trash2, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAiProviders, useAddProvider, useRemoveProvider } from "@/hooks/useAi";

const providers = [
  { value: "gemini", label: "Google Gemini", icon: "🟢" },
  { value: "openai", label: "OpenAI", icon: "🟣" },
  { value: "claude", label: "Anthropic Claude", icon: "🟠" },
];

export default function AdminAiProviders() {
  const { data: keys, isLoading } = useAiProviders();
  const addProvider = useAddProvider();
  const removeProvider = useRemoveProvider();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ provider: "gemini", apiKey: "", isGlobal: true });

  const handleAdd = async () => {
    await addProvider.mutateAsync(form);
    setForm({ provider: "gemini", apiKey: "", isGlobal: true });
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Provedores de IA</h1>
          <p className="text-muted-foreground">Gerencie as API keys dos provedores de IA</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Adicionar Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="sk-..." />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isGlobal} onCheckedChange={v => setForm(f => ({ ...f, isGlobal: v }))} />
                <Label>Key Global (disponível para todos)</Label>
              </div>
              <Button onClick={handleAdd} disabled={!form.apiKey} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {keys?.map(key => {
          const prov = providers.find(p => p.value === key.provider);
          return (
            <Card key={key.id} className="shadow-card">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                    {prov?.icon || "🔑"}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{prov?.label || key.provider}</p>
                    <p className="text-sm font-mono text-muted-foreground">{key.apiKey}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={key.isGlobal ? "default" : "outline"} className="gap-1">
                    {key.isGlobal ? <Globe className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {key.isGlobal ? "Global" : "Pessoal"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeProvider.mutate(key.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!keys?.length && !isLoading && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma API key configurada ainda.</p>
              <p className="text-sm">Adicione keys dos provedores para habilitar a IA no sistema.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
