import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Visit, VisitCreate, VisitOut } from '../models/visit.model';
import { environment } from '../../environments/environment';
import { VisitFull } from '../models/visit';

@Injectable({
  providedIn: 'root',
})
export class VisitsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/visits`;

  createVisit(payload: VisitCreate): Observable<VisitOut> {
    return this.http.post<VisitOut>(`${this.baseUrl}/`, payload);
  }

  updateVisit(id: number, payload: Partial<VisitCreate>): Observable<VisitOut> {
    return this.http.put<VisitOut>(`${this.baseUrl}/${id}`, payload);
  }

  // Nuevo: obtener una visita específica (de tu amigo)
  getVisit(id: number): Observable<VisitOut> {
    return this.http.get<VisitOut>(`${this.baseUrl}/${id}`);
  }

  // Tu listado paginado por paciente
  listByPatient(
    patientId: number,
    options?: { skip?: number; limit?: number }
  ): Observable<Visit[]> {
    let params = new HttpParams().set('patient_id', String(patientId));
    if (options?.skip != null) {
      params = params.set('skip', String(options.skip));
    }
    if (options?.limit != null) {
      params = params.set('limit', String(options.limit));
    }
    return this.http.get<Visit[]>(`${this.baseUrl}/`, { params });
  }
  getVisitFull(visitId: number): Observable<VisitFull> {
    return this.http.get<VisitFull>(`${this.baseUrl}/${visitId}/full`);
  }
}
