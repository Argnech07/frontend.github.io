import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitsService } from '../../../services/visits.service';
import { DiagnosisDetail, VisitFull } from '../../../models/visit';

@Component({
  selector: 'consult-viewer',
  imports: [CommonModule],
  templateUrl: './consult-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultViewer {
  visitId = input<number | null>(null);
  private visitsService = inject(VisitsService);
  private router = inject(Router);

  visitData = signal<VisitFull | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.visitId();
      if (id) {
        this.loadVisitData(id);
      } else {
        this.visitData.set(null);
        this.loading.set(false);
        this.error.set(null);
      }
    });
  }

  loadVisitData(visitId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.visitsService.getVisitFull(visitId).subscribe({
      next: (data) => {
        console.log('✅ Datos de visita cargados:', data);
        this.visitData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar datos de visita:', err);
        this.error.set('No se pudieron cargar los datos de la consulta');
        this.loading.set(false);
      },
    });
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getValue(
    value: string | null | undefined,
    fallback: string = 'Sin registro'
  ): string {
    return value?.trim() || fallback;
  }

  hasSecondaryDiagnoses(diagnosis: DiagnosisDetail): boolean {
    return (
      diagnosis.secondary_diagnoses && diagnosis.secondary_diagnoses.length > 0
    );
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editVisit(): void {
    const id = this.visitId();
    if (!id) return;
    this.router.navigate(['/new-atention'], {
      queryParams: { visit_id: id },
    });
  }
}
