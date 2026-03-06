import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ConsultViewer } from '../../../share/components/consult-viewer/consult-viewer';
import { Visit } from '../../../models/visit.model';
import { PatientService } from '../../../services/patient.service';
import { VisitsService } from '../../../services/visits.service';
import { ItemDatePipe } from '../../../pipes/item-date-pipe';

@Component({
  selector: 'app-atention-history',
  imports: [ConsultViewer, ItemDatePipe],
  templateUrl: './atention-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AtentionHistory {
  private patientsApi = inject(PatientService);
  private visitsApi = inject(VisitsService);

  visits = signal<Visit[]>([]);
  selectedVisitId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  searchTerm = signal<string>('');

  filteredVisits = computed<Visit[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const all = this.visits();
    if (!term) return all;

    return all.filter((v) => {
      const rawDate = new Date(v.visit_ts).toLocaleDateString('es-ES');
      const idStr = String(v.id);
      return rawDate.toLowerCase().includes(term) || idStr.includes(term);
    });
  });

  constructor() {
    this.load();
  }

  load() {
    const patientId = this.patientsApi.currentPatientId();
    if (!patientId) {
      this.error.set('No hay paciente seleccionado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.visitsApi.listByPatient(patientId).subscribe({
      next: (list) => {
        const sorted = [...list].sort(
          (a, b) =>
            new Date(b.visit_ts).getTime() - new Date(a.visit_ts).getTime()
        );
        this.visits.set(sorted);

        if (sorted.length > 0 && this.selectedVisitId() == null) {
          this.selectedVisitId.set(sorted[0].id);
        }
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudieron cargar las visitas');
      },
      complete: () => this.loading.set(false),
    });
  }

  selectVisit(v: Visit) {
    this.selectedVisitId.set(v.id);
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }
}
