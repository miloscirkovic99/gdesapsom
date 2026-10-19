import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { Observable, of, throwError } from 'rxjs';
import { PlannerAnalytics } from './planner-analytics';
import { PlannerApiService } from './planner-api.service';
import { PLANNER_PAGE_DATA } from './planner-pages';
import { PlannerPageComponent } from './planner-page.component';
import { PlannerStorage } from './planner-storage';
import { TurnstileService } from './turnstile.service';

describe('PlannerPageComponent', () => {
  let fixture: ComponentFixture<PlannerPageComponent>;
  const api = {
    create: jest.fn(),
    quota: jest.fn((): Observable<{ remaining: number; next_at: string | null }> => of({ remaining: 2, next_at: null })),
  };
  const analytics = { start: jest.fn(), generate: jest.fn(), limitHit: jest.fn() };
  const storage = {
    dogName: jest.fn(() => ''),
    saveDogName: jest.fn(),
    remaining: jest.fn(() => ({ remaining: 2, nextAt: null })),
    saveQuota: jest.fn(),
  };
  const turnstile = {
    render: jest.fn(async (_host: HTMLElement, _key: string, onToken: (token: string | null) => void) => {
      onToken('XXXX.DUMMY.TOKEN.XXXX');
      return 'widget-1';
    }),
    reset: jest.fn(),
    remove: jest.fn(),
  };
  const element = () => fixture.nativeElement as HTMLElement;

  async function render(path = '/planer/novi-sad'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        PlannerPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { rs: { home: 'Početna', breadcrumb: 'Navigacija' } },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { [PLANNER_PAGE_DATA]: path } } } },
        { provide: PlannerApiService, useValue: api },
        { provide: PlannerAnalytics, useValue: analytics },
        { provide: PlannerStorage, useValue: storage },
        { provide: TurnstileService, useValue: turnstile },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlannerPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => jest.clearAllMocks());

  it('takes the weekly count from the server once the page is interactive', async () => {
    api.quota.mockReturnValueOnce(of({ remaining: 1, next_at: null }));
    await render('/planer');
    expect(element().querySelector('.pl-quota')?.textContent).toBe('Ostao ti je 1 plan ove nedelje');
    expect(storage.saveQuota).toHaveBeenCalledWith(1, null);
  });

  it('shows the weekly limit before the form is used when the server says nothing is left', async () => {
    api.quota.mockReturnValueOnce(of({ remaining: 0, next_at: '2026-11-27T09:00:00.000Z' }));
    await render('/planer');
    expect(element().querySelector('.pl-quota')).toBeNull();
    expect(element().textContent).toContain('27.');
  });

  it('keeps the stored count when the quota request fails', async () => {
    api.quota.mockReturnValueOnce(throwError(() => new Error('offline')));
    await render('/planer');
    expect(element().querySelector('.pl-quota')?.textContent).toBe('Ostala su ti 2 plana ove nedelje');
  });

  it('preselects the city of /planer/<city> and shows what is left this week', async () => {
    await render('/planer/novi-sad');
    expect(element().querySelector('h1')?.textContent).toBe('Planer sa psom za Novi Sad');
    expect(fixture.componentInstance.danForm.controls.grad.value).toBe('novi-sad');
    expect(element().querySelector('.pl-quota')?.textContent).toBe('Ostala su ti 2 plana ove nedelje');
  });

  it('keeps the dog\'s name out of the request', async () => {
    api.create.mockReturnValue(of({ plan_id: 'p9', mode: 'dan', source: 'ai', remaining: 1, next_at: null }));
    await render();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.dogName.setValue('Žućko');
    fixture.componentInstance.submit();

    expect(storage.saveDogName).toHaveBeenCalledWith('Žućko');
    const [params, token] = api.create.mock.calls[0];
    expect(JSON.stringify(params)).not.toContain('Žućko');
    expect(params).toMatchObject({ mode: 'dan', grad: 'novi-sad' });
    expect(token).toBe('XXXX.DUMMY.TOKEN.XXXX');
    expect(storage.saveQuota).toHaveBeenCalledWith(1, null);
    expect(analytics.generate).toHaveBeenCalledWith('dan', 'ai');
    expect(navigate).toHaveBeenCalledWith(['/plan', 'p9'], expect.anything());
  });

  it('on the weekly limit says when, offers the winter pages, and needs a new token', async () => {
    api.create.mockReturnValue(throwError(() => ({ kind: 'limit', limit: { reason: 'device', next_at: '2026-11-28T10:00:00Z' } })));
    await render();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    const alert = element().querySelector('.pl-limit');
    expect(alert?.textContent).toContain('Sledeći plan možeš da napraviš 28. 11. 2026.');
    expect(alert?.querySelector('a')?.getAttribute('href')).toBe('/zimovanje-sa-psom');
    expect(analytics.limitHit).toHaveBeenCalledWith('device');
    expect(turnstile.reset).toHaveBeenCalledWith('widget-1');
    expect(element().querySelector('.pl-quota')).toBeNull();
  });

  it('sends the winter tab as "zimovanje"', async () => {
    api.create.mockReturnValue(of({ plan_id: 'w1', mode: 'zimovanje', source: 'rules', remaining: 2, next_at: null }));
    await render('/planer');
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.selectTab('zimovanje');
    fixture.componentInstance.zimForm.patchValue({ destinacija: 'tara', broj_noci: 5, neko_skija: true });
    fixture.componentInstance.submit();

    expect(api.create.mock.calls[0][0]).toEqual({
      mode: 'zimovanje',
      destinacija: 'tara',
      broj_noci: 5,
      velicina: 'srednji',
      dlaka: 'srednja',
      neko_skija: true,
      pas_sme_sam: false,
    });
  });

  it('publishes its FAQ as FAQPage', async () => {
    await render('/planer');
    const script = document.head.querySelector('script[type="application/ld+json"][data-seo-id="planner-faq"]');
    expect(JSON.parse(script?.textContent ?? '{}')['@type']).toBe('FAQPage');
  });
});
