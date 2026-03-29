import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, type AiAgent, type AiAgentCustomization } from "@/lib/aiApi";
import { toast } from "@/hooks/use-toast";

export function useAiAgents() {
  return useQuery({ queryKey: ["ai", "agents"], queryFn: () => aiApi.listAgents() });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AiAgent>) => aiApi.createAgent(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai", "agents"] }); toast({ title: "Agente criado!" }); },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AiAgent> }) => aiApi.updateAgent(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai", "agents"] }); toast({ title: "Agente atualizado!" }); },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiApi.deleteAgent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai", "agents"] }); toast({ title: "Agente removido!" }); },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useAiProviders() {
  return useQuery({ queryKey: ["ai", "providers"], queryFn: () => aiApi.listProviders() });
}

export function useAddProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: string; apiKey: string; isGlobal?: boolean }) => aiApi.addProvider(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai", "providers"] }); toast({ title: "Provedor adicionado!" }); },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useRemoveProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiApi.removeProvider(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai", "providers"] }); toast({ title: "Provedor removido!" }); },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useAiChats() {
  return useQuery({ queryKey: ["ai", "chats"], queryFn: () => aiApi.listChats() });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, title }: { agentId: string; title?: string }) => aiApi.createChat(agentId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai", "chats"] }),
  });
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: ["ai", "chat", chatId, "messages"],
    queryFn: () => aiApi.getChatMessages(chatId!),
    enabled: !!chatId,
    refetchInterval: false,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content, model }: { chatId: string; content: string; model?: string }) =>
      aiApi.sendMessage(chatId, content, model),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["ai", "chat", vars.chatId, "messages"] }),
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useAnalyzeText() {
  return useMutation({
    mutationFn: ({ text, type, model, agentId }: { text: string; type?: string; model?: string; agentId?: string }) =>
      aiApi.analyze(text, type, model, agentId),
    onError: (err: Error) => toast({ title: "Erro na análise", description: err.message, variant: "destructive" }),
  });
}

export function useSaveCustomization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: AiAgentCustomization }) =>
      aiApi.saveCustomization(agentId, data),
    onSuccess: () => { toast({ title: "Personalização salva!" }); },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}
