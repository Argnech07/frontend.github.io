import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientService } from '../../../services/patient.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'admin-configuracion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-configuracion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminConfiguracion {
  private patientsApi = inject(PatientService);

  apiOffline = signal(false);
  loading = signal(false);
  patientsCount = signal<number>(0);
  lastUpdated = signal<string>('—');
  apiUrl = signal(environment.apiUrl);

  constructor() {
    this.refresh();
  }

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);

    this.patientsApi.count().subscribe({
      next: (res) => {
        this.apiOffline.set(false);
        this.patientsCount.set(res.count ?? 0);
        this.lastUpdated.set(new Date().toLocaleString('es-MX'));
        this.loading.set(false);
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar configuración:', err);
        this.lastUpdated.set(new Date().toLocaleString('es-MX'));
        this.loading.set(false);
      },
    });
  }
}
