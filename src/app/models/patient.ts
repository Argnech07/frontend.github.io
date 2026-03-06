export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  curp: string | null;
  birth_date: string | null; // ISO date
  gender: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  street: string | null;
  postal_code: string | null;
  marital_status: string | null;
  education: string | null;
  occupation: string | null;
  origin: string | null;
  blood_type: string | null;
  is_active: boolean;
}

export type PatientCreate = Pick<Patient, 'first_name' | 'last_name'> &
  Partial<Patient>;

export type PatientUpdate = Partial<Patient>;

export interface PatientProfile {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  curp: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  street: string | null;
  postal_code: string | null;
  marital_status: string | null;
  education: string | null;
  occupation: string | null;
  origin: string | null;
  blood_type: string | null;
  profile_picture: string | null;
  is_active: boolean;

  vitals?: {
    weight?: number | null;
    height?: number | null;
    systolic?: number | null;
    diastolic?: number | null;
    temperature?: number | null;
    heart_rate?: number | null;
    respiratory_rate?: number | null;
    glucose?: number | null;
  } | null;
}

export interface PatientBasic {
  id: number;
  full_name: string;
}
