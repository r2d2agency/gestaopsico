import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Send, Clock, CheckCircle, XCircle, MessageSquare, Loader2
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
import { whatsappApi } from "@/lib/whatsappApi";

const statusConfig: Record<string, { label: string; color: string }> = {
  queued: { label: "Na fila", color: "bg-accent text-accent-foreground" },
  sent: { label: "Enviado", color: "bg-success/10 text-success" },
  failed: { label: "Falha", color: "bg-destructive/10 text-destructive" },
};

const typeLabels: Record<string, string> = {
  reminder: "Lembrete",
  billing: "Cobrança",
  confirmation: "Confirmação",
  general: "Geral",
};

export default function Notifications() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ phone: "", message: "", type: "general" });

  const params: Record<string, string> = {};
  if (filterStatus !== "all") params.status = filterStatus;

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", params],
    queryFn: () => whatsappApi.listNotifications(Object.keys(params).length ? params : undefined),
  });

  const sendMutation = useMutation({
    mutationFn: () => whatsappApi.sendNotification(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Notificação enfileirada!" });
      setDialogOpen(false);
      setForm({ phone: "", message: "", type: "general" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notificações WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Envie lembretes, cobranças e confirmações com intervalo de 4-7 min
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Send className="w-4 h-4" /> Nova Notificação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar Notificação</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Telefone *</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="5511999999999" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Lembrete de Consulta</SelectItem>
                    <SelectItem value="billing">Cobrança</SelectItem>
                    <SelectItem value="confirmation">Confirmação</SelectItem>
                    <SelectItem value="general">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mensagem *</Label>
                <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Olá! Lembramos que sua consulta é amanhã..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !form.phone || !form.message}>
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Enfileirar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="queued">Na fila</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma notificação</p>
          <p className="text-sm mt-1">Envie sua primeira notificação pelo botão acima</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((notif) => {
            const sc = statusConfig[notif.status] || statusConfig.queued;
            return (
              <motion.div key={notif.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{notif.phone}</p>
                      <Badge variant="outline" className="text-[10px]">{typeLabels[notif.type] || notif.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{notif.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2.5 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                  <div className="text-right text-muted-foreground">
                    <p className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(notif.scheduledAt).toLocaleString("pt-BR")}</p>
                    {notif.sentAt && <p className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{new Date(notif.sentAt).toLocaleString("pt-BR")}</p>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
