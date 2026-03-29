import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Key, MessageSquare, Plus, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { settingsApi } from "@/lib/plansApi";

export default function AdminSettings() {
  const qc = useQueryClient();
  const [wapiToken, setWapiToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [callMessage, setCallMessage] = useState("Não estamos disponíveis no momento.");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => settingsApi.getAll(),
    retry: false,
  });

  useEffect(() => {
    if (settings?.wapi_token) {
      setWapiToken(settings.wapi_token);
    }
  }, [settings]);

  const saveToken = useMutation({
    mutationFn: () => settingsApi.set("wapi_token", wapiToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({ title: "Token W-API salvo com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const createInstance = useMutation({
    mutationFn: () => settingsApi.createWapiInstance(instanceName, callMessage),
    onSuccess: (data) => {
      toast({ title: "Instância criada!", description: JSON.stringify(data) });
      setInstanceName("");
    },
    onError: (err: Error) => toast({ title: "Erro ao criar instância", description: err.message, variant: "destructive" }),
  });

  const hasToken = !!settings?.wapi_token;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Configurações do Sistema</h1>
        <p className="text-sm text-muted-foreground">Integrações e configurações globais</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* W-API Token */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> Token W-API
              </CardTitle>
              <CardDescription>
                Configure o token de integrador da W-API para criar instâncias WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasToken && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription>Token configurado</AlertDescription>
                </Alert>
              )}
              <div>
                <Label>Token do Integrador</Label>
                <Input
                  type="password"
                  value={wapiToken}
                  onChange={e => setWapiToken(e.target.value)}
                  placeholder="Cole seu token W-API aqui..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obtenha em{" "}
                  <a href="https://painel.w-api.app/developer/integration" target="_blank" rel="noopener" className="text-primary hover:underline">
                    painel.w-api.app
                  </a>
                </p>
              </div>
              <Button onClick={() => saveToken.mutate()} disabled={saveToken.isPending || !wapiToken}>
                {saveToken.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Token
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Criar Instância */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className={!hasToken ? "opacity-60 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Criar Instância WhatsApp
              </CardTitle>
              <CardDescription>
                Crie uma nova instância W-API para conectar WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasToken && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Configure o token W-API primeiro</AlertDescription>
                </Alert>
              )}
              <div>
                <Label>Nome da Instância *</Label>
                <Input value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="consultorio-maria" />
              </div>
              <div>
                <Label>Mensagem de Chamada</Label>
                <Input value={callMessage} onChange={e => setCallMessage(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">rejectCalls será desabilitado automaticamente</p>
              </div>
              <Button onClick={() => createInstance.mutate()} disabled={createInstance.isPending || !instanceName || !hasToken} className="gap-2">
                {createInstance.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Instância
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
