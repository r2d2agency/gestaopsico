import { apiRequest } from "./api";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  priceWithAi?: number;
  maxPatients: number;
  maxUsers: number;
  maxPsychologists: number;
  trialDays: number;
  hasAiSecretary: boolean;
  hasWhatsapp: boolean;
  isRecommended: boolean;
  isActive: boolean;
  features: string[];
  createdAt: string;
  _count?: { organizations: number };
}

export const plansApi = {
  listPublic: () => apiRequest<Plan[]>("/plans"),
  listAdmin: () => apiRequest<Plan[]>("/plans/admin"),
  create: (data: Partial<Plan>) => apiRequest<Plan>("/plans", { method: "POST", body: data }),
  update: (id: string, data: Partial<Plan>) => apiRequest<Plan>(`/plans/${id}`, { method: "PUT", body: data }),
  delete: (id: string) => apiRequest(`/plans/${id}`, { method: "DELETE" }),
};

export const settingsApi = {
  getAll: () => apiRequest<Record<string, string>>("/settings"),
  set: (key: string, value: string) => apiRequest(`/settings/${key}`, { method: "PUT", body: { value } }),
  createWapiInstance: (instanceName: string, callMessage?: string) =>
    apiRequest("/settings/wapi/create-instance", { method: "POST", body: { instanceName, callMessage } }),
};
