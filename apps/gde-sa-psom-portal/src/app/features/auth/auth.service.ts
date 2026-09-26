import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionStore } from '../../shared/data-access/platform/session-store';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = null;
  private session = inject(SessionStore);
  constructor(private http: HttpClient) {}
  login(email:string,password:string): Observable<any> {
    return this.http.post(`auth/login`, { email,password});
  }
  setToken(token: string): void {
    this.token = token;
    this.session.setSid(token);
  }
  getToken(): string | null {
    return this.token || this.session.getSid();
  }
  getSessionResult(){
    this.http.get<any>('auth/session').subscribe((result)=>{
    })
  }
  logout(): Observable<any> {
    this.token = null;
    this.session.clear();
   return this.http.post(`auth/logout`, {  })
  }
  isAuthenticated(): boolean {

    return this.getToken() !== null;
  }
}
