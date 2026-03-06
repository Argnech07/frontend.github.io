import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LogoSettingsOut {
  logo_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/settings`;

  getLogo(): Observable<LogoSettingsOut> {
    return this.http.get<LogoSettingsOut>(`${this.baseUrl}/logo`);
  }

  updateLogo(logo_url: string | null): Observable<LogoSettingsOut> {
    return this.http.put<LogoSettingsOut>(`${this.baseUrl}/logo`, { logo_url });
  }
}
