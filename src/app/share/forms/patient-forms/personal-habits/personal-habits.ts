import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  effect,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PatientClinicalService } from '../../../../services/patient-clinical.service';
import { PersonalHabits } from '../../../../models/patient-medical-history';

@Component({
  selector: 'form-personal-habits',
  imports: [ReactiveFormsModule],
  templateUrl: './personal-habits.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalHabitsForm implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private clinicalService = inject(PatientClinicalService);

  @Input() patientId: number | null = null;
  @Input() initialData: PersonalHabits | null = null;
  @Output() saved = new EventEmitter<void>();

  isLoading = signal(false);

  form: FormGroup = this.fb.group({
    tobacco: [false],
    smoking_start_age: [null],
    cigarettes_per_day: [null],
    alcohol: [false],
    drugs: [false],

    allergies_text: [''],

    previous_hospitalizations: [''],
    chronic_diseases: [''],
    surgeries: [''],
    fractures: [''],
    transfusions: [''],
  });

  ngOnInit() {
    // Validaciones condicionales para tabaco
    this.form.get('tobacco')?.valueChanges.subscribe((tobacco) => {
      const startAgeControl = this.form.get('smoking_start_age');
      const cigarettesControl = this.form.get('cigarettes_per_day');

      if (tobacco) {
        startAgeControl?.setValidators([Validators.required, Validators.min(1), Validators.max(120)]);
        cigarettesControl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        startAgeControl?.clearValidators();
        cigarettesControl?.clearValidators();
        startAgeControl?.setValue(null);
        cigarettesControl?.setValue(null);
      }
      startAgeControl?.updateValueAndValidity({ emitEvent: false });
      cigarettesControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialData'] && this.initialData) {
      this.form.patchValue({
        tobacco: this.initialData.tobacco ?? false,
        smoking_start_age: this.initialData.smoking_start_age ?? null,
        cigarettes_per_day: this.initialData.cigarettes_per_day ?? null,
        alcohol: this.initialData.alcohol ?? false,
        drugs: this.initialData.drugs ?? false,

        allergies_text: this.initialData.allergies_text ?? '',

        previous_hospitalizations:
          this.initialData.previous_hospitalizations ?? '',
        chronic_diseases: this.initialData.chronic_diseases ?? '',
        surgeries: this.initialData.surgeries ?? '',
        fractures: this.initialData.fractures ?? '',
        transfusions: this.initialData.transfusions ?? '',
      }, { emitEvent: false });
    }
  }

  submit() {
    if (!this.patientId || this.form.invalid) return;

    this.isLoading.set(true);

    const formValue = this.form.value;
    const personalHabits: PersonalHabits = {
      tobacco: formValue.tobacco || undefined,
      smoking_start_age: formValue.tobacco && formValue.smoking_start_age
        ? Number(formValue.smoking_start_age)
        : null,
      cigarettes_per_day: formValue.tobacco && formValue.cigarettes_per_day
        ? Number(formValue.cigarettes_per_day)
        : null,
      alcohol: formValue.alcohol || undefined,
      drugs: formValue.drugs || undefined,

      allergies_text: String(formValue.allergies_text ?? '').trim() || null,

      previous_hospitalizations:
        String(formValue.previous_hospitalizations ?? '').trim() || null,
      chronic_diseases: formValue.chronic_diseases?.trim() || null,
      surgeries: String(formValue.surgeries ?? '').trim() || null,
      fractures: String(formValue.fractures ?? '').trim() || null,
      transfusions: String(formValue.transfusions ?? '').trim() || null,
    };

    this.clinicalService
      .upsertMedicalHistory(this.patientId, { personal_habits: personalHabits })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }
}

