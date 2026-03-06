import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ItemDatePipe } from '../../../pipes/item-date-pipe';
import { PatientService } from '../../../services/patient.service';
import { PatientIncapacitiesService } from '../../../services/patient-incapacities.service';
import {
  PatientIncapacityOut,
} from '../../../models/patient-incapacity.model';

@Component({
  selector: 'app-incapacities',
  imports: [CommonModule, ReactiveFormsModule, ItemDatePipe],
  templateUrl: './incapacities.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Incapacities implements OnInit {
  private fb = inject(FormBuilder);
  private patientSvc = inject(PatientService);
  private api = inject(PatientIncapacitiesService);

  incapacities = signal<PatientIncapacityOut[]>([]);
  selectedIncapacityId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);
  error = signal<string | null>(null);

  selectedIncapacity = computed<PatientIncapacityOut | null>(() => {
    const id = this.selectedIncapacityId();
    if (id == null) return null;
    return this.incapacities().find((x) => x.id === id) ?? null;
  });

  patientFullName = computed<string>(() => {
    const p = this.patientSvc.currentPatient();
    if (!p) return '';
    return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
  });

  form: FormGroup = this.fb.group({
    incapacity_for: ['', [Validators.required, Validators.maxLength(50)]],
    incapacity_type: ['', [Validators.required, Validators.maxLength(100)]],
    reason: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.patientSvc.loadCurrentPatient();
    this.load();
  }

  load(): void {
    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) {
      this.error.set('No hay paciente seleccionado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.listByPatient(patientId).subscribe({
      next: (list) => {
        this.incapacities.set(list);
        if (list.length > 0 && this.selectedIncapacityId() == null) {
          this.selectedIncapacityId.set(list[0].id);
        }
      },
      error: (err) => {
        console.error(err);
        const detail = err?.error?.detail;
        const msg = typeof detail === 'string' && detail
          ? detail
          : Array.isArray(detail) && typeof detail?.[0]?.msg === 'string' && detail[0].msg
            ? detail[0].msg
            : typeof err?.error === 'string' && err.error
              ? err.error
              : 'No se pudieron cargar las incapacidades';
        this.error.set(msg);
      },
      complete: () => this.loading.set(false),
    });
  }

  selectIncapacity(item: PatientIncapacityOut): void {
    this.selectedIncapacityId.set(item.id);
  }

  save(): void {
    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) {
      this.error.set('No hay paciente seleccionado');
      return;
    }

    if (this.saving() || this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload = {
      incapacity_for: String(this.form.value.incapacity_for ?? '').trim(),
      incapacity_type: String(this.form.value.incapacity_type ?? '').trim(),
      reason: String(this.form.value.reason ?? '').trim() || null,
    };

    this.api.createForPatient(patientId, payload).subscribe({
      next: (created) => {
        this.incapacities.set([created, ...this.incapacities()]);
        this.selectedIncapacityId.set(created.id);
        this.form.reset();
      },
      error: (err) => {
        console.error(err);
        const detail = err?.error?.detail;
        const msg = typeof detail === 'string' && detail
          ? detail
          : Array.isArray(detail) && typeof detail?.[0]?.msg === 'string' && detail[0].msg
            ? detail[0].msg
            : typeof err?.error === 'string' && err.error
              ? err.error
              : 'No se pudo guardar la incapacidad';
        this.error.set(msg);
      },
      complete: () => this.saving.set(false),
    });
  }

  deleteSelected(): void {
    const patientId = this.patientSvc.currentPatientId();
    const selected = this.selectedIncapacity();
    if (!patientId || !selected) {
      this.error.set('No hay incapacidad seleccionada');
      return;
    }

    if (this.deleting()) return;

    const ok = window.confirm('¿Deseas eliminar esta incapacidad?');
    if (!ok) return;

    this.deleting.set(true);
    this.error.set(null);

    this.api.deleteForPatient(patientId, selected.id).subscribe({
      next: () => {
        const nextList = this.incapacities().filter((x) => x.id !== selected.id);
        this.incapacities.set(nextList);
        this.selectedIncapacityId.set(nextList.length > 0 ? nextList[0].id : null);
      },
      error: (err) => {
        console.error(err);
        const detail = err?.error?.detail;
        const msg = typeof detail === 'string' && detail
          ? detail
          : Array.isArray(detail) && typeof detail?.[0]?.msg === 'string' && detail[0].msg
            ? detail[0].msg
            : typeof err?.error === 'string' && err.error
              ? err.error
              : 'No se pudo eliminar la incapacidad';
        this.error.set(msg);
      },
      complete: () => this.deleting.set(false),
    });
  }
}
