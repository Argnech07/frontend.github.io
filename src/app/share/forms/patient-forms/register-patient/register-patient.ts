import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
  signal,
  effect,
} from '@angular/core';
import { BasicInfo } from '../basic-info/basic-info';
import { FamilyHistoryForm } from '../family-history/family-history';
import { PersonalHabitsForm } from '../personal-habits/personal-habits';
import { VitalsForm } from '../vitals-form/vitals-form';
import { Patient } from '../../../../models/patient';
import { PatientClinicalService } from '../../../../services/patient-clinical.service';
import { PatientMedicalHistoryOut } from '../../../../models/patient-medical-history';
import { VitalsOut } from '../../../../models/vitals';

type Step = 'general' | 'somatometria' | 'heredofamiliares' | 'no-patologicos';

@Component({
  selector: 'register-patient',
  standalone: true,
  imports: [BasicInfo, FamilyHistoryForm, PersonalHabitsForm, VitalsForm],
  templateUrl: './register-patient.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPatient {
  private clinicalService = inject(PatientClinicalService);

  @Output() closed = new EventEmitter<void>();

  currentStep = signal<Step>('general');
  patientId = signal<number | null>(null);
  patient = signal<Patient | null>(null);
  medicalHistory = signal<PatientMedicalHistoryOut | null>(null);
  successMessage = signal<string | null>(null);

  constructor() {
    // Cargar historial médico cuando cambia el patientId
    effect(() => {
      const id = this.patientId();
      if (id) {
        this.clinicalService.getMedicalHistory(id).subscribe({
          next: (history) => this.medicalHistory.set(history),
          error: () => this.medicalHistory.set(null),
        });
      }
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  selectStep(step: Step): void {
    if (step === 'general' || this.patientId()) {
      this.currentStep.set(step);
    }
  }

  // lo llama <form-basic-info (saved)="onBasicInfoSaved($event)">
  onBasicInfoSaved(p: Patient): void {
    this.patient.set(p);
    this.patientId.set(p.id);
    this.currentStep.set('somatometria');
  }

  onVitalsSaved(_v: VitalsOut): void {
    this.showSuccess('Somatometría guardada correctamente');
    this.currentStep.set('heredofamiliares');
  }

  onFamilyHistorySaved(): void {
    // Recargar historial médico después de guardar
    const id = this.patientId();
    if (id) {
      this.clinicalService.getMedicalHistory(id).subscribe({
        next: (history) => {
          this.medicalHistory.set(history);
          // Solo mostrar mensaje de éxito, NO cerrar el modal
          this.showSuccess('Antecedentes heredofamiliares guardados correctamente');
        },
      });
    }
  }

  onPersonalHabitsSaved(): void {
    // Recargar historial médico después de guardar
    const id = this.patientId();
    if (id) {
      this.clinicalService.getMedicalHistory(id).subscribe({
        next: (history) => {
          this.medicalHistory.set(history);
          // Mostrar mensaje de éxito y cerrar después de 2 segundos (última sección)
          this.showSuccessAndClose('Antecedentes no patológicos guardados correctamente');
        },
      });
    }
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }

  private showSuccessAndClose(message: string): void {
    this.successMessage.set(message);
    // Cerrar el modal después de 2 segundos
    setTimeout(() => {
      this.onClose();
    }, 2000);
  }

  goPrev(): void {
    const order: Step[] = [
      'general',
      'somatometria',
      'heredofamiliares',
      'no-patologicos',
    ];
    const idx = order.indexOf(this.currentStep());
    if (idx > 0) {
      this.currentStep.set(order[idx - 1]);
    }
  }

  goNext(): void {
    const order: Step[] = [
      'general',
      'somatometria',
      'heredofamiliares',
      'no-patologicos',
    ];
    const idx = order.indexOf(this.currentStep());
    if (idx < order.length - 1) {
      if (!this.patientId() && order[idx + 1] !== 'general') return;
      this.currentStep.set(order[idx + 1]);
    }
  }
}
