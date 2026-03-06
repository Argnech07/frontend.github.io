import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { StudyOrdersService } from '../../../services/study-orders.service';
import { StudyItemsService } from '../../../services/study-items.service';
import { StudyOrderFull } from '../../../models/study-order.model';
import { StudyItemOut } from '../../../models/study-item.model';
import { ItemDatePipe } from '../../../pipes/item-date-pipe';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'study-oreders-viewer',
  imports: [CommonModule, PdfViewerModule, ItemDatePipe],
  templateUrl: './study-oreders-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyOredersViewer {
  private ordersApi = inject(StudyOrdersService);
  private itemsApi = inject(StudyItemsService);

  orderId = input<number | null>(null);
  selectedItemId = input<number | null>(null);

  studyOrderFull = signal<StudyOrderFull | null>(null);
  selectedStudyItem = signal<StudyItemOut | null>(null);
  loading = signal(false);
  uploading = signal(false);

  selectedFile: File | null = null;
  selectedFileObjectUrl = signal<string | null>(null);

  constructor() {
    // Cargar datos cuando cambie orderId
    effect(() => {
      const id = this.orderId();
      if (id !== null) {
        this.loadStudyOrderFull(id);
      } else {
        this.studyOrderFull.set(null);
        this.selectedStudyItem.set(null);
      }
    });

    // Seleccionar item cuando cambie selectedItemId
    effect(() => {
      const itemId = this.selectedItemId();
      const orderFull = this.studyOrderFull();
      if (itemId !== null && orderFull) {
        const item = orderFull.items.find((i) => i.id === itemId);
        if (item) {
          this.selectedStudyItem.set(item);
        }
      } else if (itemId === null) {
        this.selectedStudyItem.set(null);
      }
    });
  }

  loadStudyOrderFull(orderId: number): void {
    this.loading.set(true);
    this.ordersApi.getStudyOrderFull(orderId).subscribe({
      next: (orderFull) => {
        console.log('Study order full cargado:', orderFull);
        // Log para verificar URLs de los items
        orderFull.items.forEach((item) => {
          console.log(`Study item ${item.id} - URL:`, item.url);
        });
        this.studyOrderFull.set(orderFull);
        this.loading.set(false);

        // Al cambiar de orden, limpiar cualquier archivo local seleccionado
        this.clearFile();

        // Si hay un selectedItemId, seleccionar ese item automáticamente
        const itemId = this.selectedItemId();
        if (itemId !== null) {
          const item = orderFull.items.find((i) => i.id === itemId);
          if (item) {
            console.log('Item seleccionado automáticamente:', item);
            console.log('URL del item seleccionado:', item.url);
            this.selectedStudyItem.set(item);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar study order full:', err);
        console.error('Detalles del error:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
        });
        this.loading.set(false);

        // Mostrar mensaje de error al usuario
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

  canUploadPdf(studyItem: StudyItemOut): boolean {
    return (
      studyItem.status === 'pending' ||
      studyItem.status === 'approved' ||
      studyItem.status === 'completed'
    );
  }

  selectStudyItem(item: StudyItemOut): void {
    this.selectedStudyItem.set(item);
    this.clearFile();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        alert('Por favor, seleccione un archivo PDF');
        input.value = '';
        return;
      }

      // Validar tamaño (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      if (file.size > maxSize) {
        alert('El archivo no debe exceder 10MB');
        input.value = '';
        return;
      }

      this.selectedFile = file;
      const objectUrl = URL.createObjectURL(file);
      this.selectedFileObjectUrl.set(objectUrl);
      input.value = '';
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    const prev = this.selectedFileObjectUrl();
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    this.selectedFileObjectUrl.set(null);
  }

  uploadPdf(studyItemId: number, file: File): void {
    const studyItem = this.studyOrderFull()?.items.find(
      (item) => item.id === studyItemId
    );

    if (!studyItem) {
      console.error('Study item no encontrado');
      return;
    }

    // Verificar que se puede subir PDF
    if (!this.canUploadPdf(studyItem)) {
      alert(
        'No se puede subir PDF. El estudio debe estar aprobado o completado.'
      );
      return;
    }

    this.uploading.set(true);

    // Subir el archivo
    this.itemsApi.uploadFile(file, studyItemId).subscribe({
      next: (response) => {
        // Actualizar el study item con la URL y fecha actual
        const today = new Date().toISOString().slice(0, 10);
        const updatePayload = {
          url: response.url,
          document_date: today,
        };

        // Actualizar en el backend
        this.itemsApi.updateStudyItem(studyItemId, updatePayload).subscribe({
          next: (updatedItem) => {
            // Actualizar studyOrderFull localmente
            const currentOrder = this.studyOrderFull();
            if (currentOrder) {
              const updatedItems = currentOrder.items.map((item) =>
                item.id === studyItemId ? updatedItem : item
              );
              this.studyOrderFull.set({
                ...currentOrder,
                items: updatedItems,
              });

              // Actualizar selectedStudyItem si es el mismo
              if (this.selectedStudyItem()?.id === studyItemId) {
                this.selectedStudyItem.set(updatedItem);
              }
            }

            this.uploading.set(false);
            this.clearFile();
            alert('PDF subido exitosamente');
          },
          error: (err) => {
            console.error('Error al actualizar study item:', err);
            this.uploading.set(false);
            alert(
              `Error al actualizar el estudio: ${
                err.error?.detail || err.message || 'Error desconocido'
              }`
            );
          },
        });
      },
      error: (err) => {
        console.error('Error al subir archivo:', err);
        this.uploading.set(false);
        alert(
          `Error al subir el archivo: ${
            err.error?.detail || err.message || 'Error desconocido'
          }`
        );
      },
    });
  }

  uploadSelectedFile(): void {
    const item = this.selectedStudyItem();
    if (!item) return;
    if (!this.selectedFile) {
      alert('Seleccione un archivo PDF antes de guardar');
      return;
    }

    this.uploadPdf(item.id, this.selectedFile);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobado';
      case 'completed':
        return 'Completado';
      default:
        return status;
    }
  }

  getPdfUrl(url: string | null): string | null {
    if (!url) {
      console.log('getPdfUrl: URL es null o undefined');
      return null;
    }

    console.log('getPdfUrl: URL recibida:', url);

    // Si la URL ya es completa, retornarla tal cual
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('getPdfUrl: URL completa, retornando:', url);
      return url;
    }

    // Si la URL ya incluye /files/study-items/, usar la URL completa del backend
    if (url.startsWith('/files/study-items/')) {
      const fullUrl = `${environment.apiUrl}${url}`;
      console.log('getPdfUrl: URL relativa con /files/, retornando:', fullUrl);
      return fullUrl;
    }

    // Si es solo el nombre del archivo, construir la ruta completa
    // El backend espera: /files/study-items/{filename}
    const filename = url.split('/').pop() || url;
    const fullUrl = `${environment.apiUrl}/files/study-items/${filename}`;
    console.log(
      'getPdfUrl: Construyendo URL desde filename, retornando:',
      fullUrl
    );
    return fullUrl;
  }

  openPdfInNewWindow(url: string | null): void {
    const pdfUrl = this.getPdfUrl(url);
    if (pdfUrl) {
      // Abrir PDF en nueva ventana/pestaña
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
