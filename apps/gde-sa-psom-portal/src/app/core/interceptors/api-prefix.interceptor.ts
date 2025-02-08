import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "apps/gde-sa-psom-portal/src/env/env.dev";
import { Observable } from "rxjs";
import { HttpParams } from "@angular/common/http"; // Make sure to import HttpParams

/**
 * Prefixes all requests with `environment.serverUrl`.
 */
@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        console.log(request.url.includes('api.opencagedata.com'));
        
        if (!request.url.includes('assets') && !request.url.includes('api.opencagedata.com')) {
            let sid:any = localStorage.getItem('sid') ?? null;
            
            // Ensure sid is not null or undefined
                const params = new HttpParams().set('sid', sid);  // Create HttpParams with 'sid'
                request = request.clone({ 
                    url: `${environment.apiUrl}api/v2/` + request.url,
                    params: params  // Set the HttpParams
                });
            
        }
        return next.handle(request);
    }
}
