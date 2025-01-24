import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContactFormService {
  private http=inject(HttpClient)
  constructor() { }

  sendEmail(data:any){
    console.log(data);
    this.http.post<any>('gmail',{data}).subscribe({
      next:(result)=>{

      },
      error:(err)=>{
        console.error(err);
        
      }
    })
    
  }
}
