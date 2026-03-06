import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../../models/patient';
import { PatientMedicalHistoryOut } from '../../../models/patient-medical-history';
import { VitalsOut } from '../../../models/vitals';

@Component({
  selector: 'patient-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-info-reader.html',
})
export class PatientInfoReader {
  // Usando input signals (moderna forma de @Input)
  profile = input<Patient | null>(null);
  history = input<PatientMedicalHistoryOut | null>(null);
  vitals = input<VitalsOut | null>(null);

  // Helper para obtener valor o fallback
  getValue(value: any, fallback: string = 'N/A'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  }
}
