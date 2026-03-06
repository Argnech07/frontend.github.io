import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PatientService } from '../../../../services/patient.service';
import { Patient, PatientCreate } from '../../../../models/patient';
import {
  curpValidator,
  postalCodeValidator,
  phoneValidator,
  maxLengthValidator,
  noWhitespaceValidator,
} from '../../../../utils/validators.util';
import {
  sanitizeString,
  sanitizePhone,
  sanitizePostalCode,
} from '../../../../utils/sanitize.util';

@Component({
  selector: 'form-basic-info',
  imports: [ReactiveFormsModule],
  templateUrl: './basic-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicInfo {
  private fb = inject(FormBuilder);
  private patientsApi = inject(PatientService);

  @Input() patient: Patient | null = null; // null = create, objeto = edit
  @Output() saved = new EventEmitter<Patient>();

  form: FormGroup = this.fb.group({
    first_name: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(100)],
    ],
    last_name: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(100)],
    ],
    middle_name: ['', maxLengthValidator(100)],
    birth_date: ['', Validators.required],
    blood_type: ['', Validators.required],
    marital_status: [''],
    gender: ['', Validators.required], // <----- AQUÍ
    phone: ['', [Validators.required, phoneValidator()]],
    curp: [''],
    education: [''],
    occupation: [''],
    origin: [''],
    city: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(100)],
    ],
    postal_code: ['', [Validators.required, postalCodeValidator()]],
    street: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(255)],
    ],
  });

  ngOnChanges() {
    if (this.patient) {
      this.form.patchValue(this.patient);
    }
  }

  getErrorMessage(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!control || !control.errors || !control.touched) {
      return null;
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['invalidCURP']) {
      return 'El CURP debe tener 18 caracteres alfanuméricos válidos';
    }
    if (control.errors['invalidPostalCode']) {
      return 'El código postal debe tener 5 dígitos';
    }
    if (control.errors['invalidPhone']) {
      return 'Por favor ingresa un número de teléfono válido (10 dígitos)';
    }
    if (control.errors['maxLength']) {
      return `Máximo ${control.errors['maxLength'].requiredLength} caracteres`;
    }
    if (control.errors['whitespace']) {
      return 'Este campo no puede estar vacío';
    }

    return null;
  }

  submit() {
    if (this.form.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    // Sanitizar todos los valores antes de enviar
    const formValue = this.form.value;
    const payload: PatientCreate = {
      first_name: sanitizeString(formValue.first_name),
      last_name: sanitizeString(formValue.last_name),
      middle_name: formValue.middle_name
        ? sanitizeString(formValue.middle_name)
        : null,
      birth_date: formValue.birth_date || null,
      blood_type: formValue.blood_type || null,
      marital_status: formValue.marital_status || null,
      phone: sanitizePhone(formValue.phone),
      curp: formValue.curp ? sanitizeString(formValue.curp) : null,
      education: formValue.education || null,
      occupation: formValue.occupation ? sanitizeString(formValue.occupation) : null,
      origin: formValue.origin ? sanitizeString(formValue.origin) : null,
      city: sanitizeString(formValue.city),
      postal_code: sanitizePostalCode(formValue.postal_code),
      street: sanitizeString(formValue.street),
      gender: formValue.gender,
    };

    if (this.patient) {
      this.patientsApi.update(this.patient.id, payload).subscribe({
        next: (p) => this.saved.emit(p),
        error: (err) => {
          console.error('Error al actualizar paciente:', err);
          // Aquí podrías mostrar un mensaje de error al usuario
        },
      });
    } else {
      this.patientsApi.create(payload).subscribe({
        next: (p) => this.saved.emit(p),
        error: (err) => {
          console.error('Error al crear paciente:', err);
          // Aquí podrías mostrar un mensaje de error al usuario
          if (err.error?.detail) {
            console.error('Detalles del error:', err.error.detail);
          }
        },
      });
    }
  }
}
