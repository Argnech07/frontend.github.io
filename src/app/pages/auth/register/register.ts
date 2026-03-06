import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../../services/doctor.service';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
} from '../../../utils/sanitize.util';

@Component({
  selector: 'register',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Register {
  public doctorSvc = inject(DoctorService);
  private router = inject(Router);

  firstName = signal('');
  lastName = signal('');
  middleName = signal('');
  licenseNumber = signal('');
  licenseNumberE = signal('');
  specialty = signal('');
  email = signal('');
  password = signal('');

  error = signal<string | null>(null);
  success = signal<boolean>(false);

  // handlers para inputs (evitamos cast en template)
  onFirstNameInput(event: Event) {
    this.firstName.set((event.target as HTMLInputElement).value);
  }

  onLastNameInput(event: Event) {
    this.lastName.set((event.target as HTMLInputElement).value);
  }

  onMiddleNameInput(event: Event) {
    this.middleName.set((event.target as HTMLInputElement).value);
  }

  onLicenseNumberInput(event: Event) {
    this.licenseNumber.set((event.target as HTMLInputElement).value);
  }

  onLicenseNumberEInput(event: Event) {
    this.licenseNumberE.set((event.target as HTMLInputElement).value);
  }

  onSpecialtyChange(event: Event) {
    this.specialty.set((event.target as HTMLSelectElement).value);
  }

  onEmailInput(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event) {
    this.password.set((event.target as HTMLInputElement).value);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.error.set(null);
    this.success.set(false);

    // Validar campos obligatorios
    const firstName = sanitizeString(this.firstName());
    const lastName = sanitizeString(this.lastName());
    const email = sanitizeEmail(this.email());
    const licenseNumber = sanitizeString(this.licenseNumber());
    const licenseNumberE = sanitizeString(this.licenseNumberE());
    const specialty = sanitizeString(this.specialty());
    const password = this.password().trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !licenseNumber ||
      !licenseNumberE ||
      !specialty ||
      !password
    ) {
      this.error.set('Por favor completa todos los campos obligatorios.');
      return;
    }

    // Validar longitud mínima de contraseña
    if (password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.error.set('Por favor ingresa un correo electrónico válido.');
      return;
    }

    // Validar longitud de campos
    if (firstName.length > 100) {
      this.error.set('El nombre es demasiado largo (máximo 100 caracteres).');
      return;
    }

    if (lastName.length > 100) {
      this.error.set('El apellido es demasiado largo (máximo 100 caracteres).');
      return;
    }

    if (email.length > 255) {
      this.error.set('El correo electrónico es demasiado largo.');
      return;
    }

    // Validar longitud de cédula profesional
    if (licenseNumber.length > 50) {
      this.error.set('La cédula profesional es demasiado larga (máximo 50 caracteres).');
      return;
    }

    if (licenseNumberE.length > 50) {
      this.error.set('La cédula estatal es demasiado larga (máximo 50 caracteres).');
      return;
    }

    // Validar longitud de especialidad
    if (specialty.length > 100) {
      this.error.set('La especialidad es demasiado larga (máximo 100 caracteres).');
      return;
    }

    // Validar apellido materno si se proporciona
    const middleName = this.middleName() ? sanitizeString(this.middleName()) : null;
    if (middleName && middleName.length > 100) {
      this.error.set('El apellido materno es demasiado largo (máximo 100 caracteres).');
      return;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      email: email,
      license_number: licenseNumber,
      license_number_E: licenseNumberE,
      specialty: specialty,
      password: password,
    };

    this.doctorSvc.registerDoctor(payload).subscribe({
      next: () => {
        this.success.set(true);
        // Limpiar formulario después del éxito
        this.firstName.set('');
        this.lastName.set('');
        this.middleName.set('');
        this.licenseNumber.set('');
        this.licenseNumberE.set('');
        this.specialty.set('');
        this.email.set('');
        this.password.set('');
        
        // Opcional: redirigir al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        let errorMessage = 'Error al crear la cuenta';
        
        // Manejar diferentes tipos de errores
        if (err.error?.detail) {
          errorMessage = err.error.detail;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Por favor verifica la información.';
        } else if (err.status === 409) {
          errorMessage = 'Ya existe un usuario con estos datos.';
        } else if (err.status === 0 || err.status >= 500) {
          errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.error.set(errorMessage);
      },
      complete: () => {
        this.doctorSvc.loading.set(false);
      },
    });
  }
  // En tu componente
  showPassword = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Métodos adicionales
  getPasswordStrength(): number {
    const length = this.password().length;
    return Math.min((length / 8) * 100, 100);
  }

  getPasswordStrengthClass(): string {
    const length = this.password().length;
    if (length >= 8) return 'bg-green-500';
    if (length >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}
