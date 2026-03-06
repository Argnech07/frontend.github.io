export interface PatientIncapacityCreate {
  incapacity_for: string;
  incapacity_type: string;
  reason?: string | null;
}

export interface PatientIncapacityOut {
  id: number;
  patient_id: number;
  incapacity_for?: string | null;
  incapacity_type: string;
  reason?: string | null;
  created_at: string;
}
