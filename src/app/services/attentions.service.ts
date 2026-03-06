import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AttentionCreate,
  AttentionOut,
  AttentionUpdate,
  AttentionFull,
} from '../models/attention.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttentionsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/attentions`;

  createAttention(payload: AttentionCreate): Observable<AttentionOut> {
    return this.http.post<AttentionOut>(`${this.baseUrl}/`, payload);
  }

  updateAttention(
    id: number,
    payload: AttentionUpdate
  ): Observable<AttentionOut> {
    return this.http.put<AttentionOut>(`${this.baseUrl}/${id}`, payload);
  }

  getAttention(id: number): Observable<AttentionOut> {
    return this.http.get<AttentionOut>(`${this.baseUrl}/${id}`);
  }

  getAttentionByVisitId(
    visitId: number,
    patientId?: number
  ): Observable<AttentionOut[]> {
    // El backend no soporta visit_id directamente, así que buscamos por patient_id
    // y filtramos por visit_id en el frontend
    if (patientId) {
      return this.getAttentionsByPatientId(patientId, { limit: 1000 }).pipe(
        map((attentions) =>
          attentions.filter((att) => att.visit_id === visitId)
        )
      );
    }
    // Si no tenemos patientId, intentamos buscar todas y filtrar (menos eficiente)
    return this.http
      .get<AttentionOut[]>(`${this.baseUrl}/`, {
        params: { limit: 1000 }, // Límite alto para obtener todas
      })
      .pipe(
        map((attentions) =>
          attentions.filter((att) => att.visit_id === visitId)
        )
      );
  }

  getAttentionsByPatientId(
    patientId: number,
    options?: { skip?: number; limit?: number }
  ): Observable<AttentionOut[]> {
    let params = new HttpParams().set('patient_id', String(patientId));
    if (options?.skip != null) {
      params = params.set('skip', String(options.skip));
    }
    if (options?.limit != null) {
      params = params.set('limit', String(options.limit));
    }
    return this.http.get<AttentionOut[]>(`${this.baseUrl}/`, { params });
  }

  getAttentionsByDoctorId(
    doctorId: number,
    options?: { skip?: number; limit?: number }
  ): Observable<AttentionOut[]> {
    let params = new HttpParams().set('doctor_id', String(doctorId));
    if (options?.skip != null) {
      params = params.set('skip', String(options.skip));
    }
    if (options?.limit != null) {
      params = params.set('limit', String(options.limit));
    }
    return this.http.get<AttentionOut[]>(`${this.baseUrl}/`, { params });
  }

  getAttentionFull(attentionId: number): Observable<AttentionFull> {
    return this.http.get<AttentionFull>(`${this.baseUrl}/${attentionId}/full`);
  }

  deleteAttention(attentionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${attentionId}`);
  }
}
