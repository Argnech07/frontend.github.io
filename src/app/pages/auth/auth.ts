import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor.service';
import { sanitizeEmail } from '../../utils/sanitize.util';

@Component({
  selector: 'auth',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Auth {
  private auth = inject(AuthService);
  private doctorSvc = inject(DoctorService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  userType = signal<'doctor' | 'admin'>('doctor');

  onEmailInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.email.set(target.value);
  }

  onPasswordInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.password.set(target.value);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.error.set(null);
    this.loading.set(true);

    // Validar y sanitizar entradas
    const email = sanitizeEmail(this.email());
    const password = this.password().trim();

    if (!email || !password) {
      this.error.set('Por favor completa todos los campos.');
      this.loading.set(false);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.error.set('Por favor ingresa un correo electrónico válido.');
      this.loading.set(false);
      return;
    }

    const loginObservable =
      this.userType() === 'admin'
        ? this.auth.adminLogin(email, password)
        : this.auth.login(email, password);

    loginObservable.subscribe({
      next: () => {
        this.loading.set(false);
        if (this.userType() === 'admin') {
          // TODO: Navegar al dashboard de admin cuando esté disponible
          this.router.navigate(['/admin']);
        } else {
          this.doctorSvc.loadCurrentDoctor(); // ← AQUÍ SE CARGA /doctors/me
          this.router.navigate(['/dashboard/agenda']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail ?? 'Error al iniciar sesión');
      },
    });
  }

  setUserType(type: 'doctor' | 'admin') {
    this.userType.set(type);
    this.error.set(null); // Limpiar errores al cambiar de tipo
  }

  showPassword = false; // Nueva funcionalidad para mostrar/ocultar contraseña
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
