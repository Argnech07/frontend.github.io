export type StudyItemStatus = 'pending' | 'approved' | 'completed';

export interface StudyItemCreate {
  study_order_id: number;
  study_type: string;
  assigned_doctor: string;
  name: string;
  reason: string;
  document_date: string | null;
  status: StudyItemStatus;
  url: string | null;
}

export interface StudyItemOut extends StudyItemCreate {
  id: number;
}

export interface StudyItemUpdate {
  url?: string | null;
  document_date?: string | null;
  status?: StudyItemStatus;
}

export interface StudyCartItem {
  study_type: string;
  assigned_doctor: string;
  name: string;
  reason: string;
  pdfFile?: File | null;
}
