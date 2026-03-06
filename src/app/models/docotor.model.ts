export interface DoctorRegisterPayload {
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  license_number: string;
  license_number_E: string;
  specialty: string;
  password: string;
}

export interface DoctorInfo {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  license_number: string;
  license_number_E: string;
  specialty: string;
  is_active: boolean;
  created_at: string;
}
