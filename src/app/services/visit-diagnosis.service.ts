import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  VisitDiagnosisCreate,
  VisitDiagnosisOut,
} from '../models/visit-diagnosis.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VisitDiagnosisService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/visit-diagnoses`;

  create(payload: VisitDiagnosisCreate): Observable<VisitDiagnosisOut> {
    return this.http.post<VisitDiagnosisOut>(`${this.baseUrl}/`, payload);
  }

  listByVisit(
    visitId: number,
    skip = 0,
    limit = 50
  ): Observable<VisitDiagnosisOut[]> {
    return this.http.get<VisitDiagnosisOut[]>(`${this.baseUrl}/`, {
      params: { visit_id: visitId, skip, limit },
    });
  }

  getByVisitId(visitId: number): Observable<VisitDiagnosisOut | null> {
    return this.http
      .get<VisitDiagnosisOut[]>(`${this.baseUrl}/`, {
        params: { visit_id: visitId, skip: 0, limit: 1 },
      })
      .pipe(map((list) => (list.length > 0 ? list[0] : null)));
  }
}
