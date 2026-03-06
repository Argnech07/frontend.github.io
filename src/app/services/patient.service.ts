import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';
import {
  Patient,
  PatientCreate,
  PatientUpdate,
  PatientBasic,
} from '../models/patient';
import { sanitizeSearch } from '../utils/sanitize.util';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/patients`;

  currentPatientId = signal<number | null>(null);

  private _currentPatient = signal<Patient | null>(null);
  currentPatient = computed(() => this._currentPatient());

  constructor() {
    const savedId = localStorage.getItem('current_patient_id');
    if (savedId) {
      this.currentPatientId.set(+savedId);
    }
  }

  setCurrentPatient(id: number) {
    this.currentPatientId.set(id);
    localStorage.setItem('current_patient_id', String(id));
  }

  clearCurrentPatient() {
    this.currentPatientId.set(null);
    this._currentPatient.set(null);
    localStorage.removeItem('current_patient_id');
  }

  loadCurrentPatient() {
    const id = this.currentPatientId();
    if (!id) return;

    this.getOne(id).subscribe({
      next: (p) => this._currentPatient.set(p),
      error: (err) => {
        console.error('Error al cargar paciente actual', err);
      },
    });
  }

  create(data: PatientCreate): Observable<Patient> {
    return this.http.post<Patient>(`${this.baseUrl}/`, data);
  }

  getOne(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/${id}`);
  }

  update(id: number, data: PatientUpdate): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/${id}`, data);
  }

  list(options?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Observable<Patient[]> {
    let params = new HttpParams();
    if (options?.skip != null) params = params.set('skip', options.skip);
    if (options?.limit != null) params = params.set('limit', options.limit);
    if (options?.search) {
      // Sanitizar el parámetro de búsqueda
      const sanitizedSearch = sanitizeSearch(options.search);
      // Limitar longitud máxima para evitar ataques
      const maxSearchLength = 200;
      const truncatedSearch = sanitizedSearch.substring(0, maxSearchLength);
      params = params.set('search', truncatedSearch);
    }
    if (options?.is_active !== undefined) {
      params = params.set('is_active', options.is_active);
    }
    return this.http.get<Patient[]>(`${this.baseUrl}/`, { params });
  }

  count(options?: {
    search?: string;
    is_active?: boolean;
  }): Observable<{ count: number }> {
    let params = new HttpParams();
    if (options?.search) {
      // Sanitizar el parámetro de búsqueda
      const sanitizedSearch = sanitizeSearch(options.search);
      // Limitar longitud máxima para evitar ataques
      const maxSearchLength = 200;
      const truncatedSearch = sanitizedSearch.substring(0, maxSearchLength);
      params = params.set('search', truncatedSearch);
    }
    if (options?.is_active !== undefined) {
      params = params.set('is_active', options.is_active);
    }
    return this.http.get<{ count: number }>(`${this.baseUrl}/count`, {
      params,
    });
  }

  toggleActive(id: number): Observable<Patient> {
    return this.http.patch<Patient>(`${this.baseUrl}/${id}/toggle-active`, {});
  }

  // Método optimizado para obtener solo id y nombres de pacientes
  listBasic(options?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Observable<PatientBasic[]> {
    let params = new HttpParams();
    if (options?.skip != null) params = params.set('skip', options.skip);
    if (options?.limit != null) params = params.set('limit', options.limit);
    if (options?.search) {
      const sanitizedSearch = sanitizeSearch(options.search);
      const maxSearchLength = 200;
      const truncatedSearch = sanitizedSearch.substring(0, maxSearchLength);
      params = params.set('search', truncatedSearch);
    }
    if (options?.is_active !== undefined) {
      params = params.set('is_active', options.is_active);
    }
    return this.http.get<PatientBasic[]>(`${this.baseUrl}/list`, { params });
  }
}
