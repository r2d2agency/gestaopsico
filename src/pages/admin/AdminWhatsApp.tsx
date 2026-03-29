import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Plus, Loader2, Wifi, WifiOff, QrCode,
  Send, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { whatsappApi, type WhatsappNotification } from "@/lib/whatsappApi";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  queued: { label: "Na fila", color: "bg-accent text-accent-foreground", icon: Clock },
  sent: { label: "Enviado", color: "bg-success/10 text-success", icon: CheckCircle },
  failed: { label: "Falha", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function AdminWhatsApp() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: instances = [], isLoading: insLoading } = useQuery({
    queryKey: ["admin", "whatsapp-instances"],
    queryFn: () => whatsappApi.listInstances(),
    retry: false,
  });

  const notifParams: Record<string, string> = {};
  if (filterStatus && filterStatus !== "all") notifParams.status = filterStatus;
  const { data: notifsData, isLoading: notifsLoading } = useQuery({
    queryKey: ["admin", "whatsapp-notifications", notifParams],
    queryFn: () => whatsappApi.listNotifications(Object.keys(notifParams).length ? notifParams : undefined),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => whatsappApi.createInstance(instanceName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "whatsapp-instances"] });
      toast({ title: "Instância criada!" });
      setCreateOpen(false);
      setInstanceName("");
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const processMutation = useMutation({
    mutationFn: () => whatsappApi.processQueue(),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["admin", "whatsapp-notifications"] });
      toast({ title: `${data.processed} notificações processadas` });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Gerencie instâncias, secretárias e notificações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => processMutation.mutate()} disabled={processMutation.isPending}>
            {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Processar Fila
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Nova Instância
          </Button>
        </div>
      </div>

      <Tabs defaultValue="instances">
        <TabsList>
          <TabsTrigger value="instances">Instâncias ({instances.length})</TabsTrigger>
          <TabsTrigger value="notifications">Notificações ({notifsData?.total ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="mt-4">
          {insLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma instância criada</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {instances.map((inst, i) => (
                <motion.div key={inst.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          {inst.instanceName}
                        </CardTitle>
                        <Badge variant={inst.status === "connected" ? "default" : "secondary"} className="gap-1">
                          {inst.status === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {inst.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>ID: {inst.instanceId}</p>
                        {inst.phone && <p>Telefone: {inst.phone}</p>}
                        <p>{inst._count?.secretaryConfigs ?? 0} secretárias vinculadas</p>
                        <p>{inst._count?.notifications ?? 0} notificações</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
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

          {notifsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : !notifsData?.data?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifsData.data.map((notif) => {
                const sc = statusConfig[notif.status] || statusConfig.queued;
                const Icon = sc.icon;
                return (
                  <motion.div key={notif.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{notif.phone}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{notif.type}</Badge>
                      <span className={`px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                      <span className="text-muted-foreground">
                        {new Date(notif.scheduledAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Instance Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Instância WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome da Instância *</Label>
              <Input value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="consultorio-maria" />
            </div>
            <p className="text-xs text-muted-foreground">rejectCalls será desabilitado automaticamente</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !instanceName}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
