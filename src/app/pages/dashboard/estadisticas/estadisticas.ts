import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PatientService } from '../../../services/patient.service';
import { AppointmentsService } from '../../../services/appointments.service';
import { PatientClinicalService } from '../../../services/patient-clinical.service';
import { environment } from '../../../../environments/environment';
import { catchError, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'dashboard-estadisticas',
  standalone: true,
  templateUrl: './estadisticas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardEstadisticas {
  private patientsApi = inject(PatientService);
  private appointmentsApi = inject(AppointmentsService);
  private clinicalApi = inject(PatientClinicalService);

  apiOffline = signal(false);
  loading = signal(false);

  patientsCount = signal<number>(0);
  activePatientsCount = signal<number>(0);
  todayAppointmentsCount = signal<number>(0);

  diabetesCount = signal<number>(0);
  highBloodPressureCount = signal<number>(0);
  lowBloodPressureCount = signal<number>(0);

  lastUpdated = signal<string>('—');
  apiUrl = signal(environment.apiUrl);

  constructor() {
    this.refresh();
  }

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    let pendingDone = 0;
    const done = () => {
      pendingDone += 1;
      if (pendingDone >= 4) {
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

    this.appointmentsApi.count({ start_date: isoDate, end_date: isoDate }).subscribe({
      next: (res) => {
        this.apiOffline.set(false);
        this.todayAppointmentsCount.set(res.count ?? 0);
        done();
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar citas del día:', err);
        this.todayAppointmentsCount.set(0);
        done();
      },
    });

    // Estadísticas clínicas (diabetes / presión alta-baja) según últimos signos vitales
    this.patientsApi.listBasic({ limit: 1000 }).subscribe({
      next: (patients) => {
        this.apiOffline.set(false);

        const vitalsCalls = (patients ?? []).map((p) =>
          this.clinicalApi.getLatestVitals(p.id).pipe(catchError(() => of(null)))
        );

        const historyCalls = (patients ?? []).map((p) =>
          this.clinicalApi.getMedicalHistory(p.id).pipe(catchError(() => of(null)))
        );

        if (vitalsCalls.length === 0) {
          this.diabetesCount.set(0);
          this.highBloodPressureCount.set(0);
          this.lowBloodPressureCount.set(0);
          done();
          return;
        }

        forkJoin([forkJoin(vitalsCalls), forkJoin(historyCalls)])
          .pipe(
            map(([allVitals, allHistories]) => {
              const highSys = 140;
              const highDia = 90;
              const lowSys = 90;
              const lowDia = 60;

              let diabetes = 0;
              let highBp = 0;
              let lowBp = 0;

              const diabetesRegex = /\bdiabetes\b/i;

              for (const h of allHistories ?? []) {
                const chronic = String((h as any)?.personal_habits?.chronic_diseases ?? '').trim();
                if (chronic && diabetesRegex.test(chronic)) {
                  diabetes += 1;
                }
              }

              for (const v of allVitals) {
                if (!v) continue;

                if (
                  (v.systolic != null && v.systolic >= highSys) ||
                  (v.diastolic != null && v.diastolic >= highDia)
                ) {
                  highBp += 1;
                }

                if (
                  (v.systolic != null && v.systolic < lowSys) ||
                  (v.diastolic != null && v.diastolic < lowDia)
                ) {
                  lowBp += 1;
                }
              }

              return { diabetes, highBp, lowBp };
            })
          )
          .subscribe({
            next: ({ diabetes, highBp, lowBp }) => {
              this.diabetesCount.set(diabetes);
              this.highBloodPressureCount.set(highBp);
              this.lowBloodPressureCount.set(lowBp);
              done();
            },
            error: (err) => {
              if (err?.status === 0) this.apiOffline.set(true);
              console.error('Error al calcular estadísticas clínicas:', err);
              this.diabetesCount.set(0);
              this.highBloodPressureCount.set(0);
              this.lowBloodPressureCount.set(0);
              done();
            },
          });
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar lista de pacientes (estadísticas clínicas):', err);
        this.diabetesCount.set(0);
        this.highBloodPressureCount.set(0);
        this.lowBloodPressureCount.set(0);
        done();
      },
    });
  }
}
