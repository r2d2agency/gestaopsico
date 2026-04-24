import { apiRequest } from "./api";

export interface Task {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  status: "pending" | "completed";
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const tasksApi = {
  list: (patientId: string) => apiRequest<Task[]>(`/tasks?patientId=${patientId}`),
  create: (data: Partial<Task>) => apiRequest<Task>("/tasks", { method: "POST", body: data }),
  update: (id: string, data: Partial<Task>) => apiRequest<Task>(`/tasks/${id}`, { method: "PUT", body: data }),
  delete: (id: string) => apiRequest(`/tasks/${id}`, { method: "DELETE" }),
  checkIn: (id: string) => apiRequest<Task>(`/tasks/${id}/check-in`, { method: "POST" }),
};
