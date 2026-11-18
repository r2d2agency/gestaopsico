import { apiRequest } from "./api";

export interface ClinicStatus {
  organization: { id: string; name: string; mode: string; status: string } | null;
  membership: { role: string; permissions: string[]; supervisorId: string | null } | null;
}

export interface ClinicMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  scope: string;
  status: string;
  permissions: string[];
  supervisorId: string | null;
  user?: { id: string; name: string; email: string; crp?: string | null; phone?: string | null; specialty?: string | null; status?: string };
}

export const clinicApi = {
  status: () => apiRequest<ClinicStatus>("/clinic/status"),
  activate: (mode: "clinic" | "hybrid") => apiRequest("/clinic/activate", { method: "POST", body: { mode } }),
  listMembers: () => apiRequest<ClinicMember[]>("/clinic/members"),
  saveMember: (data: { userId: string; role: string; supervisorId?: string | null; permissions?: string[] }) =>
    apiRequest<ClinicMember>("/clinic/members", { method: "POST", body: data }),
  updateMemberStatus: (id: string, status: "active" | "suspended" | "ended") =>
    apiRequest<ClinicMember>(`/clinic/members/${id}/status`, { method: "PATCH", body: { status } }),
  sharePatient: (data: { patientId: string; professionalId: string; relationType?: string; validUntil?: string | null }) =>
    apiRequest("/clinic/patient-links", { method: "POST", body: data }),
};

export interface PayoutItem {
  id: string;
  professionalId: string;
  professional?: { id: string; name: string } | null;
  chargedAmount: number | string;
  netAmount: number | string;
  ruleType: string;
  status: string;
}

export interface PayoutRun {
  id: string;
  month: string;
  status: string;
  netTotal: number | string;
  items?: PayoutItem[];
}

export const payoutsApi = {
  listAgreements: (professionalId?: string) =>
    apiRequest(`/payouts/agreements${professionalId ? `?professionalId=${professionalId}` : ""}`),
  createAgreement: (data: { professionalId: string; ruleType: string; fixedAmount?: number | null; percentage?: number | null; effectiveFrom: string; effectiveUntil?: string | null; notes?: string | null }) =>
    apiRequest("/payouts/agreements", { method: "POST", body: data }),
  generateRun: (month: string, notes?: string) => apiRequest<PayoutRun>("/payouts/runs", { method: "POST", body: { month, notes } }),
  listRuns: () => apiRequest<PayoutRun[]>("/payouts/runs"),
  getRun: (id: string) => apiRequest<PayoutRun>(`/payouts/runs/${id}`),
  reviewRun: (id: string) => apiRequest<PayoutRun>(`/payouts/runs/${id}/review`, { method: "POST" }),
  approveRun: (id: string) => apiRequest<PayoutRun>(`/payouts/runs/${id}/approve`, { method: "POST" }),
  payRun: (id: string) => apiRequest<PayoutRun>(`/payouts/runs/${id}/pay`, { method: "POST" }),
  adjustItem: (id: string, data: { netAmount: number; adjustmentReason: string }) =>
    apiRequest(`/payouts/items/${id}`, { method: "PATCH", body: data }),
};

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export const auditApi = {
  list: (params?: { entityType?: string; entityId?: string; action?: string }) => {
    const search = new URLSearchParams();
    if (params?.entityType) search.set("entityType", params.entityType);
    if (params?.entityId) search.set("entityId", params.entityId);
    if (params?.action) search.set("action", params.action);
    const query = search.toString();
    return apiRequest<AuditEvent[]>(`/audit${query ? `?${query}` : ""}`);
  },
};

export const notificationsApi = {
  list: () => apiRequest("/notifications"),
  markRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
};
