import { StudyItemOut } from './study-item.model';

export interface StudyOrderCreate {
  patient_id: number;
  doctor_id: number;
  order_date: string | null; // ISO
}

export interface StudyOrderOut extends StudyOrderCreate {
  id: number;
}

// Nuevo: StudyOrder con items incluidos
export interface StudyOrderFull extends StudyOrderOut {
  items: StudyItemOut[];
}
