import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MedicationOut } from '../models/medication.model';

@Injectable({ providedIn: 'root' })
export class MedicationsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/medications`;

  list(options?: { skip?: number; limit?: number }): Observable<MedicationOut[]> {
    let params = new HttpParams();
    if (options?.skip != null) {
      params = params.set('skip', String(options.skip));
    }
    if (options?.limit != null) {
      params = params.set('limit', String(options.limit));
    }
    return this.http.get<MedicationOut[]>(this.baseUrl, { params });
  }
}
