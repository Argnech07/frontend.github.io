import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyOredersViewer } from '../../../share/components/study-oreders-viewer/study-oreders-viewer';
import { StudyItemsCard } from '../../../share/cards/study-items-card/study-items-card';
import { StudyOrdersService } from '../../../services/study-orders.service';
import { PatientService } from '../../../services/patient.service';
import {
  StudyOrderOut,
  StudyOrderFull,
} from '../../../models/study-order.model';
import { StudyItemOut } from '../../../models/study-item.model';
import { ItemDatePipe } from '../../../pipes/item-date-pipe';

@Component({
  selector: 'app-study-orders',
  imports: [CommonModule, StudyOredersViewer, StudyItemsCard, ItemDatePipe],
  templateUrl: './study-orders.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StudyOrders implements OnInit {
  private ordersApi = inject(StudyOrdersService);
  private patientSvc = inject(PatientService);

  studyOrders = signal<StudyOrderOut[]>([]);
  selectedOrderId = signal<number | null>(null);
  studyOrderFull = signal<StudyOrderFull | null>(null);
  selectedStudyItem = signal<StudyItemOut | null>(null);
  loading = signal(false);
  loadingOrder = signal(false);

  constructor() {
    // Cargar study order full cuando cambie selectedOrderId
    effect(() => {
      const orderId = this.selectedOrderId();
      if (orderId !== null) {
        this.loadStudyOrderFull(orderId);
      } else {
        this.studyOrderFull.set(null);
        this.selectedStudyItem.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.loadStudyOrders();
  }

  loadStudyOrders(): void {
    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) {
      console.warn('No hay paciente seleccionado');
      return;
    }

    this.loading.set(true);
    this.ordersApi.listByPatient(patientId).subscribe({
      next: (orders) => {
        console.log('Study orders cargados:', orders);
        this.studyOrders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar study orders:', err);
        console.error('Detalles del error:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
        });
        this.loading.set(false);

        if (err.status === 0) {
          console.error(
            'Error de CORS: El backend no permite peticiones desde este origen. Verifica que CORS_ORIGINS incluya http://localhost:4200'
          );
        }
      },
    });
  }

  selectOrder(orderId: number): void {
    this.selectedOrderId.set(orderId);
  }

  loadStudyOrderFull(orderId: number): void {
    this.loadingOrder.set(true);
    this.ordersApi.getStudyOrderFull(orderId).subscribe({
      next: (orderFull) => {
        console.log('Study order full cargado:', orderFull);
        this.studyOrderFull.set(orderFull);
        this.loadingOrder.set(false);
      },
      error: (err) => {
        console.error('Error al cargar study order full:', err);
        console.error('Detalles del error:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
        });
        this.loadingOrder.set(false);

        if (err.status === 0) {
          console.error(
            'Error de CORS: El backend no permite peticiones desde este origen. Verifica que CORS_ORIGINS incluya http://localhost:4200'
          );
        } else if (err.status === 404) {
          console.error('Orden de estudio no encontrada');
        } else {
          console.error(
            `Error ${err.status}: ${
              err.error?.detail || err.message || 'Error desconocido'
            }`
          );
        }
      },
    });
  }

  getTypeBadgeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'gabinete':
        return 'bg-blue-100 text-blue-800';
      case 'laboratorio':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'aprobado':
        return 'bg-blue-100 text-blue-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendiente',
      completed: 'Completado',
      approved: 'Aprobado',
      cancelled: 'Cancelado',
    };
    return statusMap[status.toLowerCase()] || status;
  }

  selectStudyItem(item: StudyItemOut): void {
    this.selectedStudyItem.set(item);
  }
}
