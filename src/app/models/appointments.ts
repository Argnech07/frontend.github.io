export interface AppointmentCreate {
  title?: string | null;
  visit_date: string; // 'yyyy-MM-dd'
  start_time: string; // 'HH:mm'
  end_time: string; // 'HH:mm'
  doctor_id: number;
  status?: 'pending' | 'confirmed' | 'canceled';
}

export interface AppointmentOut {
  id: number;
  patient_id: number;
  doctor_id: number;
  title: string | null;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'canceled';
  created_at: string;
}
