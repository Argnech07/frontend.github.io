import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cie10Diagnosis } from '../models/cie10.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Cie10Service {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/cie10-diagnoses`;

  listAll(skip = 0, limit = 5000): Observable<Cie10Diagnosis[]> {
    return this.http.get<Cie10Diagnosis[]>(`${this.baseUrl}/`, {
      params: { skip, limit },
    });
  }
}
