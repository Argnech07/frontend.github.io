import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../../models/patient';
import { PatientMedicalHistoryOut } from '../../../models/patient-medical-history';
import { VitalsOut } from '../../../models/vitals';

@Component({
  selector: 'patient-modify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-info-modify.html',
})
export class PatientInfoModify {
  // Inputs - datos originales que recibe del padre
  profile = input<Patient | null>(null);
  history = input<PatientMedicalHistoryOut | null>(null);
  vitals = input<VitalsOut | null>(null);

  // Datos editables (copias locales)
  editedProfile: any = {
    birth_date: null,
    gender: null,
    curp: null,
    phone: null,
    street: null,
    city: null,
    postal_code: null,
    marital_status: null,
    occupation: null,
    education: null,
    origin: null,
    blood_type: null,
  };

  editedHistory: any = {
    family_history: {
      diabetes: false,
      breast_cancer: false,
      other_cancers: false,
      hypertension: false,
      tuberculosis: false,
      cardiopathies: false,
      renal_disease: false,
      allergies: false,
      allergies_text: null,
      osteoporosis: false,
      bleeding_disorders: false,
      smoking: false,
      addictions: false,
      other: null,
    },
    personal_habits: {
      tobacco: false,
      smoking_start_age: null,
      cigarettes_per_day: null,
      alcohol: false,
      drugs: false,

      allergies_text: null,

      previous_hospitalizations: null,
      chronic_diseases: null,
      surgeries: null,
      fractures: null,
      transfusions: null,
    },
  };

  editedVitals: any = {
    weight: null,
    height: null,
    systolic: null,
    diastolic: null,
    temperature: null,
    heart_rate: null,
    respiratory_rate: null,
    glucose: null,
    waist_cm: null,
    abdomen_cm: null,
    hip_cm: null,
    head_circumference_cm: null,
  };

  // Output - eventos para notificar al padre
  onSave = output<{
    profile?: Partial<Patient>;
    history?: Partial<PatientMedicalHistoryOut>;
    vitals?: Partial<VitalsOut>;
  }>();

  onCancel = output<void>();

  constructor() {
    // Inicializar datos editables cuando recibimos los inputs
    effect(() => {
      const currentProfile = this.profile();
      if (currentProfile) {
        this.editedProfile = {
          birth_date: currentProfile.birth_date,
          gender: currentProfile.gender,
          curp: currentProfile.curp,
          phone: currentProfile.phone,
          street: currentProfile.street,
          city: currentProfile.city,
          postal_code: currentProfile.postal_code,
          marital_status: currentProfile.marital_status,
          occupation: currentProfile.occupation,
          education: currentProfile.education,
          origin: currentProfile.origin,
          blood_type: currentProfile.blood_type,
        };
      }

      const currentHistory = this.history();
      if (currentHistory) {
        this.editedHistory = {
          family_history: { ...currentHistory.family_history },
          personal_habits: { ...currentHistory.personal_habits },
        };
      }

      const currentVitals = this.vitals();
      if (currentVitals) {
        this.editedVitals = {
          weight: currentVitals.weight,
          height: currentVitals.height,
          systolic: currentVitals.systolic,
          diastolic: currentVitals.diastolic,
          temperature: currentVitals.temperature,
          heart_rate: currentVitals.heart_rate,
          respiratory_rate: currentVitals.respiratory_rate,
          glucose: currentVitals.glucose,
          waist_cm: currentVitals.waist_cm,
          abdomen_cm: currentVitals.abdomen_cm,
          hip_cm: currentVitals.hip_cm,
          head_circumference_cm: currentVitals.head_circumference_cm,
        };
      }
    });
  }

  // Método para guardar cambios
  saveChanges() {
    const data: {
      profile?: Partial<Patient>;
      history?: Partial<PatientMedicalHistoryOut>;
      vitals?: Partial<VitalsOut>;
    } = {};

    const profilePayload: Partial<Patient> = {
      birth_date: this.editedProfile.birth_date || null,
      gender: this.editedProfile.gender || null,
      curp: this.editedProfile.curp || null,
      phone: this.editedProfile.phone || null,
      street: this.editedProfile.street || null,
      city: this.editedProfile.city || null,
      postal_code: this.editedProfile.postal_code || null,
      marital_status: this.editedProfile.marital_status || null,
      occupation: this.editedProfile.occupation || null,
      education: this.editedProfile.education || null,
      origin: this.editedProfile.origin || null,
      blood_type: this.editedProfile.blood_type || null,
    };

    data.profile = profilePayload;

    // Siempre enviamos el historial editado
    data.history = this.editedHistory;

    // Solo enviamos vitals si hay al menos un campo con valor
    const hasVitalsData = Object.values(this.editedVitals).some(
      (val) => val !== null && val !== undefined && val !== ''
    );

    if (hasVitalsData) {
      data.vitals = this.editedVitals;
    }

    this.onSave.emit(data);
  }

  // Método para cancelar cambios
  cancelChanges() {
    this.onCancel.emit();
  }
}
