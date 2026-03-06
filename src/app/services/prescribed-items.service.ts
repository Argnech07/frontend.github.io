import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PrescribedItemCreate } from '../models/treatment.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrescribedItemsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/prescribed-items`;

  create(payload: PrescribedItemCreate) {
    return this.http.post(`${this.baseUrl}/`, payload);
  }

  listByPrescription(prescriptionId: number) {
    return this.http.get<unknown[]>(`${this.baseUrl}/`, {
      params: { prescription_id: prescriptionId },
    });
  }

  deleteByPrescription(prescriptionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/`, {
      params: { prescription_id: prescriptionId },
    });
  }

  replaceByPrescription(prescriptionId: number, items: PrescribedItemCreate[]): Observable<unknown[]> {
    return this.http.post<unknown[]>(`${this.baseUrl}/prescription/${prescriptionId}/replace`, items);
  }
}
