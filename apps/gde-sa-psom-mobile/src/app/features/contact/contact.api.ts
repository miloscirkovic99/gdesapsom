import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactMessage } from './contact-form';

/**
 * The website's contact endpoint, which emails the message to the team.
 *
 * ContactFormService (@gde/shared/data-access/core) posts the same body but
 * subscribes itself and only shows a snackbar, so the screen could not tell
 * when the message is out. This returns the request, for the sending and sent states.
 */
@Injectable({ providedIn: 'root' })
export class ContactApi {
  readonly #http = inject(HttpClient);

  send(message: ContactMessage): Observable<unknown> {
    return this.#http.post<unknown>('gmail', message);
  }
}
