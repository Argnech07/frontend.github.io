export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  title: string | null;
  visit_date: string; // ISO date
  start_time: string; // HH:mm:ss or HH:mm
  end_time: string; // HH:mm:ss
  status: 'pending' | 'confirmed' | 'canceled';
  created_at: string;
}

export interface AppointmentCreate {
  patient_id: number;
  doctor_id: number;
  title: string | null;
  visit_date: string; // ISO date
  start_time: string; // HH:mm
}

export interface AppointmentOut extends AppointmentCreate {
  id: number;
  created_at: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'canceled';
}
