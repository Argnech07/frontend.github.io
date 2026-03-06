import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VisitsService } from '../../services/visits.service';
import { AttentionsService } from '../../services/attentions.service';
import { DoctorService } from '../../services/doctor.service';
import { PatientService } from '../../services/patient.service';
import { VisitDiagnosisService } from '../../services/visit-diagnosis.service';
import { PrescriptionsService } from '../../services/prescriptions.service';
import { PrescribedItemsService } from '../../services/prescribed-items.service';
import { MedicationsService } from '../../services/medications.service';
import { AppointmentsService } from '../../services/appointments.service';
import { DiagnosticComponent } from '../../share/components/diagnostic.component/diagnostic.component';
import { StudyOrdersForm } from '../../share/forms/study-orders-form/study-orders-form';
import { PresccriptionImpress } from '../../share/components/presccription-impress/presccription-impress';
import { FullNamePipePipe } from '../../pipes/full-name-pipe';
import {
  maxLengthValidator,
  noWhitespaceValidator,
} from '../../utils/validators.util';
import { sanitizeString } from '../../utils/sanitize.util';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MedicationOut } from '../../models/medication.model';
import { environment } from '../../../environments/environment';
import html2canvas from 'html2canvas';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';

type Step = 'consultation' | 'treatment' | 'requests';
type Tab = 'reason' | 'physicalExam' | 'plan';

