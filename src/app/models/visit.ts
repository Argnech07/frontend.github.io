export interface Visit {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  date_id: number | null;
  visit_ts: string;
  reason: string | null;
  exploration: string | null;
  therapeutic_plan: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitCreate {
  patient_id: number;
  doctor_id?: number | null;
  date_id?: number | null;
  visit_ts: string;
  reason?: string | null;
  exploration?: string | null;
  therapeutic_plan?: string | null;
}

export interface VisitUpdate {
  doctor_id?: number | null;
  date_id?: number | null;
  visit_ts?: string;
  reason?: string | null;
  exploration?: string | null;
  therapeutic_plan?: string | null;
}

// Diagnóstico detallado
export interface DiagnosisDetail {
  id: number;
  code: string;
  description: string;
  diagnosis_description: string | null;
  secondary_diagnoses: string[];
}

// Visit con diagnósticos
export interface VisitFull extends Visit {
  diagnoses: DiagnosisDetail[];
}
