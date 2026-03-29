import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, CreditCard, Check, Edit, Trash2, Users, Brain, MessageSquare,
  ToggleLeft, ToggleRight, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { plansApi, type Plan } from "@/lib/plansApi";

const emptyPlan: Partial<Plan> = {
  name: "", slug: "", description: "", price: 0, priceWithAi: 0,
  maxPatients: 10, maxUsers: 1, maxPsychologists: 1, trialDays: 7,
  hasAiSecretary: false, hasWhatsapp: false, isRecommended: false, isActive: true, features: [],
};

export default function AdminPlans() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({ ...emptyPlan });
  const [featuresText, setFeaturesText] = useState("");

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => plansApi.listAdmin(),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Plan>) =>
      editId ? plansApi.update(editId, data) : plansApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      toast({ title: editId ? "Plano atualizado!" : "Plano criado!" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plansApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      toast({ title: "Plano removido" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => plansApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      toast({ title: "Status atualizado" });
    },
  });

  const openEdit = (plan: Plan) => {
    setEditId(plan.id);
    setForm({ ...plan });
    setFeaturesText((plan.features || []).join("\n"));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({ ...emptyPlan });
    setFeaturesText("");
  };

  const handleSave = () => {
    const features = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
    saveMutation.mutate({ ...form, features });
  };

  const set = (field: keyof Plan, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Planos & Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie os planos, limites e períodos de trial</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { setEditId(null); setForm({ ...emptyPlan }); setFeaturesText(""); }}>
              <Plus className="w-4 h-4" /> Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Plano" : "Criar Plano"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Essencial" />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="essencial" />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Plano ideal para..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => set("price", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Preço com IA (R$)</Label>
                  <Input type="number" step="0.01" value={form.priceWithAi || ""} onChange={e => set("priceWithAi", parseFloat(e.target.value) || null)} />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Limites</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Máx. Pacientes</Label>
                    <Input type="number" value={form.maxPatients} onChange={e => set("maxPatients", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Máx. Usuários</Label>
                    <Input type="number" value={form.maxUsers} onChange={e => set("maxUsers", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Máx. Psicólogos</Label>
                    <Input type="number" value={form.maxPsychologists} onChange={e => set("maxPsychologists", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dias de Trial Grátis</Label>
                  <Input type="number" value={form.trialDays} onChange={e => set("trialDays", parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Módulos</p>
                <div className="flex items-center justify-between">
                  <Label>Secretária de IA</Label>
                  <Switch checked={form.hasAiSecretary} onCheckedChange={v => set("hasAiSecretary", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>WhatsApp (W-API)</Label>
                  <Switch checked={form.hasWhatsapp} onCheckedChange={v => set("hasWhatsapp", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Destacar como Recomendado</Label>
                  <Switch checked={form.isRecommended} onCheckedChange={v => set("isRecommended", v)} />
                </div>
              </div>

              <div>
                <Label>Funcionalidades (uma por linha)</Label>
                <Textarea rows={5} value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder={"Até 30 pacientes\nAgenda e prontuário\nSuporte por e-mail"} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending || !form.name || !form.slug}>
                {saveMutation.isPending ? "Salvando..." : editId ? "Atualizar" : "Criar Plano"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum plano cadastrado</p>
          <p className="text-sm">Crie o primeiro plano clicando no botão acima.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-6 ${
                plan.isRecommended ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"
              } ${!plan.isActive ? "opacity-60" : ""}`}
            >
              {plan.isRecommended && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2"><Star className="w-3 h-3 mr-1" />Recomendado</Badge>
              )}
              {!plan.isActive && (
                <Badge variant="secondary" className="absolute -top-3 right-4">Inativo</Badge>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">slug: {plan.slug}</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-display font-bold text-foreground">R$ {Number(plan.price).toFixed(2)}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
                {plan.priceWithAi && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Com IA: <span className="font-semibold text-primary">R$ {Number(plan.priceWithAi).toFixed(2)}</span>/mês
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">{plan.maxPatients >= 9999 ? "∞" : plan.maxPatients}</p>
                  <p className="text-[10px] text-muted-foreground">Pacientes</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">{plan.maxUsers}</p>
                  <p className="text-[10px] text-muted-foreground">Usuários</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">{plan.maxPsychologists}</p>
                  <p className="text-[10px] text-muted-foreground">Psicólogos</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span>Trial: {plan.trialDays} dias</span>
                {plan.hasAiSecretary && <Badge variant="outline" className="text-[10px]"><Brain className="w-3 h-3 mr-1" />IA</Badge>}
                {plan.hasWhatsapp && <Badge variant="outline" className="text-[10px]"><MessageSquare className="w-3 h-3 mr-1" />WhatsApp</Badge>}
              </div>

              <ul className="space-y-1.5 mb-4">
                {(plan.features || []).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />{f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Users className="w-3 h-3" />
                <span>{plan._count?.organizations ?? 0} organizações vinculadas</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(plan)}>
                  <Edit className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button
                  variant="outline" size="sm" className="gap-1"
                  onClick={() => toggleMutation.mutate({ id: plan.id, isActive: !plan.isActive })}
                >
                  {plan.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  {plan.isActive ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
