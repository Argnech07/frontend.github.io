export interface MedicationOut {
  id: number;
  generic_name: string;
  brand_name: string | null;
  form: string | null;
  strength: string | null;
}
