export interface VisitCreate {
  patient_id: number;
  doctor_id: number | null;
  date_id: number | null;
  visit_ts: string;
  reason: string | null;
  exploration: string | null;
  therapeutic_plan: string | null;
}

export interface VisitOut extends VisitCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  date_id: number | null;
  visit_ts: string; // ISO
  reason: string | null;
  exploration: string | null;
  therapeutic_plan: string | null;
  created_at: string;
  updated_at: string;
}
