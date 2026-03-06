import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PatientIncapacityCreate,
  PatientIncapacityOut,
} from '../models/patient-incapacity.model';

@Injectable({ providedIn: 'root' })
export class PatientIncapacitiesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/patients`;

  listByPatient(
    patientId: number,
    options?: { skip?: number; limit?: number }
  ): Observable<PatientIncapacityOut[]> {
    let params = new HttpParams();
    if (options?.skip != null) params = params.set('skip', options.skip);
    if (options?.limit != null) params = params.set('limit', options.limit);

    return this.http.get<PatientIncapacityOut[]>(
      `${this.baseUrl}/${patientId}/incapacities/`,
      { params }
    );
  }

  createForPatient(
    patientId: number,
    payload: PatientIncapacityCreate
  ): Observable<PatientIncapacityOut> {
    return this.http.post<PatientIncapacityOut>(
      `${this.baseUrl}/${patientId}/incapacities/`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  updateForPatient(
    patientId: number,
    incapacityId: number,
    payload: Partial<PatientIncapacityCreate>
  ): Observable<PatientIncapacityOut> {
    return this.http.patch<PatientIncapacityOut>(
      `${this.baseUrl}/${patientId}/incapacities/${incapacityId}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  deleteForPatient(patientId: number, incapacityId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${patientId}/incapacities/${incapacityId}`
    );
  }
}
