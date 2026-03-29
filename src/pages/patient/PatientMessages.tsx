import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Mic, MicOff, BookOpen, Calendar, Clock,
  FileText, Loader2, Trash2
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { patientPortalApi, type PatientPortalMessage } from "@/lib/portalApi";

export default function PatientMessages() {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["patient-messages"],
    queryFn: () => patientPortalApi.listMessages(),
    refetchInterval: 30000,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: {
      type: "text" | "audio";
      content: string;
      fileName?: string;
      mimeType?: string;
      title?: string;
    }) =>
      patientPortalApi.sendMessage({
        ...payload,
        type: payload.type,
        content: payload.content,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-messages"] });
      toast({ title: "Registro salvo! 📝" });
      resetForm();
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive",
      }),
  });

  const resetForm = () => {
    setNewOpen(false);
    setTitle("");
    setText("");
    setAudioBlob(null);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleSave = () => {
    if (audioBlob) {
      sendMutation.mutate({
        type: "audio",
        content: audioBlob,
        fileName: `diario-${Date.now()}.webm`,
        mimeType: "audio/webm",
        title: title || undefined,
      });
    } else if (text.trim()) {
      sendMutation.mutate({
        type: "text",
        content: text.trim(),
        title: title || undefined,
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          setAudioBlob(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        setRecordingTime(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setAudioBlob(null);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );
    } catch {
      toast({
        title: "Permissão negada",
        description: "Permita acesso ao microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Group diary entries by date, newest first
  const sorted = [...messages]
    .filter((m) => m.sender === "patient" || !m.sender)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const grouped = sorted.reduce(
    (acc, msg) => {
      const dateKey = new Date(msg.createdAt).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(msg);
      return acc;
    },
    {} as Record<string, PatientPortalMessage[]>
  );

  // Professional responses (not from patient)
  const profMessages = messages.filter((m) => m.sender === "professional");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Meu Diário
          </h1>
          <p className="text-xs text-muted-foreground">
            Registre pensamentos, sentimentos e reflexões
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4" />
          Novo registro
        </Button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum registro ainda
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Toque em "Novo registro" para começar seu diário
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, entries]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {dateLabel}
                </span>
              </div>
              <div className="space-y-2">
                {entries.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="border-l-4 border-l-primary/30">
                      <CardContent className="pt-3 pb-3">
                        {(msg as any).title && (
                          <p className="text-sm font-semibold text-foreground mb-1">
                            {(msg as any).title}
                          </p>
                        )}
                        {msg.type === "text" ? (
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                        ) : msg.type === "audio" ? (
                          <div className="flex items-center gap-2">
                            <Mic className="w-4 h-4 text-primary shrink-0" />
                            <audio
                              controls
                              src={msg.content}
                              className="h-8 w-full max-w-[250px]"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="text-sm">
                              {msg.fileName || "Arquivo"}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.createdAt).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                          {msg.readAt && (
                            <Badge
                              variant="outline"
                              className="text-[9px] border-success/30 text-success"
                            >
                              Visualizado
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Professional feedback section */}
        {profMessages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <span className="text-xs font-medium text-primary">
                💬 Comentários do psicólogo
              </span>
            </div>
            <div className="space-y-2">
              {profMessages.map((msg) => (
                <Card
                  key={msg.id}
                  className="border-l-4 border-l-accent bg-accent/5"
                >
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">
                      Psicólogo(a)
                    </p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {new Date(msg.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      às{" "}
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New entry dialog */}
      <Dialog
        open={newOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-display">
              Novo Registro
            </DialogTitle>
            <DialogDescription className="text-xs">
              Escreva ou grave um áudio sobre como você está se sentindo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="text-sm"
              />
            </div>

            {!audioBlob ? (
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Como você está se sentindo hoje? O que está pensando? Escreva livremente..."
                className="min-h-[120px] text-sm resize-none"
                rows={5}
              />
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-primary" />
                  <audio
                    controls
                    src={audioBlob}
                    className="h-8 flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setAudioBlob(null)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}

            {/* Audio recorder */}
            <div className="flex items-center justify-center">
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-destructive font-medium animate-pulse">
                    🔴 Gravando {formatTime(recordingTime)}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={stopRecording}
                    className="gap-1"
                  >
                    <MicOff className="w-4 h-4" /> Parar
                  </Button>
                </div>
              ) : !audioBlob ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startRecording}
                  className="gap-1.5"
                >
                  <Mic className="w-4 h-4" /> Gravar áudio
                </Button>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={
                sendMutation.isPending ||
                (!text.trim() && !audioBlob)
              }
              onClick={handleSave}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <BookOpen className="w-3 h-3" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
