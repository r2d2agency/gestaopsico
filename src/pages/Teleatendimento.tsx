import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { telehealthApi, TelehealthSession } from "@/lib/telehealthApi";
import { pacientesApi, Patient, consultasApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Phone, PhoneOff, Clock, Shield, CheckCircle, AlertCircle,
  Upload, FileText, Brain, Trash2, Video, ExternalLink, Loader2, RefreshCw,
  Eye, Plus, ArrowLeft
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  waiting: { label: "Aguardando", color: "bg-muted text-muted-foreground", icon: <Clock className="h-4 w-4" /> },
  capturing: { label: "Capturando", color: "bg-destructive/10 text-destructive", icon: <Mic className="h-4 w-4 animate-pulse" /> },
  uploaded: { label: "Enviado", color: "bg-warning/10 text-warning", icon: <Upload className="h-4 w-4" /> },
  completed: { label: "Concluído", color: "bg-success/10 text-success", icon: <CheckCircle className="h-4 w-4" /> },
};

const PROCESSING_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  none: { label: "Aguardando", icon: <Clock className="h-4 w-4" /> },
  uploaded: { label: "Áudio enviado", icon: <Upload className="h-4 w-4" /> },
  transcribing: { label: "Transcrevendo...", icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  organizing: { label: "Organizando com IA...", icon: <Brain className="h-4 w-4 animate-pulse" /> },
  completed: { label: "Salvo no prontuário", icon: <CheckCircle className="h-4 w-4" /> },
  error: { label: "Erro no processamento", icon: <AlertCircle className="h-4 w-4" /> },
};

