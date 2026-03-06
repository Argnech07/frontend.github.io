// treatment-item.model.ts
export interface TreatmentItem {
  medication_name: string; // Medicamento
  presentation: string; // Presentación
  dosage: string; // Dosis
  frequency_hours: number; // Cada X horas
  duration_days: number; // Número (7)
  duration_unit: string; // 'dias' (por ahora fijo)
  route: string; // Vía
  notes: string; // Indicaciones especiales
}

export interface PrescriptionCreate {
  patient_id: number;
  doctor_id: number;
  license_number: string;
  specialty: string;
  date: string; // yyyy-mm-dd
  visit_diagnosis_id: number | null;
  notes: string | null;
}

export interface PrescriptionUpdate {
  notes?: string | null;
}

export interface PrescriptionOut extends PrescriptionCreate {
  id: number;
}

export interface PrescribedItemCreate {
  prescription_id: number;
  medication_id?: number | null;
  medication_name?: string | null;
  presentation?: string | null;
  route?: string | null;
  frequency_hours?: number | null;
  duration_days?: number | null;
  duration_unit?: string | null;
  dosage?: string | null;
  notes?: string | null;
}
