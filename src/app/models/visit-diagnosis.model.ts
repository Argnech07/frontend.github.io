export interface VisitDiagnosisCreate {
  visit_id: number;
  primary_diagnosis: string;
  secondary_diagnoses?: string[] | null;
  diagnosis_description?: string | null;
}

export interface VisitDiagnosisOut extends VisitDiagnosisCreate {
  id: number;
}
