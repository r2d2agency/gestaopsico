import { apiRequest } from "./api";

export interface Goal {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  progress: number;
  targetDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const goalsApi = {
  list: (patientId: string) => apiRequest<Goal[]>(`/goals?patientId=${patientId}`),
  create: (data: Partial<Goal>) => apiRequest<Goal>("/goals", { method: "POST", body: data }),
  update: (id: string, data: Partial<Goal>) => apiRequest<Goal>(`/goals/${id}`, { method: "PUT", body: data }),
  delete: (id: string) => apiRequest(`/goals/${id}`, { method: "DELETE" }),
};
