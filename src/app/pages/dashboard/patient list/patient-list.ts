import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { RegisterPatient } from '../../../share/forms/patient-forms/register-patient/register-patient';
import { FullNamePipePipe } from '../../../pipes/full-name-pipe';
import { PatientService } from '../../../services/patient.service';
import { Patient } from '../../../models/patient';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [RegisterPatient, FullNamePipePipe],
  templateUrl: './patient-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PatientList {
  private patientsApi = inject(PatientService);
  private router = inject(Router);

  showRegisterPatient = signal(false);
  showFilterMenu = signal(false);
  editMode = signal(false);

  showConfirmToggle = signal(false);
  confirmPatient = signal<Patient | null>(null);
  confirmNextActive = signal<boolean>(true);
  confirmGroupCount = signal<number>(1);
  actionError = signal<string | null>(null);

  patients = signal<Patient[]>([]);
  totalCount = signal(0);

  pageSize = 10;
  currentPage = signal(1); // 1-based
  search = signal('');
  employeeNumber = signal('');
  workerTypeFilter = signal<'Todos' | 'Derechohabiente' | 'Dependiente'>('Todos');
  statusFilter = signal<'Todos' | 'Activos' | 'Inactivos'>('Todos');

  isWorkerTypeFilterActive = computed(() => this.workerTypeFilter() !== 'Todos');
  isEmployeeNumberFilterActive = computed(() => !!this.employeeNumber().trim());
  isStatusFilterActive = computed(() => this.statusFilter() !== 'Todos');

  constructor() {
    // cargar primera página
    this.loadPage();

    // si cambia búsqueda o página, recargar
    effect(() => {
      const term = this.search();
      const page = this.currentPage();
      this.loadPage(term, page);
    });
  }

  displayName(p: Patient): string {
    const first = (p.first_name || '').trim();
    const middle = ((p as any).middle_name || '').trim();
    const last = (p.last_name || '').trim();
    return [first, middle, last].filter(Boolean).join(' ') || 'Usuario';
  }

  private loadPage(searchTerm: string = '', page: number = 1) {
    const filterActive =
      this.isWorkerTypeFilterActive() ||
      this.isEmployeeNumberFilterActive() ||
      this.isStatusFilterActive();
    if (filterActive) {
      const effectiveSearch = this.isEmployeeNumberFilterActive()
        ? ''
        : searchTerm;
      this.loadAllPatients(effectiveSearch);
      return;
    }

    const skip = (page - 1) * this.pageSize;
    const limit = this.pageSize;

    this.patientsApi
      .list({ skip, limit, search: searchTerm || undefined })
      .subscribe({
        next: (list) => this.patients.set(list),
      });

    this.patientsApi.count({ search: searchTerm || undefined }).subscribe({
      next: (res) => this.totalCount.set(res.count),
    });
  }

  private loadAllPatients(searchTerm: string = '') {
    const batchSize = 100; // backend limita a 100
    const all: Patient[] = [];

    const fetchBatch = (skip: number) => {
      this.patientsApi
        .list({ skip, limit: batchSize, search: searchTerm || undefined })
        .subscribe({
          next: (list) => {
            all.push(...list);
            if (list.length === batchSize) {
              fetchBatch(skip + batchSize);
              return;
            }
            this.patients.set(all);
            this.totalCount.set(all.length);
          },
        });
    };

    fetchBatch(0);
  }

  openRegisterPatient() {
    this.showRegisterPatient.set(true);
  }

  toggleEditMode() {
    this.editMode.update((v) => !v);
    this.showFilterMenu.set(false);
  }

  closeRegisterPatient() {
    this.showRegisterPatient.set(false);
    // podrías recargar la página actual si se creó un nuevo paciente
    this.loadPage(this.search(), this.currentPage());
  }

  toggleFilterMenu() {
    this.showFilterMenu.update((v) => !v);
  }

  setWorkerTypeFilter(value: 'Todos' | 'Derechohabiente' | 'Dependiente') {
    this.workerTypeFilter.set(value);
    this.showFilterMenu.set(false);
    this.currentPage.set(1);
    this.loadPage(this.search(), 1);
  }

  toggleInactiveFilter() {
    this.statusFilter.update((v) => (v === 'Inactivos' ? 'Todos' : 'Inactivos'));
    this.showFilterMenu.set(false);
    this.currentPage.set(1);
    this.loadPage(this.search(), 1);
  }

  toggleActiveFilter() {
    this.statusFilter.update((v) => (v === 'Activos' ? 'Todos' : 'Activos'));
    this.showFilterMenu.set(false);
    this.currentPage.set(1);
    this.loadPage(this.search(), 1);
  }

  onSearchChange(value: string) {
    this.currentPage.set(1);
    const v = value.trim();
    this.search.set(v);
    if (this.employeeNumber()) {
      this.employeeNumber.set('');
    }
    this.loadPage(v, 1);
  }

  onEmployeeNumberChange(value: string) {
    this.currentPage.set(1);
    this.employeeNumber.set(value.trim());
    if (this.search()) {
      this.search.set('');
    }
    this.loadPage(this.search(), 1);
  }

  // navegación simple de páginas
  private isAnyFilterActive = computed(
    () =>
      this.isWorkerTypeFilterActive() ||
      this.isEmployeeNumberFilterActive() ||
      this.isStatusFilterActive()
  );

  canPrev = computed(() => !this.isAnyFilterActive() && this.currentPage() > 1);
  canNext = computed(
    () =>
      !this.isAnyFilterActive() &&
      this.currentPage() * this.pageSize < this.totalCount()
  );

  prevPage() {
    if (!this.canPrev()) return;
    this.currentPage.update((p) => p - 1);
  }

  nextPage() {
    if (!this.canNext()) return;
    this.currentPage.update((p) => p + 1);
  }

  filteredPatients = computed(() => {
    const list = this.patients();
    const filter = this.workerTypeFilter();
    const emp = this.employeeNumber().trim();
    const status = this.statusFilter();

    let result = list;

    if (filter !== 'Todos') {
      result = result.filter((p) => {
        const isDependiente = (p as any).worker_type === 'Dependiente';
        return filter === 'Dependiente' ? isDependiente : !isDependiente;
      });
    }

    if (emp) {
      result = result.filter((p) => {
        const originValue = String((p as any).origin ?? '').trim();
        return originValue === emp;
      });
    }

    if (status === 'Activos') {
      result = result.filter((p) => p.is_active);
    } else if (status === 'Inactivos') {
      result = result.filter((p) => !p.is_active);
    }

    return result;
  });

  requestTogglePatientActive(p: Patient, ev?: Event) {
    ev?.stopPropagation();
    const nextActive = !p.is_active;
    const origin = String((p as any).origin ?? '').trim();
    const isDependiente = (p as any).worker_type === 'Dependiente';

    if (nextActive && isDependiente && origin) {
      const head = this
        .patients()
        .find(
          (x) =>
            String((x as any).origin ?? '').trim() === origin &&
            (x as any).worker_type !== 'Dependiente'
        );
      if (head && !head.is_active) {
        this.actionError.set('Error: Derechohabiente deshabilitado');
        return;
      }
    }

    this.actionError.set(null);
    const groupCount =
      !isDependiente && origin
        ? this.patients().filter((x) => String((x as any).origin ?? '').trim() === origin)
            .length
        : 1;
    this.confirmPatient.set(p);
    this.confirmNextActive.set(nextActive);
    this.confirmGroupCount.set(groupCount);
    this.showConfirmToggle.set(true);
  }

  cancelTogglePatientActive() {
    this.showConfirmToggle.set(false);
    this.confirmPatient.set(null);
    this.confirmGroupCount.set(1);
  }

  clearActionError() {
    this.actionError.set(null);
  }

  confirmTogglePatientActive() {
    const p = this.confirmPatient();
    if (!p) return;
    const nextActive = this.confirmNextActive();
    this.showConfirmToggle.set(false);
    this.confirmPatient.set(null);
    this.confirmGroupCount.set(1);
    this.executeTogglePatientActive(p, nextActive);
  }

  private executeTogglePatientActive(p: Patient, nextActive: boolean) {
    const origin = String((p as any).origin ?? '').trim();
    const isDependiente = (p as any).worker_type === 'Dependiente';

    const affected =
      !isDependiente && origin
        ? this.patients().filter((x) => String((x as any).origin ?? '').trim() === origin)
        : [p];

    const previousStates = new Map<number, boolean>();
    for (const ap of affected) {
      previousStates.set(ap.id, ap.is_active);
    }

    this.patients.update((list) =>
      list.map((x) =>
        previousStates.has(x.id) ? ({ ...x, is_active: nextActive } as Patient) : x
      )
    );

    const requests = affected.map((ap) =>
      this.patientsApi.update(ap.id, { is_active: nextActive }).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(requests).subscribe((results) => {
      this.patients.update((list) =>
        list.map((x) => {
          const idx = affected.findIndex((a) => a.id === x.id);
          if (idx === -1) return x;

          const res = results[idx];
          if (res) return res;

          const prev = previousStates.get(x.id);
          return ({ ...x, is_active: prev ?? x.is_active } as Patient);
        })
      );
    });
  }

  selectPatient(p: Patient) {
    if (!p.is_active) return;
    this.patientsApi.setCurrentPatient(p.id);
    this.router.navigate(['/patient/patient-info']);
  }
}