@Component({
  selector: 'app-new-atention',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DiagnosticComponent,
    StudyOrdersForm,
    PresccriptionImpress,
    FullNamePipePipe,
  ],
  templateUrl: './new-atention.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NewAtention implements OnInit {
  private fb = inject(FormBuilder);
  private visitsApi = inject(VisitsService);
  private attentionsApi = inject(AttentionsService);
  doctorSvc = inject(DoctorService);
  private patientSvc = inject(PatientService);
  private visitDiagnosisApi = inject(VisitDiagnosisService);
  private prescriptionsApi = inject(PrescriptionsService);
  private prescribedItemsApi = inject(PrescribedItemsService);
  private medicationsApi = inject(MedicationsService);
  private appointmentsApi = inject(AppointmentsService);
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  generatingPrescriptionPdf = signal(false);
  pdfViewerVisible = signal(false);
  pdfViewerUrl = signal<SafeResourceUrl>('');

  printPrescription(): void {
    // Asegurar que la receta esté guardada antes de imprimir
    if (!this.prescriptionId()) {
      alert('Primero debe guardar la receta antes de imprimir.');
      return;
    }
    window.print();
  }

  async printAndSavePrescription(): Promise<void> {
    // Guardar la receta primero, luego imprimir
    if (!this.prescriptionId()) {
      await this.savePrescriptionAndContinue(true);
    } else {
      window.print();
    }
  }

  private prescriptionFolioLabel(): string {
    const id = this.prescriptionId();
    const year = new Date().getFullYear();
    if (id == null) return `RC-${year}----`;
    return `RC-${year}-${String(id).padStart(3, '0')}`;
  }

  showPdfViewer(url: string): void {
    console.log('[PDF VIEWER] Mostrando visor con URL:', url);
    this.pdfViewerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.pdfViewerVisible.set(true);
    console.log('[PDF VIEWER] pdfViewerVisible:', this.pdfViewerVisible());
    console.log('[PDF VIEWER] pdfViewerUrl:', this.pdfViewerUrl());
  }

  closePdfViewer(): void {
    this.pdfViewerVisible.set(false);
    this.pdfViewerUrl.set('');
  }

  downloadViewerPdf(): void {
    const safeUrl = this.pdfViewerUrl();
    if (safeUrl) {
      // Convertir SafeResourceUrl a string
      const url = (safeUrl as any).changingThisBreaksApplicationSecurity || String(safeUrl);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receta-${this.prescriptionFolioLabel()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async downloadPrescriptionPdf(): Promise<void> {
    // Primero guardar la receta si no está guardada
    if (!this.prescriptionId()) {
      // Guardar primero, el callback se encargará de descargar después
      this.savePrescriptionAndContinueToPdf();
      return;
    }
    await this.generateAndDownloadPdf();
  }

  private savePrescriptionAndContinueToPdf(): void {
    // Prevenir doble ejecución
    if (
      this.loading() ||
      this.savingPrescription() ||
      this.medications.length === 0
    ) {
      console.log('savePrescriptionAndContinueToPdf: bloqueado');
      return;
    }

    const doctorId = this.doctorSvc.doctorId();
    const patientId = this.patientSvc.currentPatientId();
    const licenseNumber = this.doctorSvc.licenseNumber();
    const specialty = this.doctorSvc.specialty();

    if (!doctorId || !patientId || !licenseNumber || !specialty) {
      console.error('Faltan datos del doctor o paciente');
      return;
    }

    this.loading.set(true);
    this.savingPrescription.set(true);

    const existingPrescriptionId = this.prescriptionId();

    // SI YA EXISTE UNA PRESCRIPCIÓN: Actualizarla
    if (existingPrescriptionId) {
      console.log('Actualizando prescripción existente para PDF:', existingPrescriptionId);
      
      const updatePayload = {
        notes: this.generalInstructions.value || null,
      };

      this.prescriptionsApi.update(existingPrescriptionId, updatePayload).pipe(
        switchMap(() => {
          const items = this.medications.value;
          if (items.length === 0) {
            return of(null);
          }
          const itemsPayload = items.map((item: any) => ({
            prescription_id: existingPrescriptionId,
            medication_name: item.medication_name || null,
            presentation: item.presentation || null,
            route: item.route || null,
            frequency_hours: item.frequency_hours ? Number(item.frequency_hours) : null,
            duration_days: item.duration_days ? Number(item.duration_days) : null,
            duration_unit: 'dias',
            dosage: item.dosage || null,
            notes: item.notes || null,
          }));
          return this.prescribedItemsApi.replaceByPrescription(existingPrescriptionId, itemsPayload);
        })
      ).subscribe({
        next: () => {
          this.loading.set(false);
          this.savingPrescription.set(false);
          console.log('Prescripción actualizada - mostrando PDF en visor');
          // Abrir PDF desde URL pública del servidor
          const folio = `RC-${new Date().getFullYear()}-${String(existingPrescriptionId).padStart(3, '0')}`;
          const pdfUrl = `${environment.apiUrl}/prescriptions/pdf/${folio}`;
          console.log('[FRONTEND] Mostrando PDF en visor:', pdfUrl);
          setTimeout(() => window.open(pdfUrl, '_blank'), 100);
        },
        error: (error: any) => {
          this.loading.set(false);
          this.savingPrescription.set(false);
          console.error('Error al actualizar prescripción:', error);
        }
      });
      return;
    }

    // SI NO EXISTE PRESCRIPCIÓN: Crear nueva (código original)
    const prescriptionPayload = {
      patient_id: patientId,
      doctor_id: doctorId,
      license_number: licenseNumber,
      specialty: specialty,
      date: new Date().toISOString().split('T')[0],
      visit_diagnosis_id: this.visitDiagnosisId(),
      notes: this.generalInstructions.value || null,
    };

    this.prescriptionsApi.create(prescriptionPayload).subscribe({
      next: (prescription) => {
        this.prescriptionId.set(prescription.id);
        this.prescriptionDate.set(prescription.date);
        const items = this.medications.value;
        
        if (items.length === 0) {
          this.loading.set(false);
          this.savingPrescription.set(false);
          // Abrir PDF desde URL pública del servidor
          const folio = `RC-${prescription.date.split('-')[0]}-${String(prescription.id).padStart(3, '0')}`;
          const pdfUrl = `${environment.apiUrl}/prescriptions/pdf/${folio}`;
          console.log('[FRONTEND] Abriendo PDF desde URL pública:', pdfUrl);
          setTimeout(() => window.open(pdfUrl, '_blank'), 100);
          return;
        }

        const createItemObservables = items.map((item: any) => {
          const frequencyHours =
            item.frequency_hours === '' || item.frequency_hours == null
              ? null
              : Number(item.frequency_hours);
          const durationDays =
            item.duration_days === '' || item.duration_days == null
              ? null
              : Number(item.duration_days);
          const itemPayload = {
            prescription_id: prescription.id,
            medication_name: item.medication_name || null,
            presentation: item.presentation || null,
            route: item.route || null,
            frequency_hours: Number.isFinite(frequencyHours) ? frequencyHours : null,
            duration_days: Number.isFinite(durationDays) ? durationDays : null,
            duration_unit: 'dias',
            dosage: item.dosage || null,
            notes: item.notes || null,
          };
          return this.prescribedItemsApi.create(itemPayload);
        });

        forkJoin(createItemObservables).subscribe({
          next: () => {
            this.loading.set(false);
            this.savingPrescription.set(false);
            console.log('Prescripción guardada exitosamente - abriendo PDF');
            // Actualizar atención con prescription_id
            if (this.attentionId()) {
              this.attentionsApi
                .updateAttention(this.attentionId()!, { prescription_id: prescription.id })
                .subscribe();
            }
            // Abrir PDF desde URL pública del servidor
            const folio = `RC-${prescription.date.split('-')[0]}-${String(prescription.id).padStart(3, '0')}`;
            const pdfUrl = `${environment.apiUrl}/prescriptions/pdf/${folio}`;
            console.log('[FRONTEND] Abriendo PDF desde URL pública:', pdfUrl);
            setTimeout(() => window.open(pdfUrl, '_blank'), 100);
          },
          error: (error: any) => {
            this.loading.set(false);
            this.savingPrescription.set(false);
            console.error('Error al guardar items:', error);
          },
        });
      },
      error: (error: any) => {
        this.loading.set(false);
        this.savingPrescription.set(false);
        console.error('Error al crear prescripción:', error);
      },
    });
  }

  private async generateAndDownloadPdf(): Promise<void> {
    if (this.generatingPrescriptionPdf()) return;

    const el = document.getElementById('print-prescription');
    if (!el) {
      console.error('No se encontró el contenedor #print-prescription');
      return;
    }

    this.generatingPrescriptionPdf.set(true);
    try {
      // Esperar a que el DOM se estabilice
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clonar el elemento para modificarlo sin afectar la UI
      const clone = el.cloneNode(true) as HTMLElement;
      
      // Aplicar estilos inline para eliminar todos los bordes
      this.removeAllBorders(clone);
      
      // Agregar el clon al body temporalmente (oculto)
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = el.offsetWidth + 'px';
      clone.style.backgroundColor = '#ffffff';
      document.body.appendChild(clone);

      // Usar dom-to-image-more que soporta oklch
      const dataUrl = await domtoimage.toPng(clone, {
        bgcolor: '#ffffff',
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        style: {
          'background-color': '#ffffff',
          'border': 'none',
          'outline': 'none',
          'box-shadow': 'none',
        },
        quality: 1,
        cacheBust: true,
        // Ignorar imágenes externas que fallen por CORS
        filter: (node: Node) => {
          if (node instanceof HTMLImageElement) {
            // Permitir imágenes locales pero ignorar las que fallan por CORS
            if (node.src && (node.src.startsWith('http://') || node.src.startsWith('https://'))) {
              // Solo ignorar si no es del mismo origen
              try {
                const url = new URL(node.src);
                if (url.hostname !== window.location.hostname) {
                  console.warn('Ignorando imagen externa por CORS:', node.src);
                  return false;
                }
              } catch (e) {
                return true;
              }
            }
          }
          return true;
        },
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      });

      // Eliminar el clon del DOM
      document.body.removeChild(clone);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calcular dimensiones manteniendo aspect ratio
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const imgWidth = pageWidth;
      const imgHeight = (img.height * imgWidth) / img.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const fileName = `receta-${this.prescriptionFolioLabel()}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error('Error generando PDF de la prescripción:', e);
      alert('Error al generar PDF. Por favor intenta de nuevo.');
    } finally {
      this.generatingPrescriptionPdf.set(false);
    }
  }

  private removeAllBorders(element: HTMLElement): void {
    // Aplicar estilos inline para eliminar bordes
    element.style.border = 'none';
    element.style.outline = 'none';
    element.style.boxShadow = 'none';
    element.style.borderWidth = '0';
    element.style.borderStyle = 'none';
    element.style.borderColor = 'transparent';
    
    // Recursivamente aplicar a todos los hijos
    const allElements = element.querySelectorAll('*');
    allElements.forEach((child) => {
      const el = child as HTMLElement;
      el.style.border = 'none';
      el.style.outline = 'none';
      el.style.boxShadow = 'none';
      el.style.borderWidth = '0';
      el.style.borderStyle = 'none';
      el.style.borderColor = 'transparent';
    });
  }

  finishAttention(): void {
    // Limpiar paciente actual en tu PatientService
    this.patientSvc.clearCurrentPatient();

    // Limpiar visit/attention del localStorage
    const patientId = this.patientSvc.currentPatientId();
    if (patientId) {
      localStorage.removeItem(`current_visit_${patientId}`);
      localStorage.removeItem(`current_attention_${patientId}`);
    }

    // Opcional: resetear señales/estado local
    this.visitId.set(null);
    this.attentionId.set(null);
    this.visitDiagnosisId.set(null);
    this.prescriptionId.set(null);
    this.prescriptionDate.set(null);
    this.visitTs.set(null);
    this.medications.clear();
    this.visitForm.reset();
    this.diagnosisPrimary.set(null);
    this.diagnosisSecondary.set([]);

    // Redirigir al listado de pacientes
    this.router.navigate(['/dashboard/patient-list']);
  }

  cancelAttention(): void {
    // Limpiar formulario de consulta
    this.visitForm.reset();

    // Limpiar medicamentos
    this.medications.clear();

    // Limpiar diagnóstico en memoria
    this.diagnosisPrimary.set(null);
    this.diagnosisSecondary.set([]);

    // Limpiar flags de carga
    this.loading.set(false);
    this.savingPrescription.set(false);

    // Opcional: limpiar visit/attention solo en memoria (sin tocar backend)
    this.visitId.set(null);
    this.attentionId.set(null);
    this.visitDiagnosisId.set(null);
    this.prescriptionId.set(null);
    this.prescriptionDate.set(null);
    this.visitTs.set(null);

    // Opcional: quitar progreso almacenado para ese paciente
    const patientId = this.patientSvc.currentPatientId();
    if (patientId) {
      localStorage.removeItem(`current_visit_${patientId}`);
      localStorage.removeItem(`current_attention_${patientId}`);
    }

    // Redirigir (elige lo que quieras)
    // 1) Volver al listado de pacientes:
    this.router.navigate(['/dashboard/patient-list']);

    // O 2) Volver a la página anterior:
    // window.history.back(); // simple back navigation [web:99]
  }

  currentStep = signal<Step>('consultation');
  consultationTab = signal<Tab>('reason');

  visitId = signal<number | null>(null);
  attentionId = signal<number | null>(null);
  visitDiagnosisId = signal<number | null>(null);
  prescriptionId = signal<number | null>(null);
  prescriptionDate = signal<string | null>(null);
  visitTs = signal<string | null>(null);
  loading = signal(false);
  savingPrescription = signal(false);

  medicationsCatalog = signal<MedicationOut[]>([]);

  medicationAutocompleteIndex = signal<number | null>(null);
  medicationAutocompleteQuery = signal<string>('');

  visitForm: FormGroup = this.fb.group({
    reason: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        noWhitespaceValidator(),
        maxLengthValidator(2000),
      ],
    ],
    exploration: ['', maxLengthValidator(2000)],
    therapeutic_plan: ['', maxLengthValidator(2000)],
  });

  diagnosisPrimary = signal<string | null>(null);
  diagnosisSecondary = signal<string[]>([]);

  // Treatment form
  medications: FormArray = this.fb.array([]);
  generalInstructions = this.fb.control('');

  ngOnInit(): void {
    // Cargar catálogo de medicamentos para el buscador
    this.medicationsApi.list({ skip: 0, limit: 5000 }).subscribe({
      next: (list) => {
        this.medicationsCatalog.set(list);
        console.log('[NewAtention] Medications catalog loaded:', list.length);
      },
      error: (err) => console.error('Error loading medications catalog:', err),
    });

    const token = localStorage.getItem('auth_token');
    const userType = localStorage.getItem('user_type');
    if (token && userType === 'doctor' && !this.doctorSvc.doctor()) {
      this.doctorSvc.loadCurrentDoctor();
    }

    // Intentar recuperar visit_id o attention_id de query params
    const visitIdParam = this.route.snapshot.queryParams['visit_id'];
    const attentionIdParam = this.route.snapshot.queryParams['attention_id'];
    const appointmentIdParam = this.route.snapshot.queryParams['appointment_id'];

    if (appointmentIdParam) {
      this.loading.set(true);
      this.currentStep.set('consultation');
      this.appointmentsApi.getOne(+appointmentIdParam).subscribe({
        next: (appt) => {
          this.patientSvc.setCurrentPatient(appt.patient_id);
          this.patientSvc.loadCurrentPatient();

          localStorage.removeItem(`current_visit_${appt.patient_id}`);
          localStorage.removeItem(`current_attention_${appt.patient_id}`);

          this.visitId.set(null);
          this.attentionId.set(null);
          this.visitDiagnosisId.set(null);
          this.prescriptionId.set(null);

          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading appointment:', err);
          this.loading.set(false);
        },
      });
      return;
    }

    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) {
      return;
    }

    this.patientSvc.loadCurrentPatient();

    // Si hay attention_id en query params, cargar desde ahí
    if (attentionIdParam) {
      this.loadAttentionById(+attentionIdParam);
      return;
    }

    // Si hay visit_id en query params, cargar desde ahí
    if (visitIdParam) {
      this.loadVisitById(+visitIdParam);
      return;
    }

    // Si no hay params, buscar la attention más reciente del paciente
    this.loadLatestAttention(patientId);
  }

  private loadAttentionById(attentionId: number): void {
    this.loading.set(true);
    this.attentionsApi.getAttention(attentionId).subscribe({
      next: (attention) => {
        this.attentionId.set(attention.id);
        const pid = attention.prescription_id;
        if (pid) {
          this.loadPrescriptionForEditing(pid);
        }
        if (attention.visit_id) {
          this.loadVisitById(attention.visit_id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadVisitById(visitId: number): void {
    this.loading.set(true);
    this.visitId.set(visitId);

    // Cargar datos de la visit
    this.visitsApi.getVisit(visitId).subscribe({
      next: (visit) => {
        this.visitTs.set(visit.visit_ts || null);
        // Restaurar formulario
        this.visitForm.patchValue({
          reason: visit.reason || '',
          exploration: visit.exploration || '',
          therapeutic_plan: visit.therapeutic_plan || '',
        });

        // Cargar diagnóstico
        this.visitDiagnosisApi.getByVisitId(visitId).subscribe({
          next: (diagnosis) => {
            if (diagnosis) {
              this.diagnosisPrimary.set(diagnosis.primary_diagnosis);
              this.diagnosisSecondary.set(diagnosis.secondary_diagnoses || []);
              this.visitDiagnosisId.set(diagnosis.id);
            }
          },
          error: () => {
            // Si no hay diagnóstico, continuar
          },
        });

        // Buscar attention asociada
        const patientId = this.patientSvc.currentPatientId();
        this.attentionsApi
          .getAttentionByVisitId(visitId, patientId || undefined)
          .subscribe({
            next: (attentions) => {
              if (attentions.length > 0) {
                const attId = attentions[0].id;
                this.attentionId.set(attId);

                this.attentionsApi.getAttention(attId).subscribe({
                  next: (att) => {
                    const pid = att.prescription_id;
                    if (pid) {
                      this.loadPrescriptionForEditing(pid);
                    }
                    this.loading.set(false);
                  },
                  error: () => {
                    this.loading.set(false);
                  },
                });
                return;
              }
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
            },
          });
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadPrescriptionForEditing(prescriptionId: number): void {
    this.prescriptionsApi.getOne(prescriptionId).subscribe({
      next: (p) => {
        this.prescriptionId.set(p.id);
        this.prescriptionDate.set(p.date);
        this.generalInstructions.setValue(p.notes || '');

        this.prescribedItemsApi.listByPrescription(prescriptionId).subscribe({
          next: (items) => {
            while (this.medications.length > 0) {
              this.medications.removeAt(0);
            }

            for (const raw of items as any[]) {
              const medicationName =
                String(raw?.medication_name ?? '') ||
                String(raw?.medication?.generic_name ?? '').trim();
              const presentation = String(raw?.presentation ?? '').trim();

              const medicationGroup = this.fb.group({
                medication_name: [medicationName],
                presentation: [presentation],
                dosage: [raw?.dosage ?? ''],
                frequency_hours: [raw?.frequency_hours ?? null],
                duration_days: [raw?.duration_days ?? null],
                route: [raw?.route ?? ''],
                notes: [raw?.notes ?? ''],
              });
              this.medications.push(medicationGroup);
            }
          },
          error: () => {
            // ignore
          },
        });
      },
      error: () => {
        // ignore
      },
    });
  }

  private loadLatestAttention(patientId: number): void {
    const savedVisitId = localStorage.getItem(`current_visit_${patientId}`);
    const savedAttentionId = localStorage.getItem(
      `current_attention_${patientId}`
    );

    if (savedAttentionId) {
      this.loadAttentionById(+savedAttentionId);
    } else if (savedVisitId) {
      this.loadVisitById(+savedVisitId);
    }
  }

  setConsultationTab(tab: Tab): void {
    this.consultationTab.set(tab);
  }

  selectStep(step: Step): void {
    if (step === 'consultation' || this.attentionId()) {
      this.currentStep.set(step);
    }
  }

  onDiagnosisChange(d: { primary: string | null; secondary: string[] }): void {
    this.diagnosisPrimary.set(d.primary);
    this.diagnosisSecondary.set(d.secondary);
  }

  onSaveVisit(): void {
    if (this.loading() || this.visitForm.invalid || !this.diagnosisPrimary()) {
      if (this.visitForm.invalid) {
        // Marcar todos los campos como touched para mostrar errores
        Object.keys(this.visitForm.controls).forEach((key) => {
          this.visitForm.get(key)?.markAsTouched();
        });
      }
      return;
    }

    this.loading.set(true);
    const { reason, exploration, therapeutic_plan } = this.visitForm.value;

    // Sanitizar valores antes de enviar
    const basePayload = {
      reason: reason ? sanitizeString(reason) : null,
      exploration: exploration ? sanitizeString(exploration) : null,
      therapeutic_plan: therapeutic_plan
        ? sanitizeString(therapeutic_plan)
        : null,
    };

    const doctorId = this.doctorSvc.doctorId();
    if (!doctorId) {
      this.loading.set(false);
      console.error('No hay doctor autenticado');
      return;
    }

    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) {
      this.loading.set(false);
      console.error('No hay patientId seleccionado');
      return;
    }

    // Crear VISIT (primera vez)
    if (!this.visitId()) {
      this.visitsApi
        .createVisit({
          patient_id: patientId,
          doctor_id: doctorId,
          date_id: null,
          visit_ts: new Date().toISOString(),
          ...basePayload,
        })
        .subscribe({
          next: (visit) => {
            this.visitId.set(visit.id);
            this.visitTs.set(visit.visit_ts || null);

            // Guardar en localStorage para recuperar después de refresh
            const patientId = this.patientSvc.currentPatientId();
            if (patientId) {
              localStorage.setItem(
                `current_visit_${patientId}`,
                String(visit.id)
              );
            }

            // Crear VISIT_DIAGNOSIS
            this.visitDiagnosisApi
              .create({
                visit_id: visit.id,
                primary_diagnosis: this.diagnosisPrimary()!,
                secondary_diagnoses:
                  this.diagnosisSecondary().length > 0
                    ? this.diagnosisSecondary()
                    : null,
                diagnosis_description: null,
              })
              .subscribe({
                next: (diagnosis) => {
                  this.visitDiagnosisId.set(diagnosis.id);
                  // Crear ATTENTION
                  this.attentionsApi
                    .createAttention({
                      visit_id: visit.id,
                      doctor_id: doctorId,
                      patient_id: patientId,
                      prescription_id: null,
                      study_order_id: null,
                    })
                    .subscribe({
                      next: (att) => {
                        this.attentionId.set(att.id);
                        // Guardar en localStorage para recuperar después de refresh
                        const patientId = this.patientSvc.currentPatientId();
                        if (patientId) {
                          localStorage.setItem(
                            `current_visit_${patientId}`,
                            String(visit.id)
                          );
                          localStorage.setItem(
                            `current_attention_${patientId}`,
                            String(att.id)
                          );
                        }
                        this.currentStep.set('treatment');
                        this.loading.set(false);
                      },
                      error: () => {
                        this.loading.set(false);
                      },
                    });
                },
                error: (err) => {
                  // Si falla el guardado de diagnóstico (p. ej. texto libre no existe en CIE-10),
                  // NO bloquear el flujo: crear la atención y permitir avanzar al paso 2.
                  console.error('Error al guardar diagnóstico; continuando sin diagnóstico:', err);

                  this.attentionsApi
                    .createAttention({
                      visit_id: visit.id,
                      doctor_id: doctorId,
                      patient_id: patientId,
                      prescription_id: null,
                      study_order_id: null,
                    })
                    .subscribe({
                      next: (att) => {
                        this.attentionId.set(att.id);
                        const patientId = this.patientSvc.currentPatientId();
                        if (patientId) {
                          localStorage.setItem(
                            `current_visit_${patientId}`,
                            String(visit.id)
                          );
                          localStorage.setItem(
                            `current_attention_${patientId}`,
                            String(att.id)
                          );
                        }
                        this.currentStep.set('treatment');
                        this.loading.set(false);
                      },
                      error: (attErr) => {
                        console.error('Error al crear atención:', attErr);
                        this.loading.set(false);
                      },
                    });
                },
              });
          },
          error: () => {
            this.loading.set(false);
          },
        });

      return;
    }

    // Actualizar VISIT (ya existe)
    this.visitsApi.updateVisit(this.visitId()!, basePayload).subscribe({
      next: (visit) => {
        this.visitForm.patchValue({
          reason: visit.reason,
          exploration: visit.exploration,
          therapeutic_plan: visit.therapeutic_plan,
        });

        // Si ya existe atención, permitir avanzar al paso 2.
        if (this.attentionId()) {
          this.currentStep.set('treatment');
          this.loading.set(false);
          return;
        }

        // Si no existe atención todavía (caso típico: falló createAttention en el guardado inicial),
        // crearla ahora para habilitar el paso 2.
        this.attentionsApi
          .createAttention({
            visit_id: this.visitId()!,
            doctor_id: doctorId,
            patient_id: patientId,
            prescription_id: null,
            study_order_id: null,
          })
          .subscribe({
            next: (att) => {
              this.attentionId.set(att.id);
              const pid = this.patientSvc.currentPatientId();
              if (pid) {
                localStorage.setItem(`current_visit_${pid}`, String(this.visitId()!));
                localStorage.setItem(`current_attention_${pid}`, String(att.id));
              }
              this.currentStep.set('treatment');
              this.loading.set(false);
            },
            error: (err) => {
              console.error('Error al crear atención (update visit):', err);
              this.loading.set(false);
            },
          });
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getPlaceholder(): string {
    switch (this.consultationTab()) {
      case 'reason':
        return 'Describa el motivo de consulta del paciente...';
      case 'physicalExam':
        return 'Describa los hallazgos de la exploración física...';
      case 'plan':
        return 'Describa el plan terapéutico y recomendaciones...';
      default:
        return 'Escriba aquí...';
    }
  }

  getCurrentValue(): string {
    switch (this.consultationTab()) {
      case 'reason':
        return this.visitForm.get('reason')?.value || '';
      case 'physicalExam':
        return this.visitForm.get('exploration')?.value || '';
      case 'plan':
        return this.visitForm.get('therapeutic_plan')?.value || '';
      default:
        return '';
    }
  }

  onTextareaInput(value: string): void {
    switch (this.consultationTab()) {
      case 'reason':
        this.visitForm.get('reason')?.setValue(value);
        break;
      case 'physicalExam':
        this.visitForm.get('exploration')?.setValue(value);
        break;
      case 'plan':
        this.visitForm.get('therapeutic_plan')?.setValue(value);
        break;
    }
  }

  getCharacterCount(): number {
    return this.getCurrentValue().length;
  }

  onFinishAndExit(): void {
    if (!this.visitId()) return;
    console.log(
      'Terminar y salir - visitId:',
      this.visitId(),
      'attentionId:',
      this.attentionId()
    );

    // Limpiar localStorage al finalizar
    const patientId = this.patientSvc.currentPatientId();
    if (patientId) {
      localStorage.removeItem(`current_visit_${patientId}`);
      localStorage.removeItem(`current_attention_${patientId}`);
    }
  }

  // Treatment methods
  addMedication(): void {
    const medicationGroup = this.fb.group({
      medication_name: [''],
      presentation: [''],
      dosage: [''],
      frequency_hours: [null],
      duration_days: [null],
      route: [''],
      notes: [''],
    });
    this.medications.push(medicationGroup);
  }

  removeMedication(index: number): void {
    this.medications.removeAt(index);
  }

  getMedicationControl(index: number, controlName: string): FormControl {
    return this.medications.at(index).get(controlName) as FormControl;
  }

  medicationsListId(index: number): string {
    return `medications-datalist-${index}`;
  }

  medicationOptionLabel(m: MedicationOut): string {
    const strength = m.strength ? ` ${m.strength}` : '';
    const brand = m.brand_name ? ` (${m.brand_name})` : '';
    return `${m.generic_name}${strength}${brand}`;
  }

  onMedicationNameFocus(index: number, event?: Event): void {
    this.medicationAutocompleteIndex.set(index);
    const current = event
      ? (event.target as HTMLInputElement | null)?.value
      : ((this.getMedicationControl(index, 'medication_name').value ?? '') as string);
    this.medicationAutocompleteQuery.set(String(current ?? ''));

    console.log('[NewAtention] medication focus', {
      index,
      current: String(current ?? ''),
      catalog: this.medicationsCatalog().length,
    });
  }

  onMedicationNameInput(index: number, event?: Event): void {
    if (this.medicationAutocompleteIndex() !== index) {
      this.medicationAutocompleteIndex.set(index);
    }
    const current = event
      ? (event.target as HTMLInputElement | null)?.value
      : ((this.getMedicationControl(index, 'medication_name').value ?? '') as string);
    this.medicationAutocompleteQuery.set(String(current ?? ''));

    console.log('[NewAtention] medication input', {
      index,
      current: String(current ?? ''),
      catalog: this.medicationsCatalog().length,
    });
  }

  closeMedicationAutocompleteSoon(): void {
    // Delay to allow click on suggestion before blur closes it
    window.setTimeout(() => {
      this.medicationAutocompleteIndex.set(null);
      this.medicationAutocompleteQuery.set('');
    }, 150);
  }

  medicationSuggestions(index: number): MedicationOut[] {
    if (this.medicationAutocompleteIndex() !== index) {
      return [];
    }

    const q = this.medicationAutocompleteQuery().trim().toLowerCase();
    const list = this.medicationsCatalog();

    // Si el usuario solo enfocó el campo, muestra sugerencias iniciales
    if (!q) {
      return list.slice(0, 12);
    }

    const results: MedicationOut[] = [];
    for (const m of list) {
      const generic = (m.generic_name ?? '').toLowerCase();
      const brand = (m.brand_name ?? '').toLowerCase();
      const hay = this.medicationOptionLabel(m).toLowerCase();

      // Prioriza coincidencia por prefijo (con 1 letra ya debe traer resultados)
      const match =
        generic.startsWith(q) || brand.startsWith(q) || hay.includes(q);

      if (match) {
        results.push(m);
        if (results.length >= 12) {
          break;
        }
      }
    }
    return results;
  }

  selectMedicationSuggestion(index: number, m: MedicationOut): void {
    this.getMedicationControl(index, 'medication_name').setValue(
      this.medicationOptionLabel(m)
    );
    this.medicationAutocompleteIndex.set(null);
    this.medicationAutocompleteQuery.set('');
  }

  updatePreview(): void {
    // The preview updates automatically via form bindings
    // This method can be used for manual refresh if needed
  }

  savePrescription(event?: Event): void {
    this.savePrescriptionAndContinue(false, event);
  }

  private savePrescriptionAndContinue(continueToPrint: boolean = false, event?: Event): void {
    // Prevenir doble ejecución
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Verificar si ya se está guardando
    if (
      this.loading() ||
      this.savingPrescription() ||
      this.medications.length === 0
    ) {
      console.log(
        'savePrescription: bloqueado - loading:',
        this.loading(),
        'saving:',
        this.savingPrescription(),
        'medications:',
        this.medications.length
      );
      return;
    }

    console.log(
      'savePrescription: iniciando - medicamentos:',
      this.medications.length,
      'prescriptionId existente:',
      this.prescriptionId()
    );

    const doctorId = this.doctorSvc.doctorId();
    const patientId = this.patientSvc.currentPatientId();
    const licenseNumber = this.doctorSvc.licenseNumber();
    const specialty = this.doctorSvc.specialty();

    if (!doctorId || !patientId || !licenseNumber || !specialty) {
      console.error('Faltan datos del doctor o paciente');
      alert('Faltan datos del doctor o paciente. Por favor seleccione un paciente válido.');
      return;
    }

    // Verificar que el paciente existe en la base de datos
    this.patientSvc.getOne(patientId).subscribe({
      next: () => {
        // Paciente existe, continuar con el guardado
        this.proceedWithSave(continueToPrint, doctorId, patientId, licenseNumber, specialty);
      },
      error: (err) => {
        console.error('Error: El paciente no existe en la base de datos', err);
        alert(`El paciente con ID ${patientId} no existe en la base de datos.\n\nPor favor:\n1. Haga clic en "Cancelar"\n2. Seleccione un paciente de la lista\n3. Intente guardar nuevamente`);
        // Limpiar paciente inválido
        this.patientSvc.clearCurrentPatient();
        this.loading.set(false);
        this.savingPrescription.set(false);
      }
    });
  }

  private proceedWithSave(continueToPrint: boolean, doctorId: number, patientId: number, licenseNumber: string, specialty: string): void {
    // Establecer flags inmediatamente para prevenir doble clic
    this.loading.set(true);
    this.savingPrescription.set(true);

    const existingPrescriptionId = this.prescriptionId();

    // SI YA EXISTE UNA PRESCRIPCIÓN: Actualizarla en lugar de crear nueva
    if (existingPrescriptionId) {
      console.log('Actualizando prescripción existente:', existingPrescriptionId);
      
      // Actualizar notas de la prescripción existente
      const updatePayload = {
        notes: this.generalInstructions.value || null,
      };

      this.prescriptionsApi.update(existingPrescriptionId, updatePayload).pipe(
        switchMap(() => {
          // Reemplazar todos los items con los nuevos (borra los antiguos y crea los nuevos)
          const items = this.medications.value;
          console.log('Reemplazando items de prescripción:', items.length);

          if (items.length === 0) {
            return of(null);
          }

          const itemsPayload = items.map((item: any) => ({
            prescription_id: existingPrescriptionId,
            medication_name: item.medication_name || null,
            presentation: item.presentation || null,
            route: item.route || null,
            frequency_hours: item.frequency_hours ? Number(item.frequency_hours) : null,
            duration_days: item.duration_days ? Number(item.duration_days) : null,
            duration_unit: 'dias',
            dosage: item.dosage || null,
            notes: item.notes || null,
          }));

          return this.prescribedItemsApi.replaceByPrescription(existingPrescriptionId, itemsPayload);
        })
      ).subscribe({
        next: () => {
          this.loading.set(false);
          this.savingPrescription.set(false);
          console.log('Prescripción actualizada - abriendo PDF desde servidor');
          
          // Generar PDF en servidor y abrir en nueva pestaña
          const year = new Date().getFullYear();
          const folio = `RC-${year}-${String(existingPrescriptionId).padStart(3, '0')}`;
          const pdfUrl = `${environment.apiUrl}/prescriptions/pdf/${folio}`;
          
          console.log('[FRONTEND] Abriendo PDF con folio:', folio);
          console.log('[FRONTEND] URL completa:', pdfUrl);
          
          // Pequeño delay para asegurar que el backend haya guardado todo
          setTimeout(() => {
            console.log('[FRONTEND] Abriendo PDF en nueva pestaña:', pdfUrl);
            const newWindow = window.open(pdfUrl, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              alert(`Prescripción guardada exitosamente.\n\nEl navegador bloqueó el PDF.\n\nPor favor copia y pega esta URL:\n${pdfUrl}`);
            }
          }, 500);
        },
        error: (error: any) => {
          this.loading.set(false);
          this.savingPrescription.set(false);
          console.error('Error al actualizar prescripción:', error);
        }
      });
      return;
    }

    // SI NO EXISTE PRESCRIPCIÓN: Crear nueva (código original)
    const prescriptionPayload = {
      patient_id: patientId,
      doctor_id: doctorId,
      license_number: licenseNumber,
      specialty: specialty,
      date: new Date().toISOString().split('T')[0], // yyyy-mm-dd
      visit_diagnosis_id: this.visitDiagnosisId(),
      notes: this.generalInstructions.value || null,
    };

    this.prescriptionsApi.create(prescriptionPayload).subscribe({
      next: (prescription) => {
        this.prescriptionId.set(prescription.id);
        this.prescriptionDate.set(prescription.date);
        // Create prescribed items
        const items = this.medications.value;
        console.log('Creando items de prescripción:', items.length);
        if (items.length === 0) {
          this.loading.set(false);
          this.savingPrescription.set(false);
          
          // Generar PDF en servidor y abrir en nueva pestaña
          const year = prescription.date.split('-')[0];
          const folio = `RC-${year}-${String(prescription.id).padStart(3, '0')}`;
          const pdfUrl = `${environment.apiUrl}/prescriptions/pdf/${folio}`;
          
          console.log('[FRONTEND] Nueva prescripción sin items - Abriendo PDF:', folio);
          console.log('[FRONTEND] URL:', pdfUrl);
          
          setTimeout(() => {
            const newWindow = window.open(pdfUrl, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              alert(`Prescripción guardada exitosamente.\n\nEl navegador bloqueó el PDF.\n\nPor favor copia y pega esta URL:\n${pdfUrl}`);
            }
          }, 500);
          // Optionally update attention with prescription_id
          if (this.attentionId()) {
            this.attentionsApi
              .updateAttention(this.attentionId()!, {
                prescription_id: prescription.id,
              })
              .subscribe({
                next: () => {
                  console.log('Atención actualizada con prescripción');
                },
                error: (err) => {
                  console.error('Error al actualizar atención:', err);
                },
              });
          }
          // Si hay que continuar a imprimir, hacerlo ahora
          if (continueToPrint) {
            setTimeout(() => window.print(), 100);
          }
          return;
        }

        const createItemObservables = items.map((item: any, index: number) => {
          console.log(
            `Creando item ${index + 1}:`,
            item.medication_name || 'Sin nombre'
          );
          const frequencyHours =
            item.frequency_hours === '' || item.frequency_hours == null
              ? null
              : Number(item.frequency_hours);
          const durationDays =
            item.duration_days === '' || item.duration_days == null
              ? null
              : Number(item.duration_days);
          const itemPayload = {
            prescription_id: prescription.id,
            medication_name: item.medication_name || null,
            presentation: item.presentation || null,
            route: item.route || null,
            frequency_hours: Number.isFinite(frequencyHours) ? frequencyHours : null,
            duration_days: Number.isFinite(durationDays) ? durationDays : null,
            duration_unit: 'dias',
            dosage: item.dosage || null,
            notes: item.notes || null,
          };
          return this.prescribedItemsApi.create(itemPayload);
        });

        forkJoin(createItemObservables).subscribe({
          next: () => {
            this.loading.set(false);
            this.savingPrescription.set(false);
            console.log('Prescripción guardada exitosamente');
            
            // Generar PDF en servidor y abrir en nueva pestaña
            const year = prescription.date.split('-')[0];
            const folio = `RC-${year}-${String(prescription.id).padStart(3, '0')}`;
            const pdfUrl = `${environment.apiUrl}/prescriptions/pdf/${folio}`;
            
            console.log('[FRONTEND] Prescripción con items - Abriendo PDF:', folio);
            console.log('[FRONTEND] URL:', pdfUrl);
            
            setTimeout(() => {
              console.log('[FRONTEND] Abriendo PDF en nueva pestaña:', pdfUrl);
              const newWindow = window.open(pdfUrl, '_blank');
              if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                // Popup bloqueado - mostrar mensaje al usuario
                alert(`Prescripción guardada exitosamente.\n\nEl navegador bloqueó el PDF.\n\nPor favor copia y pega esta URL en una nueva pestaña:\n${pdfUrl}`);
              }
            }, 500);
            // Optionally update attention with prescription_id
            if (this.attentionId()) {
              this.attentionsApi
                .updateAttention(this.attentionId()!, {
                  prescription_id: prescription.id,
                })
                .subscribe({
                  next: () => {
                    console.log('Atención actualizada con prescripción');
                  },
                  error: (err) => {
                    console.error('Error al actualizar atención:', err);
                  },
                });
            }
            // Si hay que continuar a imprimir, hacerlo ahora
            if (continueToPrint) {
              setTimeout(() => window.print(), 100);
            }
          },
          error: (error) => {
            this.loading.set(false);
            this.savingPrescription.set(false);
            console.error('Error al guardar items de prescripción:', error);
          },
        });
      },
      error: (error) => {
        this.loading.set(false);
        this.savingPrescription.set(false);
        console.error('Error al crear prescripción:', error);
      },
    });
  }
}
