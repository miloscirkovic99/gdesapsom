import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = null;
  constructor(private http: HttpClient) {}
  login(email:string,password:string): Observable<any> {
    return this.http.post(`auth/login`, { email,password});
  }
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('sid', token);
  }
  getToken(): string | null {
    return this.token || localStorage.getItem('sid');
  }
  getSessionResult(){   
    this.http.get<any>('auth/session').subscribe((result)=>{      
    })
  }
  logout(): Observable<any> {
    this.token = null;
    localStorage.removeItem('sid');
   return this.http.post(`auth/logout`, {  })
  }
  isAuthenticated(): boolean {
    
    return this.getToken() !== null;
  }
}
