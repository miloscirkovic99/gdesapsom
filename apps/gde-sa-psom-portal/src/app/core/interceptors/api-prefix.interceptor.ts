import { HttpEvent, HttpHandler, HttpInterceptor, HttpParams, HttpRequest } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { APP_CONFIG } from "../../shared/data-access/config/app-config";
import { SessionStore } from "../../shared/data-access/platform/session-store";

/**
 * Prefixes every request except static assets with `${apiUrl}api/v2/` and
 * sends the session id as the `sid` query parameter.
 *
 * The params are replaced, not merged: callers put their own query string in
 * the URL (e.g. `'dog-food/all?fields=admin'`).
 */
@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
    private readonly config = inject(APP_CONFIG);
    private readonly session = inject(SessionStore);

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        if (!request.url.includes('assets')) {
            const sid: any = this.session.getSid();
            const params = new HttpParams().set('sid', sid);
            request = request.clone({
                url: `${this.config.apiUrl}api/v2/` + request.url,
                params: params
            });

        }
        return next.handle(request);
    }
}
