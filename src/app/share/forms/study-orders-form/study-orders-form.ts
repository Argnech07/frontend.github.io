import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StudyOrdersService } from '../../../services/study-orders.service';
import { StudyItemsService } from '../../../services/study-items.service';
import { AttentionsService } from '../../../services/attentions.service';
import { DoctorService } from '../../../services/doctor.service';
import { PatientService } from '../../../services/patient.service';
import { PatientClinicalService } from '../../../services/patient-clinical.service';
import {
  maxLengthValidator,
  noWhitespaceValidator,
} from '../../../utils/validators.util';
import { sanitizeString } from '../../../utils/sanitize.util';
import { StudyCartItem } from '../../../models/study-item.model';
import { StudyItemOut } from '../../../models/study-item.model';
import { environment } from '../../../../environments/environment';
import { PatientMedicalHistoryOut } from '../../../models/patient-medical-history';
import { VitalsOut } from '../../../models/vitals';
import { differenceInYears, format } from 'date-fns';
import { SettingsService } from '../../../services/settings.service';

const DEFAULT_LOGO_URL = 'https://jmasparral.gob.mx/imagenes/logo.png';

@Component({
  selector: 'study-orders-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './study-orders-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyOrdersForm {
  private ordersApi = inject(StudyOrdersService);
  private itemsApi = inject(StudyItemsService);
  private attentionsApi = inject(AttentionsService);
  private doctorSvc = inject(DoctorService);
  private patientSvc = inject(PatientService);
  private patientClinicalApi = inject(PatientClinicalService);
  private settingsApi = inject(SettingsService);

  loading = signal(false);
  loadingExisting = signal(false);

  logoUrl = signal<string>(DEFAULT_LOGO_URL);

  @Input({ required: true }) attentionId!: number;

  fb = new FormBuilder();

  cart = signal<StudyCartItem[]>([]);

  existingOrderId = signal<number | null>(null);
  existingItems = signal<StudyItemOut[]>([]);

  private medicalHistory = signal<PatientMedicalHistoryOut | null>(null);
  private vitals = signal<VitalsOut | null>(null);

  private selectedStudyType = signal<string>('');
  private typedStudyName = signal<string>('');

  form: FormGroup = this.fb.group({
    study_type: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(100)],
    ],
    assigned_doctor: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(200)],
    ],
    name: [
      '',
      [Validators.required, noWhitespaceValidator(), maxLengthValidator(200)],
    ],
    reason: [
      '',
      [Validators.required, Validators.minLength(1), maxLengthValidator(500)],
    ],
    pdfFile: [null],
  });

  typedStudyNameLabel = computed(() => {
    const v = (this.typedStudyName() || '').trim();
    return v.length > 0 ? v : null;
  });

  ngOnInit() {
    console.log('StudyOrdersForm INIT, attentionId =', this.attentionId);

    this.settingsApi.getLogo().subscribe({
      next: (res) => {
        const url = String(res?.logo_url ?? '').trim();
        if (url) this.logoUrl.set(url);
      },
      error: () => {},
    });

    this.form.get('study_type')?.valueChanges.subscribe((v) => {
      this.selectedStudyType.set(String(v ?? ''));
    });
    this.form.get('name')?.valueChanges.subscribe((v) => {
      this.typedStudyName.set(String(v ?? ''));
    });
    this.loadClinicalSnapshot();
    this.loadExistingStudies();
  }

  private loadClinicalSnapshot(): void {
    const patientId = this.patientSvc.currentPatientId();
    if (!patientId) {
      this.medicalHistory.set(null);
      this.vitals.set(null);
      return;
    }

    this.patientClinicalApi.getMedicalHistory(patientId).subscribe({
      next: (h) => this.medicalHistory.set(h),
      error: () => this.medicalHistory.set(null),
    });

    this.patientClinicalApi.getLatestVitals(patientId).subscribe({
      next: (v) => this.vitals.set(v),
      error: () => this.vitals.set(null),
    });
  }

  doctorFullName = computed(() => {
    const d = this.doctorSvc.doctor();
    if (!d) return '---';
    return `${d.first_name ?? ''} ${d.middle_name ?? ''} ${d.last_name ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
  });

  doctorSpecialtyLabel = computed(() => this.doctorSvc.specialty() || '---');
  doctorLicenseLabel = computed(() => this.doctorSvc.licenseNumber() || '---');
  doctorLicenseELabel = computed(() => this.doctorSvc.licenseNumberE() || '---');

  patientFullName = computed(() => {
    const p = this.patientSvc.currentPatient();
    if (!p) return '---';
    return `${p.first_name ?? ''} ${p.middle_name ?? ''} ${p.last_name ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
  });

  patientBirthDateLabel = computed(() => {
    const birth = this.patientSvc.currentPatient()?.birth_date;
    if (!birth) return '---';
    const d = new Date(birth);
    if (Number.isNaN(d.getTime())) return '---';
    return format(d, 'dd/MM/yyyy');
  });

  patientAgeLabel = computed(() => {
    const birth = this.patientSvc.currentPatient()?.birth_date;
    if (!birth) return '---';
    const d = new Date(birth);
    if (Number.isNaN(d.getTime())) return '---';
    const years = differenceInYears(new Date(), d);
    if (!Number.isFinite(years) || years < 0) return '---';
    return `${years} a`;
  });

  employeeLabel = computed(() => {
    const origin = String((this.patientSvc.currentPatient() as any)?.origin ?? '').trim();
    return origin || '---';
  });

  todayLabel = computed(() => format(new Date(), 'dd/MM/yyyy'));

  previewStudyTypeLabel = computed(() => {
    const raw = (this.selectedStudyType() || '').trim();
    const fallback =
      (this.cart()[0]?.study_type as string | undefined) ||
      (this.existingItems()[0]?.study_type as string | undefined) ||
      '';

    const t = (raw || fallback || '').toLowerCase();
    if (!t) return 'Estudios';
    if (t === 'laboratorio') return 'Laboratorio';
    if (t === 'gabinete') return 'Gabinete';
    if (t === 'imagenología' || t === 'imagenologia') return 'Imagenología';
    if (t === 'especializado') return 'Especializado';
    return t;
  });

  allergiesLabel = computed(() => {
    const h = this.medicalHistory();
    const hasAllergies = h?.family_history?.allergies;
    const text = String(h?.family_history?.allergies_text ?? '').trim();
    if (text) return text;
    if (hasAllergies === true) return 'Sí';
    return '---';
  });

  weightLabel = computed(() => {
    const w = this.vitals()?.weight;
    if (w == null) return '---';
    return `${w} kg`;
  });

  heightLabel = computed(() => {
    const h = this.vitals()?.height;
    if (h == null) return '---';
    const meters = Math.round((h / 100) * 100) / 100;
    return `${meters} m`;
  });

  bmiLabel = computed(() => {
    const bmi = this.vitals()?.bmi;
    if (bmi == null) return '---';
    return String(bmi);
  });

  heartRateLabel = computed(() => {
    const v = this.vitals()?.heart_rate;
    if (v == null) return '---';
    return String(v);
  });

  respiratoryRateLabel = computed(() => {
    const v = this.vitals()?.respiratory_rate;
    if (v == null) return '---';
    return String(v);
  });

  bloodPressureLabel = computed(() => {
    const sys = this.vitals()?.systolic;
    const dia = this.vitals()?.diastolic;
    if (sys == null && dia == null) return '---';
    return `${sys ?? '---'}/${dia ?? '---'}`;
  });

  temperatureLabel = computed(() => {
    const t = this.vitals()?.temperature;
    if (t == null) return '---';
    return `${t} °C`;
  });

  private loadExistingStudies(): void {
    if (!this.attentionId) return;
    this.loadingExisting.set(true);

    this.attentionsApi.getAttention(this.attentionId).subscribe({
      next: (attention) => {
        const orderId = attention.study_order_id ?? null;
        this.existingOrderId.set(orderId);

        if (!orderId) {
          this.existingItems.set([]);
          this.loadingExisting.set(false);
          return;
        }

        this.ordersApi.getStudyOrderFull(orderId).subscribe({
          next: (full) => {
            this.existingItems.set(full.items ?? []);
            this.loadingExisting.set(false);
          },
          error: (err) => {
            console.error('Error al cargar study order full:', err);
            this.existingItems.set([]);
            this.loadingExisting.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Error al cargar atención:', err);
        this.existingOrderId.set(null);
        this.existingItems.set([]);
        this.loadingExisting.set(false);
      },
    });
  }

  get cartCount(): number {
    return this.cart().length;
  }

  get totalCount(): number {
    return this.existingItems().length + this.cart().length;
  }

  getPdfUrl(url: string | null): string | null {
    if (!url) return null;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (url.startsWith('/files/study-items/')) {
      return `${environment.apiUrl}${url}`;
    }

    const filename = url.split('/').pop() || url;
    return `${environment.apiUrl}/files/study-items/${filename}`;
  }

  openPdfInNewWindow(url: string | null): void {
    const pdfUrl = this.getPdfUrl(url);
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  }

  addToCart(): boolean {
    if (this.form.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return false;
    }

    // Sanitizar valores antes de agregar al carrito
    const formValue = this.form.value;

    // Asegurarse de que assigned_doctor viene del input, no del doctor de la sesión
    const assignedDoctorInput = formValue.assigned_doctor?.trim() || '';

    if (!assignedDoctorInput) {
      // Marcar el campo como inválido
      this.form.get('assigned_doctor')?.markAsTouched();
      return false;
    }

    const sanitizedItem: StudyCartItem = {
      study_type: sanitizeString(formValue.study_type),
      assigned_doctor: sanitizeString(assignedDoctorInput), // Valor del input del formulario
      name: sanitizeString(formValue.name),
      reason: sanitizeString(formValue.reason),
      pdfFile: formValue.pdfFile || null,
    };

    console.log('Agregando al carrito:', {
      assigned_doctor: sanitizedItem.assigned_doctor,
      name: sanitizedItem.name,
    });

    this.cart.set([...this.cart(), sanitizedItem]);
    this.form.reset();
    return true;
  }

  removeFromCart(index: number): void {
    const clone = [...this.cart()];
    clone.splice(index, 1);
    this.cart.set(clone);
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
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no debe exceder 10MB');
        input.value = '';
        return;
      }
      this.form.patchValue({ pdfFile: file });
    }
  }

  clearFile(): void {
    this.form.patchValue({ pdfFile: null });
  }

  saveAll(): void {
    if (this.loading() || !this.attentionId) return;

    if (this.cart().length === 0) {
      if (this.form.invalid) {
        Object.keys(this.form.controls).forEach((key) => {
          this.form.get(key)?.markAsTouched();
        });
        alert('Completa todos los campos requeridos antes de guardar');
        return;
      }
      const added = this.addToCart();
      if (!added) {
        alert('No se pudo agregar el estudio. Verifica los campos del formulario.');
        return;
      }
    }

    if (this.cart().length === 0) {
      alert('Agrega al menos un estudio antes de guardar');
      return;
    }

    this.loading.set(true);
    const today = new Date().toISOString().slice(0, 10);
    const items = this.cart();

    const doctorId = this.doctorSvc.doctorId();
    const patientId = this.patientSvc.currentPatientId();

    if (!doctorId || !patientId) {
      console.error('Falta doctorId o patientId');
      alert(
        'Error: No se pudo obtener la información del doctor o paciente. Por favor, recargue la página.'
      );
      this.loading.set(false);
      return;
    }

    const existingOrderId = this.existingOrderId();

    const createItemsForOrder = (orderId: number, updateAttention: boolean) => {
      let index = 0;

      const createNext = () => {
        if (index >= items.length) {
          if (!updateAttention) {
            this.loading.set(false);
            this.cart.set([]);
            this.loadExistingStudies();
            alert('¡Solicitudes de estudios guardadas exitosamente!');
            return;
          }

          this.attentionsApi
            .updateAttention(this.attentionId, {
              study_order_id: orderId,
            })
            .subscribe({
              next: () => {
                this.loading.set(false);
                this.cart.set([]);
                this.loadExistingStudies();
                alert('¡Solicitudes de estudios guardadas exitosamente!');
              },
              error: (err) => {
                console.error('Error al actualizar atención:', err);
                alert(
                  `Error al actualizar la atención: ${
                    err.error?.detail || err.message || 'Error desconocido'
                  }`
                );
                this.loading.set(false);
              },
            });
          return;
        }

        const it = items[index++];
        const assignedDoctorName = it.assigned_doctor?.trim() || '';

        if (!assignedDoctorName) {
          console.error('Error: assigned_doctor está vacío');
          alert(
            `Error: El campo "Médico que Realiza" es requerido para el estudio "${it.name}"`
          );
          this.loading.set(false);
          return;
        }

        console.log('Enviando estudio:', {
          name: it.name,
          assigned_doctor: assignedDoctorName,
          study_order_id: orderId,
        });

        this.itemsApi
          .create({
            study_order_id: orderId,
            study_type: it.study_type,
            assigned_doctor: assignedDoctorName,
            name: it.name,
            reason: it.reason,
            document_date: null,
            status: 'pending',
            url: null,
          })
          .subscribe({
            next: (createdItem) => {
              // Si hay PDF adjunto, subirlo y asociarlo al item creado
              const pdf = it.pdfFile ?? null;
              if (!pdf) {
                createNext();
                return;
              }

              this.itemsApi.uploadFile(pdf, createdItem.id).subscribe({
                next: (uploadResp) => {
                  // Asegurar fecha del documento (por compatibilidad)
                  const todayDoc = new Date().toISOString().slice(0, 10);
                  this.itemsApi
                    .updateStudyItem(createdItem.id, {
                      url: uploadResp.url,
                      document_date: todayDoc,
                    })
                    .subscribe({
                      next: () => createNext(),
                      error: (err) => {
                        console.error('Error al actualizar study item con URL:', err);
                        this.loading.set(false);
                        alert(
                          `Error al guardar el archivo del estudio "${it.name}": ${
                            err.error?.detail || err.message || 'Error desconocido'
                          }`
                        );
                      },
                    });
                },
                error: (err) => {
                  console.error('Error al subir archivo del estudio:', err);
                  this.loading.set(false);
                  alert(
                    `Error al subir el archivo del estudio "${it.name}": ${
                      err.error?.detail || err.message || 'Error desconocido'
                    }`
                  );
                },
              });
            },
            error: (err) => {
              console.error('Error al crear estudio:', err);
              alert(
                `Error al crear el estudio "${it.name}": ${
                  err.error?.detail || err.message || 'Error desconocido'
                }`
              );
              this.loading.set(false);
            },
          });
      };

      createNext();
    };

    // Si ya existe una orden asociada a la atención, solo agregar items a esa orden.
    if (existingOrderId) {
      createItemsForOrder(existingOrderId, false);
      return;
    }

    // Si no existe, crear orden y luego asociarla a la atención.
    this.ordersApi
      .create({
        patient_id: patientId,
        doctor_id: doctorId,
        order_date: today,
      })
      .subscribe({
        next: (order) => {
          this.existingOrderId.set(order.id);
          createItemsForOrder(order.id, true);
        },
        error: (err) => {
          console.error('Error al crear orden de estudios:', err);
          alert(
            `Error al crear la orden de estudios: ${
              err.error?.detail || err.message || 'Error desconocido'
            }`
          );
          this.loading.set(false);
        },
      });
  }

  printPreview(): void {
    const el = document.getElementById('study-order-preview');
    if (!el) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Solicitud de Estudios</title>
    <style>
      @page { margin: 10mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; }
      .sheet { max-width: 800px; margin: 0 auto; }
      .text-center { text-align: center; }
      .text-xs { font-size: 12px; }
      .text-sm { font-size: 14px; }
      .text-base { font-size: 16px; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .uppercase { text-transform: uppercase; }
      .mb-2 { margin-bottom: 8px; }
      .mb-3 { margin-bottom: 12px; }
      .mt-2 { margin-top: 8px; }
      .mt-10 { margin-top: 40px; }
      .ml-4 { margin-left: 16px; }
      .border-b { border-bottom: 1px solid #000; }
      .border { border: 1px solid #9ca3af; }
      .border-gray { border-color: #9ca3af; }
      .p-2 { padding: 8px; }
      .grid { display: grid; }
      .gap-2 { gap: 8px; }
      .grid-cols-12 { grid-template-columns: repeat(12, 1fr); }
      .col-span-4 { grid-column: span 4 / span 4; }
      .col-span-8 { grid-column: span 8 / span 8; }
      ul { margin: 0; padding-left: 18px; }
      li { margin: 4px 0; }
      @media print {
        button { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">${el.innerHTML}</div>
  </body>
</html>`;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      iframe.remove();
    };

    win.onafterprint = cleanup;
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } finally {
        // Si el navegador no dispara afterprint, limpiamos después
        setTimeout(cleanup, 1000);
      }
    }, 300);
  }
}
