import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  format,
} from 'date-fns';
import { PatientService } from '../../../services/patient.service';
import { DoctorService } from '../../../services/doctor.service';
import { AppointmentsService } from '../../../services/appointments.service';
import { PatientBasic } from '../../../models/patient';
import { Appointment } from '../../../models/appointment.model';
import { Router } from '@angular/router';

type CalendarEvent = {
  date: Date;
  title: string;
  color: string;
  appointment_id: number;
  patient_id: number;
};

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export default class Agenda implements OnInit {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private doctorService = inject(DoctorService);
  private appointmentsService = inject(AppointmentsService);
  private router = inject(Router);

  currentDate = signal(new Date());
  showModal = signal(false);
  patients = signal<PatientBasic[]>([]);
  loading = signal(false);

  appointmentForm: FormGroup = this.fb.group({
    title: [''],
    patient_id: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
  });

  // Generate time slots every 30 minutes
  timeSlots = computed(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(
          minute
        ).padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  });

  appointments = signal<Appointment[]>([]);

  private patientNameById = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.patients()) {
      map.set(p.id, p.full_name);
    }
    return map;
  });

  events = computed(() => {
    const doctorId = this.doctorService.doctorId();
    if (doctorId == null) return [] as CalendarEvent[];

    const patientMap = this.patientNameById();
    return this.appointments()
      .filter((a) => a.doctor_id === doctorId)
      .map((a) => {
        const patientName = patientMap.get(a.patient_id) || `Paciente #${a.patient_id}`;
        const baseTitle = a.title || 'Cita';
        return {
          date: new Date(`${a.visit_date}T${a.start_time}`),
          title: `${patientName} - ${baseTitle}`,
          color: this.getAppointmentColor(a.status),
          appointment_id: a.id,
          patient_id: a.patient_id,
        } as CalendarEvent;
      });
  });

  monthDays = computed(() => {
    const date = this.currentDate();
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });

    const days: Date[] = [];
    let cursor = start;

    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  });

  ngOnInit() {
    this.loadPatients();
    this.loadAppointmentsForCurrentView();
  }

  private getAppointmentColor(status: Appointment['status']): string {
    if (status === 'confirmed') return '#0891b2';
    if (status === 'canceled') return '#dc2626';
    return '#6366f1';
  }

  private loadAppointmentsForCurrentView() {
    const doctorId = this.doctorService.doctorId();
    if (doctorId == null) {
      return;
    }

    const date = this.currentDate();
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });

    const start_date = format(start, 'yyyy-MM-dd');
    const end_date = format(end, 'yyyy-MM-dd');

    this.appointmentsService
      .list({ start_date, end_date, limit: 100 })
      .subscribe({
        next: (items) => {
          this.appointments.set(items);
        },
        error: (err) => {
          console.error('Error loading appointments:', err);
        },
      });
  }

  loadPatients() {
    this.patientService.listBasic({ is_active: true, limit: 1000 }).subscribe({
      next: (patients) => {
        this.patients.set(patients);
      },
      error: (err) => {
        console.error('Error loading patients:', err);
      },
    });
  }

  openModal() {
    // Set default date to today
    const today = format(new Date(), 'yyyy-MM-dd');
    this.appointmentForm.patchValue({
      date: today,
      time: '09:00',
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.appointmentForm.reset();
  }

  onSubmit() {
    if (this.appointmentForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    const formValue = this.appointmentForm.value;
    const doctorId = this.doctorService.doctorId();

    if (doctorId == null) {
      alert('No hay doctor autenticado. Inicia sesión nuevamente.');
      this.loading.set(false);
      return;
    }

    const appointmentData = {
      patient_id: Number(formValue.patient_id),
      doctor_id: doctorId,
      title: formValue.title || null,
      visit_date: formValue.date,
      start_time: formValue.time,
    };

    this.appointmentsService.create(appointmentData).subscribe({
      next: (appointment) => {
        this.loadAppointmentsForCurrentView();
        this.closeModal();
        this.loading.set(false);
        alert('Cita creada exitosamente');
      },
      error: (err) => {
        console.error('Error creating appointment:', err);
        const detail =
          (err?.error && (err.error.detail || err.error.message)) ||
          err?.message ||
          null;
        alert(
          detail
            ? `Error al crear la cita: ${detail}`
            : 'Error al crear la cita. Por favor, intente nuevamente.'
        );
        this.loading.set(false);
      },
    });
  }

  prevMonth() {
    this.currentDate.set(subMonths(this.currentDate(), 1));
    this.loadAppointmentsForCurrentView();
  }

  nextMonth() {
    this.currentDate.set(addMonths(this.currentDate(), 1));
    this.loadAppointmentsForCurrentView();
  }

  today() {
    this.currentDate.set(new Date());
    this.loadAppointmentsForCurrentView();
  }

  format = format;
  isSameMonth = isSameMonth;

  eventsForDay(day: Date) {
    return this.events().filter(
      (e) =>
        this.format(e.date, 'yyyy-MM-dd') === this.format(day, 'yyyy-MM-dd')
    );
  }

  onEventClick(ev: CalendarEvent): void {
    this.patientService.setCurrentPatient(ev.patient_id);
    this.patientService.loadCurrentPatient();
    this.router.navigate(['/new-atention'], {
      queryParams: { appointment_id: ev.appointment_id },
    });
  }

  onDeleteEvent(ev: CalendarEvent): void {
    const ok = confirm('¿Eliminar esta cita?');
    if (!ok) return;

    this.appointmentsService.delete(ev.appointment_id).subscribe({
      next: () => {
        this.loadAppointmentsForCurrentView();
      },
      error: (err) => {
        console.error('Error deleting appointment:', err);
        const detail =
          (err?.error && (err.error.detail || err.error.message)) ||
          err?.message ||
          null;
        alert(
          detail
            ? `Error al eliminar la cita: ${detail}`
            : 'Error al eliminar la cita. Por favor, intente nuevamente.'
        );
      },
    });
  }

  getPatientFullName(patient: PatientBasic): string {
    return patient.full_name;
  }
}
