import { useState } from "react";
import {
  Megaphone, Plus, Send, Users, Cake, CheckCircle, Loader2, ArrowLeft, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { whatsappApi } from "@/lib/whatsappApi";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

const campaignTypes = [
  { value: "return", label: "Retorno de pacientes", icon: Users, description: "Pacientes sem consulta há mais de 30 dias" },
  { value: "birthday", label: "Aniversariantes", icon: Cake, description: "Mensagem automática para aniversariantes do mês" },
  { value: "confirmation", label: "Confirmação de consultas", icon: CheckCircle, description: "Confirmar presença na consulta do dia seguinte" },
  { value: "custom", label: "Campanha personalizada", icon: Megaphone, description: "Mensagem customizada para grupo selecionado" },
];

const defaultMessages: Record<string, string> = {
  return: "Olá {nome}! Sentimos sua falta 😊 Que tal agendar uma nova consulta? Entre em contato conosco.",
  birthday: "Feliz aniversário, {nome}! 🎂🎉 Desejamos muita saúde e felicidade. Um abraço da equipe!",
  confirmation: "Olá {nome}! Lembramos que sua consulta está agendada para amanhã. Confirma sua presença? 📋",
  custom: "",
};

type Patient = { id: string; name: string; phone?: string };

export default function Campanhas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: () => apiRequest<Patient[]>("/pacientes"),
    enabled: dialogOpen && step >= 2,
  });

  const patientsWithPhone = patients.filter((p) => p.phone);

  const resetDialog = () => {
    setStep(1);
    setSelectedType(null);
    setMessage("");
    setSelectedPatients([]);
    setDialogOpen(false);
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      setMessage(defaultMessages[selectedType] || "");
      setStep(2);
    } else if (step === 2 && message.trim()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const togglePatient = (id: string) => {
    setSelectedPatients((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedPatients.length === patientsWithPhone.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patientsWithPhone.map((p) => p.id));
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const selected = patientsWithPhone.filter((p) => selectedPatients.includes(p.id));
      const notifications = selected.map((p) => ({
        phone: p.phone!,
        message: message.replace("{nome}", p.name.split(" ")[0]),
        type: selectedType === "billing" ? "billing" : selectedType === "confirmation" ? "reminder" : "general",
      }));
      await whatsappApi.sendBulk(notifications);
      toast({ title: `Campanha enfileirada para ${notifications.length} pacientes!` });
      resetDialog();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">
            Envie mensagens em massa para grupos de pacientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {step === 1 && "Tipo de Campanha"}
                {step === 2 && "Mensagem"}
                {step === 3 && "Selecionar Pacientes"}
              </DialogTitle>
              <DialogDescription>
                {step === 1 && "Escolha o tipo de campanha que deseja criar"}
                {step === 2 && "Personalize a mensagem. Use {nome} para o nome do paciente"}
                {step === 3 && `Selecione os pacientes (${selectedPatients.length} selecionados)`}
              </DialogDescription>
            </DialogHeader>

            {step === 1 && (
              <div className="space-y-3 py-2">
                {campaignTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <type.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 py-2">
                <div>
                  <Label>Mensagem *</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Escreva sua mensagem..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use <code className="bg-muted px-1 rounded">{"{nome}"}</code> para inserir o primeiro nome do paciente
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 py-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedPatients.length === patientsWithPhone.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
                <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                  {patientsWithPhone.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum paciente com telefone cadastrado</p>
                  ) : (
                    patientsWithPhone.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedPatients.includes(p.id) ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPatients.includes(p.id)}
                          onChange={() => togglePatient(p.id)}
                          className="rounded border-border"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.phone}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
              )}
              <Button variant="outline" onClick={resetDialog}>Cancelar</Button>
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={step === 1 ? !selectedType : !message.trim()}
                  className="gap-1"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={sending || selectedPatients.length === 0}
                  className="gap-1"
                >
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Send className="w-4 h-4" /> Enviar ({selectedPatients.length})
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhuma campanha criada</p>
        <p className="text-sm mt-1">Crie campanhas para se comunicar com seus pacientes em massa</p>
      </div>
    </div>
  );
}
