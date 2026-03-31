import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Eye, Plus, ArrowLeft, Headphones, Monitor, Volume2, Info
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSession, setActiveSession] = useState<TelehealthSession | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [newSessionData, setNewSessionData] = useState<{ patientId: string; meetingLink: string }>({ patientId: "", meetingLink: "" });
  const [isCapturing, setIsCapturing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);
  const [preflight, setPreflight] = useState<{ mic: boolean; audio: boolean; loading: boolean; err: string; checked: boolean }>({ mic: false, audio: false, loading: false, err: "", checked: false });
  const [editSession, setEditSession] = useState<TelehealthSession | null>(null);
  const [editData, setEditData] = useState<{ patientId: string; meetingLink: string }>({ patientId: "", meetingLink: "" });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Preflight device check
  const runPreflight = async () => {
    setPreflight(v => ({ ...v, loading: true, err: "" }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const hasMic = stream.getAudioTracks().length > 0;
      const devs = await navigator.mediaDevices.enumerateDevices();
      stream.getTracks().forEach(t => t.stop());
      const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasAudio = isMobile || devs.some(d => d.kind === "audiooutput");
      setPreflight({ mic: hasMic, audio: hasAudio, loading: false, err: "", checked: true });
    } catch (e: any) {
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setPreflight({ mic: false, audio: isMobile, loading: false, err: e.message || "Permissão do microfone negada", checked: true });
    }
  };

  // Auto-create session from URL params (e.g. from Agenda) — skip dialogs, go straight to consent
  const [autoCreating, setAutoCreating] = useState(false);
  useEffect(() => {
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");
    if (patientId && !autoCreating) {
      setAutoCreating(true);
      setNewSessionData({ patientId, meetingLink: "" });
      setSearchParams({}, { replace: true });
      // Auto-create session directly (consent is shown inline on the session screen)
      telehealthApi.create({
        patientId,
        appointmentId: appointmentId || undefined,
      }).then((session) => {
        setActiveSession(session);
        queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
        toast.success("Sessão criada! Inicie a captura de áudio quando estiver pronto.");
        setAutoCreating(false);
      }).catch((err) => {
        toast.error("Erro ao criar sessão: " + (err?.message || "Erro desconhecido"));
        setAutoCreating(false);
      });
    }
  }, [searchParams]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["telehealth-sessions"],
    queryFn: () => telehealthApi.list()
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => { const r = await pacientesApi.list(); return Array.isArray(r) ? r : (r as any).data || []; }
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
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micStreamRef.current = micStream;

      const supportsDisplayCapture = typeof navigator.mediaDevices?.getDisplayMedia === "function";
      let recordingStream: MediaStream;

      if (supportsDisplayCapture) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        displayStreamRef.current = displayStream;

        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        audioContextRef.current = audioCtx;

        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          const displaySource = audioCtx.createMediaStreamSource(new MediaStream(displayAudioTracks));
          displaySource.connect(dest);
        }

        // Clone mic track so original stays active for the call
        const clonedMicTrack = micStream.getAudioTracks()[0].clone();
        const micSource = audioCtx.createMediaStreamSource(new MediaStream([clonedMicTrack]));
        micSource.connect(dest);

        recordingStream = dest.stream;

        const displayVideoTrack = displayStream.getVideoTracks()[0];
        if (displayVideoTrack) {
          displayVideoTrack.onended = () => stopCapture();
        }
      } else {
        // Mobile: clone the mic track so the original stays active for the call
        const clonedTrack = micStream.getAudioTracks()[0].clone();
        recordingStream = new MediaStream([clonedTrack]);
        displayStreamRef.current = null;
        toast.info("No celular, a captura será feita pelo microfone do aparelho.");
      }

      const preferredMimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;

      const recorder = preferredMimeType
        ? new MediaRecorder(recordingStream, { mimeType: preferredMimeType })
        : new MediaRecorder(recordingStream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

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
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => undefined);
    }
    audioContextRef.current = null;
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => telehealthApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
      toast.success("Sessão excluída!");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { patientId?: string; meetingLink?: string } }) => telehealthApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
      setEditSession(null);
      toast.success("Sessão atualizada!");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => telehealthApi.process(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
      toast.info("Processamento com IA iniciado...");
    },
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
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => { if (!isCapturing) { setActiveSession(null); setShowPreflight(false); } }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Sessão de Teleatendimento</h1>
          <Badge className={stat.color}>{stat.icon}<span className="ml-1">{stat.label}</span></Badge>
        </div>

        {/* Preflight Check */}
        {!isCapturing && activeSession.status === "waiting" && !showPreflight && (
          <Card className="border-primary/20">
            <CardContent className="p-4 md:p-6 space-y-5">
              {/* Patient info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="text-lg md:text-xl font-semibold text-foreground">{activeSession.patient?.name || "—"}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="text-foreground text-sm">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {activeSession.meetingLink && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <a href={activeSession.meetingLink} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm truncate">
                    {activeSession.meetingLink} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {/* Mini Tutorial */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Como funciona</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: <Headphones className="h-5 w-5 text-primary" />, title: "1. Use fones de ouvido", desc: "Para melhor qualidade de áudio e evitar eco." },
                    { icon: <Monitor className="h-5 w-5 text-primary" />, title: "2. Abra o Google Meet/Zoom", desc: "Em outra aba ou janela do navegador." },
                    { icon: <Mic className="h-5 w-5 text-primary" />, title: "3. Permita o microfone", desc: "O sistema pedirá acesso ao microfone e áudio da aba." },
                    { icon: <Shield className="h-5 w-5 text-primary" />, title: "4. Áudio seguro", desc: "Capturado apenas para transcrição e excluído após." },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="shrink-0 mt-0.5">{step.icon}</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Check */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" /> Verificação de Dispositivos</h3>
                {!preflight.checked ? (
                  <Button onClick={runPreflight} disabled={preflight.loading} variant="outline" className="w-full gap-2">
                    {preflight.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    {preflight.loading ? "Verificando..." : "Verificar Microfone e Áudio"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${preflight.mic ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                      {preflight.mic ? <CheckCircle className="h-4 w-4 text-success shrink-0" /> : <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className={`text-sm ${preflight.mic ? "text-success" : "text-destructive"}`}>Microfone {preflight.mic ? "detectado ✓" : "não detectado"}</span>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${preflight.audio ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                      {preflight.audio ? <CheckCircle className="h-4 w-4 text-success shrink-0" /> : <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className={`text-sm ${preflight.audio ? "text-success" : "text-destructive"}`}>Saída de áudio {preflight.audio ? "detectada ✓" : "não detectada"}</span>
                    </div>
                    {preflight.err && <p className="text-sm text-destructive">{preflight.err}</p>}
                    <Button onClick={runPreflight} variant="ghost" size="sm" className="gap-1">
                      <RefreshCw className="h-3 w-3" /> Verificar novamente
                    </Button>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="w-full gap-2"
                disabled={preflight.checked && !preflight.mic}
                onClick={() => { if (!preflight.checked) { runPreflight().then(() => setShowPreflight(true)); } else { setShowPreflight(true); } }}
              >
                <Phone className="h-5 w-5" /> Preparar Captura de Áudio
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Capture Screen */}
        {(showPreflight || isCapturing || activeSession.status !== "waiting") && (
          <Card className="border-primary/20">
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="text-lg md:text-xl font-semibold text-foreground">{activeSession.patient?.name || "—"}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="text-foreground text-sm">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {activeSession.meetingLink && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <a href={activeSession.meetingLink} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm truncate">
                    {activeSession.meetingLink} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {/* Capture controls */}
              <div className="flex flex-col items-center gap-4 md:gap-6 py-4 md:py-8">
                {isCapturing ? (
                  <>
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Mic className="h-8 w-8 md:h-10 md:w-10 text-destructive" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-2xl md:text-3xl font-mono font-bold text-foreground">{formatDuration(duration)}</p>
                      <p className="text-sm text-destructive font-medium mt-1">● Gravando áudio</p>
                    </div>
                    <Button variant="destructive" size="lg" onClick={stopCapture} className="gap-2 w-full sm:w-auto">
                      <PhoneOff className="h-5 w-5" /> Encerrar Sessão
                    </Button>
                  </>
                ) : activeSession.status === "waiting" ? (
                  <>
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mic className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-center max-w-md text-sm px-2">
                      Ao iniciar, o sistema solicitará permissão para capturar o áudio do microfone e da aba compartilhada.
                    </p>
                    <Button size="lg" onClick={startCapture} className="gap-2 w-full sm:w-auto">
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
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                          <span className="text-sm text-destructive">{activeSession.processingError || "Erro desconhecido"}</span>
                        </div>
                        <Button size="sm" variant="outline" className="sm:ml-auto shrink-0" onClick={() => retryMutation.mutate(activeSession.id)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                    <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>O áudio é armazenado temporariamente e excluído automaticamente após a transcrição.</span>
                  </div>
                </div>
              )}

              {/* Transcription result */}
              {activeSession.processingStatus === "completed" && statusData?.transcription && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Transcrição</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 md:max-h-64 overflow-y-auto bg-muted p-3 md:p-4 rounded-lg">{statusData.transcription}</p>
                  {statusData.structuredContent && (() => {
                    try {
                      const sc = JSON.parse(statusData.structuredContent);
                      return (
                        <>
                          <h3 className="font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4" /> Conteúdo Organizado</h3>
                          <div className="space-y-3 bg-muted p-3 md:p-4 rounded-lg">
                            {sc.motivo_sessao && <div><p className="text-xs font-medium text-primary">Motivo da Sessão</p><p className="text-sm text-foreground">{sc.motivo_sessao}</p></div>}
                            {sc.temas_abordados?.length > 0 && <div><p className="text-xs font-medium text-primary">Temas Abordados</p><div className="flex flex-wrap gap-1 mt-1">{sc.temas_abordados.map((t: string, i: number) => <Badge key={i} variant="secondary">{t}</Badge>)}</div></div>}
                            {sc.observacoes_relevantes && <div><p className="text-xs font-medium text-primary">Observações</p><p className="text-sm text-foreground">{sc.observacoes_relevantes}</p></div>}
                            {sc.evolucao && <div><p className="text-xs font-medium text-primary">Evolução</p><p className="text-sm text-foreground">{sc.evolucao}</p></div>}
                            {sc.encaminhamentos && <div><p className="text-xs font-medium text-primary">Próximos Passos</p><p className="text-sm text-foreground">{sc.encaminhamentos}</p></div>}
                            {sc.resumo && <div><p className="text-xs font-medium text-primary">Resumo</p><p className="text-sm text-foreground">{sc.resumo}</p></div>}
                          </div>
                        </>
                      );
                    } catch { return null; }
                  })()}
                  <div className="flex items-center gap-2 text-xs text-success">
                    <Trash2 className="h-3 w-3" /> Áudio excluído automaticamente do sistema
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Sessions list view
  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Teleatendimento</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Sessões com captura segura de áudio e transcrição automática</p>
        </div>
        <Button onClick={handleNewSession} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Nova Sessão</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-8 md:p-12 text-center">
          <Video className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Nenhuma sessão de teleatendimento ainda.</p>
          <Button className="mt-4 w-full sm:w-auto" onClick={handleNewSession}><Plus className="h-4 w-4 mr-2" /> Criar Primeira Sessão</Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {sessions.map((s) => {
              const stat = STATUS_MAP[s.status] || STATUS_MAP.waiting;
              const proc = PROCESSING_MAP[s.processingStatus] || PROCESSING_MAP.none;
              const canEdit = s.status === "waiting";
              const canDelete = s.status === "waiting" || s.status === "completed" || s.processingStatus === "error";
              const canProcess = s.status === "uploaded" && (s.processingStatus === "uploaded" || s.processingStatus === "error");
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => {
                        if (s.status === "waiting" || s.status === "capturing") setActiveSession(s);
                        else setShowDetail(s.id);
                      }}>
                        <p className="font-semibold text-foreground">{s.patient?.name || s.couple?.name || "—"}</p>
                        <Badge className={stat.color}>{stat.icon}<span className="ml-1 text-xs">{stat.label}</span></Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      {s.duration && <p className="text-xs text-muted-foreground">Duração: {formatDuration(s.duration)}</p>}
                      <div className="flex items-center gap-2 text-xs">
                        {proc.icon}<span className="text-muted-foreground">{proc.label}</span>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50 flex-wrap">
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={(e) => {
                            e.stopPropagation();
                            setEditSession(s);
                            setEditData({ patientId: s.patientId || "", meetingLink: s.meetingLink || "" });
                          }}>
                            <FileText className="h-3 w-3" /> Editar
                          </Button>
                        )}
                        {canProcess && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary" onClick={(e) => {
                            e.stopPropagation();
                            processMutation.mutate(s.id);
                          }} disabled={processMutation.isPending}>
                            <Brain className="h-3 w-3" /> Processar IA
                          </Button>
                        )}
                        {s.processingStatus === "error" && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={(e) => {
                            e.stopPropagation();
                            retryMutation.mutate(s.id);
                          }}>
                            <RefreshCw className="h-3 w-3" /> Tentar novamente
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive" onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Deseja realmente excluir esta sessão?")) deleteMutation.mutate(s.id);
                          }} disabled={deleteMutation.isPending}>
                            <Trash2 className="h-3 w-3" /> Excluir
                          </Button>
                        )}
                        {(s.status !== "waiting") && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs ml-auto" onClick={(e) => {
                            e.stopPropagation();
                            setShowDetail(s.id);
                          }}>
                            <Eye className="h-3 w-3" /> Detalhes
                          </Button>
                        )}
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-4">
              {/* Active recording controls */}
              {isCapturing && activeSession?.id === detailSession.id && (
                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-destructive animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Gravação em andamento</p>
                      <p className="text-xs text-muted-foreground">Duração: {formatDuration(duration)}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => { stopCapture(); setShowDetail(null); }} className="gap-2">
                      <PhoneOff className="h-4 w-4" /> Parar Gravação
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:gap-4">
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

      {/* Edit Session Dialog */}
      <Dialog open={!!editSession} onOpenChange={() => setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
            <DialogDescription>Altere os dados da sessão antes de iniciar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Paciente</label>
              <Select value={editData.patientId} onValueChange={v => setEditData(p => ({ ...p, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p: Patient) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Link da Reunião (opcional)</label>
              <Input placeholder="https://meet.google.com/..."
                value={editData.meetingLink}
                onChange={e => setEditData(p => ({ ...p, meetingLink: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (editSession) updateMutation.mutate({ id: editSession.id, data: editData });
            }} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
