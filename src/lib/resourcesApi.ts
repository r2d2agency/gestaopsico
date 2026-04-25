import { apiRequest } from "./api";

export interface TherapeuticResource {
  id: string;
  professionalId?: string;
  title: string;
  description?: string;
  category: string;
  type: string;
  fileUrl?: string;
  externalUrl?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export const resourcesApi = {
  list: () => apiRequest<TherapeuticResource[]>("/recursos"),
  create: (data: Partial<TherapeuticResource>) => 
    apiRequest<TherapeuticResource>("/recursos", { method: "POST", body: data }),
  delete: (id: string) => 
    apiRequest(`/recursos/${id}`, { method: "DELETE" }),
};