export default function Teleatendimento() {
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<TelehealthSession | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [newSessionData, setNewSessionData] = useState<{ patientId: string; meetingLink: string }>({ patientId: "", meetingLink: "" });
  const [isCapturing, setIsCapturing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["telehealth-sessions"],
    queryFn: () => telehealthApi.list()
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => { const r = await pacientesApi.list(); return r.data || []; }
  });

  const { data: detailSession } = useQuery({
    queryKey: ["telehealth-detail", showDetail],
    queryFn: () => telehealthApi.get(showDetail!),
    enabled: !!showDetail
  });

  // Poll processing status for active session
  const { data: statusData } = useQuery({
    queryKey: ["telehealth-status", activeSession?.id],
    queryFn: () => telehealthApi.getStatus(activeSession!.id),
    enabled: !!activeSession && ["uploaded", "capturing"].includes(activeSession.status),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (statusData && activeSession) {
      if (statusData.processingStatus === "completed" || statusData.processingStatus === "error") {
        setActiveSession(prev => prev ? { ...prev, ...statusData } : null);
        queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
        if (statusData.processingStatus === "completed") {
          toast.success("Transcrição concluída e salva no prontuário!");
        }
      }
    }
  }, [statusData]);

  const createMutation = useMutation({
    mutationFn: telehealthApi.create,
    onSuccess: (session) => {
      setActiveSession(session);
      setShowNewDialog(false);
      setShowConsentDialog(false);
      queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
      toast.success("Sessão criada!");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const startCapture = async () => {
    if (!activeSession) return;
    try {
      // Request display media with audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayStreamRef.current = displayStream;

      // Request microphone
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micStreamRef.current = micStream;

      // Combine audio streams
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        const displaySource = audioCtx.createMediaStreamSource(new MediaStream(displayAudioTracks));
        displaySource.connect(dest);
      }

      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(dest);

      // Record combined audio only
      const recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      // Stop when display stream ends
      displayStream.getVideoTracks()[0].onended = () => stopCapture();

      // Start timer
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      setIsCapturing(true);

      // Notify backend
      await telehealthApi.start(activeSession.id);
      toast.success("Captura de áudio iniciada!");
    } catch (err: any) {
      toast.error("Erro ao iniciar captura: " + (err.message || "Permissão negada"));
    }
  };

  const stopCapture = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    displayStreamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCapturing(false);

    // Wait for final data
    await new Promise(r => setTimeout(r, 500));

    if (chunksRef.current.length > 0 && activeSession) {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      toast.info("Enviando áudio para processamento seguro...");
      try {
        await telehealthApi.uploadAudio(activeSession.id, blob);
        setActiveSession(prev => prev ? { ...prev, status: "uploaded", processingStatus: "uploaded" } : null);
        toast.success("Áudio enviado! Transcrição em andamento...");
      } catch (err: any) {
        toast.error("Erro ao enviar áudio: " + err.message);
      }
    }
  }, [activeSession]);

  const retryMutation = useMutation({
    mutationFn: (id: string) => telehealthApi.retry(id),
    onSuccess: () => toast.info("Reprocessamento iniciado..."),
    onError: (e: Error) => toast.error(e.message)
  });

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleNewSession = () => {
    setShowConsentDialog(true);
  };

  const handleConsentAccepted = () => {
    setShowConsentDialog(false);
    setShowNewDialog(true);
  };

  const handleCreateSession = () => {
    if (!newSessionData.patientId) return toast.error("Selecione um paciente");
    createMutation.mutate({ patientId: newSessionData.patientId, meetingLink: newSessionData.meetingLink || undefined });
  };

  // Active session view
  if (activeSession) {
    const proc = PROCESSING_MAP[activeSession.processingStatus] || PROCESSING_MAP.none;
    const stat = STATUS_MAP[activeSession.status] || STATUS_MAP.waiting;

    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { if (!isCapturing) setActiveSession(null); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Sessão de Teleatendimento</h1>
          <Badge className={stat.color}>{stat.icon}<span className="ml-1">{stat.label}</span></Badge>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-6">
            {/* Patient info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paciente</p>
                <p className="text-xl font-semibold text-foreground">{activeSession.patient?.name || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Data/Hora</p>
                <p className="text-foreground">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Meeting link */}
            {activeSession.meetingLink && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <Video className="h-4 w-4 text-primary" />
                <a href={activeSession.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm truncate">
                  {activeSession.meetingLink} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Capture controls */}
            <div className="flex flex-col items-center gap-6 py-8">
              {isCapturing ? (
                <>
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Mic className="h-10 w-10 text-destructive" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-3xl font-mono font-bold text-foreground">{formatDuration(duration)}</p>
                    <p className="text-sm text-destructive font-medium mt-1">● Gravando áudio</p>
                  </div>
                  <Button variant="destructive" size="lg" onClick={stopCapture} className="gap-2">
                    <PhoneOff className="h-5 w-5" /> Encerrar Sessão
                  </Button>
                </>
              ) : activeSession.status === "waiting" ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-center max-w-md text-sm">
                    Ao iniciar, o sistema solicitará permissão para capturar o áudio do microfone e da aba compartilhada.
                    O áudio será processado de forma segura e excluído automaticamente após a transcrição.
                  </p>
                  <Button size="lg" onClick={startCapture} className="gap-2">
                    <Phone className="h-5 w-5" /> Iniciar Captura de Áudio
                  </Button>
                </>
              ) : null}
            </div>

            {/* Processing status */}
            {activeSession.processingStatus !== "none" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Status do Processamento</h3>
                <div className="space-y-2">
                  {["uploaded", "transcribing", "organizing", "completed"].map((step) => {
                    const s = PROCESSING_MAP[step];
                    const currentIdx = ["none", "uploaded", "transcribing", "organizing", "completed"].indexOf(activeSession.processingStatus);
                    const stepIdx = ["none", "uploaded", "transcribing", "organizing", "completed"].indexOf(step);
                    const isDone = stepIdx < currentIdx || (stepIdx === currentIdx && activeSession.processingStatus === "completed");
                    const isCurrent = step === activeSession.processingStatus;

                    return (
                      <div key={step} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrent ? "bg-primary/5 border border-primary/20" : ""}`}>
                        {isDone ? <CheckCircle className="h-4 w-4 text-success" /> : isCurrent ? s.icon : <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                        <span className={`text-sm ${isDone ? "text-success" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                      </div>
                    );
                  })}
                  {activeSession.processingStatus === "error" && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">{activeSession.processingError || "Erro desconhecido"}</span>
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => retryMutation.mutate(activeSession.id)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
                      </Button>
                    </div>
                  )}
                </div>

                {/* Security badge */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>O áudio é armazenado temporariamente e excluído automaticamente após a transcrição. Nenhum acesso humano ao arquivo bruto.</span>
                </div>
              </div>
            )}

            {/* Transcription result */}
            {activeSession.processingStatus === "completed" && statusData?.transcription && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Transcrição</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto bg-muted p-4 rounded-lg">{statusData.transcription}</p>
                {statusData.structuredContent && (
                  <>
                    <h3 className="font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4" /> Conteúdo Organizado</h3>
                    {(() => {
                      try {
                        const sc = JSON.parse(statusData.structuredContent);
                        return (
                          <div className="space-y-3 bg-muted p-4 rounded-lg">
                            {sc.motivo_sessao && <div><p className="text-xs font-medium text-primary">Motivo da Sessão</p><p className="text-sm text-foreground">{sc.motivo_sessao}</p></div>}
                            {sc.temas_abordados?.length > 0 && <div><p className="text-xs font-medium text-primary">Temas Abordados</p><div className="flex flex-wrap gap-1 mt-1">{sc.temas_abordados.map((t: string, i: number) => <Badge key={i} variant="secondary">{t}</Badge>)}</div></div>}
                            {sc.observacoes_relevantes && <div><p className="text-xs font-medium text-primary">Observações</p><p className="text-sm text-foreground">{sc.observacoes_relevantes}</p></div>}
                            {sc.evolucao && <div><p className="text-xs font-medium text-primary">Evolução</p><p className="text-sm text-foreground">{sc.evolucao}</p></div>}
                            {sc.encaminhamentos && <div><p className="text-xs font-medium text-primary">Próximos Passos</p><p className="text-sm text-foreground">{sc.encaminhamentos}</p></div>}
                            {sc.resumo && <div><p className="text-xs font-medium text-primary">Resumo</p><p className="text-sm text-foreground">{sc.resumo}</p></div>}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </>
                )}
                <div className="flex items-center gap-2 text-xs text-success">
                  <Trash2 className="h-3 w-3" /> Áudio excluído automaticamente do sistema
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sessions list view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teleatendimento</h1>
          <p className="text-muted-foreground text-sm">Sessões com captura segura de áudio e transcrição automática</p>
        </div>
        <Button onClick={handleNewSession} className="gap-2"><Plus className="h-4 w-4" /> Nova Sessão</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma sessão de teleatendimento ainda.</p>
          <Button className="mt-4" onClick={handleNewSession}><Plus className="h-4 w-4 mr-2" /> Criar Primeira Sessão</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {sessions.map((s) => {
              const stat = STATUS_MAP[s.status] || STATUS_MAP.waiting;
              const proc = PROCESSING_MAP[s.processingStatus] || PROCESSING_MAP.none;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => {
                    if (s.status === "waiting" || s.status === "capturing") setActiveSession(s);
                    else setShowDetail(s.id);
                  }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground">{s.patient?.name || s.couple?.name || "—"}</p>
                        <Badge className={stat.color}>{stat.icon}<span className="ml-1 text-xs">{stat.label}</span></Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      {s.duration && <p className="text-xs text-muted-foreground">Duração: {formatDuration(s.duration)}</p>}
                      <div className="flex items-center gap-2 text-xs">
                        {proc.icon}<span className="text-muted-foreground">{proc.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Consent Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Aviso de Privacidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Ao iniciar uma sessão de teleatendimento com captura de áudio:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>O áudio da sessão será capturado <strong>apenas para gerar a transcrição</strong> e organizar o prontuário.</li>
              <li>O arquivo de áudio será armazenado <strong>apenas temporariamente</strong> em área privada e segura.</li>
              <li>Após a transcrição, o áudio será <strong>excluído automaticamente</strong> do sistema.</li>
              <li>Apenas o texto organizado permanecerá no prontuário do paciente.</li>
              <li><strong>Nenhum acesso humano</strong> ao arquivo de áudio bruto é permitido.</li>
            </ul>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-primary font-medium">🔒 Toda a comunicação é criptografada e o áudio é processado de forma automatizada e segura.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)}>Cancelar</Button>
            <Button onClick={handleConsentAccepted} className="gap-2"><Shield className="h-4 w-4" /> Aceitar e Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Sessão de Teleatendimento</DialogTitle>
            <DialogDescription>Configure a sessão com captura de áudio segura</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Paciente *</label>
              <Select value={newSessionData.patientId} onValueChange={v => setNewSessionData(p => ({ ...p, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p: Patient) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Link da Reunião (opcional)</label>
              <Input placeholder="https://meet.google.com/... ou zoom.us/..."
                value={newSessionData.meetingLink}
                onChange={e => setNewSessionData(p => ({ ...p, meetingLink: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Google Meet, Zoom ou outro link de videochamada</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateSession} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Criar Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Paciente</p><p className="font-medium text-foreground">{detailSession.patient?.name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p className="text-foreground">{format(new Date(detailSession.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
                <div><p className="text-xs text-muted-foreground">Duração</p><p className="text-foreground">{detailSession.duration ? formatDuration(detailSession.duration) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge className={STATUS_MAP[detailSession.status]?.color}>{STATUS_MAP[detailSession.status]?.label}</Badge></div>
              </div>

              {detailSession.transcription && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Transcrição</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">{detailSession.transcription}</p>
                </div>
              )}

              {detailSession.structuredContent && (() => {
                try {
                  const sc = JSON.parse(detailSession.structuredContent);
                  return (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2"><Brain className="h-4 w-4" /> Conteúdo Organizado</p>
                      <div className="space-y-3 bg-muted p-4 rounded-lg">
                        {sc.motivo_sessao && <div><p className="text-xs font-medium text-primary">Motivo</p><p className="text-sm">{sc.motivo_sessao}</p></div>}
                        {sc.temas_abordados?.length > 0 && <div><p className="text-xs font-medium text-primary">Temas</p><div className="flex flex-wrap gap-1">{sc.temas_abordados.map((t: string, i: number) => <Badge key={i} variant="secondary">{t}</Badge>)}</div></div>}
                        {sc.observacoes_relevantes && <div><p className="text-xs font-medium text-primary">Observações</p><p className="text-sm">{sc.observacoes_relevantes}</p></div>}
                        {sc.evolucao && <div><p className="text-xs font-medium text-primary">Evolução</p><p className="text-sm">{sc.evolucao}</p></div>}
                        {sc.encaminhamentos && <div><p className="text-xs font-medium text-primary">Próximos Passos</p><p className="text-sm">{sc.encaminhamentos}</p></div>}
                        {sc.resumo && <div><p className="text-xs font-medium text-primary">Resumo</p><p className="text-sm">{sc.resumo}</p></div>}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {detailSession.recordId && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="h-4 w-4" /> Vinculado ao prontuário
                </div>
              )}

              {/* Audit logs */}
              {detailSession.auditLogs && detailSession.auditLogs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Log de Auditoria</p>
                  <div className="space-y-1">
                    {detailSession.auditLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                        <span className="font-mono bg-muted px-1 rounded">{log.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                <Trash2 className="h-3 w-3" /> Áudio excluído automaticamente após processamento
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
