export interface VitalsOut {
  id: number;
  patient_id: number;
  taken_at: string;
  systolic?: number | null;
  diastolic?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  temperature?: number | null;
  glucose?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  waist_cm?: number | null;
  abdomen_cm?: number | null;
  hip_cm?: number | null;
  head_circumference_cm?: number | null;
}

export type VitalsCreate = Omit<VitalsOut, 'id' | 'patient_id'>;
