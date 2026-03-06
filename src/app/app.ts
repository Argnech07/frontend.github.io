import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DoctorService } from './services/doctor.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'VitaCare';
  private doctorSvc = inject(DoctorService);

  constructor() {
    const token = localStorage.getItem('auth_token');
    const userType = localStorage.getItem('user_type');
    if (token) {
      if (userType === 'doctor') {
        this.doctorSvc.loadCurrentDoctor();
      }
    }
  }
}
