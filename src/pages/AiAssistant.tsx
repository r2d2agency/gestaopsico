import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, FileText, Sparkles, Settings2, MessageSquare, Plus, Paperclip, X, File, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAiAgents, useAiChats, useCreateChat, useChatMessages, useSendMessage, useAnalyzeText, useSaveCustomization } from "@/hooks/useAi";

interface AttachedFile {
  name: string;
  type: string;
  content: string; // base64 or text
  size: number;
}

async function readFileAsContent(file: File): Promise<AttachedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isText = file.type.startsWith("text/") || 
      [".txt", ".csv", ".json", ".md", ".xml", ".html", ".log"].some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (isText) {
      reader.onload = () => resolve({ name: file.name, type: file.type || "text/plain", content: reader.result as string, size: file.size });
      reader.onerror = reject;
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1] || "";
        resolve({ name: file.name, type: file.type, content: base64, size: file.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1 text-xs">
      {isImage ? <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /> : <File className="w-3.5 h-3.5 text-muted-foreground" />}
      <span className="truncate max-w-[120px]">{file.name}</span>
      <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
      <button onClick={onRemove} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
    </div>
  );
}

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
  const [chatFiles, setChatFiles] = useState<AttachedFile[]>([]);
  const [analyzeFiles, setAnalyzeFiles] = useState<AttachedFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const analyzeFileRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, target: "chat" | "analyze") => {
    const files = e.target.files;
    if (!files) return;
    const maxSize = 5 * 1024 * 1024; // 5MB
    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede 5MB`, variant: "destructive" });
        continue;
      }
      try {
        newFiles.push(await readFileAsContent(file));
      } catch {
        toast({ title: "Erro ao ler arquivo", description: file.name, variant: "destructive" });
      }
    }
    if (target === "chat") setChatFiles(prev => [...prev, ...newFiles].slice(0, 5));
    else setAnalyzeFiles(prev => [...prev, ...newFiles].slice(0, 5));
    e.target.value = "";
  };

  const buildFileContext = (files: AttachedFile[]) => {
    if (!files.length) return "";
    return "\n\n---\nArquivos anexados:\n" + files.map(f => {
      if (f.type.startsWith("text/") || !f.type || f.type === "text/plain") {
        return `📄 ${f.name}:\n\`\`\`\n${f.content}\n\`\`\``;
      }
      if (f.type.startsWith("image/")) {
        return `🖼️ ${f.name} (imagem ${f.type}, ${formatFileSize(f.size)}) [conteúdo base64 da imagem anexada para análise]`;
      }
      return `📎 ${f.name} (${f.type}, ${formatFileSize(f.size)}) [conteúdo binário codificado em base64]`;
    }).join("\n\n");
  };

  const handleSend = async () => {
    if ((!inputMessage.trim() && !chatFiles.length) || !activeChatId) return;
    const msg = inputMessage + buildFileContext(chatFiles);
    setInputMessage("");
    setChatFiles([]);
    await sendMessage.mutateAsync({ chatId: activeChatId, content: msg, model: selectedModel });
  };

  const handleAnalyze = async () => {
    if (!analyzeInput.trim() && !analyzeFiles.length) return;
    const text = analyzeInput + buildFileContext(analyzeFiles);
    const result = await analyzeText.mutateAsync({ text, type: analyzeType, model: selectedModel });
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
                  <div className="border-t border-border p-4 space-y-2">
                    {chatFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {chatFiles.map((f, i) => (
                          <FileChip key={i} file={f} onRemove={() => setChatFiles(prev => prev.filter((_, idx) => idx !== i))} />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={chatFileRef}
                        type="file"
                        multiple
                        accept=".txt,.csv,.json,.md,.xml,.html,.log,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={e => handleFileSelect(e, "chat")}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => chatFileRef.current?.click()}
                        title="Anexar arquivo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        disabled={sendMessage.isPending}
                      />
                      <Button onClick={handleSend} disabled={sendMessage.isPending || (!inputMessage.trim() && !chatFiles.length)}>
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
                  rows={10}
                  value={analyzeInput}
                  onChange={e => setAnalyzeInput(e.target.value)}
                  placeholder="Cole ou digite suas anotações aqui..."
                />

                {/* File upload area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> Anexar Arquivos
                    </Label>
                    <span className="text-xs text-muted-foreground">{analyzeFiles.length}/5 arquivos</span>
                  </div>
                  <input
                    ref={analyzeFileRef}
                    type="file"
                    multiple
                    accept=".txt,.csv,.json,.md,.xml,.html,.log,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={e => handleFileSelect(e, "analyze")}
                  />
                  <div
                    onClick={() => analyzeFileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <Paperclip className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Clique para anexar arquivos (máx. 5MB cada)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">TXT, CSV, JSON, MD, PDF, imagens</p>
                  </div>
                  {analyzeFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {analyzeFiles.map((f, i) => (
                        <FileChip key={i} file={f} onRemove={() => setAnalyzeFiles(prev => prev.filter((_, idx) => idx !== i))} />
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleAnalyze} disabled={analyzeText.isPending || (!analyzeInput.trim() && !analyzeFiles.length)} className="w-full">
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
