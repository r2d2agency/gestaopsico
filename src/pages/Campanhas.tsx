import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone, Plus, Send, Users, Calendar, Cake, Clock, Loader2, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const campaignTypes = [
  { value: "return", label: "Retorno de pacientes", icon: Users, description: "Pacientes sem consulta há mais de 30 dias" },
  { value: "birthday", label: "Aniversariantes", icon: Cake, description: "Mensagem automática para aniversariantes do mês" },
  { value: "confirmation", label: "Confirmação de consultas", icon: CheckCircle, description: "Confirmar presença na consulta do dia seguinte" },
  { value: "custom", label: "Campanha personalizada", icon: Megaphone, description: "Mensagem customizada para grupo selecionado" },
];

export default function Campanhas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">
            Envie mensagens em massa para grupos de pacientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar Campanha</DialogTitle></DialogHeader>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button disabled={!selectedType}>
                Próximo
              </Button>
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
