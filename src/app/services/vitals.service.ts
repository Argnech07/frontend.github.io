import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VitalsCreate, VitalsOut } from '../models/vitals';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VitalsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/patients`;

  latest = signal<VitalsOut | null>(null);

  getLatest(patientId: number): Observable<VitalsOut | null> {
    return this.http.get<VitalsOut | null>(`${this.base}/${patientId}/vitals/latest`);
  }

  loadLatest(patientId: number) {
    this.http
      .get<VitalsOut | null>(`${this.base}/${patientId}/vitals/latest`)
      .subscribe((v) => this.latest.set(v));
  }

  create(patientId: number, payload: VitalsCreate) {
    return this.http.post<VitalsOut>(
      `${this.base}/${patientId}/vitals`,
      payload
    );
  }

  update(patientId: number, vitalsId: number, payload: Partial<VitalsCreate>) {
    return this.http.put<VitalsOut>(
      `${this.base}/${patientId}/vitals/${vitalsId}`,
      payload
    );
  }
}
