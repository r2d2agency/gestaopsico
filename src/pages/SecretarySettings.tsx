import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Save, Loader2, MessageSquare, Clock, Building2, User, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { whatsappApi, type SecretaryConfig } from "@/lib/whatsappApi";

const DAYS = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];

export default function SecretarySettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<SecretaryConfig>>({
    secretaryName: "Secretária Virtual",
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    workingDays: ["seg", "ter", "qua", "qui", "sex"],
    clinicName: "",
    clinicAddress: "",
    clinicPhone: "",
    professionalInfo: "",
    promptComplement: "",
    isActive: true,
    instanceId: undefined,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["secretary-config"],
    queryFn: () => whatsappApi.getSecretary(),
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["available-instances"],
    queryFn: () => whatsappApi.listAvailableInstances(),
  });

  useEffect(() => {
    if (config) {
      setForm({ ...config });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => whatsappApi.saveSecretary(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secretary-config"] });
      toast({ title: "Configuração salva!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const set = (field: keyof SecretaryConfig, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleDay = (day: string) => {
    const days = form.workingDays || [];
    set("workingDays", days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Secretária de IA</h1>
          <p className="text-sm text-muted-foreground">Personalize sua secretária virtual no WhatsApp</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Ativa</Label>
            <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} />
          </div>
          <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Identidade */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Identidade</CardTitle>
              <CardDescription>Nome e personalidade da secretária</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da Secretária</Label>
                <Input value={form.secretaryName} onChange={e => set("secretaryName", e.target.value)} placeholder="Ana" />
              </div>
              <div>
                <Label>Instância WhatsApp</Label>
                <Select value={form.instanceId || "none"} onValueChange={v => set("instanceId", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {instances.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.instanceName} ({inst.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Horário */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Horário de Trabalho</CardTitle>
              <CardDescription>Quando a secretária responde mensagens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início</Label>
                  <Input type="time" value={form.workingHoursStart} onChange={e => set("workingHoursStart", e.target.value)} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="time" value={form.workingHoursEnd} onChange={e => set("workingHoursEnd", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Dias de Trabalho</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(day => (
                    <label key={day.value} className="flex items-center gap-1.5">
                      <Checkbox
                        checked={(form.workingDays || []).includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informações da Clínica */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Informações da Clínica</CardTitle>
              <CardDescription>Dados que a secretária usa para responder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da Clínica</Label>
                <Input value={form.clinicName || ""} onChange={e => set("clinicName", e.target.value)} placeholder="Clínica Bem Estar" />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.clinicAddress || ""} onChange={e => set("clinicAddress", e.target.value)} placeholder="Rua das Flores, 123" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.clinicPhone || ""} onChange={e => set("clinicPhone", e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info do Profissional */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Informações do Profissional</CardTitle>
              <CardDescription>Dados sobre o psicólogo para contextualizar a IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Sobre o profissional</Label>
                <Textarea
                  value={form.professionalInfo || ""}
                  onChange={e => set("professionalInfo", e.target.value)}
                  rows={3}
                  placeholder="CRP, especialidades, abordagem terapêutica..."
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Prompt Complement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Complemento do Prompt</CardTitle>
              <CardDescription>Instruções adicionais para personalizar o comportamento da IA</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.promptComplement || ""}
                onChange={e => set("promptComplement", e.target.value)}
                rows={5}
                placeholder={"Ex: Sempre perguntar se é a primeira consulta do paciente.\nNunca dar informações sobre valores por WhatsApp.\nSe o paciente estiver em crise, encaminhar imediatamente para o CVV (188)."}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Essas instruções serão adicionadas ao prompt base da secretária de IA
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
