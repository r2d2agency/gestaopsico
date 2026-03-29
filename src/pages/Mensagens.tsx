import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Send, ArrowLeft, User, Loader2, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";

interface Conversation {
  patientId: string;
  patientName: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: string;
  lastSender: string;
}

interface Message {
  id: string;
  sender: string;
  type: string;
  content: string;
  fileName?: string;
  readAt?: string;
  createdAt: string;
}

export default function Mensagens() {
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["pro-messages"],
    queryFn: () => apiRequest("/messages"),
    refetchInterval: 15000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["pro-messages", selectedPatient?.patientId],
    queryFn: () => apiRequest(`/messages/${selectedPatient!.patientId}`),
    enabled: !!selectedPatient,
    refetchInterval: 10000,
  });

  // Mark as read when opening a conversation
  const markRead = useMutation({
    mutationFn: (patientId: string) => apiRequest(`/messages/${patientId}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pro-messages"] }),
  });

  useEffect(() => {
    if (selectedPatient && selectedPatient.unreadCount > 0) {
      markRead.mutate(selectedPatient.patientId);
    }
  }, [selectedPatient?.patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = useMutation({
    mutationFn: (data: { patientId: string; content: string }) =>
      apiRequest(`/messages/${data.patientId}`, {
        method: "POST",
        body: { type: "text", content: data.content },
      }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["pro-messages", selectedPatient?.patientId] });
      qc.invalidateQueries({ queryKey: ["pro-messages"] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedPatient) return;
    sendReply.mutate({ patientId: selectedPatient.patientId, content: reply.trim() });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} mensage${totalUnread > 1 ? "ns" : "m"} não lida${totalUnread > 1 ? "s" : ""}` : "Conversas com pacientes"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        {/* Conversations list */}
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">Conversas</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Quando pacientes enviarem mensagens pelo portal, elas aparecerão aqui</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.patientId}
                  onClick={() => setSelectedPatient(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    selectedPatient?.patientId === conv.patientId ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {conv.patientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{conv.patientName}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastSender === "professional" ? "Você: " : ""}{conv.lastMessage?.slice(0, 40)}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="h-5 min-w-[20px] text-[10px] px-1.5 shrink-0">{conv.unreadCount}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat area */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {!selectedPatient ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-3 border-b border-border">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedPatient(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedPatient.patientName}</p>
                  <p className="text-[10px] text-muted-foreground">Paciente</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem nesta conversa</p>
                ) : (
                  messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender === "professional" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        msg.sender === "professional"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${
                          msg.sender === "professional" ? "justify-end" : ""
                        }`}>
                          <span className={`text-[10px] ${
                            msg.sender === "professional" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}>
                            {formatTime(msg.createdAt)}
                          </span>
                          {msg.sender === "patient" && (
                            <Circle className={`w-2 h-2 ${msg.readAt ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
                <Input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!reply.trim() || sendReply.isPending}>
                  {sendReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
