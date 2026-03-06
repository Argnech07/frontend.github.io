import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { DoctorService } from '../../services/doctor.service';
import { FullNamePipePipe } from '../../pipes/full-name-pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FullNamePipePipe],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Dashboard {
  doctorSvc = inject(DoctorService);
  router = inject(Router);

  constructor() {
    const token = localStorage.getItem('auth_token');
    const userType = localStorage.getItem('user_type');
    if (token) {
      if (userType === 'doctor') {
        this.doctorSvc.loadCurrentDoctor();
      }
    }
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_type');
    this.doctorSvc.clearDoctor();
    this.router.navigate(['/auth/login']);
  }
}
