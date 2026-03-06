import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import {
  PatientMedicalHistoryOut,
  PatientMedicalHistoryUpdate,
} from '../models/patient-medical-history';
import { VitalsCreate, VitalsOut } from '../models/vitals';

@Injectable({ providedIn: 'root' })
export class PatientClinicalService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/patients`;

  getMedicalHistory(patientId: number): Observable<PatientMedicalHistoryOut | null> {
    return this.http.get<PatientMedicalHistoryOut | null>(
      `${this.baseUrl}/${patientId}/medical-history`
    );
  }

  upsertMedicalHistory(
    patientId: number,
    payload: PatientMedicalHistoryUpdate
  ): Observable<PatientMedicalHistoryOut> {
    return this.http.put<PatientMedicalHistoryOut>(
      `${this.baseUrl}/${patientId}/medical-history`,
      payload
    );
  }

  getLatestVitals(patientId: number): Observable<VitalsOut | null> {
    return this.http.get<VitalsOut | null>(
      `${this.baseUrl}/${patientId}/vitals/latest`
    );
  }

  createVitals(
    patientId: number,
    payload: VitalsCreate
  ): Observable<VitalsOut> {
    return this.http.post<VitalsOut>(
      `${this.baseUrl}/${patientId}/vitals`,
      payload
    );
  }
}
