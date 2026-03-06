import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullNamePipePipe } from '../../../pipes/full-name-pipe';
import { PatientService } from '../../../services/patient.service';
import { Patient } from '../../../models/patient';
import { PatientClinicalService } from '../../../services/patient-clinical.service';
import { PatientMedicalHistoryOut } from '../../../models/patient-medical-history';
import { VitalsOut, VitalsCreate } from '../../../models/vitals';
import { PatientInfoModify } from '../../../share/components/patient-info-modify/patient-info-modify';
import { PatientInfoReader } from '../../../share/components/patient-info-reader/patient-info-reader';

@Component({
  selector: 'patient-info',
  standalone: true,
  imports: [
    CommonModule,
    FullNamePipePipe,
    PatientInfoModify,
    PatientInfoReader,
  ],
  templateUrl: './patient-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PatientInfoComponent {
  private patientsApi = inject(PatientService);
  private clinicalApi = inject(PatientClinicalService);

  editmode = signal(false);

  profile = signal<Patient | null>(null);
  history = signal<PatientMedicalHistoryOut | null>(null);
  vitals = signal<VitalsOut | null>(null);

  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  // Helper para calcular la edad
  calculateAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  // Helper para formatear la dirección
  formatAddress(patient: Patient | null): string {
    if (!patient) return 'Sin registro';
    const parts = [patient.postal_code, patient.street, patient.city].filter(
      Boolean
    );
    return parts.length > 0 ? parts.join(', ') : 'Sin registro';
  }

  // Helper para obtener valor o fallback
  getValue(
    value: string | null | undefined,
    fallback: string = 'Sin registro'
  ): string {
    return value || fallback;
  }

  private allLoaded(): boolean {
    return (
      this.profile() !== null &&
      this.history() !== undefined &&
      this.vitals() !== undefined
    );
  }

  load() {
    const id = this.patientsApi.currentPatientId();
    if (!id) {
      this.error.set('No hay paciente seleccionado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Perfil
    this.patientsApi.getOne(id).subscribe({
      next: (p) => {
        this.profile.set(p);
        if (this.allLoaded()) this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudo cargar la información del paciente');
        this.loading.set(false);
      },
    });

    // Historial médico
    this.clinicalApi.getMedicalHistory(id).subscribe({
      next: (h) => {
        this.history.set(h);
        if (this.allLoaded()) this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          console.warn('Sin historial médico');
          this.history.set(null);
          if (this.allLoaded()) this.loading.set(false);
          return;
        }
        console.error('Error historial', err);
        this.error.set('Error al cargar historial médico');
        if (this.allLoaded()) this.loading.set(false);
      },
    });

    // Signos vitales
    this.clinicalApi.getLatestVitals(id).subscribe({
      next: (v) => {
        this.vitals.set(v);
        if (this.allLoaded()) this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          console.warn('Sin signos vitales');
          this.vitals.set(null);
          if (this.allLoaded()) this.loading.set(false);
          return;
        }
        console.error('Error vitals', err);
        this.error.set('Error al cargar signos vitales');
        this.loading.set(false);
      },
      complete: () => {
        if (this.allLoaded()) this.loading.set(false);
      },
    });
  }

  modifyModeOn() {
    this.editmode.set(!this.editmode());
  }

  // Manejar el evento de guardado desde el componente de modificación
  handleSave(data: {
    profile?: Partial<Patient>;
    history?: Partial<PatientMedicalHistoryOut>;
    vitals?: Partial<VitalsOut>;
  }) {
    const id = this.patientsApi.currentPatientId();
    if (!id) {
      this.error.set('No hay paciente seleccionado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Contador para saber cuándo terminan todas las peticiones
    let completedRequests = 0;
    const totalRequests =
      (data.profile ? 1 : 0) + (data.history ? 1 : 0) + (data.vitals ? 1 : 0);

    const checkCompletion = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        this.loading.set(false);
        this.editmode.set(false); // Cerrar modo edición al terminar
      }
    };

    // Actualizar perfil del paciente
    if (data.profile) {
      this.patientsApi.update(id, data.profile).subscribe({
        next: (updated) => {
          this.profile.set(updated);
          console.log('Perfil actualizado correctamente');
          checkCompletion();
        },
        error: (err) => {
          console.error('Error al guardar perfil:', err);
          this.error.set('Error al guardar el perfil del paciente');
          this.loading.set(false);
        },
      });
    }

    // Actualizar historial médico
    if (data.history) {
      this.clinicalApi.upsertMedicalHistory(id, data.history).subscribe({
        next: (updated: PatientMedicalHistoryOut) => {
          this.history.set(updated);
          console.log('Historial médico actualizado correctamente');
          checkCompletion();
        },
        error: (err: any) => {
          console.error('Error al guardar historial:', err);
          this.error.set('Error al guardar el historial médico');
          this.loading.set(false);
        },
      });
    }

    // Crear nuevos signos vitales (no se actualizan, se crean nuevos registros)
    if (data.vitals) {
      // Convertir Partial<VitalsOut> a VitalsCreate
      const vitalsPayload: VitalsCreate = {
        weight: data.vitals.weight,
        height: data.vitals.height,
        systolic: data.vitals.systolic,
        diastolic: data.vitals.diastolic,
        temperature: data.vitals.temperature,
        heart_rate: data.vitals.heart_rate,
        respiratory_rate: data.vitals.respiratory_rate,
        glucose: data.vitals.glucose,
        waist_cm: data.vitals.waist_cm,
        abdomen_cm: data.vitals.abdomen_cm,
        hip_cm: data.vitals.hip_cm,
        head_circumference_cm: data.vitals.head_circumference_cm,
        taken_at: new Date().toISOString(), // Fecha y hora actual
      };

      this.clinicalApi.createVitals(id, vitalsPayload).subscribe({
        next: (created: VitalsOut) => {
          this.vitals.set(created);
          console.log('Signos vitales creados correctamente');
          checkCompletion();
        },
        error: (err: any) => {
          console.error('Error al crear signos vitales:', err);
          this.error.set('Error al guardar los signos vitales');
          this.loading.set(false);
        },
      });
    }

    // Si no hay nada que guardar
    if (totalRequests === 0) {
      this.loading.set(false);
      this.editmode.set(false);
    }
  }

  // Manejar cancelación desde el componente de modificación
  handleCancel() {
    this.editmode.set(false);
  }
}
