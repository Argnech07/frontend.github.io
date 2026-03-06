import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorService } from '../../../services/doctor.service';
import { DoctorInfo } from '../../../models/docotor.model';
import { FullNamePipePipe } from '../../../pipes/full-name-pipe';

@Component({
  selector: 'admin-doctores',
  standalone: true,
  imports: [CommonModule, FullNamePipePipe],
  templateUrl: './admin-doctores.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminDoctores {
  private doctorsApi = inject(DoctorService);

  apiOffline = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  doctors = signal<DoctorInfo[]>([]);

  search = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  filteredDoctors = computed(() => {
    const term = this.search().toLowerCase().trim();
    const status = this.statusFilter();

    return this.doctors().filter((d) => {
      const full = `${d.first_name} ${d.middle_name ?? ''} ${d.last_name}`
        .toLowerCase()
        .trim();
      const matchesTerm = !term || full.includes(term) || d.email.toLowerCase().includes(term);

      const matchesStatus =
        status === 'all' || (status === 'active' ? d.is_active : !d.is_active);

      return matchesTerm && matchesStatus;
    });
  });

  togglingIds = signal<Set<number>>(new Set());

  constructor() {
    this.refresh();
  }

  refresh() {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.doctorsApi.listDoctors(0, 200).subscribe({
      next: (list: DoctorInfo[]) => {
        this.apiOffline.set(false);
        this.doctors.set(list);
      },
      error: (err: any) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar doctores:', err);
        this.error.set('No se pudieron cargar los doctores');
      },
      complete: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string) {
    this.search.set(value);
  }

  onStatusFilterChange(value: string) {
    if (value === 'active' || value === 'inactive' || value === 'all') {
      this.statusFilter.set(value);
    }
  }

  isToggling(id: number): boolean {
    return this.togglingIds().has(id);
  }

  toggleAccess(doc: DoctorInfo, allow: boolean) {
    if (this.isToggling(doc.id)) return;

    const next = new Set(this.togglingIds());
    next.add(doc.id);
    this.togglingIds.set(next);

    this.doctorsApi.updateDoctor(doc.id, { is_active: allow }).subscribe({
      next: (updated: DoctorInfo) => {
        const list = this.doctors().map((d) => (d.id === doc.id ? updated : d));
        this.doctors.set(list);
      },
      error: (err: any) => {
        console.error('Error al actualizar doctor:', err);
        this.error.set('No se pudo actualizar el acceso del doctor');
      },
      complete: () => {
        const s = new Set(this.togglingIds());
        s.delete(doc.id);
        this.togglingIds.set(s);
      },
    });
  }
}
