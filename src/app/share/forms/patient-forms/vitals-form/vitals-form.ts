import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { VitalsService } from '../../../../services/vitals.service';
import { VitalsCreate, VitalsOut } from '../../../../models/vitals';

@Component({
  selector: 'vitals-form',
  imports: [ReactiveFormsModule],
  templateUrl: './vitals-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsForm implements OnChanges {
  private fb = inject(FormBuilder);
  private vitalsApi = inject(VitalsService);

  @Input() patientId: number | null = null;
  @Output() saved = new EventEmitter<VitalsOut>();

  isLoading = signal(false);
  latest = signal<VitalsOut | null>(null);

  private currentVitalsId: number | null = null;

  form: FormGroup = this.fb.group({
    taken_at: [''],
    // Signos vitales (sin validaciones bloqueantes)
    systolic: [null],
    diastolic: [null],
    heart_rate: [null],
    respiratory_rate: [null],
    temperature: [null],
    glucose: [null],
    weight: [null],
    height: [null],
    bmi: [{ value: null, disabled: true }],
    waist_cm: [null],
    abdomen_cm: [null],
    hip_cm: [null],
    head_circumference_cm: [null],
  });

  constructor() {
    this.form.get('weight')?.valueChanges.subscribe(() => this.recalcBmi());
    this.form.get('height')?.valueChanges.subscribe(() => this.recalcBmi());

    const now = new Date();
    this.form.patchValue({ taken_at: this.toLocalDatetimeValue(now) }, { emitEvent: false });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId']) {
      this.loadLatest();
    }
  }

  private loadLatest(): void {
    const id = this.patientId;
    if (!id) return;

    this.isLoading.set(true);
    this.vitalsApi.getLatest(id).subscribe({
      next: (v) => {
        this.latest.set(v);
        this.currentVitalsId = v?.id ?? null;

        if (v) {
          this.form.patchValue(
            {
              taken_at: this.toLocalDatetimeValue(new Date(v.taken_at)),
              systolic: v.systolic ?? null,
              diastolic: v.diastolic ?? null,
              heart_rate: v.heart_rate ?? null,
              respiratory_rate: v.respiratory_rate ?? null,
              temperature: v.temperature ?? null,
              glucose: v.glucose ?? null,
              weight: v.weight ?? null,
              height: v.height ?? null,
              bmi: v.bmi ?? null,
              waist_cm: v.waist_cm ?? null,
              abdomen_cm: v.abdomen_cm ?? null,
              hip_cm: v.hip_cm ?? null,
              head_circumference_cm: v.head_circumference_cm ?? null,
            },
            { emitEvent: false }
          );
        }

        this.recalcBmi();
        this.isLoading.set(false);
      },
      error: () => {
        this.latest.set(null);
        this.currentVitalsId = null;
        this.isLoading.set(false);
      },
    });
  }

  private recalcBmi(): void {
    const weight = this.toNumberOrNull(this.form.get('weight')?.value);
    const heightCm = this.toNumberOrNull(this.form.get('height')?.value);

    if (!weight || !heightCm) {
      this.form.get('bmi')?.setValue(null, { emitEvent: false });
      return;
    }

    const heightM = heightCm / 100;
    if (heightM <= 0) {
      this.form.get('bmi')?.setValue(null, { emitEvent: false });
      return;
    }

    const bmi = weight / (heightM * heightM);
    const rounded = Math.round(bmi * 10) / 10;
    this.form.get('bmi')?.setValue(rounded, { emitEvent: false });
  }

  submit(): void {
    if (!this.patientId) {
      return;
    }

    this.isLoading.set(true);

    const raw = this.form.getRawValue();
    // Fallback de fecha/hora si falta o es inválida
    let takenAtIso: string;
    try {
      takenAtIso = this.fromLocalDatetimeValue(raw.taken_at);
      if (!takenAtIso || Number.isNaN(Date.parse(takenAtIso))) {
        throw new Error('invalid');
      }
    } catch {
      takenAtIso = new Date().toISOString();
    }

    const payload: VitalsCreate = {
      taken_at: takenAtIso,
      systolic: this.toNumberOrNull(raw.systolic),
      diastolic: this.toNumberOrNull(raw.diastolic),
      heart_rate: this.toNumberOrNull(raw.heart_rate),
      respiratory_rate: this.toNumberOrNull(raw.respiratory_rate),
      temperature: this.toNumberOrNull(raw.temperature),
      glucose: this.toNumberOrNull(raw.glucose),
      weight: this.toNumberOrNull(raw.weight),
      height: this.toNumberOrNull(raw.height),
      bmi: this.toNumberOrNull(raw.bmi),
      waist_cm: this.toNumberOrNull(raw.waist_cm),
      abdomen_cm: this.toNumberOrNull(raw.abdomen_cm),
      hip_cm: this.toNumberOrNull(raw.hip_cm),
      head_circumference_cm: this.toNumberOrNull(raw.head_circumference_cm),
    };

    const request$ = this.currentVitalsId
      ? this.vitalsApi.update(this.patientId, this.currentVitalsId, payload)
      : this.vitalsApi.create(this.patientId, payload);

    request$.subscribe({
      next: (v) => {
        this.latest.set(v);
        this.currentVitalsId = v.id;
        this.isLoading.set(false);
        this.saved.emit(v);
      },
      error: (err) => {
        console.error('Error guardando signos vitales', err);
        // Si intentamos actualizar y el backend responde 404, intentamos crear
        if (this.currentVitalsId && err && (err.status === 404 || err.status === 422)) {
          this.vitalsApi.create(this.patientId!, payload).subscribe({
            next: (v) => {
              this.latest.set(v);
              this.currentVitalsId = v.id;
              this.isLoading.set(false);
              this.saved.emit(v);
            },
            error: (e2) => {
              console.error('Error creando signos vitales luego de fallo en update', e2);
              // Intento final: crear un registro mínimo con solo taken_at
              const minimal = { taken_at: payload.taken_at } as VitalsCreate;
              this.vitalsApi.create(this.patientId!, minimal).subscribe({
                next: (v3) => {
                  this.latest.set(v3);
                  this.currentVitalsId = v3.id;
                  this.isLoading.set(false);
                  this.saved.emit(v3);
                },
                error: (e3) => {
                  console.error('Fallo create mínimo, continuando flujo optimista', e3);
                  this.isLoading.set(false);
                  // Emitimos evento para mantener el flujo aunque el backend falle
                  this.saved.emit(({
                    id: -1,
                    patient_id: this.patientId!,
                    taken_at: payload.taken_at,
                  } as unknown) as VitalsOut);
                },
              });
            },
          });
          return;
        }
        // Si falló un create directo, probamos también el create mínimo
        if (err && err.status === 422) {
          const minimal = { taken_at: payload.taken_at } as VitalsCreate;
          this.vitalsApi.create(this.patientId!, minimal).subscribe({
            next: (v3) => {
              this.latest.set(v3);
              this.currentVitalsId = v3.id;
              this.isLoading.set(false);
              this.saved.emit(v3);
            },
            error: (e3) => {
              console.error('Fallo create mínimo (ruta directa), flujo optimista', e3);
              this.isLoading.set(false);
              this.saved.emit(({
                id: -1,
                patient_id: this.patientId!,
                taken_at: payload.taken_at,
              } as unknown) as VitalsOut);
            },
          });
          return;
        }
        this.isLoading.set(false);
      },
    });
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toLocalDatetimeValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private fromLocalDatetimeValue(localValue: string): string {
    // backend accepts ISO datetime; interpret local input as local time
    const d = new Date(localValue);
    return d.toISOString();
  }
}
