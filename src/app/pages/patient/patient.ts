import { Component, inject } from '@angular/core';
import {
  Router,
  RouterOutlet,
  RouterLinkWithHref,
  RouterLinkActive,
} from '@angular/router';
import {
  NavbarComponent,
  NavigationItem,
} from '../../share/components/navbar.component/navbar.component';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patient',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './patient.html',
})
export default class Patient {
  router = inject(Router);
  private patientService = inject(PatientService);

  items: NavigationItem[] = [
    { route: ['/patient/patient-info'], icon: 'fa-user', label: 'Paciente' },
    {
      route: ['/patient/atention-history'],
      icon: 'fa-stethoscope',
      label: 'Consultas',
    },
    {
      route: ['/patient/study-orders'],
      icon: 'fa-microscope',
      label: 'Estudios',
    },
    {
      route: ['/patient/incapacities'],
      icon: 'fa-file-medical',
      label: 'Incapacidades',
    },
  ];

  createAttention(): void {
    this.router.navigate(['/new-atention']);
  }

  goBack(): void {
    this.patientService.clearCurrentPatient();

    this.router.navigate(['/dashboard/patient-list']);
  }
}
