import { apiRequest } from "./api";

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: "clinic" | "individual";
  plan: string;
  status: "active" | "inactive" | "suspended";
  maxUsers: number;
  phone?: string;
  email?: string;
  cnpj?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
  subscriptions?: Subscription[];
}

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string;
  value: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  organizationId?: string;
  organization?: { name: string; slug: string };
  createdAt: string;
  _count?: { patients: number; appointments: number };
}

export interface AdminMetrics {
  organizations: { total: number; active: number; suspended: number };
  users: { total: number; active: number };
  patients: number;
  appointments: { total: number; monthly: number };
  revenue: { total: number };
  planBreakdown: { plan: string; count: number }[];
}

// API calls
export const adminApi = {
  // Organizações
  listOrganizations: (params?: Record<string, string>) =>
    apiRequest<{ data: Organization[]; total: number }>(
      `/admin/organizations${params ? `?${new URLSearchParams(params)}` : ""}`
    ),
  createOrganization: (data: Partial<Organization>) =>
    apiRequest<Organization>("/admin/organizations", { method: "POST", body: data }),
  updateOrganization: (id: string, data: Partial<Organization>) =>
    apiRequest<Organization>(`/admin/organizations/${id}`, { method: "PATCH", body: data }),
  toggleOrgStatus: (id: string, status: string) =>
    apiRequest<Organization>(`/admin/organizations/${id}/status`, { method: "PATCH", body: { status } }),

  // Usuários
  listUsers: (params?: Record<string, string>) =>
    apiRequest<{ data: AdminUser[]; total: number }>(
      `/admin/users${params ? `?${new URLSearchParams(params)}` : ""}`
    ),
  createUser: (data: { name: string; email: string; password: string; role: string; organizationId?: string }) =>
    apiRequest<AdminUser>("/admin/users", { method: "POST", body: data }),
  toggleUserStatus: (id: string, status: string) =>
    apiRequest<AdminUser>(`/admin/users/${id}/status`, { method: "PATCH", body: { status } }),
  changeUserRole: (id: string, role: string) =>
    apiRequest<AdminUser>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),

  // Métricas
  getMetrics: () => apiRequest<AdminMetrics>("/admin/metrics"),

  // Planos
  createSubscription: (orgId: string, data: { plan: string; value: number; startDate?: string }) =>
    apiRequest<Subscription>(`/admin/organizations/${orgId}/subscription`, { method: "POST", body: data }),
};
