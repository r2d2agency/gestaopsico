import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, FileText, Sparkles, ChevronDown, Settings2, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAiAgents, useAiChats, useCreateChat, useChatMessages, useSendMessage, useAnalyzeText, useSaveCustomization } from "@/hooks/useAi";

export default function AiAssistant() {
  const { data: agents } = useAiAgents();
  const { data: chats } = useAiChats();
  const createChat = useCreateChat();
  const sendMessage = useSendMessage();
  const analyzeText = useAnalyzeText();
  const saveCustomization = useSaveCustomization();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [inputMessage, setInputMessage] = useState("");
  const [analyzeInput, setAnalyzeInput] = useState("");
  const [analyzeType, setAnalyzeType] = useState("sessao");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customAgentId, setCustomAgentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useChatMessages(activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    if (!selectedAgent) return;
    const agent = agents?.find(a => a.id === selectedAgent);
    const chat = await createChat.mutateAsync({ agentId: selectedAgent, title: `Chat com ${agent?.name || "IA"}` });
    setActiveChatId(chat.id);
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || !activeChatId) return;
    const msg = inputMessage;
    setInputMessage("");
    await sendMessage.mutateAsync({ chatId: activeChatId, content: msg, model: selectedModel });
  };

  const handleAnalyze = async () => {
    if (!analyzeInput.trim()) return;
    const result = await analyzeText.mutateAsync({ text: analyzeInput, type: analyzeType, model: selectedModel });
    setAnalysisResult(result.analysis);
  };

  const handleSaveCustomization = async () => {
    if (!customAgentId) return;
    await saveCustomization.mutateAsync({
      agentId: customAgentId,
      data: { additionalPrompt: customPrompt, preferredModel: customModel || undefined },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Assistente IA
          </h1>
          <p className="text-muted-foreground mt-1">Use agentes de IA para análises e suporte clínico</p>
        </div>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">🟢 Gemini</SelectItem>
            <SelectItem value="openai">🟣 OpenAI</SelectItem>
            <SelectItem value="claude">🟠 Claude</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="w-4 h-4" />Chat</TabsTrigger>
          <TabsTrigger value="analyze" className="gap-1.5"><FileText className="w-4 h-4" />Analisar</TabsTrigger>
          <TabsTrigger value="customize" className="gap-1.5"><Settings2 className="w-4 h-4" />Personalizar</TabsTrigger>
        </TabsList>

        {/* ===== CHAT TAB ===== */}
        <TabsContent value="chat">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
            {/* Sidebar */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversas</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                <div className="flex gap-2">
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Agente..." /></SelectTrigger>
                    <SelectContent>
                      {agents?.filter(a => a.isActive).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleNewChat} disabled={!selectedAgent}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ScrollArea className="h-[480px]">
                  <div className="space-y-1">
                    {chats?.map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeChatId === chat.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <p className="font-medium truncate text-xs">{chat.title || "Sem título"}</p>
                        <p className="text-[10px] text-muted-foreground">{chat.agent?.name} • {chat._count?.messages || 0} msgs</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-3 shadow-card flex flex-col">
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-4 py-4">
                  {!activeChatId ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Bot className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Selecione um agente e inicie uma conversa</p>
                        <p className="text-sm">Os agentes foram configurados pelo administrador</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {messages?.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              {msg.model && <p className="text-[10px] mt-1 opacity-60">{msg.model}</p>}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                {activeChatId && (
                  <div className="border-t border-border p-4">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        disabled={sendMessage.isPending}
                      />
                      <Button onClick={handleSend} disabled={sendMessage.isPending || !inputMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== ANALYZE TAB ===== */}
        <TabsContent value="analyze">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Enviar Anotação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={analyzeType} onValueChange={setAnalyzeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessao">Notas de Sessão</SelectItem>
                    <SelectItem value="prontuario">Prontuário</SelectItem>
                    <SelectItem value="geral">Texto Geral</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  rows={12}
                  value={analyzeInput}
                  onChange={e => setAnalyzeInput(e.target.value)}
                  placeholder="Cole ou digite suas anotações aqui..."
                />
                <Button onClick={handleAnalyze} disabled={analyzeText.isPending || !analyzeInput.trim()} className="w-full">
                  {analyzeText.isPending ? "Analisando..." : "Analisar com IA"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Resultado da Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisResult ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                      {analysisResult}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>O resultado da análise aparecerá aqui</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== CUSTOMIZE TAB ===== */}
        <TabsContent value="customize">
          <Card className="shadow-card max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Personalizar Agente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Agente</Label>
                <Select value={customAgentId || ""} onValueChange={v => setCustomAgentId(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha um agente..." /></SelectTrigger>
                  <SelectContent>
                    {agents?.filter(a => a.isActive).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prompt Adicional</Label>
                <Textarea
                  rows={6}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Adicione instruções personalizadas para este agente. Estas instruções serão combinadas com o prompt base criado pelo administrador."
                />
                <p className="text-xs text-muted-foreground">
                  Suas instruções serão adicionadas ao final do prompt base do agente.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Modelo Preferido</Label>
                <Select value={customModel} onValueChange={setCustomModel}>
                  <SelectTrigger><SelectValue placeholder="Usar padrão do agente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">🟢 Gemini</SelectItem>
                    <SelectItem value="openai">🟣 OpenAI</SelectItem>
                    <SelectItem value="claude">🟠 Claude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveCustomization} disabled={!customAgentId} className="w-full">
                Salvar Personalização
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
