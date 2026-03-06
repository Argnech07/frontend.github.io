import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { PatientClinicalService } from '../../../../services/patient-clinical.service';
import { FamilyHistory } from '../../../../models/patient-medical-history';

@Component({
  selector: 'form-family-history',
  imports: [ReactiveFormsModule],
  templateUrl: './family-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyHistoryForm implements OnChanges {
  private fb = inject(FormBuilder);
  private clinicalService = inject(PatientClinicalService);

  @Input() patientId: number | null = null;
  @Input() initialData: FamilyHistory | null = null;
  @Output() saved = new EventEmitter<void>();

  isLoading = signal(false);

  form: FormGroup = this.fb.group({
    diabetes: [false],
    breast_cancer: [false],
    other_cancers: [false],
    hypertension: [false],
    tuberculosis: [false],
    cardiopathies: [false],
    renal_disease: [false],
    allergies: [false],
    osteoporosis: [false],
    bleeding_disorders: [false],
    smoking: [false],
    addictions: [false],
    other: [''],
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialData'] && this.initialData) {
      this.form.patchValue({
        diabetes: this.initialData.diabetes ?? false,
        breast_cancer: this.initialData.breast_cancer ?? false,
        other_cancers: this.initialData.other_cancers ?? false,
        hypertension: this.initialData.hypertension ?? false,
        tuberculosis: this.initialData.tuberculosis ?? false,
        cardiopathies: this.initialData.cardiopathies ?? false,
        renal_disease: this.initialData.renal_disease ?? false,
        allergies: this.initialData.allergies ?? false,
        osteoporosis: this.initialData.osteoporosis ?? false,
        bleeding_disorders: this.initialData.bleeding_disorders ?? false,
        smoking: this.initialData.smoking ?? false,
        addictions: this.initialData.addictions ?? false,
        other: this.initialData.other ?? '',
      }, { emitEvent: false });
    }
  }

  submit() {
    if (!this.patientId || this.form.invalid) return;

    this.isLoading.set(true);

    const formValue = this.form.value;
    const familyHistory: FamilyHistory = {
      diabetes: formValue.diabetes || undefined,
      breast_cancer: formValue.breast_cancer || undefined,
      other_cancers: formValue.other_cancers || undefined,
      hypertension: formValue.hypertension || undefined,
      tuberculosis: formValue.tuberculosis || undefined,
      cardiopathies: formValue.cardiopathies || undefined,
      renal_disease: formValue.renal_disease || undefined,
      allergies: formValue.allergies || undefined,
      osteoporosis: formValue.osteoporosis || undefined,
      bleeding_disorders: formValue.bleeding_disorders || undefined,
      smoking: formValue.smoking || undefined,
      addictions: formValue.addictions || undefined,
      other: formValue.other?.trim() || null,
    };

    this.clinicalService
      .upsertMedicalHistory(this.patientId, { family_history: familyHistory })
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

