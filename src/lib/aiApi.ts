import { apiRequest } from "./api";

export interface AiAgent {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  capabilities: string[];
  category: string;
  defaultModel: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: { chats: number; customizations: number };
}

export interface AiAgentCustomization {
  id?: string;
  additionalPrompt?: string;
  preferredModel?: string;
}

export interface AiProviderKey {
  id: string;
  provider: string;
  apiKey: string;
  isGlobal: boolean;
  organizationId?: string;
  userId?: string;
  createdAt: string;
}

export interface AiChat {
  id: string;
  agentId: string;
  title?: string;
  createdAt: string;
  agent?: { name: string; category: string };
  _count?: { messages: number };
}

export interface AiChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  createdAt: string;
}

export const aiApi = {
  // Agents
  listAgents: () => apiRequest<AiAgent[]>("/ai/agents"),
  createAgent: (data: Partial<AiAgent>) =>
    apiRequest<AiAgent>("/ai/agents", { method: "POST", body: data }),
  updateAgent: (id: string, data: Partial<AiAgent>) =>
    apiRequest<AiAgent>(`/ai/agents/${id}`, { method: "PATCH", body: data }),
  deleteAgent: (id: string) =>
    apiRequest<{ success: boolean }>(`/ai/agents/${id}`, { method: "DELETE" }),

  // Customizations
  getCustomization: (agentId: string) =>
    apiRequest<AiAgentCustomization>(`/ai/agents/${agentId}/customization`),
  saveCustomization: (agentId: string, data: AiAgentCustomization) =>
    apiRequest<AiAgentCustomization>(`/ai/agents/${agentId}/customization`, { method: "PUT", body: data }),

  // Providers
  listProviders: () => apiRequest<AiProviderKey[]>("/ai/providers"),
  addProvider: (data: { provider: string; apiKey: string; isGlobal?: boolean }) =>
    apiRequest<AiProviderKey>("/ai/providers", { method: "POST", body: data }),
  removeProvider: (id: string) =>
    apiRequest<{ success: boolean }>(`/ai/providers/${id}`, { method: "DELETE" }),

  // Chats
  listChats: () => apiRequest<AiChat[]>("/ai/chats"),
  createChat: (agentId: string, title?: string) =>
    apiRequest<AiChat>("/ai/chats", { method: "POST", body: { agentId, title } }),
  getChatMessages: (chatId: string) =>
    apiRequest<AiChatMessage[]>(`/ai/chats/${chatId}/messages`),
  sendMessage: (chatId: string, content: string, model?: string) =>
    apiRequest<AiChatMessage>(`/ai/chats/${chatId}/messages`, { method: "POST", body: { content, model } }),

  // Analyze
  analyze: (text: string, type?: string, model?: string, agentId?: string) =>
    apiRequest<{ analysis: string; model: string }>("/ai/analyze", {
      method: "POST",
      body: { text, type, model, agentId },
    }),
};
