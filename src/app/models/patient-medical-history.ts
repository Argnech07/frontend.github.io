export interface FamilyHistory {
  diabetes?: boolean;
  breast_cancer?: boolean;
  other_cancers?: boolean;
  hypertension?: boolean;
  tuberculosis?: boolean;
  cardiopathies?: boolean;
  renal_disease?: boolean;
  allergies?: boolean;
  allergies_text?: string | null;
  osteoporosis?: boolean;
  bleeding_disorders?: boolean;
  smoking?: boolean;
  addictions?: boolean;
  other?: string | null;
}

export interface PersonalHabits {
  tobacco?: boolean;
  smoking_start_age?: number | null;
  cigarettes_per_day?: number | null;
  alcohol?: boolean;
  drugs?: boolean;

  allergies_text?: string | null;

  previous_hospitalizations?: string | null;
  chronic_diseases?: string | null;
  surgeries?: string | null;
  fractures?: string | null;
  transfusions?: string | null;
}

export interface PatientMedicalHistoryOut {
  id: number;
  patient_id: number;
  family_history: FamilyHistory | null;
  personal_habits: PersonalHabits | null;
  created_at: string;
  updated_at: string;
}

export type PatientMedicalHistoryUpdate = Partial<
  Omit<
    PatientMedicalHistoryOut,
    'id' | 'patient_id' | 'created_at' | 'updated_at'
  >
>;
