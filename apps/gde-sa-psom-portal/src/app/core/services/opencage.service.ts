import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'apps/gde-sa-psom-portal/src/env/env.dev';

@Injectable({
  providedIn: 'root'
})
export class OpencageService {
  private apiUrl = 'https://api.opencagedata.com/geocode/v1/json';
  private apiKey = ''

  constructor(private http: HttpClient) {}

  // Method to get geocoding results from OpenCage API
  getGeocode(address: string): Observable<any> {
   console.log(address);
   console.log(this.apiKey);



    return this.http.get<any>(`https://api.opencagedata.com/geocode/v1/json?q=${address}&key=${this.apiKey}&language=en&pretty=1`);
  }

  // Method to reverse geocode using latitude and longitude
  reverseGeocode(lat: number, lng: number): Observable<any> {
    const params = new HttpParams()
      .set('q', `${lat},${lng}`)
      .set('key', this.apiKey);

    return this.http.get<any>(this.apiUrl, { params });
  }
}
