import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  StudyItemCreate,
  StudyItemOut,
  StudyItemUpdate,
} from '../models/study-item.model';

/**
 * Respuesta del servidor al subir un archivo PDF
 * El backend debe guardar el archivo en la carpeta Uploads/ y retornar la ruta
 */
export interface FileUploadResponse {
  /** Ruta del archivo guardado (ej: "Uploads/estudio_123.pdf" o URL completa) */
  url: string;
  /** Nombre del archivo guardado */
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class StudyItemsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/study-items`;

  /**
   * Crea un nuevo study item
   */
  create(payload: StudyItemCreate): Observable<StudyItemOut> {
    return this.http.post<StudyItemOut>(`${this.baseUrl}/`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Sube un archivo PDF al servidor
   * El backend debe:
   * - Validar que sea un archivo PDF
   * - Validar el tamaño máximo (10MB recomendado)
   * - Guardar el archivo en la carpeta Uploads/
   * - Retornar la ruta del archivo en FileUploadResponse.url
   *
   * @param file Archivo PDF a subir
   * @param itemId (opcional) ID del study_item al que se asociará el archivo
   * @returns Observable con la respuesta que incluye la URL del archivo guardado
   */
  uploadFile(file: File, itemId?: number): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (itemId != null) {
      formData.append('item_id', String(itemId));
    }
    return this.http.post<FileUploadResponse>(
      `${this.baseUrl}/upload`,
      formData
    );
  }

  /**
   * Actualiza un study item existente
   * Permite actualizar campos opcionales como url, document_date y status
   *
   * @param itemId ID del study item a actualizar
   * @param payload Campos a actualizar (todos opcionales)
   * @returns Observable con el study item actualizado
   */
  updateStudyItem(
    itemId: number,
    payload: StudyItemUpdate
  ): Observable<StudyItemOut> {
    return this.http.put<StudyItemOut>(`${this.baseUrl}/${itemId}`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
