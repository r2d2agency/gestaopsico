import { apiRequest } from "./api";

export interface WhatsappInstance {
  id: string;
  instanceId: string;
  instanceName: string;
  phone?: string;
  status: string;
  organizationId?: string;
  createdAt: string;
  _count?: { secretaryConfigs: number; notifications: number };
}

export interface SecretaryConfig {
  id: string;
  userId: string;
  instanceId?: string;
  instance?: { id: string; instanceName: string; status: string };
  secretaryName: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  professionalInfo?: string;
  promptComplement?: string;
  isActive: boolean;
}

export interface WhatsappNotification {
  id: string;
  instanceId: string;
  phone: string;
  message: string;
  type: string;
  status: string;
  scheduledAt: string;
  sentAt?: string;
  error?: string;
  instance?: { instanceName: string };
}

export const whatsappApi = {
  // Instances (superadmin)
  listInstances: () => apiRequest<WhatsappInstance[]>("/whatsapp/instances"),
  createInstance: (instanceName: string, callMessage?: string) =>
    apiRequest("/whatsapp/instances", { method: "POST", body: { instanceName, callMessage } }),
  getQrCode: (id: string) => apiRequest(`/whatsapp/instances/${id}/qrcode`),
  listAvailableInstances: () =>
    apiRequest<{ id: string; instanceName: string; status: string }[]>("/whatsapp/instances/available"),

  // Secretary config
  getSecretary: () => apiRequest<SecretaryConfig | null>("/whatsapp/secretary"),
  saveSecretary: (data: Partial<SecretaryConfig>) =>
    apiRequest<SecretaryConfig>("/whatsapp/secretary", { method: "PUT", body: data }),

  // Notifications
  sendNotification: (data: { phone: string; message: string; type: string; referenceId?: string; referenceType?: string }) =>
    apiRequest("/whatsapp/notifications/send", { method: "POST", body: data }),
  sendBulk: (notifications: { phone: string; message: string; type: string }[], instanceId?: string) =>
    apiRequest("/whatsapp/notifications/bulk", { method: "POST", body: { notifications, instanceId } }),
  listNotifications: (params?: Record<string, string>) =>
    apiRequest<{ data: WhatsappNotification[]; total: number }>(
      `/whatsapp/notifications${params ? `?${new URLSearchParams(params)}` : ""}`
    ),
  processQueue: () => apiRequest("/whatsapp/notifications/process", { method: "POST" }),
};
