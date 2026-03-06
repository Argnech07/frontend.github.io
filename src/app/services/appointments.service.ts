import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Appointment,
  AppointmentCreate,
  AppointmentOut,
} from '../models/appointment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AppointmentsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/appointments`;

  create(payload: AppointmentCreate): Observable<AppointmentOut> {
    return this.http.post<AppointmentOut>(`${this.baseUrl}/`, payload);
  }

  update(
    id: number,
    payload: Partial<AppointmentCreate>
  ): Observable<AppointmentOut> {
    return this.http.put<AppointmentOut>(`${this.baseUrl}/${id}`, payload);
  }

  getOne(id: number): Observable<AppointmentOut> {
    return this.http.get<AppointmentOut>(`${this.baseUrl}/${id}`);
  }

  list(options?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }): Observable<Appointment[]> {
    let params = new HttpParams();
    if (options?.skip != null)
      params = params.set('skip', String(options.skip));
    if (options?.limit != null)
      params = params.set('limit', String(options.limit));
    if (options?.start_date)
      params = params.set('start_date', options.start_date);
    if (options?.end_date) params = params.set('end_date', options.end_date);

    return this.http.get<Appointment[]>(`${this.baseUrl}/`, { params });
  }

  count(options?: { start_date?: string; end_date?: string }): Observable<{ count: number }> {
    let params = new HttpParams();
    if (options?.start_date) params = params.set('start_date', options.start_date);
    if (options?.end_date) params = params.set('end_date', options.end_date);
    return this.http.get<{ count: number }>(`${this.baseUrl}/count`, { params });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
