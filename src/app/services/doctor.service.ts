import { computed, inject, Injectable, signal } from '@angular/core';
import { DoctorInfo, DoctorRegisterPayload } from '../models/docotor.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/doctors`;

  private _doctor = signal<DoctorInfo | null>(null);
  doctor = computed(() => this._doctor());
  doctorId = computed<number | null>(() => this._doctor()?.id ?? null);
  specialty = computed<string | null>(() => this._doctor()?.specialty ?? null);
  licenseNumber = computed<string | null>(
    () => this._doctor()?.license_number ?? null
  );
  licenseNumberE = computed<string | null>(
    () => (this._doctor() as any)?.license_number_E ?? null
  );

  loading = signal(false);

  registerDoctor(payload: DoctorRegisterPayload): Observable<DoctorInfo> {
    this.loading.set(true);
    return this.http.post<DoctorInfo>(`${this.baseUrl}/register`, payload);
  }

  listDoctors(skip: number = 0, limit: number = 50): Observable<DoctorInfo[]> {
    return this.http.get<DoctorInfo[]>(`${this.baseUrl}/`, {
      params: { skip, limit },
    });
  }

  updateDoctor(
    doctorId: number,
    payload: Partial<DoctorInfo> & { password?: string | null }
  ): Observable<DoctorInfo> {
    return this.http.put<DoctorInfo>(`${this.baseUrl}/${doctorId}`, payload);
  }

  loadCurrentDoctor() {
    this.http.get<DoctorInfo>(`${this.baseUrl}/me`).subscribe({
      next: (doc) => this._doctor.set(doc),
      error: (err) => {
        console.error('Error al cargar doctor actual', err);
        // solo si quieres, limpias en 401:
        // if (err.status === 401) this._doctor.set(null);
      },
    });
  }

  clearDoctor() {
    this._doctor.set(null);
  }

  getDoctorIdOrThrow(): number {
    const id = this.doctorId();
    if (id == null) {
      throw new Error('No hay doctor autenticado');
    }
    return id;
  }

  getDoctorById(id: number): Observable<DoctorInfo> {
    return this.http.get<DoctorInfo>(`${this.baseUrl}/${id}`);
  }
}
