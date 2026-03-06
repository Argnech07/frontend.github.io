import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PrescriptionCreate, PrescriptionOut, PrescriptionUpdate } from '../models/treatment.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/prescriptions`;

  create(payload: PrescriptionCreate): Observable<PrescriptionOut> {
    return this.http.post<PrescriptionOut>(`${this.baseUrl}/`, payload);
  }

  getOne(id: number): Observable<PrescriptionOut> {
    return this.http.get<PrescriptionOut>(`${this.baseUrl}/${id}`);
  }

  update(id: number, payload: PrescriptionUpdate): Observable<PrescriptionOut> {
    return this.http.put<PrescriptionOut>(`${this.baseUrl}/${id}`, payload);
  }

  generateAndSavePdf(prescriptionId: number): Observable<{ success: boolean; message: string; folio: string; pdf_path: string; pdf_url: string }> {
    return this.http.post<{ success: boolean; message: string; folio: string; pdf_path: string; pdf_url: string }>(
      `${this.baseUrl}/generate-pdf/${prescriptionId}`,
      {}
    );
  }
}
