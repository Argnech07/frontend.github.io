import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PatientService } from '../../../services/patient.service';
import { StudyOrdersService } from '../../../services/study-orders.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'admin-reportes',
  standalone: true,
  templateUrl: './admin-reportes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminReportes {
  private patientsApi = inject(PatientService);
  private studyOrdersApi = inject(StudyOrdersService);

  apiOffline = signal(false);
  loading = signal(false);

  patientsCount = signal<number>(0);
  activePatientsCount = signal<number>(0);
  pendingStudyOrdersCount = signal<number>(0);

  lastUpdated = signal<string>('—');
  apiUrl = signal(environment.apiUrl);

  constructor() {
    this.refresh();
  }

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);

    let pendingDone = 0;
    const done = () => {
      pendingDone += 1;
      if (pendingDone >= 3) {
        this.lastUpdated.set(new Date().toLocaleString('es-MX'));
        this.loading.set(false);
      }
    };

    this.patientsApi.count().subscribe({
      next: (res) => {
        this.apiOffline.set(false);
        this.patientsCount.set(res.count ?? 0);
        done();
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar conteo de pacientes:', err);
        done();
      },
    });

    this.patientsApi.count({ is_active: true }).subscribe({
      next: (res) => {
        this.apiOffline.set(false);
        this.activePatientsCount.set(res.count ?? 0);
        done();
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar conteo de pacientes activos:', err);
        done();
      },
    });

    this.studyOrdersApi.getPendingOrders(0, 50).subscribe({
      next: (orders) => {
        this.apiOffline.set(false);
        this.pendingStudyOrdersCount.set(orders?.length ?? 0);
        done();
      },
      error: (err) => {
        if (err?.status === 0) {
          this.apiOffline.set(true);
          console.error('Error al cargar órdenes pendientes:', err);
          this.pendingStudyOrdersCount.set(0);
          done();
          return;
        }

        // Si el endpoint /pending requiere permisos (401/403) o no existe (404),
        // hacemos fallback al listado general para mostrar al menos el conteo.
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
          this.studyOrdersApi.getAll(0, 50).subscribe({
            next: (orders) => {
              this.apiOffline.set(false);
              this.pendingStudyOrdersCount.set(orders?.length ?? 0);
              done();
            },
            error: (err2) => {
              if (err2?.status === 0) this.apiOffline.set(true);
              console.error('Error al cargar órdenes (fallback):', err2);
              this.pendingStudyOrdersCount.set(0);
              done();
            },
          });
          return;
        }

        console.error('Error al cargar órdenes pendientes:', err);
        this.pendingStudyOrdersCount.set(0);
        done();
      },
    });
  }
}
