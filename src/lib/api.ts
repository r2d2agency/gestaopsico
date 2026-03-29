// API Configuration for Easypanel Backend
// Set VITE_API_URL in your .env file pointing to your Easypanel backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

function getAuthToken(): string | null {
  return localStorage.getItem("auth_token") || localStorage.getItem("token");
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const token = getAuthToken();
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { ...defaultHeaders, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    const error = await response.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(error.message || error.error || `Erro ${response.status}`);
  }

  return response.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: { id: string; name: string; email: string; role: string } }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (data: { name: string; email: string; password: string; planId?: string }) =>
    apiRequest<{ token: string; user: { id: string; name: string; email: string; role: string } }>("/auth/register", { method: "POST", body: data }),
  me: () => apiRequest<{ id: string; name: string; email: string; role: string }>("/auth/me"),
  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
  },
};

// Setup
export const setupApi = {
  promoteSuperadmin: () =>
    apiRequest<{ message: string; user: { id: string; name: string; email: string; role: string } }>(
      "/setup/promote-superadmin", { method: "POST" }
    ),
  promoteByEmail: (email: string, role: string = "superadmin") =>
    apiRequest<{ message: string; user: { id: string; name: string; email: string; role: string } }>(
      "/setup/promote-by-email", { method: "POST", body: { email, role } }
    ),
};

// Pacientes
export const pacientesApi = {
  list: (params?: { search?: string; page?: number }) =>
    apiRequest<{ data: Patient[]; total: number }>(`/pacientes?${new URLSearchParams(params as Record<string, string>)}`),
  get: (id: string) => apiRequest<Patient>(`/pacientes/${id}`),
  create: (data: Partial<Patient>) => apiRequest<Patient>("/pacientes", { method: "POST", body: data }),
  update: (id: string, data: Partial<Patient>) => apiRequest<Patient>(`/pacientes/${id}`, { method: "PUT", body: data }),
  delete: (id: string) => apiRequest(`/pacientes/${id}`, { method: "DELETE" }),
  lookupCep: (cep: string) =>
    apiRequest<{ cep: string; street: string; complement: string; neighborhood: string; city: string; state: string }>(`/pacientes/cep/${cep}`),
  validateCpf: (cpf: string) =>
    apiRequest<{ valid: boolean; exists?: boolean; message?: string }>(`/pacientes/validate-cpf/${cpf}`),
};

// Consultas
export const consultasApi = {
  list: (params?: { date?: string; status?: string }) =>
    apiRequest<Consulta[]>(`/consultas?${new URLSearchParams(params as Record<string, string>)}`),
  get: (id: string) => apiRequest<Consulta>(`/consultas/${id}`),
  create: (data: Partial<Consulta>) => apiRequest<Consulta>("/consultas", { method: "POST", body: data }),
  update: (id: string, data: Partial<Consulta>) => apiRequest<Consulta>(`/consultas/${id}`, { method: "PUT", body: data }),
  cancel: (id: string) => apiRequest(`/consultas/${id}/cancel`, { method: "POST" }),
  attend: (id: string) => apiRequest(`/consultas/${id}/attend`, { method: "POST" }),
};

// Casais
export const casaisApi = {
  list: () => apiRequest<Casal[]>("/casais"),
  get: (id: string) => apiRequest<Casal>(`/casais/${id}`),
  create: (data: { patient1_id: string; patient2_id: string; name: string }) =>
    apiRequest<Casal>("/casais", { method: "POST", body: data }),
  records: (id: string) => apiRequest<any[]>(`/casais/${id}/prontuarios`),
};

// Prontuários
export const prontuariosApi = {
  list: (pacienteId: string) => apiRequest<Prontuario[]>(`/pacientes/${pacienteId}/prontuarios`),
  get: (id: string) => apiRequest<Prontuario>(`/prontuarios/${id}`),
  create: (data: Partial<Prontuario>) => apiRequest<Prontuario>("/prontuarios", { method: "POST", body: data }),
  update: (id: string, data: Partial<Prontuario>) => apiRequest<Prontuario>(`/prontuarios/${id}`, { method: "PUT", body: data }),
};

// Financeiro
export const financeiroApi = {
  list: (params?: { month?: string; status?: string }) =>
    apiRequest<Pagamento[]>(`/financeiro?${new URLSearchParams(params as Record<string, string>)}`),
  summary: (month?: string) =>
    apiRequest<FinanceiroSummary>(`/financeiro/summary${month ? `?month=${month}` : ""}`),
  update: (id: string, data: Partial<Pagamento>) =>
    apiRequest<Pagamento>(`/financeiro/${id}`, { method: "PUT", body: data }),
};

// Dashboard
export const dashboardApi = {
  summary: () => apiRequest<DashboardSummary>("/dashboard/summary"),
};

// Types
export interface Patient {
  id: string;
  name: string;
  cpf: string;
  birth_date: string;
  phone: string;
  email: string;
  address?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  whatsapp_valid?: boolean;
  gender: string;
  emergency_contact?: string;
  clinical_notes?: string;
  health_history?: string;
  medications?: string;
  allergies?: string;
  status: "active" | "inactive";
  billing_mode?: "per_session" | "monthly";
  monthly_value?: number;
  session_value?: number;
  charge_notification_mode?: "whatsapp" | "email" | "sms";
  charge_day?: number;
  charge_time?: string;
  charge_enabled?: boolean;
  created_at: string;
}

export interface Consulta {
  id: string;
  patient_id?: string;
  couple_id?: string;
  type: "individual" | "couple";
  date: string;
  time: string;
  duration: number;
  value: number;
  status: "scheduled" | "completed" | "cancelled";
  payment_status: "pending" | "paid" | "overdue" | "cancelled";
  mode: "video" | "in_person";
  attended?: boolean;
  notes?: string;
  patient?: Patient;
}

export interface Casal {
  id: string;
  name: string;
  patient1: Patient;
  patient2: Patient;
  created_at: string;
}

export interface Prontuario {
  id: string;
  patient_id?: string;
  couple_id?: string;
  type: "individual" | "couple";
  date: string;
  content: string;
  ai_content?: string;
  professional_id: string;
  created_at: string;
}

export interface Pagamento {
  id: string;
  consulta_id: string;
  patient_name: string;
  date: string;
  value: number;
  method: "pix" | "card" | "cash" | "insurance";
  status: "pending" | "paid" | "overdue" | "cancelled";
  type: "individual" | "couple";
}

export interface FinanceiroSummary {
  total_revenue: number;
  received: number;
  pending: number;
  average_ticket: number;
}

export interface DashboardSummary {
  today_appointments: number;
  total_patients: number;
  monthly_revenue: number;
  pending_payments: number;
  today_schedule: Consulta[];
  recent_patients: Patient[];
}
