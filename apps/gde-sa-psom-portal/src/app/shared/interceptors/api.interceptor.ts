import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "apps/gde-sa-psom-portal/src/env/env.dev";
import { Observable } from "rxjs";

/**
 * Prefixes all requests with `environment.serverUrl`.
 */
@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!request.url.includes('assets')) {
            request = request.clone({ url:`${environment.apiUrl}api/v2/` + request.url });
        }
        return next.handle(request);
    }
}