import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { PatientService } from '../../../services/patient.service';
import { StudyOrdersService } from '../../../services/study-orders.service';
import { DoctorService } from '../../../services/doctor.service';
import { Patient } from '../../../models/patient';
import { StudyOrderOut, StudyOrderFull } from '../../../models/study-order.model';
import { DoctorInfo } from '../../../models/docotor.model';
import { FullNamePipePipe } from '../../../pipes/full-name-pipe';

@Component({
  selector: 'admin-usuarios',
  standalone: true,
  imports: [FullNamePipePipe],
  templateUrl: './admin-usuarios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminUsuarios {
  private patientsApi = inject(PatientService);
  private studyOrdersApi = inject(StudyOrdersService);
  private doctorApi = inject(DoctorService);

  apiOffline = signal(false);

  patients = signal<Patient[]>([]);
  totalCount = signal(0);

  pageSize = 10;
  currentPage = signal(1);
  search = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Study orders
  pendingStudyOrders = signal<StudyOrderOut[]>([]);
  selectedStudyOrder = signal<StudyOrderFull | null>(null);
  loadingStudyOrder = signal(false);
  approvingOrder = signal(false);
  patientsMap = signal<Map<number, Patient>>(new Map());
  doctorsMap = signal<Map<number, DoctorInfo>>(new Map());

  // selección múltiple
  private _selectedIds = signal<Set<number>>(new Set());
  selectedIds = this._selectedIds.asReadonly();

  constructor() {
    effect(() => {
      const term = this.search();
      const page = this.currentPage();
      const status = this.statusFilter();
      this.loadPage(term, page, status);
    });

    // Cargar órdenes pendientes al iniciar
    this.loadPendingStudyOrders();
  }

  private loadPage(
    searchTerm: string = '',
    page: number = 1,
    status: 'all' | 'active' | 'inactive' = 'all'
  ) {
    const skip = (page - 1) * this.pageSize;
    const limit = this.pageSize;

    const isActiveFilter = status === 'all' ? undefined : status === 'active';

    const listOptions: {
      skip: number;
      limit: number;
      search?: string;
      is_active?: boolean;
    } = {
      skip,
      limit,
    };

    if (searchTerm) {
      listOptions.search = searchTerm;
    }

    if (status !== 'all') {
      listOptions.is_active = isActiveFilter;
    }

    this.patientsApi.list(listOptions).subscribe({
      next: (list) => {
        this.apiOffline.set(false);
        this.patients.set(list);
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar pacientes:', err);
      },
    });

    const countOptions: { search?: string; is_active?: boolean } = {};
    if (searchTerm) {
      countOptions.search = searchTerm;
    }
    if (status !== 'all') {
      countOptions.is_active = isActiveFilter;
    }

    this.patientsApi.count(countOptions).subscribe({
      next: (res) => {
        this.apiOffline.set(false);
        this.totalCount.set(res.count);
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al contar pacientes:', err);
      },
    });

    this._selectedIds.set(new Set());
  }

  onSearchChange(value: string) {
    this.currentPage.set(1);
    this.search.set(value.trim());
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive') {
    this.currentPage.set(1);
    this.statusFilter.set(status);
  }

  filteredPatients = computed(() => this.patients());

  canPrev = computed(() => this.currentPage() > 1);
  canNext = computed(
    () => this.currentPage() * this.pageSize < this.totalCount()
  );

  prevPage() {
    if (!this.canPrev()) return;
    this.currentPage.update((p) => p - 1);
  }

  nextPage() {
    if (!this.canNext()) return;
    this.currentPage.update((p) => p + 1);
  }

  isSelected(id: number): boolean {
    return this._selectedIds().has(id);
  }

  allSelected = computed(() => {
    const list = this.filteredPatients();
    if (!list.length) return false;
    const selected = this._selectedIds();
    return list.every((p) => selected.has(p.id));
  });

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const list = this.filteredPatients();
    const current = new Set(this._selectedIds());
    if (checked) {
      list.forEach((p) => current.add(p.id));
    } else {
      list.forEach((p) => current.delete(p.id));
    }
    this._selectedIds.set(current);
  }

  togglePatientSelection(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this._selectedIds());
    if (checked) {
      current.add(id);
    } else {
      current.delete(id);
    }
    this._selectedIds.set(current);
  }

  isToggling = signal(false);

  shouldActivate = computed(() => {
    const selected = this._selectedIds();
    if (selected.size === 0) return false;

    const list = this.patients();
    const selectedPatients = list.filter((p) => selected.has(p.id));

    if (selectedPatients.length === 0) return false;

    const inactiveCount = selectedPatients.filter((p) => !p.is_active).length;
    return inactiveCount > selectedPatients.length / 2;
  });

  toggleSelectedPatients() {
    const ids = Array.from(this._selectedIds());
    if (!ids.length) return;

    this.isToggling.set(true);

    const requests = ids.map((id) => this.patientsApi.toggleActive(id));

    let completed = 0;
    const total = requests.length;

    requests.forEach((request) => {
      request.subscribe({
        next: (updatedPatient) => {
          this.patients.update((list) =>
            list.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
          );
          completed++;
          if (completed === total) {
            this.isToggling.set(false);
            this._selectedIds.set(new Set());
          }
        },
        error: (err) => {
          console.error('Error al cambiar estado del paciente:', err);
          completed++;
          if (completed === total) {
            this.isToggling.set(false);
            alert(
              err.error?.detail ||
                'Error al cambiar el estado de algunos pacientes. Por favor, intenta nuevamente.'
            );
          }
        },
      });
    });
  }

  loadPendingStudyOrders(): void {
    const userType = localStorage.getItem('user_type');
    if (userType !== 'admin') {
      this.studyOrdersApi.getAll(0, 50).subscribe({
        next: (allOrders) => {
          this.apiOffline.set(false);
          this.pendingStudyOrders.set(allOrders);
          if (allOrders.length > 0) {
            this.loadPatientsAndDoctors(allOrders);
          }
        },
        error: (err2) => {
          if (err2?.status === 0) this.apiOffline.set(true);
          console.error('Error al cargar todas las órdenes:', err2);
        },
      });
      return;
    }

    this.studyOrdersApi.getPendingOrders(0, 50).subscribe({
      next: (orders) => {
        this.apiOffline.set(false);
        this.pendingStudyOrders.set(orders);
        if (orders.length > 0) {
          this.loadPatientsAndDoctors(orders);
        }
      },
      error: (err) => {
        if (err?.status === 0) this.apiOffline.set(true);
        console.error('Error al cargar órdenes pendientes:', err);
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          this.studyOrdersApi.getAll(0, 50).subscribe({
            next: (allOrders) => {
              this.apiOffline.set(false);
              this.pendingStudyOrders.set(allOrders);
              if (allOrders.length > 0) {
                this.loadPatientsAndDoctors(allOrders);
              }
            },
            error: (err2) => {
              if (err2?.status === 0) this.apiOffline.set(true);
              console.error('Error al cargar todas las órdenes:', err2);
            },
          });
        }
      },
    });
  }

  loadPatientsAndDoctors(orders: StudyOrderOut[]): void {
    const patientIds = new Set<number>();
    const doctorIds = new Set<number>();

    orders.forEach((order) => {
      patientIds.add(order.patient_id);
      doctorIds.add(order.doctor_id);
    });

    Array.from(patientIds).forEach((patientId) => {
      if (!this.patientsMap().has(patientId)) {
        this.patientsApi.getOne(patientId).subscribe({
          next: (patient) => {
            const currentMap = new Map(this.patientsMap());
            currentMap.set(patientId, patient);
            this.patientsMap.set(currentMap);
          },
          error: (err) => {
            console.error(`Error al cargar paciente ${patientId}:`, err);
          },
        });
      }
    });

    Array.from(doctorIds).forEach((doctorId) => {
      if (!this.doctorsMap().has(doctorId)) {
        this.doctorApi.getDoctorById(doctorId).subscribe({
          next: (doctor) => {
            const currentMap = new Map(this.doctorsMap());
            currentMap.set(doctorId, doctor);
            this.doctorsMap.set(currentMap);
          },
          error: (err) => {
            console.error(`Error al cargar doctor ${doctorId}:`, err);
          },
        });
      }
    });
  }

  getPatientName(order: StudyOrderOut): string {
    const patient = this.patientsMap().get(order.patient_id);
    if (!patient) {
      if (!this.patientsMap().has(order.patient_id)) {
        this.patientsApi.getOne(order.patient_id).subscribe({
          next: (p) => {
            const currentMap = new Map(this.patientsMap());
            currentMap.set(order.patient_id, p);
            this.patientsMap.set(currentMap);
          },
          error: (err) => {
            console.error(`Error al cargar paciente ${order.patient_id}:`, err);
          },
        });
      }
      return 'Cargando...';
    }
    return `${patient.first_name} ${patient.middle_name || ''} ${
      patient.last_name
    }`.trim();
  }

  getDoctorName(order: StudyOrderOut): string {
    const doctor = this.doctorsMap().get(order.doctor_id);
    if (!doctor) {
      if (!this.doctorsMap().has(order.doctor_id)) {
        this.doctorApi.getDoctorById(order.doctor_id).subscribe({
          next: (d) => {
            const currentMap = new Map(this.doctorsMap());
            currentMap.set(order.doctor_id, d);
            this.doctorsMap.set(currentMap);
          },
          error: (err) => {
            console.error(`Error al cargar doctor ${order.doctor_id}:`, err);
          },
        });
      }
      return 'Cargando...';
    }
    return `Dr. ${doctor.first_name} ${doctor.middle_name || ''} ${
      doctor.last_name
    }`.trim();
  }

  viewStudyOrderDetails(orderId: number): void {
    const current = this.selectedStudyOrder();
    if (current && current.id === orderId && !this.loadingStudyOrder()) {
      this.selectedStudyOrder.set(null);
      return;
    }

    this.loadingStudyOrder.set(true);
    this.studyOrdersApi.getStudyOrderFull(orderId).subscribe({
      next: (orderFull) => {
        this.selectedStudyOrder.set(orderFull);
        this.loadingStudyOrder.set(false);
        if (!this.patientsMap().has(orderFull.patient_id)) {
          this.patientsApi.getOne(orderFull.patient_id).subscribe({
            next: (patient) => {
              const currentMap = new Map(this.patientsMap());
              currentMap.set(orderFull.patient_id, patient);
              this.patientsMap.set(currentMap);
            },
            error: (err) => {
              console.error('Error al cargar paciente:', err);
            },
          });
        }
        if (!this.doctorsMap().has(orderFull.doctor_id)) {
          this.doctorApi.getDoctorById(orderFull.doctor_id).subscribe({
            next: (doctor) => {
              const currentMap = new Map(this.doctorsMap());
              currentMap.set(orderFull.doctor_id, doctor);
              this.doctorsMap.set(currentMap);
            },
            error: (err) => {
              console.error('Error al cargar doctor:', err);
            },
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar detalles de la orden:', err);
        this.loadingStudyOrder.set(false);
        alert(
          `Error al cargar los estudios: ${
            err.error?.detail || err.message || 'Error desconocido'
          }`
        );
      },
    });
  }

  approveStudyOrder(orderId: number): void {
    if (this.approvingOrder()) return;

    if (
      !confirm('¿Está seguro de que desea aprobar esta solicitud de estudios?')
    ) {
      return;
    }

    this.approvingOrder.set(true);
    this.studyOrdersApi.approveOrder(orderId).subscribe({
      next: (approvedOrder) => {
        this.selectedStudyOrder.set(approvedOrder);
        this.loadPendingStudyOrders();
        this.approvingOrder.set(false);
        alert('¡Estudios aprobados exitosamente!');
      },
      error: (err) => {
        console.error('Error al aprobar la orden:', err);
        this.approvingOrder.set(false);
        alert(
          `Error al aprobar los estudios: ${
            err.error?.detail || err.message || 'Error desconocido'
          }`
        );
      },
    });
  }

  getOrderReason(order: StudyOrderOut): string {
    const full = this.selectedStudyOrder();
    if (full && full.id === order.id && full.items.length > 0) {
      return full.items[0].reason || 'Sin razón especificada';
    }
    return 'Haz clic en "Ver estudios" para ver los detalles';
  }

  formatOrderDate(date: string | null): string {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  }
}
