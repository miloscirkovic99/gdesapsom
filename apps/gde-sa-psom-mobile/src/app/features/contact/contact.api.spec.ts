import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactApi } from './contact.api';

describe('ContactApi', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the message to the endpoint the website uses and reports the answer', () => {
    const next = jest.fn();
    TestBed.inject(ContactApi)
      .send({ from: 'ime@gmail.com', subject: 'Pitanje', message: 'Zdravo!' })
      .subscribe(next);

    const req = http.expectOne('gmail');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ from: 'ime@gmail.com', subject: 'Pitanje', message: 'Zdravo!' });
    req.flush({ success: true });
    expect(next).toHaveBeenCalled();
  });

  it('passes a failure on to the screen', () => {
    const error = jest.fn();
    TestBed.inject(ContactApi).send({ from: 'a@b.rs', subject: 's', message: 'm' }).subscribe({ error });

    http.expectOne('gmail').flush(null, { status: 500, statusText: 'Server Error' });
    expect(error).toHaveBeenCalled();
  });
});
