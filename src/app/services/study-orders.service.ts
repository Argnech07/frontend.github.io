import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  StudyOrderCreate,
  StudyOrderOut,
  StudyOrderFull,
} from '../models/study-order.model';

@Injectable({ providedIn: 'root' })
export class StudyOrdersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/study-orders`;

  create(payload: StudyOrderCreate): Observable<StudyOrderOut> {
    return this.http.post<StudyOrderOut>(`${this.baseUrl}/`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getAll(skip: number = 0, limit: number = 50): Observable<StudyOrderOut[]> {
    return this.http.get<StudyOrderOut[]>(`${this.baseUrl}/`, {
      params: { skip, limit },
    });
  }

  listByPatient(patientId: number): Observable<StudyOrderOut[]> {
    return this.http.get<StudyOrderOut[]>(`${this.baseUrl}/`, {
      params: { patient_id: patientId },
    });
  }

  getOne(orderId: number): Observable<StudyOrderOut> {
    return this.http.get<StudyOrderOut>(`${this.baseUrl}/${orderId}`);
  }

  // Nuevo método
  getStudyOrderFull(orderId: number): Observable<StudyOrderFull> {
    return this.http.get<StudyOrderFull>(`${this.baseUrl}/${orderId}/full`);
  }

  /**
   * Obtiene todas las órdenes de estudios pendientes
   * (órdenes que tienen al menos un item con status 'pending')
   */
  getPendingOrders(skip: number = 0, limit: number = 50): Observable<StudyOrderOut[]> {
    return this.http.get<StudyOrderOut[]>(`${this.baseUrl}/pending`, {
      params: { skip, limit },
    });
  }

  /**
   * Aprueba todos los items pendientes de una orden de estudios
   * Actualiza el status de todos los items con status 'pending' a 'approved'
   */
  approveOrder(orderId: number): Observable<StudyOrderFull> {
    return this.http.post<StudyOrderFull>(`${this.baseUrl}/${orderId}/approve`, {});
  }
}
