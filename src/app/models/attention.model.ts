export interface AttentionCreate {
  visit_id: number | null;
  prescription_id: number | null;
  study_order_id: number | null;
  doctor_id: number | null;
  patient_id: number | null;
}

export interface AttentionOut extends AttentionCreate {
  id: number;
  created_at: string;
}

export interface AttentionUpdate {
  visit_id?: number | null;
  prescription_id?: number | null;
  study_order_id?: number | null;
  doctor_id?: number | null;
  patient_id?: number | null;
}

export interface Diagnosis {
  id: number | null;
  code: string;
  description: string;
  diagnosis_description: string | null;
  secondary_diagnoses: string[];
}

export interface VisitData {
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

export interface AttentionFull {
  attention: {
    id: number;
    visit_id: number | null;
    prescription_id: number | null;
    study_order_id: number | null;
    doctor_id: number | null;
    patient_id: number | null;
    created_at: string;
  };
  visit: VisitData | null;
  prescription: {
    id: number;
    date: string;
    notes: string | null;
  } | null;
  prescribed_items: Array<{
    id: number;
    medication: {
      id: number;
      generic_name: string;
      brand_name: string | null;
      form: string | null;
      strength: string | null;
    };
    frequency_hours: number | null;
    duration_days: number | null;
    dosage: string | null;
    notes: string | null;
  }>;
  study_order: any | null;
}
