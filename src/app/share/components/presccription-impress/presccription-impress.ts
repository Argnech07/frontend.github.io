import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PatientService } from '../../../services/patient.service';
import { DoctorService } from '../../../services/doctor.service';
import { PatientClinicalService } from '../../../services/patient-clinical.service';
import { SettingsService } from '../../../services/settings.service';
import { FullNamePipePipe } from '../../../pipes/full-name-pipe';
import { differenceInYears, format } from 'date-fns';
import { QRCodeModule } from 'angularx-qrcode';
import { PatientMedicalHistoryOut } from '../../../models/patient-medical-history';
import { environment } from '../../../../environments/environment';

const DEFAULT_LOGO_URL = 'https://jmasparral.gob.mx/imagenes/logo.png';

function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

@Component({
  selector: 'presccription-impress',
  imports: [CommonModule, FullNamePipePipe, QRCodeModule],
  templateUrl: './presccription-impress.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresccriptionImpress {
  patientSvc = inject(PatientService);
  doctorSvc = inject(DoctorService);
  private patientClinicalApi = inject(PatientClinicalService);
  private settingsApi = inject(SettingsService);
  private sanitizer = inject(DomSanitizer);
  medications = input<any[]>([]);
  generalInstructions = input<string>('');

  prescriptionId = input<number | null>(null);
  prescriptionDate = input<string | null>(null);
  attentionId = input<number | null>(null);
  visitId = input<number | null>(null);
  visitTs = input<string | null>(null);
  diagnosisPrimary = input<string | null>(null);
  diagnosisSecondary = input<string[]>([]);
  diagnosisDescription = input<string | null>(null);
  appNumber = input<string | null>(null);
  expediente = input<string | null>(null);
  procedencia = input<string | null>(null);
  allergies = input<string | null>(null);

  private medicalHistory = signal<PatientMedicalHistoryOut | null>(null);

  logoUrl = signal<string>(DEFAULT_LOGO_URL);

  formattedInstructions = computed(() => {
    const instructions = this.generalInstructions();
    if (!instructions) return [];
    return instructions
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  });

  qrText = computed(() => this.buildQrText(this.qrPayload()));

  // URL pública para acceso mundial desde cualquier dispositivo
  qrUrl = computed(() => {
    const folio = this.folio();
    const prescriptionId = this.prescriptionId();
    if (!prescriptionId || prescriptionId <= 0) return '';
    
    // Usar el dominio público del backend (configurar en environment.ts)
    // Para producción, cambiar a: 'https://vitacare.tudominio.com'
    const baseUrl = environment.apiUrl || 'http://localhost:8000';
    
    // URL que apunta al endpoint de verificación de receta en el backend
    return `${baseUrl}/prescriptions/verify/${folio}`;
  });

  folio = computed(() => {
    const id = this.prescriptionId();
    const year = new Date().getFullYear();
    if (id == null) return `RC-${year}----`;
    return `RC-${year}-${String(id).padStart(3, '0')}`;
  });

  private qrPayload = computed(() => {
    const patient = this.patientSvc.currentPatient();
    const doctor = this.doctorSvc.doctor();

    const meds = (this.medications() ?? []).map((m) => ({
      medication_name: String(m?.medication_name ?? '').trim(),
      presentation: String(m?.presentation ?? '').trim(),
      dosage: String(m?.dosage ?? '').trim(),
      frequency_hours: m?.frequency_hours ?? null,
      duration_days: m?.duration_days ?? null,
      route: String(m?.route ?? '').trim(),
      notes: String(m?.notes ?? '').trim(),
    }));

    const patientFullName = patient
      ? `${patient.first_name ?? ''} ${patient.middle_name ?? ''} ${patient.last_name ?? ''}`
          .replace(/\s+/g, ' ')
          .trim()
      : null;
    const doctorFullName = doctor
      ? `${doctor.first_name ?? ''} ${doctor.middle_name ?? ''} ${doctor.last_name ?? ''}`
          .replace(/\s+/g, ' ')
          .trim()
      : null;

    return {
      version: 1,
      folio: this.folio(),
      attention: this.attentionCode(),
      prescription_id: this.prescriptionId(),
      prescription_date: this.prescriptionDate() || this.visitTs() || null,
      visit_id: this.visitId(),
      diagnosis_primary: this.diagnosisPrimary(),
      diagnosis_secondary: this.diagnosisSecondary() ?? [],
      diagnosis_description: this.diagnosisDescription(),
      general_instructions: String(this.generalInstructions() ?? ''),
      patient: {
        id: patient?.id ?? null,
        full_name: patientFullName,
        birth_date: patient?.birth_date ?? null,
        gender: patient?.gender ?? null,
        phone: patient?.phone ?? null,
      },
      doctor: {
        id: doctor?.id ?? null,
        full_name: doctorFullName,
        specialty: this.doctorSvc.specialty() || null,
        license_number: this.doctorSvc.licenseNumber() || null,
      },
      extra: {
        app_number: this.appNumberLabel(),
        expediente: this.expedienteLabel(),
        procedencia: this.procedenciaLabel(),
        allergies: this.allergiesLabel(),
      },
      medications: meds,
    };
  });

  constructor() {
    this.settingsApi.getLogo().subscribe({
      next: (res) => {
        const url = String(res?.logo_url ?? '').trim();
        if (url) this.logoUrl.set(url);
      },
      error: () => {},
    });

    effect(() => {
      const patientId = this.patientSvc.currentPatientId();
      if (!patientId) {
        this.medicalHistory.set(null);
        return;
      }

      this.patientClinicalApi.getMedicalHistory(patientId).subscribe({
        next: (h) => this.medicalHistory.set(h),
        error: () => this.medicalHistory.set(null),
      });
    });
  }

  attentionCode = computed(() => {
    const id = this.attentionId();
    if (id == null) return 'AT----';
    return `AT-${String(id).padStart(5, '0')}`;
  });

  formattedDate = computed(() => {
    const iso = this.prescriptionDate() || this.visitTs() || new Date().toISOString();
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '---';
    return format(d, 'dd/MM/yyyy');
  });

  diagnosisText = computed(() => {
    const parts: string[] = [];
    const primary = this.diagnosisPrimary();
    if (primary) parts.push(primary);
    const secondary = this.diagnosisSecondary() ?? [];
    if (secondary.length > 0) parts.push(...secondary);
    const description = this.diagnosisDescription();
    if (description) {
      return `${parts.join(', ')} - ${description}`.trim();
    }
    return parts.join(', ');
  });

  patientGenderLabel = computed(() => {
    const g = this.patientSvc.currentPatient()?.gender;
    if (!g) return '---';
    const normalized = g.toLowerCase();
    if (normalized === 'm' || normalized === 'male' || normalized === 'masculino') {
      return 'Masculino';
    }
    if (normalized === 'f' || normalized === 'female' || normalized === 'femenino') {
      return 'Femenino';
    }
    return g;
  });

  patientAgeLabel = computed(() => {
    const birth = this.patientSvc.currentPatient()?.birth_date;
    if (!birth) return '---';
    const d = new Date(birth);
    if (Number.isNaN(d.getTime())) return '---';
    const years = differenceInYears(new Date(), d);
    if (!Number.isFinite(years) || years < 0) return '---';
    return `${years} años`;
  });

  patientBirthDateLabel = computed(() => {
    const birth = this.patientSvc.currentPatient()?.birth_date;
    if (!birth) return '---';
    const d = new Date(birth);
    if (Number.isNaN(d.getTime())) return '---';
    return format(d, 'dd/MM/yyyy');
  });

  phoneLabel = computed(() => {
    return this.patientSvc.currentPatient()?.phone || '---';
  });

  appNumberLabel = computed(() => {
    const override = this.appNumber();
    if (override) return override;
    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) return '---';
    return `APP-${String(patientId).padStart(5, '0')}`;
  });

  expedienteLabel = computed(() => {
    const override = this.expediente();
    if (override) return override;
    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) return '---';
    return `EXP-${String(patientId).padStart(6, '0')}`;
  });

  procedenciaLabel = computed(() => {
    const override = this.procedencia();
    if (override) return override;
    return this.patientSvc.currentPatient()?.city || '---';
  });

  allergiesLabel = computed(() => {
    const override = this.allergies();
    if (override) return override;

    const h = this.medicalHistory();
    const hasAllergies = h?.family_history?.allergies;
    const text = String(h?.family_history?.allergies_text ?? '').trim();
    if (text) return text;
    if (hasAllergies === true) return 'Sí';
    return '---';
  });

  printDateTimeLabel = computed(() => {
    const now = new Date();
    return format(now, 'dd/MM/yyyy HH:mm');
  });

  private buildQrText(payload: unknown): string {
    const p = payload as any;
    if (!p?.folio) return '';
    
    let text = `=== RECETA MEDICA VITACARE ===\n\n`;
    text += `Folio: ${p.folio}\n`;
    text += `Fecha: ${p.prescription_date?.split('T')[0] || '---'}\n`;
    text += `Atencion: ${p.attention}\n\n`;
    
    text += `PACIENTE:\n`;
    text += `${p.patient?.full_name || '---'}\n\n`;
    
    if (p.diagnosis_primary) {
      text += `DIAGNOSTICO:\n${p.diagnosis_primary}\n\n`;
    }
    
    if (p.medications?.length > 0) {
      text += `MEDICAMENTOS:\n`;
      p.medications.forEach((m: any, i: number) => {
        text += `${i + 1}. ${m.medication_name || '---'}\n`;
        if (m.dosage) text += `   Dosis: ${m.dosage}`;
        if (m.frequency_hours) text += ` cada ${m.frequency_hours}hrs`;
        if (m.duration_days) text += ` por ${m.duration_days} dias`;
        text += `\n`;
        if (m.route) text += `   Via: ${m.route}\n`;
      });
      text += `\n`;
    }
    
    if (p.general_instructions) {
      text += `INSTRUCCIONES:\n${p.general_instructions}\n\n`;
    }
    
    text += `MEDICO:\n`;
    text += `Dr. ${p.doctor?.full_name || '---'}\n`;
    text += `Especialidad: ${p.doctor?.specialty || '---'}\n`;
    text += `Cedula: ${p.doctor?.license_number || '---'}\n\n`;
    text += `============================`;
    
    return text;
  }
}
