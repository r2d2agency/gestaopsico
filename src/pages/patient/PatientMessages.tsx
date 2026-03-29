import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Mic, MicOff, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { patientPortalApi, type PatientPortalMessage } from "@/lib/portalApi";

export default function PatientMessages() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["patient-messages"],
    queryFn: () => patientPortalApi.listMessages(),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { type: "text" | "audio" | "file"; content: string; fileName?: string; mimeType?: string }) =>
      patientPortalApi.sendMessage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-messages"] });
      toast({ title: "Mensagem enviada! ✉️", description: "Seu psicólogo será notificado." });
      setText("");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    },
  });

  const handleSendText = () => {
    if (!text.trim()) return;
    sendMutation.mutate({ type: "text", content: text.trim() });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      sendMutation.mutate({
        type: "file",
        content: result,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      });
    };
    reader.readAsDataURL(file);

    if (fileRef.current) fileRef.current.value = "";
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
          const result = typeof reader.result === "string" ? reader.result : "";
          sendMutation.mutate({
            type: "audio",
            content: result,
            fileName: `audio-${Date.now()}.webm`,
            mimeType: "audio/webm",
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        setRecordingTime(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast({ title: "Permissão negada", description: "Permita acesso ao microfone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const renderMessage = (msg: PatientPortalMessage) => {
    if (msg.type === "text") {
      return <p className="text-sm text-foreground">{msg.content}</p>;
    }

    if (msg.type === "audio") {
      return (
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <audio controls src={msg.content} className="h-8 flex-1" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        {msg.content.startsWith("data:") ? (
          <a href={msg.content} download={msg.fileName || "arquivo"} className="text-sm text-foreground underline underline-offset-2">
            {msg.fileName || "Arquivo enviado"}
          </a>
        ) : (
          <span className="text-sm text-foreground">{msg.fileName || "Arquivo enviado"}</span>
        )}
      </div>
    );
  };

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Mensagens</h1>
        <p className="text-xs text-muted-foreground">Envie mensagens, áudios ou arquivos para seu psicólogo</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="pt-4 pb-3 space-y-3">
            <Textarea
              placeholder="Escreva aqui o que quiser compartilhar..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="w-3.5 h-3.5" />
                  Arquivo
                </Button>
                <Button
                  size="sm"
                  variant={isRecording ? "destructive" : "outline"}
                  className="gap-1 text-xs"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={sendMutation.isPending}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      {formatTime(recordingTime)} · Parar
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      Áudio
                    </>
                  )}
                </Button>
              </div>
              <Button size="sm" className="gap-1" onClick={handleSendText} disabled={!text.trim() || sendMutation.isPending}>
                <Send className="w-3.5 h-3.5" />
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {messages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Enviados</p>
          {messages.map((msg, i) => (
            <motion.div key={msg.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="pt-3 pb-2">
                  {renderMessage(msg)}
                  <p className="text-[9px] text-muted-foreground mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}{" "}
                    {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && messages.length === 0 && (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Send className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Use o campo acima para enviar texto, áudio ou arquivos</p>
        </div>
      )}
    </div>
  );
}
