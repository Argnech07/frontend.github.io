import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth/login`;

  private _token = signal<string | null>(localStorage.getItem('auth_token'));
  token = this._token;

  login(email: string, password: string): Observable<LoginResponse> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password);

    return this.http
      .post<LoginResponse>(this.apiUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap((res) => {
          this._token.set(res.access_token);
          localStorage.setItem('auth_token', res.access_token);
          localStorage.setItem('user_type', 'doctor');
        })
      );
  }

  adminLogin(email: string, password: string): Observable<LoginResponse> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password);

    const adminApiUrl = `${environment.apiUrl}/auth/admin/login`;

    return this.http
      .post<LoginResponse>(adminApiUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap((res) => {
          this._token.set(res.access_token);
          localStorage.setItem('auth_token', res.access_token);
          localStorage.setItem('user_type', 'admin');
        })
      );
  }

  logout() {
    this._token.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_type');
  }

  getToken(): string | null {
    return this._token();
  }
}
