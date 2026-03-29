import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Mic, MicOff, FileText, Check, CheckCheck } from "lucide-react";
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["patient-messages"],
    queryFn: () => patientPortalApi.listMessages(),
    refetchInterval: 15000, // poll every 15s for new messages
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (payload: { type: "text" | "audio" | "file"; content: string; fileName?: string; mimeType?: string }) =>
      patientPortalApi.sendMessage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-messages"] });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
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
      sendMutation.mutate({ type: "file", content: result, fileName: file.name, mimeType: file.type || "application/octet-stream" });
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
          sendMutation.mutate({ type: "audio", content: result, fileName: `audio-${Date.now()}.webm`, mimeType: "audio/webm" });
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

  // Sort messages oldest first for chat view
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const renderBubbleContent = (msg: PatientPortalMessage) => {
    if (msg.type === "text") {
      return <p className="text-sm">{msg.content}</p>;
    }
    if (msg.type === "audio") {
      return (
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 shrink-0" />
          <audio controls src={msg.content} className="h-8 max-w-[200px]" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 shrink-0" />
        {msg.content.startsWith("data:") ? (
          <a href={msg.content} download={msg.fileName || "arquivo"} className="text-sm underline underline-offset-2">
            {msg.fileName || "Arquivo"}
          </a>
        ) : (
          <span className="text-sm">{msg.fileName || "Arquivo"}</span>
        )}
      </div>
    );
  };

  const isFromPatient = (msg: PatientPortalMessage) => msg.sender === "patient" || !msg.sender;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-display font-bold text-foreground">Mensagens</h1>
        <p className="text-xs text-muted-foreground">Converse com seu psicólogo</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-2">
        {!isLoading && sorted.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para iniciar a conversa</p>
          </div>
        )}

        {sorted.map((msg, i) => {
          const fromMe = isFromPatient(msg);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i < 20 ? i * 0.02 : 0 }}
              className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  fromMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {!fromMe && (
                  <p className="text-[10px] font-medium mb-0.5 opacity-70">Psicólogo(a)</p>
                )}
                {renderBubbleContent(msg)}
                <div className={`flex items-center gap-1 mt-0.5 ${fromMe ? "justify-end" : ""}`}>
                  <span className="text-[9px] opacity-60">
                    {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {fromMe && (
                    msg.readAt
                      ? <CheckCheck className="w-3 h-3 opacity-60" />
                      : <Check className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" />
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()}>
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className="h-9 w-9 shrink-0"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={sendMutation.isPending}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
          {isRecording ? (
            <div className="flex-1 text-center text-sm text-destructive font-medium">
              🔴 Gravando {formatTime(recordingTime)}
            </div>
          ) : (
            <Textarea
              placeholder="Escreva uma mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[40px] max-h-[100px] resize-none text-sm flex-1"
              rows={1}
            />
          )}
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSendText}
            disabled={!text.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
