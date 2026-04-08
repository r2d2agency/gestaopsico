import { apiRequest } from "./api";

export interface RecordData {
  id: string;
  patientId?: string;
  coupleId?: string;
  appointmentId?: string;
  professionalId: string;
  type: string;
  date: string;
  content?: string;
  aiContent?: string;
  complaint?: string;
  keyPoints?: string;
  clinicalObservations?: string;
  interventions?: string;
  evolution?: string;
  nextSteps?: string;
  privateNotes?: string;
  modality?: string;
  aiClinicalSupport?: string;
  themes?: string[];
  createdAt: string;
  updatedAt?: string;
  patient?: { id: string; name: string };
  couple?: { id: string; name: string };
  appointment?: { id: string; date: string; time: string; type: string; mode?: string };
}

export interface PatientTimeline {
  records: RecordData[];
  totalSessions: number;
  themes: { name: string; count: number }[];
}

export interface ClinicalDashboard {
  activePatients: number;
  totalRecords: number;
  recentRecords: RecordData[];
  incompleteRecords: number;
  patientFrequency: { patientId: string; patientName: string; count: number }[];
  themes: { name: string; count: number }[];
}

export interface PatientAnalysis {
  success: boolean;
  analysis: {
    emotionalEvolution?: string;
    themeFrequency?: { theme: string; frequency: number; trend: string }[];
    patternChanges?: string[];
    criticalPeriods?: string[];
    identifiedPatterns?: string[];
    attentionPoints?: string[];
    overallProgress?: string;
    rawText?: string;
  };
  totalSessions: number;
  disclaimer: string;
}

export const recordsApi = {
  listAll: (params?: { patientId?: string; coupleId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.patientId) sp.set("patientId", params.patientId);
    if (params?.coupleId) sp.set("coupleId", params.coupleId);
    const qs = sp.toString();
    return apiRequest<RecordData[]>(`/prontuarios${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => apiRequest<RecordData>(`/prontuarios/${id}`),
  create: (data: Partial<RecordData>) => apiRequest<RecordData>("/prontuarios", { method: "POST", body: data }),
  update: (id: string, data: Partial<RecordData>) => apiRequest<RecordData>(`/prontuarios/${id}`, { method: "PUT", body: data }),
  patientTimeline: (patientId: string) => apiRequest<PatientTimeline>(`/prontuarios/patient-timeline/${patientId}`),
  clinicalDashboard: (patientId?: string) => apiRequest<ClinicalDashboard>(`/prontuarios/clinical-dashboard${patientId ? `?patientId=${patientId}` : ""}`),
  organizeWithAi: (id: string) => apiRequest<{ success: boolean; record: RecordData }>(`/prontuarios/${id}/organize-ai`, { method: "POST" }),
  clinicalSupport: (id: string) => apiRequest<{ success: boolean; clinicalSupport: string; disclaimer: string }>(`/prontuarios/${id}/clinical-support`, { method: "POST" }),
  patientAnalysis: (patientId: string) => apiRequest<PatientAnalysis>(`/prontuarios/patient-analysis/${patientId}`, { method: "POST" }),
};
